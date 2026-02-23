-- Add packaging_type column to orders table for packaging material type
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS packaging_type text DEFAULT NULL;