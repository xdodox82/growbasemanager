-- Create order_items table for multi-item orders
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  crop_id uuid REFERENCES public.crops(id) ON DELETE SET NULL,
  blend_id uuid REFERENCES public.blends(id) ON DELETE SET NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'ks',
  packaging_size text DEFAULT '50g',
  delivery_form text DEFAULT 'cut',
  has_label boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view order_items"
ON public.order_items FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert order_items"
ON public.order_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update order_items"
ON public.order_items FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete order_items"
ON public.order_items FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- Add recurring_weeks column to orders for configuring how many weeks to generate
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recurring_weeks integer DEFAULT 8;