/*
  # Add route field to orders table
  
  1. Changes
    - Add `route` text field to store the delivery route name for each order
    - This field links to the delivery_routes table by name
  
  2. Purpose
    - Track which delivery route an order is assigned to
    - Support route filtering and organization
    - Enable route-based delivery fee calculation
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'route'
  ) THEN
    ALTER TABLE orders ADD COLUMN route text;
  END IF;
END $$;