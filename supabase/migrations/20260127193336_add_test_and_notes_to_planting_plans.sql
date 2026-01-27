/*
  # Pridať test výsev a poznámku k plánom sadenia

  1. Zmeny v tabuľke planting_plans
    - Pridať `is_test` boolean pole - označuje testovací výsev
    - Pridať `notes` text pole - voliteľná poznámka k výsevu
  
  2. Polia
    - `is_test` - boolean, default false, označuje či je výsev test osiva/substrátu
    - `notes` - text, nullable, poznámka k výsevu (napr. šarža semien, info o teste)
*/

-- Pridať is_test pole
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'is_test'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN is_test boolean DEFAULT false;
  END IF;
END $$;

-- Pridať notes pole
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planting_plans' AND column_name = 'notes'
  ) THEN
    ALTER TABLE planting_plans ADD COLUMN notes text;
  END IF;
END $$;