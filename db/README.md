# Database Migrations

## Overview

This directory contains SQL migration scripts for the GrowBase database schema.

## Migration: 001_crop_management_schema.sql

**Status:** ✅ Successfully Applied
**Date:** 2026-01-24
**Type:** Schema Enhancement

### What Was Created

#### 1. **Products Table Extensions**
Added standardized field names for easier querying and clarity:

- `germination_days` (INTEGER) - Days needed for seed germination
- `blackout_days` (INTEGER) - Days crops spend in darkness phase
- `light_days` (INTEGER) - Days crops spend under light
- `soaking` (BOOLEAN) - Whether seeds require pre-soaking
- `substrate` (TEXT) - Default substrate type for this crop
- `cut_form` (BOOLEAN) - Can be sold in cut/harvested form
- `live_form` (BOOLEAN) - Can be sold as living plants
- `reserved_percentage` (NUMERIC) - Safety buffer percentage (default: 5%)

**Note:** These fields map to existing columns for backward compatibility.

#### 2. **blend_items Table** (NEW)
Relational structure for managing blend compositions:

```sql
CREATE TABLE blend_items (
  id UUID PRIMARY KEY,
  blend_id UUID REFERENCES blends(id),
  crop_id UUID REFERENCES products(id),
  percentage NUMERIC CHECK (0 < percentage <= 100),
  user_id UUID,
  created_at TIMESTAMPTZ
);
```

**Purpose:** Replace JSONB `crop_percentages` with proper relational structure for:
- Better query performance
- Foreign key constraints
- Easier reporting and analytics

**Example Usage:**
```sql
-- Get all crops in a specific blend
SELECT c.name, bi.percentage
FROM blend_items bi
JOIN products c ON c.id = bi.crop_id
WHERE bi.blend_id = 'your-blend-uuid';

-- Calculate total percentage (should equal 100)
SELECT blend_id, SUM(percentage) as total_percentage
FROM blend_items
GROUP BY blend_id;
```

#### 3. **home_mix_base_crops Table** (NEW)
Define base crops for custom home-made mixes:

```sql
CREATE TABLE home_mix_base_crops (
  id UUID PRIMARY KEY,
  crop_id UUID REFERENCES products(id),
  percentage NUMERIC CHECK (0 < percentage <= 100),
  user_id UUID,
  created_at TIMESTAMPTZ,
  UNIQUE(crop_id, user_id)
);
```

**Purpose:** Store default percentages for crops commonly used in home mixes.

**Example Usage:**
```sql
-- Set base crops for home mixes
INSERT INTO home_mix_base_crops (crop_id, percentage, user_id)
VALUES
  ('rocket-uuid', 40, auth.uid()),
  ('mizuna-uuid', 30, auth.uid()),
  ('mustard-uuid', 30, auth.uid());

-- Query base mix configuration
SELECT c.name, hm.percentage
FROM home_mix_base_crops hm
JOIN products c ON c.id = hm.crop_id
WHERE hm.user_id = auth.uid();
```

#### 4. **Planting Plans Extensions**
Added fields for comprehensive seed tracking:

- `seed_amount_grams` (NUMERIC) - Grams of seeds used per tray
- `total_seed_grams` (NUMERIC) - Total seeds consumed (calculated)
- `is_manual_edit` (BOOLEAN) - Tracks manual modifications
- `blend_id` (UUID) - Reference to blend if using a mix
- `actual_sow_date` (DATE) - Actual sowing date (vs planned)
- `completed_at` (TIMESTAMPTZ) - Completion timestamp

**Example Usage:**
```sql
-- Create planting plan with seed tracking
INSERT INTO planting_plans (
  crop_id,
  tray_count,
  tray_size,
  seed_amount_grams,
  total_seed_grams,
  sow_date
) VALUES (
  'basil-uuid',
  10,
  'XL',
  80,  -- 80g per tray
  800, -- 10 trays × 80g
  CURRENT_DATE
);

-- Track blend-based planting
INSERT INTO planting_plans (
  blend_id,
  tray_count,
  seed_amount_grams,
  sow_date
) VALUES (
  'spicy-mix-uuid',
  5,
  100,
  CURRENT_DATE
);
```

#### 5. **seed_consumption_log Table** (NEW)
Complete audit trail of seed usage:

```sql
CREATE TABLE seed_consumption_log (
  id UUID PRIMARY KEY,
  seed_id UUID REFERENCES seeds(id),
  crop_id UUID REFERENCES products(id),
  planting_plan_id UUID REFERENCES planting_plans(id),
  amount_consumed_grams NUMERIC CHECK (amount_consumed_grams >= 0),
  consumed_at TIMESTAMPTZ DEFAULT NOW(),
  consumed_by UUID,
  notes TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ
);
```

**Purpose:** Track every seed consumption event for:
- Inventory management
- Cost analysis
- Seed lot traceability
- Historical usage patterns

**Example Usage:**
```sql
-- Log seed consumption when creating planting plan
INSERT INTO seed_consumption_log (
  seed_id,
  crop_id,
  planting_plan_id,
  amount_consumed_grams,
  consumed_by,
  notes
) VALUES (
  'seed-lot-123-uuid',
  'basil-uuid',
  'planting-plan-uuid',
  800.0,  -- 800 grams consumed
  auth.uid(),
  'Planting 10 XL trays of basil'
);

-- Query total consumption by crop
SELECT
  c.name,
  SUM(scl.amount_consumed_grams) as total_grams_consumed,
  COUNT(DISTINCT scl.planting_plan_id) as planting_count
FROM seed_consumption_log scl
JOIN products c ON c.id = scl.crop_id
WHERE scl.consumed_at >= '2026-01-01'
GROUP BY c.name
ORDER BY total_grams_consumed DESC;

-- Track seed lot depletion
SELECT
  s.lot_number,
  s.quantity as initial_quantity,
  COALESCE(SUM(scl.amount_consumed_grams), 0) as consumed,
  s.quantity - COALESCE(SUM(scl.amount_consumed_grams), 0) as remaining
FROM seeds s
LEFT JOIN seed_consumption_log scl ON scl.seed_id = s.id
GROUP BY s.id, s.lot_number, s.quantity;
```

### Security

All new tables have **Row Level Security (RLS)** enabled with policies that:
- ✅ Restrict access to authenticated users only
- ✅ Isolate data by user_id (multi-tenant safe)
- ✅ Allow full CRUD operations for own data
- ✅ Prevent cross-user data access

### Indexes

Optimized indexes for common query patterns:
- `idx_blend_items_blend_id` - Fast blend lookups
- `idx_blend_items_crop_id` - Crop usage in blends
- `idx_seed_consumption_log_seed_id` - Seed lot tracking
- `idx_seed_consumption_log_planting_plan_id` - Plan consumption
- `idx_seed_consumption_log_consumed_at` - Time-based queries

### Database Statistics

Current state after migration:
- **Products:** 23 rows
- **Blends:** 6 rows
- **Blend Items:** 0 rows (NEW - ready for data)
- **Home Mix Base Crops:** 0 rows (NEW - ready for data)
- **Planting Plans:** 37 rows
- **Seeds:** 2 rows
- **Seed Consumption Log:** 0 rows (NEW - ready for tracking)

## Running Migrations

### Option 1: Via Supabase Dashboard
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `001_crop_management_schema.sql`
4. Execute

### Option 2: Via Supabase CLI
```bash
supabase db push
```

### Option 3: Direct PostgreSQL
```bash
psql -h your-host -U your-user -d your-db -f migrations/001_crop_management_schema.sql
```

## Idempotence

This migration is **fully idempotent** - it can be run multiple times safely:
- Uses `IF NOT EXISTS` for all CREATE statements
- Checks column existence before ALTER TABLE
- Uses `DROP POLICY IF EXISTS` before recreating policies
- No data loss on re-run

## Next Steps

### 1. Migrate Existing Blend Data
If you have blends with `crop_percentages` JSONB data, migrate to `blend_items`:

```sql
-- Example migration from JSONB to relational
INSERT INTO blend_items (blend_id, crop_id, percentage, user_id)
SELECT
  b.id as blend_id,
  (item->>'crop_id')::uuid as crop_id,
  (item->>'percentage')::numeric as percentage,
  b.user_id
FROM blends b,
LATERAL jsonb_array_elements(b.crop_percentages) as item
WHERE b.crop_percentages IS NOT NULL;
```

### 2. Start Tracking Seed Consumption
Update your planting workflow to log seed usage:

```typescript
// When creating planting plan
const planId = await createPlantingPlan(planData);

// Log seed consumption
await supabase.from('seed_consumption_log').insert({
  seed_id: selectedSeedLot.id,
  crop_id: planData.crop_id,
  planting_plan_id: planId,
  amount_consumed_grams: planData.total_seed_grams,
  consumed_by: user.id,
  notes: `Planting ${planData.tray_count} trays`
});

// Update seed inventory
await supabase
  .from('seeds')
  .update({
    quantity: seedLot.quantity - planData.total_seed_grams
  })
  .eq('id', selectedSeedLot.id);
```

### 3. Set Up Home Mix Base Crops
Define your standard home mix composition:

```sql
-- Configure base crops for home mixes
INSERT INTO home_mix_base_crops (crop_id, percentage)
VALUES
  ((SELECT id FROM products WHERE name = 'Rocket'), 40),
  ((SELECT id FROM products WHERE name = 'Mizuna'), 30),
  ((SELECT id FROM products WHERE name = 'Mustard'), 30)
ON CONFLICT (crop_id, user_id) DO UPDATE
SET percentage = EXCLUDED.percentage;
```

## Support

For questions or issues with this migration:
1. Check the SQL file comments for detailed explanations
2. Review the verification queries at the end of the migration
3. Check Supabase logs for any policy or constraint violations

## Rollback

If you need to rollback this migration:

```sql
-- WARNING: This will delete all data in new tables!

-- Drop new tables
DROP TABLE IF EXISTS seed_consumption_log CASCADE;
DROP TABLE IF EXISTS home_mix_base_crops CASCADE;
DROP TABLE IF EXISTS blend_items CASCADE;

-- Remove new columns from existing tables
ALTER TABLE planting_plans
  DROP COLUMN IF EXISTS seed_amount_grams,
  DROP COLUMN IF EXISTS total_seed_grams,
  DROP COLUMN IF EXISTS is_manual_edit,
  DROP COLUMN IF EXISTS blend_id,
  DROP COLUMN IF EXISTS actual_sow_date,
  DROP COLUMN IF EXISTS completed_at;

ALTER TABLE products
  DROP COLUMN IF EXISTS germination_days,
  DROP COLUMN IF EXISTS blackout_days,
  DROP COLUMN IF EXISTS light_days,
  DROP COLUMN IF EXISTS soaking,
  DROP COLUMN IF EXISTS substrate,
  DROP COLUMN IF EXISTS cut_form,
  DROP COLUMN IF EXISTS live_form,
  DROP COLUMN IF EXISTS reserved_percentage;
```
