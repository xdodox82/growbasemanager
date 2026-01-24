/*
  # Enhanced Crop Management Schema

  ## Overview
  This migration extends the existing crop management system with additional
  fields for detailed tracking of crops, seeds, blends, and planting plans.

  ## Changes

  ### 1. Products Table Extensions
  - Added germination_days (INTEGER) - standardized name for days to germination
  - Added blackout_days (INTEGER) - alias for days_in_darkness
  - Added light_days (INTEGER) - alias for days_on_light
  - Added soaking (BOOLEAN) - standardized name for seed soaking requirement
  - Added substrate (TEXT) - predefined substrate for crop
  - Added cut_form (BOOLEAN) - renamed from can_be_cut
  - Added live_form (BOOLEAN) - renamed from can_be_live
  - Added reserved_percentage (NUMERIC) - standardized from safety_buffer_percent

  ### 2. New Table: blend_items
  - Structured blend composition with percentages
  - Replaces jsonb crop_percentages with relational structure
  - Enables proper foreign key constraints and queries

  ### 3. New Table: home_mix_base_crops
  - Defines base crops used for home-made mixes
  - Allows percentage-based composition for custom blends

  ### 4. New Table: seed_consumption_log
  - Tracks all seed consumption from inventory
  - Links to planting plans for traceability
  - Maintains consumption history with timestamps

  ### 5. Planting Plans Extensions
  - Added seed_amount_grams (NUMERIC) - grams of seeds per tray
  - Added total_seed_grams (NUMERIC) - calculated total seed usage
  - Added is_manual_edit (BOOLEAN) - tracks manual modifications
  - Added blend_id (UUID) - reference to blend if plan is from mix
  - Added actual_sow_date (DATE) - actual sowing date vs planned
  - Added completed_at (TIMESTAMPTZ) - completion timestamp

  ## Security
  - All new tables have RLS enabled
  - Policies restrict access to authenticated users
  - User-scoped data isolation via user_id fields
*/

-- ============================================================================
-- SECTION 1: EXTEND PRODUCTS TABLE
-- ============================================================================

-- Add missing columns to products table if they don't exist
DO $$
BEGIN
  -- germination_days (already exists as days_to_germination)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'germination_days'
  ) THEN
    ALTER TABLE products ADD COLUMN germination_days INTEGER;
    UPDATE products SET germination_days = days_to_germination WHERE germination_days IS NULL;
  END IF;

  -- blackout_days (already exists as days_in_darkness)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'blackout_days'
  ) THEN
    ALTER TABLE products ADD COLUMN blackout_days INTEGER;
    UPDATE products SET blackout_days = days_in_darkness WHERE blackout_days IS NULL;
  END IF;

  -- light_days (already exists as days_on_light)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'light_days'
  ) THEN
    ALTER TABLE products ADD COLUMN light_days INTEGER;
    UPDATE products SET light_days = days_on_light WHERE light_days IS NULL;
  END IF;

  -- soaking (already exists as seed_soaking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'soaking'
  ) THEN
    ALTER TABLE products ADD COLUMN soaking BOOLEAN DEFAULT FALSE;
    UPDATE products SET soaking = seed_soaking WHERE soaking IS NULL;
  END IF;

  -- substrate (already exists as default_substrate_type)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'substrate'
  ) THEN
    ALTER TABLE products ADD COLUMN substrate TEXT;
    UPDATE products SET substrate = default_substrate_type WHERE substrate IS NULL;
  END IF;

  -- cut_form (already exists as can_be_cut)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'cut_form'
  ) THEN
    ALTER TABLE products ADD COLUMN cut_form BOOLEAN DEFAULT FALSE;
    UPDATE products SET cut_form = can_be_cut WHERE cut_form IS NULL;
  END IF;

  -- live_form (already exists as can_be_live)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'live_form'
  ) THEN
    ALTER TABLE products ADD COLUMN live_form BOOLEAN DEFAULT FALSE;
    UPDATE products SET live_form = can_be_live WHERE live_form IS NULL;
  END IF;

  -- reserved_percentage (already exists as safety_buffer_percent)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'reserved_percentage'
  ) THEN
    ALTER TABLE products ADD COLUMN reserved_percentage NUMERIC DEFAULT 5;
    UPDATE products SET reserved_percentage = (safety_buffer_percent * 100) 
    WHERE reserved_percentage IS NULL AND safety_buffer_percent IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: CREATE BLEND_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blend_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blend_id UUID NOT NULL REFERENCES blends(id) ON DELETE CASCADE,
  crop_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  percentage NUMERIC NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  user_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blend_items_blend_id ON blend_items(blend_id);
CREATE INDEX IF NOT EXISTS idx_blend_items_crop_id ON blend_items(crop_id);

-- Enable RLS
ALTER TABLE blend_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blend_items (drop and recreate to ensure idempotence)
DROP POLICY IF EXISTS "Users can view own blend items" ON blend_items;
CREATE POLICY "Users can view own blend items"
  ON blend_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own blend items" ON blend_items;
CREATE POLICY "Users can insert own blend items"
  ON blend_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own blend items" ON blend_items;
CREATE POLICY "Users can update own blend items"
  ON blend_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own blend items" ON blend_items;
CREATE POLICY "Users can delete own blend items"
  ON blend_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 3: CREATE HOME_MIX_BASE_CROPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS home_mix_base_crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  percentage NUMERIC NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  user_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'home_mix_base_crops_crop_id_user_id_key'
  ) THEN
    ALTER TABLE home_mix_base_crops 
    ADD CONSTRAINT home_mix_base_crops_crop_id_user_id_key 
    UNIQUE(crop_id, user_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE home_mix_base_crops ENABLE ROW LEVEL SECURITY;

-- RLS Policies for home_mix_base_crops
DROP POLICY IF EXISTS "Users can view own home mix base crops" ON home_mix_base_crops;
CREATE POLICY "Users can view own home mix base crops"
  ON home_mix_base_crops FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own home mix base crops" ON home_mix_base_crops;
CREATE POLICY "Users can insert own home mix base crops"
  ON home_mix_base_crops FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own home mix base crops" ON home_mix_base_crops;
CREATE POLICY "Users can update own home mix base crops"
  ON home_mix_base_crops FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own home mix base crops" ON home_mix_base_crops;
CREATE POLICY "Users can delete own home mix base crops"
  ON home_mix_base_crops FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 4: EXTEND PLANTING_PLANS TABLE
-- ============================================================================

DO $$
BEGIN
  -- seed_amount_grams
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planting_plans' AND column_name = 'seed_amount_grams'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN seed_amount_grams NUMERIC;
  END IF;

  -- total_seed_grams
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planting_plans' AND column_name = 'total_seed_grams'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN total_seed_grams NUMERIC;
  END IF;

  -- is_manual_edit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planting_plans' AND column_name = 'is_manual_edit'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN is_manual_edit BOOLEAN DEFAULT FALSE;
  END IF;

  -- blend_id (for plans created from blends)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planting_plans' AND column_name = 'blend_id'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN blend_id UUID REFERENCES blends(id) ON DELETE SET NULL;
  END IF;

  -- actual_sow_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planting_plans' AND column_name = 'actual_sow_date'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN actual_sow_date DATE;
  END IF;

  -- completed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planting_plans' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- SECTION 5: CREATE SEED_CONSUMPTION_LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS seed_consumption_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id UUID REFERENCES seeds(id) ON DELETE SET NULL,
  crop_id UUID REFERENCES products(id) ON DELETE SET NULL,
  planting_plan_id UUID REFERENCES planting_plans(id) ON DELETE SET NULL,
  amount_consumed_grams NUMERIC NOT NULL CHECK (amount_consumed_grams >= 0),
  consumed_at TIMESTAMPTZ DEFAULT NOW(),
  consumed_by UUID,
  notes TEXT,
  user_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_seed_consumption_log_seed_id 
  ON seed_consumption_log(seed_id);
CREATE INDEX IF NOT EXISTS idx_seed_consumption_log_planting_plan_id 
  ON seed_consumption_log(planting_plan_id);
CREATE INDEX IF NOT EXISTS idx_seed_consumption_log_consumed_at 
  ON seed_consumption_log(consumed_at DESC);

-- Enable RLS
ALTER TABLE seed_consumption_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seed_consumption_log
DROP POLICY IF EXISTS "Users can view own seed consumption logs" ON seed_consumption_log;
CREATE POLICY "Users can view own seed consumption logs"
  ON seed_consumption_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own seed consumption logs" ON seed_consumption_log;
CREATE POLICY "Users can insert own seed consumption logs"
  ON seed_consumption_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own seed consumption logs" ON seed_consumption_log;
CREATE POLICY "Users can update own seed consumption logs"
  ON seed_consumption_log FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own seed consumption logs" ON seed_consumption_log;
CREATE POLICY "Users can delete own seed consumption logs"
  ON seed_consumption_log FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);