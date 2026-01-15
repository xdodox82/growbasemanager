/*
  # Pridanie DPH polí do zásobových tabuliek

  1. Zmeny v tabuľkách
    - `seeds`: pridanie `price_includes_vat` (boolean) a `vat_rate` (numeric)
    - `packagings`: pridanie `price_includes_vat` (boolean) a `vat_rate` (numeric)

  2. Poznámky
    - Defaultná hodnota pre price_includes_vat je true (cena obsahuje DPH)
    - Defaultná hodnota pre vat_rate je 20 (20% DPH)
    - Umožní presný prepočet nákladov s/bez DPH
*/

-- Pridanie DPH polí do seeds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seeds' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE seeds ADD COLUMN price_includes_vat boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seeds' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE seeds ADD COLUMN vat_rate numeric DEFAULT 20;
  END IF;
END $$;

-- Pridanie DPH polí do packagings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packagings' AND column_name = 'price_includes_vat'
  ) THEN
    ALTER TABLE packagings ADD COLUMN price_includes_vat boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packagings' AND column_name = 'vat_rate'
  ) THEN
    ALTER TABLE packagings ADD COLUMN vat_rate numeric DEFAULT 20;
  END IF;
END $$;