/*
  # Add delivery settings to profiles table

  1. Changes
    - Add `delivery_settings` jsonb column to `profiles` table
    - This will store delivery price limits for different customer types
    
  2. Purpose
    - Allows users to configure delivery price limits per customer type
    - Structure: { "standard": 50, "vip": 30, "wholesale": 100 }
    - When order price exceeds the limit, delivery becomes free automatically
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'delivery_settings'
  ) THEN
    ALTER TABLE profiles ADD COLUMN delivery_settings jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
