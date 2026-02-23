/*
  # Create Admin Delete User RPC Function

  1. Purpose
    - Pure SQL solution for deleting users with cascade cleanup
    - Handles all foreign key relationships properly
    - Prevents foreign key constraint violations

  2. Features
    - SECURITY DEFINER to bypass RLS
    - Admin-only access control
    - Complete cascade cleanup before deletion
    - Cannot delete self

  3. Process
    - Verify admin permissions
    - Validate user exists
    - Check not deleting self
    - Set user_id to NULL in all data tables
    - Delete user-specific records
    - Delete auth.users record
    - Return success

  4. Security
    - SECURITY DEFINER runs with function owner privileges
    - Admin role verification required
    - Self-deletion protection
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS admin_delete_user(uuid);

-- Create the delete user function
CREATE OR REPLACE FUNCTION admin_delete_user(
  p_user_id_to_delete uuid
)
RETURNS json
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
DECLARE
  v_requesting_user_id uuid;
  v_requesting_user_role text;
  v_user_exists boolean;
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
      'error', 'Iba administrátori môžu mazať používateľov'
    );
  END IF;

  -- Step 3: Validate inputs
  IF p_user_id_to_delete IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ID používateľa je povinné'
    );
  END IF;

  -- Step 4: Check not deleting self
  IF p_user_id_to_delete = v_requesting_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nemôžete zmazať svoj vlastný účet'
    );
  END IF;

  -- Step 5: Check if user exists
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = p_user_id_to_delete
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    -- Also check in profiles (orphan records)
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE user_id = p_user_id_to_delete
    ) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Používateľ nebol nájdený'
      );
    END IF;
  END IF;

  -- Step 6: CASCADE CLEANUP - Set user_id to NULL in all data tables
  RAISE NOTICE 'Starting cascade cleanup for user: %', p_user_id_to_delete;

  UPDATE public.order_items SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.orders SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.planting_plans SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.tasks SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.prices SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.crops SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.seeds SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.customers SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.suppliers SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.blends SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.packagings SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.labels SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.substrates SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.delivery_routes SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.delivery_days SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.vat_settings SET user_id = NULL WHERE user_id = p_user_id_to_delete;
  UPDATE public.other_inventory SET user_id = NULL WHERE user_id = p_user_id_to_delete;

  RAISE NOTICE 'Nullified user_id in all data tables';

  -- Step 7: Delete user-specific records
  DELETE FROM public.login_history WHERE user_id = p_user_id_to_delete;
  DELETE FROM public.worker_permissions WHERE user_id = p_user_id_to_delete;
  DELETE FROM public.user_roles WHERE user_id = p_user_id_to_delete;
  DELETE FROM public.profiles WHERE user_id = p_user_id_to_delete;

  RAISE NOTICE 'Deleted user-specific records';

  -- Step 8: Delete from auth.users (if exists)
  DELETE FROM auth.users WHERE id = p_user_id_to_delete;
  
  RAISE NOTICE 'Deleted auth.users record: %', p_user_id_to_delete;

  -- Step 9: Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Používateľ úspešne zmazaný'
  );

EXCEPTION 
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Neočakávaná chyba pri mazaní používateľa',
      'details', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_delete_user TO authenticated;

-- Add function comment
COMMENT ON FUNCTION admin_delete_user IS 'Deletes a user with complete cascade cleanup. Admin only. Sets user_id to NULL in all data tables and deletes user-specific records to prevent foreign key constraint violations.';
