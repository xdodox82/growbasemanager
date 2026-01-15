/*
  # Add INSERT policies for data migration

  1. Purpose
    - Enable authenticated users to insert data during migration
    - Add INSERT policies for all tables that currently lack them

  2. Tables affected
    - customers
    - orders
    - order_items
    - planting_plans
    - seeds
    - packagings
    - substrates
    - other_inventory
    - labels
    - delivery_days
    - delivery_routes
    - prices
    - crops
    - blends
    - suppliers

  3. Security
    - Policies allow INSERT for authenticated users
    - This enables data migration while maintaining authentication requirement
*/

-- Drop existing INSERT policies if they exist and recreate them
DO $$ 
BEGIN
  -- customers table
  DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
  CREATE POLICY "Authenticated users can insert customers"
    ON customers FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- orders table
  DROP POLICY IF EXISTS "Authenticated users can insert orders" ON orders;
  CREATE POLICY "Authenticated users can insert orders"
    ON orders FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- order_items table
  DROP POLICY IF EXISTS "Authenticated users can insert order items" ON order_items;
  CREATE POLICY "Authenticated users can insert order items"
    ON order_items FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- planting_plans table
  DROP POLICY IF EXISTS "Authenticated users can insert planting plans" ON planting_plans;
  CREATE POLICY "Authenticated users can insert planting plans"
    ON planting_plans FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- seeds table
  DROP POLICY IF EXISTS "Authenticated users can insert seeds" ON seeds;
  CREATE POLICY "Authenticated users can insert seeds"
    ON seeds FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- packagings table
  DROP POLICY IF EXISTS "Authenticated users can insert packagings" ON packagings;
  CREATE POLICY "Authenticated users can insert packagings"
    ON packagings FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- substrates table
  DROP POLICY IF EXISTS "Authenticated users can insert substrates" ON substrates;
  CREATE POLICY "Authenticated users can insert substrates"
    ON substrates FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- other_inventory table
  DROP POLICY IF EXISTS "Authenticated users can insert other inventory" ON other_inventory;
  CREATE POLICY "Authenticated users can insert other inventory"
    ON other_inventory FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- labels table
  DROP POLICY IF EXISTS "Authenticated users can insert labels" ON labels;
  CREATE POLICY "Authenticated users can insert labels"
    ON labels FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- delivery_days table
  DROP POLICY IF EXISTS "Authenticated users can insert delivery days" ON delivery_days;
  CREATE POLICY "Authenticated users can insert delivery days"
    ON delivery_days FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- delivery_routes table
  DROP POLICY IF EXISTS "Authenticated users can insert delivery routes" ON delivery_routes;
  CREATE POLICY "Authenticated users can insert delivery routes"
    ON delivery_routes FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- prices table
  DROP POLICY IF EXISTS "Authenticated users can insert prices" ON prices;
  CREATE POLICY "Authenticated users can insert prices"
    ON prices FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- crops table
  DROP POLICY IF EXISTS "Authenticated users can insert crops" ON crops;
  CREATE POLICY "Authenticated users can insert crops"
    ON crops FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- blends table
  DROP POLICY IF EXISTS "Authenticated users can insert blends" ON blends;
  CREATE POLICY "Authenticated users can insert blends"
    ON blends FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- suppliers table
  DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON suppliers;
  CREATE POLICY "Authenticated users can insert suppliers"
    ON suppliers FOR INSERT
    TO authenticated
    WITH CHECK (true);
END $$;
