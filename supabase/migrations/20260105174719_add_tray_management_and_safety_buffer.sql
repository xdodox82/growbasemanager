/*
  # Správa tácok a bezpečnostné buffery

  ## Zmeny v tabuľke `crops`:
  1. Pridaný stĺpec `safety_buffer_percent`
     - Percentuálny buffer pre výpočet potrebného sadenia
     - Default: 10% (0.10)
  
  2. Pridaný stĺpec `tray_configs`
     - JSONB pole s konfiguráciou pre rôzne veľkosti tácok
     - Obsahuje seed_density a expected_yield pre každú veľkosť (S, M, L, XL)
     - Default konfigurácia pre všetky veľkosti

  ## Zmeny v tabuľke `planting_plans`:
  1. Pridaný stĺpec `tray_size`
     - Veľkosť tácky (S, M, L, XL)
     - Default: XL
  
  2. Pridaný stĺpec `is_test_batch`
     - Označuje testovacie šarže, ktoré sa nezapočítavajú do zásob
     - Default: false
  
  3. Status 'wasted' pre vyradené tácky
     - Status je text, takže stačí použiť hodnotu 'wasted'

  ## Dôležité poznámky:
  - XL je predvolená veľkosť tácky
  - Testovacia šarža sa nezapočítava do dostupných zásob
  - Vyradené tácky (wasted) sa nezapočítavajú do výnosu
  - Safety buffer automaticky navýši požadovaný počet tácok
*/

-- Pridať stĺpce do crops tabuľky
DO $$
BEGIN
  -- Safety buffer percent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crops' AND column_name = 'safety_buffer_percent'
  ) THEN
    ALTER TABLE crops ADD COLUMN safety_buffer_percent decimal DEFAULT 0.10;
  END IF;

  -- Tray configurations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crops' AND column_name = 'tray_configs'
  ) THEN
    ALTER TABLE crops ADD COLUMN tray_configs jsonb DEFAULT '{
      "XL": {"seed_density": 100, "expected_yield": 80},
      "L": {"seed_density": 80, "expected_yield": 65},
      "M": {"seed_density": 60, "expected_yield": 48},
      "S": {"seed_density": 40, "expected_yield": 32}
    }'::jsonb;
  END IF;
END $$;

-- Pridať stĺpce do planting_plans tabuľky
DO $$
BEGIN
  -- Tray size
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planting_plans' AND column_name = 'tray_size'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN tray_size text DEFAULT 'XL';
  END IF;

  -- Is test batch
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planting_plans' AND column_name = 'is_test_batch'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN is_test_batch boolean DEFAULT false;
  END IF;
END $$;

-- Vytvoriť indexy pre lepší výkon
CREATE INDEX IF NOT EXISTS idx_planting_plans_tray_size ON planting_plans(tray_size);
CREATE INDEX IF NOT EXISTS idx_planting_plans_is_test_batch ON planting_plans(is_test_batch);
CREATE INDEX IF NOT EXISTS idx_planting_plans_status ON planting_plans(status);

-- Aktualizovať existujúce crops aby mali správnu konfiguráciu
UPDATE crops 
SET tray_configs = jsonb_build_object(
  'XL', jsonb_build_object('seed_density', COALESCE(seed_density, 100), 'expected_yield', COALESCE(expected_yield, 80)),
  'L', jsonb_build_object('seed_density', COALESCE(seed_density * 0.8, 80), 'expected_yield', COALESCE(expected_yield * 0.8, 65)),
  'M', jsonb_build_object('seed_density', COALESCE(seed_density * 0.6, 60), 'expected_yield', COALESCE(expected_yield * 0.6, 48)),
  'S', jsonb_build_object('seed_density', COALESCE(seed_density * 0.4, 40), 'expected_yield', COALESCE(expected_yield * 0.4, 32))
)
WHERE tray_configs IS NULL OR tray_configs::text = '{}'::text;