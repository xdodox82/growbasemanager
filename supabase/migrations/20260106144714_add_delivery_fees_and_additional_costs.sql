/*
  # Pridanie poplatkov za dopravu, servisu auta a ďalších modulov

  1. Zmeny v existujúcich tabuľkách
    - `delivery_routes` - pridanie delivery_fee (cena za dopravu pre túto trasu)
    - `customers` - pridanie free_delivery (boolean pre výnimku dopravy zdarma)

  2. Nové tabuľky
    - `delivery_settings` - Globálne nastavenia dopravy
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null)
      - `free_delivery_threshold` (numeric) - Suma nad ktorou je doprava zdarma
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `car_service_costs` - Servis auta
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null)
      - `date` (date, not null)
      - `description` (text, not null) - Popis úkonu
      - `km_state` (numeric) - Stav KM
      - `price` (numeric, not null)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `other_costs` - Ostatné réžie s vlastnými kategóriami
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null)
      - `date` (date, not null)
      - `category` (text, not null) - Vlastná kategória (napr. "Servis auta", "Nájom")
      - `description` (text, not null)
      - `price` (numeric, not null)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `consumable_inventory` - Spotrebný materiál s vlastnými kategóriami
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null)
      - `category` (text, not null) - Vlastná kategória (napr. "Čistiace prostriedky")
      - `name` (text, not null) - Názov položky
      - `quantity` (numeric, not null)
      - `unit` (text, not null) - Jednotka (ks, kg, l, atď.)
      - `min_quantity` (numeric) - Minimálne množstvo pre upozornenie
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Zabezpečenie
    - Enable RLS na všetkých nových tabulkách
    - Politiky pre čítanie, vkladanie, upravovanie a mazanie
    - user_id sa automaticky nastaví na auth.uid()
*/

-- Pridanie delivery_fee do delivery_routes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_routes' AND column_name = 'delivery_fee'
  ) THEN
    ALTER TABLE delivery_routes ADD COLUMN delivery_fee numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Pridanie free_delivery do customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'free_delivery'
  ) THEN
    ALTER TABLE customers ADD COLUMN free_delivery boolean DEFAULT false;
  END IF;
END $$;

-- Tabuľka pre globálne nastavenia dopravy
CREATE TABLE IF NOT EXISTS delivery_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  free_delivery_threshold numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabuľka pre servis auta
CREATE TABLE IF NOT EXISTS car_service_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL,
  description text NOT NULL,
  km_state numeric(10,1),
  price numeric(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Tabuľka pre ostatné réžie
CREATE TABLE IF NOT EXISTS other_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  price numeric(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Tabuľka pre spotrebný materiál
CREATE TABLE IF NOT EXISTS consumable_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  category text NOT NULL,
  name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit text NOT NULL,
  min_quantity numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_service_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumable_inventory ENABLE ROW LEVEL SECURITY;

-- Politiky pre delivery_settings
CREATE POLICY "Users can view own delivery settings"
  ON delivery_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own delivery settings"
  ON delivery_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own delivery settings"
  ON delivery_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politiky pre car_service_costs
CREATE POLICY "Users can view own car service costs"
  ON car_service_costs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own car service costs"
  ON car_service_costs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own car service costs"
  ON car_service_costs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own car service costs"
  ON car_service_costs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiky pre other_costs
CREATE POLICY "Users can view own other costs"
  ON other_costs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own other costs"
  ON other_costs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own other costs"
  ON other_costs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own other costs"
  ON other_costs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiky pre consumable_inventory
CREATE POLICY "Users can view own consumable inventory"
  ON consumable_inventory FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consumable inventory"
  ON consumable_inventory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consumable inventory"
  ON consumable_inventory FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own consumable inventory"
  ON consumable_inventory FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger pre updated_at v delivery_settings
CREATE OR REPLACE FUNCTION update_delivery_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_delivery_settings_timestamp
  BEFORE UPDATE ON delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_settings_updated_at();

-- Trigger pre updated_at v consumable_inventory
CREATE OR REPLACE FUNCTION update_consumable_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_consumable_inventory_timestamp
  BEFORE UPDATE ON consumable_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_consumable_inventory_updated_at();
