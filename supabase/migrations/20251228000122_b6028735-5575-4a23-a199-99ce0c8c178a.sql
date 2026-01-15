-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'worker');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'worker',
  UNIQUE (user_id, role)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User roles policies (only admins can manage roles)
CREATE POLICY "Users can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create crops table
CREATE TABLE public.crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  variety TEXT,
  days_to_harvest INTEGER NOT NULL DEFAULT 7,
  seed_density NUMERIC,
  expected_yield NUMERIC,
  seed_soaking BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#22c55e',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view crops"
ON public.crops FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert crops"
ON public.crops FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update crops"
ON public.crops FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete crops"
ON public.crops FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create blends table
CREATE TABLE public.blends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  crop_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view blends"
ON public.blends FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert blends"
ON public.blends FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update blends"
ON public.blends FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blends"
ON public.blends FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  delivery_notes TEXT,
  delivery_day_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert customers"
ON public.customers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update customers"
ON public.customers FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete customers"
ON public.customers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  crop_id UUID,
  blend_id UUID,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'g',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view orders"
ON public.orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert orders"
ON public.orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
ON public.orders FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create planting_plans table
CREATE TABLE public.planting_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  tray_count INTEGER DEFAULT 1,
  sow_date DATE NOT NULL,
  expected_harvest_date DATE,
  actual_harvest_date DATE,
  status TEXT DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.planting_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view planting_plans"
ON public.planting_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert planting_plans"
ON public.planting_plans FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update planting_plans"
ON public.planting_plans FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete planting_plans"
ON public.planting_plans FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create seeds table (inventory)
CREATE TABLE public.seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  supplier_id UUID,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'g',
  lot_number TEXT,
  purchase_date DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view seeds"
ON public.seeds FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert seeds"
ON public.seeds FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update seeds"
ON public.seeds FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete seeds"
ON public.seeds FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create packaging table (inventory)
CREATE TABLE public.packagings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  supplier_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.packagings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view packagings"
ON public.packagings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert packagings"
ON public.packagings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update packagings"
ON public.packagings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete packagings"
ON public.packagings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create substrates table (inventory)
CREATE TABLE public.substrates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'kg',
  supplier_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.substrates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view substrates"
ON public.substrates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert substrates"
ON public.substrates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update substrates"
ON public.substrates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete substrates"
ON public.substrates FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create other_inventory table
CREATE TABLE public.other_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.other_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view other_inventory"
ON public.other_inventory FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert other_inventory"
ON public.other_inventory FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update other_inventory"
ON public.other_inventory FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete other_inventory"
ON public.other_inventory FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers"
ON public.suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert suppliers"
ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update suppliers"
ON public.suppliers FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete suppliers"
ON public.suppliers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create delivery_days table
CREATE TABLE public.delivery_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view delivery_days"
ON public.delivery_days FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert delivery_days"
ON public.delivery_days FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update delivery_days"
ON public.delivery_days FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete delivery_days"
ON public.delivery_days FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create delivery_routes table
CREATE TABLE public.delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  delivery_day_id UUID REFERENCES public.delivery_days(id) ON DELETE SET NULL,
  customer_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view delivery_routes"
ON public.delivery_routes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert delivery_routes"
ON public.delivery_routes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update delivery_routes"
ON public.delivery_routes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete delivery_routes"
ON public.delivery_routes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tasks"
ON public.tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert tasks"
ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
ON public.tasks FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete tasks"
ON public.tasks FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to handle new user signup - create profile and assign admin role to first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  
  -- First user gets admin role, others get worker role
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'worker');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crops_updated_at
  BEFORE UPDATE ON public.crops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();