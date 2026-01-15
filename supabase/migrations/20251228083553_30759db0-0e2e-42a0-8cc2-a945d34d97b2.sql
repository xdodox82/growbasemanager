-- Add missing columns to orders table for delivery form, packaging size and label
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_form text DEFAULT 'cut';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS packaging_size text DEFAULT '100g';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS has_label boolean DEFAULT true;

-- Create labels table for inventory management
CREATE TABLE IF NOT EXISTS public.labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'standard',
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  supplier_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on labels
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- Create policies for labels
CREATE POLICY "Authenticated users can view labels" ON public.labels FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert labels" ON public.labels FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update labels" ON public.labels FOR UPDATE USING (true);
CREATE POLICY "Admins can delete labels" ON public.labels FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));