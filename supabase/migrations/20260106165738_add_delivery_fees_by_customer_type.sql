/*
  # Add delivery fees by customer type to delivery routes

  1. Changes
    - Add `delivery_fee_home` column for home customer delivery fee
    - Add `delivery_fee_gastro` column for gastro customer delivery fee
    - Add `delivery_fee_wholesale` column for wholesale customer delivery fee
    - Migrate existing `delivery_fee` data to all three new columns
    - Keep `delivery_fee` for backward compatibility (default value)

  2. Notes
    - All new columns have default value 0
    - Existing delivery_fee values are copied to all three new columns
*/

-- Add new columns for delivery fees by customer type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_routes' AND column_name = 'delivery_fee_home'
  ) THEN
    ALTER TABLE delivery_routes ADD COLUMN delivery_fee_home DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_routes' AND column_name = 'delivery_fee_gastro'
  ) THEN
    ALTER TABLE delivery_routes ADD COLUMN delivery_fee_gastro DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_routes' AND column_name = 'delivery_fee_wholesale'
  ) THEN
    ALTER TABLE delivery_routes ADD COLUMN delivery_fee_wholesale DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- Migrate existing delivery_fee values to new columns
UPDATE delivery_routes
SET 
  delivery_fee_home = COALESCE(delivery_fee, 0),
  delivery_fee_gastro = COALESCE(delivery_fee, 0),
  delivery_fee_wholesale = COALESCE(delivery_fee, 0)
WHERE delivery_fee_home = 0 AND delivery_fee_gastro = 0 AND delivery_fee_wholesale = 0;