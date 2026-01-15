/*
  # Add sidebar settings to profiles table

  1. Changes
    - Add `sidebar_settings` column to `profiles` table (JSONB type)
    - This will store which sidebar items are visible/hidden for each user
    - Default value is NULL (all items visible by default)
  
  2. Security
    - Users can update their own sidebar settings
    - No changes to existing RLS policies needed (already covered)
*/

-- Add sidebar_settings column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'sidebar_settings'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN sidebar_settings JSONB DEFAULT NULL;
  END IF;
END $$;