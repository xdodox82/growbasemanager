/*
  # Pridanie cenových polí do zásobových tabuliek

  1. Zmeny v tabuľkách
    - `seeds`: pridanie `unit_price_per_kg` (Cena za 1 kg semien)
    - `packagings`: pridanie `price_per_piece` (Cena za 1 kus obalu)
    - `consumable_inventory`: pridanie `unit_cost` (Náklady na jednotku substrátu)
    - `labels`: pridanie `unit_cost` (Náklady na jednotku etikiet)
    - `substrates`: pridanie `unit_cost` (Náklady na jednotku substrátu)

  2. Poznámky
    - Všetky cenové polia sú typu numeric pre presnosť
    - Defaultná hodnota je 0 pre jednoduchšiu integráciu
    - Cenové polia umožnia kalkuláciu nákladov na výsev
*/

-- Pridanie ceny za kg do seeds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seeds' AND column_name = 'unit_price_per_kg'
  ) THEN
    ALTER TABLE seeds ADD COLUMN unit_price_per_kg numeric DEFAULT 0;
  END IF;
END $$;

-- Pridanie ceny za kus do packagings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packagings' AND column_name = 'price_per_piece'
  ) THEN
    ALTER TABLE packagings ADD COLUMN price_per_piece numeric DEFAULT 0;
  END IF;
END $$;

-- Pridanie unit_cost do consumable_inventory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consumable_inventory' AND column_name = 'unit_cost'
  ) THEN
    ALTER TABLE consumable_inventory ADD COLUMN unit_cost numeric DEFAULT 0;
  END IF;
END $$;

-- Pridanie unit_cost do labels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'labels' AND column_name = 'unit_cost'
  ) THEN
    ALTER TABLE labels ADD COLUMN unit_cost numeric DEFAULT 0;
  END IF;
END $$;

-- Pridanie unit_cost do substrates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'substrates' AND column_name = 'unit_cost'
  ) THEN
    ALTER TABLE substrates ADD COLUMN unit_cost numeric DEFAULT 0;
  END IF;
END $$;