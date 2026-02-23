-- Vzorové objednávky pre tabuľku orders
-- Obsahuje rôznych zákazníkov, plodiny, stavy a dátumy

INSERT INTO orders (
  customer_name,
  crop_name,
  quantity,
  unit,
  status,
  delivery_date,
  order_date,
  delivery_form,
  packaging_size,
  has_label,
  total_price,
  notes,
  is_recurring,
  recurrence_pattern,
  charge_delivery,
  delivery_price
) VALUES
-- Január 2026
('BILLA Slovakia', 'Rukola', 500, 'g', 'delivered', '2026-01-05', '2026-01-03', 'cut', '100g', true, 47.50, 'Ranná dodávka, centrálny sklad', false, null, true, 5.00),
('COOP Jednota', 'Baby špenát', 800, 'g', 'delivered', '2026-01-05', '2026-01-02', 'cut', '150g', true, 84.00, 'Pobočka Bratislava', false, null, true, 7.50),
('Kaufland Slovakia', 'Baby Leaf Mix (Mix)', 1200, 'g', 'delivered', '2026-01-06', '2026-01-03', 'cut', '100g', true, 138.00, 'Extra kvalita, rýchla dodávka', false, null, true, 8.00),
('Reštaurácia Modrá Hviezda', 'Mangold', 300, 'g', 'delivered', '2026-01-06', '2026-01-04', 'cut', '200g', false, 27.00, 'Dodať do kuchyne', false, null, true, 3.00),
('Tesco Stores SR', 'Mizuna', 600, 'g', 'delivered', '2026-01-07', '2026-01-04', 'cut', '100g', true, 69.00, 'Všetky pobočky v BA', false, null, true, 6.00),

-- Súčasné objednávky (v príprave a potvrdené)
('BILLA Slovakia', 'Rukola', 600, 'g', 'preparing', '2026-01-13', '2026-01-10', 'cut', '100g', true, 57.00, 'Pravidelná týždenná objednávka', true, 'weekly', true, 5.00),
('Kaufland Slovakia', 'Baby Leaf Mix (Mix)', 1500, 'g', 'preparing', '2026-01-13', '2026-01-10', 'cut', '100g', true, 172.50, 'Zvýšené množstvo pre akciu', false, null, true, 8.00),
('COOP Jednota', 'Baby špenát', 900, 'g', 'confirmed', '2026-01-14', '2026-01-11', 'cut', '150g', true, 94.50, 'Pobočka Trnava', true, 'weekly', true, 7.50),
('Lidl Slovenská republika', 'Kel kučeravý', 400, 'g', 'confirmed', '2026-01-14', '2026-01-11', 'whole', '200g', true, 44.00, 'Nová pobočka Košice', false, null, true, 6.50),
('Reštaurácia Modrá Hviezda', 'Asian Mix (Mix)', 350, 'g', 'ready', '2026-01-14', '2026-01-12', 'cut', '150g', false, 35.00, 'Špeciálne menu víkend', false, null, true, 3.00),

-- Nadchádzajúce objednávky
('Tesco Stores SR', 'Rukola', 700, 'g', 'confirmed', '2026-01-15', '2026-01-12', 'cut', '100g', true, 73.50, 'Express Store formát', true, 'weekly', true, 6.00),
('BILLA Slovakia', 'Baby špenát', 800, 'g', 'pending', '2026-01-16', '2026-01-13', 'cut', '150g', true, 84.00, 'Čaká sa na potvrdenie', false, null, true, 5.00),
('Metro Cash & Carry', 'Mangold dúhový', 1000, 'g', 'confirmed', '2026-01-16', '2026-01-13', 'whole', '250g', true, 95.00, 'Pre veľkoodber', false, null, true, 12.00),
('Kaufland Slovakia', 'Kel kučeravý', 500, 'g', 'confirmed', '2026-01-17', '2026-01-14', 'cut', '200g', true, 55.00, 'Akcia v letáku', false, null, true, 8.00),
('Fresh Market Bratislava', 'Spicy Mix (Mix)', 400, 'g', 'pending', '2026-01-17', '2026-01-14', 'cut', '100g', true, 46.00, 'Nový zákazník', false, null, true, 4.00),

-- Týždenné opakované objednávky
('COOP Jednota', 'Rukola', 600, 'g', 'confirmed', '2026-01-20', '2026-01-17', 'cut', '100g', true, 57.00, 'Pravidelná dodávka pondelok', true, 'weekly', true, 7.50),
('Lidl Slovenská republika', 'Baby špenát', 850, 'g', 'confirmed', '2026-01-20', '2026-01-17', 'cut', '150g', true, 89.25, 'Všetky pobočky ZA', true, 'weekly', true, 6.50),
('Tesco Stores SR', 'Baby Leaf Mix (Mix)', 1100, 'g', 'confirmed', '2026-01-21', '2026-01-18', 'cut', '100g', true, 126.50, 'Utorková dodávka', true, 'weekly', true, 6.00),
('BILLA Slovakia', 'Asian Mix (Mix)', 750, 'g', 'confirmed', '2026-01-21', '2026-01-18', 'cut', '150g', true, 78.75, 'Premium mix', true, 'weekly', true, 5.00),
('Reštaurácia La Terrazza', 'Rukola', 250, 'g', 'pending', '2026-01-22', '2026-01-19', 'whole', '100g', false, 23.75, 'Taliansky reštaurácia', false, null, true, 3.50),

-- Špeciálne objednávky a mixy
('Hotel Hradná Brána', 'Spicy Mix (Mix)', 600, 'g', 'confirmed', '2026-01-22', '2026-01-19', 'cut', '100g', true, 69.00, 'Pre hotelové raňajky', false, null, true, 5.50),
('Metro Cash & Carry', 'Kel kučeravý', 1200, 'g', 'confirmed', '2026-01-23', '2026-01-20', 'whole', '200g', true, 132.00, 'Veľkoodber pre reštaurácie', false, null, true, 12.00),
('Kaufland Slovakia', 'Mangold', 450, 'g', 'pending', '2026-01-23', '2026-01-20', 'cut', '200g', true, 42.75, 'Testovacia objednávka', false, null, true, 8.00),
('Fresh Market Bratislava', 'Baby špenát', 550, 'g', 'pending', '2026-01-24', '2026-01-21', 'cut', '150g', true, 57.75, 'Bio značka preferovaná', false, null, true, 4.00),
('COOP Jednota', 'Asian Mix (Mix)', 700, 'g', 'confirmed', '2026-01-24', '2026-01-21', 'cut', '100g', true, 73.50, 'Piatkové doručenie', true, 'weekly', true, 7.50),

-- Februárové objednávky
('BILLA Slovakia', 'Rukola', 650, 'g', 'pending', '2026-01-27', '2026-01-24', 'cut', '100g', true, 61.75, 'Začiatok mesiaca', false, null, true, 5.00),
('Tesco Stores SR', 'Baby Leaf Mix (Mix)', 1300, 'g', 'pending', '2026-01-27', '2026-01-24', 'cut', '100g', true, 149.50, 'Veľká objednávka', false, null, true, 6.00),
('Lidl Slovenská republika', 'Mizuna', 500, 'g', 'pending', '2026-01-28', '2026-01-25', 'cut', '100g', true, 57.50, 'Nový sortiment', false, null, true, 6.50),
('Reštaurácia Modrá Hviezda', 'Spicy Mix (Mix)', 300, 'g', 'pending', '2026-01-28', '2026-01-25', 'cut', '150g', false, 30.00, 'Špeciálne menu', false, null, true, 3.00),
('Metro Cash & Carry', 'Baby špenát', 1500, 'g', 'pending', '2026-01-29', '2026-01-26', 'cut', '150g', true, 157.50, 'Mesačná objednávka', false, null, true, 12.00),

-- Rôzne typy balenia a formy
('Hotel Hradná Brána', 'Baby Leaf Mix (Mix)', 800, 'g', 'pending', '2026-01-29', '2026-01-26', 'whole', '100g', true, 92.00, 'Celé listy pre dekoráciu', false, null, true, 5.50),
('Fresh Market Bratislava', 'Mangold dúhový', 350, 'g', 'pending', '2026-01-30', '2026-01-27', 'cut', '200g', true, 33.25, 'Farebný mix', false, null, true, 4.00),
('Kaufland Slovakia', 'Rukola', 900, 'g', 'pending', '2026-01-30', '2026-01-27', 'cut', '100g', true, 85.50, 'Akciová cena', false, null, true, 8.00),
('COOP Jednota', 'Kel kučeravý', 600, 'g', 'pending', '2026-01-31', '2026-01-28', 'whole', '200g', true, 66.00, 'Bio kvalita', false, null, true, 7.50),
('Reštaurácia La Terrazza', 'Asian Mix (Mix)', 280, 'g', 'pending', '2026-01-31', '2026-01-28', 'cut', '100g', false, 28.00, 'Ázijské jedlá', false, null, true, 3.50),

-- Zrušené a staré objednávky
('BILLA Slovakia', 'Baby špenát', 700, 'g', 'cancelled', '2026-01-08', '2026-01-05', 'cut', '150g', true, 73.50, 'Zrušené zákazníkom', false, null, false, 0),
('Tesco Stores SR', 'Mangold', 400, 'g', 'cancelled', '2026-01-09', '2026-01-06', 'cut', '200g', true, 38.00, 'Technický problém', false, null, false, 0),
('Lidl Slovenská republika', 'Rukola', 550, 'g', 'delivered', '2026-01-10', '2026-01-07', 'cut', '100g', true, 52.25, 'Úspešne doručené', false, null, true, 6.50),
('Metro Cash & Carry', 'Baby Leaf Mix (Mix)', 1400, 'g', 'delivered', '2026-01-10', '2026-01-07', 'cut', '100g', true, 161.00, 'Veľká objednávka splnená', false, null, true, 12.00),
('Kaufland Slovakia', 'Spicy Mix (Mix)', 750, 'g', 'delivered', '2026-01-11', '2026-01-08', 'cut', '100g', true, 78.75, 'Pravidelný zákazník', false, null, true, 8.00),

-- Ďalšie opakované objednávky
('BILLA Slovakia', 'Rukola', 600, 'g', 'pending', '2026-02-03', '2026-01-31', 'cut', '100g', true, 57.00, 'Týždenná dodávka', true, 'weekly', true, 5.00),
('COOP Jednota', 'Baby špenát', 850, 'g', 'pending', '2026-02-03', '2026-01-31', 'cut', '150g', true, 89.25, 'Pravidelná objednávka', true, 'weekly', true, 7.50),
('Kaufland Slovakia', 'Baby Leaf Mix (Mix)', 1250, 'g', 'pending', '2026-02-04', '2026-02-01', 'cut', '100g', true, 143.75, 'Streda dodávka', true, 'weekly', true, 8.00),
('Tesco Stores SR', 'Asian Mix (Mix)', 700, 'g', 'pending', '2026-02-04', '2026-02-01', 'cut', '150g', true, 73.50, 'Nová pravidelná', true, 'weekly', true, 6.00),
('Lidl Slovenská republika', 'Kel kučeravý', 550, 'g', 'pending', '2026-02-05', '2026-02-02', 'whole', '200g', true, 60.50, 'Bio sortiment', false, null, true, 6.50),

-- Hotelové a reštauračné objednávky
('Hotel Hradná Brána', 'Baby Leaf Mix (Mix)', 450, 'g', 'pending', '2026-02-05', '2026-02-02', 'whole', '100g', true, 51.75, 'Raňajkový bufet', false, null, true, 5.50),
('Reštaurácia Modrá Hviezda', 'Rukola', 320, 'g', 'pending', '2026-02-06', '2026-02-03', 'cut', '100g', false, 30.40, 'Šalátová ponuka', false, null, true, 3.00),
('Reštaurácia La Terrazza', 'Spicy Mix (Mix)', 280, 'g', 'pending', '2026-02-06', '2026-02-03', 'cut', '100g', false, 28.00, 'Pizza topping', false, null, true, 3.50),
('Metro Cash & Carry', 'Mangold dúhový', 1100, 'g', 'pending', '2026-02-07', '2026-02-04', 'whole', '250g', true, 104.50, 'Veľkoobchodná cena', false, null, true, 12.00),
('Fresh Market Bratislava', 'Baby špenát', 600, 'g', 'pending', '2026-02-07', '2026-02-04', 'cut', '150g', true, 63.00, 'Premium kvalita', false, null, true, 4.00);
