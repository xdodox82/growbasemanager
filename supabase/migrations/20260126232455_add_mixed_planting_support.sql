/*
  # Add Mixed Planting Support

  1. Changes
    - Add `is_mixed` column to planting_plans table (boolean, default false)
    - Add `mix_configuration` column to planting_plans table (jsonb, nullable)
    - Allows combining multiple crops on a single tray with percentage distribution

  2. Details
    - `is_mixed`: Indicates if this is a mixed planting (multiple crops on one tray)
    - `mix_configuration`: JSON array storing crop IDs, names, and percentages
    - Example mix_configuration: [{"crop_id": "uuid", "crop_name": "Slnečnica", "percentage": 50}, ...]

  3. Notes
    - When is_mixed = true, crop_id can be null (crops are in mix_configuration)
    - Seed density is calculated automatically based on crop percentages
*/

-- Add is_mixed column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'is_mixed'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN is_mixed boolean DEFAULT false;
  END IF;
END $$;

-- Add mix_configuration column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'mix_configuration'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN mix_configuration jsonb;
  END IF;
END $$;

-- Add index for faster queries on mixed plantings
CREATE INDEX IF NOT EXISTS idx_planting_plans_is_mixed ON planting_plans(is_mixed) WHERE is_mixed = true;