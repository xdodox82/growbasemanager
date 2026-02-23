/*
  # Add Price Fields to Order Items
  
  1. Changes
    - Add `price_per_unit` column to store the unit price for each item
    - Add `total_price` column to store the calculated total (quantity × price_per_unit)
    - Both fields are numeric with default value of 0
  
  2. Purpose
    - Enable proper price tracking per order item
    - Support order card display showing individual item prices
    - Improve order total calculations
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'price_per_unit'
  ) THEN
    ALTER TABLE order_items ADD COLUMN price_per_unit numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'total_price'
  ) THEN
    ALTER TABLE order_items ADD COLUMN total_price numeric DEFAULT 0;
  END IF;
END $$;