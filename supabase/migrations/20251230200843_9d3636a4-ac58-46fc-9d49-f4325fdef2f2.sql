-- Create worker permissions table
CREATE TABLE public.worker_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  can_view_prices BOOLEAN NOT NULL DEFAULT false,
  can_view_customers BOOLEAN NOT NULL DEFAULT false,
  can_view_suppliers BOOLEAN NOT NULL DEFAULT false,
  can_view_today_tasks BOOLEAN NOT NULL DEFAULT true,
  can_view_harvest BOOLEAN NOT NULL DEFAULT true,
  can_view_delivery BOOLEAN NOT NULL DEFAULT true,
  can_view_planting BOOLEAN NOT NULL DEFAULT true,
  can_view_orders BOOLEAN NOT NULL DEFAULT true,
  can_view_inventory BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.worker_permissions ENABLE ROW LEVEL SECURITY;

-- Policies - Only admins can manage permissions
CREATE POLICY "Admins can view all permissions" 
ON public.worker_permissions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert permissions" 
ON public.worker_permissions 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update permissions" 
ON public.worker_permissions 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete permissions" 
ON public.worker_permissions 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions" 
ON public.worker_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to get worker permission
CREATE OR REPLACE FUNCTION public.get_worker_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE _permission
      WHEN 'prices' THEN can_view_prices
      WHEN 'customers' THEN can_view_customers
      WHEN 'suppliers' THEN can_view_suppliers
      WHEN 'today_tasks' THEN can_view_today_tasks
      WHEN 'harvest' THEN can_view_harvest
      WHEN 'delivery' THEN can_view_delivery
      WHEN 'planting' THEN can_view_planting
      WHEN 'orders' THEN can_view_orders
      WHEN 'inventory' THEN can_view_inventory
      ELSE false
    END,
    -- Default: if no permission record, return true for basic work permissions
    CASE _permission
      WHEN 'today_tasks' THEN true
      WHEN 'harvest' THEN true
      WHEN 'delivery' THEN true
      WHEN 'planting' THEN true
      WHEN 'orders' THEN true
      WHEN 'inventory' THEN true
      ELSE false
    END
  )
  FROM public.worker_permissions
  WHERE user_id = _user_id
$$;

-- Create function to check if user can access (admin OR has permission)
CREATE OR REPLACE FUNCTION public.can_access(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN has_role(_user_id, 'admin'::app_role) THEN true
      ELSE get_worker_permission(_user_id, _permission)
    END
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_worker_permissions_updated_at
BEFORE UPDATE ON public.worker_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update prices table RLS to respect worker permissions
DROP POLICY IF EXISTS "Authenticated users can view prices" ON public.prices;
CREATE POLICY "Users can view prices based on permission" 
ON public.prices 
FOR SELECT 
USING (can_access(auth.uid(), 'prices'));

-- Update customers table RLS to respect worker permissions  
DROP POLICY IF EXISTS "Admins can view customers" ON public.customers;
CREATE POLICY "Users can view customers based on permission" 
ON public.customers 
FOR SELECT 
USING (can_access(auth.uid(), 'customers'));

-- Update suppliers table RLS to respect worker permissions
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
CREATE POLICY "Users can view suppliers based on permission" 
ON public.suppliers 
FOR SELECT 
USING (can_access(auth.uid(), 'suppliers'));