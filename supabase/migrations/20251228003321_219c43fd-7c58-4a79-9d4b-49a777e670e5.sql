-- Pridať chýbajúce stĺpce do crops tabuľky podľa pôvodného typu
ALTER TABLE public.crops 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'microgreens',
ADD COLUMN IF NOT EXISTS days_to_germination INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS germination_type TEXT DEFAULT 'warm',
ADD COLUMN IF NOT EXISTS days_in_darkness INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS days_on_light INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS can_be_cut BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_be_live BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notes TEXT;