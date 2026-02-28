# GROWBASE MANAGER - SESSION CONTEXT 2026-02-28

## 📋 PROJEKT INFO
- **Názov:** GrowBase Manager
- **Stack:** React, TypeScript, Supabase, Vite, Tailwind, shadcn/ui
- **Databáza:** Supabase PostgreSQL
- **Deployment:** Cloudflare Pages
- **Lokalizácia:** Slovenčina (sk)

---

## ✅ HOTOVÉ IMPLEMENTÁCIE

### 1. SKU ODSTRÁNENÉ Z PACKAGING
**Súbor:** `src/pages/PackagingPage.tsx`
**Zmeny:** Odstránený SKU stĺpec z tabuľky a cards view
**Dôvod:** SKU je len pre finálne produkty, nie obaly

---

### 2. POZNÁMKY V ZBERE A BALENÍ
**Súbor:** `src/pages/HarvestPackingPage.tsx`
**Implementácia:**
```tsx
{order.notes && (
  <div className="mt-2 p-2 bg-white border-l-4 border-red-500 rounded text-sm flex items-start gap-2">
    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
    <div>
      <strong className="text-red-700">Poznámka:</strong> {order.notes}
    </div>
  </div>
)}
```
**Použitie:** Upozornenie na špeciálne požiadavky zákazníka

---

### 3. SIDEBAR TOGGLE CEZ LOGO
**Súbory:** `MainLayout.tsx`, `Sidebar.tsx`
**Funkcia:** Klik na Sprout ikonu skryje/zobrazí sidebar
**State:** localStorage persistence (`sidebar-collapsed`)
**Kód:**
```tsx
// MainLayout.tsx
const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
  return localStorage.getItem('sidebar-collapsed') === 'true';
});

const handleToggleSidebar = () => {
  setSidebarCollapsed(prev => {
    const newValue = !prev;
    localStorage.setItem('sidebar-collapsed', String(newValue));
    return newValue;
  });
};

// Sidebar.tsx
<div onClick={onToggleSidebar} className="cursor-pointer">
  <Sprout className="h-8 w-8 text-green-600" />
</div>
```

---

### 4. VÄČŠIE PÍSMO
**Globálne zmeny:**
- Názvy plodín: `text-lg font-semibold`
- Mená zákazníkov: `text-base font-medium`
- Množstvá: `text-base`
- Tlačidlá: `text-base`
- Labels: `text-sm font-medium`

**Dôvod:** Lepšia čitateľnosť na mobile aj desktop

---

### 5. ETIKETA BADGE
**Styling:**
```tsx
<Badge className="bg-[#FFFF00] text-gray-900 border-2 border-black font-semibold">
  ETIKETA
</Badge>
```
**Použitie:** Výrazné označenie produktov potrebujúcich etiketovanie
**Farba:** Žltá (#FFFF00) s čiernym okrajom pre maximálnu viditeľnosť

---

### 6. PACKAGING SIZE FILTER
**Súbor:** `src/pages/HarvestPackingPage.tsx`
**Funkcia:** Dynamický filter veľkostí balení (50g, 70g, 100g...)
**Logika:**
```tsx
const [packagingSizeFilter, setPackagingSizeFilter] = useState<string>('all');
const [availableSizes, setAvailableSizes] = useState<number[]>([]);

useEffect(() => {
  const sizes = new Set<number>();
  orders.forEach(order => {
    order.items?.forEach(item => {
      const size = item.package_ml || item.package_g;
      if (size) sizes.add(size);
    });
  });
  setAvailableSizes(Array.from(sizes).sort((a, b) => a - b));
}, [orders]);
```

---

### 7. MULTI-DATE CALENDAR
**Súbor:** `src/pages/OrdersPage.tsx`, `src/pages/HarvestPackingPage.tsx`
**Funkcia:** Multi-select kalendár s toggle režimom
**Implementácia:**
```tsx
const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()]);

onClick={() => {
  setSelectedDates(prev => {
    const exists = prev.some(d => isSameDay(d, day));
    if (exists) {
      return prev.filter(d => !isSameDay(d, day));
    } else {
      return [...prev, day];
    }
  });
}}
```
**Features:**
- Zelené pozadie = rozvozový deň (delivery_days_settings)
- Žlté pozadie = má objednávky
- Modrý ring = vybraný deň
- Ctrl+Cmd tip v legende

---

### 8. HOTOVO → ROZVOZ WORKFLOW

**HarvestPackingPage.tsx:**
```tsx
const updateOrderStatus = async (orderId: string, isCompleting: boolean) => {
  const newStatus = isCompleting ? 'ready' : null;
  await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);
};

const handleToggleItemComplete = async (itemKey: string, orderId: string) => {
  const isCompleting = !completedItems.has(itemKey);

  setCompletedItems(prev => {
    const newSet = new Set(prev);
    isCompleting ? newSet.add(itemKey) : newSet.delete(itemKey);
    return newSet;
  });

  await updateOrderStatus(orderId, isCompleting);
};

// Načítanie stavov z DB pri štarte
useEffect(() => {
  const completed = new Set<string>();
  orders.forEach(order => {
    if (order.status === 'ready') {
      order.items?.forEach(item => {
        const itemKey = `${order.id}-${item.id || 0}`;
        completed.add(itemKey);
      });
    }
  });
  setCompletedItems(completed);
}, [orders]);
```

**PrepPackagingPage.tsx:**
Rovnaká logika ALE status = `'packaging_ready'`

**DeliveryPage.tsx:**
Filtruje len orders kde `status === 'ready'`

---

### 9. DETAIL DIALOG V ROZVOZE
**Súbor:** `src/pages/DeliveryPage.tsx`
**Funkcia:** Klik na objednávku otvorí detail dialog
**Features:**
- Info o zákazníkovi (meno, typ, kontakt)
- Zoznam produktov s cenami
- Poznámky (červený alert ak existujú)
- Celková suma + doprava
- Označiť ako doručené button

---

### 10. OPRAVENÉ CENY V ROZVOZE
**PROBLÉM:** `calculateWithVat()` pridával DPH 2x
**RIEŠENIE:**
```tsx
// ✅ SPRÁVNE:
const qty = parseFloat(item.quantity?.toString() || '0');
const pricePerUnit = parseFloat(item.price_per_unit?.toString().replace(',', '.') || '0');
const itemTotal = qty * pricePerUnit;

// ❌ ZLÉ (ODSTRÁNENÉ):
const itemTotal = calculateWithVat((unitPrice || 0) * item.quantity);
```

**Dôvod:** `order_items.price_per_unit` už obsahuje DPH!

---

### 11. ROZVOZ - KOMPLETNÁ ÚPRAVA

#### HOTOVÉ:
✅ Odstránené rozvozové dni buttony
✅ Pridaný kalendár button (Popover)
✅ Pridaný filter zákazníka (SearchableCustomerSelect)
✅ Centrované labels
✅ Odstránený "Obsah objednávky"
✅ CalendarGrid z HarvestPackingPage
✅ isDeliveryDay funkcia implementovaná
✅ Filter logika na konkrétneho zákazníka

#### IMPLEMENTOVANÉ DNES (2026-02-28):
```tsx
// isDeliveryDay funkcia
const isDeliveryDay = (date: Date) => {
  if (!deliverySettings) return false;
  const dayOfWeek = getDay(date);
  const dayMap: Record<number, string> = {
    1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday'
  };
  return deliverySettings[dayMap[dayOfWeek]] === true;
};

// SearchableCustomerSelect
<SearchableCustomerSelect
  customers={customers}
  value={customerFilter}
  onValueChange={setCustomerFilter}
  placeholder="Všetci zákazníci"
  filterByType={selectedCustomerType}
  allowAll={true}
/>

// Filter logika
if (customerFilter !== 'all') {
  ordersForDate = ordersForDate.filter(order => {
    return order.customer_id === customerFilter;
  });
}
```

#### OSTÁVA DODAŤ:
- ⏳ Telefón ikona (tel: link)
- ⏳ Waze ikona + link
- ⏳ Google Maps ikona + link
- ⏳ Adresa z customers.address
- ⏳ Možno drag-and-drop pre poradie rozvozu

---

## 📊 DATABÁZOVÁ LOGIKA

### STATUSY (orders.status):
| Status | Význam | Zobrazenie |
|--------|--------|-----------|
| `NULL` / `pending` | Nová objednávka | OrdersPage |
| `packaging_ready` | Obaly pripravené (PrepPackaging) | NEZOBRAZÍ v DeliveryPage |
| `ready` | Zabalené (HarvestPacking) | ZOBRAZÍ v DeliveryPage |
| `delivered` | Doručené | DeliveryPage (archív) |

### CENY - KRITICKÁ LOGIKA:
```typescript
// order_items tabuľka
price_per_unit: number   // Už obsahuje DPH! NIKDY nepridávať DPH!
quantity: number         // Množstvo kusov
total_price: number      // price_per_unit × quantity

// orders tabuľka
total_price: number      // IGNORUJE SA v DeliveryPage! Prepočítaj z items!
delivery_price: number   // Cena dopravy (už s DPH)
```

**VÝPOČET CENY V ROZVOZE:**
```tsx
// Suma položiek
const itemsTotal = orderItems.reduce((sum, item) => {
  const qty = parseFloat(item.quantity?.toString() || '0');
  const price = parseFloat(item.price_per_unit?.toString().replace(',', '.') || '0');
  return sum + (qty * price);
}, 0);

// Doprava
const delivery = parseFloat(order.delivery_price?.toString() || '0');

// Celkom
const orderTotal = itemsTotal + delivery;
```

### ITEMKEY FORMÁT:
```tsx
const itemKey = `${order.id}-${item.id || 0}`;
```
**DÔLEŽITÉ:** MUSÍ byť ROVNAKÝ v useEffect aj renderingu!

### DELIVERY_DAYS_SETTINGS:
```sql
CREATE TABLE delivery_days_settings (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  monday boolean DEFAULT false,
  tuesday boolean DEFAULT false,
  wednesday boolean DEFAULT false,
  thursday boolean DEFAULT false,
  friday boolean DEFAULT false,
  saturday boolean DEFAULT false,
  sunday boolean DEFAULT false
);
```

---

## ❌ ČO NESMIEME - PRAVIDLÁ

### 1. CENY - NIKDY:
❌ `calculateWithVat()` pri zobrazovaní cien
❌ `order.total_price` v DeliveryPage (prepočítaj z items)
❌ Pridávať DPH k `order_items.price_per_unit`

### 2. ITEMKEY - NIKDY:
❌ Meniť formát `${order.id}-${item.id || 0}`
❌ Používať iný separator ako `-`
❌ Vynechať `|| 0` fallback

### 3. IMPORTY - NIKDY:
❌ Duplikátne importy
❌ Nepoužité importy
❌ Relatívne cesty namiesto `@/`

### 4. STATE - NIKDY:
❌ Miešať `selectedDate` a `selectedDates` bez synchronizácie
❌ Zabudnúť localStorage persistence pre sidebar
❌ Nevalidovať dáta pred setState

### 5. STYLING - NIKDY:
❌ Používať purple/indigo/violet (len na žiadosť)
❌ Malé písmo (min. text-sm)
❌ Nečitateľné farby (vždy contrast check)

---

## 🎨 STYLING GUIDE

### FARBY:
```tsx
// Etiketa badge
bg-[#FFFF00] text-gray-900 border-2 border-black

// Hotovo tlačidlo
bg-green-600 text-white (completed)
bg-gray-200 text-gray-700 (not completed)

// rPET badge
bg-green-600 text-white

// Poznámka alert
bg-white border-l-4 border-red-500
text-red-700 (text)

// Rozvozový deň (kalendár)
bg-green-200 hover:bg-green-300

// Objednávky mimo rozvozu (kalendár)
bg-yellow-300 hover:bg-yellow-400

// Vybraný deň (kalendár)
ring-2 ring-blue-500
```

### PÍSMO:
```tsx
// Názvy plodín
text-lg font-semibold

// Mená zákazníkov
text-base font-medium

// Množstvá, ceny
text-base

// Tlačidlá
text-base

// Labels
text-sm font-medium text-gray-700

// Poznámky, popisky
text-sm text-gray-600
```

### SPACING:
```tsx
// Cards gap
gap-4

// Padding v kartách
p-4

// Margins medzi sekciami
space-y-4

// Grid columns
grid-cols-1 md:grid-cols-2 lg:grid-cols-3
```

---

## 🛠️ TECHNICKÉ DETAILY

### ŠTANDARDNÉ IMPORTY:
```tsx
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, startOfDay, getDay, isToday } from 'date-fns';
import { sk } from 'date-fns/locale';
import {
  Leaf, // Plodina ikona
  Blend, // Blend ikona
  Phone, // Telefón ikona
  Navigation, // Waze/Maps ikona
  AlertTriangle, // Upozornenie ikona
  Menu, // Hamburger menu
  CalendarIcon, // Kalendár ikona
  Check, // Checkmark
  ChevronLeft, // Šípka doľava
  ChevronRight // Šípka doprava
} from 'lucide-react';
```

### SUPABASE QUERIES:
```tsx
// Načítanie objednávok s items
const { data: orders } = await supabase
  .from('orders')
  .select(`
    *,
    items:order_items(*)
  `)
  .eq('delivery_date', format(selectedDate, 'yyyy-MM-dd'))
  .order('created_at', { ascending: false });

// Update statusu
await supabase
  .from('orders')
  .update({ status: 'ready' })
  .eq('id', orderId);

// Načítanie delivery settings
const { data: settings } = await supabase
  .from('delivery_days_settings')
  .select('*')
  .eq('user_id', user.id)
  .maybeSingle();
```

### HOOKS:
```tsx
// Auth
const { user } = useAuth();

// Toast notifikácie
const { toast } = useToast();
toast({
  title: 'Úspech',
  description: 'Objednávka bola označená ako doručená',
});

// Delivery days
const { settings: deliverySettings } = useDeliveryDays();

// Prices
const { getPrice } = usePrices();

// Data loading
const {
  orders,
  customers,
  crops,
  blends,
  loading
} = useSupabaseData();
```

---

## 📁 SÚBORY S NAJNOVŠÍMI ZMENAMI

### Core Pages:
1. `src/pages/HarvestPackingPage.tsx` - Multi-date kalendár, poznámky, hotovo workflow
2. `src/pages/PrepPackagingPage.tsx` - Packaging workflow (status: packaging_ready)
3. `src/pages/DeliveryPage.tsx` - CalendarGrid, filter zákazníka, ceny opravené
4. `src/pages/OrdersPage.tsx` - Multi-date kalendár
5. `src/pages/PackagingPage.tsx` - SKU odstránené

### Layout:
6. `src/components/layout/MainLayout.tsx` - Sidebar toggle
7. `src/components/layout/Sidebar.tsx` - Logo click handler

### Components:
8. `src/components/orders/SearchableCustomerSelect.tsx` - Searchable select s filterom

### Hooks:
9. `src/hooks/useDeliveryDays.tsx` - Delivery days settings
10. `src/hooks/usePrices.tsx` - Price calculations

---

## 🔄 WORKFLOW DIAGRAM

```
1. OrdersPage (status: null/pending)
   ↓
2. PrepPackagingPage
   - Pripraviť obaly
   - Status → 'packaging_ready'
   ↓
3. HarvestPackingPage
   - Zbaliť produkty
   - Status → 'ready'
   ↓
4. DeliveryPage
   - Rozviezť objednávky
   - Status → 'delivered'
```

---

## 🚀 ĎALŠÍ KROK - TODO

### DeliveryPage - Navigácia a kontakty:
```tsx
// TODO: Pridať do detail dialogu
<div className="space-y-2">
  {/* Adresa */}
  <div className="flex items-start gap-2">
    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
    <span className="text-sm">{customer.address}</span>
  </div>

  {/* Telefón */}
  {customer.phone && (
    <a
      href={`tel:${customer.phone}`}
      className="flex items-center gap-2 text-blue-600 hover:underline"
    >
      <Phone className="h-4 w-4" />
      <span className="text-sm">{customer.phone}</span>
    </a>
  )}

  {/* Navigácia */}
  <div className="flex gap-2">
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        const address = encodeURIComponent(customer.address);
        window.open(`https://waze.com/ul?q=${address}`, '_blank');
      }}
    >
      <Navigation className="h-4 w-4 mr-2" />
      Waze
    </Button>

    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        const address = encodeURIComponent(customer.address);
        window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
      }}
    >
      <MapPin className="h-4 w-4 mr-2" />
      Google Maps
    </Button>
  </div>
</div>
```

### Drag-and-Drop pre poradie rozvozu (optional):
```tsx
// TODO: Implementovať @dnd-kit/sortable pre zmenu poradia objednávok
// Uložiť do orders.delivery_order (INT)
```

---

## 📝 POZNÁMKY PRE BUDÚCNOSŤ

### Performance:
- Veľkosť bundlu: 2.7 MB (main chunk)
- Zvážiť code splitting pre veľké stránky
- useMemo pre náročné výpočty (už implementované)

### Možné vylepšenia:
- Offline mode s service worker
- Push notifikácie pre nové objednávky
- Export do PDF (tlačidlá pripravené)
- Automatické generovanie etikiet
- QR kódy pre produkty

### Bezpečnosť:
- RLS policies sú nastavené
- Auth je cez Supabase
- CORS je správne nakonfigurované

---

## 🎯 SESSION SUMMARY

**Dátum:** 2026-02-28
**Trvanie:** ~2 hodiny
**Hlavné úlohy:**
1. ✅ Kopírovanie CalendarGrid z HarvestPackingPage do DeliveryPage
2. ✅ Implementácia isDeliveryDay funkcie
3. ✅ Pridanie SearchableCustomerSelect
4. ✅ Filter logika na konkrétneho zákazníka
5. ✅ Build successful

**Ďalší krok:**
Pridať navigáciu (Waze, Google Maps) a kontakty do DeliveryPage

---

**KONIEC CONTEXT REPORTU**
