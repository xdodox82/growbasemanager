/*
  # Pridať stĺpce customer_name a crop_name do tabuľky orders

  1. Zmeny v tabuľke orders
    - Pridať stĺpec `customer_name` (text, nullable) - pre priame uloženie mena zákazníka
    - Pridať stĺpec `crop_name` (text, nullable) - pre priame uloženie mena plodiny/mixu
  
  2. Dôvod
    - Aby aplikácia mohla zobrazovať mená aj keď sa zmenia alebo odstránia prepojené záznamy
    - Aby sa predišlo chybám 404 pri zobrazení objednávok s neplatnými ID
    
  3. Naplnenie existujúcich záznamov
    - Pre existujúce objednávky sa automaticky doplnia mená zo súvisiacich tabuliek
*/

-- Pridať stĺpce customer_name a crop_name do tabuľky orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS crop_name TEXT;

-- Naplniť existujúce záznamy menami zákazníkov
UPDATE orders o
SET customer_name = COALESCE(c.company_name, c.name)
FROM customers c
WHERE o.customer_id = c.id
  AND o.customer_name IS NULL;

-- Naplniť existujúce záznamy menami plodín
UPDATE orders o
SET crop_name = cr.name
FROM crops cr
WHERE o.crop_id = cr.id
  AND o.crop_name IS NULL;

-- Naplniť existujúce záznamy menami mixov
UPDATE orders o
SET crop_name = b.name || ' (Mix)'
FROM blends b
WHERE o.blend_id = b.id
  AND o.crop_name IS NULL;

-- Vytvoriť index pre rýchlejšie vyhľadávanie podľa mena zákazníka
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);

-- Vytvoriť index pre rýchlejšie vyhľadávanie podľa mena plodiny
CREATE INDEX IF NOT EXISTS idx_orders_crop_name ON orders(crop_name);
