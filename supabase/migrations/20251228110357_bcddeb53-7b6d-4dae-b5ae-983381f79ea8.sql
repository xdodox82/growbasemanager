-- Add customer_type column to customers table
ALTER TABLE public.customers 
ADD COLUMN customer_type text DEFAULT NULL;

-- Add comment for the column
COMMENT ON COLUMN public.customers.customer_type IS 'Type of customer: home (domáci zákazník), gastro, wholesale (veľkoobchod)';