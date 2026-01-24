# Soaking Reminders System - Sprievodca

## Prehľad

Systém upozornení na namáčanie semien automaticky upozorňuje používateľov, keď potrebujú namočiť semená pred sadením. Rôzne plodiny majú rôzne požiadavky na namáčanie.

## Ako funguje

### 1. Konfigurácia plodín

V tabuľke `products` máme dva nové stĺpce:

```sql
- soaking (boolean) - Či plodina vyžaduje namáčanie semien
- soaking_duration_hours (numeric) - Koľko hodín treba namáčať
```

**Príklady:**
- **Hrášok**: `soaking = true`, `soaking_duration_hours = 12`
- **Slnečnica**: `soaking = true`, `soaking_duration_hours = 0.5` (30 minút)
- **Brokolica**: `soaking = false`, `soaking_duration_hours = 0`

### 2. Logika upozornení

Systém rozlišuje medzi krátkym a dlhým namáčaním:

#### ⏰ Dlhé namáčanie (≥ 8 hodín)
- **Príklad**: Hrášok (12 hodín)
- **Upozornenie**: Zobrazí sa **DEŇ PRED** dátumom sadenia
- **Dôvod**: Môžete namočiť večer a semená budú pripravené ráno

#### ⏱️ Krátke namáčanie (< 8 hodín)
- **Príklad**: Slnečnica (30 minút)
- **Upozornenie**: Zobrazí sa **V DEŇ** sadenia
- **Dôvod**: Krátke namočenie môžete urobiť tesne pred sadením

### 3. Databázová štruktúra

#### Tabuľka: soaking_completions

```sql
CREATE TABLE soaking_completions (
  id UUID PRIMARY KEY,
  planting_plan_id UUID REFERENCES planting_plans(id),
  completed_at TIMESTAMPTZ,
  user_id UUID,
  notes TEXT
);
```

**Účel**: Ukladá informáciu, že namáčanie bolo dokončené, čím sa upozornenie odstráni.

### 4. RPC Funkcia

```sql
get_pending_soaking_reminders()
```

**Vracia**: Všetky plány sadenia v nasledujúcich 7 dňoch, ktoré vyžadujú namáčanie a ešte neboli označené ako dokončené.

**Filtre:**
- ✅ Plodina má `soaking = true`
- ✅ Dátum sadenia je v nasledujúcich 7 dňach
- ✅ Plán nie je dokončený (`status != 'completed'`)
- ✅ Neexistuje záznam v `soaking_completions`
- ✅ Pripočítava sa pripomenutie dátumu (`reminder_date`)

## Komponent SoakingReminders

### Vizuálny vzhľad

```
┌─────────────────────────────────────────┐
│ 💧 NAMOČIŤ SEMENÁ               [2]     │
├─────────────────────────────────────────┤
│ ⚠️ Hrášok Affyla                        │
│    Sadí sa ZAJTRA • 25.01.2026          │
│    7 tácok • 700g semien                │
│    💧 Namáčať 12 hodín                  │
│    💡 Tip: Namočte večer...             │
│    [✓ Namočené]                         │
├─────────────────────────────────────────┤
│ ⚠️ Slnečnica                            │
│    Sadí sa DNES • 24.01.2026            │
│    3 tácky • 180g semien                │
│    💧 Namáčať 30 minút                  │
│    [✓ Namočené]                         │
└─────────────────────────────────────────┘
```

### Farby a urgencia

- 🔴 **Červená** - Sadí sa DNES (urgentné)
- 🟠 **Oranžová** - Sadí sa ZAJTRA (dôležité)
- 🟡 **Žltá** - Sadí sa o 2-3 dni (informačné)

### Real-time aktualizácie

Komponent používa Supabase subscriptions:
- Automaticky sa aktualizuje pri zmenách v `soaking_completions`
- Automaticky sa aktualizuje pri zmenách v `planting_plans`

## Použitie

### 1. Nastavenie plodín

Pre každú plodinu, ktorá potrebuje namáčanie:

```sql
UPDATE products
SET
  soaking = true,
  soaking_duration_hours = 12
WHERE name = 'Hrášok Affyla';
```

**Už nastavené plodiny:**
- ✅ Všetky hráchy (12 hodín)
- ✅ Slnečnica (0.5 hodiny)

### 2. Vytvorenie plánu sadenia

```sql
INSERT INTO planting_plans (
  crop_id,
  sow_date,
  tray_count,
  seed_amount_grams,
  status
) VALUES (
  '8755eab2-a358-42cc-a4c8-db7e41c9c255', -- Hrášok Affyla
  '2026-01-25', -- Zajtra
  7,
  700,
  'planned'
);
```

### 3. Zobrazenie upozornenia

Upozornenie sa automaticky zobrazí na Dashboarde:
- **Dnes** (24.1.2026) sa zobrazí upozornenie pre sadenie **zajtra** (25.1.2026)
- Používateľ vidí všetky detaily (počet tácok, množstvo semien, čas namáčania)

### 4. Označenie ako dokončené

Používateľ klikne na **[✓ Namočené]**:

```typescript
// Vytvorí sa automaticky záznam:
{
  planting_plan_id: "uuid",
  completed_at: "2026-01-24T08:00:00Z",
  user_id: "current_user_uuid"
}
```

Upozornenie okamžite zmizne z dashboardu.

## Testovanie

### Test 1: Dlhé namáčanie (12h)

```sql
-- Vytvor plán sadenia hráška na zajtra
INSERT INTO planting_plans (
  user_id,
  crop_id,
  sow_date,
  tray_count,
  seed_amount_grams,
  status
) VALUES (
  auth.uid(),
  (SELECT id FROM products WHERE name ILIKE '%hrášok%' LIMIT 1),
  CURRENT_DATE + INTERVAL '1 day',
  5,
  500,
  'planned'
);
```

**Očakávaný výsledok:**
- ✅ Upozornenie sa zobrazí DNES
- ✅ Text: "Sadí sa ZAJTRA"
- ✅ Červené pozadie (urgentné)
- ✅ Tip o večernom namočení

### Test 2: Krátke namáčanie (0.5h)

```sql
-- Vytvor plán sadenia slnečnice na dnes
INSERT INTO planting_plans (
  user_id,
  crop_id,
  sow_date,
  tray_count,
  seed_amount_grams,
  status
) VALUES (
  auth.uid(),
  (SELECT id FROM products WHERE name ILIKE '%slnečnic%' LIMIT 1),
  CURRENT_DATE,
  3,
  180,
  'planned'
);
```

**Očakávaný výsledok:**
- ✅ Upozornenie sa zobrazí DNES
- ✅ Text: "Sadí sa DNES"
- ✅ Červené pozadie (urgentné)
- ✅ Bez tipu (krátke namáčanie)

### Test 3: Označenie ako dokončené

1. Na dashboarde klikni **[✓ Namočené]**
2. Komponent by mal:
   - ✅ Zobraziť loading state
   - ✅ Vytvoriť záznam v `soaking_completions`
   - ✅ Zobraziť success toast
   - ✅ Odstrániť upozornenie z dashboardu

### Test 4: Kontrola dátumov

```sql
-- Plány sadenia v budúcnosti (nezobrazia sa dnes)
SELECT * FROM get_pending_soaking_reminders();

-- Mali by sa vrátiť len plány kde:
-- reminder_date = CURRENT_DATE
```

## Ako pridať namáčanie pre novú plodinu

### Krok 1: Zisti čas namáčania

Zisti z odborných zdrojov alebo skúseností:
- Koľko hodín treba namáčať semená?
- Je to dlhé (≥8h) alebo krátke (<8h) namáčanie?

### Krok 2: Aktualizuj databázu

```sql
UPDATE products
SET
  soaking = true,
  soaking_duration_hours = <počet_hodín>
WHERE name = '<názov_plodiny>';
```

**Príklady:**
```sql
-- Fazuľa mungo (8 hodín)
UPDATE products
SET soaking = true, soaking_duration_hours = 8
WHERE name ILIKE '%fazuľa mungo%';

-- Reďkovka (nie je potrebné)
UPDATE products
SET soaking = false, soaking_duration_hours = 0
WHERE name ILIKE '%reďkovka%';
```

### Krok 3: Hotovo!

Systém automaticky začne zobrazovať upozornenia pre túto plodinu pri tvorbe nových plánov sadenia.

## Časté otázky (FAQ)

### Q: Prečo sa mi nezobrazuje upozornenie?

**Možné dôvody:**
1. ❌ Dátum sadenia nie je zajtra (pre dlhé namáčanie) alebo dnes (pre krátke)
2. ❌ Plodina nemá nastavené `soaking = true`
3. ❌ Plán sadenia má status `completed`
4. ❌ Už existuje záznam v `soaking_completions`

**Kontrola:**
```sql
SELECT * FROM get_pending_soaking_reminders();
```

### Q: Ako zrušiť označenie "Namočené"?

```sql
-- Vymaž záznam z completions
DELETE FROM soaking_completions
WHERE planting_plan_id = '<uuid_plánu>';
```

Upozornenie sa znovu zobrazí.

### Q: Môžem zmeniť čas namáčania?

Áno:
```sql
UPDATE products
SET soaking_duration_hours = <nový_čas>
WHERE id = '<uuid_plodiny>';
```

Zmena sa prejaví pri nových plánoch sadenia.

### Q: Čo ak chcem dočasne vypnúť upozornenia?

**Možnosť 1**: Vypni pre konkrétnu plodinu
```sql
UPDATE products
SET soaking = false
WHERE name = 'Hrášok Affyla';
```

**Možnosť 2**: Skry komponent v Dashboard.tsx
```typescript
{/* <SoakingReminders /> */}
```

### Q: Ako pridať poznámku k namáčaniu?

Momentálne komponent nepodporuje poznámky v UI, ale môžeš ich pridať manuálne:

```sql
UPDATE soaking_completions
SET notes = 'Namočené o 20:00, teplota 22°C'
WHERE planting_plan_id = '<uuid>';
```

## Rozšírenia (budúcnosť)

Možné vylepšenia systému:

### 1. História namáčania
- Zobrazovať históriu namáčaní pre každú plodinu
- Štatistiky úspešnosti klíčenia po namáčaní

### 2. Notifikácie
- Push notifikácie na mobil
- Email upozornenia večer pred namáčaním

### 3. Optimálny čas
- Vypočítať optimálny čas namočenia (napr. "Namočte o 20:00")
- Countdown timer do začiatku namáčania

### 4. Teplota vody
- Pridať informáciu o optimálnej teplote vody
- Tipy pre správne namáčanie

### 5. Multi-user
- Prideľovať zodpovednosť za namáčanie konkrétnym používateľom
- Notifikácie len pre zodpovedné osoby

## Bezpečnosť (RLS Policies)

Všetky RLS polícy sú nastavené:

```sql
-- Používatelia vidia len svoje namáčania
CREATE POLICY "Users can view own soaking completions"
  ON soaking_completions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Používatelia môžu označiť len svoje namáčania
CREATE POLICY "Users can insert own soaking completions"
  ON soaking_completions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
```

**Výsledok**: Každý používateľ vidí len svoje upozornenia a môže označiť len svoje namáčania.

## Troubleshooting

### Problém: Build chyba "Cannot find module"

**Riešenie:**
```bash
npm install date-fns lucide-react
```

### Problém: RPC funkcia neexistuje

**Riešenie:**
```bash
# Aplikuj migráciu znovu
supabase db reset
# alebo
psql $DATABASE_URL -f supabase/migrations/add_soaking_reminders_system.sql
```

### Problém: Real-time nefunguje

**Kontrola:**
```typescript
// V konzole prehliadača
console.log('Supabase channel:', channel.state);
```

**Riešenie:**
Skontroluj Supabase dashboard → Database → Replication:
- ✅ `soaking_completions` má replication enabled
- ✅ `planting_plans` má replication enabled

## Súhrn

Systém upozornení na namáčanie semien:

1. ✅ **Automatický** - Žiadne manuálne vstupy
2. ✅ **Inteligentný** - Rozpozná dlhé vs. krátke namáčanie
3. ✅ **Real-time** - Okamžité aktualizácie
4. ✅ **Vizuálny** - Jasné farebné indikátory
5. ✅ **Jednoduchý** - Jedno kliknutie na označenie
6. ✅ **Bezpečný** - RLS polícy na ochranu dát

**Výsledok**: Nikdy nezabudnete namočiť semená pred sadením!
