/*
  # Sync Orders Table with TypeScript Interfaces

  ## Changes
  1. Add missing columns to orders table:
    - `delivery_route_id` (uuid) - Reference to delivery routes
    - `recurring_type` (text) - Type of recurring order: 'single', 'weekly', 'biweekly'

  ## Notes
  - Uses IF NOT EXISTS to avoid errors if columns already exist
  - No existing data will be deleted
  - delivery_route_id is nullable for backwards compatibility
  - recurring_type defaults to 'single' for existing records
*/

-- Add delivery_route_id column to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_route_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_route_id uuid REFERENCES delivery_routes(id);
  END IF;
END $$;

-- Add recurring_type column to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'recurring_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN recurring_type text DEFAULT 'single' CHECK (recurring_type IN ('single', 'weekly', 'biweekly'));
  END IF;
END $$;
