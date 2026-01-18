/*
  # Add customer_type column to orders table

  1. Changes
    - Add `customer_type` column to orders table
      - Type: text
      - Nullable: true (orders may exist without customer type)
      - Used to store customer type (domáci, gastro, veľkoobchod) for delivery fee calculations
    
  2. Notes
    - This column allows orders to reference customer type directly
    - Supports automatic delivery fee calculation based on customer type
    - Safe to add as nullable column to existing table
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_type text;
  END IF;
END $$;