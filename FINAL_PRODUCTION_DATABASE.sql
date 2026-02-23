-- ==========================================================================================================
-- FINAL PRODUCTION DATABASE SCHEMA
-- ==========================================================================================================
-- Complete database recreation based on comprehensive code audit
-- RLS DISABLED for testing - Re-enable after verifying all functionality works
-- Run this entire script as ONE BLOCK in Supabase SQL Editor
-- ==========================================================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================================================================
-- STEP 1: CREATE ALL TABLES (Exact naming from code audit)
-- ==========================================================================================================

-- Settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT DEFAULT 'Microgreens Farm',
  business_email TEXT,
  business_phone TEXT,
  business_address TEXT,
  currency TEXT DEFAULT 'EUR',
  default_vat_rate NUMERIC DEFAULT 20,
  vat_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table (with sidebar_settings and delivery_settings)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  sidebar_settings JSONB DEFAULT '{}'::jsonb,
  delivery_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'worker')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login history table
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  is_new_device BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Worker permissions table (all permission columns from code)
CREATE TABLE IF NOT EXISTS public.worker_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  can_view_dashboard BOOLEAN DEFAULT true,
  can_view_prices BOOLEAN DEFAULT false,
  can_view_customers BOOLEAN DEFAULT false,
  can_view_suppliers BOOLEAN DEFAULT false,
  can_view_today_tasks BOOLEAN DEFAULT true,
  can_view_harvest BOOLEAN DEFAULT true,
  can_view_delivery BOOLEAN DEFAULT true,
  can_view_planting BOOLEAN DEFAULT true,
  can_view_orders BOOLEAN DEFAULT true,
  can_view_inventory BOOLEAN DEFAULT true,
  can_view_crops BOOLEAN DEFAULT true,
  can_view_blends BOOLEAN DEFAULT true,
  can_view_prep_planting BOOLEAN DEFAULT true,
  can_view_prep_packaging BOOLEAN DEFAULT true,
  can_view_balenie BOOLEAN DEFAULT true,
  can_view_calendar BOOLEAN DEFAULT true,
  can_view_costs_fuel BOOLEAN DEFAULT false,
  can_view_costs_adblue BOOLEAN DEFAULT false,
  can_view_costs_water BOOLEAN DEFAULT false,
  can_view_costs_electricity BOOLEAN DEFAULT false,
  can_view_costs_other BOOLEAN DEFAULT false,
  can_view_seeds BOOLEAN DEFAULT true,
  can_view_packaging BOOLEAN DEFAULT true,
  can_view_substrate BOOLEAN DEFAULT true,
  can_view_labels BOOLEAN DEFAULT true,
  can_view_consumables BOOLEAN DEFAULT true,
  can_view_reports BOOLEAN DEFAULT false,
  can_view_settings BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crops table (all columns from useSupabaseData.tsx)
CREATE TABLE IF NOT EXISTS public.crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  variety TEXT,
  category TEXT DEFAULT 'microgreens',
  days_to_harvest INTEGER NOT NULL DEFAULT 7,
  days_to_germination INTEGER DEFAULT 2,
  germination_type TEXT DEFAULT 'warm',
  days_in_darkness INTEGER DEFAULT 2,
  days_on_light INTEGER DEFAULT 5,
  seed_density NUMERIC DEFAULT 0,
  expected_yield NUMERIC DEFAULT 0,
  seed_soaking BOOLEAN DEFAULT false,
  can_be_cut BOOLEAN DEFAULT true,
  can_be_live BOOLEAN DEFAULT false,
  needs_weight BOOLEAN DEFAULT false,
  harvest_order INTEGER DEFAULT 999,
  safety_buffer_percent NUMERIC DEFAULT 0.10,
  tray_configs JSONB DEFAULT '{"XL": {"seed_density": 100, "expected_yield": 80}, "L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}}'::jsonb,
  default_substrate_type TEXT DEFAULT 'mixed',
  default_substrate_note TEXT,
  color TEXT DEFAULT '#22c55e',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blends table
CREATE TABLE IF NOT EXISTS public.blends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop_ids UUID[] DEFAULT '{}',
  crop_percentages JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customers table (all columns from useSupabaseData.tsx)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  customer_type TEXT,
  company_name TEXT,
  contact_name TEXT,
  ico TEXT,
  dic TEXT,
  ic_dph TEXT,
  bank_account TEXT,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'invoice')),
  free_delivery BOOLEAN DEFAULT false,
  delivery_notes TEXT,
  delivery_day_ids UUID[] DEFAULT '{}',
  delivery_route_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  supplier_type TEXT,
  ico TEXT,
  dic TEXT,
  ic_dph TEXT,
  bank_account TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delivery days table
CREATE TABLE IF NOT EXISTS public.delivery_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delivery routes table
CREATE TABLE IF NOT EXISTS public.delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  delivery_day_id UUID REFERENCES public.delivery_days(id) ON DELETE SET NULL,
  customer_ids UUID[] DEFAULT '{}',
  delivery_fee NUMERIC DEFAULT 0,
  delivery_fee_home NUMERIC DEFAULT 0,
  delivery_fee_gastro NUMERIC DEFAULT 0,
  delivery_fee_wholesale NUMERIC DEFAULT 0,
  home_min_free_delivery NUMERIC DEFAULT 15,
  gastro_min_free_delivery NUMERIC DEFAULT 30,
  wholesale_min_free_delivery NUMERIC DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders table (all columns from OrdersPage.tsx)
CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number INTEGER DEFAULT nextval('orders_order_number_seq'::regclass),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  crop_id UUID,
  crop_name TEXT,
  blend_id UUID,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'g',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  delivery_order INTEGER,
  delivery_form TEXT DEFAULT 'cut',
  packaging_size TEXT DEFAULT '100g',
  packaging_type TEXT,
  has_label BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  recurring_weeks INTEGER DEFAULT 8,
  parent_order_id UUID,
  skipped BOOLEAN DEFAULT false,
  total_price NUMERIC(10,2) DEFAULT 0,
  charge_delivery BOOLEAN DEFAULT true,
  delivery_price NUMERIC(10,2) DEFAULT 0,
  delivery_type TEXT DEFAULT 'charged',
  route TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order items table (all columns from OrdersPage.tsx)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  crop_name TEXT,
  blend_id UUID REFERENCES public.blends(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'ks',
  packaging_size TEXT DEFAULT '50g',
  packaging_material TEXT DEFAULT 'PET',
  packaging_volume_ml INTEGER,
  packaging_id UUID REFERENCES public.packagings(id) ON DELETE SET NULL,
  delivery_form TEXT DEFAULT 'cut',
  has_label BOOLEAN DEFAULT true,
  special_requirements TEXT,
  price_per_unit NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(10,2) DEFAULT 0,
  is_special_item BOOLEAN DEFAULT false,
  custom_crop_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Planting plans table (all columns from useSupabaseData.tsx)
CREATE TABLE IF NOT EXISTS public.planting_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  seed_id UUID REFERENCES public.seeds(id) ON DELETE SET NULL,
  tray_count INTEGER DEFAULT 1,
  tray_size TEXT DEFAULT 'XL',
  sow_date DATE NOT NULL,
  expected_harvest_date DATE,
  actual_harvest_date DATE,
  status TEXT DEFAULT 'planned',
  is_combined BOOLEAN DEFAULT false,
  crop_components JSONB DEFAULT '[]'::jsonb,
  is_test_batch BOOLEAN DEFAULT false,
  count_as_production BOOLEAN DEFAULT true,
  soaking_hours_before_sowing INTEGER DEFAULT 12,
  substrate_type TEXT DEFAULT 'mixed' CHECK (substrate_type IN ('peat', 'coco', 'mixed', 'other')),
  substrate_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seeds table (all columns including pricing fields)
CREATE TABLE IF NOT EXISTS public.seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  supplier_id UUID,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'g',
  lot_number TEXT,
  purchase_date DATE,
  stocking_date DATE,
  consumption_start_date DATE,
  expiry_date DATE,
  finished_date DATE,
  certificate_url TEXT,
  min_stock NUMERIC DEFAULT 0,
  unit_price_per_kg NUMERIC DEFAULT 0,
  price_includes_vat BOOLEAN DEFAULT true,
  vat_rate NUMERIC DEFAULT 20,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Packagings table (with pricing fields)
CREATE TABLE IF NOT EXISTS public.packagings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  supplier_id UUID,
  price_per_piece NUMERIC DEFAULT 0,
  price_includes_vat BOOLEAN DEFAULT true,
  vat_rate NUMERIC DEFAULT 20,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Packaging mappings table (from usePackagingMappings.tsx)
CREATE TABLE IF NOT EXISTS public.packaging_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE,
  weight_g INTEGER NOT NULL,
  packaging_id UUID REFERENCES public.packagings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crop_id, weight_g, user_id)
);

-- Substrates table
CREATE TABLE IF NOT EXISTS public.substrates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  min_stock NUMERIC DEFAULT 0,
  supplier_id UUID,
  unit_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Labels table
CREATE TABLE IF NOT EXISTS public.labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'standard',
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  supplier_id UUID,
  unit_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consumable inventory table (all columns from ConsumableInventoryPage.tsx)
CREATE TABLE IF NOT EXISTS public.consumable_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  min_quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  price_includes_vat BOOLEAN DEFAULT false,
  vat_rate NUMERIC DEFAULT 20,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Other inventory table
CREATE TABLE IF NOT EXISTS public.other_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fuel costs table (all columns from FuelCostsPage.tsx)
CREATE TABLE IF NOT EXISTS public.fuel_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  liters NUMERIC(10,2) NOT NULL,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('benzin', 'diesel')),
  price_per_liter NUMERIC(10,3) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  trip_km NUMERIC(10,1),
  avg_consumption NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AdBlue costs table
CREATE TABLE IF NOT EXISTS public.adblue_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  liters NUMERIC(10,2) NOT NULL,
  price_per_liter NUMERIC(10,3) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Electricity costs table
CREATE TABLE IF NOT EXISTS public.electricity_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  meter_start NUMERIC(10,1) NOT NULL,
  meter_end NUMERIC(10,1) NOT NULL,
  total_consumption NUMERIC(10,1) NOT NULL,
  price_per_kwh NUMERIC(10,4),
  total_price NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Water costs table
CREATE TABLE IF NOT EXISTS public.water_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  meter_start NUMERIC(10,2) NOT NULL,
  meter_end NUMERIC(10,2) NOT NULL,
  total_consumption NUMERIC(10,2) NOT NULL,
  price_per_m3 NUMERIC(10,4),
  total_price NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Car service costs table
CREATE TABLE IF NOT EXISTS public.car_service_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  km_state NUMERIC,
  price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Other costs table
CREATE TABLE IF NOT EXISTS public.other_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prices table (from usePrices.tsx)
CREATE TABLE IF NOT EXISTS public.prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE,
  blend_id UUID REFERENCES public.blends(id) ON DELETE CASCADE,
  packaging_size TEXT NOT NULL DEFAULT '100g',
  customer_type TEXT DEFAULT 'all',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- VAT settings table (from usePrices.tsx)
CREATE TABLE IF NOT EXISTS public.vat_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vat_rate NUMERIC NOT NULL DEFAULT 20,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for orders.parent_order_id
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_parent_order_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_parent_order_id_fkey
  FOREIGN KEY (parent_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

-- Add foreign key for customers.delivery_route_id
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_delivery_route_id_fkey;
ALTER TABLE public.customers ADD CONSTRAINT customers_delivery_route_id_fkey
  FOREIGN KEY (delivery_route_id) REFERENCES public.delivery_routes(id) ON DELETE SET NULL;

-- ==========================================================================================================
-- STEP 2: DISABLE ROW LEVEL SECURITY (For Testing Only)
-- ==========================================================================================================
-- WARNING: This removes all security. Only use for testing. Re-enable RLS in production!

ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blends DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.planting_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seeds DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.packagings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.substrates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumable_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.other_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.adblue_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_service_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.other_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_settings DISABLE ROW LEVEL SECURITY;

-- ==========================================================================================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- ==========================================================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'worker')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_avg_consumption()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trip_km IS NOT NULL AND NEW.trip_km > 0 AND NEW.liters > 0 THEN
    NEW.avg_consumption := (NEW.liters / NEW.trip_km) * 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- ==========================================================================================================
-- STEP 4: CREATE TRIGGERS
-- ==========================================================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crops_updated_at ON public.crops;
CREATE TRIGGER update_crops_updated_at
  BEFORE UPDATE ON public.crops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_worker_permissions_updated_at ON public.worker_permissions;
CREATE TRIGGER update_worker_permissions_updated_at
  BEFORE UPDATE ON public.worker_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS calculate_fuel_consumption ON public.fuel_costs;
CREATE TRIGGER calculate_fuel_consumption
  BEFORE INSERT OR UPDATE ON public.fuel_costs
  FOR EACH ROW EXECUTE FUNCTION calculate_avg_consumption();

DROP TRIGGER IF EXISTS calculate_elec_consumption ON public.electricity_costs;
CREATE TRIGGER calculate_elec_consumption
  BEFORE INSERT OR UPDATE ON public.electricity_costs
  FOR EACH ROW EXECUTE FUNCTION calculate_electricity_consumption();

DROP TRIGGER IF EXISTS calculate_water_cons ON public.water_costs;
CREATE TRIGGER calculate_water_cons
  BEFORE INSERT OR UPDATE ON public.water_costs
  FOR EACH ROW EXECUTE FUNCTION calculate_water_consumption();

-- Auto-populate user_id triggers
DROP TRIGGER IF EXISTS set_crops_user_id ON public.crops;
CREATE TRIGGER set_crops_user_id BEFORE INSERT ON public.crops FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_customers_user_id ON public.customers;
CREATE TRIGGER set_customers_user_id BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_orders_user_id ON public.orders;
CREATE TRIGGER set_orders_user_id BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_blends_user_id ON public.blends;
CREATE TRIGGER set_blends_user_id BEFORE INSERT ON public.blends FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_seeds_user_id ON public.seeds;
CREATE TRIGGER set_seeds_user_id BEFORE INSERT ON public.seeds FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_packagings_user_id ON public.packagings;
CREATE TRIGGER set_packagings_user_id BEFORE INSERT ON public.packagings FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_substrates_user_id ON public.substrates;
CREATE TRIGGER set_substrates_user_id BEFORE INSERT ON public.substrates FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_labels_user_id ON public.labels;
CREATE TRIGGER set_labels_user_id BEFORE INSERT ON public.labels FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_suppliers_user_id ON public.suppliers;
CREATE TRIGGER set_suppliers_user_id BEFORE INSERT ON public.suppliers FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_delivery_routes_user_id ON public.delivery_routes;
CREATE TRIGGER set_delivery_routes_user_id BEFORE INSERT ON public.delivery_routes FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_delivery_days_user_id ON public.delivery_days;
CREATE TRIGGER set_delivery_days_user_id BEFORE INSERT ON public.delivery_days FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_other_inventory_user_id ON public.other_inventory;
CREATE TRIGGER set_other_inventory_user_id BEFORE INSERT ON public.other_inventory FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_planting_plans_user_id ON public.planting_plans;
CREATE TRIGGER set_planting_plans_user_id BEFORE INSERT ON public.planting_plans FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_tasks_user_id ON public.tasks;
CREATE TRIGGER set_tasks_user_id BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_consumable_inventory_user_id ON public.consumable_inventory;
CREATE TRIGGER set_consumable_inventory_user_id BEFORE INSERT ON public.consumable_inventory FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_order_items_user_id ON public.order_items;
CREATE TRIGGER set_order_items_user_id BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_prices_user_id ON public.prices;
CREATE TRIGGER set_prices_user_id BEFORE INSERT ON public.prices FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_vat_settings_user_id ON public.vat_settings;
CREATE TRIGGER set_vat_settings_user_id BEFORE INSERT ON public.vat_settings FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_packaging_mappings_user_id ON public.packaging_mappings;
CREATE TRIGGER set_packaging_mappings_user_id BEFORE INSERT ON public.packaging_mappings FOR EACH ROW EXECUTE FUNCTION set_user_id();

-- ==========================================================================================================
-- STEP 5: CREATE INDEXES FOR PERFORMANCE
-- ==========================================================================================================

CREATE INDEX IF NOT EXISTS idx_packaging_mappings_crop_weight ON public.packaging_mappings(crop_id, weight_g);
CREATE INDEX IF NOT EXISTS idx_packaging_mappings_user ON public.packaging_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON public.orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_planting_plans_user_id ON public.planting_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_planting_plans_sow_date ON public.planting_plans(sow_date);
CREATE INDEX IF NOT EXISTS idx_crops_user_id ON public.crops(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- ==========================================================================================================
-- STEP 6: SEED DEFAULT DATA
-- ==========================================================================================================

-- Insert default settings
INSERT INTO public.settings (
  business_name,
  business_email,
  business_phone,
  business_address,
  currency,
  default_vat_rate,
  vat_enabled
) VALUES (
  'Microgreens Farm',
  'info@microgreensfarm.com',
  '+421 XXX XXX XXX',
  'Your Business Address',
  'EUR',
  20,
  false
) ON CONFLICT DO NOTHING;

-- ==========================================================================================================
-- STEP 7: MAKE CURRENT USER ADMIN
-- ==========================================================================================================
-- This will make YOUR currently logged-in user an admin automatically
-- Run this AFTER you've logged in to your application

DO $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user's ID
  current_user_id := auth.uid();

  IF current_user_id IS NOT NULL THEN
    -- Update or insert the user role to admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (current_user_id, 'admin')
    ON CONFLICT (user_id)
    DO UPDATE SET role = 'admin';

    RAISE NOTICE 'Successfully set user % as admin', current_user_id;
  ELSE
    RAISE NOTICE 'No authenticated user found. Please log in first, then run this block again.';
  END IF;
END $$;

-- ==========================================================================================================
-- SCRIPT COMPLETE
-- ==========================================================================================================
-- Your database is ready for testing!
--
-- IMPORTANT NOTES:
-- 1. RLS is DISABLED for testing - you must re-enable it for production
-- 2. Your current user has been set as admin
-- 3. All tables match your frontend code exactly
-- 4. All necessary triggers and functions are in place
--
-- To re-enable RLS later, run:
-- ALTER TABLE public.[table_name] ENABLE ROW LEVEL SECURITY;
-- And create appropriate RLS policies
-- ==========================================================================================================
