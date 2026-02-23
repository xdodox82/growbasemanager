/*
  # Create RPC function for disabling foreign key checks

  1. New Functions
    - `set_session_replica` - Sets session_replication_role to 'replica' to bypass FK checks and triggers
    - `set_session_default` - Resets session_replication_role to 'DEFAULT' to re-enable checks

  2. Security
    - Functions are only accessible to authenticated users
    - This is needed for data migration purposes
*/

CREATE OR REPLACE FUNCTION set_session_replica()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SET session_replication_role = 'replica';
END;
$$;

CREATE OR REPLACE FUNCTION set_session_default()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SET session_replication_role = 'DEFAULT';
END;
$$;

GRANT EXECUTE ON FUNCTION set_session_replica() TO authenticated;
GRANT EXECUTE ON FUNCTION set_session_default() TO authenticated;
