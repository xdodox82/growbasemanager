-- ==========================================================================================================
-- MASTER DATABASE FIX - COMPLETE DROP AND RECREATE
-- ==========================================================================================================
-- This script completely drops and recreates all database objects to match the TypeScript/React application
-- Run this in your Supabase SQL Editor
-- ==========================================================================================================

-- ==========================================================================================================
-- STEP 1: DROP EVERYTHING (Clean Slate)
-- ==========================================================================================================

-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_crops_updated_at ON crops;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS update_worker_permissions_updated_at ON worker_permissions;
DROP TRIGGER IF EXISTS calculate_fuel_consumption ON fuel_costs;
DROP TRIGGER IF EXISTS calculate_elec_consumption ON electricity_costs;
DROP TRIGGER IF EXISTS calculate_water_cons ON water_costs;
DROP TRIGGER IF EXISTS set_crops_user_id ON crops;
DROP TRIGGER IF EXISTS set_customers_user_id ON customers;
DROP TRIGGER IF EXISTS set_orders_user_id ON orders;
DROP TRIGGER IF EXISTS set_blends_user_id ON blends;
DROP TRIGGER IF EXISTS set_seeds_user_id ON seeds;
DROP TRIGGER IF EXISTS set_packagings_user_id ON packagings;
DROP TRIGGER IF EXISTS set_substrates_user_id ON substrates;
DROP TRIGGER IF EXISTS set_labels_user_id ON labels;
DROP TRIGGER IF EXISTS set_suppliers_user_id ON suppliers;
DROP TRIGGER IF EXISTS set_delivery_routes_user_id ON delivery_routes;
DROP TRIGGER IF EXISTS set_delivery_days_user_id ON delivery_days;
DROP TRIGGER IF EXISTS set_other_inventory_user_id ON other_inventory;
DROP TRIGGER IF EXISTS set_planting_plans_user_id ON planting_plans;
DROP TRIGGER IF EXISTS set_tasks_user_id ON tasks;
DROP TRIGGER IF EXISTS set_consumable_inventory_user_id ON consumable_inventory;
DROP TRIGGER IF EXISTS set_order_items_user_id ON order_items;
DROP TRIGGER IF EXISTS set_prices_user_id ON prices;
DROP TRIGGER IF EXISTS set_vat_settings_user_id ON vat_settings;
DROP TRIGGER IF EXISTS set_packaging_mappings_user_id ON packaging_mappings;

-- Drop all functions
DROP FUNCTION IF EXISTS public.has_role(_user_id UUID, _role TEXT);
DROP FUNCTION IF EXISTS public.get_user_role(_user_id UUID);
DROP FUNCTION IF EXISTS public.set_user_id();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.calculate_avg_consumption();
DROP FUNCTION IF EXISTS public.calculate_electricity_consumption();
DROP FUNCTION IF EXISTS public.calculate_water_consumption();

-- Drop all tables (with CASCADE to remove dependencies)
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.login_history CASCADE;
DROP TABLE IF EXISTS public.worker_permissions CASCADE;
DROP TABLE IF EXISTS public.crops CASCADE;
DROP TABLE IF EXISTS public.blends CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.delivery_days CASCADE;
DROP TABLE IF EXISTS public.delivery_routes CASCADE;
DROP TABLE IF EXISTS public.delivery_settings CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.planting_plans CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.seeds CASCADE;
DROP TABLE IF EXISTS public.packagings CASCADE;
DROP TABLE IF EXISTS public.packaging_mappings CASCADE;
DROP TABLE IF EXISTS public.substrates CASCADE;
DROP TABLE IF EXISTS public.labels CASCADE;
DROP TABLE IF EXISTS public.consumable_inventory CASCADE;
DROP TABLE IF EXISTS public.other_inventory CASCADE;
DROP TABLE IF EXISTS public.fuel_costs CASCADE;
DROP TABLE IF EXISTS public.adblue_costs CASCADE;
DROP TABLE IF EXISTS public.electricity_costs CASCADE;
DROP TABLE IF EXISTS public.water_costs CASCADE;
DROP TABLE IF EXISTS public.car_service_costs CASCADE;
DROP TABLE IF EXISTS public.other_costs CASCADE;
DROP TABLE IF EXISTS public.prices CASCADE;
DROP TABLE IF EXISTS public.vat_settings CASCADE;
DROP TABLE IF EXISTS public.notification_settings CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS orders_order_number_seq CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================================================================
-- STEP 2: CREATE ALL TABLES
-- ==========================================================================================================

-- Settings table (business settings)
CREATE TABLE public.settings (
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

-- Profiles table
CREATE TABLE public.profiles (
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
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'worker')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login history table
CREATE TABLE public.login_history (
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

-- Worker permissions table
CREATE TABLE public.worker_permissions (
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

-- Crops table
CREATE TABLE public.crops (
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
CREATE TABLE public.blends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop_ids UUID[] DEFAULT '{}',
  crop_percentages JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customers table
CREATE TABLE public.customers (
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
CREATE TABLE public.suppliers (
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
CREATE TABLE public.delivery_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delivery routes table
CREATE TABLE public.delivery_routes (
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

-- Delivery settings table
CREATE TABLE public.delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  free_delivery_threshold NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE SEQUENCE orders_order_number_seq;

CREATE TABLE public.orders (
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

-- Order items table
CREATE TABLE public.order_items (
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
  packaging_id UUID,
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

-- Planting plans table
CREATE TABLE public.planting_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  seed_id UUID,
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
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seeds table
CREATE TABLE public.seeds (
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

-- Packagings table
CREATE TABLE public.packagings (
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

-- Packaging mappings table
CREATE TABLE public.packaging_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE,
  weight_g INTEGER NOT NULL,
  packaging_id UUID REFERENCES public.packagings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crop_id, weight_g, user_id)
);

-- Substrates table
CREATE TABLE public.substrates (
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
CREATE TABLE public.labels (
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

-- Consumable inventory table
CREATE TABLE public.consumable_inventory (
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
CREATE TABLE public.other_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fuel costs table
CREATE TABLE public.fuel_costs (
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
CREATE TABLE public.adblue_costs (
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
CREATE TABLE public.electricity_costs (
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
CREATE TABLE public.water_costs (
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
CREATE TABLE public.car_service_costs (
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
CREATE TABLE public.other_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prices table
CREATE TABLE public.prices (
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

-- VAT settings table
CREATE TABLE public.vat_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vat_rate NUMERIC NOT NULL DEFAULT 20,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification settings table
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_low_stock BOOLEAN DEFAULT true,
  email_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key constraints for orders.parent_order_id
ALTER TABLE public.orders ADD CONSTRAINT orders_parent_order_id_fkey
  FOREIGN KEY (parent_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

-- Add foreign key constraint for planting_plans.seed_id
ALTER TABLE public.planting_plans ADD CONSTRAINT planting_plans_seed_id_fkey
  FOREIGN KEY (seed_id) REFERENCES public.seeds(id) ON DELETE SET NULL;

-- Add foreign key constraint for order_items.packaging_id
ALTER TABLE public.order_items ADD CONSTRAINT order_items_packaging_id_fkey
  FOREIGN KEY (packaging_id) REFERENCES public.packagings(id) ON DELETE SET NULL;

-- Add foreign key constraint for customers.delivery_route_id
ALTER TABLE public.customers ADD CONSTRAINT customers_delivery_route_id_fkey
  FOREIGN KEY (delivery_route_id) REFERENCES public.delivery_routes(id) ON DELETE SET NULL;

-- ==========================================================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ==========================================================================================================

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planting_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packagings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substrates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumable_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.other_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adblue_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_service_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.other_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================================================================================
-- STEP 4: CREATE RLS POLICIES (FULL ACCESS FOR AUTHENTICATED USERS)
-- ==========================================================================================================

-- Settings policies
CREATE POLICY "settings_select" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_update" ON public.settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "settings_insert" ON public.settings FOR INSERT TO authenticated WITH CHECK (true);

-- Profiles policies
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "user_roles_delete" ON public.user_roles FOR DELETE TO authenticated USING (true);

-- Login history policies
CREATE POLICY "login_history_select" ON public.login_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "login_history_insert" ON public.login_history FOR INSERT TO authenticated WITH CHECK (true);

-- Worker permissions policies
CREATE POLICY "worker_permissions_select" ON public.worker_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "worker_permissions_all" ON public.worker_permissions FOR ALL TO authenticated USING (true);

-- Crops policies
CREATE POLICY "crops_select" ON public.crops FOR SELECT TO authenticated USING (true);
CREATE POLICY "crops_insert" ON public.crops FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "crops_update" ON public.crops FOR UPDATE TO authenticated USING (true);
CREATE POLICY "crops_delete" ON public.crops FOR DELETE TO authenticated USING (true);

-- Blends policies
CREATE POLICY "blends_select" ON public.blends FOR SELECT TO authenticated USING (true);
CREATE POLICY "blends_insert" ON public.blends FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "blends_update" ON public.blends FOR UPDATE TO authenticated USING (true);
CREATE POLICY "blends_delete" ON public.blends FOR DELETE TO authenticated USING (true);

-- Customers policies
CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers_insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "customers_delete" ON public.customers FOR DELETE TO authenticated USING (true);

-- Suppliers policies
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE TO authenticated USING (true);

-- Delivery days policies
CREATE POLICY "delivery_days_select" ON public.delivery_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "delivery_days_insert" ON public.delivery_days FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "delivery_days_update" ON public.delivery_days FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delivery_days_delete" ON public.delivery_days FOR DELETE TO authenticated USING (true);

-- Delivery routes policies
CREATE POLICY "delivery_routes_select" ON public.delivery_routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "delivery_routes_insert" ON public.delivery_routes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "delivery_routes_update" ON public.delivery_routes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delivery_routes_delete" ON public.delivery_routes FOR DELETE TO authenticated USING (true);

-- Delivery settings policies
CREATE POLICY "delivery_settings_select" ON public.delivery_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "delivery_settings_insert" ON public.delivery_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "delivery_settings_update" ON public.delivery_settings FOR UPDATE TO authenticated USING (true);

-- Orders policies
CREATE POLICY "orders_select" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "orders_insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "orders_update" ON public.orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "orders_delete" ON public.orders FOR DELETE TO authenticated USING (true);

-- Order items policies
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "order_items_update" ON public.order_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "order_items_delete" ON public.order_items FOR DELETE TO authenticated USING (true);

-- Planting plans policies
CREATE POLICY "planting_plans_select" ON public.planting_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "planting_plans_insert" ON public.planting_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "planting_plans_update" ON public.planting_plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "planting_plans_delete" ON public.planting_plans FOR DELETE TO authenticated USING (true);

-- Tasks policies
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated USING (true);

-- Seeds policies
CREATE POLICY "seeds_select" ON public.seeds FOR SELECT TO authenticated USING (true);
CREATE POLICY "seeds_insert" ON public.seeds FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "seeds_update" ON public.seeds FOR UPDATE TO authenticated USING (true);
CREATE POLICY "seeds_delete" ON public.seeds FOR DELETE TO authenticated USING (true);

-- Packagings policies
CREATE POLICY "packagings_select" ON public.packagings FOR SELECT TO authenticated USING (true);
CREATE POLICY "packagings_insert" ON public.packagings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "packagings_update" ON public.packagings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "packagings_delete" ON public.packagings FOR DELETE TO authenticated USING (true);

-- Packaging mappings policies
CREATE POLICY "packaging_mappings_select" ON public.packaging_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "packaging_mappings_insert" ON public.packaging_mappings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "packaging_mappings_update" ON public.packaging_mappings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "packaging_mappings_delete" ON public.packaging_mappings FOR DELETE TO authenticated USING (true);

-- Substrates policies
CREATE POLICY "substrates_select" ON public.substrates FOR SELECT TO authenticated USING (true);
CREATE POLICY "substrates_insert" ON public.substrates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "substrates_update" ON public.substrates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "substrates_delete" ON public.substrates FOR DELETE TO authenticated USING (true);

-- Labels policies
CREATE POLICY "labels_select" ON public.labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "labels_insert" ON public.labels FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "labels_update" ON public.labels FOR UPDATE TO authenticated USING (true);
CREATE POLICY "labels_delete" ON public.labels FOR DELETE TO authenticated USING (true);

-- Consumable inventory policies
CREATE POLICY "consumable_inventory_select" ON public.consumable_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "consumable_inventory_insert" ON public.consumable_inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "consumable_inventory_update" ON public.consumable_inventory FOR UPDATE TO authenticated USING (true);
CREATE POLICY "consumable_inventory_delete" ON public.consumable_inventory FOR DELETE TO authenticated USING (true);

-- Other inventory policies
CREATE POLICY "other_inventory_select" ON public.other_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "other_inventory_insert" ON public.other_inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "other_inventory_update" ON public.other_inventory FOR UPDATE TO authenticated USING (true);
CREATE POLICY "other_inventory_delete" ON public.other_inventory FOR DELETE TO authenticated USING (true);

-- Fuel costs policies
CREATE POLICY "fuel_costs_select" ON public.fuel_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "fuel_costs_insert" ON public.fuel_costs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "fuel_costs_update" ON public.fuel_costs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "fuel_costs_delete" ON public.fuel_costs FOR DELETE TO authenticated USING (true);

-- AdBlue costs policies
CREATE POLICY "adblue_costs_select" ON public.adblue_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "adblue_costs_insert" ON public.adblue_costs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "adblue_costs_update" ON public.adblue_costs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "adblue_costs_delete" ON public.adblue_costs FOR DELETE TO authenticated USING (true);

-- Electricity costs policies
CREATE POLICY "electricity_costs_select" ON public.electricity_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "electricity_costs_insert" ON public.electricity_costs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "electricity_costs_update" ON public.electricity_costs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "electricity_costs_delete" ON public.electricity_costs FOR DELETE TO authenticated USING (true);

-- Water costs policies
CREATE POLICY "water_costs_select" ON public.water_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "water_costs_insert" ON public.water_costs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "water_costs_update" ON public.water_costs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "water_costs_delete" ON public.water_costs FOR DELETE TO authenticated USING (true);

-- Car service costs policies
CREATE POLICY "car_service_costs_select" ON public.car_service_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "car_service_costs_insert" ON public.car_service_costs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "car_service_costs_update" ON public.car_service_costs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "car_service_costs_delete" ON public.car_service_costs FOR DELETE TO authenticated USING (true);

-- Other costs policies
CREATE POLICY "other_costs_select" ON public.other_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "other_costs_insert" ON public.other_costs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "other_costs_update" ON public.other_costs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "other_costs_delete" ON public.other_costs FOR DELETE TO authenticated USING (true);

-- Prices policies
CREATE POLICY "prices_select" ON public.prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "prices_insert" ON public.prices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "prices_update" ON public.prices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "prices_delete" ON public.prices FOR DELETE TO authenticated USING (true);

-- VAT settings policies
CREATE POLICY "vat_settings_select" ON public.vat_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "vat_settings_insert" ON public.vat_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vat_settings_update" ON public.vat_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "vat_settings_delete" ON public.vat_settings FOR DELETE TO authenticated USING (true);

-- Notification settings policies
CREATE POLICY "notification_settings_select" ON public.notification_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "notification_settings_insert" ON public.notification_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notification_settings_update" ON public.notification_settings FOR UPDATE TO authenticated USING (true);

-- ==========================================================================================================
-- STEP 5: CREATE HELPER FUNCTIONS
-- ==========================================================================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id LIMIT 1
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
DECLARE
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COUNT(*) INTO user_count FROM public.user_roles;

  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'worker')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

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
-- STEP 6: CREATE TRIGGERS
-- ==========================================================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crops_updated_at
  BEFORE UPDATE ON public.crops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worker_permissions_updated_at
  BEFORE UPDATE ON public.worker_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER calculate_fuel_consumption
  BEFORE INSERT OR UPDATE ON fuel_costs
  FOR EACH ROW EXECUTE FUNCTION calculate_avg_consumption();

CREATE TRIGGER calculate_elec_consumption
  BEFORE INSERT OR UPDATE ON electricity_costs
  FOR EACH ROW EXECUTE FUNCTION calculate_electricity_consumption();

CREATE TRIGGER calculate_water_cons
  BEFORE INSERT OR UPDATE ON water_costs
  FOR EACH ROW EXECUTE FUNCTION calculate_water_consumption();

CREATE TRIGGER set_crops_user_id BEFORE INSERT ON crops FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_customers_user_id BEFORE INSERT ON customers FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_orders_user_id BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_blends_user_id BEFORE INSERT ON blends FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_seeds_user_id BEFORE INSERT ON seeds FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_packagings_user_id BEFORE INSERT ON packagings FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_substrates_user_id BEFORE INSERT ON substrates FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_labels_user_id BEFORE INSERT ON labels FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_suppliers_user_id BEFORE INSERT ON suppliers FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_delivery_routes_user_id BEFORE INSERT ON delivery_routes FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_delivery_days_user_id BEFORE INSERT ON delivery_days FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_other_inventory_user_id BEFORE INSERT ON other_inventory FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_planting_plans_user_id BEFORE INSERT ON planting_plans FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_tasks_user_id BEFORE INSERT ON tasks FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_consumable_inventory_user_id BEFORE INSERT ON consumable_inventory FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_order_items_user_id BEFORE INSERT ON order_items FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_prices_user_id BEFORE INSERT ON prices FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_vat_settings_user_id BEFORE INSERT ON vat_settings FOR EACH ROW EXECUTE FUNCTION set_user_id();
CREATE TRIGGER set_packaging_mappings_user_id BEFORE INSERT ON packaging_mappings FOR EACH ROW EXECUTE FUNCTION set_user_id();

-- ==========================================================================================================
-- STEP 7: CREATE INDEXES
-- ==========================================================================================================

CREATE INDEX IF NOT EXISTS idx_packaging_mappings_crop_weight ON packaging_mappings(crop_id, weight_g);
CREATE INDEX IF NOT EXISTS idx_packaging_mappings_user ON packaging_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_planting_plans_user_id ON planting_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_planting_plans_sow_date ON planting_plans(sow_date);
CREATE INDEX IF NOT EXISTS idx_crops_user_id ON crops(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- ==========================================================================================================
-- STEP 8: SEED DEFAULT DATA
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
-- SCRIPT COMPLETE
-- ==========================================================================================================
-- Your database is ready!
-- The first user to register will automatically become an admin.
-- ==========================================================================================================
