# 🔄 RECURRING ORDERS - BACKFILL GUIDE

Kompletný návod na spätné doplnenie údajov do existujúcich opakovaných objednávok.

---

## 📋 PREHĽAD

Po pridaní nových stĺpcov pre tracking recurring orders (`recurring_order_id`, `recurring_start_date`, atď.) je potrebné spätne doplniť údaje do existujúcich opakovaných objednávok.

**Tento návod obsahuje:**
- ✅ Automatickú migráciu (odporúčaná)
- ✅ Diagnostické nástroje
- ✅ Verifikačné testy
- ✅ Manuálny update template (fallback)

---

## 🚀 RÝCHLY ŠTART (3 KROKY)

### **KROK 1: DIAGNOSTIKA** (5 minút)

```bash
# 1. Otvor Supabase SQL Editor
# 2. Nahraj súbor: db/diagnose-recurring-orders.sql
# 3. Spusti všetky queries (Ctrl + Enter)
# 4. Prečítaj výsledky
```

**Očakávaný output:**
```
Total Recurring Orders: 24
WITHOUT recurring_order_id (NEEDS UPDATE): 24
```

### **KROK 2: BACKFILL MIGRÁCIA** (2 minúty)

```bash
# 1. Otvor Supabase SQL Editor
# 2. Nahraj súbor: supabase/migrations/XXXXX_backfill_recurring_order_data.sql
# 3. Spusti migráciu (Ctrl + Enter)
# 4. Sleduj NOTICE messages v konzole
```

**Očakávaný output:**
```
NOTICE: === STARTING BACKFILL OF RECURRING ORDER DATA ===
NOTICE: Processing group for customer "Fresh Market": 4 orders, dates 2026-01-06 to 2026-01-27
NOTICE: Processing group for customer "Gastro XY": 8 orders, dates 2026-02-03 to 2026-03-24
...
NOTICE: === BACKFILL COMPLETE ===
NOTICE: Total recurring orders: 24
NOTICE: Successfully updated: 24 ✅
NOTICE: Remaining (needs manual review): 0 ✅
```

### **KROK 3: VERIFIKÁCIA** (3 minúty)

```bash
# 1. Otvor Supabase SQL Editor
# 2. Nahraj súbor: db/verify-recurring-backfill.sql
# 3. Spusti všetky testy (Ctrl + Enter)
# 4. Over že všetky testy sú ✅
```

**Očakávaný output:**
```
TEST 1: ✅ All recurring orders have complete data
TEST 2: No missing data
TEST 3: All groups OK ✅
TEST 4: All orders complete ✅
TEST 5: Sequential weeks OK ✅

FINAL REPORT:
✅ SUCCESS! All recurring orders have complete data.
```

---

## 📂 SÚBORY

| Súbor | Účel | Kedy použiť |
|-------|------|-------------|
| `diagnose-recurring-orders.sql` | Diagnostika existujúcich dát | **VŽDY ako prvé** |
| `supabase/migrations/XXXXX_backfill_recurring_order_data.sql` | Automatické doplnenie údajov | **Hlavný nástroj** |
| `verify-recurring-backfill.sql` | Overenie že backfill fungoval | **Po migrácii** |
| `manual-update-template.sql` | Manuálne updaty | **Len ak automatika zlyhá** |

---

## 🔍 DETAIL: AKO TO FUNGUJE

### **Stratégia Backfill Migrácie**

Migrácia používa 2 stratégie:

#### **STRATÉGIA 1: Skupiny podľa `parent_order_id`**
- Nájde všetky orders s rovnakým `parent_order_id`
- Zoskupí ich do série
- Doplní údaje

#### **STRATÉGIA 2: Skupiny podľa `customer_id`**
- Pre orders bez `parent_order_id`
- Zoskupí podľa zákazníka
- Doplní údaje

### **Čo migrácia robí:**

Pre každú skupinu:
```sql
recurring_order_id = ID prvej objednávky v skupine
recurring_start_date = delivery_date prvej objednávky
recurring_end_date = delivery_date poslednej objednávky
recurring_total_weeks = počet objednávok v skupine
recurring_current_week = poradie (1, 2, 3, 4...)
```

---

## 📊 DIAGNOSTICKÝ REPORT

### **Spusti diagnostiku:**

```bash
# Otvor: db/diagnose-recurring-orders.sql v Supabase SQL Editor
```

### **Očakávané výsledky:**

```
=== ZÁKLADNÝ PREHĽAD ===
Total Recurring Orders: 24
WITHOUT recurring_order_id (NEEDS UPDATE): 24
WITHOUT end_date: 24

=== SKUPINY NA UPDATE ===
Zákazník         | Prvá       | Posledná   | Počet | Týždne
----------------|------------|------------|-------|--------
Fresh Market    | 2026-01-06 | 2026-01-27 | 4     | 3
Gastro XY       | 2026-02-03 | 2026-03-24 | 8     | 7
Restaurant ABC  | 2026-01-13 | 2026-02-03 | 4     | 3
```

---

## ✅ VERIFIKAČNÉ TESTY

### **Spusti verifikáciu:**

```bash
# Otvor: db/verify-recurring-backfill.sql v Supabase SQL Editor
```

### **Testy ktoré sa vykonajú:**

| Test | Popis | Očakávaný výsledok |
|------|-------|-------------------|
| **TEST 1** | Základná štatistika | Všetky orders majú údaje ✅ |
| **TEST 2** | Chýbajúce údaje | Žiadne chýbajúce údaje |
| **TEST 3** | Konzistencia skupín | `total_orders = total_weeks = max_week` |
| **TEST 4** | Detail všetkých orders | Všetky complete ✅ |
| **TEST 5** | Sequential weeks | Week numbers 1,2,3,4... OK ✅ |
| **TEST 6** | Orders končiace skoro | Zobrazí ending orders |

### **Finálny report:**

```
╔══════════════════════════════════════════════════╗
║         VERIFIKAČNÝ REPORT                       ║
╚══════════════════════════════════════════════════╝

Total recurring orders: 24
Complete (all fields): 24 ✅
Incomplete (missing data): 0 ✅

Orders ending in 2 weeks: 2

✅ SUCCESS! All recurring orders have complete data.
You can now use the extend functionality in the app.
```

---

## 🛠️ MANUÁLNY UPDATE (FALLBACK)

Ak automatická migrácia nefunguje správne, použi manuálny template.

### **Postup:**

1. **Otvor:** `db/manual-update-template.sql`
2. **Nájdi orders pre zákazníka:**

```sql
SELECT id, customer_name, delivery_date
FROM orders
WHERE is_recurring = true
  AND customer_name = 'Fresh Market'
ORDER BY delivery_date;
```

3. **Použi template pre update:**

```sql
-- Týždeň 1
UPDATE orders
SET
  recurring_order_id = 'ID_PRVEJ_OBJEDNÁVKY',
  recurring_start_date = '2026-01-06',
  recurring_end_date = '2026-01-27',
  recurring_total_weeks = 4,
  recurring_current_week = 1
WHERE id = 'ORDER_ID_1';

-- Týždeň 2
UPDATE orders
SET
  recurring_order_id = 'ID_PRVEJ_OBJEDNÁVKY',
  recurring_start_date = '2026-01-06',
  recurring_end_date = '2026-01-27',
  recurring_total_weeks = 4,
  recurring_current_week = 2
WHERE id = 'ORDER_ID_2';

-- atď...
```

4. **Over výsledok:**

```sql
SELECT
  customer_name,
  delivery_date,
  recurring_current_week || '/' || recurring_total_weeks as progress
FROM orders
WHERE customer_name = 'Fresh Market'
ORDER BY delivery_date;
```

---

## 🎯 OVERENIE V APLIKÁCII

Po dokončení backfillu:

### **1. Hard Refresh**
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### **2. Otvor stránku Orders**
```
Naviguj na: /orders
```

### **3. Skontroluj UI**

**Očakávané zobrazenie:**

```
┌─────────────────────────────────────┐
│ 🔄 Opakovaná objednávka            │
│                                     │
│ 📅 06.01.2026 → 27.01.2026         │
│ 🔢 Týždeň: 3/4                     │
│                                     │
│ + Predĺžiť objednávku              │
└─────────────────────────────────────┘
```

### **4. Testuj predĺženie**

1. Klikni "Predĺžiť objednávku"
2. Zadaj počet týždňov (napr. 4)
3. Over náhľad nového konca
4. Klikni "Predĺžiť"
5. Skontroluj že sa aktualizovali všetky orders v skupine

---

## ⚠️ TROUBLESHOOTING

### **Problém: Migrácia nenašla žiadne orders**

**Riešenie:**
```sql
-- Over či existujú recurring orders
SELECT COUNT(*) FROM orders WHERE is_recurring = true;

-- Skontroluj či už majú údaje
SELECT COUNT(*) FROM orders
WHERE is_recurring = true AND recurring_order_id IS NOT NULL;
```

### **Problém: Niektoré orders nie sú v skupine**

**Riešenie:**
```sql
-- Nájdi orphaned orders
SELECT id, customer_name, delivery_date
FROM orders
WHERE is_recurring = true
  AND recurring_order_id IS NULL;

-- Použi manuálny template pre update
```

### **Problém: Week numbers nie sú sequential**

**Riešenie:**
```sql
-- Nájdi problémové skupiny
SELECT recurring_order_id, customer_name,
  ARRAY_AGG(recurring_current_week ORDER BY delivery_date)
FROM orders
WHERE is_recurring = true
GROUP BY recurring_order_id, customer_name;

-- Oprav manuálne
```

### **Problém: Modré info boxy sa nezobrazujú**

**Riešenie:**
1. Hard refresh (Ctrl + Shift + R)
2. Over v Supabase že údaje sú vyplnené
3. Skontroluj browser console pre errory
4. Over že migrácia `20260209163147_add_recurring_order_tracking_fields.sql` bola aplikovaná

---

## 📈 EXPECTED RESULTS

### **Po úspešnom backfille:**

✅ Všetky recurring orders majú `recurring_order_id`
✅ Všetky majú `recurring_start_date` a `recurring_end_date`
✅ Všetky majú `recurring_total_weeks` a `recurring_current_week`
✅ Week numbers sú sequential (1, 2, 3, 4...)
✅ Objednávky v skupine majú rovnaký `recurring_order_id`
✅ Modré info boxy sa zobrazujú v aplikácii
✅ Tlačidlo "Predĺžiť" funguje
✅ Toast notifikácie pre ending orders fungujú

---

## 📞 SUPPORT

Ak máš problémy:

1. Spusti diagnostiku: `db/diagnose-recurring-orders.sql`
2. Skontroluj výsledky verifikácie: `db/verify-recurring-backfill.sql`
3. Over console logs v Supabase SQL Editor
4. Použi manuálny template ako fallback

---

## 📝 NOTES

- Migrácia je **safe** - aktualizuje len orders kde `recurring_order_id IS NULL`
- Migrácia je **idempotent** - môžeš ju spustiť viackrát bez problémov
- Údaje sa doplňujú na základe existujúcich `delivery_date` a `customer_id`
- Prvá objednávka v skupine sa stáva "master" (`recurring_order_id`)

---

## ✨ DONE!

Po dokončení backfillu máš plne funkčnú podporu pre:
- 📊 Tracking recurring orders
- ⏰ Automatické upozornenia na končiace orders
- ➕ Predĺženie recurring orders jedným klikom
- 📅 Zobrazenie progressu (Týždeň 3/8)
- 🔄 Kompletný lifecycle management

**Enjoy! 🎉**
