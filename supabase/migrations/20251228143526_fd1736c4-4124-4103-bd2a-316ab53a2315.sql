-- Add parent_order_id to link recurring orders together
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS parent_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

-- Add skipped column to mark if this delivery was skipped (for recurring)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS skipped boolean DEFAULT false;

-- Create index for faster lookup of child orders
CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id ON public.orders(parent_order_id);