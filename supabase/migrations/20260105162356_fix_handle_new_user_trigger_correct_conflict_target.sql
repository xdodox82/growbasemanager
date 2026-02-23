/*
  # Fix handle_new_user Trigger - Correct Conflict Targets

  1. Fix
    - profiles: ON CONFLICT (user_id) - correct
    - user_roles: ON CONFLICT (user_id, role) - was wrong, should be (user_id)
    - Actually, user_roles has UNIQUE (user_id, role), but we only have user_id
    - Need to add UNIQUE constraint on just user_id

  2. Solution
    - Add unique constraint on user_roles.user_id
    - Update trigger to use correct conflict targets
*/

-- First, add unique constraint on user_roles.user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_unique'
  ) THEN
    ALTER TABLE public.user_roles 
    ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Now recreate the trigger function with correct conflict targets
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

-- Comment
COMMENT ON FUNCTION public.handle_new_user IS 'Trigger function that creates/updates profile and user_roles when new user is created in auth.users. Uses ON CONFLICT to prevent duplicate key errors (23505). Idempotent and crash-proof.';
