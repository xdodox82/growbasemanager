-- Add percentages column to blends table to store crop percentages as JSONB array
ALTER TABLE public.blends ADD COLUMN IF NOT EXISTS crop_percentages jsonb DEFAULT '[]'::jsonb;

-- Add notes column to blends
ALTER TABLE public.blends ADD COLUMN IF NOT EXISTS notes text;