/*
  # Add user_id and Update RLS Policies
  
  1. Purpose
    - Add user_id column to all data tables
    - Update RLS policies to restrict access based on user_id
    - Ensure data isolation between users
  
  2. Changes
    - Add user_id column (UUID, references auth.users) to:
      * customers, orders, planting_plans, crops, blends
      * seeds, packagings, substrates, other_inventory
      * suppliers, delivery_days, delivery_routes
      * tasks, labels, order_items, prices, vat_settings
    - Drop old permissive policies
    - Create new restrictive policies:
      * SELECT: auth.uid() = user_id
      * INSERT: auth.uid() = user_id
      * UPDATE: auth.uid() = user_id
      * DELETE: admin role or auth.uid() = user_id
  
  3. Security
    - All data access restricted to owner (user_id match)
    - Admins can still delete records
    - Maintains data isolation between users
*/

-- Add user_id column to all relevant tables if it doesn't exist
DO $$ 
BEGIN
  -- customers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- planting_plans
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planting_plans' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- crops
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crops' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE crops ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- blends
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blends' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE blends ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- seeds
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seeds' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE seeds ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- packagings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'packagings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE packagings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- substrates
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'substrates' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE substrates ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- other_inventory
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'other_inventory' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE other_inventory ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- suppliers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- delivery_days
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_days' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE delivery_days ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- delivery_routes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_routes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE delivery_routes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- tasks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- labels
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'labels' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE labels ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- order_items
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE order_items ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- prices
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prices' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE prices ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- vat_settings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vat_settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE vat_settings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop all existing policies and create new restrictive ones

-- CUSTOMERS TABLE
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
DROP POLICY IF EXISTS "Admins can update customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers"
  ON customers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ORDERS TABLE
DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- PLANTING_PLANS TABLE
DROP POLICY IF EXISTS "Authenticated users can view planting_plans" ON planting_plans;
DROP POLICY IF EXISTS "Authenticated users can insert planting_plans" ON planting_plans;
DROP POLICY IF EXISTS "Authenticated users can update planting_plans" ON planting_plans;
DROP POLICY IF EXISTS "Admins can delete planting_plans" ON planting_plans;

CREATE POLICY "Users can view own planting plans"
  ON planting_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planting plans"
  ON planting_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planting plans"
  ON planting_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own planting plans"
  ON planting_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- CROPS TABLE
DROP POLICY IF EXISTS "Authenticated users can view crops" ON crops;
DROP POLICY IF EXISTS "Authenticated users can insert crops" ON crops;
DROP POLICY IF EXISTS "Admins can update crops" ON crops;
DROP POLICY IF EXISTS "Admins can delete crops" ON crops;

CREATE POLICY "Users can view own crops"
  ON crops FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crops"
  ON crops FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crops"
  ON crops FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own crops"
  ON crops FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- BLENDS TABLE
DROP POLICY IF EXISTS "Authenticated users can view blends" ON blends;
DROP POLICY IF EXISTS "Authenticated users can insert blends" ON blends;
DROP POLICY IF EXISTS "Admins can update blends" ON blends;
DROP POLICY IF EXISTS "Admins can delete blends" ON blends;

CREATE POLICY "Users can view own blends"
  ON blends FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blends"
  ON blends FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blends"
  ON blends FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own blends"
  ON blends FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- SEEDS TABLE
DROP POLICY IF EXISTS "Authenticated users can view seeds" ON seeds;
DROP POLICY IF EXISTS "Authenticated users can insert seeds" ON seeds;
DROP POLICY IF EXISTS "Admins can update seeds" ON seeds;
DROP POLICY IF EXISTS "Admins can delete seeds" ON seeds;

CREATE POLICY "Users can view own seeds"
  ON seeds FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seeds"
  ON seeds FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own seeds"
  ON seeds FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own seeds"
  ON seeds FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- PACKAGINGS TABLE
DROP POLICY IF EXISTS "Authenticated users can view packagings" ON packagings;
DROP POLICY IF EXISTS "Authenticated users can insert packagings" ON packagings;
DROP POLICY IF EXISTS "Admins can update packagings" ON packagings;
DROP POLICY IF EXISTS "Admins can delete packagings" ON packagings;

CREATE POLICY "Users can view own packagings"
  ON packagings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own packagings"
  ON packagings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packagings"
  ON packagings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own packagings"
  ON packagings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- SUBSTRATES TABLE
DROP POLICY IF EXISTS "Authenticated users can view substrates" ON substrates;
DROP POLICY IF EXISTS "Authenticated users can insert substrates" ON substrates;
DROP POLICY IF EXISTS "Admins can update substrates" ON substrates;
DROP POLICY IF EXISTS "Admins can delete substrates" ON substrates;

CREATE POLICY "Users can view own substrates"
  ON substrates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own substrates"
  ON substrates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own substrates"
  ON substrates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own substrates"
  ON substrates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- OTHER_INVENTORY TABLE
DROP POLICY IF EXISTS "Authenticated users can view other inventory" ON other_inventory;
DROP POLICY IF EXISTS "Authenticated users can insert other inventory" ON other_inventory;
DROP POLICY IF EXISTS "Admins can update other inventory" ON other_inventory;
DROP POLICY IF EXISTS "Admins can delete other inventory" ON other_inventory;

CREATE POLICY "Users can view own other inventory"
  ON other_inventory FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own other inventory"
  ON other_inventory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own other inventory"
  ON other_inventory FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own other inventory"
  ON other_inventory FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- SUPPLIERS TABLE
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins can delete suppliers" ON suppliers;

CREATE POLICY "Users can view own suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- DELIVERY_DAYS TABLE
DROP POLICY IF EXISTS "Authenticated users can view delivery days" ON delivery_days;
DROP POLICY IF EXISTS "Authenticated users can insert delivery days" ON delivery_days;
DROP POLICY IF EXISTS "Admins can update delivery days" ON delivery_days;
DROP POLICY IF EXISTS "Admins can delete delivery days" ON delivery_days;

CREATE POLICY "Users can view own delivery days"
  ON delivery_days FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own delivery days"
  ON delivery_days FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own delivery days"
  ON delivery_days FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own delivery days"
  ON delivery_days FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- DELIVERY_ROUTES TABLE
DROP POLICY IF EXISTS "Authenticated users can view delivery routes" ON delivery_routes;
DROP POLICY IF EXISTS "Authenticated users can insert delivery routes" ON delivery_routes;
DROP POLICY IF EXISTS "Admins can update delivery routes" ON delivery_routes;
DROP POLICY IF EXISTS "Admins can delete delivery routes" ON delivery_routes;

CREATE POLICY "Users can view own delivery routes"
  ON delivery_routes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own delivery routes"
  ON delivery_routes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own delivery routes"
  ON delivery_routes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own delivery routes"
  ON delivery_routes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- TASKS TABLE
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- LABELS TABLE
DROP POLICY IF EXISTS "Authenticated users can view labels" ON labels;
DROP POLICY IF EXISTS "Authenticated users can insert labels" ON labels;
DROP POLICY IF EXISTS "Admins can update labels" ON labels;
DROP POLICY IF EXISTS "Admins can delete labels" ON labels;

CREATE POLICY "Users can view own labels"
  ON labels FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own labels"
  ON labels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own labels"
  ON labels FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own labels"
  ON labels FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ORDER_ITEMS TABLE
DROP POLICY IF EXISTS "Authenticated users can view order items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can update order items" ON order_items;
DROP POLICY IF EXISTS "Admins can delete order items" ON order_items;

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own order items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own order items"
  ON order_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- PRICES TABLE
DROP POLICY IF EXISTS "Authenticated users can view prices" ON prices;
DROP POLICY IF EXISTS "Authenticated users can insert prices" ON prices;
DROP POLICY IF EXISTS "Admins can update prices" ON prices;
DROP POLICY IF EXISTS "Admins can delete prices" ON prices;

CREATE POLICY "Users can view own prices"
  ON prices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prices"
  ON prices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prices"
  ON prices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prices"
  ON prices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- VAT_SETTINGS TABLE
DROP POLICY IF EXISTS "Authenticated users can view vat settings" ON vat_settings;
DROP POLICY IF EXISTS "Authenticated users can insert vat settings" ON vat_settings;
DROP POLICY IF EXISTS "Admins can update vat settings" ON vat_settings;
DROP POLICY IF EXISTS "Admins can delete vat settings" ON vat_settings;

CREATE POLICY "Users can view own vat settings"
  ON vat_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vat settings"
  ON vat_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vat settings"
  ON vat_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vat settings"
  ON vat_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));