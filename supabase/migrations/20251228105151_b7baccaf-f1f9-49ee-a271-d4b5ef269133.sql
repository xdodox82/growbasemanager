-- Add needs_weight column to crops table
ALTER TABLE public.crops ADD COLUMN needs_weight boolean DEFAULT false;