/*
  # Fix Existing Data - Set user_id
  
  1. Purpose
    - Update all existing records to set user_id to the first authenticated user
    - This fixes the issue where existing data cannot be accessed due to RLS policies
  
  2. Changes
    - Update all tables with NULL user_id to use the first user's ID
    - Tables updated: crops, customers, orders, planting_plans, blends, seeds,
      packagings, substrates, other_inventory, suppliers, delivery_days,
      delivery_routes, tasks, labels, order_items, prices, vat_settings
  
  3. Security
    - Only updates records where user_id IS NULL
    - Maintains existing user_id values for records that already have them
*/

-- Get the first user's ID and store it in a variable
DO $$ 
DECLARE
  first_user_id UUID;
BEGIN
  -- Get the first user from auth.users
  SELECT id INTO first_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Only proceed if we found a user
  IF first_user_id IS NOT NULL THEN
    -- Update all tables where user_id is NULL
    UPDATE crops SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE customers SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE orders SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE planting_plans SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE blends SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE seeds SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE packagings SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE substrates SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE other_inventory SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE suppliers SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE delivery_days SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE delivery_routes SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE tasks SET user_id = first_user_id WHERE user_id IS NULL;
    UPDATE labels SET user_id = first_user_id WHERE user_id IS NULL;
    
    -- Check if order_items table exists before updating
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
      UPDATE order_items SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    -- Check if prices table exists before updating
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prices') THEN
      UPDATE prices SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    -- Check if vat_settings table exists before updating
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vat_settings') THEN
      UPDATE vat_settings SET user_id = first_user_id WHERE user_id IS NULL;
    END IF;
    
    RAISE NOTICE 'Updated all records with user_id: %', first_user_id;
  ELSE
    RAISE NOTICE 'No users found in auth.users table';
  END IF;
END $$;
