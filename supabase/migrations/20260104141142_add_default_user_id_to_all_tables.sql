/*
  # Pridanie DEFAULT hodnoty pre user_id do všetkých tabuliek
  
  1. Purpose
    - Automaticky vyplniť user_id z auth.uid() pri vytváraní nových záznamov
    - Zabezpečiť, že každý nový záznam bude patriť prihlássenému užívateľovi
  
  2. Changes
    - Nastaviť DEFAULT auth.uid() pre user_id stĺpce vo všetkých hlavných tabuľkách
    - Upraviť RLS politiky pre INSERT ak je potrebné
  
  3. Security
    - Zabezpečí, že všetky nové záznamy budú patriť správnemu užívateľovi
*/

-- Crops table
ALTER TABLE crops 
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Customers table
ALTER TABLE customers 
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Orders table
ALTER TABLE orders 
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Blends table
ALTER TABLE blends 
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Plantings table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plantings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE plantings 
      ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Harvests table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'harvests' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE harvests 
      ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Delivery routes table
ALTER TABLE delivery_routes 
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Seeds table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seeds' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE seeds 
      ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Substrate table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'substrate' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE substrate 
      ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Packaging table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'packaging' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE packaging 
      ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Labels table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'labels' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE labels 
      ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Other inventory table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'other_inventory' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE other_inventory 
      ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Suppliers table (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'suppliers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE suppliers 
      ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;
