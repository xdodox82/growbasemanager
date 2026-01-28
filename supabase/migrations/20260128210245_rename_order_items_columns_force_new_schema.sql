/*
  # Rename order_items Columns to Force Schema Refresh

  1. Purpose
    - Force a complete schema cache invalidation by renaming columns
    - Break the client-side cache by changing column names
    - Ensure PostgREST picks up the new schema

  2. Column Renames
    - packaging_volume_ml → package_ml
    - packaging_type → package_type  
    - has_label → has_label_req

  3. Security
    - Maintain all existing RLS policies
    - Re-grant permissions after column changes
*/

-- Step 1: Rename the columns
ALTER TABLE order_items RENAME COLUMN packaging_volume_ml TO package_ml;
ALTER TABLE order_items RENAME COLUMN packaging_type TO package_type;
ALTER TABLE order_items RENAME COLUMN has_label TO has_label_req;

-- Step 2: Re-grant all permissions
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON order_items TO service_role;

-- Step 3: Ensure RLS is enabled
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop and recreate RLS policies (they reference the table, not specific columns)
DROP POLICY IF EXISTS "Users can view own order_items" ON order_items;
DROP POLICY IF EXISTS "Users can insert own order_items" ON order_items;
DROP POLICY IF EXISTS "Users can update own order_items" ON order_items;
DROP POLICY IF EXISTS "Users can delete own order_items" ON order_items;

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

-- Step 5: Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
