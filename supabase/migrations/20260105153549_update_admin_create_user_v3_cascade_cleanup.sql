/*
  # Update admin_create_user_v3 with Complete Cascade Cleanup

  1. Purpose
    - Enhance user cleanup to handle all foreign key relationships
    - Set user_id to NULL in data tables (preserve data)
    - Delete only user-specific records (profiles, roles, permissions)
    - Prevent foreign key constraint violations

  2. Enhanced Cleanup Process
    - Set user_id = NULL in all data tables
    - Delete user-specific configuration
    - Delete auth.users record
    - Create new user with fresh data

  3. Tables Affected
    - Data tables (user_id set to NULL):
      * orders, order_items, planting_plans, tasks
      * crops, seeds, customers, suppliers, blends
      * packagings, labels, substrates, delivery_routes, delivery_days
      * prices, vat_settings, other_inventory
    - User-specific (deleted):
      * worker_permissions, user_roles, profiles, login_history
*/

-- Drop existing function
DROP FUNCTION IF EXISTS admin_create_user_v3(text, text, text, text);

-- Create enhanced function with cascade cleanup
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

  -- Step 4: COMPLETE CASCADE CLEANUP
  RAISE NOTICE 'Starting cascade cleanup for email: %', p_email;

  -- Find existing user ID by email in auth.users
  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE email = p_email;

  -- Find orphan user_id from profiles table
  IF v_existing_user_id IS NULL THEN
    SELECT user_id INTO v_existing_user_id
    FROM public.profiles
    WHERE email = p_email
    LIMIT 1;
  END IF;

  IF v_existing_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found existing user ID: %', v_existing_user_id;

    -- CASCADE CLEANUP: Set user_id to NULL in all data tables (preserve data)
    -- This allows us to keep business data while removing user association
    
    UPDATE public.order_items SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.orders SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.planting_plans SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.tasks SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.prices SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.crops SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.seeds SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.customers SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.suppliers SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.blends SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.packagings SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.labels SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.substrates SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.delivery_routes SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.delivery_days SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.vat_settings SET user_id = NULL WHERE user_id = v_existing_user_id;
    UPDATE public.other_inventory SET user_id = NULL WHERE user_id = v_existing_user_id;

    RAISE NOTICE 'Nullified user_id in all data tables';

    -- Delete user-specific records (these should be deleted)
    DELETE FROM public.login_history WHERE user_id = v_existing_user_id;
    DELETE FROM public.worker_permissions WHERE user_id = v_existing_user_id;
    DELETE FROM public.user_roles WHERE user_id = v_existing_user_id;
    DELETE FROM public.profiles WHERE user_id = v_existing_user_id;

    RAISE NOTICE 'Deleted user-specific records';

    -- Finally, delete from auth.users
    DELETE FROM auth.users WHERE id = v_existing_user_id;
    RAISE NOTICE 'Deleted auth.users record: %', v_existing_user_id;
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
COMMENT ON FUNCTION admin_create_user_v3 IS 'Creates a new user directly in auth.users with encrypted password. Admin only. Performs complete cascade cleanup (nullifies user_id in data tables) before creation to prevent duplicate key errors and foreign key constraint violations.';
