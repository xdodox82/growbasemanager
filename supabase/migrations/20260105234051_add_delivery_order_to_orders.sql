/*
  # Pridanie poradia rozvozu

  1. Zmeny
    - Pridanie stĺpca `delivery_order` do tabuľky `orders`
    - Typ: integer, nullable (pre spätovú kompatibilitu)
    - Slúži na určenie poradia doručenia objednávok na trase

  2. Poznámky
    - Poradie sa určuje pre každý deň rozvozu samostatne
    - Nižšie číslo = vyššia priorita (doručí sa skôr)
    - NULL hodnoty sa zobrazia na konci
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'delivery_order'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_order integer;
  END IF;
END $$;
