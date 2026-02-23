-- Add customer_type column to prices table for different pricing per customer type
ALTER TABLE public.prices ADD COLUMN customer_type TEXT DEFAULT 'all';

-- Add unique constraint to prevent duplicate prices
ALTER TABLE public.prices ADD CONSTRAINT unique_price_entry 
UNIQUE (crop_id, blend_id, packaging_size, customer_type);