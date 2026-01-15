/*
  # Add delivery price fields to orders table

  1. Changes
    - Add `delivery_price` numeric field to store the delivery fee for the order
    - Add `delivery_type` text field to indicate delivery type: 'free', 'included', 'charged'
  
  2. Purpose
    - Track actual delivery charges per order
    - Allow manual override of delivery prices
    - Distinguish between free delivery, included in price, and charged separately
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_price'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_price numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_type text DEFAULT 'charged';
  END IF;
END $$;
