-- Add columns for combined plantings and seed/packaging selection
-- crop_components stores multiple crops with percentages for combined plantings
-- Format: [{"crop_id": "uuid", "percentage": 50, "seed_id": "uuid"}, ...]
ALTER TABLE public.planting_plans 
ADD COLUMN IF NOT EXISTS seed_id uuid REFERENCES public.seeds(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_combined boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS crop_components jsonb DEFAULT '[]'::jsonb;

-- Add comments for clarity
COMMENT ON COLUMN public.planting_plans.seed_id IS 'Reference to specific seed lot used for single-crop planting';
COMMENT ON COLUMN public.planting_plans.is_combined IS 'Whether this is a combined planting with multiple crops';
COMMENT ON COLUMN public.planting_plans.crop_components IS 'Array of crops with percentages and seed lots for combined plantings: [{crop_id, percentage, seed_id}]';