-- Add delivery_route_id to customers table for assigning customers to delivery routes
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS delivery_route_id uuid REFERENCES public.delivery_routes(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_delivery_route_id ON public.customers(delivery_route_id);