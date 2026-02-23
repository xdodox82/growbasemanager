-- Migration SQL Inserts
-- Vygenerované z JSON dát na ručné vloženie do Supabase SQL Editora
-- Spustiť v tomto poradí!

-- Najprv nastavíme session_replication_role na replica aby sme obišli RLS a FK kontroly
SET session_replication_role = 'replica';

-- ============================================
-- 1. CROPS
-- ============================================

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('981c213a-4dc5-43cf-ab2f-df0e03cbd2b0', 'Koriander', '', 15, 23.5, 200, false, '#22c55e', '2025-12-28T00:19:53.691526+00:00', '2025-12-28T10:58:23.663074+00:00', 'microherbs', 5, 'warm', 0, 10, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('50acd2ac-b696-4c0b-902e-8b8d9b4998a3', 'Nechtík lekársky', '', 65, 5, 200, false, '#eab308', '2025-12-28T10:53:52.053085+00:00', '2025-12-28T10:58:33.793046+00:00', 'edible_flowers', 10, 'warm', 5, 50, false, true, '', false);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('4516a773-24b2-40e2-a60b-b59f753de2dc', 'Reďkovka China Rose', '', 8, 30, 280, false, '#22c55e', '2025-12-28T00:19:53.691526+00:00', '2025-12-28T10:58:44.256832+00:00', 'microgreens', 3, 'warm', 0, 5, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('141bd195-6f78-4cf5-b506-d04ea5c46e06', 'Reďkovka Red Coral', '', 8, 30, 320, false, '#ef4444', '2025-12-28T00:19:53.691526+00:00', '2025-12-28T10:59:37.451292+00:00', 'microgreens', 3, 'warm', 0, 5, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('767fa6bc-2c63-4dc2-9f3d-2d7ade698776', 'Reďkovka Sango', '', 8, 32, 300, false, '#a855f7', '2025-12-28T00:19:53.691526+00:00', '2025-12-28T10:59:59.468681+00:00', 'microgreens', 2, 'warm', 2, 5, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('61c55b0a-d7aa-4d50-b517-2115b37ef3af', 'Slnečnica', '', 8, 60, 300, true, '#eab308', '2025-12-28T00:19:53.691526+00:00', '2025-12-28T11:00:26.572537+00:00', 'microgreens', 3, 'warm', 0, 5, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('7d85e64c-16b1-43c9-9804-1be6549f6f3c', 'Hrach vráskavý', '', 13, 85, 200, true, '#22c55e', '2025-12-28T14:23:54.201365+00:00', '2025-12-28T14:24:52.24271+00:00', 'microgreens', 3, 'warm', 3, 7, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('8755eab2-a358-42cc-a4c8-db7e41c9c255', 'Hrach siaty Affyla', 'Affyla', 11, 140, 300, true, '#84cc16', '2025-12-28T00:19:53.691526+00:00', '2025-12-28T14:25:15.879648+00:00', 'microgreens', 3, 'warm', 1, 7, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('d61c2ed9-aa5e-49e7-b184-728c4ac1014b', 'Reďkovka Daikon', '', 7, 33, 300, false, '#22c55e', '2025-12-28T00:19:53.691526+00:00', '2025-12-28T14:25:50.60728+00:00', 'microgreens', 3, 'warm', 0, 4, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('46eb6c9b-3854-42c4-bd8c-732809024faa', 'Červená kapusta', '', 11, 19, 200, false, '#22c55e', '2025-12-28T16:14:03.542845+00:00', '2025-12-28T16:14:03.542845+00:00', 'microgreens', 3, 'warm', 1, 7, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('0d8930c5-62c4-47c9-b389-f942e362611f', 'Kaleráb ružový', '', 11, 18, 200, false, '#22c55e', '2025-12-28T16:15:02.303935+00:00', '2025-12-28T16:15:02.303935+00:00', 'microgreens', 3, 'warm', 1, 7, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('c4e85553-fdd7-4fea-8e99-ea816bbc7222', 'Pak choi', 'Biely', 10, 19, 250, false, '#22c55e', '2025-12-28T16:20:40.98012+00:00', '2025-12-28T16:20:40.98012+00:00', 'microgreens', 3, 'warm', 1, 6, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('be602410-3225-4f88-8797-b49b201b154d', 'Rukola', '', 11, 16, 200, false, '#22c55e', '2025-12-28T16:24:14.516495+00:00', '2025-12-28T16:24:14.516495+00:00', 'microherbs', 3, 'warm', 2, 6, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('4e288b08-686c-4c92-9461-852eb6562111', 'Žerucha siata', '', 10, 18, 200, false, '#22c55e', '2025-12-28T16:25:50.58193+00:00', '2025-12-28T16:25:50.58193+00:00', 'microherbs', 3, 'warm', 1, 6, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('0e68cc53-e550-418c-b99c-f3e81070664f', 'Hořčice bílá', '', 8, 28.5, 200, false, '#22c55e', '2025-12-28T17:24:19.242557+00:00', '2025-12-28T17:24:19.242557+00:00', 'microgreens', 3, 'warm', 0, 5, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('c5311150-00ec-434d-a44b-ea9d9aa6d5ef', 'Cibule', '', 14, 35, 250, false, '#22c55e', '2025-12-28T17:34:10.378725+00:00', '2025-12-28T17:34:10.378725+00:00', 'microgreens', 6, 'warm', 1, 7, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('413e9d45-61e1-483f-9d2c-7059a46d1824', 'Řepa Bull´s blood', '', 20, 50, 150, false, '#22c55e', '2025-12-28T17:35:27.335915+00:00', '2025-12-28T17:35:27.335915+00:00', 'microgreens', 8, 'warm', 0, 12, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('eb50afbc-3af8-4484-ae1c-a48550bfcdae', 'Brokolice Raab', 'Raab', 8, 15, 200, false, '#22c55e', '2025-12-28T17:43:50.530035+00:00', '2025-12-28T17:43:50.530035+00:00', 'microgreens', 3, 'warm', 1, 4, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('5ce1d7dd-c22a-4bc0-90bf-7d5ff41b0add', 'Brokolica Calabrese', 'Calabrese', 10, 22.5, 250, false, '#22c55e', '2025-12-28T00:19:53.691526+00:00', '2025-12-29T10:37:35.125358+00:00', 'microgreens', 3, 'warm', 2, 7, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('a70f7bf3-34d7-48e7-879d-503f884ca640', 'Horčica biela', '', 8, 28.5, 220, false, '#22c55e', '2025-12-29T23:09:05.46596+00:00', '2025-12-29T23:09:05.46596+00:00', 'microgreens', 2, 'warm', 1, 5, true, false, '', true);

INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, created_at, updated_at, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight) VALUES ('6c58dbf3-5749-4cf9-8db9-06e426b34d5f', 'Mizuna červená', '', 10, 18, 200, false, '#22c55e', '2025-12-31T18:52:24.813501+00:00', '2025-12-31T18:52:24.813501+00:00', 'microgreens', 3, 'warm', 1, 6, true, false, '', true);

-- ============================================
-- 2. SUPPLIERS
-- ============================================

INSERT INTO suppliers (id, name, contact_name, email, phone, address, notes, created_at, company_name, supplier_type, ico, ic_dph, dic, bank_account) VALUES ('c8a073fc-269d-4190-b57a-2e7d0fd763a6', 'Milan Kolomazník', NULL, NULL, '+420601391531', 'Do Ostrov 97, Potštejn, 51743', NULL, '2025-12-28T00:19:54.327633+00:00', 'Cocomark s.r.o.', 'substrate', NULL, NULL, NULL, NULL);

INSERT INTO suppliers (id, name, contact_name, email, phone, address, notes, created_at, company_name, supplier_type, ico, ic_dph, dic, bank_account) VALUES ('b3e26a3e-5798-4d77-b0e6-5cca31a6befd', 'Ján Roubíček', NULL, 'info@malizelenaci.cz', '+420773470555', 'Korálkova 34, Jablonec nad Nisou', 'Malí Zelenáči - (vč.osobních odběrů objednávek)

Klára Roubíčková

Palackého 3145/41 (budova Jablonexu)  1.patro

46601 Jablonec nad Nisou', '2025-12-28T10:11:41.559487+00:00', 'Malí Zelenáči', 'seeds', '69431825', NULL, 'CZ8205052581', NULL);

INSERT INTO suppliers (id, name, contact_name, email, phone, address, notes, created_at, company_name, supplier_type, ico, ic_dph, dic, bank_account) VALUES ('e45523c9-cd34-4b61-8c18-54cb4ca35bc7', 'LEGUTKO', NULL, NULL, NULL, NULL, NULL, '2025-12-28T10:45:43.834192+00:00', 'LEGUTKO', 'seeds', NULL, NULL, NULL, NULL);

INSERT INTO suppliers (id, name, contact_name, email, phone, address, notes, created_at, company_name, supplier_type, ico, ic_dph, dic, bank_account) VALUES ('a6fbd8cd-0a5c-4cb5-8bde-26e83f5a33fb', 'MP Seeds', NULL, NULL, NULL, NULL, NULL, '2025-12-28T10:45:59.881202+00:00', 'MP Seeds', NULL, NULL, NULL, NULL, NULL);

INSERT INTO suppliers (id, name, contact_name, email, phone, address, notes, created_at, company_name, supplier_type, ico, ic_dph, dic, bank_account) VALUES ('07e8c076-e7d6-4c2d-b7d0-344188e59658', 'Ola Sokołowska', NULL, NULL, NULL, NULL, NULL, '2025-12-28T10:46:50.807519+00:00', 'TORAF', 'seeds', NULL, NULL, NULL, NULL);

INSERT INTO suppliers (id, name, contact_name, email, phone, address, notes, created_at, company_name, supplier_type, ico, ic_dph, dic, bank_account) VALUES ('0b0ca4a2-8d23-4e85-b1fa-f070e57a7adb', 'Fatra, a.s.', NULL, 'prodej@fatra.cz', '724 405 924', 'třída Tomáše Bati 1541, 763 61 Napajedla', '1 paleta minimálně', '2025-12-28T17:41:18.035469+00:00', 'Fatra, a.s.', 'packaging', '27465021', NULL, 'CZ27465021', '1200661/0100');

-- ============================================
-- 3. CUSTOMERS
-- ============================================

INSERT INTO customers (id, name, email, phone, address, delivery_notes, delivery_day_ids, created_at, updated_at, delivery_route_id, customer_type, company_name, contact_name, ico, dic, ic_dph, bank_account) VALUES ('6c44045c-1bd8-4b7e-bea8-8e8b84d49924', 'Ján Zeman', NULL, NULL, 'Kravany', NULL, '{}', '2025-12-28T00:19:54.172801+00:00', '2025-12-28T11:08:00.503168+00:00', '1d2769c8-b665-4c39-a272-8d573b4e1375', 'home', NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO customers (id, name, email, phone, address, delivery_notes, delivery_day_ids, created_at, updated_at, delivery_route_id, customer_type, company_name, contact_name, ico, dic, ic_dph, bank_account) VALUES ('4b586b6b-d746-4607-8c60-ceefd479598a', 'Jozef Polomský', 'xdodox82@gmail.com', '+421905818695', 'Nábrežná 516/20', NULL, '{}', '2025-12-28T00:19:54.172801+00:00', '2025-12-28T11:08:11.920582+00:00', 'bcaff252-1b9d-489d-96db-d24b08b6bc3e', 'home', NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO customers (id, name, email, phone, address, delivery_notes, delivery_day_ids, created_at, updated_at, delivery_route_id, customer_type, company_name, contact_name, ico, dic, ic_dph, bank_account) VALUES ('617b48d5-4b15-4c9f-84d9-35118971e9d3', 'Marián Mereš', NULL, NULL, 'Poprad Veľka', NULL, '{}', '2025-12-28T09:41:49.596382+00:00', '2025-12-28T11:08:17.371725+00:00', '1d2769c8-b665-4c39-a272-8d573b4e1375', 'home', NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO customers (id, name, email, phone, address, delivery_notes, delivery_day_ids, created_at, updated_at, delivery_route_id, customer_type, company_name, contact_name, ico, dic, ic_dph, bank_account) VALUES ('6990b6e3-7303-42ef-af81-21b5bc9c5a61', 'Reštaurácia U Zeleného Stromu', 'info@zelenystrom.sk', '+421 900 123 456', 'Hlavná 15, Bratislava', NULL, '{}', '2025-12-28T00:19:54.172801+00:00', '2025-12-28T11:08:36.543565+00:00', NULL, 'gastro', NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO customers (id, name, email, phone, address, delivery_notes, delivery_day_ids, created_at, updated_at, delivery_route_id, customer_type, company_name, contact_name, ico, dic, ic_dph, bank_account) VALUES ('d21455ce-2db0-458c-ac44-370eea9a0d4b', 'MK Fruit s.r.o.', NULL, NULL, 'Žerotínova 87, 787 01 Šumperk', NULL, '{}', '2025-12-28T17:21:44.906979+00:00', '2025-12-28T17:21:44.906979+00:00', NULL, 'wholesale', NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO customers (id, name, email, phone, address, delivery_notes, delivery_day_ids, created_at, updated_at, delivery_route_id, customer_type, company_name, contact_name, ico, dic, ic_dph, bank_account) VALUES ('92f11cc1-46c5-4632-bfc3-98ff197a2288', 'Ján Richnavský', NULL, NULL, NULL, NULL, '{}', '2025-12-30T21:37:29.365538+00:00', '2025-12-30T21:37:29.365538+00:00', 'bcaff252-1b9d-489d-96db-d24b08b6bc3e', 'gastro', 'Spiš', NULL, NULL, NULL, NULL, NULL);

-- ============================================
-- 4. BLENDS
-- ============================================

INSERT INTO blends (id, name, crop_ids, created_at, crop_percentages, notes) VALUES ('f007604f-aa71-4f1f-ad3e-557ec4bae5d1', 'Reďkovkový mix', ARRAY['141bd195-6f78-4cf5-b506-d04ea5c46e06','4516a773-24b2-40e2-a60b-b59f753de2dc','767fa6bc-2c63-4dc2-9f3d-2d7ade698776','d61c2ed9-aa5e-49e7-b184-728c4ac1014b']::uuid[], '2025-12-28T00:19:53.974562+00:00', '[{"cropId":"141bd195-6f78-4cf5-b506-d04ea5c46e06","percentage":25},{"cropId":"4516a773-24b2-40e2-a60b-b59f753de2dc","percentage":25},{"cropId":"767fa6bc-2c63-4dc2-9f3d-2d7ade698776","percentage":25},{"cropId":"d61c2ed9-aa5e-49e7-b184-728c4ac1014b","percentage":25}]'::jsonb, '');

INSERT INTO blends (id, name, crop_ids, created_at, crop_percentages, notes) VALUES ('afbf4c73-f5ae-44ab-9c64-078fc2b3f5da', 'Šalátový mix', ARRAY['8755eab2-a358-42cc-a4c8-db7e41c9c255','61c55b0a-d7aa-4d50-b517-2115b37ef3af','141bd195-6f78-4cf5-b506-d04ea5c46e06','767fa6bc-2c63-4dc2-9f3d-2d7ade698776']::uuid[], '2025-12-28T09:14:21.830243+00:00', '[{"cropId":"8755eab2-a358-42cc-a4c8-db7e41c9c255","percentage":30},{"cropId":"61c55b0a-d7aa-4d50-b517-2115b37ef3af","percentage":30},{"cropId":"141bd195-6f78-4cf5-b506-d04ea5c46e06","percentage":20},{"cropId":"767fa6bc-2c63-4dc2-9f3d-2d7ade698776","percentage":20}]'::jsonb, '');

INSERT INTO blends (id, name, crop_ids, created_at, crop_percentages, notes) VALUES ('3a83cfea-a56c-406e-a689-001033983e84', 'Mikrozelenina mix 70 g – 29.12.2025', ARRAY['8755eab2-a358-42cc-a4c8-db7e41c9c255','767fa6bc-2c63-4dc2-9f3d-2d7ade698776','61c55b0a-d7aa-4d50-b517-2115b37ef3af','413e9d45-61e1-483f-9d2c-7059a46d1824','c5311150-00ec-434d-a44b-ea9d9aa6d5ef']::uuid[], '2025-12-28T17:36:52.644563+00:00', '[{"cropId":"8755eab2-a358-42cc-a4c8-db7e41c9c255","percentage":25},{"cropId":"767fa6bc-2c63-4dc2-9f3d-2d7ade698776","percentage":25},{"cropId":"61c55b0a-d7aa-4d50-b517-2115b37ef3af","percentage":25},{"cropId":"413e9d45-61e1-483f-9d2c-7059a46d1824","percentage":10},{"cropId":"c5311150-00ec-434d-a44b-ea9d9aa6d5ef","percentage":15}]'::jsonb, '');

INSERT INTO blends (id, name, crop_ids, created_at, crop_percentages, notes) VALUES ('7f774011-6c7d-4b26-9809-0d84838be63d', 'Mikrozelenina mix 100 g – 29.12.2025', ARRAY['8755eab2-a358-42cc-a4c8-db7e41c9c255','767fa6bc-2c63-4dc2-9f3d-2d7ade698776','61c55b0a-d7aa-4d50-b517-2115b37ef3af','eb50afbc-3af8-4484-ae1c-a48550bfcdae','0e68cc53-e550-418c-b99c-f3e81070664f']::uuid[], '2025-12-28T17:45:06.736806+00:00', '[{"cropId":"8755eab2-a358-42cc-a4c8-db7e41c9c255","percentage":25},{"cropId":"767fa6bc-2c63-4dc2-9f3d-2d7ade698776","percentage":25},{"cropId":"61c55b0a-d7aa-4d50-b517-2115b37ef3af","percentage":20},{"cropId":"eb50afbc-3af8-4484-ae1c-a48550bfcdae","percentage":15},{"cropId":"0e68cc53-e550-418c-b99c-f3e81070664f","percentage":15}]'::jsonb, '');

-- ============================================
-- 5. SEEDS
-- ============================================

INSERT INTO seeds (id, crop_id, supplier_id, quantity, unit, lot_number, purchase_date, expiry_date, notes, created_at, stocking_date, consumption_start_date, certificate_url, min_stock) VALUES ('7fa1b1ea-f6fc-42f9-8fa6-2da4ef5e792e', '8755eab2-a358-42cc-a4c8-db7e41c9c255', 'b3e26a3e-5798-4d77-b0e6-5cca31a6befd', 25, 'kg', '123456', NULL, '2026-03-31', NULL, '2025-12-28T10:13:08.009426+00:00', '2025-12-28', '2026-01-30', NULL, 5);

-- ============================================
-- 6. PACKAGING
-- ============================================

INSERT INTO packaging (id, name, type, size, quantity, supplier_id, notes, created_at, min_stock) VALUES ('06c48ddf-b500-44b2-bf97-137d85f07361', 'Pre zrezanú mikrozeleninu', 'PET', '1200ml', 500, '0b0ca4a2-8d23-4e85-b1fa-f070e57a7adb', NULL, '2025-12-28T17:51:15.578781+00:00', 100);

-- ============================================
-- 7. SUBSTRATE
-- ============================================

INSERT INTO substrate (id, name, type, quantity, unit, supplier_id, notes, created_at, min_stock) VALUES ('59444953-99de-488e-8796-a0254469b6c6', 'Kokos', 'coconut', 1400, 'l', 'c8a073fc-269d-4190-b57a-2e7d0fd763a6', NULL, '2025-12-28T20:37:50.962577+00:00', NULL);

-- ============================================
-- 8. ORDERS
-- ============================================

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('9222010a-4dbb-4a64-be8e-c2781aa97571', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', NULL, 'f007604f-aa71-4f1f-ad3e-557ec4bae5d1', 1, 'ks', '2025-12-28', '2026-01-09', 'pending', NULL, false, NULL, '2025-12-28T09:35:01.304944+00:00', 7, 'cut', '70g', false, NULL, NULL, false, 8);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('01b821d5-a79f-4891-b1b2-6ae40bdb3f3b', '4b586b6b-d746-4607-8c60-ceefd479598a', '767fa6bc-2c63-4dc2-9f3d-2d7ade698776', NULL, 3, 'ks', '2025-12-28', '2026-01-16', 'pending', NULL, false, NULL, '2025-12-28T09:47:09.973787+00:00', 8, 'cut', '60g', false, 'Pre zrezanú mikrozeleninu', NULL, false, 8);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('0297fc90-9035-4954-adef-90b943a507d2', '4b586b6b-d746-4607-8c60-ceefd479598a', '7d85e64c-16b1-43c9-9804-1be6549f6f3c', NULL, 6, 'ks', '2025-12-28', '2026-01-16', 'pending', NULL, false, NULL, '2025-12-28T15:19:47.915392+00:00', 9, 'cut', '100g', false, NULL, NULL, false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('731b16ad-7d6e-4286-b353-960f7409118a', 'd21455ce-2db0-458c-ac44-370eea9a0d4b', NULL, '7f774011-6c7d-4b26-9809-0d84838be63d', 5, 'ks', '2025-12-28', '2025-12-28', 'ready', NULL, false, NULL, '2025-12-28T17:50:46.55587+00:00', 11, 'cut', '100g', true, 'Pre zrezanú mikrozeleninu', NULL, false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('40cf74d9-f93b-48a9-8d6a-bbb721de3e6c', 'd21455ce-2db0-458c-ac44-370eea9a0d4b', NULL, '7f774011-6c7d-4b26-9809-0d84838be63d', 10, 'ks', '2025-12-28', '2025-12-28', 'ready', NULL, false, NULL, '2025-12-28T17:46:05.623475+00:00', 10, 'cut', '100g', true, 'Pre zrezanú mikrozeleninu', NULL, false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('b01255cd-0e82-4e3f-9017-a7183379bd34', 'd21455ce-2db0-458c-ac44-370eea9a0d4b', '8755eab2-a358-42cc-a4c8-db7e41c9c255', NULL, 50, 'ks', '2025-12-28', '2026-01-14', 'pending', NULL, false, NULL, '2025-12-28T17:56:46.485882+00:00', 12, 'cut', '50g', true, 'Pre zrezanú mikrozeleninu', NULL, false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('892aec6b-e215-4f1f-8f98-8ab634435d22', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-09', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:20.377505+00:00', 14, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', NULL, false, 4);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('50e440eb-98a8-4418-956a-6a8efd017256', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-23', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:21.881985+00:00', 16, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', '892aec6b-e215-4f1f-8f98-8ab634435d22', false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('1a5678bc-4b55-4027-a31e-92c1d345838b', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-09', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:22.323913+00:00', 17, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', NULL, false, 4);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('523ee873-53d3-44ae-85cc-3bd35329729b', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-30', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:22.600304+00:00', 18, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', '892aec6b-e215-4f1f-8f98-8ab634435d22', false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('6d554a84-e7ec-427d-9531-02f3eb5a656c', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-02-06', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:23.337751+00:00', 20, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', '892aec6b-e215-4f1f-8f98-8ab634435d22', false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('554d4cbc-bdc6-4cb5-90cb-51c752e11b1c', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-23', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:23.57362+00:00', 21, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', '1a5678bc-4b55-4027-a31e-92c1d345838b', false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('300fef8b-2237-43c7-b5a8-e48a26a5b4cd', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-30', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:24.082573+00:00', 22, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', '1a5678bc-4b55-4027-a31e-92c1d345838b', false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('dce40715-8b11-4b4f-9932-9ceab1bf8fff', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-02-06', 'pending', NULL, true, 'weekly', '2025-12-28T18:38:24.525372+00:00', 23, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', '1a5678bc-4b55-4027-a31e-92c1d345838b', false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('ddbfeb2d-45a0-4f88-b9df-bc0feb1a2e9d', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-29', '2026-01-23', 'pending', NULL, false, NULL, '2025-12-29T08:31:28.904406+00:00', 24, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', NULL, false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('d64f75d2-0046-44aa-a212-4f1e69487859', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-29', '2026-01-23', 'pending', NULL, false, NULL, '2025-12-29T08:31:37.732354+00:00', 25, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', NULL, false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('ce8706f7-bbc8-42f5-b2b1-7f3bd5e103a7', '92f11cc1-46c5-4632-bfc3-98ff197a2288', '8755eab2-a358-42cc-a4c8-db7e41c9c255', NULL, 6, 'ks', '2025-12-30', '2026-01-16', 'delivered', 'Zaplatené', false, NULL, '2025-12-30T21:40:05.111148+00:00', 26, 'cut', '60g', false, 'Pre zrezanú mikrozeleninu', NULL, false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('3faec0ed-31da-4655-a984-d334088a4825', '4b586b6b-d746-4607-8c60-ceefd479598a', '46eb6c9b-3854-42c4-bd8c-732809024faa', NULL, 2, 'ks', '2025-12-31', '2026-01-23', 'pending', NULL, false, NULL, '2025-12-31T08:20:13.099606+00:00', 28, 'cut', '50g', false, NULL, NULL, false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('c00859c2-c3a5-4219-b983-a0ee197c8926', '4b586b6b-d746-4607-8c60-ceefd479598a', '46eb6c9b-3854-42c4-bd8c-732809024faa', NULL, 2, 'ks', '2025-12-30', '2026-01-16', 'pending', NULL, false, NULL, '2025-12-30T22:04:49.780268+00:00', 27, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', NULL, false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('cfbbb936-7a45-4eaa-82cc-2335a0660c50', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-16', 'delivered', 'Zaplatené', true, 'weekly', '2025-12-28T18:38:23.024663+00:00', 19, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', '1a5678bc-4b55-4027-a31e-92c1d345838b', false, NULL);

INSERT INTO orders (id, customer_id, crop_id, blend_id, quantity, unit, order_date, delivery_date, status, notes, is_recurring, recurrence_pattern, created_at, order_number, delivery_form, packaging_size, has_label, packaging_type, parent_order_id, skipped, recurring_weeks) VALUES ('29e52aa7-b6fc-4a46-b93c-1cceac17796c', '6c44045c-1bd8-4b7e-bea8-8e8b84d49924', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, 3, 'ks', '2025-12-28', '2026-01-16', 'delivered', 'Zaplatené', true, 'weekly', '2025-12-28T18:38:21.224239+00:00', 15, 'cut', '50g', false, 'Pre zrezanú mikrozeleninu', '892aec6b-e215-4f1f-8f98-8ab634435d22', false, NULL);

-- ============================================
-- 9. PLANTING_PLAN
-- ============================================

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('1db9bb2f-ae8f-4b79-9ff6-14509d6463d6', '8755eab2-a358-42cc-a4c8-db7e41c9c255', NULL, 1, '2026-01-06', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky', '2025-12-28T09:17:03.534763+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('3855a71b-2ec9-45ad-b4b8-b67837794851', '767fa6bc-2c63-4dc2-9f3d-2d7ade698776', '01b821d5-a79f-4891-b1b2-6ae40bdb3f3b', 1, '2026-01-08', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky', '2025-12-28T09:47:10.168539+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('463ab201-6128-4a59-8cf0-a75ce107d038', '7d85e64c-16b1-43c9-9804-1be6549f6f3c', '0297fc90-9035-4954-adef-90b943a507d2', 1, '2026-01-03', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky', '2025-12-28T15:19:48.556317+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('6752ffdb-1197-40e7-aee9-e14c49e14c6e', 'd61c2ed9-aa5e-49e7-b184-728c4ac1014b', '0297fc90-9035-4954-adef-90b943a507d2', 1, '2026-01-09', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky', '2025-12-28T15:19:48.722595+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('13ed74ca-c8c2-4a29-a5bf-99bf3c17b8d0', '0d8930c5-62c4-47c9-b389-f942e362611f', '892aec6b-e215-4f1f-8f98-8ab634435d22', 1, '2025-12-29', '2026-01-09', NULL, 'planned', 'Auto-vytvorené z objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:21.032547+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('48662168-2a88-4dbf-ae75-ae177b61c96d', '0d8930c5-62c4-47c9-b389-f942e362611f', '29e52aa7-b6fc-4a46-b93c-1cceac17796c', 1, '2026-01-05', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:21.465103+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('1f717dac-df89-4c20-81d0-3d1f79f2d14d', '0d8930c5-62c4-47c9-b389-f942e362611f', '50e440eb-98a8-4418-956a-6a8efd017256', 1, '2026-01-12', '2026-01-23', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:22.141076+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('b93d4bdb-7db3-40f3-946e-fc788b82a4fb', '0d8930c5-62c4-47c9-b389-f942e362611f', '1a5678bc-4b55-4027-a31e-92c1d345838b', 1, '2025-12-29', '2026-01-09', NULL, 'planned', 'Auto-vytvorené z objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:22.815902+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('c5a44fe6-c027-4fe9-a5af-cc92d6301e4e', '0d8930c5-62c4-47c9-b389-f942e362611f', '523ee873-53d3-44ae-85cc-3bd35329729b', 1, '2026-01-19', '2026-01-30', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:22.873776+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('0279bf29-051d-4ead-ada7-4eaead47fc1c', '0d8930c5-62c4-47c9-b389-f942e362611f', 'cfbbb936-7a45-4eaa-82cc-2335a0660c50', 1, '2026-01-05', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:23.180424+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('3b8e394a-64ec-4cf4-b59c-3ea2fd94fd7f', '0d8930c5-62c4-47c9-b389-f942e362611f', '6d554a84-e7ec-427d-9531-02f3eb5a656c', 1, '2026-01-26', '2026-02-06', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:23.506629+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('235e8d68-f18c-4354-b212-9bb05e518302', '0d8930c5-62c4-47c9-b389-f942e362611f', '554d4cbc-bdc6-4cb5-90cb-51c752e11b1c', 1, '2026-01-12', '2026-01-23', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:23.766736+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('b743e474-cc3a-44d4-8180-fff9c6190fbe', '0d8930c5-62c4-47c9-b389-f942e362611f', '300fef8b-2237-43c7-b5a8-e48a26a5b4cd', 1, '2026-01-19', '2026-01-30', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:24.222824+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('8325f88e-f325-4711-8af4-329fc5dfa77b', '0d8930c5-62c4-47c9-b389-f942e362611f', 'dce40715-8b11-4b4f-9932-9ceab1bf8fff', 1, '2026-01-26', '2026-02-06', NULL, 'planned', 'Auto-vytvorené z opakovanej objednávky (1× 50g = 50g, 1 tácok)', '2025-12-28T18:38:24.693753+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('7cf0c764-8be8-411e-9546-23fdde935fe1', 'd61c2ed9-aa5e-49e7-b184-728c4ac1014b', NULL, 1, '2026-01-01', '2026-01-09', '2025-12-29', 'harvested', 'Auto-vytvorené z objednávky', '2025-12-28T09:12:59.068764+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('0140dcbe-0cad-4d58-9f17-0a31434762bf', '141bd195-6f78-4cf5-b506-d04ea5c46e06', 'ce8706f7-bbc8-42f5-b2b1-7f3bd5e103a7', 1, '2026-01-08', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky (1× 60g = 60g, 1 tácok)', '2025-12-30T21:40:05.807031+00:00', NULL, false, NULL);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('bdbf13a2-6832-4dc2-bb69-b43f3558eb23', '4516a773-24b2-40e2-a60b-b59f753de2dc', 'ce8706f7-bbc8-42f5-b2b1-7f3bd5e103a7', 1, '2026-01-08', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky (1× 60g = 60g, 1 tácok)', '2025-12-30T21:40:06.040976+00:00', NULL, false, NULL);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('a57b55ea-aa61-4809-af6e-e8e9885e085c', '46eb6c9b-3854-42c4-bd8c-732809024faa', 'ce8706f7-bbc8-42f5-b2b1-7f3bd5e103a7', 1, '2026-01-05', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky (1× 50g = 50g, 1 tácok)', '2025-12-30T21:40:06.264989+00:00', NULL, false, NULL);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('36933db1-ddf7-4d3f-99f9-fd84c7b87c4d', '5ce1d7dd-c22a-4bc0-90bf-7d5ff41b0add', 'ce8706f7-bbc8-42f5-b2b1-7f3bd5e103a7', 1, '2026-01-06', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky (2× 50g = 100g, 1 tácok)', '2025-12-30T21:40:06.47626+00:00', NULL, false, NULL);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('6373ff0c-4149-4482-96b4-54f2f0613959', '46eb6c9b-3854-42c4-bd8c-732809024faa', 'c00859c2-c3a5-4219-b983-a0ee197c8926', 1, '2026-01-05', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky (1× 50g = 50g, 1 tácok)', '2025-12-30T22:04:50.453286+00:00', NULL, false, NULL);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('66869a3b-2b7e-4885-8589-2e096b5df70e', 'c5311150-00ec-434d-a44b-ea9d9aa6d5ef', 'c00859c2-c3a5-4219-b983-a0ee197c8926', 1, '2026-01-02', '2026-01-16', NULL, 'planned', 'Auto-vytvorené z objednávky (1× 50g = 50g, 1 tácok)', '2025-12-30T22:04:50.70807+00:00', NULL, false, NULL);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('c007820a-8fd4-4a04-80e1-907331e0ee4d', '8755eab2-a358-42cc-a4c8-db7e41c9c255', 'b01255cd-0e82-4e3f-9017-a7183379bd34', 9, '2026-01-03', '2026-01-14', '2025-12-30', 'harvested', 'Auto-vytvorené z objednávky (50× 50g = 2500g, 9 tácok)', '2025-12-28T17:56:46.729608+00:00', NULL, false, '[]'::jsonb);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('4285d879-7563-4911-826a-768d3246a166', '46eb6c9b-3854-42c4-bd8c-732809024faa', '3faec0ed-31da-4655-a984-d334088a4825', 1, '2026-01-12', '2026-01-23', NULL, 'planned', 'Auto-vytvorené z objednávky (1× 50g = 50g, 1 tácok)', '2025-12-31T08:20:13.555339+00:00', NULL, false, NULL);

INSERT INTO planting_plan (id, crop_id, order_id, tray_count, sow_date, expected_harvest_date, actual_harvest_date, status, notes, created_at, seed_id, is_combined, crop_components) VALUES ('ad5475b4-01a2-4580-9986-320a97890a76', '0e68cc53-e550-418c-b99c-f3e81070664f', '3faec0ed-31da-4655-a984-d334088a4825', 1, '2026-01-15', '2026-01-23', NULL, 'planned', 'Auto-vytvorené z objednávky (1× 50g = 50g, 1 tácok)', '2025-12-31T08:20:13.719136+00:00', NULL, false, NULL);

-- Vrátime späť na default
SET session_replication_role = DEFAULT;

-- Hotovo!
SELECT 'Migration completed successfully!' as status;
