-- Add business fields to customers table for gastro and wholesale customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS ico text,
ADD COLUMN IF NOT EXISTS dic text,
ADD COLUMN IF NOT EXISTS ic_dph text,
ADD COLUMN IF NOT EXISTS bank_account text;