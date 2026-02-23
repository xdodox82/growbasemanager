/*
  # Add source_orders column to planting_plans

  1. Changes
    - Add source_orders (jsonb, nullable) column to planting_plans table
    - This column will store an array of order IDs that generated this planting plan
    - NULL for manually created plans
    - Example: ["order-id-1", "order-id-2"]

  2. Notes
    - Existing plans will have NULL source_orders (manually created)
    - Auto-generated plans will store order IDs for traceability
*/

-- Add source_orders column to planting_plans
ALTER TABLE planting_plans
ADD COLUMN IF NOT EXISTS source_orders jsonb DEFAULT NULL;

-- Add index for performance when querying by source orders
CREATE INDEX IF NOT EXISTS idx_planting_plans_source_orders
ON planting_plans USING gin(source_orders);

-- Add comment for documentation
COMMENT ON COLUMN planting_plans.source_orders IS 'Array of order IDs that generated this planting plan (NULL for manual plans)';
