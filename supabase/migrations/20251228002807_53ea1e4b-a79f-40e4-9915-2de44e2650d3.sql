-- Pridať chýbajúce stĺpce do suppliers tabuľky
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS supplier_type TEXT,
ADD COLUMN IF NOT EXISTS ico TEXT,
ADD COLUMN IF NOT EXISTS ic_dph TEXT,
ADD COLUMN IF NOT EXISTS dic TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT;