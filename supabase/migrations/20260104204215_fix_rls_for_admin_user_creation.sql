/*
  # Fix RLS policies for admin user creation

  1. Changes
    - Add policy to allow admins to insert profiles for new users
    - This enables Edge functions with Service Role to create user profiles
    - Admins can now create profiles for other users via admin functions
  
  2. Security
    - Only authenticated admins can create profiles for others
    - Regular users can still only create their own profiles
    - Maintains existing security for normal operations
*/

-- Add policy for admins to insert profiles for new users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Admins can insert any profile'
  ) THEN
    CREATE POLICY "Admins can insert any profile"
      ON profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;