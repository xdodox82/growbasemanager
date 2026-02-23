/*
  # Add substrate fields to planting_plans

  1. Changes
    - Add `substrate_type` column for substrate selection (Rašelina, Kokos, Miešaný, Iný)
    - Add `substrate_note` column for custom substrate description when type is 'Iný'

  2. Notes
    - Default substrate_type is 'mixed' (Miešaný)
    - substrate_note is only required when substrate_type is 'other' (Iný)
*/

-- Add substrate columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'substrate_type'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN substrate_type TEXT DEFAULT 'mixed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'substrate_note'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN substrate_note TEXT;
  END IF;
END $$;

-- Add check constraint for valid substrate types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'planting_plans_substrate_type_check'
  ) THEN
    ALTER TABLE planting_plans 
    ADD CONSTRAINT planting_plans_substrate_type_check 
    CHECK (substrate_type IN ('peat', 'coco', 'mixed', 'other'));
  END IF;
END $$;