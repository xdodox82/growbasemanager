/*
  # Sync Order Items Table with TypeScript Interfaces

  ## Changes
  1. Add missing columns to order_items table:
    - `pieces` (integer) - Number of pieces (počet kusov)

  ## Notes
  - Uses IF NOT EXISTS to avoid errors if column already exists
  - No existing data will be deleted
  - pieces column is nullable for backwards compatibility
  - Maps TypeScript interface field: pieces → pieces
*/

-- Add pieces column to order_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'pieces'
  ) THEN
    ALTER TABLE order_items ADD COLUMN pieces integer;
  END IF;
END $$;
