-- Add order_number column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number SERIAL;

-- Create index for faster lookup by order_number
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);