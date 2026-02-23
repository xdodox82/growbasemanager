/*
  # Add charge_delivery toggle to orders

  1. Changes
    - Add `charge_delivery` boolean column to orders table
    - Default value is TRUE (charge delivery by default)
    - This allows manual override of automatic delivery fee calculation

  2. Notes
    - Manual toggle has priority over all automatic rules
    - If charge_delivery is FALSE, no delivery fee is charged regardless of route or customer settings
*/

-- Add charge_delivery column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'charge_delivery'
  ) THEN
    ALTER TABLE orders ADD COLUMN charge_delivery BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Set existing orders to TRUE (charge delivery by default)
UPDATE orders
SET charge_delivery = TRUE
WHERE charge_delivery IS NULL;