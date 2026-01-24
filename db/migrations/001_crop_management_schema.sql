/*
  # CROP MANAGEMENT SCHEMA ENHANCEMENTS

  ## MIGRATION: 001_crop_management_schema.sql
  ## DATE: 2026-01-24
  ## AUTHOR: GrowBase System

  ================================================================================
  OVERVIEW
  ================================================================================

  This migration extends the existing crop management system with comprehensive
  tracking capabilities for crops, seeds, blends, and planting operations.

  The migration is IDEMPOTENT - it can be run multiple times without errors.
  All CREATE statements use IF NOT EXISTS and column additions are checked first.

  ================================================================================
  CHANGES SUMMARY
  ================================================================================

  1. PRODUCTS TABLE - Extended with standardized field names
  2. BLEND_ITEMS TABLE - New relational structure for blend composition
  3. HOME_MIX_BASE_CROPS TABLE - Base crops for custom home mixes
  4. PLANTING_PLANS TABLE - Extended with seed tracking fields
  5. SEED_CONSUMPTION_LOG TABLE - Complete history of seed usage

  All tables have Row Level Security (RLS) enabled with user-scoped policies.

  ================================================================================
*/


-- ============================================================================
-- SECTION 1: EXTEND PRODUCTS TABLE
-- ============================================================================
/*
  Products table receives additional standardized field names that provide
  clear aliases for existing fields and maintain backward compatibility.

  NEW COLUMNS:
  - germination_days: Integer, days needed for germination
  - blackout_days: Integer, days crops spend in darkness
  - light_days: Integer, days crops spend under light
  - soaking: Boolean, whether seeds require soaking
  - substrate: Text, default substrate type for this crop
  - cut_form: Boolean, can be sold in cut form
  - live_form: Boolean, can be sold as living plants
  - reserved_percentage: Numeric (default 5), safety buffer percentage
*/

DO $$
BEGIN
  -- germination_days (maps to existing days_to_germination)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'germination_days'
  ) THEN
    ALTER TABLE products ADD COLUMN germination_days INTEGER;
    RAISE NOTICE 'Added column: products.germination_days';
    -- Copy data from existing column
    UPDATE products SET germination_days = days_to_germination WHERE germination_days IS NULL;
  END IF;

  -- blackout_days (maps to existing days_in_darkness)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'blackout_days'
  ) THEN
    ALTER TABLE products ADD COLUMN blackout_days INTEGER;
    RAISE NOTICE 'Added column: products.blackout_days';
    UPDATE products SET blackout_days = days_in_darkness WHERE blackout_days IS NULL;
  END IF;

  -- light_days (maps to existing days_on_light)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'light_days'
  ) THEN
    ALTER TABLE products ADD COLUMN light_days INTEGER;
    RAISE NOTICE 'Added column: products.light_days';
    UPDATE products SET light_days = days_on_light WHERE light_days IS NULL;
  END IF;

  -- soaking (maps to existing seed_soaking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'soaking'
  ) THEN
    ALTER TABLE products ADD COLUMN soaking BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added column: products.soaking';
    UPDATE products SET soaking = seed_soaking WHERE soaking IS NULL;
  END IF;

  -- substrate (maps to existing default_substrate_type)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'substrate'
  ) THEN
    ALTER TABLE products ADD COLUMN substrate TEXT;
    RAISE NOTICE 'Added column: products.substrate';
    UPDATE products SET substrate = default_substrate_type WHERE substrate IS NULL;
  END IF;

  -- cut_form (maps to existing can_be_cut)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'cut_form'
  ) THEN
    ALTER TABLE products ADD COLUMN cut_form BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added column: products.cut_form';
    UPDATE products SET cut_form = can_be_cut WHERE cut_form IS NULL;
  END IF;

  -- live_form (maps to existing can_be_live)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'live_form'
  ) THEN
    ALTER TABLE products ADD COLUMN live_form BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added column: products.live_form';
    UPDATE products SET live_form = can_be_live WHERE live_form IS NULL;
  END IF;

  -- reserved_percentage (converts from safety_buffer_percent decimal to percentage)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'reserved_percentage'
  ) THEN
    ALTER TABLE products ADD COLUMN reserved_percentage NUMERIC DEFAULT 5;
    RAISE NOTICE 'Added column: products.reserved_percentage';
    -- Convert from decimal (0.10) to percentage (10)
    UPDATE products SET reserved_percentage = (safety_buffer_percent * 100)
    WHERE reserved_percentage IS NULL AND safety_buffer_percent IS NOT NULL;
  END IF;

  RAISE NOTICE 'Section 1 Complete: Products table extended';
END $$;


-- ============================================================================
-- SECTION 2: CREATE BLEND_ITEMS TABLE
-- ============================================================================
/*
  Relational structure for blend composition replacing JSONB storage.

  STRUCTURE:
  - id: UUID primary key
  - blend_id: Reference to parent blend
  - crop_id: Reference to crop in blend
  - percentage: Numeric 0-100, crop percentage in blend
  - user_id: User ownership
  - created_at: Timestamp

  INDEXES:
  - idx_blend_items_blend_id: Fast blend lookups
  - idx_blend_items_crop_id: Fast crop usage queries

  RLS POLICIES:
  - Users can only access their own blend items
  - Full CRUD operations for authenticated users
*/

CREATE TABLE IF NOT EXISTS blend_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blend_id UUID NOT NULL REFERENCES blends(id) ON DELETE CASCADE,
  crop_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  percentage NUMERIC NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  user_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_blend_items_blend_id ON blend_items(blend_id);
CREATE INDEX IF NOT EXISTS idx_blend_items_crop_id ON blend_items(crop_id);

-- Enable Row Level Security
ALTER TABLE blend_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop and recreate for idempotence)
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

-- Verify table creation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blend_items') THEN
    RAISE NOTICE 'Section 2 Complete: blend_items table created successfully';
  END IF;
END $$;


-- ============================================================================
-- SECTION 3: CREATE HOME_MIX_BASE_CROPS TABLE
-- ============================================================================
/*
  Defines base crops used for creating custom home-made mixes.

  STRUCTURE:
  - id: UUID primary key
  - crop_id: Reference to base crop
  - percentage: Default percentage for this crop in home mixes
  - user_id: User ownership
  - created_at: Timestamp

  CONSTRAINTS:
  - UNIQUE(crop_id, user_id): One entry per crop per user
  - CHECK: percentage must be between 0 and 100

  RLS POLICIES:
  - Users can only manage their own base crop configurations
*/

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
    RAISE NOTICE 'Added unique constraint on home_mix_base_crops(crop_id, user_id)';
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE home_mix_base_crops ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Verify table creation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'home_mix_base_crops') THEN
    RAISE NOTICE 'Section 3 Complete: home_mix_base_crops table created successfully';
  END IF;
END $$;


-- ============================================================================
-- SECTION 4: EXTEND PLANTING_PLANS TABLE
-- ============================================================================
/*
  Extended tracking capabilities for planting operations.

  NEW COLUMNS:
  - seed_amount_grams: Numeric, grams of seeds used per tray
  - total_seed_grams: Numeric, total seed consumption (tray_count × seed_amount_grams)
  - is_manual_edit: Boolean, tracks if plan was manually modified
  - blend_id: UUID, reference to blend if plan uses a mix
  - actual_sow_date: Date, actual sowing date (vs planned sow_date)
  - completed_at: Timestamp, when the planting was marked complete
*/

DO $$
BEGIN
  -- seed_amount_grams
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'seed_amount_grams'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN seed_amount_grams NUMERIC;
    RAISE NOTICE 'Added column: planting_plans.seed_amount_grams';
  END IF;

  -- total_seed_grams
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'total_seed_grams'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN total_seed_grams NUMERIC;
    RAISE NOTICE 'Added column: planting_plans.total_seed_grams';
  END IF;

  -- is_manual_edit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'is_manual_edit'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN is_manual_edit BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added column: planting_plans.is_manual_edit';
  END IF;

  -- blend_id (for plans created from blends)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'blend_id'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN blend_id UUID REFERENCES blends(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added column: planting_plans.blend_id';
  END IF;

  -- actual_sow_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'actual_sow_date'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN actual_sow_date DATE;
    RAISE NOTICE 'Added column: planting_plans.actual_sow_date';
  END IF;

  -- completed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN completed_at TIMESTAMPTZ;
    RAISE NOTICE 'Added column: planting_plans.completed_at';
  END IF;

  RAISE NOTICE 'Section 4 Complete: planting_plans table extended';
END $$;


-- ============================================================================
-- SECTION 5: CREATE SEED_CONSUMPTION_LOG TABLE
-- ============================================================================
/*
  Complete audit trail of seed consumption from inventory.

  STRUCTURE:
  - id: UUID primary key
  - seed_id: Reference to seed lot consumed
  - crop_id: Reference to crop type
  - planting_plan_id: Reference to planting plan
  - amount_consumed_grams: Numeric (>= 0), amount consumed
  - consumed_at: Timestamp of consumption
  - consumed_by: UUID of user who performed consumption
  - notes: Additional information
  - user_id: Record owner
  - created_at: Record creation timestamp

  INDEXES:
  - idx_seed_consumption_log_seed_id: Fast seed lot lookups
  - idx_seed_consumption_log_planting_plan_id: Fast plan tracking
  - idx_seed_consumption_log_consumed_at: Time-based queries

  RLS POLICIES:
  - Users can only access their own consumption logs
  - Full CRUD operations for authenticated users

  USE CASES:
  - Track seed inventory depletion
  - Audit seed usage per planting plan
  - Calculate seed consumption rates
  - Historical seed usage analysis
*/

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

-- Enable Row Level Security
ALTER TABLE seed_consumption_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Verify table creation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seed_consumption_log') THEN
    RAISE NOTICE 'Section 5 Complete: seed_consumption_log table created successfully';
  END IF;
END $$;


-- ============================================================================
-- SECTION 6: VERIFICATION AND SUMMARY
-- ============================================================================
/*
  Final verification that all changes were applied successfully.
  This section runs checks and provides a summary report.
*/

-- Verify all tables exist
DO $$
DECLARE
  v_tables TEXT[] := ARRAY[
    'products', 'blend_items', 'home_mix_base_crops',
    'planting_plans', 'seed_consumption_log', 'seeds', 'blends'
  ];
  v_table TEXT;
  v_exists BOOLEAN;
  v_missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) INTO v_exists;

    IF NOT v_exists THEN
      v_missing_tables := array_append(v_missing_tables, v_table);
    END IF;
  END LOOP;

  IF array_length(v_missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Missing tables: %', array_to_string(v_missing_tables, ', ');
  ELSE
    RAISE NOTICE 'All required tables exist ✓';
  END IF;
END $$;

-- Generate summary report
SELECT
  '════════════════════════════════════════════════════════════════' as divider
UNION ALL
SELECT '  MIGRATION COMPLETED SUCCESSFULLY'
UNION ALL
SELECT '  Migration: 001_crop_management_schema.sql'
UNION ALL
SELECT '  Date: ' || NOW()::date::text
UNION ALL
SELECT '════════════════════════════════════════════════════════════════'
UNION ALL
SELECT ''
UNION ALL
SELECT '  TABLE STATISTICS:'
UNION ALL
SELECT '  ─────────────────────────────────────────────────────────────'
UNION ALL
SELECT '  products: ' || (SELECT COUNT(*)::text FROM products) || ' rows'
UNION ALL
SELECT '  blends: ' || (SELECT COUNT(*)::text FROM blends) || ' rows'
UNION ALL
SELECT '  blend_items: ' || (SELECT COUNT(*)::text FROM blend_items) || ' rows (NEW)'
UNION ALL
SELECT '  home_mix_base_crops: ' || (SELECT COUNT(*)::text FROM home_mix_base_crops) || ' rows (NEW)'
UNION ALL
SELECT '  planting_plans: ' || (SELECT COUNT(*)::text FROM planting_plans) || ' rows'
UNION ALL
SELECT '  seeds: ' || (SELECT COUNT(*)::text FROM seeds) || ' rows'
UNION ALL
SELECT '  seed_consumption_log: ' || (SELECT COUNT(*)::text FROM seed_consumption_log) || ' rows (NEW)'
UNION ALL
SELECT ''
UNION ALL
SELECT '  NEW COLUMNS IN PRODUCTS:'
UNION ALL
SELECT '  ─────────────────────────────────────────────────────────────'
UNION ALL
SELECT '  ✓ germination_days, blackout_days, light_days'
UNION ALL
SELECT '  ✓ soaking, substrate, cut_form, live_form'
UNION ALL
SELECT '  ✓ reserved_percentage'
UNION ALL
SELECT ''
UNION ALL
SELECT '  NEW COLUMNS IN PLANTING_PLANS:'
UNION ALL
SELECT '  ─────────────────────────────────────────────────────────────'
UNION ALL
SELECT '  ✓ seed_amount_grams, total_seed_grams, is_manual_edit'
UNION ALL
SELECT '  ✓ blend_id, actual_sow_date, completed_at'
UNION ALL
SELECT ''
UNION ALL
SELECT '  SECURITY:'
UNION ALL
SELECT '  ─────────────────────────────────────────────────────────────'
UNION ALL
SELECT '  ✓ Row Level Security enabled on all new tables'
UNION ALL
SELECT '  ✓ User-scoped policies configured'
UNION ALL
SELECT ''
UNION ALL
SELECT '════════════════════════════════════════════════════════════════';
