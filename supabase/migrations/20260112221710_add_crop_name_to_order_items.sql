/*
  # Add crop_name to order_items
  
  1. Changes
    - Add `crop_name` text field to order_items table
    - This stores the denormalized crop name for faster display
  
  2. Purpose
    - Enable order card display to show crop names without joins
    - Improve query performance
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'crop_name'
  ) THEN
    ALTER TABLE order_items ADD COLUMN crop_name text;
  END IF;
END $$;