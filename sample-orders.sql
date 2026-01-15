-- Vzorové objednávky pre testovanie
-- Objednávka 1: Reštaurácia - Rukola 50g, 5 kusov
INSERT INTO orders (
  customer_id,
  crop_id,
  quantity,
  unit,
  delivery_form,
  packaging_size,
  status,
  delivery_date,
  has_label,
  notes,
  user_id
) VALUES (
  '6990b6e3-7303-42ef-af81-21b5bc9c5a61',  -- Reštaurácia (gastro)
  'be602410-3225-4f88-8797-b49b201b154d',  -- Rukola
  5,
  'ks',
  'cut',
  '50g',
  'pending',
  '2026-01-16',
  true,
  'Dodať vo štvrtok dopoludnia',
  '538cadcd-150b-45e2-8b5b-8576884f8049'
);

-- Objednávka 2: Domáci zákazník - Hrach siaty Affyla 100g, 3 kusy
INSERT INTO orders (
  customer_id,
  crop_id,
  quantity,
  unit,
  delivery_form,
  packaging_size,
  status,
  delivery_date,
  has_label,
  notes,
  user_id
) VALUES (
  '617b48d5-4b15-4c9f-84d9-35118971e9d3',  -- Domáci zákazník (home)
  '8755eab2-a358-42cc-a4c8-db7e41c9c255',  -- Hrach siaty Affyla
  3,
  'ks',
  'cut',
  '100g',
  'confirmed',
  '2026-01-14',
  true,
  'Zavolať pred doručením',
  '538cadcd-150b-45e2-8b5b-8576884f8049'
);

-- Objednávka 3: Veľkoobchod - Šalátový mix 100g, 10 kusov
INSERT INTO orders (
  customer_id,
  blend_id,
  quantity,
  unit,
  delivery_form,
  packaging_size,
  status,
  delivery_date,
  has_label,
  notes,
  user_id
) VALUES (
  'd21455ce-2db0-458c-ac44-370eea9a0d4b',  -- Veľkoobchod (wholesale)
  'afbf4c73-f5ae-44ab-9c64-078fc2b3f5da',  -- Šalátový mix
  10,
  'ks',
  'cut',
  '100g',
  'ready',
  '2026-01-15',
  true,
  'Veľká objednávka - pripraviť večer pred',
  '538cadcd-150b-45e2-8b5b-8576884f8049'
);

-- Objednávka 4: Reštaurácia - Slnečnica 60g, 8 kusov
INSERT INTO orders (
  customer_id,
  crop_id,
  quantity,
  unit,
  delivery_form,
  packaging_size,
  status,
  delivery_date,
  has_label,
  notes,
  user_id
) VALUES (
  '6990b6e3-7303-42ef-af81-21b5bc9c5a61',  -- Reštaurácia (gastro)
  '61c55b0a-d7aa-4d50-b517-2115b37ef3af',  -- Slnečnica
  8,
  'ks',
  'cut',
  '60g',
  'preparing',
  '2026-01-17',
  true,
  'Stála objednávka každý piatok',
  '538cadcd-150b-45e2-8b5b-8576884f8049'
);
