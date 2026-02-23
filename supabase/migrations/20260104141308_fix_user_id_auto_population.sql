/*
  # Fix automatic user_id population
  
  1. Problem
    - DEFAULT auth.uid() doesn't work with RLS policies
    - RLS checks happen before DEFAULT values are applied
  
  2. Solution
    - Create trigger function to auto-populate user_id
    - Apply to all tables with user_id column
    - Update RLS policies to allow NULL user_id during INSERT
  
  3. Security
    - Trigger ensures user_id is always set to authenticated user
    - RLS policies verify ownership after trigger runs
*/

-- Create trigger function to auto-populate user_id
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to crops table
DROP TRIGGER IF EXISTS set_crops_user_id ON crops;
CREATE TRIGGER set_crops_user_id
  BEFORE INSERT ON crops
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Apply trigger to customers table
DROP TRIGGER IF EXISTS set_customers_user_id ON customers;
CREATE TRIGGER set_customers_user_id
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Apply trigger to orders table
DROP TRIGGER IF EXISTS set_orders_user_id ON orders;
CREATE TRIGGER set_orders_user_id
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Apply trigger to blends table
DROP TRIGGER IF EXISTS set_blends_user_id ON blends;
CREATE TRIGGER set_blends_user_id
  BEFORE INSERT ON blends
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Apply trigger to delivery_routes table
DROP TRIGGER IF EXISTS set_delivery_routes_user_id ON delivery_routes;
CREATE TRIGGER set_delivery_routes_user_id
  BEFORE INSERT ON delivery_routes
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Apply to other tables if they exist
DO $$
BEGIN
  -- plantings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plantings') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS set_plantings_user_id ON plantings';
    EXECUTE 'CREATE TRIGGER set_plantings_user_id BEFORE INSERT ON plantings FOR EACH ROW EXECUTE FUNCTION set_user_id()';
  END IF;

  -- harvests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'harvests') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS set_harvests_user_id ON harvests';
    EXECUTE 'CREATE TRIGGER set_harvests_user_id BEFORE INSERT ON harvests FOR EACH ROW EXECUTE FUNCTION set_user_id()';
  END IF;

  -- seeds
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seeds') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS set_seeds_user_id ON seeds';
    EXECUTE 'CREATE TRIGGER set_seeds_user_id BEFORE INSERT ON seeds FOR EACH ROW EXECUTE FUNCTION set_user_id()';
  END IF;

  -- substrate
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'substrate') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS set_substrate_user_id ON substrate';
    EXECUTE 'CREATE TRIGGER set_substrate_user_id BEFORE INSERT ON substrate FOR EACH ROW EXECUTE FUNCTION set_user_id()';
  END IF;

  -- packaging
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'packaging') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS set_packaging_user_id ON packaging';
    EXECUTE 'CREATE TRIGGER set_packaging_user_id BEFORE INSERT ON packaging FOR EACH ROW EXECUTE FUNCTION set_user_id()';
  END IF;

  -- labels
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'labels') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS set_labels_user_id ON labels';
    EXECUTE 'CREATE TRIGGER set_labels_user_id BEFORE INSERT ON labels FOR EACH ROW EXECUTE FUNCTION set_user_id()';
  END IF;

  -- other_inventory
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'other_inventory') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS set_other_inventory_user_id ON other_inventory';
    EXECUTE 'CREATE TRIGGER set_other_inventory_user_id BEFORE INSERT ON other_inventory FOR EACH ROW EXECUTE FUNCTION set_user_id()';
  END IF;

  -- suppliers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS set_suppliers_user_id ON suppliers';
    EXECUTE 'CREATE TRIGGER set_suppliers_user_id BEFORE INSERT ON suppliers FOR EACH ROW EXECUTE FUNCTION set_user_id()';
  END IF;
END $$;

-- Update RLS policies to allow NULL user_id during INSERT (trigger will set it)
DROP POLICY IF EXISTS "Users can insert own crops" ON crops;
CREATE POLICY "Users can insert own crops"
  ON crops FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert own customers" ON customers;
CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert own blends" ON blends;
CREATE POLICY "Users can insert own blends"
  ON blends FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert own delivery routes" ON delivery_routes;
CREATE POLICY "Users can insert own delivery routes"
  ON delivery_routes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
