/*
  # Add Seed Soaking Fields to Planting Plans

  1. Purpose
    - Track seed soaking requirements for planting plans
    - Allow users to set custom soaking times

  2. Changes
    - Add soaking_hours_before_sowing to planting_plans
    - Default is 12 hours (overnight soaking)
    - Users can customize this per planting plan

  3. Notes
    - For crops with seed_soaking=true, this field will be used
    - Helps create reminders and tasks for seed soaking
*/

-- Add soaking field to planting_plans
ALTER TABLE planting_plans 
ADD COLUMN IF NOT EXISTS soaking_hours_before_sowing integer DEFAULT 12;

COMMENT ON COLUMN planting_plans.soaking_hours_before_sowing IS 'Number of hours before sowing that seeds should be soaked (for crops requiring soaking)';
