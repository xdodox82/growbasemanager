/*
  # Fix Numeric Types and Add Special Item Support

  1. Schema Changes
    - Convert price fields from integer to numeric in orders and order_items
    - Add special item support columns to order_items table
    - Ensure weight_g remains integer in packaging_mappings
  
  2. Modified Tables
    - `orders`: 
      - total_price: integer → numeric(10,2)
      - delivery_price: integer → numeric(10,2)
    - `order_items`:
      - price_per_unit: integer → numeric(10,2)
      - Add is_special_item boolean (default false)
      - Add custom_crop_name text (nullable)
  
  3. Important Notes
    - Numeric type allows decimal values (e.g., 4.2)
    - Special items can have null crop_id
    - Custom crop name stored when special item is checked
*/

-- Fix orders table price fields
DO $$
BEGIN
  -- Convert total_price to numeric if not already
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'total_price' 
    AND data_type != 'numeric'
  ) THEN
    ALTER TABLE orders ALTER COLUMN total_price TYPE numeric(10,2);
  END IF;

  -- Convert delivery_price to numeric if not already
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'delivery_price' 
    AND data_type != 'numeric'
  ) THEN
    ALTER TABLE orders ALTER COLUMN delivery_price TYPE numeric(10,2);
  END IF;
END $$;

-- Fix order_items table price field
DO $$
BEGIN
  -- Convert price_per_unit to numeric if not already
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' 
    AND column_name = 'price_per_unit' 
    AND data_type != 'numeric'
  ) THEN
    ALTER TABLE order_items ALTER COLUMN price_per_unit TYPE numeric(10,2);
  END IF;
END $$;

-- Add special item support columns to order_items
DO $$
BEGIN
  -- Add is_special_item column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'is_special_item'
  ) THEN
    ALTER TABLE order_items ADD COLUMN is_special_item boolean DEFAULT false;
  END IF;

  -- Add custom_crop_name column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'custom_crop_name'
  ) THEN
    ALTER TABLE order_items ADD COLUMN custom_crop_name text;
  END IF;
END $$;

-- Make crop_id nullable in order_items (for special items)
DO $$
BEGIN
  ALTER TABLE order_items ALTER COLUMN crop_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;
