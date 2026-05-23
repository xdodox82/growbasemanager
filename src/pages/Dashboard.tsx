import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingCart,
  Euro,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sprout,
  Package,
  Tag,
  Layers,
  ShoppingBag,
  ArrowRight,
  Users,
  Truck,
  Sun,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatEur, formatWeight, formatNumber, formatKg, formatPercent } from '@/utils/formatters';

// ===================== TYPES =====================

interface RevenueByType {
  home: number;
  gastro: number;
  wholesale: number;
  total: number;
}

interface OrdersByType {
  home: number;
  gastro: number;
  wholesale: number;
  total: number;
}

interface DailyPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface HarvestPlan {
  id: string;
  crop_id: string;
  cropName: string;
  cropColor: string;
  sow_date: string;
  expected_harvest_date: string;
  status: string;
  tray_size: string;
  tray_count: number;
  yieldGrams: number;
}

interface LowStockItem {
  id: string;
  name: string;
  category: 'seeds' | 'packaging' | 'substrate' | 'labels' | 'consumable';
  quantity: number;
  minStock: number;
  unit: string;
}

// ===================== HELPERS =====================

const SK_MONTHS_GEN = [
  'januára', 'februára', 'marca', 'apríla', 'mája', 'júna',
  'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'
];

const STATUS_LABELS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Čakajúce', bg: '#fef3c7', fg: '#92400e' },
  pending_approval: { label: 'Čaká schválenie', bg: '#fef3c7', fg: '#92400e' },
  cakajuca: { label: 'Čakajúce', bg: '#fef3c7', fg: '#92400e' },
  confirmed: { label: 'Potvrdené', bg: '#dbeafe', fg: '#1e40af' },
  potvrdena: { label: 'Potvrdené', bg: '#dbeafe', fg: '#1e40af' },
  growing: { label: 'Pestuje sa', bg: '#dcfce7', fg: '#166534' },
  packed: { label: 'Zabalené', bg: '#dcfce7', fg: '#166534' },
  pripravena: { label: 'Pripravené', bg: '#dcfce7', fg: '#166534' },
  on_the_way: { label: 'Na ceste', bg: '#dbeafe', fg: '#1e40af' },
  delivered: { label: 'Doručené', bg: '#d1fae5', fg: '#064e3b' },
  cancelled: { label: 'Zrušené', bg: '#fee2e2', fg: '#991b1b' },
};

const getMonday = (d: Date): Date => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const formatWeekRange = (monday: Date): string => {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const sameYear = monday.getFullYear() === sunday.getFullYear();
  if (sameMonth && sameYear) {
    return `${monday.getDate()}. – ${sunday.getDate()}. ${SK_MONTHS_GEN[monday.getMonth()]} ${monday.getFullYear()}`;
  }
  if (sameYear) {
    return `${monday.getDate()}. ${SK_MONTHS_GEN[monday.getMonth()]} – ${sunday.getDate()}. ${SK_MONTHS_GEN[sunday.getMonth()]} ${monday.getFullYear()}`;
  }
  return `${monday.getDate()}. ${SK_MONTHS_GEN[monday.getMonth()]} ${monday.getFullYear()} – ${sunday.getDate()}. ${SK_MONTHS_GEN[sunday.getMonth()]} ${sunday.getFullYear()}`;
};

const toIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Normalize customer type to 3 categories
const normCustomerType = (raw: string | null | undefined): 'home' | 'gastro' | 'wholesale' => {
  if (!raw) return 'home';
  const t = raw.toLowerCase().trim();
  if (t === 'gastro' || t === 'restaurant' || t === 'reštaurácia') return 'gastro';
  if (t === 'wholesale' || t === 'vo' || t === 'veľkoodber' || t === 'velkoodber' || t === 'b2b') return 'wholesale';
  return 'home';
};

// Extract grams from packaging_size string like "250ml", "500g", "100"
const parseGrams = (size: string | null | undefined): number => {
  if (!size) return 0;
  const m = String(size).match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
};

// Extract unit price from order_item (supporting both price_per_unit and unit_price field names)
const itemUnitPrice = (item: any): number => {
  if (typeof item.price_per_unit === 'number') return item.price_per_unit;
  if (typeof item.unit_price === 'number') return item.unit_price;
  if (typeof item.price === 'number') return item.price;
  return 0;
};

// ===================== SPARKLINE =====================

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

const Sparkline = ({ data, color = '#16a34a', width = 120, height = 32 }: SparklineProps) => {
  if (!data || data.length === 0) {
    return <div style={{ width, height }} className="opacity-20" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Area pod čiarou — pre subtle pozadie
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polygon points={areaPoints} fill={color} opacity={0.1} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ===================== COMPARISON BADGE =====================

interface ComparisonBadgeProps {
  current: number;
  previous: number;
  formatAbs?: (n: number) => string;
  // ak je hodnota peniaze → formatEur, inak default na číslo
}

const ComparisonBadge = ({ current, previous, formatAbs }: ComparisonBadgeProps) => {
  if (previous === 0 && current === 0) {
    return <span className="inline-flex items-center text-[11px] text-[#94a3b8]"><Minus className="h-3 w-3 mr-0.5" />bez zmeny</span>;
  }
  const diff = current - previous;
  const pct = previous === 0 ? 100 : Math.round((diff / previous) * 100);
  const isUp = diff > 0;
  const isDown = diff < 0;
  const color = isUp ? 'text-[#16a34a]' : isDown ? 'text-[#dc2626]' : 'text-[#94a3b8]';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const formatted = formatAbs ? formatAbs(Math.abs(diff)) : String(Math.abs(diff));
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-semibold', color)}>
      <Icon className="h-3 w-3" />
      {isUp ? '+' : isDown ? '−' : ''}{Math.abs(pct)}% · {formatted}
    </span>
  );
};

// ===================== MAIN COMPONENT =====================

const Dashboard = () => {
  const { user } = useAuth();

  // Loading + data state
  const [loading, setLoading] = useState(true);
  const [revenueWeek, setRevenueWeek] = useState<RevenueByType>({ home: 0, gastro: 0, wholesale: 0, total: 0 });
  const [revenuePrevWeek, setRevenuePrevWeek] = useState<RevenueByType>({ home: 0, gastro: 0, wholesale: 0, total: 0 });
  const [ordersWeek, setOrdersWeek] = useState<OrdersByType>({ home: 0, gastro: 0, wholesale: 0, total: 0 });
  const [ordersPrevWeek, setOrdersPrevWeek] = useState<OrdersByType>({ home: 0, gastro: 0, wholesale: 0, total: 0 });
  const [dailyPoints14, setDailyPoints14] = useState<DailyPoint[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [activeCustomers, setActiveCustomers] = useState<number>(0);
  const [nextDeliveryToday, setNextDeliveryToday] = useState<string | null>(null);
  const [harvestPlans, setHarvestPlans] = useState<HarvestPlan[]>([]);
  const [orderedGramsThisWeek, setOrderedGramsThisWeek] = useState<number>(0);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);

  // ===================== DATE RANGE =====================

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const weekRange = useMemo(() => {
    const mon = getMonday(today);
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    return {
      monday: mon,
      sunday: sun,
      mondayStr: toIsoDate(mon),
      sundayStr: toIsoDate(sun),
    };
  }, [today]);

  const prevWeekRange = useMemo(() => {
    const mon = new Date(weekRange.monday);
    mon.setDate(mon.getDate() - 7);
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    return {
      monday: mon,
      sunday: sun,
      mondayStr: toIsoDate(mon),
      sundayStr: toIsoDate(sun),
    };
  }, [weekRange]);

  // 14 dní (predchádzajúce + tento týždeň)
  const sparkRange = useMemo(() => {
    const start = new Date(prevWeekRange.monday);
    return {
      start,
      startStr: toIsoDate(start),
      endStr: weekRange.sundayStr,
    };
  }, [prevWeekRange, weekRange]);

  // ===================== USER NAME =====================

  const userName = useMemo(() => {
    if (!user) return null;
    const meta: any = user.user_metadata || {};
    return meta.name || meta.full_name || meta.first_name || (user.email ? user.email.split('@')[0] : null);
  }, [user]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return 'Dobré ráno';
    if (h < 18) return 'Dobrý deň';
    return 'Dobrý večer';
  }, []);

  // ===================== FETCHING =====================

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1) Tržby + objednávky za 14 dní (prev week + this week)
      const { data: orders14, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          id, delivery_date, status, customer_id,
          customers:customer_id ( id, customer_type ),
          order_items ( id, crop_id, quantity, packaging_size, price_per_unit, unit_price, price )
        `)
        .gte('delivery_date', sparkRange.startStr)
        .lte('delivery_date', sparkRange.endStr);

      if (ordersErr) {
        console.error('Dashboard orders fetch:', ordersErr);
      }

      // Per-day buckets
      const dayMap: Record<string, DailyPoint> = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(sparkRange.start);
        d.setDate(d.getDate() + i);
        const key = toIsoDate(d);
        dayMap[key] = { date: key, revenue: 0, orders: 0 };
      }

      // Týždenné súhrny
      const rev = { week: { home: 0, gastro: 0, wholesale: 0, total: 0 }, prev: { home: 0, gastro: 0, wholesale: 0, total: 0 } };
      const ord = { week: { home: 0, gastro: 0, wholesale: 0, total: 0 }, prev: { home: 0, gastro: 0, wholesale: 0, total: 0 } };

      // Stav objednávok (len pre tento týždeň)
      const statusMap: Record<string, number> = {};

      // Aktívni zákazníci tento týždeň
      const activeCustomerIds = new Set<string>();

      // Najbližšia dodávka dnes
      const todayStr = toIsoDate(today);
      let nextToday: string | null = null;

      // Objednané gramy tento týždeň (na výpočet kapacity)
      let orderedG = 0;

      (orders14 || []).forEach((o: any) => {
        const deliveryStr = (o.delivery_date || '').split('T')[0];
        const dayPoint = dayMap[deliveryStr];
        if (!dayPoint) return;

        const cType = normCustomerType(o.customers?.customer_type);

        const orderRevenue = (o.order_items || []).reduce((sum: number, it: any) => {
          return sum + itemUnitPrice(it) * (it.quantity || 0);
        }, 0);

        dayPoint.revenue += orderRevenue;
        dayPoint.orders += 1;

        const inThisWeek = deliveryStr >= weekRange.mondayStr && deliveryStr <= weekRange.sundayStr;
        const inPrevWeek = deliveryStr >= prevWeekRange.mondayStr && deliveryStr <= prevWeekRange.sundayStr;

        if (inThisWeek) {
          rev.week[cType] += orderRevenue;
          rev.week.total += orderRevenue;
          ord.week[cType] += 1;
          ord.week.total += 1;

          const st = o.status || 'unknown';
          statusMap[st] = (statusMap[st] || 0) + 1;

          if (o.customer_id) activeCustomerIds.add(o.customer_id);

          if (deliveryStr === todayStr && o.status !== 'delivered' && o.status !== 'cancelled') {
            if (!nextToday) nextToday = o.customers?.customer_type ? '' : null; // placeholder
          }

          // Objednané gramy = sum(packaging_size_g × quantity) cez order_items
          (o.order_items || []).forEach((it: any) => {
            const g = parseGrams(it.packaging_size);
            orderedG += g * (it.quantity || 0);
          });
        } else if (inPrevWeek) {
          rev.prev[cType] += orderRevenue;
          rev.prev.total += orderRevenue;
          ord.prev[cType] += 1;
          ord.prev.total += 1;
        }
      });

      // Najbližšia dodávka dnes — meno zákazníka (najnižší čas)
      const todayOrders = (orders14 || []).filter((o: any) =>
        (o.delivery_date || '').startsWith(todayStr) &&
        o.status !== 'delivered' && o.status !== 'cancelled'
      );
      if (todayOrders.length > 0) {
        // Vyber prvého (najbližší alebo prvý v zozname)
        const first = todayOrders[0];
        const { data: cust } = await supabase
          .from('customers')
          .select('name')
          .eq('id', first.customer_id)
          .single();
        nextToday = cust?.name || `Objednávka ${todayOrders.length}×`;
      }

      setRevenueWeek(rev.week);
      setRevenuePrevWeek(rev.prev);
      setOrdersWeek(ord.week);
      setOrdersPrevWeek(ord.prev);
      setDailyPoints14(Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date)));
      setStatusCounts(Object.entries(statusMap).map(([status, count]) => ({ status, count })));
      setActiveCustomers(activeCustomerIds.size);
      setNextDeliveryToday(nextToday);
      setOrderedGramsThisWeek(orderedG);

      // 2) Planting plans — harvest tento týždeň
      const { data: plans, error: plansErr } = await supabase
        .from('planting_plans')
        .select(`
          id, crop_id, sow_date, expected_harvest_date, status, tray_size, tray_count,
          crops:crop_id ( id, name, color, tray_configs )
        `)
        .gte('expected_harvest_date', weekRange.mondayStr)
        .lte('expected_harvest_date', weekRange.sundayStr)
        .in('status', ['planned', 'in_progress'])
        .order('expected_harvest_date', { ascending: true });

      if (plansErr) console.error('Dashboard plans fetch:', plansErr);

      const harvestList: HarvestPlan[] = (plans || []).map((p: any) => {
        // Normalize tray_configs (DB má lowercase: m/l/xl/s)
        const rawConfigs = p.crops?.tray_configs || {};
        const configs: Record<string, any> = {};
        Object.keys(rawConfigs).forEach(k => { configs[k.toUpperCase()] = rawConfigs[k]; });
        const sizeCfg = configs[p.tray_size] || {};
        const yieldPerTray = sizeCfg.yield_grams ?? sizeCfg.expected_yield ?? 0;
        return {
          id: p.id,
          crop_id: p.crop_id,
          cropName: p.crops?.name || 'Neznáma',
          cropColor: p.crops?.color || '#16a34a',
          sow_date: p.sow_date,
          expected_harvest_date: p.expected_harvest_date,
          status: p.status,
          tray_size: p.tray_size,
          tray_count: p.tray_count || 0,
          yieldGrams: yieldPerTray * (p.tray_count || 0),
        };
      });
      setHarvestPlans(harvestList);

      // 3) Low stock — 5 inventory tabuliek (seeds, packagings, substrates, labels, consumable_inventory)
      const lowStockList: LowStockItem[] = [];

      // Seeds
      const { data: seedsData } = await supabase
        .from('seeds')
        .select('id, quantity, unit, min_stock, crop_id, crops:crop_id(name)')
        .order('quantity');
      (seedsData || []).forEach((s: any) => {
        if (s.min_stock != null && s.quantity < s.min_stock) {
          lowStockList.push({
            id: s.id,
            name: s.crops?.name || 'Osivo',
            category: 'seeds',
            quantity: s.quantity || 0,
            minStock: s.min_stock,
            unit: s.unit || 'g',
          });
        }
      });

      // Packagings
      const { data: packData } = await supabase
        .from('packagings')
        .select('id, name, quantity, min_stock');
      (packData || []).forEach((p: any) => {
        if (p.min_stock != null && p.quantity < p.min_stock) {
          lowStockList.push({
            id: p.id,
            name: p.name || 'Obal',
            category: 'packaging',
            quantity: p.quantity || 0,
            minStock: p.min_stock,
            unit: 'ks',
          });
        }
      });

      // Substrates
      try {
        const { data: subData } = await supabase
          .from('substrates')
          .select('id, name, quantity, current_stock, unit, min_stock');
        (subData || []).forEach((s: any) => {
          const cur = s.current_stock != null && s.current_stock !== '' ? parseFloat(s.current_stock) : (s.quantity || 0);
          if (s.min_stock != null && cur < s.min_stock) {
            lowStockList.push({
              id: s.id,
              name: s.name || 'Substrát',
              category: 'substrate',
              quantity: cur,
              minStock: s.min_stock,
              unit: s.unit || 'kg',
            });
          }
        });
      } catch (e) { /* table môže byť pomenovaná inak */ }

      // Labels
      try {
        const { data: labelsData } = await supabase
          .from('labels')
          .select('id, name, quantity, min_stock');
        (labelsData || []).forEach((l: any) => {
          if (l.min_stock != null && l.quantity < l.min_stock) {
            lowStockList.push({
              id: l.id,
              name: l.name || 'Etiketa',
              category: 'labels',
              quantity: l.quantity || 0,
              minStock: l.min_stock,
              unit: 'ks',
            });
          }
        });
      } catch (e) { /* table môže byť pomenovaná inak */ }

      // Consumable inventory
      try {
        const { data: consData } = await supabase
          .from('consumable_inventory')
          .select('id, name, quantity, unit, min_quantity');
        (consData || []).forEach((c: any) => {
          if (c.min_quantity != null && c.quantity < c.min_quantity) {
            lowStockList.push({
              id: c.id,
              name: c.name,
              category: 'consumable',
              quantity: c.quantity || 0,
              minStock: c.min_quantity,
              unit: c.unit || '',
            });
          }
        });
      } catch (e) { /* table môže neexistovať */ }

      setLowStock(lowStockList);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [today, sparkRange, weekRange, prevWeekRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===================== DERIVED =====================

  // Posadené gramy = súčet yieldGrams z in_progress plánov
  const plantedGrams = useMemo(() => {
    return harvestPlans
      .filter(p => p.status === 'in_progress')
      .reduce((s, p) => s + p.yieldGrams, 0);
  }, [harvestPlans]);

  // Celkový plánovaný výnos (planned + in_progress)
  const totalYieldGrams = useMemo(() => {
    return harvestPlans.reduce((s, p) => s + p.yieldGrams, 0);
  }, [harvestPlans]);

  const freeGrams = Math.max(0, plantedGrams - orderedGramsThisWeek);
  const orderedPct = plantedGrams > 0 ? Math.min(100, Math.round((orderedGramsThisWeek / plantedGrams) * 100)) : 0;

  const sparkRevenueData = useMemo(() => dailyPoints14.map(d => d.revenue), [dailyPoints14]);
  const sparkOrdersData = useMemo(() => dailyPoints14.map(d => d.orders), [dailyPoints14]);

  // ===================== RENDER =====================

  return (
    <MainLayout hideMobileHeader>
      <div className="min-h-screen pb-20 md:pb-6">
        <div className="space-y-4">

          {/* ===== HEADER ===== */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
                <Sun className="h-5 w-5 text-[#16a34a]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-[#0f172a] truncate">
                  {greeting}{userName ? `, ${userName}` : ''} 👋
                </h1>
                <p className="text-xs md:text-sm text-[#475569]">
                  Týždeň {formatWeekRange(weekRange.monday)}
                </p>
              </div>
            </div>
            {lowStock.length > 0 && (
              <span className="inline-flex items-center gap-1.5 self-start sm:self-auto h-7 px-2.5 rounded-full bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs font-bold">
                <AlertTriangle className="h-3 w-3" />
                {lowStock.length} {lowStock.length === 1 ? 'upozornenie' : (lowStock.length >= 2 && lowStock.length <= 4 ? 'upozornenia' : 'upozornení')}
              </span>
            )}
          </div>

          {/* ===== UPOZORNENIA ===== */}
          {!loading && lowStock.length > 0 && (
            <div className="bg-white rounded-xl border border-[#fecaca] shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-[#fef2f2] border-b border-[#fecaca] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#dc2626]" />
                <h2 className="text-sm font-bold text-[#0f172a]">Nízke zásoby</h2>
                <span className="ml-auto text-[11px] text-[#dc2626] font-semibold">{lowStock.length} položiek</span>
              </div>
              <div className="divide-y divide-[#fee2e2]">
                {lowStock.slice(0, 6).map(item => {
                  const Icon = item.category === 'seeds' ? Sprout
                    : item.category === 'packaging' ? Package
                    : item.category === 'substrate' ? Layers
                    : item.category === 'labels' ? Tag
                    : ShoppingBag;
                  const linkTab = item.category === 'seeds' ? 'seeds'
                    : item.category === 'packaging' ? 'packaging'
                    : item.category === 'substrate' ? 'substrate'
                    : item.category === 'labels' ? 'labels'
                    : 'consumables';
                  const categoryLabel = item.category === 'seeds' ? 'Osivo'
                    : item.category === 'packaging' ? 'Obaly'
                    : item.category === 'substrate' ? 'Substrát'
                    : item.category === 'labels' ? 'Etikety'
                    : 'Spotrebný materiál';
                  return (
                    <Link
                      key={`${item.category}-${item.id}`}
                      to={`/inventory?tab=${linkTab}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#fef2f2] transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#fef2f2] border border-[#fecaca] flex items-center justify-center">
                        <Icon className="h-4 w-4 text-[#dc2626]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#0f172a] truncate">{item.name}</p>
                        <p className="text-[11px] text-[#475569]">
                          {categoryLabel} · zostáva <span className="font-bold text-[#dc2626]">
                            {item.unit === 'kg' ? formatKg(item.quantity) : `${formatNumber(item.quantity)} ${item.unit}`}
                          </span> z min. {item.unit === 'kg' ? formatKg(item.minStock) : `${formatNumber(item.minStock)} ${item.unit}`}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-[#94a3b8] flex-shrink-0" />
                    </Link>
                  );
                })}
                {lowStock.length > 6 && (
                  <Link to="/inventory" className="block px-4 py-2.5 text-center text-xs font-semibold text-[#dc2626] hover:bg-[#fef2f2] transition-colors">
                    Zobraziť všetkých {lowStock.length} →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ===== TRŽBY + OBJEDNÁVKY + STAV ===== */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
                  <Skeleton className="h-5 w-24 mb-3" />
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {/* === Karta 1: Tržby === */}
              <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
                      <Euro className="h-4 w-4 text-[#16a34a]" />
                    </div>
                    <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wide">Tržby tento týždeň</h3>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-2 mb-3">
                  <p className="text-2xl font-bold text-[#0f172a]">{formatEur(revenueWeek.total)}</p>
                  <Sparkline data={sparkRevenueData} color="#16a34a" />
                </div>
                <div className="space-y-1 mb-2">
                  <RevenueTypeRow label="Domáci" value={revenueWeek.home} total={revenueWeek.total} color="#16a34a" />
                  <RevenueTypeRow label="Gastro" value={revenueWeek.gastro} total={revenueWeek.total} color="#2563eb" />
                  <RevenueTypeRow label="VO" value={revenueWeek.wholesale} total={revenueWeek.total} color="#7c3aed" />
                </div>
                <div className="pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-xs">
                  <span className="text-[#475569]">vs. minulý týždeň</span>
                  <ComparisonBadge current={revenueWeek.total} previous={revenuePrevWeek.total} formatAbs={formatEur} />
                </div>
              </div>

              {/* === Karta 2: Objednávky === */}
              <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#dbeafe] border border-[#bfdbfe] flex items-center justify-center">
                      <ShoppingCart className="h-4 w-4 text-[#2563eb]" />
                    </div>
                    <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wide">Objednávky tento týždeň</h3>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-2 mb-3">
                  <p className="text-2xl font-bold text-[#0f172a]">{formatNumber(ordersWeek.total)}</p>
                  <Sparkline data={sparkOrdersData} color="#2563eb" />
                </div>
                <div className="space-y-1 mb-2">
                  <OrdersTypeRow label="Domáci" value={ordersWeek.home} total={ordersWeek.total} color="#16a34a" />
                  <OrdersTypeRow label="Gastro" value={ordersWeek.gastro} total={ordersWeek.total} color="#2563eb" />
                  <OrdersTypeRow label="VO" value={ordersWeek.wholesale} total={ordersWeek.total} color="#7c3aed" />
                </div>
                <div className="pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-xs">
                  <span className="text-[#475569]">vs. minulý týždeň</span>
                  <ComparisonBadge current={ordersWeek.total} previous={ordersPrevWeek.total} />
                </div>
              </div>

              {/* === Karta 3: Stav === */}
              <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#fef3c7] border border-[#fde68a] flex items-center justify-center">
                      <Activity className="h-4 w-4 text-[#d97706]" />
                    </div>
                    <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wide">Stav objednávok</h3>
                  </div>
                </div>
                {statusCounts.length === 0 ? (
                  <p className="text-xs text-[#94a3b8] mb-3">Žiadne objednávky tento týždeň.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {statusCounts.sort((a, b) => b.count - a.count).map(s => {
                      const cfg = STATUS_LABELS[s.status] || { label: s.status, bg: '#f1f5f9', fg: '#475569' };
                      return (
                        <span
                          key={s.status}
                          className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: cfg.bg, color: cfg.fg }}
                        >
                          {cfg.label} · {s.count}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="pt-2 border-t border-[#e2e8f0] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#475569] flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      Aktívni zákazníci
                    </span>
                    <span className="font-bold text-[#0f172a]">{activeCustomers}</span>
                  </div>
                  {nextDeliveryToday && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569] flex items-center gap-1.5">
                        <Truck className="h-3 w-3" />
                        Dnes dodávka
                      </span>
                      <span className="font-bold text-[#0f172a] truncate ml-2">{nextDeliveryToday}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== KAPACITA ZBERU ===== */}
          {loading ? (
            <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
              <Skeleton className="h-6 w-48 mb-3" />
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
                    <Activity className="h-4 w-4 text-[#16a34a]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#0f172a]">Kapacita zberu tento týždeň</h3>
                </div>
                <Link to="/planting" className="text-xs font-semibold text-[#16a34a] hover:underline">
                  Plán →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-[#f0fdf4] rounded-lg border border-[#bbf7d0] p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">Posadené</p>
                  <p className="text-lg font-bold text-[#16a34a]">{formatWeight(plantedGrams)}</p>
                  <p className="text-[10px] text-[#475569]">odhadovaný výnos</p>
                </div>
                <div className="bg-[#dbeafe] rounded-lg border border-[#bfdbfe] p-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">Objednané</p>
                  <p className="text-lg font-bold text-[#2563eb]">{formatWeight(orderedGramsThisWeek)}</p>
                  <p className="text-[10px] text-[#475569]">požiadavka zákazníkov</p>
                </div>
                <div className={cn(
                  'rounded-lg border p-2.5',
                  freeGrams > 0 ? 'bg-[#f0fdf4] border-[#bbf7d0]' : 'bg-[#fef2f2] border-[#fecaca]'
                )}>
                  <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">Voľné na predaj</p>
                  <p className={cn('text-lg font-bold', freeGrams > 0 ? 'text-[#16a34a]' : 'text-[#dc2626]')}>
                    {formatWeight(freeGrams)}
                  </p>
                  <p className="text-[10px] text-[#475569]">
                    {freeGrams > 0 ? 'môžeš predať' : plantedGrams === 0 ? 'nič nie je posadené' : 'preplnené'}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#475569] font-semibold">Vyťaženie kapacity</span>
                  <span className={cn(
                    'font-bold',
                    orderedPct < 80 ? 'text-[#16a34a]' : orderedPct < 100 ? 'text-[#d97706]' : 'text-[#dc2626]'
                  )}>
                    {orderedPct}%
                  </span>
                </div>
                <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      orderedPct < 80 ? 'bg-[#16a34a]' : orderedPct < 100 ? 'bg-[#f59e0b]' : 'bg-[#dc2626]'
                    )}
                    style={{ width: `${Math.min(100, orderedPct)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== PREDPOKLADANÝ VÝNOS ===== */}
          {loading ? (
            <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
              <Skeleton className="h-6 w-56 mb-3" />
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 mb-2" />)}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
                    <Sprout className="h-4 w-4 text-[#16a34a]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0f172a]">Predpokladaný výnos</h3>
                    <p className="text-[11px] text-[#475569]">
                      Celkom <span className="font-bold text-[#16a34a]">{formatWeight(totalYieldGrams)}</span> z {harvestPlans.length} {harvestPlans.length === 1 ? 'výsevu' : harvestPlans.length >= 2 && harvestPlans.length <= 4 ? 'výsevov' : 'výsevov'}
                    </p>
                  </div>
                </div>
                <Link to="/planting?tab=week" className="text-xs font-semibold text-[#16a34a] hover:underline flex-shrink-0">
                  Týždenný plán →
                </Link>
              </div>
              {harvestPlans.length === 0 ? (
                <div className="px-4 py-8 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#f1f5f9] flex items-center justify-center mb-2">
                    <Sprout className="h-6 w-6 text-[#94a3b8]" />
                  </div>
                  <p className="text-sm font-bold text-[#0f172a] mb-1">Žiadny zber v tomto týždni</p>
                  <p className="text-xs text-[#475569]">Nasaď výsevy s `expected_harvest_date` v tomto týždni.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#e2e8f0]">
                  {harvestPlans.map(plan => (
                    <Link
                      key={plan.id}
                      to={`/planting?planId=${plan.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f8fafc] transition-colors"
                    >
                      <div
                        className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: plan.cropColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#0f172a] truncate">{plan.cropName}</p>
                        <p className="text-[11px] text-[#475569]">
                          {plan.tray_count} × {plan.tray_size}
                          {plan.status === 'in_progress' && (
                            <span className="ml-1.5 inline-flex items-center h-4 px-1 rounded text-[9px] font-bold bg-[#dcfce7] text-[#166534]">
                              POSADENÉ
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span className="text-sm font-bold text-[#16a34a]">{formatWeight(plan.yieldGrams)}</span>
                        <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#f1f5f9] text-[#475569] text-[10px] font-bold whitespace-nowrap">
                          {formatHarvestDate(plan.expected_harvest_date)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-[#16a34a]" />
              <span className="ml-2 text-xs text-[#475569]">Načítavam dáta...</span>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

// ===================== HELPERS =====================

const formatHarvestDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const SK_DAYS = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
  return `${SK_DAYS[d.getDay()]} ${d.getDate()}.`;
};

// ===================== TYPE ROW SUB-COMPONENTS =====================

interface RevenueTypeRowProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

const RevenueTypeRow = ({ label, value, total, color }: RevenueTypeRowProps) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[#475569] w-14 flex-shrink-0">{label}</span>
      <span className="font-bold text-[#0f172a] flex-1">{formatEur(value)}</span>
      <span className="text-[#94a3b8]">{formatPercent(pct)}</span>
    </div>
  );
};

interface OrdersTypeRowProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

const OrdersTypeRow = ({ label, value, total, color }: OrdersTypeRowProps) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[#475569] w-14 flex-shrink-0">{label}</span>
      <span className="font-bold text-[#0f172a] flex-1">{formatNumber(value)}</span>
      <span className="text-[#94a3b8]">{formatPercent(pct)}</span>
    </div>
  );
};

export default Dashboard;
