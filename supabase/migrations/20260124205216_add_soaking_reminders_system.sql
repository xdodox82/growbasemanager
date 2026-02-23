/*
  # Soaking Reminders System

  ## Overview
  This migration adds a system for tracking seed soaking reminders for planting plans.
  Seeds that require soaking (like peas, sunflower) need advance preparation.

  ## Changes

  1. New Columns in products table
    - `soaking` (boolean) - Whether the crop requires seed soaking
    - `soaking_duration_hours` (numeric) - How many hours to soak seeds

  2. New Table: soaking_completions
    - `id` (uuid, primary key)
    - `planting_plan_id` (uuid) - Reference to planting plan
    - `completed_at` (timestamptz) - When soaking was marked complete
    - `user_id` (uuid) - User who completed the soaking
    - `notes` (text) - Optional notes

  3. Security
    - Enable RLS on soaking_completions
    - Users can only see their own soaking completion records
    - Users can insert their own completion records
    - Users can delete their own completion records (in case of mistake)

  ## Notes
  - Soaking reminders are calculated based on soaking_duration_hours:
    - >= 8 hours: Show reminder 1 day before sow_date
    - < 8 hours: Show reminder on sow_date
  - Once marked complete, the reminder disappears
*/

-- ============================================================================
-- STEP 1: Add soaking columns to products table
-- ============================================================================

DO $$
BEGIN
  -- Add soaking column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'soaking'
  ) THEN
    ALTER TABLE products ADD COLUMN soaking BOOLEAN DEFAULT false;
  END IF;

  -- Add soaking_duration_hours column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'soaking_duration_hours'
  ) THEN
    ALTER TABLE products ADD COLUMN soaking_duration_hours NUMERIC(5,2) DEFAULT 0;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN products.soaking IS 'Whether seeds need to be soaked before planting';
COMMENT ON COLUMN products.soaking_duration_hours IS 'Duration in hours to soak seeds (e.g., 12 for peas, 0.5 for sunflower)';

-- ============================================================================
-- STEP 2: Create soaking_completions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS soaking_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planting_plan_id UUID NOT NULL REFERENCES planting_plans(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_id UUID DEFAULT auth.uid() NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_soaking_completions_planting_plan 
  ON soaking_completions(planting_plan_id);

CREATE INDEX IF NOT EXISTS idx_soaking_completions_user 
  ON soaking_completions(user_id);

CREATE INDEX IF NOT EXISTS idx_soaking_completions_completed_at 
  ON soaking_completions(completed_at);

-- Add comments
COMMENT ON TABLE soaking_completions IS 'Tracks when seed soaking has been completed for planting plans';
COMMENT ON COLUMN soaking_completions.planting_plan_id IS 'Reference to the planting plan';
COMMENT ON COLUMN soaking_completions.completed_at IS 'When the soaking was marked as complete';
COMMENT ON COLUMN soaking_completions.user_id IS 'User who marked the soaking as complete';
COMMENT ON COLUMN soaking_completions.notes IS 'Optional notes about the soaking';

-- ============================================================================
-- STEP 3: Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE soaking_completions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own soaking completion records
CREATE POLICY "Users can view own soaking completions"
  ON soaking_completions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Users can insert their own soaking completion records
CREATE POLICY "Users can insert own soaking completions"
  ON soaking_completions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own soaking completion records
CREATE POLICY "Users can delete own soaking completions"
  ON soaking_completions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Users can update their own soaking completion records
CREATE POLICY "Users can update own soaking completions"
  ON soaking_completions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- STEP 4: Update existing data with soaking information
-- ============================================================================

-- Update known crops that require soaking
-- Peas (Hrach) - 12 hours
UPDATE products
SET 
  soaking = true,
  soaking_duration_hours = 12
WHERE name ILIKE '%hrach%' OR name ILIKE '%hráš%';

-- Sunflower (Slnečnica) - 0.5 hours (30 minutes)
UPDATE products
SET 
  soaking = true,
  soaking_duration_hours = 0.5
WHERE name ILIKE '%slnečnic%';

-- ============================================================================
-- STEP 5: Create helper function to get pending soaking reminders
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_soaking_reminders()
RETURNS TABLE (
  plan_id UUID,
  sow_date DATE,
  tray_count INTEGER,
  seed_amount_grams NUMERIC,
  crop_name TEXT,
  crop_id UUID,
  soaking_duration_hours NUMERIC,
  reminder_date DATE,
  days_until_sow INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id as plan_id,
    pp.sow_date,
    pp.tray_count,
    pp.seed_amount_grams,
    p.name as crop_name,
    p.id as crop_id,
    p.soaking_duration_hours,
    CASE 
      WHEN p.soaking_duration_hours >= 8 THEN (pp.sow_date - INTERVAL '1 day')::DATE
      ELSE pp.sow_date
    END as reminder_date,
    (pp.sow_date - CURRENT_DATE)::INTEGER as days_until_sow
  FROM planting_plans pp
  JOIN products p ON p.id = pp.crop_id
  WHERE p.soaking = true
    AND pp.sow_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
    AND pp.status != 'completed'
    AND pp.user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM soaking_completions sc 
      WHERE sc.planting_plan_id = pp.id
    )
  ORDER BY pp.sow_date, p.name;
END;
$$;

COMMENT ON FUNCTION get_pending_soaking_reminders IS 'Returns all pending soaking reminders for the authenticated user in the next 7 days';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_pending_soaking_reminders() TO authenticated;