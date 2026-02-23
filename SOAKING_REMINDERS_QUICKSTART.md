# Soaking Reminders - Quick Start

Rýchly sprievodca pre začiatok práce so systémom upozornení na namáčanie semien.

## 🚀 Rýchly štart (5 minút)

### Krok 1: Aplikuj migráciu (už hotové ✓)

Migrácia bola automaticky aplikovaná. Overenie:

```sql
-- V Supabase SQL Editor
SELECT * FROM soaking_completions LIMIT 1;
SELECT * FROM get_pending_soaking_reminders();
```

Ak funguje → prejdi na krok 2.

### Krok 2: Vytvor testovacie dáta

V Supabase SQL Editor:

```sql
-- Vytvor plán sadenia hráška na zajtra (12h namáčanie)
INSERT INTO planting_plans (
  user_id,
  crop_id,
  sow_date,
  expected_harvest_date,
  tray_count,
  tray_size,
  seed_amount_grams,
  status
) VALUES (
  auth.uid(),
  (SELECT id FROM products WHERE name ILIKE '%hrach%affyla%' LIMIT 1),
  CURRENT_DATE + INTERVAL '1 day',
  CURRENT_DATE + INTERVAL '12 days',
  7,
  'XL',
  700,
  'planned'
);

-- Vytvor plán sadenia slnečnice na dnes (0.5h namáčanie)
INSERT INTO planting_plans (
  user_id,
  crop_id,
  sow_date,
  expected_harvest_date,
  tray_count,
  tray_size,
  seed_amount_grams,
  status
) VALUES (
  auth.uid(),
  (SELECT id FROM products WHERE name ILIKE '%slnečnic%' LIMIT 1),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '8 days',
  3,
  'XL',
  180,
  'planned'
);
```

### Krok 3: Otvor Dashboard

1. Choď na `/` (Dashboard)
2. Hore uvidíš oranžový widget **"💧 NAMOČIŤ SEMENÁ"**
3. Mali by sa zobraziť 2 upozornenia:
   - 🟠 Hrách Affyla (Sadí sa ZAJTRA)
   - 🔴 Slnečnica (Sadí sa DNES)

### Krok 4: Otestuj funkčnosť

1. Klikni **[✓ Namočené]** na jednom upozornení
2. Upozornenie by malo zmiznúť
3. Zobrazí sa zelený toast: "✓ [Plodina] - namáčanie označené ako dokončené"

**Hotovo!** ✅

---

## 📋 Čo robiť ďalej?

### Pridaj namáčanie pre ďalšie plodiny

```sql
-- Príklad: Fazuľa mungo (8 hodín)
UPDATE products
SET
  soaking = true,
  soaking_duration_hours = 8
WHERE name ILIKE '%fazuľa mungo%';
```

### Skontroluj, ktoré plodiny majú namáčanie

```sql
SELECT name, soaking, soaking_duration_hours
FROM products
WHERE soaking = true
ORDER BY soaking_duration_hours DESC;
```

### Zobraz všetky nadchádzajúce namáčania

```sql
SELECT * FROM get_pending_soaking_reminders();
```

---

## 🎯 Ako to funguje?

### Jednoduché pravidlo:

- **≥ 8 hodín** (napr. hrášok 12h) → Upozornenie **DEŇ PRED** sadením
- **< 8 hodín** (napr. slnečnica 0.5h) → Upozornenie **V DEŇ** sadenia

### Príklad:

```
Plán sadenia: 25.1.2026 (zajtra)
Plodina: Hrášok (12h namáčanie)
Upozornenie: Zobrazí sa DNES (24.1.2026)

Dôvod: Môžeš namočiť večer a semená budú
pripravené na sadenie ráno.
```

---

## ❓ Riešenie problémov

### Problém: Nevidím žiadne upozornenia

**Kontrola 1**: Máš plány sadenia?
```sql
SELECT * FROM planting_plans
WHERE sow_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
  AND status = 'planned';
```

**Kontrola 2**: Vyžaduje plodina namáčanie?
```sql
SELECT p.name, p.soaking, p.soaking_duration_hours
FROM planting_plans pp
JOIN products p ON p.id = pp.crop_id
WHERE pp.sow_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days';
```

**Kontrola 3**: Nie je už označené ako dokončené?
```sql
SELECT * FROM soaking_completions
WHERE planting_plan_id IN (
  SELECT id FROM planting_plans
  WHERE sow_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
);
```

### Problém: Upozornenie sa nezmazalo po kliknutí

**Riešenie**: Obnoviť stránku
```
F5 alebo Ctrl+R
```

**Kontrola**: Pozri browser konzolu
```
F12 → Console → Hľadaj chyby
```

---

## 🧪 Testovanie

Kompletné testovanie:
```bash
# V Supabase SQL Editor spusti:
db/test-soaking-reminders.sql
```

Alebo manuálne testy v SOAKING_REMINDERS_GUIDE.md

---

## 📚 Kompletná dokumentácia

Pre detailnú dokumentáciu pozri:
- **SOAKING_REMINDERS_GUIDE.md** - Úplný sprievodca
- **db/test-soaking-reminders.sql** - Testovacie skripty

---

## 🎨 Farby v UI

- 🟢 **Zelená** - Žiadne upozornenia (všetko OK)
- 🟠 **Oranžová** - Sadí sa zajtra
- 🔴 **Červená** - Sadí sa dnes (urgentné!)
- 🟡 **Žltá** - Sadí sa o 2-3 dni

---

## 💡 Tipy

1. **Večerné namáčanie**: Pre dlhé namáčanie (12h), najlepšie namočiť večer o 20:00
2. **Tesne pred sadením**: Pre krátke namáčanie (0.5h), namočiť tesne pred použitím
3. **Teplota vody**: Používaj vlažnú vodu (cca 20°C)
4. **Časté kontroly**: Kontroluj upozornenia každé ráno na Dashboarde

---

## ✅ Kontrolný zoznam

Systém funguje správne, ak:

- [x] Migrácia aplikovaná
- [x] Testovacie dáta vytvorené
- [x] Widget sa zobrazuje na Dashboarde
- [x] Upozornenia sa zobrazujú správne
- [x] Kliknutie na "Namočené" funguje
- [x] Upozornenie zmizne po označení
- [x] Real-time updates fungujú

---

**Pomoc**: Ak niečo nefunguje, pozri SOAKING_REMINDERS_GUIDE.md → Troubleshooting sekciu.

**Kontakt**: Pre otázky vytvor issue v repozitári.

---

Viac podrobností v **SOAKING_REMINDERS_GUIDE.md** 📖
