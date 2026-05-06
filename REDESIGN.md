# OrdersPage — Redesign Instructions

## Princíp

**Meniť iba vizuálnu vrstvu.** Všetka existujúca funkcionalita musí zostať zachovaná:
- filtre (status, typ zákazníka, trasa, dátum, kategória)
- opakované objednávky (recurring)
- sprievodca vytváraním objednávky (wizard)
- kopírovanie / úprava / mazanie
- export (Excel, PDF)
- hromadná zmena dátumu (bulk date change)

---

## Detail dialog — hotové (commit ec1f9f7)

### 1. Tabs: Detail | História

Dialóg má dve záložky. Tab navigácia je sticky pod nadpisom.

- **Detail** — existujúci obsah (zákazník, trasa, položky, cena)
- **História** — timeline dostupných udalostí

Pri zatvorení dialógu sa tab resetuje na `detail`.

### 2. Status Stepper

Nahradil jednoduchý Badge. Zobrazuje horizontálny postup:

```
Čakajúca → Potvrdená → Rastie → Zabalená → Na ceste → Doručená
```

Vizuálne stavy krokov:
- **Splnený** (`idx < current`): zelený kruh + biela fajka (Check icon)
- **Aktuálny** (`idx === current`): zelený kruh + tieň + biely bodka vnútri
- **Budúci** (`idx > current`): biely kruh + sivý border
- **Zrušená** objednávka: červená správa namiesto steppera (X icon)

Mapovanie statusov na kroky (viacero DB hodnôt → jeden krok):

| Krok | DB hodnoty |
|---|---|
| Čakajúca | `cakajuca`, `pending`, `pending_approval` |
| Potvrdená | `potvrdena`, `confirmed` |
| Rastie | `growing` |
| Zabalená | `packed`, `pripravena`, `ready`, `packaging_ready` |
| Na ceste | `on_the_way` |
| Doručená | `dorucena`, `delivered` |

### 3. Quick Action Buttons

Pod stepperom, skryté pre terminálne stavy (`dorucena`, `zrusena`).

Dve tlačidlá:
1. **Primárne** — posun na ďalší logický stav (farba zodpovedá stavu)
2. **Zrušiť** — vždy prítomné pre ne-terminálne stavy (červený border)

Mapovanie primárnych tlačidiel:

| Aktuálny stav | Tlačidlo | Farba |
|---|---|---|
| Čakajúca / pending | Potvrdiť objednávku | modrá |
| pending_approval | Schváliť a potvrdiť | fialová |
| Potvrdená | Označiť: Rastie | violet |
| Rastie | Označiť: Zabalená | amber |
| Zabalená / ready | Odoslať: Na ceste | sky |
| **Na ceste** | **✓ Označiť ako Doručenú** | **zelená** |

Zmena stavu: Supabase UPDATE → lokálny state (stepper sa aktualizuje ihneď bez reloadu) → toast notifikácia.

### 4. História tab — timeline

Zobrazuje dostupné udalosti chronologicky (bez DB tabuľky histórie):

```
● Objednávka vytvorená        [created_at timestamp]
    [APP badge ak order_source = 'app']

⏱ Aktuálny stav: {label}     [len pre ne-terminálne stavy]
    Plánované dodanie: {delivery_date}

✓ Objednávka doručená         [len ak status = dorucena/delivered]

✗ Objednávka zrušená          [len ak status = zrusena alebo cancelled_at existuje]
    [cancelled_at timestamp]
```

Poznámka na konci: „Podrobná história zmien stavu nie je momentálne sledovaná."

---

## Možné ďalšie kroky (nie sú implementované)

### A. Sledovanie histórie stavov v DB

Vytvoriť tabuľku `order_status_history`:
```sql
create table order_status_history (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders(id) on delete cascade,
  from_status text,
  to_status text,
  changed_at timestamptz default now(),
  changed_by text  -- user email alebo 'system'
);
```

Trigger alebo volanie pri každej zmene stavu (vrátane `handleQuickStatusChange`).  
História tab by potom zobrazila reálne záznamy.

### B. Vizuálny redesign kariet (grid/list view)

- Pridať farebnú ľavú čiaru podľa statusu (border-left)
- Zákazníkov typ (Domáci/Gastro/VO) zobraziť ako farebnú ikonu-chip

### C. Klávesové skratky v dialógu

- `D` → Označiť ako Doručenú (ak Na ceste)
- `E` → Otvoriť úpravu
- `Esc` → Zatvoriť

### D. Mobilná optimalizácia steppera

Na malých obrazovkách zobraziť len aktuálny krok + šípky (nie všetkých 6 krokov naraz).

---

## Súbory

| Súbor | Popis |
|---|---|
| `src/pages/OrdersPage.tsx` | Hlavná stránka — všetky zmeny tu |
| `src/components/filters/CustomerTypeFilter.tsx` | Filter typu zákazníka |
| `src/components/orders/` | Dialógy pre recurring, bulk date change atď. |
