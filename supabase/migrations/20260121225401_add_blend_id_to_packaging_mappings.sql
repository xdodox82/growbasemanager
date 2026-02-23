/*
  # Add blend support to packaging mappings

  1. Changes
    - Add `blend_id` column to `packaging_mappings` table
    - Add check constraint to ensure either crop_id or blend_id is set (not both, not neither)
    - Update unique constraint to include blend_id

  2. Security
    - No changes to RLS policies needed (they already allow user access based on user_id)
*/

-- Add blend_id column to packaging_mappings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_mappings' AND column_name = 'blend_id'
  ) THEN
    ALTER TABLE packaging_mappings
    ADD COLUMN blend_id uuid REFERENCES blends(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add check constraint to ensure either crop_id or blend_id is set (not both)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'packaging_mappings_crop_or_blend_check'
  ) THEN
    ALTER TABLE packaging_mappings
    ADD CONSTRAINT packaging_mappings_crop_or_blend_check
    CHECK (
      (crop_id IS NOT NULL AND blend_id IS NULL) OR
      (crop_id IS NULL AND blend_id IS NOT NULL)
    );
  END IF;
END $$;

-- Drop old unique constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'packaging_mappings_crop_weight_unique'
    AND table_name = 'packaging_mappings'
  ) THEN
    ALTER TABLE packaging_mappings
    DROP CONSTRAINT packaging_mappings_crop_weight_unique;
  END IF;
END $$;

-- Add new unique constraint that includes both crop_id and blend_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'packaging_mappings_item_weight_unique'
  ) THEN
    ALTER TABLE packaging_mappings
    ADD CONSTRAINT packaging_mappings_item_weight_unique
    UNIQUE NULLS NOT DISTINCT (crop_id, blend_id, weight_g, user_id);
  END IF;
END $$;
