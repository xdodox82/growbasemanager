/*
  DIAGNOSTIKA - EXISTING RECURRING ORDERS

  Tento script skontroluje stav existujúcich opakovaných objednávok
  a identifikuje ktoré potrebujú doplniť údaje.
*/

-- ═══════════════════════════════════════════════════════════
-- KROK 1: ZÁKLADNÝ PREHĽAD
-- ═══════════════════════════════════════════════════════════

SELECT
  '=== ZÁKLADNÝ PREHĽAD ===' as info,
  COUNT(*) FILTER (WHERE is_recurring = true) as "Total Recurring Orders",
  COUNT(*) FILTER (WHERE is_recurring = true AND recurring_order_id IS NOT NULL) as "With recurring_order_id",
  COUNT(*) FILTER (WHERE is_recurring = true AND recurring_order_id IS NULL) as "WITHOUT recurring_order_id (NEEDS UPDATE)",
  COUNT(*) FILTER (WHERE is_recurring = true AND recurring_end_date IS NOT NULL) as "With end_date",
  COUNT(*) FILTER (WHERE is_recurring = true AND recurring_end_date IS NULL) as "WITHOUT end_date"
FROM orders;

-- ═══════════════════════════════════════════════════════════
-- KROK 2: DETAIL VŠETKÝCH RECURRING ORDERS
-- ═══════════════════════════════════════════════════════════

SELECT
  '=== VŠETKY RECURRING ORDERS ===' as section,
  id,
  customer_name,
  delivery_date,
  is_recurring,
  recurring_order_id,
  recurring_start_date,
  recurring_end_date,
  recurring_current_week,
  recurring_total_weeks,
  parent_order_id
FROM orders
WHERE is_recurring = true
ORDER BY customer_name, delivery_date;

-- ═══════════════════════════════════════════════════════════
-- KROK 3: IDENTIFIKUJ SKUPINY (pre orders bez recurring_order_id)
-- ═══════════════════════════════════════════════════════════

WITH recurring_groups AS (
  SELECT
    customer_id,
    customer_name,
    MIN(delivery_date) as first_delivery,
    MAX(delivery_date) as last_delivery,
    COUNT(*) as total_orders,
    ARRAY_AGG(id ORDER BY delivery_date) as order_ids,
    ARRAY_AGG(delivery_date ORDER BY delivery_date) as delivery_dates
  FROM orders
  WHERE is_recurring = true
    AND recurring_order_id IS NULL  -- ešte nemajú vyplnené
  GROUP BY customer_id, customer_name
  HAVING COUNT(*) >= 1  -- aj jednu objednávku ukáž
)
SELECT
  '=== SKUPINY NA UPDATE ===' as section,
  customer_name as "Zákazník",
  first_delivery as "Prvá objednávka",
  last_delivery as "Posledná objednávka",
  total_orders as "Počet objednávok",
  ROUND(EXTRACT(EPOCH FROM (last_delivery - first_delivery)) / (7 * 24 * 60 * 60)) as "Týždne trvania"
FROM recurring_groups
ORDER BY customer_name;

-- ═══════════════════════════════════════════════════════════
-- KROK 4: DETAIL SKUPÍN S ORDER IDS
-- ═══════════════════════════════════════════════════════════

WITH recurring_groups AS (
  SELECT
    customer_id,
    customer_name,
    MIN(delivery_date) as first_delivery,
    MAX(delivery_date) as last_delivery,
    COUNT(*) as total_orders,
    ARRAY_AGG(id ORDER BY delivery_date) as order_ids
  FROM orders
  WHERE is_recurring = true
    AND recurring_order_id IS NULL
  GROUP BY customer_id, customer_name
)
SELECT
  '=== SKUPINY S ORDER IDS ===' as section,
  customer_name,
  total_orders,
  UNNEST(order_ids) as order_id
FROM recurring_groups
ORDER BY customer_name;

-- ═══════════════════════════════════════════════════════════
-- KROK 5: KONTROLA PARENT_ORDER_ID
-- ═══════════════════════════════════════════════════════════

SELECT
  '=== PARENT ORDER ID ANALÝZA ===' as section,
  COUNT(*) FILTER (WHERE parent_order_id IS NOT NULL) as "Orders s parent_order_id",
  COUNT(DISTINCT parent_order_id) FILTER (WHERE parent_order_id IS NOT NULL) as "Počet parent groups",
  COUNT(*) FILTER (WHERE is_recurring = true AND parent_order_id IS NOT NULL) as "Recurring s parent_order_id"
FROM orders;

-- ═══════════════════════════════════════════════════════════
-- VÝSLEDOK
-- ═══════════════════════════════════════════════════════════

SELECT
  '=== SUMMARY ===' as info,
  'Spusti tento script v Supabase SQL Editor' as "Krok 1",
  'Skontroluj kolko orders potrebuje update' as "Krok 2",
  'Potom spusti migráciu 20260209163XXX_backfill_recurring_order_data.sql' as "Krok 3";
