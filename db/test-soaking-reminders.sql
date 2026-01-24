/*
  ============================================================================
  TEST DATA FOR SOAKING REMINDERS SYSTEM
  ============================================================================

  This script creates test planting plans to verify the soaking reminders
  functionality. Run this in Supabase SQL Editor after logging in.

  IMPORTANT: Replace 'YOUR_USER_ID' with your actual user_id from auth.users
  Or just use auth.uid() if running while authenticated.
*/

-- ============================================================================
-- STEP 1: Verify soaking configuration for products
-- ============================================================================

-- Check which products require soaking
SELECT
  name,
  variety,
  soaking,
  soaking_duration_hours,
  CASE
    WHEN soaking_duration_hours >= 8 THEN 'Long soaking (reminder 1 day before)'
    WHEN soaking_duration_hours > 0 THEN 'Short soaking (reminder same day)'
    ELSE 'No soaking needed'
  END as reminder_type
FROM products
WHERE soaking = true
ORDER BY soaking_duration_hours DESC;

/*
  Expected results:
  - Hrach siaty Affyla: 12 hours (Long soaking)
  - Hrach vráskavý: 12 hours (Long soaking)
  - Hrach šalátový: 12 hours (Long soaking)
  - Slnečnica: 0.5 hours (Short soaking)
*/

-- ============================================================================
-- STEP 2: Create test planting plans
-- ============================================================================

-- TEST 1: Long soaking (12h) - Should show reminder TODAY for sowing TOMORROW
-- This creates a pea planting plan for tomorrow
INSERT INTO planting_plans (
  user_id,
  crop_id,
  sow_date,
  expected_harvest_date,
  tray_count,
  tray_size,
  seed_amount_grams,
  status,
  count_as_production
) VALUES (
  auth.uid(),
  (SELECT id FROM products WHERE name ILIKE '%hrach%affyla%' LIMIT 1),
  CURRENT_DATE + INTERVAL '1 day', -- Tomorrow
  CURRENT_DATE + INTERVAL '12 days',
  7,
  'XL',
  700,
  'planned',
  true
);

-- TEST 2: Short soaking (0.5h) - Should show reminder TODAY for sowing TODAY
-- This creates a sunflower planting plan for today
INSERT INTO planting_plans (
  user_id,
  crop_id,
  sow_date,
  expected_harvest_date,
  tray_count,
  tray_size,
  seed_amount_grams,
  status,
  count_as_production
) VALUES (
  auth.uid(),
  (SELECT id FROM products WHERE name ILIKE '%slnečnic%' LIMIT 1),
  CURRENT_DATE, -- Today
  CURRENT_DATE + INTERVAL '8 days',
  3,
  'XL',
  180,
  'planned',
  true
);

-- TEST 3: Another pea variety for day after tomorrow (should NOT show today)
-- This should NOT appear in today's reminders
INSERT INTO planting_plans (
  user_id,
  crop_id,
  sow_date,
  expected_harvest_date,
  tray_count,
  tray_size,
  seed_amount_grams,
  status,
  count_as_production
) VALUES (
  auth.uid(),
  (SELECT id FROM products WHERE name ILIKE '%hrach%vráskavý%' LIMIT 1),
  CURRENT_DATE + INTERVAL '2 days', -- Day after tomorrow
  CURRENT_DATE + INTERVAL '15 days',
  5,
  'L',
  425,
  'planned',
  true
);

-- TEST 4: Salad pea for 3 days from now (should NOT show today)
INSERT INTO planting_plans (
  user_id,
  crop_id,
  sow_date,
  expected_harvest_date,
  tray_count,
  tray_size,
  seed_amount_grams,
  status,
  count_as_production
) VALUES (
  auth.uid(),
  (SELECT id FROM products WHERE name ILIKE '%hrach šalátový%' LIMIT 1),
  CURRENT_DATE + INTERVAL '3 days',
  CURRENT_DATE + INTERVAL '16 days',
  10,
  'XL',
  1500,
  'planned',
  true
);

-- ============================================================================
-- STEP 3: Verify the reminders function
-- ============================================================================

-- Check what reminders should appear today
SELECT
  plan_id,
  crop_name,
  sow_date,
  reminder_date,
  days_until_sow,
  tray_count,
  seed_amount_grams,
  soaking_duration_hours,
  CASE
    WHEN reminder_date = CURRENT_DATE THEN 'SHOWS TODAY ✓'
    ELSE 'Does not show today'
  END as display_status
FROM get_pending_soaking_reminders()
ORDER BY reminder_date, crop_name;

/*
  Expected results TODAY:
  1. ✅ Hrach siaty Affyla - Shows TODAY (for sowing TOMORROW)
  2. ✅ Slnečnica - Shows TODAY (for sowing TODAY)
  3. ❌ Hrach vráskavý - Shows TOMORROW (for sowing day after tomorrow)
  4. ❌ Hrach šalátový - Shows in 2 days (for sowing in 3 days)
*/

-- ============================================================================
-- STEP 4: Check today's reminders specifically
-- ============================================================================

-- This is what the component actually uses
SELECT
  plan_id,
  crop_name,
  sow_date,
  tray_count,
  seed_amount_grams,
  soaking_duration_hours,
  days_until_sow,
  CASE
    WHEN days_until_sow = 0 THEN 'DNES (Today)'
    WHEN days_until_sow = 1 THEN 'ZAJTRA (Tomorrow)'
    ELSE days_until_sow || ' dni (days)'
  END as sow_timing
FROM get_pending_soaking_reminders()
WHERE reminder_date = CURRENT_DATE
ORDER BY days_until_sow, crop_name;

/*
  Expected: 2 results
  1. Slnečnica - Sowing TODAY (days_until_sow = 0)
  2. Hrach siaty Affyla - Sowing TOMORROW (days_until_sow = 1)
*/

-- ============================================================================
-- STEP 5: Test marking as completed
-- ============================================================================

-- Mark the pea soaking as completed
-- Replace <plan_id> with actual UUID from previous query
/*
INSERT INTO soaking_completions (
  planting_plan_id,
  completed_at,
  notes
) VALUES (
  '<plan_id>',
  NOW(),
  'Test completion'
);
*/

-- After inserting completion, run step 4 again
-- The completed plan should no longer appear in results

-- ============================================================================
-- STEP 6: View completion history
-- ============================================================================

-- See all completed soakings
SELECT
  sc.completed_at,
  sc.notes,
  p.name as crop_name,
  pp.sow_date,
  pp.tray_count
FROM soaking_completions sc
JOIN planting_plans pp ON pp.id = sc.planting_plan_id
JOIN products p ON p.id = pp.crop_id
WHERE sc.user_id = auth.uid()
ORDER BY sc.completed_at DESC;

-- ============================================================================
-- CLEANUP: Remove test data (optional)
-- ============================================================================

-- Uncomment to delete test planting plans
/*
DELETE FROM planting_plans
WHERE user_id = auth.uid()
  AND created_at > NOW() - INTERVAL '1 hour'
  AND status = 'planned';
*/

-- Uncomment to delete test completions
/*
DELETE FROM soaking_completions
WHERE user_id = auth.uid()
  AND created_at > NOW() - INTERVAL '1 hour';
*/

-- ============================================================================
-- MANUAL TESTING CHECKLIST
-- ============================================================================

/*
  After running this script:

  □ 1. Open the Dashboard in the app
  □ 2. Verify you see the "💧 NAMOČIŤ SEMENÁ" card
  □ 3. Verify you see 2 reminders:
      □ a. Hrach siaty Affyla (Sadí sa ZAJTRA)
      □ b. Slnečnica (Sadí sa DNES)
  □ 4. Click "✓ Namočené" on one reminder
  □ 5. Verify:
      □ a. Success toast appears
      □ b. Reminder disappears from list
      □ c. Badge count decreases
  □ 6. Refresh the page
  □ 7. Verify:
      □ a. Completed reminder is still gone
      □ b. Other reminder is still visible
  □ 8. Test real-time updates:
      □ a. Open Dashboard in two browser tabs
      □ b. Mark reminder complete in tab 1
      □ c. Verify it disappears in tab 2 automatically

  ✅ ALL TESTS PASSED = System working correctly!
*/

-- ============================================================================
-- ADDITIONAL VERIFICATION QUERIES
-- ============================================================================

-- Check if soaking columns exist
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('soaking', 'soaking_duration_hours');

-- Check if soaking_completions table exists
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'soaking_completions';

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'soaking_completions'
ORDER BY policyname;

-- Check if RPC function exists
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'get_pending_soaking_reminders';

-- ============================================================================
-- EDGE CASES TO TEST
-- ============================================================================

-- Edge Case 1: Plan with status 'completed' should NOT show
/*
UPDATE planting_plans
SET status = 'completed'
WHERE id = '<some_plan_id>';

-- Verify it doesn't appear in reminders
SELECT * FROM get_pending_soaking_reminders();
*/

-- Edge Case 2: Crop without soaking should NOT show
/*
INSERT INTO planting_plans (...)
VALUES (..., (SELECT id FROM products WHERE soaking = false LIMIT 1), ...);

-- Verify it doesn't appear in reminders
SELECT * FROM get_pending_soaking_reminders();
*/

-- Edge Case 3: Plan in distant future should NOT show today
/*
INSERT INTO planting_plans (...)
VALUES (..., CURRENT_DATE + INTERVAL '10 days', ...);

-- Verify it doesn't appear in today's reminders
SELECT * FROM get_pending_soaking_reminders()
WHERE reminder_date = CURRENT_DATE;
*/

-- ============================================================================
-- PERFORMANCE CHECK
-- ============================================================================

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM get_pending_soaking_reminders();

-- Should complete in < 100ms for typical dataset
