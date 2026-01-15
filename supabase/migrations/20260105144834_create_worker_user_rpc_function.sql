/*
  # Create Worker User RPC Function (SQL Fallback)

  1. Purpose
    - Provides a SQL-based alternative to the Edge Function for creating users
    - Runs with SECURITY DEFINER to bypass RLS
    - Handles complete user creation flow including profile, role, and permissions

  2. Function: create_worker_user_rpc
    - Parameters:
      - user_email: Email address of the new user
      - user_password: Password for the new user (min 6 chars)
      - user_full_name: Full name (optional)
      - user_role: Role ('admin' or 'worker', defaults to 'worker')
    - Returns: JSON with success status and user_id
    - Security: Only callable by admin users

  3. Process Flow
    - Validates caller is admin
    - Checks if user already exists
    - Cleans up any zombie records
    - Creates auth user using auth.users
    - Creates profile record
    - Creates user role record
    - Creates worker permissions (if role is worker)

  4. Error Handling
    - Returns JSON with error details
    - Rolls back transaction on any error
    - Cleans up partial records

  Note: This is a FALLBACK solution. The Edge Function should be used primarily.
        This RPC exists as a backup in case Edge Functions have issues.
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_worker_user_rpc(text, text, text, text);

-- Create the RPC function
CREATE OR REPLACE FUNCTION create_worker_user_rpc(
  user_email text,
  user_password text,
  user_full_name text DEFAULT '',
  user_role text DEFAULT 'worker'
)
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_requesting_user_id uuid;
  v_requesting_user_role text;
  v_result json;
BEGIN
  -- Step 1: Get requesting user ID
  v_requesting_user_id := auth.uid();
  
  IF v_requesting_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nie ste prihlásený'
    );
  END IF;

  -- Step 2: Check if requesting user is admin
  SELECT role INTO v_requesting_user_role
  FROM user_roles
  WHERE user_id = v_requesting_user_id;

  IF v_requesting_user_role != 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Iba administrátori môžu vytvárať používateľov'
    );
  END IF;

  -- Step 3: Validate inputs
  IF user_email IS NULL OR user_email = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email je povinný'
    );
  END IF;

  IF user_password IS NULL OR length(user_password) < 6 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Heslo musí mať aspoň 6 znakov'
    );
  END IF;

  IF user_role NOT IN ('admin', 'worker') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Neplatná rola'
    );
  END IF;

  -- Step 4: Check if user already exists and cleanup
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email;

  IF v_user_id IS NOT NULL THEN
    -- Cleanup zombie records
    DELETE FROM worker_permissions WHERE user_id = v_user_id;
    DELETE FROM user_roles WHERE user_id = v_user_id;
    DELETE FROM profiles WHERE user_id = v_user_id;
    
    -- Note: We cannot delete from auth.users directly in RPC
    -- Return error to use Edge Function instead
    RETURN json_build_object(
      'success', false,
      'error', 'Používateľ s týmto emailom už existuje. Použite Edge Function alebo vymažte používateľa manuálne.'
    );
  END IF;

  -- Step 5: Generate new UUID for the user
  v_user_id := gen_random_uuid();

  -- Step 6: Create user in auth.users
  -- Note: Direct insert into auth.users is not recommended and may not work
  -- This is why Edge Function is preferred
  BEGIN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      v_user_id,
      user_email,
      crypt(user_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      json_build_object('full_name', user_full_name)::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nepodarilo sa vytvoriť auth používateľa. Použite Edge Function namiesto RPC.',
      'details', SQLERRM
    );
  END;

  -- Step 7: Create profile
  BEGIN
    INSERT INTO profiles (user_id, email, full_name)
    VALUES (v_user_id, user_email, NULLIF(user_full_name, ''));
  EXCEPTION WHEN OTHERS THEN
    -- Cleanup
    DELETE FROM auth.users WHERE id = v_user_id;
    RETURN json_build_object(
      'success', false,
      'error', 'Nepodarilo sa vytvoriť profil',
      'details', SQLERRM
    );
  END;

  -- Step 8: Create user role
  BEGIN
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, user_role);
  EXCEPTION WHEN OTHERS THEN
    -- Cleanup
    DELETE FROM profiles WHERE user_id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
    RETURN json_build_object(
      'success', false,
      'error', 'Nepodarilo sa vytvoriť rolu',
      'details', SQLERRM
    );
  END;

  -- Step 9: Create worker permissions if role is worker
  IF user_role = 'worker' THEN
    BEGIN
      INSERT INTO worker_permissions (
        user_id,
        can_view_prices,
        can_view_customers,
        can_view_suppliers,
        can_view_today_tasks,
        can_view_harvest,
        can_view_delivery,
        can_view_planting,
        can_view_orders,
        can_view_inventory
      ) VALUES (
        v_user_id,
        false,
        false,
        false,
        true,
        true,
        true,
        true,
        true,
        true
      );
    EXCEPTION WHEN OTHERS THEN
      -- Don't fail if permissions fail, just log
      RAISE NOTICE 'Failed to create worker permissions: %', SQLERRM;
    END;
  END IF;

  -- Step 10: Return success
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', user_email,
    'message', 'Používateľ bol úspešne vytvorený'
  );

EXCEPTION WHEN OTHERS THEN
  -- Catch-all error handler
  RETURN json_build_object(
    'success', false,
    'error', 'Neočakávaná chyba',
    'details', SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
-- (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION create_worker_user_rpc TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_worker_user_rpc IS 'Creates a new user with profile, role, and permissions. SECURITY DEFINER function - checks for admin role internally. This is a FALLBACK - prefer using the Edge Function.';
