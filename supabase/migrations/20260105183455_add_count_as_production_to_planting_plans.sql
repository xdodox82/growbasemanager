/*
  # Add count_as_production column to planting_plans

  1. Changes
    - Add `count_as_production` boolean column to `planting_plans` table
    - Default value is `true` (normal production)
    - For test batches, this can be set to `false` to exclude from inventory calculations
    - Update existing records where `is_test_batch` is true to have `count_as_production` = false
  
  2. Logic
    - If `is_test_batch` is false: `count_as_production` is always true (regular production)
    - If `is_test_batch` is true: `count_as_production` can be true or false (user choice)
*/

-- Add count_as_production column with default true
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'count_as_production'
  ) THEN
    ALTER TABLE planting_plans
    ADD COLUMN count_as_production boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Update existing test batches to not count as production by default
UPDATE planting_plans
SET count_as_production = false
WHERE is_test_batch = true AND count_as_production = true;