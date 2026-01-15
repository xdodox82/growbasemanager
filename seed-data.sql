-- ============================================
-- SEED DATA PRE SUPABASE DATABÁZU
-- ============================================
-- Tento script obsahuje všetky základné dáta pre tvoju aplikáciu
-- Spusti ho vo svojej Supabase SQL editore
-- ============================================

-- DODÁVATELIA (Suppliers)
INSERT INTO suppliers (id, name, supplier_type, email, phone, company_name, contact_name) VALUES
('0b0ca4a2-8d23-4e85-b1fa-f070e57a7adb', 'Fatra, a.s.', 'packaging', 'prodej@fatra.cz', '724 405 924', 'Fatra, a.s.', NULL),
('b3e26a3e-5798-4d77-b0e6-5cca31a6befd', 'Ján Roubíček', 'seeds', 'info@malizelenaci.cz', '+420773470555', NULL, 'Ján Roubíček'),
('e45523c9-cd34-4b61-8c18-54cb4ca35bc7', 'LEGUTKO', 'seeds', NULL, NULL, 'LEGUTKO', NULL),
('c8a073fc-269d-4190-b57a-2e7d0fd763a6', 'Milan Kolomazník', 'substrate', NULL, '+420601391531', NULL, 'Milan Kolomazník'),
('a6fbd8cd-0a5c-4cb5-8bde-26e83f5a33fb', 'MP Seeds', NULL, NULL, NULL, 'MP Seeds', NULL),
('07e8c076-e7d6-4c2d-b7d0-344188e59658', 'Ola Sokołowska', 'seeds', NULL, NULL, NULL, 'Ola Sokołowska')
ON CONFLICT (id) DO NOTHING;

-- PLODINY (Crops)
INSERT INTO crops (id, name, variety, days_to_harvest, seed_density, expected_yield, seed_soaking, color, category, days_to_germination, germination_type, days_in_darkness, days_on_light, can_be_cut, can_be_live, notes, needs_weight, harvest_order, safety_buffer_percent, default_substrate_type) VALUES
('5ce1d7dd-c22a-4bc0-90bf-7d5ff41b0add', 'Brokolica Calabrese', 'Calabrese', 10, 22.5, 250, false, '#22c55e', 'microgreens', 3, 'warm', 2, 7, true, false, '', true, 999, 0.1, 'mixed'),
('eb50afbc-3af8-4484-ae1c-a48550bfcdae', 'Brokolice Raab', 'Raab', 8, 15, 200, false, '#22c55e', 'microgreens', 3, 'warm', 1, 4, true, false, '', true, 999, 0.10, 'mixed'),
('46eb6c9b-3854-42c4-bd8c-732809024faa', 'Červená kapusta', '', 11, 19, 200, false, '#22c55e', 'microgreens', 3, 'warm', 1, 7, true, false, '', true, 999, 0.10, 'mixed'),
('c5311150-00ec-434d-a44b-ea9d9aa6d5ef', 'Cibule', '', 14, 35, 250, false, '#22c55e', 'microgreens', 6, 'warm', 1, 7, true, false, '', true, 999, 0.10, 'mixed'),
('911d605b-8a0e-4745-9184-163d830baed6', 'Ďatelina purpurová', '', 10, 25, 200, false, '#22c55e', 'microgreens', 3, 'warm', 2, 5, true, false, '', true, 999, 0.10, 'mixed'),
('a70f7bf3-34d7-48e7-879d-503f884ca640', 'Horčica biela', '', 8, 28.5, 220, false, '#22c55e', 'microgreens', 2, 'warm', 1, 5, true, false, '', true, 999, 0.10, 'mixed'),
('cb8252b8-d5a6-4c35-891c-665993e9858a', 'Hrach šalátový', '', 13, 150, 250, true, '#22c55e', 'microgreens', 3, 'warm', 2, 8, true, false, '', true, 999, 0.10, 'mixed'),
('8755eab2-a358-42cc-a4c8-db7e41c9c255', 'Hrach siaty Affyla', 'Affyla', 11, 140, 300, true, '#84cc16', 'microgreens', 3, 'warm', 1, 7, true, false, '', true, 999, 0.10, 'mixed'),
('7d85e64c-16b1-43c9-9804-1be6549f6f3c', 'Hrach vráskavý', '', 13, 85, 200, true, '#22c55e', 'microgreens', 3, 'warm', 3, 7, true, false, '', true, 999, 0.10, 'mixed'),
('0d8930c5-62c4-47c9-b389-f942e362611f', 'Kaleráb ružový', '', 11, 18, 200, false, '#22c55e', 'microgreens', 3, 'warm', 1, 7, true, false, '', true, 999, 0.10, 'mixed'),
('981c213a-4dc5-43cf-ab2f-df0e03cbd2b0', 'Koriander', '', 15, 23.5, 200, false, '#22c55e', 'microherbs', 5, 'warm', 0, 10, true, false, '', true, 999, 0.10, 'mixed'),
('6c58dbf3-5749-4cf9-8db9-06e426b34d5f', 'Mizuna červená', '', 10, 18, 200, false, '#22c55e', 'microgreens', 3, 'warm', 1, 6, true, false, '', true, 999, 0.10, 'mixed'),
('50acd2ac-b696-4c0b-902e-8b8d9b4998a3', 'Nechtík lekársky', '', 65, 5, 200, false, '#eab308', 'edible_flowers', 10, 'warm', 5, 50, false, true, '', false, 999, 0.10, 'mixed'),
('c4e85553-fdd7-4fea-8e99-ea816bbc7222', 'Pak choi', 'Biely', 10, 19, 250, false, '#22c55e', 'microgreens', 3, 'warm', 1, 6, true, false, '', true, 999, 0.10, 'mixed'),
('4516a773-24b2-40e2-a60b-b59f753de2dc', 'Reďkovka China Rose', '', 8, 30, 280, false, '#22c55e', 'microgreens', 3, 'warm', 0, 5, true, false, '', true, 999, 0.10, 'mixed'),
('d61c2ed9-aa5e-49e7-b184-728c4ac1014b', 'Reďkovka Daikon', '', 7, 33, 300, false, '#22c55e', 'microgreens', 3, 'warm', 0, 4, true, false, '', true, 999, 0.10, 'mixed'),
('141bd195-6f78-4cf5-b506-d04ea5c46e06', 'Reďkovka Red Coral', '', 8, 30, 320, false, '#ef4444', 'microgreens', 3, 'warm', 0, 5, true, false, '', true, 999, 0.10, 'mixed'),
('767fa6bc-2c63-4dc2-9f3d-2d7ade698776', 'Reďkovka Sango', '', 8, 32, 300, false, '#a855f7', 'microgreens', 2, 'warm', 2, 5, true, false, '', true, 999, 0.10, 'mixed'),
('413e9d45-61e1-483f-9d2c-7059a46d1824', 'Řepa Bull´s blood', '', 20, 50, 150, false, '#22c55e', 'microgreens', 8, 'warm', 0, 12, true, false, '', true, 999, 0.10, 'mixed'),
('be602410-3225-4f88-8797-b49b201b154d', 'Rukola', '', 11, 16, 200, false, '#22c55e', 'microherbs', 3, 'warm', 2, 6, true, false, '', true, 999, 0.10, 'mixed'),
('61c55b0a-d7aa-4d50-b517-2115b37ef3af', 'Slnečnica', '', 8, 60, 300, true, '#eab308', 'microgreens', 3, 'warm', 0, 5, true, false, '', true, 999, 0.10, 'mixed'),
('4e288b08-686c-4c92-9461-852eb6562111', 'Žerucha siata', '', 10, 18, 200, false, '#22c55e', 'microherbs', 3, 'warm', 1, 6, true, false, '', true, 999, 0.10, 'mixed')
ON CONFLICT (id) DO NOTHING;

-- MIXY (Blends)
INSERT INTO blends (id, name, crop_ids, crop_percentages, notes) VALUES
('7f774011-6c7d-4b26-9809-0d84838be63d', 'Mikrozelenina mix 100 g – 29.12.2025',
 ARRAY['8755eab2-a358-42cc-a4c8-db7e41c9c255'::uuid, '767fa6bc-2c63-4dc2-9f3d-2d7ade698776'::uuid, '61c55b0a-d7aa-4d50-b517-2115b37ef3af'::uuid, 'eb50afbc-3af8-4484-ae1c-a48550bfcdae'::uuid, '0e68cc53-e550-418c-b99c-f3e81070664f'::uuid],
 '[{"cropId":"8755eab2-a358-42cc-a4c8-db7e41c9c255","percentage":25},{"cropId":"767fa6bc-2c63-4dc2-9f3d-2d7ade698776","percentage":25},{"cropId":"61c55b0a-d7aa-4d50-b517-2115b37ef3af","percentage":20},{"cropId":"eb50afbc-3af8-4484-ae1c-a48550bfcdae","percentage":15},{"cropId":"0e68cc53-e550-418c-b99c-f3e81070664f","percentage":15}]'::jsonb,
 NULL),
('3a83cfea-a56c-406e-a689-001033983e84', 'Mikrozelenina mix 70 g – 29.12.2025',
 ARRAY['8755eab2-a358-42cc-a4c8-db7e41c9c255'::uuid, '767fa6bc-2c63-4dc2-9f3d-2d7ade698776'::uuid, '61c55b0a-d7aa-4d50-b517-2115b37ef3af'::uuid, '413e9d45-61e1-483f-9d2c-7059a46d1824'::uuid, 'c5311150-00ec-434d-a44b-ea9d9aa6d5ef'::uuid],
 '[{"cropId":"8755eab2-a358-42cc-a4c8-db7e41c9c255","percentage":25},{"cropId":"767fa6bc-2c63-4dc2-9f3d-2d7ade698776","percentage":25},{"cropId":"61c55b0a-d7aa-4d50-b517-2115b37ef3af","percentage":25},{"cropId":"413e9d45-61e1-483f-9d2c-7059a46d1824","percentage":10},{"cropId":"c5311150-00ec-434d-a44b-ea9d9aa6d5ef","percentage":15}]'::jsonb,
 NULL),
('f007604f-aa71-4f1f-ad3e-557ec4bae5d1', 'Reďkovkový mix',
 ARRAY['141bd195-6f78-4cf5-b506-d04ea5c46e06'::uuid, '4516a773-24b2-40e2-a60b-b59f753de2dc'::uuid, '767fa6bc-2c63-4dc2-9f3d-2d7ade698776'::uuid, 'd61c2ed9-aa5e-49e7-b184-728c4ac1014b'::uuid],
 '[{"cropId":"141bd195-6f78-4cf5-b506-d04ea5c46e06","percentage":25},{"cropId":"4516a773-24b2-40e2-a60b-b59f753de2dc","percentage":25},{"cropId":"767fa6bc-2c63-4dc2-9f3d-2d7ade698776","percentage":25},{"cropId":"d61c2ed9-aa5e-49e7-b184-728c4ac1014b","percentage":25}]'::jsonb,
 NULL),
('afbf4c73-f5ae-44ab-9c64-078fc2b3f5da', 'Šalátový mix',
 ARRAY['8755eab2-a358-42cc-a4c8-db7e41c9c255'::uuid, '61c55b0a-d7aa-4d50-b517-2115b37ef3af'::uuid, '141bd195-6f78-4cf5-b506-d04ea5c46e06'::uuid, '767fa6bc-2c63-4dc2-9f3d-2d7ade698776'::uuid],
 '[{"cropId":"8755eab2-a358-42cc-a4c8-db7e41c9c255","percentage":30},{"cropId":"61c55b0a-d7aa-4d50-b517-2115b37ef3af","percentage":30},{"cropId":"141bd195-6f78-4cf5-b506-d04ea5c46e06","percentage":20},{"cropId":"767fa6bc-2c63-4dc2-9f3d-2d7ade698776","percentage":20}]'::jsonb,
 NULL)
ON CONFLICT (id) DO NOTHING;

-- DNI DORUČENIA (Delivery Days)
INSERT INTO delivery_days (id, name, day_of_week) VALUES
('1899f168-aece-4f54-a269-d84478726820', 'Utorok', 2),
('618aee2b-75c4-466c-9931-4cce70161338', 'Štvrtok', 4),
('8ad4f572-9a08-4200-b5d1-05e06680cee6', 'Piatok', 5)
ON CONFLICT (id) DO NOTHING;

-- TRASY DORUČENIA (Delivery Routes)
INSERT INTO delivery_routes (id, name, delivery_day_id, delivery_fee_home, delivery_fee_gastro, delivery_fee_wholesale, home_min_free_delivery, gastro_min_free_delivery, wholesale_min_free_delivery) VALUES
('1d2769c8-b665-4c39-a272-8d573b4e1375', 'Popradská oblasť', NULL, 0.00, 0.00, 0.00, 20, 30, 50),
('bcaff252-1b9d-489d-96db-d24b08b6bc3e', 'Spišská Nová Ves a okolie', NULL, 2.00, 2.00, 2.00, 15, 30, 50)
ON CONFLICT (id) DO NOTHING;

-- ZÁKAZNÍCI (Customers)
INSERT INTO customers (id, name, company_name, customer_type, email, phone, delivery_route_id) VALUES
('92f11cc1-46c5-4632-bfc3-98ff197a2288', 'Ján Richnavský', 'Spiš', 'gastro', NULL, NULL, NULL),
('6c44045c-1bd8-4b7e-bea8-8e8b84d49924', 'Ján Zeman', NULL, 'home', NULL, NULL, NULL),
('4b586b6b-d746-4607-8c60-ceefd479598a', 'Jozef Polomský', NULL, 'home', 'xdodox82@gmail.com', '+421905818695', NULL),
('617b48d5-4b15-4c9f-84d9-35118971e9d3', 'Marián Mereš', NULL, 'home', NULL, NULL, NULL),
('d21455ce-2db0-458c-ac44-370eea9a0d4b', 'MK Fruit s.r.o.', NULL, 'wholesale', NULL, NULL, NULL),
('6990b6e3-7303-42ef-af81-21b5bc9c5a61', 'Reštaurácia U Zeleného Stromu', NULL, 'gastro', 'info@zelenystrom.sk', '+421 900 123 456', NULL),
('27ee1f8d-18ba-473a-a908-668144c3312c', 'Test Testovic', NULL, 'home', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- CENY (Prices) - Pre jednotlivé plodiny
INSERT INTO prices (id, crop_id, blend_id, packaging_size, unit_price, customer_type) VALUES
-- Brokolica Calabrese
('cf0056a4-21a8-4dd2-ad37-049c0cfd54bc', '5ce1d7dd-c22a-4bc0-90bf-7d5ff41b0add', NULL, '100g', 7.5, 'home'),
('ac22d253-8912-444f-80bc-4afa844b608b', '5ce1d7dd-c22a-4bc0-90bf-7d5ff41b0add', NULL, '100g', 7.5, 'gastro'),
('5d30a312-1a3a-4dd7-8ca9-79551e6a46b8', '5ce1d7dd-c22a-4bc0-90bf-7d5ff41b0add', NULL, '50g', 4.2, 'home'),
('dfd366c2-4680-4922-8c10-9637ef01715a', '5ce1d7dd-c22a-4bc0-90bf-7d5ff41b0add', NULL, '50g', 4.5, 'gastro'),
-- Brokolice Raab
('dab45a2c-166a-41b9-b0ce-1fd77eec382b', 'eb50afbc-3af8-4484-ae1c-a48550bfcdae', NULL, '100g', 7.5, 'gastro'),
('933f1ed3-5ef1-43b5-b88a-dce4a151b138', 'eb50afbc-3af8-4484-ae1c-a48550bfcdae', NULL, '50g', 4.2, 'home'),
('31b67ae4-dc4c-4971-9208-7eececceb6df', 'eb50afbc-3af8-4484-ae1c-a48550bfcdae', NULL, '50g', 4.2, 'home'),
('89526816-e259-4be3-b703-99e01e00232a', 'eb50afbc-3af8-4484-ae1c-a48550bfcdae', NULL, '50g', 4.2, 'gastro'),
-- Červená kapusta
('6885f5f9-8e90-41fd-8c22-461b0a0acda4', '46eb6c9b-3854-42c4-bd8c-732809024faa', NULL, '100g', 7.5, 'home'),
('563e4737-111b-44d1-b6e9-d2b58e6071e9', '46eb6c9b-3854-42c4-bd8c-732809024faa', NULL, '100g', 7.5, 'gastro'),
('f103cee3-f78d-4915-9f44-0dd081f85a96', '46eb6c9b-3854-42c4-bd8c-732809024faa', NULL, '50g', 4.2, 'home'),
('794f35d6-da99-4bb6-820a-2a05ed3ca2c7', '46eb6c9b-3854-42c4-bd8c-732809024faa', NULL, '50g', 4.2, 'gastro'),
-- Cibule
('ab699cce-bb7a-4503-b5aa-372631167607', 'c5311150-00ec-434d-a44b-ea9d9aa6d5ef', NULL, '50g', 5, 'home'),
('4d90ab4c-2f51-40b0-a97f-50d7c6f315d3', 'c5311150-00ec-434d-a44b-ea9d9aa6d5ef', NULL, '50g', 5, 'gastro'),
-- Ďatelina
('f39e467e-bef0-413f-bba1-dcd5da5bd123', '911d605b-8a0e-4745-9184-163d830baed6', NULL, '100g', 7.5, 'home'),
('beab8b50-55c1-49ba-af4f-5303a74bf882', '911d605b-8a0e-4745-9184-163d830baed6', NULL, '100g', 7.5, 'gastro'),
('efaa1f81-e3b7-430d-b8e2-7cbfc4ece0e4', '911d605b-8a0e-4745-9184-163d830baed6', NULL, '50g', 4.2, 'home'),
('2f7b3400-5fa4-459e-8a12-09dd4c9f6f35', '911d605b-8a0e-4745-9184-163d830baed6', NULL, '50g', 4.2, 'gastro'),
-- Horčica biela
('9dccd7d1-5933-434d-8e0a-8ee393a0ca11', 'a70f7bf3-34d7-48e7-879d-503f884ca640', NULL, '100g', 7.5, 'home'),
('e41bfe20-2ff6-4245-a30e-c9251abadc51', 'a70f7bf3-34d7-48e7-879d-503f884ca640', NULL, '100g', 7.5, 'gastro'),
('2ead5cc5-376a-4a7e-aca2-575bb81c8ab2', 'a70f7bf3-34d7-48e7-879d-503f884ca640', NULL, '50g', 4.2, 'home'),
('2524c99d-5a6f-4cb9-a088-5936a9617251', 'a70f7bf3-34d7-48e7-879d-503f884ca640', NULL, '50g', 4.2, 'gastro'),
-- Hrach siaty Affyla
('468470d7-e173-4a1c-be79-823581bf249e', '8755eab2-a358-42cc-a4c8-db7e41c9c255', NULL, '100g', 6.7, 'home'),
('49df3e37-3377-4a10-b986-1c9b8c5653ec', '8755eab2-a358-42cc-a4c8-db7e41c9c255', NULL, '100g', 6.7, 'gastro'),
('fce5fbe7-331d-4273-b631-2062a38af200', '8755eab2-a358-42cc-a4c8-db7e41c9c255', NULL, '50g', 3.8, 'wholesale'),
('88cb39f5-d143-4055-ab39-da782b127826', '8755eab2-a358-42cc-a4c8-db7e41c9c255', NULL, '60g', 4, 'home'),
('7bb40a4d-0264-4d56-8134-65d0ff3fb31f', '8755eab2-a358-42cc-a4c8-db7e41c9c255', NULL, '60g', 4, 'gastro'),
-- Hrach vráskavý
('5ebcb659-7ac3-4f8f-ade2-8a69572a84db', '7d85e64c-16b1-43c9-9804-1be6549f6f3c', NULL, '100g', 6.7, 'home'),
('b7fad6df-ecd5-4a5f-92c6-2d67e5609157', '7d85e64c-16b1-43c9-9804-1be6549f6f3c', NULL, '100g', 6.7, 'gastro'),
('2be9dcef-35a6-41f5-a625-68ac5141f59d', '7d85e64c-16b1-43c9-9804-1be6549f6f3c', NULL, '60g', 4, 'home'),
('6b66d60d-4677-496d-82ac-19c005ecebe6', '7d85e64c-16b1-43c9-9804-1be6549f6f3c', NULL, '60g', 4, 'gastro'),
-- Kaleráb
('67e45af7-fb3e-4f95-a2cc-976424f2c22e', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, '100g', 7.5, 'home'),
('acd98e64-e32f-46a2-81cf-49c200ca7593', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, '100g', 7.5, 'gastro'),
('a1b886bf-edd0-471e-8d72-d2fc3adb98ae', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, '50g', 4.2, 'home'),
('3b9eaf03-ab68-489d-ad5b-a71d5ccb5ba4', '0d8930c5-62c4-47c9-b389-f942e362611f', NULL, '50g', 4.2, 'gastro'),
-- Koriander
('513a03fb-3302-4249-a400-38d2c28713c1', '981c213a-4dc5-43cf-ab2f-df0e03cbd2b0', NULL, '50g', 5.9, 'gastro'),
('fdcc6e73-2ab8-47db-834f-5be250016609', '981c213a-4dc5-43cf-ab2f-df0e03cbd2b0', NULL, '50g', 5.9, 'home'),
-- Mizuna červená
('56db014d-703a-499f-986c-d8c77cc39c6b', '6c58dbf3-5749-4cf9-8db9-06e426b34d5f', NULL, '100g', 7.5, 'home'),
('6f6690bc-cd43-4742-8f62-cff9ad8bc005', '6c58dbf3-5749-4cf9-8db9-06e426b34d5f', NULL, '100g', 7.5, 'gastro'),
('fb475f94-7ad2-403d-b2bd-19f88227286a', '6c58dbf3-5749-4cf9-8db9-06e426b34d5f', NULL, '50g', 4.2, 'home'),
('6870e80c-4e7c-49c3-8f3d-dc499d2e46d7', '6c58dbf3-5749-4cf9-8db9-06e426b34d5f', NULL, '50g', 4.2, 'gastro'),
-- Nechtík
('59b3e76a-6f14-4666-ad32-6f98f867e6aa', '50acd2ac-b696-4c0b-902e-8b8d9b4998a3', NULL, '100g', 9.00, 'home'),
('ece7755f-dc04-40b5-bf90-49bb004cd42f', '50acd2ac-b696-4c0b-902e-8b8d9b4998a3', NULL, '100g', 7.50, 'gastro'),
('1cde3578-a1f7-4244-89e2-4b9f4b60dbb2', '50acd2ac-b696-4c0b-902e-8b8d9b4998a3', NULL, '100g', 6.30, 'wholesale'),
('34c79799-d11a-49ef-8819-156ca49ee580', '50acd2ac-b696-4c0b-902e-8b8d9b4998a3', NULL, '50g', 5, 'all'),
('0b5be803-a1d7-4f45-8da9-99ef0cca37a2', '50acd2ac-b696-4c0b-902e-8b8d9b4998a3', NULL, '50g', 4.20, 'gastro'),
('4e78f0bc-cb3a-4729-8c03-bf25beba89b5', '50acd2ac-b696-4c0b-902e-8b8d9b4998a3', NULL, '60g', 5.80, 'home'),
('73e043fd-da3b-4807-b520-3e384af8852d', '50acd2ac-b696-4c0b-902e-8b8d9b4998a3', NULL, '70g', 6.50, 'home'),
-- Pak choi
('dec12d68-ada3-491d-a7e8-089ac6602625', 'c4e85553-fdd7-4fea-8e99-ea816bbc7222', NULL, '100g', 7.5, 'home'),
('517f8397-85cd-452c-8c79-0d1896375e6d', 'c4e85553-fdd7-4fea-8e99-ea816bbc7222', NULL, '100g', 7.5, 'gastro'),
('cdb4d92c-581b-450f-9837-ecbc7e30efe6', 'c4e85553-fdd7-4fea-8e99-ea816bbc7222', NULL, '50g', 4.2, 'home'),
('5714e6bf-0521-4fe3-9a29-b330cc1ef647', 'c4e85553-fdd7-4fea-8e99-ea816bbc7222', NULL, '50g', 4.2, 'gastro'),
-- Reďkovky
('ae26437e-cfe1-4376-aa43-0ac37ad27d83', '141bd195-6f78-4cf5-b506-d04ea5c46e06', NULL, '100g', 7.2, 'home'),
('66304ddd-21ee-4f08-b7a6-c917d7e71e1d', '141bd195-6f78-4cf5-b506-d04ea5c46e06', NULL, '100g', 7.5, 'gastro'),
('0fa74ac2-a20a-4bdf-996b-4f208ab99c37', '141bd195-6f78-4cf5-b506-d04ea5c46e06', NULL, '60g', 4.5, 'home'),
('94d64cde-247e-408c-b5b2-1c7e20259857', '141bd195-6f78-4cf5-b506-d04ea5c46e06', NULL, '60g', 4.5, 'gastro'),
('5143a604-1a09-42f0-8557-55690c2719d2', '4516a773-24b2-40e2-a60b-b59f753de2dc', NULL, '100g', 7.2, 'gastro'),
('159f4556-c527-4067-b6aa-d165691241bc', '4516a773-24b2-40e2-a60b-b59f753de2dc', NULL, '100g', 7.2, 'home'),
('0d62c9f6-3ea4-41b9-bcdb-21ce593a8144', '4516a773-24b2-40e2-a60b-b59f753de2dc', NULL, '60g', 4.5, 'home'),
('e0611684-1a7d-4dc2-853d-958c80108a5e', '4516a773-24b2-40e2-a60b-b59f753de2dc', NULL, '60g', 4.5, 'gastro'),
('a583b832-2a41-4376-9748-23f8263bc832', '767fa6bc-2c63-4dc2-9f3d-2d7ade698776', NULL, '100g', 7.2, 'home'),
('20f03e1e-e692-4232-8fc0-daf5578a6e4d', '767fa6bc-2c63-4dc2-9f3d-2d7ade698776', NULL, '100g', 7.2, 'gastro'),
('0c702e95-8cb2-4898-ab91-68046c817729', '767fa6bc-2c63-4dc2-9f3d-2d7ade698776', NULL, '60g', 4.5, 'home'),
('0e7112e6-49b4-4f21-99c4-c71944fbf02d', '767fa6bc-2c63-4dc2-9f3d-2d7ade698776', NULL, '60g', 4.5, 'gastro'),
('0135c13c-33cb-43b4-9dfe-8b7728f40e37', 'd61c2ed9-aa5e-49e7-b184-728c4ac1014b', NULL, '100g', 7.2, 'gastro'),
('022f1db4-cccc-42ec-8143-e2e17ab6aeaf', 'd61c2ed9-aa5e-49e7-b184-728c4ac1014b', NULL, '100g', 7.2, 'home'),
('121642e5-edf5-4c1e-8eaf-292bc02599ac', 'd61c2ed9-aa5e-49e7-b184-728c4ac1014b', NULL, '60g', 4.5, 'home'),
('1a37734a-0e2f-4f22-ab9d-940316f1657c', 'd61c2ed9-aa5e-49e7-b184-728c4ac1014b', NULL, '60g', 4.5, 'gastro'),
-- Řepa
('42274e51-ccbb-4b0e-bc32-f093268eabc5', '413e9d45-61e1-483f-9d2c-7059a46d1824', NULL, '50g', 5.9, 'home'),
('2ad187d8-a763-4397-8105-17f8a7671994', '413e9d45-61e1-483f-9d2c-7059a46d1824', NULL, '50g', 5.9, 'gastro'),
-- Rukola
('4df0cfc8-7c59-48c0-a010-1d4d265063b2', 'be602410-3225-4f88-8797-b49b201b154d', NULL, '50g', 4.2, 'home'),
('9801f743-fb97-4143-a42c-70df9655c519', 'be602410-3225-4f88-8797-b49b201b154d', NULL, '50g', 4.2, 'gastro'),
-- Slnečnica
('9576f700-f015-4785-b18e-59532fad1447', '61c55b0a-d7aa-4d50-b517-2115b37ef3af', NULL, '100g', 6.7, 'home'),
('b8ea14c8-e692-4a65-98c1-dee57c7095ca', '61c55b0a-d7aa-4d50-b517-2115b37ef3af', NULL, '100g', 6.7, 'gastro'),
('ca254d2a-6b11-493e-aed8-d091a6c95aea', '61c55b0a-d7aa-4d50-b517-2115b37ef3af', NULL, '60g', 4, 'home'),
('90ef6719-5f9b-4acd-8c49-d5af1ce6991d', '61c55b0a-d7aa-4d50-b517-2115b37ef3af', NULL, '60g', 4, 'gastro'),
-- Žerucha
('9922ee56-3b7b-46df-87e7-ad8d138069b0', '4e288b08-686c-4c92-9461-852eb6562111', NULL, '100g', 7.5, 'home'),
('e84d1089-11ce-49cf-9fd4-8c64ef0332f3', '4e288b08-686c-4c92-9461-852eb6562111', NULL, '100g', 7.5, 'gastro'),
('74099d5d-2692-4e64-a992-8ad8add16e44', '4e288b08-686c-4c92-9461-852eb6562111', NULL, '50g', 4.2, 'home'),
('15d8d57e-0fbe-475e-9a4d-de15abfb4c18', '4e288b08-686c-4c92-9461-852eb6562111', NULL, '50g', 4.2, 'gastro')
ON CONFLICT (id) DO NOTHING;

-- CENY (Prices) - Pre mixy
INSERT INTO prices (id, crop_id, blend_id, packaging_size, unit_price, customer_type) VALUES
-- Mikrozelenina mix 100g
('218d10f7-a83e-4d7d-a866-e1c2d3d4ff9f', NULL, '7f774011-6c7d-4b26-9809-0d84838be63d', '100g', 4.00, 'gastro'),
('96e4fbf5-ec9e-4edf-bf9a-a038eb8621c6', NULL, '7f774011-6c7d-4b26-9809-0d84838be63d', '100g', 3.40, 'wholesale'),
('429bdc68-b062-4611-aac3-7e7c15042614', NULL, '7f774011-6c7d-4b26-9809-0d84838be63d', '100g', 4.80, 'home'),
('1dde9b87-b513-427a-b492-15b77f60160b', NULL, '7f774011-6c7d-4b26-9809-0d84838be63d', '50g', 2.80, 'home'),
('5b8df3eb-d2b3-4d1b-9ff6-3a03abd72016', NULL, '7f774011-6c7d-4b26-9809-0d84838be63d', '70g', 3.60, 'home'),
-- Mikrozelenina mix 70g
('27c85b16-b08b-464c-8913-17ada4e01a9b', NULL, '3a83cfea-a56c-406e-a689-001033983e84', '100g', 3.40, 'wholesale'),
('6b61f732-2e50-41c2-b4fc-9b9fca797729', NULL, '3a83cfea-a56c-406e-a689-001033983e84', '100g', 4.00, 'gastro'),
('26a92321-782d-4f26-b716-b9046b25d62c', NULL, '3a83cfea-a56c-406e-a689-001033983e84', '100g', 4.80, 'home'),
('0c813850-8732-465e-a7bb-51f19ad527d7', NULL, '3a83cfea-a56c-406e-a689-001033983e84', '50g', 2.80, 'home'),
('dff8f5dc-06d6-477b-b078-7a66b0b8c8a9', NULL, '3a83cfea-a56c-406e-a689-001033983e84', '70g', 3.60, 'home'),
-- Reďkovkový mix
('0a1bb191-b613-45dd-8c11-9cd040f0c1ce', NULL, 'f007604f-aa71-4f1f-ad3e-557ec4bae5d1', '100g', 7.6, 'gastro'),
('7268978d-6b99-43d1-8d26-b800c6fb33aa', NULL, 'f007604f-aa71-4f1f-ad3e-557ec4bae5d1', '70g', 5.5, 'gastro'),
-- Šalátový mix
('f6b5027a-1310-43ed-8133-ca534c91fae5', NULL, 'afbf4c73-f5ae-44ab-9c64-078fc2b3f5da', '100g', 7.6, 'home'),
('9cf5ab75-2435-4073-97f4-86b0b62b7471', NULL, 'afbf4c73-f5ae-44ab-9c64-078fc2b3f5da', '100g', 7.6, 'gastro'),
('ba4f9f1d-d289-411e-87ad-0ba48a021448', NULL, 'afbf4c73-f5ae-44ab-9c64-078fc2b3f5da', '70g', 5.5, 'home'),
('20bcab7e-1560-4c89-bf3c-8713fb8082e6', NULL, 'afbf4c73-f5ae-44ab-9c64-078fc2b3f5da', '70g', 5.5, 'gastro')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- HOTOVO!
-- ============================================
-- Všetky základné dáta boli vložené do databázy
-- Môžeš teraz začať používať svoju aplikáciu
-- ============================================
