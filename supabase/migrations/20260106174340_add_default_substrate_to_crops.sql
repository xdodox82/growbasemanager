/*
  # Pridanie predvoleného substrátu do plodín

  1. Zmeny
    - Pridanie stĺpca `default_substrate_type` do tabuľky `crops`
    - Pridanie stĺpca `default_substrate_note` do tabuľky `crops`
    
  2. Popis
    - `default_substrate_type`: Typ substrátu (peat, coco, mixed, other)
    - `default_substrate_note`: Poznámka k substrátu (voliteľné, hlavne pre typ "other")
    
  3. Poznámky
    - Predvolený typ je 'mixed' (Miešaný)
    - Pri vytvorení plánu sadenia sa tieto hodnoty automaticky použijú
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crops' AND column_name = 'default_substrate_type'
  ) THEN
    ALTER TABLE crops ADD COLUMN default_substrate_type TEXT DEFAULT 'mixed';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crops' AND column_name = 'default_substrate_note'
  ) THEN
    ALTER TABLE crops ADD COLUMN default_substrate_note TEXT;
  END IF;
END $$;