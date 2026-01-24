# Data Export Documentation

## Overview

This directory contains a complete SQL export of the production database for migration purposes.

**Export Date:** 2026-01-24
**Export File:** `data-export.sql`
**Database:** Supabase PostgreSQL

## What's Included

### 1. Products (23 records)
Complete microgreens, microherbs, and edible flowers catalog:
- Brokolica Calabrese
- Brokolice Raab
- Červená kapusta
- Cibule
- Ďatelina purpurová
- Horčica biela
- Hrach šalátový
- Hrach siaty Affyla
- Hrach vráskavý
- Kaleráb ružový
- Komatsuna červená
- Koriander
- Mizuna červená
- Nechtík lekársky
- Pak choi
- Reďkovka China Rose
- Reďkovka Daikon
- Reďkovka Red Coral
- Reďkovka Sango
- Řepa Bull's blood
- Rukola
- Slnečnica
- Žerucha siata

**Fields Exported:**
- Basic info: name, variety, category
- Growth parameters: days_to_harvest, days_to_germination, germination_type
- Cultivation: days_in_darkness, days_on_light, seed_soaking
- Yield data: seed_density, expected_yield
- Configuration: tray_configs (JSONB), substrate settings
- UI: color, harvest_order
- Metadata: created_at, updated_at

### 2. Blends (6 records)
Microgreens mixes:
1. **Classic mix** - Multi-crop combination with nested blends
2. **Mikrozelenina mix 100 g** - 5-crop blend
3. **Mikrozelenina mix 70 g** - 5-crop blend
4. **Reďkovkový mix** - 4 radish varieties (25% each)
5. **Šalátový mix** - Salad blend
6. **Variabilný mix mikrozeleniny** - Variable 6-crop blend

**Fields Exported:**
- name, crop_ids (UUID array)
- crop_percentages (JSONB) - original format
- notes, created_at

### 3. Blend Items (29 records)
**NEWLY GENERATED** from blends.crop_percentages JSONB field.

This populates the new relational `blend_items` table created in migration `001_crop_management_schema.sql`.

**Structure:**
```sql
blend_id → crop_id : percentage
```

**Example:**
```
Reďkovkový mix:
- Red Coral: 25%
- China Rose: 25%
- Sango: 25%
- Daikon: 25%
```

### 4. Seeds (2 records)
Seed inventory tracking:

1. **Hrach siaty Affyla**
   - Lot: 123456
   - Quantity: 25 kg
   - Price: 3€/kg (with VAT)
   - Expiry: 2026-03-31

2. **Hrach šalátový**
   - Lot: HPH27920250
   - Quantity: 25 kg
   - Price: 3.5€/kg (with VAT)
   - Stock date: 2025-12-11

**Fields Exported:**
- Stock: quantity, unit, lot_number, batch_number
- Dates: purchase_date, expiry_date, stocking_date, consumption_start/end_date
- Pricing: unit_price_per_kg, price_includes_vat, vat_rate
- Tracking: min_stock, notes
- References: crop_id, supplier_id

## File Structure

```sql
-- ============================================================================
-- SECTION 1: PRODUCTS (23 records)
-- ============================================================================
INSERT INTO products (...) VALUES (...)
ON CONFLICT (id) DO UPDATE SET ...;

-- ============================================================================
-- SECTION 2: BLENDS (6 records)
-- ============================================================================
INSERT INTO blends (...) VALUES (...)
ON CONFLICT (id) DO UPDATE SET ...;

-- ============================================================================
-- SECTION 3: BLEND_ITEMS (29 records - GENERATED)
-- ============================================================================
INSERT INTO blend_items (...) VALUES (...)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 4: SEEDS (2 records)
-- ============================================================================
INSERT INTO seeds (...) VALUES (...)
ON CONFLICT (id) DO UPDATE SET ...;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
SELECT ... -- Verification queries
```

## Key Features

### ✅ Idempotent Execution
All INSERT statements use `ON CONFLICT` clauses:
- **Products, Blends, Seeds:** `DO UPDATE SET` - Updates if exists
- **Blend Items:** `DO NOTHING` - Skips if exists (uses generated UUIDs)

**Safe to run multiple times without data duplication.**

### ✅ UUID Preservation
All original UUIDs from source database are preserved:
- Maintains referential integrity
- No ID conflicts
- Foreign keys work immediately

### ✅ Data Validation
Built-in verification queries at the end:
```sql
SELECT COUNT(*) FROM products;   -- Should be 23
SELECT COUNT(*) FROM blends;     -- Should be 6
SELECT COUNT(*) FROM blend_items; -- Should be 29
SELECT COUNT(*) FROM seeds;      -- Should be 2
```

### ✅ JSONB Configuration
Tray configurations stored in `products.tray_configs`:
```json
{
  "XL": {"seed_density": 22.5, "expected_yield": 200},
  "L":  {"seed_density": 11,   "expected_yield": 100},
  "M":  {"seed_density": 60,   "expected_yield": 48},
  "S":  {"seed_density": 0,    "expected_yield": 0}
}
```

## Usage Instructions

### Method 1: Supabase Dashboard SQL Editor

1. Open Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create new query
4. Copy entire contents of `data-export.sql`
5. Click **Run**
6. Verify output shows correct counts

### Method 2: Supabase CLI

```bash
# From project root
supabase db reset  # Optional: Reset database first
psql $DATABASE_URL -f db/data-export.sql
```

### Method 3: Direct psql

```bash
psql -h your-host \
     -U your-user \
     -d your-database \
     -f db/data-export.sql
```

### Method 4: From Application

```javascript
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const sql = readFileSync('./db/data-export.sql', 'utf8');
const supabase = createClient(url, key);

// Split by section and execute
const sections = sql.split('-- ============');
for (const section of sections) {
  if (section.trim()) {
    await supabase.rpc('exec_sql', { sql: section });
  }
}
```

## Prerequisites

Before running the export:

1. ✅ **Migration Applied**
   ```bash
   # Must have run first:
   db/migrations/001_crop_management_schema.sql
   ```
   This creates the `blend_items` table required for Section 3.

2. ✅ **Database Connection**
   Ensure you have connection to target Supabase database.

3. ✅ **User Permissions**
   User must have INSERT/UPDATE permissions on:
   - products
   - blends
   - blend_items
   - seeds

## Post-Import Verification

After running the import, verify data integrity:

```sql
-- 1. Check record counts
SELECT
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM blends) as blends,
  (SELECT COUNT(*) FROM blend_items) as blend_items,
  (SELECT COUNT(*) FROM seeds) as seeds;

-- Expected: products=23, blends=6, blend_items=29, seeds=2

-- 2. Verify foreign keys
SELECT
  bi.blend_id,
  b.name as blend_name,
  COUNT(*) as item_count
FROM blend_items bi
JOIN blends b ON b.id = bi.blend_id
GROUP BY bi.blend_id, b.name
ORDER BY b.name;

-- Should show 6 blends with their item counts

-- 3. Check crop references in blends
SELECT
  b.name as blend_name,
  bi.percentage,
  p.name as crop_name
FROM blend_items bi
JOIN blends b ON b.id = bi.blend_id
JOIN products p ON p.id = bi.crop_id
ORDER BY b.name, bi.percentage DESC;

-- Should show all blend compositions with crop names

-- 4. Verify seeds inventory
SELECT
  s.lot_number,
  p.name as crop_name,
  s.quantity || ' ' || s.unit as stock,
  s.unit_price_per_kg || '€/kg' as price,
  s.expiry_date
FROM seeds s
LEFT JOIN products p ON p.id = s.crop_id
ORDER BY s.created_at;

-- Should show 2 seed lots with details

-- 5. Check tray configurations
SELECT
  name,
  variety,
  tray_configs->'XL' as xl_config,
  tray_configs->'L' as l_config
FROM products
WHERE tray_configs IS NOT NULL
LIMIT 5;

-- Should show JSONB tray configurations
```

## Data Migration Notes

### From JSONB to Relational

The `blend_items` table represents a migration from JSONB to relational structure:

**Old Format (blends.crop_percentages):**
```json
[
  {"cropId": "uuid", "percentage": 25},
  {"cropId": "uuid", "percentage": 25}
]
```

**New Format (blend_items table):**
```sql
| id   | blend_id | crop_id | percentage |
|------|----------|---------|------------|
| uuid | uuid     | uuid    | 25         |
| uuid | uuid     | uuid    | 25         |
```

**Benefits:**
- ✅ Foreign key constraints
- ✅ Easier queries and joins
- ✅ Better performance
- ✅ Type safety
- ✅ Index support

**Backward Compatibility:**
The old `crop_percentages` field is **preserved** in the blends table for compatibility.

### Tray Configurations

Tray configs remain in JSONB format in `products.tray_configs`:

**Reason:**
- Dynamic tray sizes (XL, L, M, S)
- Flexible configuration per crop
- Easy to add new sizes
- Efficient storage

**Alternative:** Could be normalized to `tray_configurations` table:
```sql
CREATE TABLE tray_configurations (
  id UUID PRIMARY KEY,
  crop_id UUID REFERENCES products(id),
  tray_size TEXT CHECK (tray_size IN ('XL', 'L', 'M', 'S')),
  seed_density NUMERIC,
  expected_yield NUMERIC
);
```

## Troubleshooting

### Issue: blend_items foreign key violations

**Cause:** blend_id or crop_id doesn't exist in target database

**Solution:**
```sql
-- Check missing blends
SELECT DISTINCT blend_id
FROM blend_items
WHERE blend_id NOT IN (SELECT id FROM blends);

-- Check missing crops
SELECT DISTINCT crop_id
FROM blend_items
WHERE crop_id NOT IN (SELECT id FROM products);
```

### Issue: Duplicate key violations

**Cause:** Records with same ID already exist

**Solution:**
The ON CONFLICT clauses handle this automatically. Records will be updated.

### Issue: Permission denied

**Cause:** User lacks INSERT/UPDATE permissions

**Solution:**
```sql
-- Grant permissions (run as admin)
GRANT INSERT, UPDATE ON products, blends, blend_items, seeds TO your_user;
```

### Issue: JSONB syntax errors

**Cause:** Invalid JSON in tray_configs or crop_percentages

**Solution:**
Validate JSON before import:
```bash
# Check JSON validity
cat data-export.sql | grep "::jsonb" | while read line; do
  echo "$line" | psql $DATABASE_URL -c "SELECT '$line'::jsonb;" > /dev/null
done
```

## Data Consistency Checks

After import, run these consistency checks:

```sql
-- 1. All blends have items
SELECT b.name
FROM blends b
LEFT JOIN blend_items bi ON bi.blend_id = b.id
WHERE bi.id IS NULL;
-- Should return 0 rows

-- 2. All blend items reference valid crops
SELECT COUNT(*)
FROM blend_items bi
WHERE bi.crop_id NOT IN (SELECT id FROM products);
-- Should return 0

-- 3. Percentages sum to 100 (approximately)
SELECT
  blend_id,
  SUM(percentage) as total_percentage
FROM blend_items
GROUP BY blend_id
HAVING ABS(SUM(percentage) - 100) > 0.1;
-- Should return 0 rows (all blends sum to 100%)

-- 4. All seeds reference valid crops
SELECT COUNT(*)
FROM seeds s
WHERE s.crop_id IS NOT NULL
  AND s.crop_id NOT IN (SELECT id FROM products);
-- Should return 0

-- 5. No orphaned seed references
SELECT COUNT(*)
FROM seeds s
WHERE s.crop_id IS NULL;
-- Check if any seeds have missing crop references
```

## Backup Recommendation

Before running this import on production:

```bash
# 1. Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run import on staging first
psql $STAGING_DATABASE_URL -f data-export.sql

# 3. Verify staging data
psql $STAGING_DATABASE_URL -c "SELECT COUNT(*) FROM products;"

# 4. If successful, run on production
psql $DATABASE_URL -f data-export.sql
```

## Support

For questions or issues:
1. Check verification queries in the SQL file
2. Review troubleshooting section above
3. Examine Supabase logs for detailed error messages

## Related Files

- `migrations/001_crop_management_schema.sql` - Schema definition (must run first)
- `README.md` - Migration documentation
- `data-export.sql` - This export file

## Export History

| Date       | Records | Notes                           |
|------------|---------|----------------------------------|
| 2026-01-24 | 23 products, 6 blends, 29 blend_items, 2 seeds | Initial export with blend_items generation |
