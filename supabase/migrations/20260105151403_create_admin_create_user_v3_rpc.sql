/*
  # Create Admin User Creation RPC Function v3

  1. Purpose
    - Pure SQL solution for creating users without Edge Functions
    - Complete cleanup before user creation to prevent duplicate key errors
    - Direct insertion into auth.users with encrypted password
    - Automatic creation of profile, role, and permissions

  2. Features
    - SECURITY DEFINER to bypass RLS
    - Admin-only access control
    - Complete cleanup of orphan records and existing users
    - Atomic transaction (all or nothing)
    - Comprehensive error handling

  3. Process
    - Verify admin permissions
    - Validate inputs
    - Clean up all records associated with email
    - Delete existing auth user if present
    - Create new auth.users entry with encrypted password
    - Create profile, role, and permissions
    - Return success with user details

  4. Security
    - SECURITY DEFINER runs with function owner privileges
    - Admin role verification required
    - Password encrypted using pgcrypto bcrypt
    - Email confirmation automatically set
*/

-- Ensure pgcrypto extension is available for password encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS admin_create_user_v3(text, text, text, text);

-- Create the main user creation function
CREATE OR REPLACE FUNCTION admin_create_user_v3(
  p_email text,
  p_password text,
  p_full_name text DEFAULT '',
  p_role text DEFAULT 'worker'
)
RETURNS json
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_requesting_user_id uuid;
  v_requesting_user_role text;
  v_existing_user_id uuid;
  v_encrypted_password text;
BEGIN
  -- Step 1: Get requesting user ID from current session
  v_requesting_user_id := auth.uid();
  
  IF v_requesting_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nie ste prihlásený'
    );
  END IF;

  -- Step 2: Verify requesting user is admin
  SELECT role INTO v_requesting_user_role
  FROM public.user_roles
  WHERE user_id = v_requesting_user_id;

  IF v_requesting_user_role IS NULL OR v_requesting_user_role != 'admin' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Iba administrátori môžu vytvárať používateľov'
    );
  END IF;

  -- Step 3: Validate inputs
  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Email je povinný'
    );
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Heslo musí mať aspoň 6 znakov'
    );
  END IF;

  IF p_role NOT IN ('admin', 'worker') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Neplatná rola (povolené: admin, worker)'
    );
  END IF;

  -- Step 4: COMPLETE CLEANUP - Remove all traces of this email
  RAISE NOTICE 'Starting cleanup for email: %', p_email;

  -- Find existing user ID by email in auth.users
  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE email = p_email;

  -- Clean up database records (both orphan and existing user records)
  DELETE FROM public.worker_permissions
  WHERE user_id IN (
    SELECT user_id FROM public.profiles WHERE email = p_email
    UNION
    SELECT v_existing_user_id WHERE v_existing_user_id IS NOT NULL
  );

  DELETE FROM public.user_roles
  WHERE user_id IN (
    SELECT user_id FROM public.profiles WHERE email = p_email
    UNION
    SELECT v_existing_user_id WHERE v_existing_user_id IS NOT NULL
  );

  DELETE FROM public.profiles
  WHERE email = p_email OR (v_existing_user_id IS NOT NULL AND user_id = v_existing_user_id);

  -- Delete from auth.users if exists
  IF v_existing_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_existing_user_id;
    RAISE NOTICE 'Deleted existing auth user: %', v_existing_user_id;
  END IF;

  -- Step 5: Generate new user ID
  v_user_id := gen_random_uuid();

  -- Step 6: Encrypt password using pgcrypto bcrypt
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  -- Step 7: Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    aud,
    role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    p_email,
    v_encrypted_password,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    '',
    '',
    '',
    '',
    'authenticated',
    'authenticated'
  );

  RAISE NOTICE 'Created auth.users entry: %', v_user_id;

  -- Step 8: Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (v_user_id, p_email, NULLIF(p_full_name, ''));

  RAISE NOTICE 'Created profile for user: %', v_user_id;

  -- Step 9: Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, p_role);

  RAISE NOTICE 'Created user_role: %', p_role;

  -- Step 10: Create worker permissions (if role is worker)
  IF p_role = 'worker' THEN
    INSERT INTO public.worker_permissions (
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
    RAISE NOTICE 'Created worker_permissions for user: %', v_user_id;
  END IF;

  -- Step 11: Return success
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'role', p_role,
    'message', 'Používateľ úspešne vytvorený'
  );

EXCEPTION 
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Používateľ s týmto emailom už existuje (duplicate key)',
      'error_code', 'UNIQUE_VIOLATION'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Neočakávaná chyba pri vytváraní používateľa',
      'details', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_create_user_v3 TO authenticated;

-- Add function comment
COMMENT ON FUNCTION admin_create_user_v3 IS 'Creates a new user directly in auth.users with encrypted password. Admin only. Performs complete cleanup before creation to prevent duplicate key errors.';
