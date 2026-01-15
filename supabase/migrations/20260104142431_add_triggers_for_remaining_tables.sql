/*
  # Pridanie triggerov pre zostávajúce tabuľky
  
  1. Purpose
    - Automaticky vyplniť user_id pre všetky tabuľky, ktoré ho potrebujú
    - Zabezpečiť konzistenciu dát naprieč celou aplikáciou
  
  2. Tables
    - order_items (dôležité pre objednávky)
    - packagings (správny názov tabuľky)
    - substrates (správny názov tabuľky)
    - tasks
    - delivery_days
    - prices
    - profiles
    - notification_settings
    - vat_settings
    - worker_permissions
  
  3. Security
    - Každý záznam bude automaticky priradený k správnemu užívateľovi
*/

-- order_items
DROP TRIGGER IF EXISTS set_order_items_user_id ON order_items;
CREATE TRIGGER set_order_items_user_id
  BEFORE INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- packagings
DROP TRIGGER IF EXISTS set_packagings_user_id ON packagings;
CREATE TRIGGER set_packagings_user_id
  BEFORE INSERT ON packagings
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- substrates
DROP TRIGGER IF EXISTS set_substrates_user_id ON substrates;
CREATE TRIGGER set_substrates_user_id
  BEFORE INSERT ON substrates
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- tasks
DROP TRIGGER IF EXISTS set_tasks_user_id ON tasks;
CREATE TRIGGER set_tasks_user_id
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- delivery_days
DROP TRIGGER IF EXISTS set_delivery_days_user_id ON delivery_days;
CREATE TRIGGER set_delivery_days_user_id
  BEFORE INSERT ON delivery_days
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- prices
DROP TRIGGER IF EXISTS set_prices_user_id ON prices;
CREATE TRIGGER set_prices_user_id
  BEFORE INSERT ON prices
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- profiles (special case - might not need it, but for consistency)
DROP TRIGGER IF EXISTS set_profiles_user_id ON profiles;
CREATE TRIGGER set_profiles_user_id
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- notification_settings
DROP TRIGGER IF EXISTS set_notification_settings_user_id ON notification_settings;
CREATE TRIGGER set_notification_settings_user_id
  BEFORE INSERT ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- vat_settings
DROP TRIGGER IF EXISTS set_vat_settings_user_id ON vat_settings;
CREATE TRIGGER set_vat_settings_user_id
  BEFORE INSERT ON vat_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- worker_permissions
DROP TRIGGER IF EXISTS set_worker_permissions_user_id ON worker_permissions;
CREATE TRIGGER set_worker_permissions_user_id
  BEFORE INSERT ON worker_permissions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Update RLS policies for these tables to use COALESCE
-- order_items
DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;
CREATE POLICY "Users can insert own order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

-- packagings
DROP POLICY IF EXISTS "Users can insert own packagings" ON packagings;
CREATE POLICY "Users can insert own packagings"
  ON packagings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

-- substrates
DROP POLICY IF EXISTS "Users can insert own substrates" ON substrates;
CREATE POLICY "Users can insert own substrates"
  ON substrates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

-- tasks
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
