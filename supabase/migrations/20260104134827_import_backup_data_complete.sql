/*
  # Import Complete Backup Data
  
  1. Purpose
    - Import ALL backup data including the missing Ján Zeman customer
    - Set user_id for all records
  
  2. Changes
    - Insert 6 customers (including Ján Zeman)
    - Insert 4 blends
    - Insert 1 seed, packaging, substrate
    - Insert 21 orders
    - Insert 16 planting_plans
  
  3. Security
    - Sets user_id for all inserted records
*/

DO $$ 
DECLARE
  v_user_id UUID := '538cadcd-150b-45e2-8b5b-8576884f8049';
BEGIN
  -- CUSTOMERS (všetkých 6 vrátane Jána Zemana)
  INSERT INTO customers (id, name, email, phone, address, delivery_notes, delivery_day_ids, created_at, updated_at, delivery_route_id, customer_type, company_name, contact_name, ico, dic, ic_dph, bank_account, user_id) VALUES 
  ('6c44045c-1bd8-4b7e-bea8-8e8b84d49924', 'Ján Zeman', NULL, NULL, 'Kravany', NULL, '{}', '2025-12-28T00:19:54.172801+00:00', '2025-12-28T11:08:00.503168+00:00', NULL, 'home', NULL, NULL, NULL, NULL, NULL, NULL, v_user_id),
  ('4b586b6b-d746-4607-8c60-ceefd479598a', 'Jozef Polomský', 'xdodox82@gmail.com', '+421905818695', 'Nábrežná 516/20', NULL, '{}', '2025-12-28T00:19:54.172801+00:00', '2025-12-28T11:08:11.920582+00:00', NULL, 'home', NULL, NULL, NULL, NULL, NULL, NULL, v_user_id),
  ('617b48d5-4b15-4c9f-84d9-35118971e9d3', 'Marián Mereš', NULL, NULL, 'Poprad Veľka', NULL, '{}', '2025-12-28T09:41:49.596382+00:00', '2025-12-28T11:08:17.371725+00:00', NULL, 'home', NULL, NULL, NULL, NULL, NULL, NULL, v_user_id),
  ('6990b6e3-7303-42ef-af81-21b5bc9c5a61', 'Reštaurácia U Zeleného Stromu', 'info@zelenystrom.sk', '+421 900 123 456', 'Hlavná 15, Bratislava', NULL, '{}', '2025-12-28T00:19:54.172801+00:00', '2025-12-28T11:08:36.543565+00:00', NULL, 'gastro', NULL, NULL, NULL, NULL, NULL, NULL, v_user_id),
  ('d21455ce-2db0-458c-ac44-370eea9a0d4b', 'MK Fruit s.r.o.', NULL, NULL, 'Žerotínova 87, 787 01 Šumperk', NULL, '{}', '2025-12-28T17:21:44.906979+00:00', '2025-12-28T17:21:44.906979+00:00', NULL, 'wholesale', NULL, NULL, NULL, NULL, NULL, NULL, v_user_id),
  ('92f11cc1-46c5-4632-bfc3-98ff197a2288', 'Ján Richnavský', NULL, NULL, NULL, NULL, '{}', '2025-12-30T21:37:29.365538+00:00', '2025-12-30T21:37:29.365538+00:00', NULL, 'gastro', 'Spiš', NULL, NULL, NULL, NULL, NULL, v_user_id)
  ON CONFLICT (id) DO UPDATE SET user_id = v_user_id;

  -- BLENDS
  INSERT INTO blends (id, name, crop_ids, created_at, crop_percentages, notes, user_id) VALUES 
  ('f007604f-aa71-4f1f-ad3e-557ec4bae5d1', 'Reďkovkový mix', ARRAY['141bd195-6f78-4cf5-b506-d04ea5c46e06','4516a773-24b2-40e2-a60b-b59f753de2dc','767fa6bc-2c63-4dc2-9f3d-2d7ade698776','d61c2ed9-aa5e-49e7-b184-728c4ac1014b']::uuid[], '2025-12-28T00:19:53.974562+00:00', '[{"cropId":"141bd195-6f78-4cf5-b506-d04ea5c46e06","percentage":25},{"cropId":"4516a773-24b2-40e2-a60b-b59f753de2dc","percentage":25},{"cropId":"767fa6bc-2c63-4dc2-9f3d-2d7ade698776","percentage":25},{"cropId":"d61c2ed9-aa5e-49e7-b184-728c4ac1014b","percentage":25}]'::jsonb, '', v_user_id),
  ('afbf4c73-f5ae-44ab-9c64-078fc2b3f5da', 'Šalátový mix', ARRAY['8755eab2-a358-42cc-a4c8-db7e41c9c255','61c55b0a-d7aa-4d50-b517-2115b37ef3af','141bd195-6f78-4cf5-b506-d04ea5c46e06','767fa6bc-2c63-4dc2-9f3d-2d7ade698776']::uuid[], '2025-12-28T09:14:21.830243+00:00', '[{"cropId":"8755eab2-a358-42cc-a4c8-db7e41c9c255","percentage":30},{"cropId":"61c55b0a-d7aa-4d50-b517-2115b37ef3af","percentage":30},{"cropId":"141bd195-6f78-4cf5-b506-d04ea5c46e06","percentage":20},{"cropId":"767fa6bc-2c63-4dc2-9f3d-2d7ade698776","percentage":20}]'::jsonb, '', v_user_id),
  ('3a83cfea-a56c-406e-a689-001033983e84', 'Mikrozelenina mix 70 g – 29.12.2025', ARRAY['8755eab2-a358-42cc-a4c8-db7e41c9c255','767fa6bc-2c63-4dc2-9f3d-2d7ade698776','61c55b0a-d7aa-4d50-b517-2115b37ef3af','413e9d45-61e1-483f-9d2c-7059a46d1824','c5311150-00ec-434d-a44b-ea9d9aa6d5ef']::uuid[], '2025-12-28T17:36:52.644563+00:00', '[{"cropId":"8755eab2-a358-42cc-a4c8-db7e41c9c255","percentage":25},{"cropId":"767fa6bc-2c63-4dc2-9f3d-2d7ade698776","percentage":25},{"cropId":"61c55b0a-d7aa-4d50-b517-2115b37ef3af","percentage":25},{"cropId":"413e9d45-61e1-483f-9d2c-7059a46d1824","percentage":10},{"cropId":"c5311150-00ec-434d-a44b-ea9d9aa6d5ef","percentage":15}]'::jsonb, '', v_user_id),
  ('7f774011-6c7d-4b26-9809-0d84838be63d', 'Mikrozelenina mix 100 g – 29.12.2025', ARRAY['8755eab2-a358-42cc-a4c8-db7e41c9c255','767fa6bc-2c63-4dc2-9f3d-2d7ade698776','61c55b0a-d7aa-4d50-b517-2115b37ef3af','eb50afbc-3af8-4484-ae1c-a48550bfcdae','0e68cc53-e550-418c-b99c-f3e81070664f']::uuid[], '2025-12-28T17:45:06.736806+00:00', '[{"cropId":"8755eab2-a358-42cc-a4c8-db7e41c9c255","percentage":25},{"cropId":"767fa6bc-2c63-4dc2-9f3d-2d7ade698776","percentage":25},{"cropId":"61c55b0a-d7aa-4d50-b517-2115b37ef3af","percentage":20},{"cropId":"eb50afbc-3af8-4484-ae1c-a48550bfcdae","percentage":15},{"cropId":"0e68cc53-e550-418c-b99c-f3e81070664f","percentage":15}]'::jsonb, '', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- SEEDS
  INSERT INTO seeds (id, crop_id, supplier_id, quantity, unit, lot_number, purchase_date, expiry_date, notes, created_at, stocking_date, consumption_start_date, certificate_url, min_stock, user_id) VALUES 
  ('7fa1b1ea-f6fc-42f9-8fa6-2da4ef5e792e', '8755eab2-a358-42cc-a4c8-db7e41c9c255', 'b3e26a3e-5798-4d77-b0e6-5cca31a6befd', 25, 'kg', '123456', NULL, '2026-03-31', NULL, '2025-12-28T10:13:08.009426+00:00', '2025-12-28', '2026-01-30', NULL, 5, v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- PACKAGINGS
  INSERT INTO packagings (id, name, type, size, quantity, supplier_id, notes, created_at, min_stock, user_id) VALUES 
  ('06c48ddf-b500-44b2-bf97-137d85f07361', 'Pre zrezanú mikrozeleninu', 'PET', '1200ml', 500, '0b0ca4a2-8d23-4e85-b1fa-f070e57a7adb', NULL, '2025-12-28T17:51:15.578781+00:00', 100, v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- SUBSTRATES  
  INSERT INTO substrates (id, name, type, quantity, unit, supplier_id, notes, created_at, min_stock, user_id) VALUES 
  ('59444953-99de-488e-8796-a0254469b6c6', 'Kokos', 'coconut', 1400, 'l', 'c8a073fc-269d-4190-b57a-2e7d0fd763a6', NULL, '2025-12-28T20:37:50.962577+00:00', NULL, v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- ORDERS (všetkých 21)
  INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, parent_order_id, skipped, recurring_weeks, user_id) VALUES 
  ('9222010a-4dbb-4a64-be8e-c2781aa97571', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', NULL, 'f007604f-aa71-4f1f-ad3e-557ec4bae5d1', 1, 'ks', '2025-12-28', '2026-01-09', 'pending', NULL, false, NULL, '2025-12-28T09:35:01.304944+00:00', 7, 'cut', '70g', false, NULL, false, 8, v_user_id),
  ('01b821d5-a79f-4891-b1b2-6ae40bdb3f3b', '4b586b6b-d746-4607-8c60-ceefd479598a', '767fa6bc-2c63-4dc2-9f3d-2d7ade698776', NULL, 3, 'ks', '2025-12-28', '2026-01-16', 'pending', NULL, false, NULL, '2025-12-28T09:47:09.973787+00:00', 8, 'cut', '60g', false, NULL, false, 8, v_user_id),
  ('0297fc90-9035-4954-adef-90b943a507d2', '4b586b6b-d746-4607-8c60-ceefd479598a', '7d85e64c-16b1-43c9-9804-1be6549f6f3c', NULL, 6, 'ks', '2025-12-28', '2026-01-16', 'pending', NULL, false, NULL, '2025-12-28T15:19:47.915392+00:00', 9, 'cut', '100g', false, NULL, false, NULL, v_user_id),
  ('731b16ad-7d6e-4286-b353-960f7409118a', 'd21455ce-2db0-458c-ac44-370eea9a0d4b', NULL, '7f774011-6c7d-4b26-9809-0d84838be63d', 5, 'ks', '2025-12-28', '2025-12-28', 'ready', NULL, false, NULL, '2025-12-28T17:50:46.55587+00:00', 11, 'cut', '100g', true, NULL, false, NULL, v_user_id),
  ('40cf74d9-f93b-48a9-8d6a-bbb721de3e6c', 'd21455ce-2db0-458c-ac44-370eea9a0d4b', NULL, '7f774011-6c7d-4b26-9809-0d84838be63d', 10, 'ks', '2025-12-28', '2025-12-28', 'ready', NULL, false, NULL, '2025-12-28T17:46:05.623475+00:00', 10, 'cut', '100g', true, NULL, false, NULL, v_user_id),
  ('b01255cd-0e82-4e3f-9017-a7183379bd34', 'd21455ce-2db0-458c-ac44-370eea9a0d4b', '8755eab2-a358-42cc-a4c8-db7e41c9c255', NULL, 50, 'ks', '2025-12-28', '2026-01-14', 'pending', NULL, false, NULL, '2025-12-28T17:56:46.485882+00:00', 12, 'cut', '50g', true, NULL, false, NULL, v_user_id),
  ('892aec6b-e215-4f1f-8f98-8ab634435d22', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-09', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:20.377505+00:00', 14, 'cut', '50g', false, NULL, false, 4, v_user_id),
  ('50e440eb-98a8-4418-956a-6a8efd017256', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-23', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:21.881985+00:00', 16, 'cut', '50g', false, '892aec6b-e215-4f1f-8f98-8ab634435d22', false, NULL, v_user_id),
  ('1a5678bc-4b55-4027-a31e-92c1d345838b', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-09', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:22.323913+00:00', 17, 'cut', '50g', false, NULL, false, 4, v_user_id),
  ('523ee873-53d3-44ae-85cc-3bd35329729b', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-30', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:22.600304+00:00', 18, 'cut', '50g', false, '892aec6b-e215-4f1f-8f98-8ab634435d22', false, NULL, v_user_id),
  ('6d554a84-e7ec-427d-9531-02f3eb5a656c', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-02-06', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:23.337751+00:00', 20, 'cut', '50g', false, '892aec6b-e215-4f1f-8f98-8ab634435d22', false, NULL, v_user_id),
  ('554d4cbc-bdc6-4cb5-90cb-51c752e11b1c', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-23', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:23.57362+00:00', 21, 'cut', '50g', false, '1a5678bc-4b55-4027-a31e-92c1d345838b', false, NULL, v_user_id),
  ('300fef8b-2237-43c7-b5a8-e48a26a5b4cd', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-30', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:24.082573+00:00', 22, 'cut', '50g', false, '1a5678bc-4b55-4027-a31e-92c1d345838b', false, NULL, v_user_id),
  ('dce40715-8b11-4b4f-9932-9ceab1bf8fff', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-02-06', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:24.525372+00:00', 23, 'cut', '50g', false, '1a5678bc-4b55-4027-a31e-92c1d345838b', false, NULL, v_user_id),
  ('ddbfeb2d-45a0-4f88-b9df-bc0feb1a2e9d', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-29', '2026-01-23', 'pending', NULL, false, NULL, '2025-12-29T08:31:28.904406+00:00', 24, 'cut', '50g', false, NULL, false, NULL, v_user_id),
  ('d64f75d2-0046-44aa-a212-4f1e69487859', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-29', '2026-01-23', 'pending', NULL, false, NULL, '2025-12-29T08:31:37.732354+00:00', 25, 'cut', '50g', false, NULL, false, NULL, v_user_id),
  ('ce8706f7-bbc8-42f5-b2b1-7f3bd5e103a7', '92f11cc1-46c5-4632-bfc3-98ff197a2288', '8755eab2-a358-42cc-a4c8-db7e41c9c255', NULL, 6, 'ks', '2025-12-30', '2026-01-16', 'delivered', 'Zaplatené', false, NULL, '2025-12-30T21:40:05.111148+00:00', 26, 'cut', '60g', false, NULL, false, NULL, v_user_id),
  ('3faec0ed-31da-4655-a984-d334088a4825', '4b586b6b-d746-4607-8c60-ceefd479598a', '46eb6c9b-3854-42c4-bd8c-732809024faa', NULL, 2, 'ks', '2025-12-31', '2026-01-23', 'pending', NULL, false, NULL, '2025-12-31T08:20:13.099606+00:00', 28, 'cut', '50g', false, NULL, false, NULL, v_user_id),
  ('c00859c2-c3a5-4219-b983-a0ee197c8926', '4b586b6b-d746-4607-8c60-ceefd479598a', '46eb6c9b-3854-42c4-bd8c-732809024faa', NULL, 2, 'ks', '2025-12-30', '2026-01-16', 'pending', NULL, false, NULL, '2025-12-30T22:04:49.780268+00:00', 27, 'cut', '50g', false, NULL, false, NULL, v_user_id),
  ('cfbbb936-7a45-4eaa-82cc-2335a0660c50', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-16', 'delivered', 'Zaplatené', true, 'weekly', '2025-12-28T18:38:23.024663+00:00', 19, 'cut', '50g', false, '1a5678bc-4b55-4027-a31e-92c1d345838b', false, NULL, v_user_id),
  ('29e52aa7-b6fc-4a46-b93c-1cceac17796c', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-16', 'delivered', 'Zaplatené', true, 'weekly', '2025-12-28T18:38:21.224239+00:00', 15, 'cut', '50g', false, '892aec6b-e215-4f1f-8f98-8ab634435d22', false, NULL, v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- PLANTING_PLANS (všetkých 16)
  INSERT INTO planting_plans (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components, user_id) VALUES 
  ('1db9bb2f-ae8f-4b79-9ff6-14509d6463d6', '8755eab2-a358-42cc-a4c8-db7e41c9c255', NULL, 1, '2026-01-06', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky', '2025-12-28T09:17:03.534763+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('3855a71b-2ec9-45ad-b4b8-b67837794851', '767fa6bc-2c63-4dc2-9f3d-2d7ade698776', '01b821d5-a79f-4891-b1b2-6ae40bdb3f3b', 1, '2026-01-08', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky', '2025-12-28T09:47:10.168539+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('463ab201-6128-4a59-8cf0-a75ce107d038', '7d85e64c-16b1-43c9-9804-1be6549f6f3c', '0297fc90-9035-4954-adef-90b943a507d2', 1, '2026-01-03', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky', '2025-12-28T15:19:48.556317+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('6752ffdb-1197-40e7-aee9-e14c49e14c6e', 'd61c2ed9-aa5e-49e7-b184-728c4ac1014b', '0297fc90-9035-4954-adef-90b943a507d2', 1, '2026-01-09', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky', '2025-12-28T15:19:48.722595+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('13ed74ca-c8c2-4a29-a5bf-99bf3c17b8d0', '0d8930c5-62c4-47c9-b389-f942e362611f', '892aec6b-e215-4f1f-8f98-8ab634435d22', 1, '2025-12-29', '2026-01-09', NULL, 'planned', 'Auto-vytvorené z objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:21.032547+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('48662168-2a88-4dbf-ae75-ae177b61c96d', '0d8930c5-62c4-47c9-b389-f942e362611f', '29e52aa7-b6fc-4a46-b93c-1cceac17796c', 1, '2026-01-05', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:21.465103+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('1f717dac-df89-4c20-81d0-3d1f79f2d14d', '0d8930c5-62c4-47c9-b389-f942e362611f', '50e440eb-98a8-4418-956a-6a8efd017256', 1, '2026-01-12', '2026-01-23', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:22.141076+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('b93d4bdb-7db3-40f3-946e-fc788b82a4fb', '0d8930c5-62c4-47c9-b389-f942e362611f', '1a5678bc-4b55-4027-a31e-92c1d345838b', 1, '2025-12-29', '2026-01-09', NULL, 'planned', 'Auto-vytvorené z objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:22.815902+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('c5a44fe6-c027-4fe9-a5af-cc92d6301e4e', '0d8930c5-62c4-47c9-b389-f942e362611f', '523ee873-53d3-44ae-85cc-3bd35329729b', 1, '2026-01-19', '2026-01-30', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:22.873776+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('0279bf29-051d-4ead-ada7-4eaead47fc1c', '0d8930c5-62c4-47c9-b389-f942e362611f', 'cfbbb936-7a45-4eaa-82cc-2335a0660c50', 1, '2026-01-05', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:23.180424+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('3b8e394a-64ec-4cf4-b59c-3ea2fd94fd7f', '0d8930c5-62c4-47c9-b389-f942e362611f', '6d554a84-e7ec-427d-9531-02f3eb5a656c', 1, '2026-01-26', '2026-02-06', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:23.506629+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('235e8d68-f18c-4354-b212-9bb05e518302', '0d8930c5-62c4-47c9-b389-f942e362611f', '554d4cbc-bdc6-4cb5-90cb-51c752e11b1c', 1, '2026-01-12', '2026-01-23', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:23.766736+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('b743e474-cc3a-44d4-8180-fff9c6190fbe', '0d8930c5-62c4-47c9-b389-f942e362611f', '300fef8b-2237-43c7-b5a8-e48a26a5b4cd', 1, '2026-01-19', '2026-01-30', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:24.222824+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('8325f88e-f325-4711-8af4-329fc5dfa77b', '0d8930c5-62c4-47c9-b389-f942e362611f', 'dce40715-8b11-4b4f-9932-9ceab1bf8fff', 1, '2026-01-26', '2026-02-06', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:24.693753+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('7cf0c764-8be8-411e-9546-23fdde935fe1', 'd61c2ed9-aa5e-49e7-b184-728c4ac1014b', NULL, 1, '2026-01-01', '2026-01-09', '2025-12-29', 'harvested', 'Auto-vytvorené z objednávky', '2025-12-28T09:12:59.068764+00:00', NULL, false, '[]'::jsonb, v_user_id),
  ('be0b0c6e-c982-4b3b-952e-29821e98c851', '8755eab2-a358-42cc-a4c8-db7e41c9c255', 'b01255cd-0e82-4e3f-9017-a7183379bd34', 5, '2026-01-03', '2026-01-14', NULL, 'planned', 'Auto-vytvorené z objednávky', '2025-12-28T17:56:46.636834+00:00', NULL, false, '[]'::jsonb, v_user_id)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Data import completed: 6 customers, 4 blends, 21 orders, 16 planting plans';
END $$;
