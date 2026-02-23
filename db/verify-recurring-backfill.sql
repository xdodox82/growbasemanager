/*
  VERIFIKÁCIA - RECURRING ORDER BACKFILL

  Tento script overí či backfill migrácia úspešne doplnila všetky údaje.

  SPUSTI TENTO SCRIPT PO APLIKOVANÍ BACKFILL MIGRÁCIE.
*/

-- ═══════════════════════════════════════════════════════════
-- TEST 1: ZÁKLADNÁ ŠTATISTIKA
-- ═══════════════════════════════════════════════════════════

SELECT
  '=== TEST 1: ZÁKLADNÁ ŠTATISTIKA ===' as test,
  COUNT(*) FILTER (WHERE is_recurring = true) as "Total Recurring Orders",
  COUNT(*) FILTER (WHERE is_recurring = true AND recurring_order_id IS NOT NULL) as "✅ With recurring_order_id",
  COUNT(*) FILTER (WHERE is_recurring = true AND recurring_order_id IS NULL) as "❌ WITHOUT recurring_order_id",
  COUNT(*) FILTER (WHERE is_recurring = true AND recurring_start_date IS NOT NULL) as "✅ With start_date",
  COUNT(*) FILTER (WHERE is_recurring = true AND recurring_end_date IS NOT NULL) as "✅ With end_date",
  COUNT(*) FILTER (WHERE is_recurring = true AND recurring_total_weeks IS NOT NULL) as "✅ With total_weeks",
  COUNT(*) FILTER (WHERE is_recurring = true AND recurring_current_week IS NOT NULL) as "✅ With current_week"
FROM orders;

-- ═══════════════════════════════════════════════════════════
-- TEST 2: CHÝBAJÚCE ÚDAJE (ERRORS)
-- ═══════════════════════════════════════════════════════════

SELECT
  '=== TEST 2: CHÝBAJÚCE ÚDAJE ===' as test,
  id,
  customer_name,
  delivery_date,
  is_recurring,
  CASE
    WHEN recurring_order_id IS NULL THEN '❌ No recurring_order_id'
    WHEN recurring_start_date IS NULL THEN '❌ No start_date'
    WHEN recurring_end_date IS NULL THEN '❌ No end_date'
    WHEN recurring_total_weeks IS NULL THEN '❌ No total_weeks'
    WHEN recurring_current_week IS NULL THEN '❌ No current_week'
    ELSE '✅ All OK'
  END as status
FROM orders
WHERE is_recurring = true
  AND (
    recurring_order_id IS NULL OR
    recurring_start_date IS NULL OR
    recurring_end_date IS NULL OR
    recurring_total_weeks IS NULL OR
    recurring_current_week IS NULL
  )
ORDER BY customer_name, delivery_date;

-- ═══════════════════════════════════════════════════════════
-- TEST 3: OVERENIE SKUPÍN
-- ═══════════════════════════════════════════════════════════

WITH group_check AS (
  SELECT
    recurring_order_id,
    customer_name,
    COUNT(*) as total_orders,
    MIN(delivery_date) as first_order,
    MAX(delivery_date) as last_order,
    MIN(recurring_start_date) as start_date,
    MAX(recurring_end_date) as end_date,
    MIN(recurring_total_weeks) as total_weeks_min,
    MAX(recurring_total_weeks) as total_weeks_max,
    MAX(recurring_current_week) as max_week
  FROM orders
  WHERE is_recurring = true
    AND recurring_order_id IS NOT NULL
  GROUP BY recurring_order_id, customer_name
)
SELECT
  '=== TEST 3: OVERENIE SKUPÍN ===' as test,
  customer_name as "Zákazník",
  total_orders as "Počet objednávok",
  first_order as "Prvá",
  last_order as "Posledná",
  total_weeks_min as "Total Weeks",
  max_week as "Max Week",
  CASE
    WHEN total_orders = total_weeks_min AND total_orders = max_week THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END as "Status"
FROM group_check
ORDER BY customer_name, first_order;

-- ═══════════════════════════════════════════════════════════
-- TEST 4: DETAIL VŠETKÝCH RECURRING ORDERS
-- ═══════════════════════════════════════════════════════════

SELECT
  '=== TEST 4: DETAIL VŠETKÝCH RECURRING ORDERS ===' as section,
  customer_name as "Zákazník",
  delivery_date as "Delivery Date",
  recurring_current_week as "Week",
  recurring_total_weeks as "Total",
  recurring_start_date as "Start",
  recurring_end_date as "End",
  CASE
    WHEN recurring_order_id IS NOT NULL
      AND recurring_start_date IS NOT NULL
      AND recurring_end_date IS NOT NULL
      AND recurring_total_weeks IS NOT NULL
      AND recurring_current_week IS NOT NULL
    THEN '✅'
    ELSE '❌'
  END as "Complete"
FROM orders
WHERE is_recurring = true
ORDER BY customer_name, delivery_date;

-- ═══════════════════════════════════════════════════════════
-- TEST 5: KONZISTENCIA CURRENT_WEEK
-- ═══════════════════════════════════════════════════════════

WITH week_sequence AS (
  SELECT
    recurring_order_id,
    customer_name,
    ARRAY_AGG(recurring_current_week ORDER BY delivery_date) as week_numbers,
    COUNT(*) as total_orders
  FROM orders
  WHERE is_recurring = true
    AND recurring_order_id IS NOT NULL
  GROUP BY recurring_order_id, customer_name
)
SELECT
  '=== TEST 5: KONZISTENCIA CURRENT_WEEK ===' as test,
  customer_name as "Zákazník",
  total_orders as "Počet",
  week_numbers as "Week Sequence",
  CASE
    WHEN week_numbers = (SELECT ARRAY_AGG(i) FROM generate_series(1, total_orders) i)
    THEN '✅ Sequential OK'
    ELSE '❌ NOT Sequential'
  END as "Status"
FROM week_sequence
ORDER BY customer_name;

-- ═══════════════════════════════════════════════════════════
-- TEST 6: RECURRING ORDERS KONČIACE DO 2 TÝŽDŇOV
-- ═══════════════════════════════════════════════════════════

SELECT
  '=== TEST 6: ORDERS KONČIACE DO 2 TÝŽDŇOV ===' as test,
  customer_name as "Zákazník",
  recurring_end_date as "Koniec",
  ROUND(EXTRACT(EPOCH FROM (recurring_end_date - CURRENT_DATE)) / (7 * 24 * 60 * 60)) as "Týždne do konca",
  recurring_current_week as "Week",
  recurring_total_weeks as "Total"
FROM orders
WHERE is_recurring = true
  AND recurring_end_date IS NOT NULL
  AND recurring_end_date >= CURRENT_DATE
  AND recurring_end_date <= CURRENT_DATE + INTERVAL '2 weeks'
GROUP BY recurring_order_id, customer_name, recurring_end_date, recurring_current_week, recurring_total_weeks
ORDER BY recurring_end_date;

-- ═══════════════════════════════════════════════════════════
-- FINAL REPORT
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  total_recurring INTEGER;
  total_complete INTEGER;
  total_incomplete INTEGER;
  ending_soon INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_recurring
  FROM orders WHERE is_recurring = true;

  SELECT COUNT(*) INTO total_complete
  FROM orders
  WHERE is_recurring = true
    AND recurring_order_id IS NOT NULL
    AND recurring_start_date IS NOT NULL
    AND recurring_end_date IS NOT NULL
    AND recurring_total_weeks IS NOT NULL
    AND recurring_current_week IS NOT NULL;

  SELECT COUNT(*) INTO total_incomplete
  FROM orders
  WHERE is_recurring = true
    AND (
      recurring_order_id IS NULL OR
      recurring_start_date IS NULL OR
      recurring_end_date IS NULL OR
      recurring_total_weeks IS NULL OR
      recurring_current_week IS NULL
    );

  SELECT COUNT(DISTINCT recurring_order_id) INTO ending_soon
  FROM orders
  WHERE is_recurring = true
    AND recurring_end_date IS NOT NULL
    AND recurring_end_date >= CURRENT_DATE
    AND recurring_end_date <= CURRENT_DATE + INTERVAL '2 weeks';

  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════╗';
  RAISE NOTICE '║         VERIFIKAČNÝ REPORT                       ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Total recurring orders: %', total_recurring;
  RAISE NOTICE 'Complete (all fields): % ✅', total_complete;
  RAISE NOTICE 'Incomplete (missing data): % %', total_incomplete, CASE WHEN total_incomplete > 0 THEN '❌' ELSE '✅' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Orders ending in 2 weeks: %', ending_soon;
  RAISE NOTICE '';

  IF total_incomplete = 0 THEN
    RAISE NOTICE '✅ SUCCESS! All recurring orders have complete data.';
    RAISE NOTICE 'You can now use the extend functionality in the app.';
  ELSE
    RAISE NOTICE '⚠️ WARNING: Some orders are missing data.';
    RAISE NOTICE 'Review TEST 2 results above for details.';
  END IF;

  RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════
-- QUICK CHECK QUERY (pre rýchly check v app)
-- ═══════════════════════════════════════════════════════════

SELECT
  '=== QUICK CHECK QUERY ===' as info,
  'Copy this query to quickly check data in Supabase dashboard:' as hint;

SELECT
  customer_name,
  delivery_date,
  recurring_current_week || '/' || recurring_total_weeks as week_progress,
  recurring_start_date,
  recurring_end_date
FROM orders
WHERE is_recurring = true
ORDER BY customer_name, delivery_date
LIMIT 20;
