/*
  # Add VAT Fields to All Cost Tables

  1. Purpose
    - Add VAT fields to all cost tables for tax reporting
    - Each cost category can have its own VAT rate (Slovakia has different rates)
    
  2. Changes
    - Add price_includes_vat (boolean, default false) to all cost tables
    - Add vat_rate (numeric, default 20) to all cost tables
    
  3. Tables Modified
    - fuel_costs
    - water_costs
    - adblue_costs
    - car_service_costs
    - electricity_costs
    - other_costs
    
  4. Notes
    - Default VAT rate is 20% (standard Slovak rate)
    - Users can manually adjust per transaction
    - price_includes_vat = false means price is without VAT
*/

-- Add VAT fields to fuel_costs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fuel_costs' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE fuel_costs ADD COLUMN price_includes_vat boolean DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fuel_costs' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE fuel_costs ADD COLUMN vat_rate numeric DEFAULT 20;
  END IF;
END $$;

-- Add VAT fields to water_costs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'water_costs' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE water_costs ADD COLUMN price_includes_vat boolean DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'water_costs' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE water_costs ADD COLUMN vat_rate numeric DEFAULT 20;
  END IF;
END $$;

-- Add VAT fields to adblue_costs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'adblue_costs' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE adblue_costs ADD COLUMN price_includes_vat boolean DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'adblue_costs' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE adblue_costs ADD COLUMN vat_rate numeric DEFAULT 20;
  END IF;
END $$;

-- Add VAT fields to car_service_costs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'car_service_costs' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE car_service_costs ADD COLUMN price_includes_vat boolean DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'car_service_costs' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE car_service_costs ADD COLUMN vat_rate numeric DEFAULT 20;
  END IF;
END $$;

-- Add VAT fields to electricity_costs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'electricity_costs' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE electricity_costs ADD COLUMN price_includes_vat boolean DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'electricity_costs' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE electricity_costs ADD COLUMN vat_rate numeric DEFAULT 20;
  END IF;
END $$;

-- Add VAT fields to other_costs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'other_costs' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE other_costs ADD COLUMN price_includes_vat boolean DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'other_costs' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE other_costs ADD COLUMN vat_rate numeric DEFAULT 20;
  END IF;
END $$;
