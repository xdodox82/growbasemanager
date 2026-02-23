/*
  # Sync Seeds Table with TypeScript Interfaces

  ## Changes
  1. Add missing columns to seeds table:
    - `batch_number` (text) - Batch number (číslo šarže)
    - `consumption_end_date` (date) - End date of consumption period
    - `certificate` (text) - Certificate name
    - `certificate_file` (text) - Base64 encoded PDF certificate file

  ## Notes
  - Uses IF NOT EXISTS to avoid errors if columns already exist
  - No existing data will be deleted
  - All new columns are nullable for backwards compatibility
  - Maps TypeScript interface fields:
    - batchNumber → batch_number
    - consumptionEndDate → consumption_end_date
    - certificate → certificate
    - certificateFile → certificate_file
*/

-- Add batch_number column to seeds table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seeds' AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE seeds ADD COLUMN batch_number text;
  END IF;
END $$;

-- Add consumption_end_date column to seeds table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seeds' AND column_name = 'consumption_end_date'
  ) THEN
    ALTER TABLE seeds ADD COLUMN consumption_end_date date;
  END IF;
END $$;

-- Add certificate column to seeds table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seeds' AND column_name = 'certificate'
  ) THEN
    ALTER TABLE seeds ADD COLUMN certificate text;
  END IF;
END $$;

-- Add certificate_file column to seeds table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seeds' AND column_name = 'certificate_file'
  ) THEN
    ALTER TABLE seeds ADD COLUMN certificate_file text;
  END IF;
END $$;
