/*
  # Fix handle_new_user Trigger to Handle Duplicates

  1. Problem
    - Trigger handle_new_user() crashes with error 23505 when profile already exists
    - This happens when admin_create_user_v3 doesn't fully clean up before creating new user
    - Or when there's any race condition

  2. Solution
    - Use INSERT ... ON CONFLICT ... DO UPDATE for profiles
    - Use INSERT ... ON CONFLICT ... DO UPDATE for user_roles
    - This makes the trigger idempotent and crash-proof

  3. Benefits
    - No more duplicate key errors (23505)
    - Trigger handles all edge cases gracefully
    - Updates existing records instead of crashing
    - Works with admin_create_user_v3 cleanup strategy
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_count INTEGER;
  default_role app_role;
BEGIN
  RAISE NOTICE '[handle_new_user] Trigger fired for user: % (%)', NEW.email, NEW.id;

  -- Create or update profile (idempotent)
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  RAISE NOTICE '[handle_new_user] ✓ Profile created/updated for: %', NEW.id;

  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  -- First user gets admin role, others get worker role
  IF user_count = 0 THEN
    default_role := 'admin';
  ELSE
    default_role := 'worker';
  END IF;

  RAISE NOTICE '[handle_new_user] Default role: % (user count: %)', default_role, user_count;

  -- Create or update user_roles (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, default_role)
  ON CONFLICT (user_id)
  DO UPDATE SET
    role = EXCLUDED.role;

  RAISE NOTICE '[handle_new_user] ✓ User role created/updated: %', default_role;
  RAISE NOTICE '[handle_new_user] === TRIGGER COMPLETE ===';

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[handle_new_user] ERROR: % - %', SQLSTATE, SQLERRM;
  -- Re-raise the error so it doesn't silently fail
  RAISE;
END;
$$;

-- Ensure trigger exists and is configured correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user IS 'Trigger function that creates/updates profile and user_roles when new user is created in auth.users. Uses ON CONFLICT to prevent duplicate key errors (23505). Idempotent and crash-proof.';
