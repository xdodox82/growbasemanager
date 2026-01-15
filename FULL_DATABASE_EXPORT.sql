-- ============================================
-- COMPLETE DATABASE SETUP FOR MICROGREENS APP
-- ============================================
-- This script creates all tables from scratch
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  sidebar_settings JSONB,
  delivery_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'worker'))
);

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

-- ============================================
-- CROPS & BLENDS
-- ============================================

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
  seed_density NUMERIC,
  expected_yield NUMERIC,
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

CREATE TABLE IF NOT EXISTS public.blends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  crop_ids UUID[] DEFAULT '{}',
  crop_percentages JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CUSTOMERS & SUPPLIERS
-- ============================================

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

-- ============================================
-- DELIVERY
-- ============================================

CREATE TABLE IF NOT EXISTS public.delivery_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.delivery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  free_delivery_threshold NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ORDERS
-- ============================================

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

-- ============================================
-- PLANTING & PLANNING
-- ============================================

CREATE TABLE IF NOT EXISTS public.planting_plans (
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

-- ============================================
-- INVENTORY
-- ============================================

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
  min_stock NUMERIC,
  unit_price_per_kg NUMERIC DEFAULT 0,
  price_includes_vat BOOLEAN DEFAULT true,
  vat_rate NUMERIC DEFAULT 20,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.packagings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER,
  supplier_id UUID,
  price_per_piece NUMERIC DEFAULT 0,
  price_includes_vat BOOLEAN DEFAULT true,
  vat_rate NUMERIC DEFAULT 20,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.packaging_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE,
  weight_g INTEGER NOT NULL,
  packaging_id UUID REFERENCES public.packagings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crop_id, weight_g, user_id)
);

CREATE TABLE IF NOT EXISTS public.substrates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  min_stock NUMERIC,
  supplier_id UUID,
  unit_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'standard',
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER,
  supplier_id UUID,
  unit_cost NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consumable_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  min_quantity NUMERIC,
  unit_cost NUMERIC DEFAULT 0,
  price_includes_vat BOOLEAN DEFAULT false,
  vat_rate NUMERIC DEFAULT 20,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

-- ============================================
-- COSTS TRACKING
-- ============================================

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

-- ============================================
-- PRICING & VAT
-- ============================================

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

CREATE TABLE IF NOT EXISTS public.vat_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vat_rate NUMERIC NOT NULL DEFAULT 20,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_low_stock BOOLEAN DEFAULT true,
  email_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ADD FOREIGN KEYS
-- ============================================

-- Add missing columns if they don't exist (for existing databases)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'delivery_route_id') THEN
    ALTER TABLE public.customers ADD COLUMN delivery_route_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'parent_order_id') THEN
    ALTER TABLE public.orders ADD COLUMN parent_order_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'planting_plans' AND column_name = 'seed_id') THEN
    ALTER TABLE public.planting_plans ADD COLUMN seed_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'packaging_id') THEN
    ALTER TABLE public.order_items ADD COLUMN packaging_id UUID;
  END IF;
END $$;

-- Add foreign key constraints
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_delivery_route_id_fkey;
ALTER TABLE public.customers ADD CONSTRAINT customers_delivery_route_id_fkey
  FOREIGN KEY (delivery_route_id) REFERENCES public.delivery_routes(id) ON DELETE SET NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_parent_order_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_parent_order_id_fkey
  FOREIGN KEY (parent_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.planting_plans DROP CONSTRAINT IF EXISTS planting_plans_seed_id_fkey;
ALTER TABLE public.planting_plans ADD CONSTRAINT planting_plans_seed_id_fkey
  FOREIGN KEY (seed_id) REFERENCES public.seeds(id) ON DELETE SET NULL;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_packaging_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_packaging_id_fkey
  FOREIGN KEY (packaging_id) REFERENCES public.packagings(id) ON DELETE SET NULL;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

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

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

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

-- ============================================
-- CREATE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crops_updated_at ON crops;
CREATE TRIGGER update_crops_updated_at
  BEFORE UPDATE ON public.crops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_worker_permissions_updated_at ON worker_permissions;
CREATE TRIGGER update_worker_permissions_updated_at
  BEFORE UPDATE ON public.worker_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS calculate_fuel_consumption ON fuel_costs;
CREATE TRIGGER calculate_fuel_consumption
  BEFORE INSERT OR UPDATE ON fuel_costs
  FOR EACH ROW EXECUTE FUNCTION calculate_avg_consumption();

DROP TRIGGER IF EXISTS calculate_elec_consumption ON electricity_costs;
CREATE TRIGGER calculate_elec_consumption
  BEFORE INSERT OR UPDATE ON electricity_costs
  FOR EACH ROW EXECUTE FUNCTION calculate_electricity_consumption();

DROP TRIGGER IF EXISTS calculate_water_cons ON water_costs;
CREATE TRIGGER calculate_water_cons
  BEFORE INSERT OR UPDATE ON water_costs
  FOR EACH ROW EXECUTE FUNCTION calculate_water_consumption();

DROP TRIGGER IF EXISTS set_crops_user_id ON crops;
CREATE TRIGGER set_crops_user_id BEFORE INSERT ON crops FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_customers_user_id ON customers;
CREATE TRIGGER set_customers_user_id BEFORE INSERT ON customers FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_orders_user_id ON orders;
CREATE TRIGGER set_orders_user_id BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_blends_user_id ON blends;
CREATE TRIGGER set_blends_user_id BEFORE INSERT ON blends FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_seeds_user_id ON seeds;
CREATE TRIGGER set_seeds_user_id BEFORE INSERT ON seeds FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_packagings_user_id ON packagings;
CREATE TRIGGER set_packagings_user_id BEFORE INSERT ON packagings FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_substrates_user_id ON substrates;
CREATE TRIGGER set_substrates_user_id BEFORE INSERT ON substrates FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_labels_user_id ON labels;
CREATE TRIGGER set_labels_user_id BEFORE INSERT ON labels FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_suppliers_user_id ON suppliers;
CREATE TRIGGER set_suppliers_user_id BEFORE INSERT ON suppliers FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_delivery_routes_user_id ON delivery_routes;
CREATE TRIGGER set_delivery_routes_user_id BEFORE INSERT ON delivery_routes FOR EACH ROW EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_other_inventory_user_id ON other_inventory;
CREATE TRIGGER set_other_inventory_user_id BEFORE INSERT ON other_inventory FOR EACH ROW EXECUTE FUNCTION set_user_id();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own login history" ON public.login_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert login history" ON public.login_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view all worker permissions" ON public.worker_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage worker permissions" ON public.worker_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own crops" ON crops FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own crops" ON crops FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own crops" ON crops FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own crops" ON crops FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own blends" ON blends FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own blends" ON blends FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own blends" ON blends FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own blends" ON blends FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own customers" ON customers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customers" ON customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own customers" ON customers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own customers" ON customers FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own suppliers" ON suppliers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own suppliers" ON suppliers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own suppliers" ON suppliers FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own orders" ON orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own orders" ON orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own orders" ON orders FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own order items" ON order_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own order items" ON order_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own order items" ON order_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own order items" ON order_items FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own planting plans" ON planting_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own planting plans" ON planting_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own planting plans" ON planting_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own planting plans" ON planting_plans FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own seeds" ON seeds FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own seeds" ON seeds FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own seeds" ON seeds FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own seeds" ON seeds FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own packagings" ON packagings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own packagings" ON packagings FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own packagings" ON packagings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own packagings" ON packagings FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own packaging mappings" ON packaging_mappings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own packaging mappings" ON packaging_mappings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own packaging mappings" ON packaging_mappings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own packaging mappings" ON packaging_mappings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own substrates" ON substrates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own substrates" ON substrates FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own substrates" ON substrates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own substrates" ON substrates FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own labels" ON labels FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own labels" ON labels FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own labels" ON labels FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own labels" ON labels FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own consumable inventory" ON consumable_inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own consumable inventory" ON consumable_inventory FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own consumable inventory" ON consumable_inventory FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own consumable inventory" ON consumable_inventory FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own other inventory" ON other_inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own other inventory" ON other_inventory FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own other inventory" ON other_inventory FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own other inventory" ON other_inventory FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own delivery days" ON delivery_days FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own delivery days" ON delivery_days FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own delivery days" ON delivery_days FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own delivery days" ON delivery_days FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own delivery routes" ON delivery_routes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own delivery routes" ON delivery_routes FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own delivery routes" ON delivery_routes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own delivery routes" ON delivery_routes FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own delivery settings" ON delivery_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own delivery settings" ON delivery_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own delivery settings" ON delivery_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own prices" ON prices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prices" ON prices FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own prices" ON prices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own prices" ON prices FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own vat settings" ON vat_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vat settings" ON vat_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));
CREATE POLICY "Users can update own vat settings" ON vat_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own vat settings" ON vat_settings FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own notification settings" ON notification_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification settings" ON notification_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notification settings" ON notification_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own fuel costs" ON fuel_costs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fuel costs" ON fuel_costs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fuel costs" ON fuel_costs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own fuel costs" ON fuel_costs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own adblue costs" ON adblue_costs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own adblue costs" ON adblue_costs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own adblue costs" ON adblue_costs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own adblue costs" ON adblue_costs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own electricity costs" ON electricity_costs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own electricity costs" ON electricity_costs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own electricity costs" ON electricity_costs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own electricity costs" ON electricity_costs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own water costs" ON water_costs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own water costs" ON water_costs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own water costs" ON water_costs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own water costs" ON water_costs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own car service costs" ON car_service_costs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own car service costs" ON car_service_costs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own car service costs" ON car_service_costs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own car service costs" ON car_service_costs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view own other costs" ON other_costs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own other costs" ON other_costs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own other costs" ON other_costs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own other costs" ON other_costs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_packaging_mappings_crop_weight ON packaging_mappings(crop_id, weight_g);
CREATE INDEX IF NOT EXISTS idx_packaging_mappings_user ON packaging_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_planting_plans_user_id ON planting_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_planting_plans_sow_date ON planting_plans(sow_date);
CREATE INDEX IF NOT EXISTS idx_crops_user_id ON crops(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
