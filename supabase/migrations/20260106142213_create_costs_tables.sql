/*
  # Vytvorenie tabuliek pre evidenciu nákladov

  1. Nové tabuľky
    - `fuel_costs` - Evidencia pohonných hmôt
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null) - odkaz na používateľa
      - `date` (date, not null) - dátum tankovania
      - `liters` (numeric, not null) - počet litrov
      - `fuel_type` (text, not null) - druh paliva (benzin/diesel)
      - `price_per_liter` (numeric, not null) - cena za 1L
      - `total_price` (numeric, not null) - celková suma
      - `trip_km` (numeric) - km od posledného tankovania
      - `avg_consumption` (numeric) - priemerná spotreba (vypočítaná)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `adblue_costs` - Evidencia AdBlue
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null)
      - `date` (date, not null)
      - `liters` (numeric, not null)
      - `price_per_liter` (numeric, not null)
      - `total_price` (numeric, not null)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `electricity_costs` - Evidencia spotreby elektriny
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null)
      - `month` (date, not null) - mesiac (prvý deň mesiaca)
      - `meter_start` (numeric, not null) - počiatočný stav elektromeru
      - `meter_end` (numeric, not null) - konečný stav elektromeru
      - `total_consumption` (numeric, not null) - celková spotreba (vypočítaná)
      - `price_per_kwh` (numeric) - cena za kWh
      - `total_price` (numeric) - celková suma
      - `notes` (text)
      - `created_at` (timestamptz)

    - `water_costs` - Evidencia spotreby vody
      - `id` (uuid, primary key)
      - `user_id` (uuid, not null)
      - `month` (date, not null) - mesiac (prvý deň mesiaca)
      - `meter_start` (numeric, not null) - počiatočný stav vodomeru
      - `meter_end` (numeric, not null) - konečný stav vodomeru
      - `total_consumption` (numeric, not null) - celková spotreba (vypočítaná)
      - `price_per_m3` (numeric) - cena za m3
      - `total_price` (numeric) - celková suma
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Zabezpečenie
    - Enable RLS na všetkých tabulkách
    - Politiky pre čítanie, vkladanie, upravovanie a mazanie pre autentifikovaných používateľov
    - user_id sa automaticky nastaví na auth.uid() pri vkladaní
*/

-- Tabuľka pre pohonné hmoty
CREATE TABLE IF NOT EXISTS fuel_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL,
  liters numeric(10,2) NOT NULL,
  fuel_type text NOT NULL CHECK (fuel_type IN ('benzin', 'diesel')),
  price_per_liter numeric(10,3) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  trip_km numeric(10,1),
  avg_consumption numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Tabuľka pre AdBlue
CREATE TABLE IF NOT EXISTS adblue_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL,
  liters numeric(10,2) NOT NULL,
  price_per_liter numeric(10,3) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Tabuľka pre elektrinu
CREATE TABLE IF NOT EXISTS electricity_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  month date NOT NULL,
  meter_start numeric(10,1) NOT NULL,
  meter_end numeric(10,1) NOT NULL,
  total_consumption numeric(10,1) NOT NULL,
  price_per_kwh numeric(10,4),
  total_price numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Tabuľka pre vodu
CREATE TABLE IF NOT EXISTS water_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  month date NOT NULL,
  meter_start numeric(10,2) NOT NULL,
  meter_end numeric(10,2) NOT NULL,
  total_consumption numeric(10,2) NOT NULL,
  price_per_m3 numeric(10,4),
  total_price numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE fuel_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE adblue_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE electricity_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_costs ENABLE ROW LEVEL SECURITY;

-- Politiky pre fuel_costs
CREATE POLICY "Users can view own fuel costs"
  ON fuel_costs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fuel costs"
  ON fuel_costs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fuel costs"
  ON fuel_costs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fuel costs"
  ON fuel_costs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiky pre adblue_costs
CREATE POLICY "Users can view own adblue costs"
  ON adblue_costs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own adblue costs"
  ON adblue_costs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own adblue costs"
  ON adblue_costs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own adblue costs"
  ON adblue_costs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiky pre electricity_costs
CREATE POLICY "Users can view own electricity costs"
  ON electricity_costs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own electricity costs"
  ON electricity_costs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own electricity costs"
  ON electricity_costs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own electricity costs"
  ON electricity_costs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiky pre water_costs
CREATE POLICY "Users can view own water costs"
  ON water_costs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own water costs"
  ON water_costs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own water costs"
  ON water_costs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own water costs"
  ON water_costs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Funkcia pre automatický výpočet priemernej spotreby pri pohonných hmotách
CREATE OR REPLACE FUNCTION calculate_avg_consumption()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trip_km IS NOT NULL AND NEW.trip_km > 0 AND NEW.liters > 0 THEN
    NEW.avg_consumption := (NEW.liters / NEW.trip_km) * 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_fuel_consumption
  BEFORE INSERT OR UPDATE ON fuel_costs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_avg_consumption();

-- Funkcia pre automatický výpočet celkovej spotreby elektriny
CREATE OR REPLACE FUNCTION calculate_electricity_consumption()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_consumption := NEW.meter_end - NEW.meter_start;
  IF NEW.price_per_kwh IS NOT NULL THEN
    NEW.total_price := NEW.total_consumption * NEW.price_per_kwh;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_elec_consumption
  BEFORE INSERT OR UPDATE ON electricity_costs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_electricity_consumption();

-- Funkcia pre automatický výpočet celkovej spotreby vody
CREATE OR REPLACE FUNCTION calculate_water_consumption()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_consumption := NEW.meter_end - NEW.meter_start;
  IF NEW.price_per_m3 IS NOT NULL THEN
    NEW.total_price := NEW.total_consumption * NEW.price_per_m3;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_water_cons
  BEFORE INSERT OR UPDATE ON water_costs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_water_consumption();
