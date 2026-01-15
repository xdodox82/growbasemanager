/*
  # Add payment method to customers table

  1. Changes
    - Add `payment_method` column to `customers` table
    - Values: 'cash' (default) or 'invoice'
    - This will control how payments are handled during delivery
  
  2. Notes
    - Cash customers: kurír vidí tlačidlá "Zaplatiť"
    - Invoice customers: kurír vidí status "Uhradené faktúrou"
    - Default is 'cash' for backward compatibility
*/

-- Create enum for payment methods
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE public.payment_method AS ENUM ('cash', 'invoice');
  END IF;
END $$;

-- Add payment_method column to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE public.customers 
    ADD COLUMN payment_method public.payment_method DEFAULT 'cash';
  END IF;
END $$;