/*
  # Add Packaging Type Support

  1. Changes to Tables
    - Add `default_packaging_type` to `customers` table
      - Type: text
      - Default: 'rPET'
      - Stores customer's preferred packaging type ('rPET' or 'Vratný obal')
    
    - Add `packaging_type` to `order_items` table
      - Type: text
      - Default: 'rPET'
      - Stores the packaging type for each order item
  
  2. Security
    - No RLS changes needed (inherits from existing policies)
*/

-- Add default_packaging_type to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'customers'
    AND column_name = 'default_packaging_type'
  ) THEN
    ALTER TABLE customers 
    ADD COLUMN default_packaging_type text DEFAULT 'rPET';
  END IF;
END $$;

-- Add packaging_type to order_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'order_items'
    AND column_name = 'packaging_type'
  ) THEN
    ALTER TABLE order_items 
    ADD COLUMN packaging_type text DEFAULT 'rPET';
  END IF;
END $$;

-- Add comment to explain the columns
COMMENT ON COLUMN customers.default_packaging_type IS 'Customer preferred packaging type: rPET or Vratný obal';
COMMENT ON COLUMN order_items.packaging_type IS 'Packaging type for this order item: rPET or Vratný obal';
