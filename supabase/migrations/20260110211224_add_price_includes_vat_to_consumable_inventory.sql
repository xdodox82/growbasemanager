/*
  # Add price_includes_vat column to consumable_inventory table

  1. Changes
    - Add `price_includes_vat` boolean column to `consumable_inventory` table
    - Default value is `false` to indicate price does NOT include VAT by default
  
  2. Purpose
    - Allows tracking whether the unit_cost includes VAT or not
    - Helps with accurate price calculations and reporting
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consumable_inventory' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE consumable_inventory ADD COLUMN price_includes_vat boolean DEFAULT false;
  END IF;
END $$;
