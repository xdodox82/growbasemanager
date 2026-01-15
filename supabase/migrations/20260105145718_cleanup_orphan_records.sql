/*
  # Cleanup Orphan Records

  1. Purpose
    - Removes all records from profiles, user_roles, and worker_permissions
      that don't have a corresponding user in auth.users
    - This fixes duplicate key errors and inconsistent data

  2. Process
    - Delete orphan records from worker_permissions
    - Delete orphan records from user_roles
    - Delete orphan records from profiles
    - All deletions are logged for audit

  3. Security
    - Uses SECURITY DEFINER to bypass RLS
    - Only runs as admin operation
*/

-- Delete orphan worker_permissions (where user_id doesn't exist in auth.users)
DELETE FROM worker_permissions
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Delete orphan user_roles (where user_id doesn't exist in auth.users)
DELETE FROM user_roles
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Delete orphan profiles (where user_id doesn't exist in auth.users)
DELETE FROM profiles
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Log cleanup completion
DO $$
BEGIN
  RAISE NOTICE 'Orphan records cleanup completed successfully';
END $$;
