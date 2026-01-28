/*
  # Force Schema Refresh for order_items Table

  1. Purpose
    - Force PostgREST to refresh its schema cache by touching the order_items table
    - Re-grant all necessary permissions to ensure proper access

  2. Changes
    - Add and immediately drop a dummy column to trigger schema refresh
    - Re-grant all SELECT, INSERT, UPDATE, DELETE permissions
    - Ensure RLS policies are properly configured

  3. Security
    - Re-apply all existing RLS policies
    - Ensure authenticated users maintain proper access
*/

-- Step 1: Touch the table by adding and dropping a dummy column
-- This forces PostgREST to invalidate and refresh its schema cache
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS _schema_refresh_dummy text DEFAULT NULL;
ALTER TABLE order_items DROP COLUMN IF EXISTS _schema_refresh_dummy;

-- Step 2: Re-grant all permissions to authenticated role
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON order_items TO service_role;

-- Step 3: Ensure RLS is enabled
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop and recreate all RLS policies to ensure they're fresh
DROP POLICY IF EXISTS "Users can view own order_items" ON order_items;
DROP POLICY IF EXISTS "Users can insert own order_items" ON order_items;
DROP POLICY IF EXISTS "Users can update own order_items" ON order_items;
DROP POLICY IF EXISTS "Users can delete own order_items" ON order_items;

-- Recreate RLS policies
CREATE POLICY "Users can view own order_items"
  ON order_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own order_items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own order_items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own order_items"
  ON order_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 5: Refresh function permissions
-- Ensure the RPC function has proper grants
GRANT EXECUTE ON FUNCTION create_order_item_with_packaging(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_item_with_packaging(jsonb) TO service_role;

-- Step 6: Notify PostgREST to reload schema cache
-- This is done automatically when the migration completes
NOTIFY pgrst, 'reload schema';
