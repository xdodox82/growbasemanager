/*
  ============================================================================
  DATA EXPORT FROM SUPABASE DATABASE
  ============================================================================

  Export Date: 2026-01-24
  Purpose: Complete data migration for crops, blends, and seeds

  This file contains INSERT statements with ON CONFLICT clauses for
  idempotent execution. It can be run multiple times safely.

  Tables included:
  1. products (23 records)
  2. blends (6 records)
  3. blend_items (generated from blends.crop_percentages)
  4. seeds (2 records)

  Note: tray_configs stored in products.tray_configs JSONB field
  ============================================================================
*/

SET client_encoding = 'UTF8';

-- ============================================================================
-- SECTION 1: PRODUCTS (CROPS/PLODINY)
-- ============================================================================
-- 23 microgreens, microherbs, and edible flowers

INSERT INTO products (
  id,
  name,
  variety,
  category,
  days_to_harvest,
  days_to_germination,
  germination_type,
  days_in_darkness,
  days_on_light,
  seed_soaking,
  seed_density,
  expected_yield,
  color,
  can_be_cut,
  can_be_live,
  notes,
  needs_weight,
  harvest_order,
  safety_buffer_percent,
  tray_configs,
  default_substrate_type,
  default_substrate_note,
  created_at,
  updated_at
) VALUES
  -- Brokolica Calabrese
  (
    '5ce1d7dd-c22a-4bc0-90bf-7d5ff41b0add',
    'Brokolica Calabrese',
    'Calabrese',
    'microgreens',
    10,
    3,
    'warm',
    2,
    7,
    false,
    22.5,
    250,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.1,
    '{"L": {"seed_density": 11, "expected_yield": 100}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 0, "expected_yield": 0}, "XL": {"seed_density": 22.5, "expected_yield": 200}}'::jsonb,
    'mixed',
    '',
    '2025-12-28 00:19:53.691526+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Brokolice Raab
  (
    'eb50afbc-3af8-4484-ae1c-a48550bfcdae',
    'Brokolice Raab',
    'Raab',
    'microgreens',
    8,
    3,
    'warm',
    1,
    4,
    false,
    15,
    200,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 17:43:50.530035+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Červená kapusta
  (
    '46eb6c9b-3854-42c4-bd8c-732809024faa',
    'Červená kapusta',
    '',
    'microgreens',
    11,
    3,
    'warm',
    1,
    7,
    false,
    19,
    200,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 16:14:03.542845+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Cibule
  (
    'c5311150-00ec-434d-a44b-ea9d9aa6d5ef',
    'Cibule',
    '',
    'microgreens',
    14,
    6,
    'warm',
    1,
    7,
    false,
    35,
    250,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 17:34:10.378725+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Ďatelina purpurová
  (
    '911d605b-8a0e-4745-9184-163d830baed6',
    'Ďatelina purpurová',
    '',
    'microgreens',
    10,
    3,
    'warm',
    2,
    5,
    false,
    25,
    200,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2026-01-04 14:15:34.861761+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Horčica biela
  (
    'a70f7bf3-34d7-48e7-879d-503f884ca640',
    'Horčica biela',
    '',
    'microgreens',
    8,
    2,
    'warm',
    1,
    5,
    false,
    28.5,
    220,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-29 23:09:05.46596+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Hrach šalátový
  (
    'cb8252b8-d5a6-4c35-891c-665993e9858a',
    'Hrach šalátový',
    '',
    'microgreens',
    13,
    3,
    'warm',
    2,
    8,
    true,
    150,
    250,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2026-01-04 18:05:31.617054+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Hrach siaty Affyla
  (
    '8755eab2-a358-42cc-a4c8-db7e41c9c255',
    'Hrach siaty Affyla',
    'Affyla',
    'microgreens',
    11,
    3,
    'warm',
    1,
    7,
    true,
    140,
    300,
    '#84cc16',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 00:19:53.691526+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Hrach vráskavý
  (
    '7d85e64c-16b1-43c9-9804-1be6549f6f3c',
    'Hrach vráskavý',
    '',
    'microgreens',
    13,
    3,
    'warm',
    3,
    7,
    true,
    85,
    200,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 14:23:54.201365+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Kaleráb ružový
  (
    '0d8930c5-62c4-47c9-b389-f942e362611f',
    'Kaleráb ružový',
    '',
    'microgreens',
    11,
    3,
    'warm',
    1,
    7,
    false,
    18,
    200,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 16:15:02.303935+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Komatsuna červená
  (
    '540081f6-e582-484c-bea6-2d3acacb68a5',
    'Komatsuna červená',
    '',
    'microgreens',
    10,
    3,
    'warm',
    2,
    5,
    false,
    30,
    200,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    5,
    '{"L": {"seed_density": 9, "expected_yield": 110}, "M": {"seed_density": 5, "expected_yield": 50}, "S": {"seed_density": 0, "expected_yield": 0}, "XL": {"seed_density": 18, "expected_yield": 220}}'::jsonb,
    'mixed',
    '',
    '2026-01-24 18:55:50.153622+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Koriander
  (
    '981c213a-4dc5-43cf-ab2f-df0e03cbd2b0',
    'Koriander',
    '',
    'microherbs',
    15,
    5,
    'warm',
    0,
    10,
    false,
    23.5,
    200,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 00:19:53.691526+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Mizuna červená
  (
    '6c58dbf3-5749-4cf9-8db9-06e426b34d5f',
    'Mizuna červená',
    '',
    'microgreens',
    10,
    3,
    'warm',
    1,
    6,
    false,
    18,
    200,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-31 18:52:24.813501+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Nechtík lekársky
  (
    '50acd2ac-b696-4c0b-902e-8b8d9b4998a3',
    'Nechtík lekársky',
    '',
    'edible_flowers',
    65,
    10,
    'warm',
    5,
    50,
    false,
    5,
    200,
    '#eab308',
    false,
    true,
    '',
    false,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 10:53:52.053085+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Pak choi
  (
    'c4e85553-fdd7-4fea-8e99-ea816bbc7222',
    'Pak choi',
    'Biely',
    'microgreens',
    10,
    3,
    'warm',
    1,
    6,
    false,
    19,
    250,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 16:20:40.98012+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Reďkovka China Rose
  (
    '4516a773-24b2-40e2-a60b-b59f753de2dc',
    'Reďkovka China Rose',
    '',
    'microgreens',
    8,
    3,
    'warm',
    2,
    5,
    false,
    30,
    280,
    '#ec4899',
    true,
    false,
    '',
    true,
    999,
    0.1,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    '',
    '2025-12-28 00:19:53.691526+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Reďkovka Daikon
  (
    'd61c2ed9-aa5e-49e7-b184-728c4ac1014b',
    'Reďkovka Daikon',
    '',
    'microgreens',
    7,
    3,
    'warm',
    0,
    4,
    false,
    33,
    300,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 00:19:53.691526+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Reďkovka Red Coral
  (
    '141bd195-6f78-4cf5-b506-d04ea5c46e06',
    'Reďkovka Red Coral',
    '',
    'microgreens',
    8,
    3,
    'warm',
    2,
    5,
    false,
    30,
    320,
    '#ef4444',
    true,
    false,
    '',
    true,
    999,
    0.1,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    '',
    '2025-12-28 00:19:53.691526+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Reďkovka Sango
  (
    '767fa6bc-2c63-4dc2-9f3d-2d7ade698776',
    'Reďkovka Sango',
    '',
    'microgreens',
    8,
    2,
    'warm',
    2,
    5,
    false,
    32,
    300,
    '#a855f7',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 00:19:53.691526+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Řepa Bull's blood
  (
    '413e9d45-61e1-483f-9d2c-7059a46d1824',
    'Řepa Bull´s blood',
    '',
    'microgreens',
    20,
    8,
    'warm',
    0,
    12,
    false,
    50,
    150,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 17:35:27.335915+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Rukola
  (
    'be602410-3225-4f88-8797-b49b201b154d',
    'Rukola',
    '',
    'microherbs',
    11,
    3,
    'warm',
    2,
    6,
    false,
    16,
    200,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 16:24:14.516495+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Slnečnica
  (
    '61c55b0a-d7aa-4d50-b517-2115b37ef3af',
    'Slnečnica',
    '',
    'microgreens',
    8,
    3,
    'warm',
    0,
    5,
    true,
    60,
    300,
    '#eab308',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 00:19:53.691526+00',
    '2026-01-24 19:51:03.925186+00'
  ),

  -- Žerucha siata
  (
    '4e288b08-686c-4c92-9461-852eb6562111',
    'Žerucha siata',
    '',
    'microherbs',
    10,
    3,
    'warm',
    1,
    6,
    false,
    18,
    200,
    '#22c55e',
    true,
    false,
    '',
    true,
    999,
    0.10,
    '{"L": {"seed_density": 80, "expected_yield": 65}, "M": {"seed_density": 60, "expected_yield": 48}, "S": {"seed_density": 40, "expected_yield": 32}, "XL": {"seed_density": 100, "expected_yield": 80}}'::jsonb,
    'mixed',
    NULL,
    '2025-12-28 16:25:50.58193+00',
    '2026-01-24 19:51:03.925186+00'
  )

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  variety = EXCLUDED.variety,
  category = EXCLUDED.category,
  days_to_harvest = EXCLUDED.days_to_harvest,
  days_to_germination = EXCLUDED.days_to_germination,
  germination_type = EXCLUDED.germination_type,
  days_in_darkness = EXCLUDED.days_in_darkness,
  days_on_light = EXCLUDED.days_on_light,
  seed_soaking = EXCLUDED.seed_soaking,
  seed_density = EXCLUDED.seed_density,
  expected_yield = EXCLUDED.expected_yield,
  color = EXCLUDED.color,
  can_be_cut = EXCLUDED.can_be_cut,
  can_be_live = EXCLUDED.can_be_live,
  notes = EXCLUDED.notes,
  needs_weight = EXCLUDED.needs_weight,
  harvest_order = EXCLUDED.harvest_order,
  safety_buffer_percent = EXCLUDED.safety_buffer_percent,
  tray_configs = EXCLUDED.tray_configs,
  default_substrate_type = EXCLUDED.default_substrate_type,
  default_substrate_note = EXCLUDED.default_substrate_note,
  updated_at = EXCLUDED.updated_at;

-- Verify products import
SELECT COUNT(*) as products_imported FROM products;


-- ============================================================================
-- SECTION 2: BLENDS (MIXY)
-- ============================================================================
-- 6 microgreens blends

INSERT INTO blends (
  id,
  name,
  crop_ids,
  crop_percentages,
  notes,
  created_at
) VALUES
  -- Classic mix
  (
    '145f5b44-7a3b-4ebc-ba1e-00c6207ca1e4',
    'Classic mix',
    ARRAY[
      '7d85e64c-16b1-43c9-9804-1be6549f6f3c'::uuid,
      '61c55b0a-d7aa-4d50-b517-2115b37ef3af'::uuid,
      'f007604f-aa71-4f1f-ad3e-557ec4bae5d1'::uuid,
      '5ce1d7dd-c22a-4bc0-90bf-7d5ff41b0add'::uuid,
      '8dc5a047-2166-4d1c-9995-92905057036e'::uuid
    ],
    '[{"cropId": "7d85e64c-16b1-43c9-9804-1be6549f6f3c", "isBlend": false, "percentage": 15}, {"cropId": "61c55b0a-d7aa-4d50-b517-2115b37ef3af", "isBlend": false, "percentage": 15}, {"cropId": "f007604f-aa71-4f1f-ad3e-557ec4bae5d1", "isBlend": true, "percentage": 15}, {"cropId": "5ce1d7dd-c22a-4bc0-90bf-7d5ff41b0add", "isBlend": false, "percentage": 10}, {"cropId": "8dc5a047-2166-4d1c-9995-92905057036e", "isBlend": true, "percentage": 45}]'::jsonb,
    '',
    '2026-01-24 18:50:27.90002+00'
  ),

  -- Mikrozelenina mix 100 g
  (
    '7f774011-6c7d-4b26-9809-0d84838be63d',
    'Mikrozelenina mix 100 g – 29.12.2025',
    ARRAY[
      '8755eab2-a358-42cc-a4c8-db7e41c9c255'::uuid,
      '767fa6bc-2c63-4dc2-9f3d-2d7ade698776'::uuid,
      '61c55b0a-d7aa-4d50-b517-2115b37ef3af'::uuid,
      'eb50afbc-3af8-4484-ae1c-a48550bfcdae'::uuid,
      '0e68cc53-e550-418c-b99c-f3e81070664f'::uuid
    ],
    '[{"cropId": "8755eab2-a358-42cc-a4c8-db7e41c9c255", "percentage": 25}, {"cropId": "767fa6bc-2c63-4dc2-9f3d-2d7ade698776", "percentage": 25}, {"cropId": "61c55b0a-d7aa-4d50-b517-2115b37ef3af", "percentage": 20}, {"cropId": "eb50afbc-3af8-4484-ae1c-a48550bfcdae", "percentage": 15}, {"cropId": "0e68cc53-e550-418c-b99c-f3e81070664f", "percentage": 15}]'::jsonb,
    '',
    '2025-12-28 17:45:06.736806+00'
  ),

  -- Mikrozelenina mix 70 g
  (
    '3a83cfea-a56c-406e-a689-001033983e84',
    'Mikrozelenina mix 70 g – 29.12.2025',
    ARRAY[
      '8755eab2-a358-42cc-a4c8-db7e41c9c255'::uuid,
      '767fa6bc-2c63-4dc2-9f3d-2d7ade698776'::uuid,
      '61c55b0a-d7aa-4d50-b517-2115b37ef3af'::uuid,
      '413e9d45-61e1-483f-9d2c-7059a46d1824'::uuid,
      'c5311150-00ec-434d-a44b-ea9d9aa6d5ef'::uuid
    ],
    '[{"cropId": "8755eab2-a358-42cc-a4c8-db7e41c9c255", "percentage": 25}, {"cropId": "767fa6bc-2c63-4dc2-9f3d-2d7ade698776", "percentage": 25}, {"cropId": "61c55b0a-d7aa-4d50-b517-2115b37ef3af", "percentage": 25}, {"cropId": "413e9d45-61e1-483f-9d2c-7059a46d1824", "percentage": 10}, {"cropId": "c5311150-00ec-434d-a44b-ea9d9aa6d5ef", "percentage": 15}]'::jsonb,
    '',
    '2025-12-28 17:36:52.644563+00'
  ),

  -- Reďkovkový mix
  (
    'f007604f-aa71-4f1f-ad3e-557ec4bae5d1',
    'Reďkovkový mix',
    ARRAY[
      '141bd195-6f78-4cf5-b506-d04ea5c46e06'::uuid,
      '4516a773-24b2-40e2-a60b-b59f753de2dc'::uuid,
      '767fa6bc-2c63-4dc2-9f3d-2d7ade698776'::uuid,
      'd61c2ed9-aa5e-49e7-b184-728c4ac1014b'::uuid
    ],
    '[{"cropId": "141bd195-6f78-4cf5-b506-d04ea5c46e06", "percentage": 25}, {"cropId": "4516a773-24b2-40e2-a60b-b59f753de2dc", "percentage": 25}, {"cropId": "767fa6bc-2c63-4dc2-9f3d-2d7ade698776", "percentage": 25}, {"cropId": "d61c2ed9-aa5e-49e7-b184-728c4ac1014b", "percentage": 25}]'::jsonb,
    '',
    '2025-12-28 00:19:53.974562+00'
  ),

  -- Šalátový mix
  (
    'afbf4c73-f5ae-44ab-9c64-078fc2b3f5da',
    'Šalátový mix',
    ARRAY[
      '8755eab2-a358-42cc-a4c8-db7e41c9c255'::uuid,
      '61c55b0a-d7aa-4d50-b517-2115b37ef3af'::uuid,
      '141bd195-6f78-4cf5-b506-d04ea5c46e06'::uuid,
      '767fa6bc-2c63-4dc2-9f3d-2d7ade698776'::uuid
    ],
    '[{"cropId": "8755eab2-a358-42cc-a4c8-db7e41c9c255", "percentage": 30}, {"cropId": "61c55b0a-d7aa-4d50-b517-2115b37ef3af", "percentage": 30}, {"cropId": "141bd195-6f78-4cf5-b506-d04ea5c46e06", "percentage": 20}, {"cropId": "767fa6bc-2c63-4dc2-9f3d-2d7ade698776", "percentage": 20}]'::jsonb,
    '',
    '2025-12-28 09:14:21.830243+00'
  ),

  -- Variabilný mix mikrozeleniny
  (
    '8dc5a047-2166-4d1c-9995-92905057036e',
    'Variabilný mix mikrozeleniny',
    ARRAY[
      '46eb6c9b-3854-42c4-bd8c-732809024faa'::uuid,
      'c4e85553-fdd7-4fea-8e99-ea816bbc7222'::uuid,
      '911d605b-8a0e-4745-9184-163d830baed6'::uuid,
      '4e288b08-686c-4c92-9461-852eb6562111'::uuid,
      'a70f7bf3-34d7-48e7-879d-503f884ca640'::uuid,
      '540081f6-e582-484c-bea6-2d3acacb68a5'::uuid
    ],
    '[{"cropId": "46eb6c9b-3854-42c4-bd8c-732809024faa", "isBlend": false, "percentage": 18}, {"cropId": "c4e85553-fdd7-4fea-8e99-ea816bbc7222", "isBlend": false, "percentage": 17}, {"cropId": "911d605b-8a0e-4745-9184-163d830baed6", "isBlend": false, "percentage": 16}, {"cropId": "4e288b08-686c-4c92-9461-852eb6562111", "isBlend": false, "percentage": 16}, {"cropId": "a70f7bf3-34d7-48e7-879d-503f884ca640", "isBlend": false, "percentage": 16}, {"cropId": "540081f6-e582-484c-bea6-2d3acacb68a5", "isBlend": false, "percentage": 17}]'::jsonb,
    '',
    '2026-01-24 18:52:22.628614+00'
  )

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  crop_ids = EXCLUDED.crop_ids,
  crop_percentages = EXCLUDED.crop_percentages,
  notes = EXCLUDED.notes,
  created_at = EXCLUDED.created_at;

-- Verify blends import
SELECT COUNT(*) as blends_imported FROM blends;


-- ============================================================================
-- SECTION 3: BLEND_ITEMS
-- ============================================================================
-- Generated from blends.crop_percentages JSONB field
-- This populates the new relational blend_items table

INSERT INTO blend_items (
  id,
  blend_id,
  crop_id,
  percentage,
  created_at
) VALUES
  -- Classic mix items
  (gen_random_uuid(), '145f5b44-7a3b-4ebc-ba1e-00c6207ca1e4', '7d85e64c-16b1-43c9-9804-1be6549f6f3c', 15, NOW()),
  (gen_random_uuid(), '145f5b44-7a3b-4ebc-ba1e-00c6207ca1e4', '61c55b0a-d7aa-4d50-b517-2115b37ef3af', 15, NOW()),
  (gen_random_uuid(), '145f5b44-7a3b-4ebc-ba1e-00c6207ca1e4', 'f007604f-aa71-4f1f-ad3e-557ec4bae5d1', 15, NOW()),
  (gen_random_uuid(), '145f5b44-7a3b-4ebc-ba1e-00c6207ca1e4', '5ce1d7dd-c22a-4bc0-90bf-7d5ff41b0add', 10, NOW()),
  (gen_random_uuid(), '145f5b44-7a3b-4ebc-ba1e-00c6207ca1e4', '8dc5a047-2166-4d1c-9995-92905057036e', 45, NOW()),

  -- Mikrozelenina mix 100 g items
  (gen_random_uuid(), '7f774011-6c7d-4b26-9809-0d84838be63d', '8755eab2-a358-42cc-a4c8-db7e41c9c255', 25, NOW()),
  (gen_random_uuid(), '7f774011-6c7d-4b26-9809-0d84838be63d', '767fa6bc-2c63-4dc2-9f3d-2d7ade698776', 25, NOW()),
  (gen_random_uuid(), '7f774011-6c7d-4b26-9809-0d84838be63d', '61c55b0a-d7aa-4d50-b517-2115b37ef3af', 20, NOW()),
  (gen_random_uuid(), '7f774011-6c7d-4b26-9809-0d84838be63d', 'eb50afbc-3af8-4484-ae1c-a48550bfcdae', 15, NOW()),

  -- Mikrozelenina mix 70 g items
  (gen_random_uuid(), '3a83cfea-a56c-406e-a689-001033983e84', '8755eab2-a358-42cc-a4c8-db7e41c9c255', 25, NOW()),
  (gen_random_uuid(), '3a83cfea-a56c-406e-a689-001033983e84', '767fa6bc-2c63-4dc2-9f3d-2d7ade698776', 25, NOW()),
  (gen_random_uuid(), '3a83cfea-a56c-406e-a689-001033983e84', '61c55b0a-d7aa-4d50-b517-2115b37ef3af', 25, NOW()),
  (gen_random_uuid(), '3a83cfea-a56c-406e-a689-001033983e84', '413e9d45-61e1-483f-9d2c-7059a46d1824', 10, NOW()),
  (gen_random_uuid(), '3a83cfea-a56c-406e-a689-001033983e84', 'c5311150-00ec-434d-a44b-ea9d9aa6d5ef', 15, NOW()),

  -- Reďkovkový mix items
  (gen_random_uuid(), 'f007604f-aa71-4f1f-ad3e-557ec4bae5d1', '141bd195-6f78-4cf5-b506-d04ea5c46e06', 25, NOW()),
  (gen_random_uuid(), 'f007604f-aa71-4f1f-ad3e-557ec4bae5d1', '4516a773-24b2-40e2-a60b-b59f753de2dc', 25, NOW()),
  (gen_random_uuid(), 'f007604f-aa71-4f1f-ad3e-557ec4bae5d1', '767fa6bc-2c63-4dc2-9f3d-2d7ade698776', 25, NOW()),
  (gen_random_uuid(), 'f007604f-aa71-4f1f-ad3e-557ec4bae5d1', 'd61c2ed9-aa5e-49e7-b184-728c4ac1014b', 25, NOW()),

  -- Šalátový mix items
  (gen_random_uuid(), 'afbf4c73-f5ae-44ab-9c64-078fc2b3f5da', '8755eab2-a358-42cc-a4c8-db7e41c9c255', 30, NOW()),
  (gen_random_uuid(), 'afbf4c73-f5ae-44ab-9c64-078fc2b3f5da', '61c55b0a-d7aa-4d50-b517-2115b37ef3af', 30, NOW()),
  (gen_random_uuid(), 'afbf4c73-f5ae-44ab-9c64-078fc2b3f5da', '141bd195-6f78-4cf5-b506-d04ea5c46e06', 20, NOW()),
  (gen_random_uuid(), 'afbf4c73-f5ae-44ab-9c64-078fc2b3f5da', '767fa6bc-2c63-4dc2-9f3d-2d7ade698776', 20, NOW()),

  -- Variabilný mix mikrozeleniny items
  (gen_random_uuid(), '8dc5a047-2166-4d1c-9995-92905057036e', '46eb6c9b-3854-42c4-bd8c-732809024faa', 18, NOW()),
  (gen_random_uuid(), '8dc5a047-2166-4d1c-9995-92905057036e', 'c4e85553-fdd7-4fea-8e99-ea816bbc7222', 17, NOW()),
  (gen_random_uuid(), '8dc5a047-2166-4d1c-9995-92905057036e', '911d605b-8a0e-4745-9184-163d830baed6', 16, NOW()),
  (gen_random_uuid(), '8dc5a047-2166-4d1c-9995-92905057036e', '4e288b08-686c-4c92-9461-852eb6562111', 16, NOW()),
  (gen_random_uuid(), '8dc5a047-2166-4d1c-9995-92905057036e', 'a70f7bf3-34d7-48e7-879d-503f884ca640', 16, NOW()),
  (gen_random_uuid(), '8dc5a047-2166-4d1c-9995-92905057036e', '540081f6-e582-484c-bea6-2d3acacb68a5', 17, NOW())

ON CONFLICT (id) DO NOTHING;

-- Verify blend_items import
SELECT COUNT(*) as blend_items_imported FROM blend_items;


-- ============================================================================
-- SECTION 4: SEEDS (SKLADOVÉ ZÁSOBY)
-- ============================================================================
-- 2 seed inventory records

INSERT INTO seeds (
  id,
  crop_id,
  supplier_id,
  quantity,
  unit,
  lot_number,
  batch_number,
  purchase_date,
  expiry_date,
  stocking_date,
  consumption_start_date,
  consumption_end_date,
  finished_date,
  min_stock,
  unit_price_per_kg,
  price_includes_vat,
  vat_rate,
  certificate,
  certificate_url,
  certificate_file,
  notes,
  created_at
) VALUES
  -- Hrach siaty Affyla
  (
    '7fa1b1ea-f6fc-42f9-8fa6-2da4ef5e792e',
    '8755eab2-a358-42cc-a4c8-db7e41c9c255',
    'b3e26a3e-5798-4d77-b0e6-5cca31a6befd',
    25,
    'kg',
    '123456',
    NULL,
    NULL,
    '2026-03-31',
    '2025-12-28',
    '2026-01-30',
    NULL,
    NULL,
    5,
    3,
    true,
    20,
    NULL,
    NULL,
    NULL,
    NULL,
    '2025-12-28 10:13:08.009426+00'
  ),

  -- Hrach šalátový
  (
    '11629cff-b808-4b08-b8ed-e7dd1df0eaf7',
    'cb8252b8-d5a6-4c35-891c-665993e9858a',
    'a6fbd8cd-0a5c-4cb5-8bde-26e83f5a33fb',
    25,
    'kg',
    'HPH27920250',
    NULL,
    NULL,
    NULL,
    '2025-12-11',
    '2025-12-25',
    NULL,
    NULL,
    5,
    3.5,
    true,
    20,
    NULL,
    NULL,
    NULL,
    NULL,
    '2026-01-04 18:07:40.583672+00'
  )

ON CONFLICT (id) DO UPDATE SET
  crop_id = EXCLUDED.crop_id,
  supplier_id = EXCLUDED.supplier_id,
  quantity = EXCLUDED.quantity,
  unit = EXCLUDED.unit,
  lot_number = EXCLUDED.lot_number,
  batch_number = EXCLUDED.batch_number,
  purchase_date = EXCLUDED.purchase_date,
  expiry_date = EXCLUDED.expiry_date,
  stocking_date = EXCLUDED.stocking_date,
  consumption_start_date = EXCLUDED.consumption_start_date,
  consumption_end_date = EXCLUDED.consumption_end_date,
  finished_date = EXCLUDED.finished_date,
  min_stock = EXCLUDED.min_stock,
  unit_price_per_kg = EXCLUDED.unit_price_per_kg,
  price_includes_vat = EXCLUDED.price_includes_vat,
  vat_rate = EXCLUDED.vat_rate,
  certificate = EXCLUDED.certificate,
  certificate_url = EXCLUDED.certificate_url,
  certificate_file = EXCLUDED.certificate_file,
  notes = EXCLUDED.notes,
  created_at = EXCLUDED.created_at;

-- Verify seeds import
SELECT COUNT(*) as seeds_imported FROM seeds;


-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

SELECT
  'DATA EXPORT COMPLETE' as status,
  (SELECT COUNT(*) FROM products) as products_count,
  (SELECT COUNT(*) FROM blends) as blends_count,
  (SELECT COUNT(*) FROM blend_items) as blend_items_count,
  (SELECT COUNT(*) FROM seeds) as seeds_count,
  NOW() as import_completed_at;

-- Show sample data verification
SELECT 'Products Sample:' as verification;
SELECT id, name, variety, category, days_to_harvest FROM products LIMIT 5;

SELECT 'Blends Sample:' as verification;
SELECT id, name, (SELECT COUNT(*) FROM blend_items bi WHERE bi.blend_id = blends.id) as items_count FROM blends LIMIT 3;

SELECT 'Seeds Sample:' as verification;
SELECT s.id, p.name as crop_name, s.quantity || ' ' || s.unit as stock, s.lot_number
FROM seeds s
LEFT JOIN products p ON p.id = s.crop_id;
