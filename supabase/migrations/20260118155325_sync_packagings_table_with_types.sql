/*
  # Sync Packagings Table with TypeScript Interfaces

  ## Changes
  1. Add missing columns to packagings table:
    - `supplier` (text) - Supplier name as text (for backwards compatibility)
    - `stock_date` (date) - Date of stocking (dátum naskladnenia)

  ## Notes
  - Uses IF NOT EXISTS to avoid errors if columns already exist
  - No existing data will be deleted
  - All new columns are nullable for backwards compatibility
  - Maps TypeScript interface fields:
    - supplier → supplier
    - stockDate → stock_date
*/

-- Add supplier column to packagings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packagings' AND column_name = 'supplier'
  ) THEN
    ALTER TABLE packagings ADD COLUMN supplier text;
  END IF;
END $$;

-- Add stock_date column to packagings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packagings' AND column_name = 'stock_date'
  ) THEN
    ALTER TABLE packagings ADD COLUMN stock_date date;
  END IF;
END $$;
