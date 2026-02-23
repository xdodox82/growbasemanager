/*
  MANUÁLNY UPDATE TEMPLATE - RECURRING ORDER DATA

  Použite tento template pre manuálne doplnenie údajov do recurring orders,
  ak automatická migrácia nefunguje správne pre niektoré objednávky.

  ⚠️ POSTUP:
  1. Najprv spusti SELECT query pre identifikovanie orders
  2. Skopíruj UPDATE template
  3. Vyplň správne hodnoty
  4. Spusti UPDATE pre každý týždeň zvlášť
*/

-- ═══════════════════════════════════════════════════════════
-- KROK 1: IDENTIFIKUJ ORDERS PRE UPDATE
-- ═══════════════════════════════════════════════════════════

-- Nájdi všetky recurring orders bez údajov
SELECT
  id,
  customer_id,
  customer_name,
  delivery_date,
  parent_order_id
FROM orders
WHERE is_recurring = true
  AND recurring_order_id IS NULL
ORDER BY customer_name, delivery_date;

-- ═══════════════════════════════════════════════════════════
-- KROK 2: ZISTI SKUPINY
-- ═══════════════════════════════════════════════════════════

-- Pre konkrétneho zákazníka
SELECT
  id,
  customer_name,
  delivery_date,
  parent_order_id
FROM orders
WHERE is_recurring = true
  AND customer_name = 'MENO_ZÁKAZNÍKA'  -- 👈 Zmeň na skutočné meno
ORDER BY delivery_date;

-- ═══════════════════════════════════════════════════════════
-- KROK 3: UPDATE TEMPLATE - CELÁ SKUPINA NARAZ
-- ═══════════════════════════════════════════════════════════

/*
  PRÍKLAD: Ak máš 4 objednávky pre zákazníka "Reštaurácia X"
  s delivery_date: 2026-01-06, 2026-01-13, 2026-01-20, 2026-01-27

  Spusti toto:
*/

DO $$
DECLARE
  master_id UUID := 'ID_PRVEJ_OBJEDNÁVKY';  -- 👈 ID prvej objednávky v sérii
  customer UUID := 'ID_ZÁKAZNÍKA';           -- 👈 customer_id
  week_num INTEGER := 1;
  order_record RECORD;
BEGIN
  -- Prejdi všetky orders pre tohto zákazníka v poradí
  FOR order_record IN (
    SELECT id, delivery_date
    FROM orders
    WHERE is_recurring = true
      AND customer_id = customer
      AND recurring_order_id IS NULL
    ORDER BY delivery_date
  ) LOOP

    UPDATE orders
    SET
      recurring_order_id = master_id,
      recurring_start_date = '2026-01-06',  -- 👈 Dátum prvej objednávky
      recurring_end_date = '2026-01-27',    -- 👈 Dátum poslednej objednávky
      recurring_total_weeks = 4,            -- 👈 Celkový počet týždňov
      recurring_current_week = week_num
    WHERE id = order_record.id;

    week_num := week_num + 1;

    RAISE NOTICE 'Updated order % (week %)', order_record.id, week_num - 1;
  END LOOP;

  RAISE NOTICE 'Group completed!';
END $$;

-- ═══════════════════════════════════════════════════════════
-- KROK 4: UPDATE TEMPLATE - PO JEDNEJ OBJEDNÁVKE
-- ═══════════════════════════════════════════════════════════

-- Týždeň 1
UPDATE orders
SET
  recurring_order_id = 'MASTER_ORDER_ID',    -- 👈 ID prvej objednávky
  recurring_start_date = '2026-01-06',       -- 👈 Dátum začiatku
  recurring_end_date = '2026-01-27',         -- 👈 Dátum konca
  recurring_total_weeks = 4,                 -- 👈 Počet týždňov
  recurring_current_week = 1                 -- 👈 Aktuálny týždeň (1, 2, 3...)
WHERE id = 'ORDER_ID_TYZDNA_1';             -- 👈 ID tejto konkrétnej objednávky

-- Týždeň 2
UPDATE orders
SET
  recurring_order_id = 'MASTER_ORDER_ID',
  recurring_start_date = '2026-01-06',
  recurring_end_date = '2026-01-27',
  recurring_total_weeks = 4,
  recurring_current_week = 2                 -- 👈 Zmeň na 2
WHERE id = 'ORDER_ID_TYZDNA_2';

-- Týždeň 3
UPDATE orders
SET
  recurring_order_id = 'MASTER_ORDER_ID',
  recurring_start_date = '2026-01-06',
  recurring_end_date = '2026-01-27',
  recurring_total_weeks = 4,
  recurring_current_week = 3                 -- 👈 Zmeň na 3
WHERE id = 'ORDER_ID_TYZDNA_3';

-- Týždeň 4
UPDATE orders
SET
  recurring_order_id = 'MASTER_ORDER_ID',
  recurring_start_date = '2026-01-06',
  recurring_end_date = '2026-01-27',
  recurring_total_weeks = 4,
  recurring_current_week = 4                 -- 👈 Zmeň na 4
WHERE id = 'ORDER_ID_TYZDNA_4';

-- ═══════════════════════════════════════════════════════════
-- KROK 5: OVER VÝSLEDKY
-- ═══════════════════════════════════════════════════════════

-- Pre konkrétneho zákazníka
SELECT
  customer_name,
  delivery_date,
  recurring_current_week || '/' || recurring_total_weeks as progress,
  recurring_start_date,
  recurring_end_date
FROM orders
WHERE customer_name = 'MENO_ZÁKAZNÍKA'  -- 👈 Zmeň
  AND is_recurring = true
ORDER BY delivery_date;

-- ═══════════════════════════════════════════════════════════
-- PRÍKLAD: REÁLNY USE CASE
-- ═══════════════════════════════════════════════════════════

/*
SCENÁR:
- Zákazník: "Fresh Market"
- 3 opakované objednávky
- Dátumy: 2026-02-03, 2026-02-10, 2026-02-17

POSTUP:
1. Nájdi ID prvej objednávky
*/

SELECT id, delivery_date
FROM orders
WHERE customer_name = 'Fresh Market'
  AND is_recurring = true
ORDER BY delivery_date;

-- Povedzme že prvá má ID: 'abc123-...'

-- 2. Update všetkých 3 objednávok:

UPDATE orders
SET
  recurring_order_id = 'abc123-...',  -- ID prvej
  recurring_start_date = '2026-02-03',
  recurring_end_date = '2026-02-17',
  recurring_total_weeks = 3,
  recurring_current_week = 1
WHERE customer_name = 'Fresh Market'
  AND is_recurring = true
  AND delivery_date = '2026-02-03';

UPDATE orders
SET
  recurring_order_id = 'abc123-...',
  recurring_start_date = '2026-02-03',
  recurring_end_date = '2026-02-17',
  recurring_total_weeks = 3,
  recurring_current_week = 2
WHERE customer_name = 'Fresh Market'
  AND is_recurring = true
  AND delivery_date = '2026-02-10';

UPDATE orders
SET
  recurring_order_id = 'abc123-...',
  recurring_start_date = '2026-02-03',
  recurring_end_date = '2026-02-17',
  recurring_total_weeks = 3,
  recurring_current_week = 3
WHERE customer_name = 'Fresh Market'
  AND is_recurring = true
  AND delivery_date = '2026-02-17';

-- 3. Over výsledok:

SELECT
  customer_name,
  delivery_date,
  recurring_current_week || '/' || recurring_total_weeks as week,
  recurring_start_date,
  recurring_end_date
FROM orders
WHERE customer_name = 'Fresh Market'
  AND is_recurring = true
ORDER BY delivery_date;

-- Očakávaný výsledok:
-- Fresh Market | 2026-02-03 | 1/3 | 2026-02-03 | 2026-02-17
-- Fresh Market | 2026-02-10 | 2/3 | 2026-02-03 | 2026-02-17
-- Fresh Market | 2026-02-17 | 3/3 | 2026-02-03 | 2026-02-17

-- ═══════════════════════════════════════════════════════════
-- HELPER: NÁJDI MASTER ID (prvá objednávka v skupine)
-- ═══════════════════════════════════════════════════════════

WITH first_orders AS (
  SELECT
    customer_id,
    customer_name,
    MIN(delivery_date) as first_date
  FROM orders
  WHERE is_recurring = true
  GROUP BY customer_id, customer_name
)
SELECT
  o.id as master_id,
  o.customer_name,
  o.delivery_date,
  'Use this ID as recurring_order_id for all orders in this group' as note
FROM orders o
JOIN first_orders f ON o.customer_id = f.customer_id AND o.delivery_date = f.first_date
WHERE o.is_recurring = true
ORDER BY o.customer_name;
