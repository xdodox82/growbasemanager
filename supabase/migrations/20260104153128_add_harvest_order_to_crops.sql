/*
  # Add harvest order to crops

  1. Changes
    - Add `harvest_order` column to `crops` table to allow custom ordering of crops for harvest workflow
    - Default value is 999 to put crops without specific order at the end
  
  2. Notes
    - This allows users to specify the order in which crops should appear in harvest lists
    - Lower numbers appear first, higher numbers appear last
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crops' AND column_name = 'harvest_order'
  ) THEN
    ALTER TABLE crops ADD COLUMN harvest_order integer DEFAULT 999;
  END IF;
END $$;