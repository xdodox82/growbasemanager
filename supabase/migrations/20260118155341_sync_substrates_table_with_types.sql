/*
  # Sync Substrates Table with TypeScript Interfaces

  ## Changes
  1. Add missing columns to substrates table:
    - `custom_type` (text) - Custom substrate type (when type is 'other')
    - `supplier` (text) - Supplier name as text (for backwards compatibility)
    - `stock_date` (date) - Date of stocking (dátum naskladnenia)
    - `current_stock` (numeric) - Current stock amount (aktuálne množstvo na sklade)

  ## Notes
  - Uses IF NOT EXISTS to avoid errors if columns already exist
  - No existing data will be deleted
  - All new columns are nullable for backwards compatibility
  - Maps TypeScript interface fields:
    - customType → custom_type
    - supplier → supplier
    - stockDate → stock_date
    - currentStock → current_stock
*/

-- Add custom_type column to substrates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'substrates' AND column_name = 'custom_type'
  ) THEN
    ALTER TABLE substrates ADD COLUMN custom_type text;
  END IF;
END $$;

-- Add supplier column to substrates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'substrates' AND column_name = 'supplier'
  ) THEN
    ALTER TABLE substrates ADD COLUMN supplier text;
  END IF;
END $$;

-- Add stock_date column to substrates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'substrates' AND column_name = 'stock_date'
  ) THEN
    ALTER TABLE substrates ADD COLUMN stock_date date;
  END IF;
END $$;

-- Add current_stock column to substrates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'substrates' AND column_name = 'current_stock'
  ) THEN
    ALTER TABLE substrates ADD COLUMN current_stock numeric DEFAULT 0;
  END IF;
END $$;
