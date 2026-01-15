/*
  # Pridanie archívu spotrebovaných semien

  1. Zmeny
    - Pridanie stĺpca `finished_date` do tabuľky `seeds`
    - Typ: date, nullable
    - Slúži na označenie dátumu ukončenia spotreby semien

  2. Poznámky
    - Ak je vyplnený tento dátum, semená sa považujú za spotrebované
    - Umožňuje archivovať semená a udržiavať históriu
    - NULL = aktuálne zásoby, DATE = spotrebované (archív)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seeds' AND column_name = 'finished_date'
  ) THEN
    ALTER TABLE seeds ADD COLUMN finished_date date;
  END IF;
END $$;
