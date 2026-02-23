/*
  # Fix admin_create_user_v3 - Enhanced Cleanup for Orphaned Profiles

  1. Purpose
    - Fix duplicate profile errors (error 23505)
    - Add explicit DELETE FROM profiles WHERE email = p_email
    - Ensure all orphaned profiles are removed before creating new user
    - Re-enable pgcrypto extension (safety check)

  2. Changes
    - Add direct email-based cleanup at start of CASCADE_CLEANUP section
    - Delete from profiles by email (case insensitive) BEFORE looking up user_id
    - Maintain existing cleanup logic for completeness
    - Ensure pgcrypto is available

  3. Benefits
    - Eliminates "duplicate key value violates unique constraint" errors
    - Removes orphaned profiles that have no auth.users record
    - More robust cleanup that handles edge cases
    - Guarantees clean slate for new user creation
*/

-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing function
DROP FUNCTION IF EXISTS admin_create_user_v3(text, text, text, text);

-- Create function with enhanced cleanup
CREATE OR REPLACE FUNCTION admin_create_user_v3(
  p_email text,
  p_password text,
  p_full_name text DEFAULT '',
  p_role text DEFAULT 'worker'
)
RETURNS json
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_requesting_user_id uuid;
  v_requesting_user_role text;
  v_existing_user_id uuid;
  v_encrypted_password text;
  v_step text;
  v_deleted_profiles int;
BEGIN
  v_step := 'INIT';
  RAISE NOTICE '[admin_create_user_v3] === STARTING === Email: %', p_email;
  
  -- Step 1: Get requesting user ID from current session
  v_step := 'GET_REQUESTING_USER';
  RAISE NOTICE '[%] Getting requesting user from session...', v_step;
  
  v_requesting_user_id := auth.uid();
  
  IF v_requesting_user_id IS NULL THEN
    RAISE NOTICE '[%] ERROR: No user in session', v_step;
    RETURN json_build_object(
      'success', false,
      'error', 'Nie ste prihlásený',
      'error_code', 'NOT_AUTHENTICATED',
      'step', v_step
    );
  END IF;
  
  RAISE NOTICE '[%] Requesting user ID: %', v_step, v_requesting_user_id;

  -- Step 2: Verify requesting user is admin
  v_step := 'VERIFY_ADMIN';
  RAISE NOTICE '[%] Verifying admin role...', v_step;
  
  SELECT role INTO v_requesting_user_role
  FROM public.user_roles
  WHERE user_id = v_requesting_user_id;

  RAISE NOTICE '[%] Requesting user role: %', v_step, v_requesting_user_role;

  IF v_requesting_user_role IS NULL OR v_requesting_user_role != 'admin' THEN
    RAISE NOTICE '[%] ERROR: User is not admin', v_step;
    RETURN json_build_object(
      'success', false,
      'error', 'Iba administrátori môžu vytvárať používateľov',
      'error_code', 'INSUFFICIENT_PERMISSIONS',
      'step', v_step
    );
  END IF;

  -- Step 3: Validate inputs
  v_step := 'VALIDATE_INPUTS';
  RAISE NOTICE '[%] Validating inputs...', v_step;
  
  IF p_email IS NULL OR p_email = '' THEN
    RAISE NOTICE '[%] ERROR: Email is empty', v_step;
    RETURN json_build_object(
      'success', false,
      'error', 'Email je povinný',
      'error_code', 'INVALID_EMAIL',
      'step', v_step
    );
  END IF;

  -- Validate email format (basic check)
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE NOTICE '[%] ERROR: Invalid email format: %', v_step, p_email;
    RETURN json_build_object(
      'success', false,
      'error', 'Neplatný formát emailu',
      'error_code', 'INVALID_EMAIL_FORMAT',
      'details', 'Email musí byť v platnom formáte (napr. meno@domain.com)',
      'step', v_step
    );
  END IF;

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE NOTICE '[%] ERROR: Password too short (length: %)', v_step, length(p_password);
    RETURN json_build_object(
      'success', false,
      'error', 'Heslo musí mať aspoň 6 znakov',
      'error_code', 'WEAK_PASSWORD',
      'details', format('Heslo má len %s znakov, potrebných je aspoň 6', length(p_password)),
      'step', v_step
    );
  END IF;

  IF p_role NOT IN ('admin', 'worker') THEN
    RAISE NOTICE '[%] ERROR: Invalid role: %', v_step, p_role;
    RETURN json_build_object(
      'success', false,
      'error', 'Neplatná rola (povolené: admin, worker)',
      'error_code', 'INVALID_ROLE',
      'step', v_step
    );
  END IF;

  RAISE NOTICE '[%] Input validation passed', v_step;

  -- Step 4: ENHANCED CASCADE CLEANUP
  v_step := 'CASCADE_CLEANUP';
  RAISE NOTICE '[%] Starting enhanced cascade cleanup for email: %', v_step, p_email;

  -- CRITICAL FIX: Delete orphaned profiles by email FIRST (case insensitive)
  RAISE NOTICE '[%] Phase 1: Deleting orphaned profiles by email...', v_step;
  
  DELETE FROM public.profiles 
  WHERE LOWER(email) = LOWER(p_email);
  
  GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;
  RAISE NOTICE '[%] Deleted % profile(s) with email: %', v_step, v_deleted_profiles, p_email;

  -- Find existing user ID by email in auth.users
  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_email);

  IF v_existing_user_id IS NOT NULL THEN
    RAISE NOTICE '[%] Phase 2: Found existing user ID in auth.users: %', v_step, v_existing_user_id;
    RAISE NOTICE '[%] Nullifying user_id in data tables...', v_step;

    -- Nullify foreign key references
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

    RAISE NOTICE '[%] Nullified user_id in all data tables', v_step;
    RAISE NOTICE '[%] Deleting user-specific records...', v_step;

    -- Delete user-specific records
    DELETE FROM public.login_history WHERE user_id = v_existing_user_id;
    DELETE FROM public.worker_permissions WHERE user_id = v_existing_user_id;
    DELETE FROM public.user_roles WHERE user_id = v_existing_user_id;
    
    -- Note: profiles already deleted by email in Phase 1
    -- But delete by user_id as well for safety
    DELETE FROM public.profiles WHERE user_id = v_existing_user_id;

    RAISE NOTICE '[%] Deleted user-specific records', v_step;
    RAISE NOTICE '[%] Deleting from auth.users...', v_step;

    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = v_existing_user_id;
    RAISE NOTICE '[%] Deleted auth.users record: %', v_step, v_existing_user_id;
  ELSE
    RAISE NOTICE '[%] Phase 2: No existing user found in auth.users, skipping user_id cleanup', v_step;
  END IF;

  RAISE NOTICE '[%] Cleanup complete', v_step;

  -- Step 5: Generate new user ID
  v_step := 'GENERATE_UUID';
  v_user_id := gen_random_uuid();
  RAISE NOTICE '[%] Generated new user ID: %', v_step, v_user_id;

  -- Step 6: Encrypt password using pgcrypto from extensions schema
  v_step := 'ENCRYPT_PASSWORD';
  RAISE NOTICE '[%] Encrypting password using pgcrypto (extensions schema)...', v_step;
  
  BEGIN
    v_encrypted_password := extensions.crypt(p_password, extensions.gen_salt('bf'));
    RAISE NOTICE '[%] Password encrypted successfully', v_step;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[%] ERROR encrypting password: % - %', v_step, SQLSTATE, SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Chyba pri šifrovaní hesla',
      'error_code', 'ENCRYPTION_ERROR',
      'details', SQLERRM,
      'step', v_step
    );
  END;

  -- Step 7: Insert into auth.users
  v_step := 'INSERT_AUTH_USERS';
  RAISE NOTICE '[%] Inserting into auth.users...', v_step;
  
  BEGIN
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
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      '',
      'authenticated',
      'authenticated'
    );

    RAISE NOTICE '[%] Created auth.users entry: %', v_step, v_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[%] ERROR inserting into auth.users: % - %', v_step, SQLSTATE, SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Chyba pri vytváraní používateľa v auth.users',
      'error_code', SQLSTATE,
      'details', SQLERRM,
      'step', v_step
    );
  END;

  -- Step 8: Create profile
  v_step := 'INSERT_PROFILE';
  RAISE NOTICE '[%] Creating profile...', v_step;
  
  BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (v_user_id, p_email, NULLIF(p_full_name, ''));

    RAISE NOTICE '[%] Created profile for user: %', v_step, v_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[%] ERROR inserting profile: % - %', v_step, SQLSTATE, SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Chyba pri vytváraní profilu',
      'error_code', SQLSTATE,
      'details', SQLERRM,
      'step', v_step
    );
  END;

  -- Step 9: Create user role
  v_step := 'INSERT_USER_ROLE';
  RAISE NOTICE '[%] Creating user role: %', v_step, p_role;
  
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, p_role::app_role);

    RAISE NOTICE '[%] Created user_role: %', v_step, p_role;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[%] ERROR inserting user_role: % - %', v_step, SQLSTATE, SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Chyba pri vytváraní role používateľa',
      'error_code', SQLSTATE,
      'details', SQLERRM,
      'step', v_step
    );
  END;

  -- Step 10: Create worker permissions (if role is worker)
  IF p_role = 'worker' THEN
    v_step := 'INSERT_WORKER_PERMISSIONS';
    RAISE NOTICE '[%] Creating worker permissions...', v_step;
    
    BEGIN
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
      RAISE NOTICE '[%] Created worker_permissions for user: %', v_step, v_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[%] ERROR inserting worker_permissions: % - %', v_step, SQLSTATE, SQLERRM;
      RETURN json_build_object(
        'success', false,
        'error', 'Chyba pri vytváraní oprávnení pracovníka',
        'error_code', SQLSTATE,
        'details', SQLERRM,
        'step', v_step
      );
    END;
  END IF;

  -- Step 11: Return success
  v_step := 'SUCCESS';
  RAISE NOTICE '[%] === COMPLETED SUCCESSFULLY === User ID: %', v_step, v_user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'role', p_role,
    'message', 'Používateľ úspešne vytvorený'
  );

EXCEPTION 
  WHEN unique_violation THEN
    RAISE NOTICE '[%] EXCEPTION: Unique violation - %', v_step, SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Používateľ s týmto emailom už existuje',
      'error_code', 'UNIQUE_VIOLATION',
      'details', SQLERRM,
      'step', v_step
    );
  WHEN OTHERS THEN
    RAISE NOTICE '[%] EXCEPTION: Unhandled error - % - %', v_step, SQLSTATE, SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'Neočakávaná chyba pri vytváraní používateľa',
      'error_code', SQLSTATE,
      'details', SQLERRM,
      'step', v_step
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_create_user_v3 TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_create_user_v3 IS 'Creates new user with enhanced cleanup that deletes orphaned profiles by email first. Prevents duplicate profile errors (23505). Uses pgcrypto from extensions schema.';
