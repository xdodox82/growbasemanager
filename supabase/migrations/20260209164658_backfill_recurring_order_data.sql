/*
  # Backfill Recurring Order Tracking Data

  1. Purpose
    - Automaticky doplní recurring_* údaje do existujúcich opakovaných objednávok
    - Zoskupí orders podľa customer_id a parent_order_id
    - Vypočíta start_date, end_date, total_weeks, current_week

  2. Strategy
    - Použije parent_order_id ako indikátor skupiny (ak existuje)
    - Inak zoskupí podľa customer_id a časového intervalu
    - Pre každú skupinu:
      * recurring_order_id = ID prvej objednávky v skupine
      * recurring_start_date = delivery_date prvej objednávky
      * recurring_end_date = delivery_date poslednej objednávky
      * recurring_total_weeks = počet objednávok v skupine
      * recurring_current_week = poradie v skupine (1, 2, 3...)

  3. Safety
    - Aktualizuje LEN orders kde is_recurring = true
    - Aktualizuje LEN orders kde recurring_order_id IS NULL (ešte nemajú údaje)
    - Nevymaže žiadne existujúce údaje
*/

-- ═══════════════════════════════════════════════════════════
-- STRATÉGIA 1: Skupiny podľa parent_order_id
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  rec RECORD;
  group_id UUID;
  week_counter INTEGER;
  order_id UUID;
BEGIN
  RAISE NOTICE '=== STARTING BACKFILL OF RECURRING ORDER DATA ===';
  
  -- Prejdi všetky skupiny s parent_order_id
  FOR rec IN (
    SELECT 
      COALESCE(parent_order_id, id) as group_master_id,
      customer_id,
      customer_name,
      ARRAY_AGG(id ORDER BY delivery_date) as order_ids,
      MIN(delivery_date) as start_date,
      MAX(delivery_date) as end_date,
      COUNT(*) as total_count
    FROM orders
    WHERE is_recurring = true
      AND recurring_order_id IS NULL
      AND parent_order_id IS NOT NULL  -- Najprv len tie s parent_order_id
    GROUP BY COALESCE(parent_order_id, id), customer_id, customer_name
    HAVING COUNT(*) >= 1
    ORDER BY customer_name, start_date
  ) LOOP
    
    -- Použi prvú objednávku ako master ID pre skupinu
    group_id := rec.order_ids[1];
    
    RAISE NOTICE 'Processing group for customer "%" (parent_order_id): % orders, dates % to %',
      rec.customer_name, rec.total_count, rec.start_date, rec.end_date;
    
    -- Update každej objednávky v skupine
    week_counter := 1;
    FOREACH order_id IN ARRAY rec.order_ids LOOP
      UPDATE orders
      SET 
        recurring_order_id = group_id,
        recurring_start_date = rec.start_date,
        recurring_end_date = rec.end_date,
        recurring_total_weeks = rec.total_count,
        recurring_current_week = week_counter
      WHERE id = order_id;
      
      week_counter := week_counter + 1;
    END LOOP;
    
  END LOOP;

  RAISE NOTICE '=== STRATEGY 1 (parent_order_id) COMPLETED ===';
END $$;

-- ═══════════════════════════════════════════════════════════
-- STRATÉGIA 2: Skupiny podľa customer_id (bez parent_order_id)
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  rec RECORD;
  group_id UUID;
  week_counter INTEGER;
  order_id UUID;
BEGIN
  RAISE NOTICE '=== STARTING STRATEGY 2: GROUP BY CUSTOMER ===';
  
  -- Prejdi všetky skupiny podľa customer_id (orders bez parent_order_id)
  FOR rec IN (
    SELECT 
      customer_id,
      customer_name,
      ARRAY_AGG(id ORDER BY delivery_date) as order_ids,
      MIN(delivery_date) as start_date,
      MAX(delivery_date) as end_date,
      COUNT(*) as total_count
    FROM orders
    WHERE is_recurring = true
      AND recurring_order_id IS NULL
      AND parent_order_id IS NULL  -- LEN orders bez parent_order_id
    GROUP BY customer_id, customer_name
    HAVING COUNT(*) >= 1
    ORDER BY customer_name, start_date
  ) LOOP
    
    -- Použi prvú objednávku ako master ID
    group_id := rec.order_ids[1];
    
    RAISE NOTICE 'Processing group for customer "%" (by customer_id): % orders, dates % to %',
      rec.customer_name, rec.total_count, rec.start_date, rec.end_date;
    
    -- Update každej objednávky v skupine
    week_counter := 1;
    FOREACH order_id IN ARRAY rec.order_ids LOOP
      UPDATE orders
      SET 
        recurring_order_id = group_id,
        recurring_start_date = rec.start_date,
        recurring_end_date = rec.end_date,
        recurring_total_weeks = rec.total_count,
        recurring_current_week = week_counter
      WHERE id = order_id;
      
      week_counter := week_counter + 1;
    END LOOP;
    
  END LOOP;

  RAISE NOTICE '=== STRATEGY 2 (customer_id) COMPLETED ===';
END $$;

-- ═══════════════════════════════════════════════════════════
-- FINAL REPORT
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  total_recurring INTEGER;
  total_updated INTEGER;
  total_remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_recurring FROM orders WHERE is_recurring = true;
  SELECT COUNT(*) INTO total_updated FROM orders WHERE is_recurring = true AND recurring_order_id IS NOT NULL;
  SELECT COUNT(*) INTO total_remaining FROM orders WHERE is_recurring = true AND recurring_order_id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== BACKFILL COMPLETE ===';
  RAISE NOTICE 'Total recurring orders: %', total_recurring;
  RAISE NOTICE 'Successfully updated: %', total_updated;
  RAISE NOTICE 'Remaining (needs manual review): %', total_remaining;
  RAISE NOTICE '';
  
  IF total_remaining > 0 THEN
    RAISE NOTICE 'Some orders still need manual review. Run diagnose-recurring-orders.sql to see details.';
  ELSE
    RAISE NOTICE 'All recurring orders have been successfully backfilled!';
  END IF;
END $$;
