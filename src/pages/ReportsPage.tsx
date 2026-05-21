import { useState, useEffect, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush,
} from 'recharts';
import {
  BarChart3, Users, ShoppingCart, Euro, Sprout, FileSpreadsheet,
  Filter, Calendar, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Loader2, ChevronDown, X, ArrowUpRight, ArrowDownRight, Activity,
  Package, Clock, Star, Eye,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

// ===================== TYPES =====================

type TabKey = 'overview' | 'sales' | 'customers';

type PeriodPreset = 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom';

type CustomerTypeFilter = 'all' | 'home' | 'gastro' | 'wholesale';

interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;
}

interface Order {
  id: string;
  order_number?: number;
  delivery_date: string;
  status: string;
  customer_id: string | null;
  customers?: { id: string; name: string; customer_type: string | null } | null;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: string;
  order_id: string;
  crop_id: string | null;
  blend_id: string | null;
  quantity: number;
  packaging_size: string | null;
  price_per_unit: number | null;
  unit_price?: number | null; // fallback
  price?: number | null; // fallback
}

interface Crop {
  id: string;
  name: string;
  color: string | null;
  category: string | null;
}

interface Customer {
  id: string;
  name: string;
  customer_type: string | null;
}

// ===================== CONSTANTS =====================

const COLORS = {
  home: '#16a34a',
  gastro: '#2563eb',
  wholesale: '#7c3aed',
  planned: '#f59e0b',
  actual: '#16a34a',
  neutral: '#94a3b8',
  rolling: '#7c3aed',
};

const SK_MONTHS_NOM = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
const SK_MONTHS_GEN = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];

// "Active order" — počíta sa do tržieb (vylúčené cancelled)
const ACTIVE_ORDER_STATUSES = [
  'pending', 'pending_approval', 'cakajuca',
  'confirmed', 'potvrdena',
  'growing', 'packed', 'pripravena',
  'on_the_way', 'delivered',
];

// ===================== HELPERS =====================

const toIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const getMonday = (d: Date) => {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
};

const formatEur = (n: number): string =>
  n.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const formatNumber = (n: number): string =>
  n.toLocaleString('sk-SK', { maximumFractionDigits: 0 });

const formatGrams = (g: number): string => {
  if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`;
  return `${Math.round(g)} g`;
};

// Numerické zoradenie packaging_size — "25g" < "50g" < "100g" < "120g"
const parsePackagingGrams = (s: string | null | undefined): number => {
  if (!s) return 0;
  const m = String(s).match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
};

// Normalizácia customer_type → 3 kategórie
const normCustomerType = (raw: string | null | undefined): 'home' | 'gastro' | 'wholesale' => {
  if (!raw) return 'home';
  const t = raw.toLowerCase().trim();
  if (t === 'gastro' || t === 'restaurant' || t === 'reštaurácia') return 'gastro';
  if (t === 'wholesale' || t === 'vo' || t === 'veľkoodber' || t === 'velkoodber' || t === 'b2b') return 'wholesale';
  return 'home';
};

const labelCustomerType = (t: 'home' | 'gastro' | 'wholesale'): string => {
  if (t === 'home') return 'Domáci';
  if (t === 'gastro') return 'Gastro';
  return 'VO';
};

// Cena jedného item-u — toleruje rôzne stĺpce
const itemUnitPrice = (item: any): number => {
  if (typeof item.price_per_unit === 'number') return item.price_per_unit;
  if (typeof item.unit_price === 'number') return item.unit_price;
  if (typeof item.price === 'number') return item.price;
  return 0;
};

const itemRevenue = (item: any): number => itemUnitPrice(item) * (item.quantity || 0);

const itemGrams = (item: any): number => parsePackagingGrams(item.packaging_size) * (item.quantity || 0);

// ===================== DATE RANGE PRESETS =====================

const computeDateRange = (preset: PeriodPreset, custom?: DateRange): DateRange => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'this_week': {
      const monday = getMonday(today);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return { start: toIsoDate(monday), end: toIsoDate(sunday) };
    }
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: toIsoDate(start), end: toIsoDate(end) };
    }
    case 'this_quarter': {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), q * 3, 1);
      const end = new Date(today.getFullYear(), q * 3 + 3, 0);
      return { start: toIsoDate(start), end: toIsoDate(end) };
    }
    case 'this_year': {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      return { start: toIsoDate(start), end: toIsoDate(end) };
    }
    case 'custom':
      return custom || { start: toIsoDate(today), end: toIsoDate(today) };
  }
};

// Predchádzajúce porovnateľné obdobie (pre MoM, WoW, YoY trendy)
const previousRange = (range: DateRange): DateRange => {
  const startD = new Date(range.start);
  const endD = new Date(range.end);
  const days = Math.floor((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevEnd = new Date(startD);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days + 1);
  return { start: toIsoDate(prevStart), end: toIsoDate(prevEnd) };
};

const formatRange = (range: DateRange): string => {
  const s = new Date(range.start);
  const e = new Date(range.end);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}. – ${e.getDate()}. ${SK_MONTHS_GEN[s.getMonth()]} ${s.getFullYear()}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}. ${SK_MONTHS_GEN[s.getMonth()]} – ${e.getDate()}. ${SK_MONTHS_GEN[e.getMonth()]} ${s.getFullYear()}`;
  }
  return `${s.getDate()}. ${SK_MONTHS_GEN[s.getMonth()]} ${s.getFullYear()} – ${e.getDate()}. ${SK_MONTHS_GEN[e.getMonth()]} ${e.getFullYear()}`;
};

// ===================== TREND BADGE =====================

const TrendBadge = ({ current, previous, formatAbs }: { current: number; previous: number; formatAbs?: (n: number) => string }) => {
  if (previous === 0 && current === 0) {
    return <span className="inline-flex items-center text-[11px] text-[#94a3b8]"><Minus className="h-3 w-3 mr-0.5" />—</span>;
  }
  const diff = current - previous;
  const pct = previous === 0 ? 100 : Math.round((diff / previous) * 100);
  const isUp = diff > 0;
  const isDown = diff < 0;
  const color = isUp ? 'text-[#16a34a]' : isDown ? 'text-[#dc2626]' : 'text-[#94a3b8]';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-bold', color)}>
      <Icon className="h-3 w-3" />
      {isUp ? '+' : ''}{pct}%
    </span>
  );
};

// ===================== SPARKLINE =====================

const Sparkline = ({ data, color = '#16a34a', width = 60, height = 20 }: { data: number[]; color?: string; width?: number; height?: number }) => {
  if (!data || data.length < 2) return <div style={{ width, height }} className="opacity-20" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0">
      <polygon points={areaPoints} fill={color} opacity={0.15} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ===================== KPI CARD =====================

interface KpiCardProps {
  label: string;
  value: string;
  Icon: any;
  iconBg: string;
  iconColor: string;
  current?: number;
  previous?: number;
  sparkData?: number[];
  sparkColor?: string;
  loading?: boolean;
  subtext?: string;
}

const KpiCard = ({ label, value, Icon, iconBg, iconColor, current, previous, sparkData, sparkColor, loading, subtext }: KpiCardProps) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-7 w-24 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
            <Icon className="h-4 w-4" style={{ color: iconColor }} />
          </div>
          <h3 className="text-[10px] font-bold text-[#475569] uppercase tracking-wide truncate">{label}</h3>
        </div>
        {sparkData && <Sparkline data={sparkData} color={sparkColor || iconColor} />}
      </div>
      <p className="text-xl md:text-2xl font-bold text-[#0f172a]">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {current != null && previous != null && (
          <TrendBadge current={current} previous={previous} />
        )}
        {subtext && <span className="text-[11px] text-[#475569]">{subtext}</span>}
      </div>
    </div>
  );
};

// ===================== TOOLTIP COMPONENT =====================

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-[#cbd5e1] rounded-lg shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-bold text-[#0f172a] mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <span className="text-[#475569]">{p.name}:</span>
          <span className="font-bold text-[#0f172a]">
            {formatter ? formatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ===================== EMPTY STATE FOR CHART =====================

const ChartEmpty = ({ message }: { message: string }) => (
  <div className="h-full flex flex-col items-center justify-center text-center py-8">
    <div className="w-10 h-10 rounded-xl bg-[#f1f5f9] flex items-center justify-center mb-2">
      <BarChart3 className="h-5 w-5 text-[#94a3b8]" />
    </div>
    <p className="text-xs text-[#475569]">{message}</p>
  </div>
);

// ===================== GLOBAL FILTER BAR =====================

interface FilterBarProps {
  preset: PeriodPreset;
  setPreset: (p: PeriodPreset) => void;
  customRange: DateRange;
  setCustomRange: (r: DateRange) => void;
  range: DateRange;
  customerType: CustomerTypeFilter;
  setCustomerType: (t: CustomerTypeFilter) => void;
  cropFilter: string;
  setCropFilter: (id: string) => void;
  crops: Crop[];
  onExport: () => void;
  exporting: boolean;
}

const FilterBar = (props: FilterBarProps) => {
  const PRESETS: { value: PeriodPreset; label: string }[] = [
    { value: 'this_week', label: 'Tento týždeň' },
    { value: 'this_month', label: 'Tento mesiac' },
    { value: 'this_quarter', label: 'Tento kvartál' },
    { value: 'this_year', label: 'Tento rok' },
    { value: 'custom', label: 'Vlastný rozsah' },
  ];
  const CUSTOMER_TYPES: { value: CustomerTypeFilter; label: string }[] = [
    { value: 'all', label: 'Všetci' },
    { value: 'home', label: 'Domáci' },
    { value: 'gastro', label: 'Gastro' },
    { value: 'wholesale', label: 'VO' },
  ];

  return (
    <div className="sticky top-0 z-20 bg-white border border-[#cbd5e1] rounded-xl shadow-sm p-3 md:p-4">
      <div className="flex flex-col gap-3">
        {/* Row 1: period presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-4 w-4 text-[#475569] flex-shrink-0 mr-1" />
          <span className="text-[11px] uppercase tracking-wide font-bold text-[#475569] mr-2">Obdobie:</span>
          {PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => props.setPreset(p.value)}
              className={cn(
                'h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors',
                props.preset === p.value
                  ? 'bg-[#16a34a] border-[#16a34a] text-white'
                  : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a]'
              )}
            >
              {p.label}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-[11px] text-[#475569] font-semibold">
            <Calendar className="h-3 w-3 inline mr-1" />
            {formatRange(props.range)}
          </span>
        </div>

        {/* Row 2: custom range pickers */}
        {props.preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-[#475569]">Od</Label>
              <Input
                type="date"
                value={props.customRange.start}
                onChange={(e) => props.setCustomRange({ ...props.customRange, start: e.target.value })}
                className="h-8 text-xs w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-[#475569]">Do</Label>
              <Input
                type="date"
                value={props.customRange.end}
                onChange={(e) => props.setCustomRange({ ...props.customRange, end: e.target.value })}
                className="h-8 text-xs w-40"
              />
            </div>
          </div>
        )}

        {/* Row 3: customer type + crop */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-[#475569]" />
            <span className="text-[11px] uppercase tracking-wide font-bold text-[#475569] mr-1">Zákazník:</span>
            {CUSTOMER_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => props.setCustomerType(t.value)}
                className={cn(
                  'h-6 px-2 rounded-full text-[11px] font-semibold border transition-colors',
                  props.customerType === t.value
                    ? 'bg-[#0f172a] border-[#0f172a] text-white'
                    : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Sprout className="h-3.5 w-3.5 text-[#475569]" />
            <span className="text-[11px] uppercase tracking-wide font-bold text-[#475569]">Plodina:</span>
            <select
              value={props.cropFilter}
              onChange={(e) => props.setCropFilter(e.target.value)}
              className="h-7 px-2 rounded-md border border-[#e2e8f0] bg-white text-xs text-[#0f172a] hover:border-[#cbd5e1] focus:border-[#16a34a] focus:outline-none"
            >
              <option value="all">Všetky plodiny</option>
              {props.crops.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          <button
            onClick={props.onExport}
            disabled={props.exporting}
            className="h-8 px-3 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            {props.exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            Export Excel
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================== ALERTS BANNER =====================

interface AlertItem {
  type: 'red' | 'amber' | 'green';
  text: string;
  detail?: string;
}

const AlertsBanner = ({ alerts }: { alerts: AlertItem[] }) => {
  if (alerts.length === 0) return null;
  const COLORS_MAP = {
    red: { bg: '#fef2f2', border: '#fecaca', fg: '#991b1b', icon: AlertTriangle },
    amber: { bg: '#fffbeb', border: '#fde68a', fg: '#92400e', icon: AlertTriangle },
    green: { bg: '#f0fdf4', border: '#bbf7d0', fg: '#166534', icon: TrendingUp },
  };
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => {
        const c = COLORS_MAP[a.type];
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="rounded-lg border px-3 py-2 flex items-start gap-2"
            style={{ backgroundColor: c.bg, borderColor: c.border }}
          >
            <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: c.fg }} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold" style={{ color: c.fg }}>{a.text}</p>
              {a.detail && <p className="text-[11px] mt-0.5" style={{ color: c.fg, opacity: 0.8 }}>{a.detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ===================== SECTION CARD =====================

const SectionCard = ({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
    <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-[#0f172a]">{title}</h3>
        {subtitle && <p className="text-[11px] text-[#475569] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className="p-3 md:p-4">{children}</div>
  </div>
);

// ===================== OVERVIEW TAB =====================

interface OverviewTabProps {
  range: DateRange;
  prevRange: DateRange;
  filteredOrders: Order[];
  prevOrders: Order[];
  crops: Crop[];
  loading: boolean;
}

const OverviewTab = ({ range, prevRange, filteredOrders, prevOrders, crops, loading }: OverviewTabProps) => {
  // ---- Agregát aktuálne obdobie ----
  const agg = useMemo(() => {
    const result = {
      total: 0,
      orderCount: 0,
      avgBasket: 0,
      activeCustomers: 0,
      totalGrams: 0,
      byType: { home: 0, gastro: 0, wholesale: 0 },
      byCustomerId: new Set<string>(),
      byCropRevenue: new Map<string, number>(),
      byCropName: new Map<string, string>(),
      byCropColor: new Map<string, string>(),
    };
    crops.forEach(c => {
      result.byCropName.set(c.id, c.name);
      result.byCropColor.set(c.id, c.color || '#16a34a');
    });
    filteredOrders.forEach(o => {
      let orderRev = 0;
      (o.order_items || []).forEach(it => {
        const rev = itemRevenue(it);
        const g = itemGrams(it);
        orderRev += rev;
        result.totalGrams += g;
        if (it.crop_id) {
          result.byCropRevenue.set(it.crop_id, (result.byCropRevenue.get(it.crop_id) || 0) + rev);
        }
      });
      result.total += orderRev;
      result.orderCount += 1;
      const cType = normCustomerType(o.customers?.customer_type);
      result.byType[cType] += orderRev;
      if (o.customer_id) result.byCustomerId.add(o.customer_id);
    });
    result.avgBasket = result.orderCount > 0 ? result.total / result.orderCount : 0;
    result.activeCustomers = result.byCustomerId.size;
    return result;
  }, [filteredOrders, crops]);

  // ---- Agregát predchádzajúce obdobie (na trendy) ----
  const prevAgg = useMemo(() => {
    let total = 0, orderCount = 0, totalGrams = 0;
    const customers = new Set<string>();
    prevOrders.forEach(o => {
      (o.order_items || []).forEach(it => {
        total += itemRevenue(it);
        totalGrams += itemGrams(it);
      });
      orderCount += 1;
      if (o.customer_id) customers.add(o.customer_id);
    });
    return {
      total, orderCount, totalGrams,
      avgBasket: orderCount > 0 ? total / orderCount : 0,
      activeCustomers: customers.size,
    };
  }, [prevOrders]);

  // ---- Daily revenue series for stacked area ----
  const dailySeries = useMemo(() => {
    const dayMap: Record<string, { date: string; home: number; gastro: number; wholesale: number; total: number; orders: number }> = {};
    // Generate all days in range
    const start = new Date(range.start);
    const end = new Date(range.end);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = toIsoDate(d);
      dayMap[key] = { date: key, home: 0, gastro: 0, wholesale: 0, total: 0, orders: 0 };
    }
    filteredOrders.forEach(o => {
      const k = (o.delivery_date || '').split('T')[0];
      if (!dayMap[k]) return;
      const cType = normCustomerType(o.customers?.customer_type);
      let rev = 0;
      (o.order_items || []).forEach(it => { rev += itemRevenue(it); });
      dayMap[k][cType] += rev;
      dayMap[k].total += rev;
      dayMap[k].orders += 1;
    });
    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders, range]);

  // ---- Sparkline series ----
  const sparkRevenue = useMemo(() => dailySeries.map(d => d.total), [dailySeries]);
  const sparkOrders = useMemo(() => dailySeries.map(d => d.orders), [dailySeries]);

  // ---- Donut data ----
  const donutData = useMemo(() => {
    return ([
      { name: 'Domáci', value: agg.byType.home, color: COLORS.home },
      { name: 'Gastro', value: agg.byType.gastro, color: COLORS.gastro },
      { name: 'VO', value: agg.byType.wholesale, color: COLORS.wholesale },
    ]).filter(d => d.value > 0);
  }, [agg]);

  // ---- Top 5 plodiny ----
  const top5Crops = useMemo(() => {
    return Array.from(agg.byCropRevenue.entries())
      .map(([cropId, revenue]) => ({
        cropId,
        name: agg.byCropName.get(cropId) || 'Neznáma',
        color: agg.byCropColor.get(cropId) || '#16a34a',
        revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [agg]);

  const formatChartDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}.${d.getMonth() + 1}.`;
  };

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
        <KpiCard
          loading={loading}
          label="Tržby"
          value={formatEur(agg.total)}
          Icon={Euro}
          iconBg="#f0fdf4"
          iconColor="#16a34a"
          current={agg.total}
          previous={prevAgg.total}
          sparkData={sparkRevenue}
          sparkColor="#16a34a"
        />
        <KpiCard
          loading={loading}
          label="Objednávky"
          value={formatNumber(agg.orderCount)}
          Icon={ShoppingCart}
          iconBg="#dbeafe"
          iconColor="#2563eb"
          current={agg.orderCount}
          previous={prevAgg.orderCount}
          sparkData={sparkOrders}
          sparkColor="#2563eb"
        />
        <KpiCard
          loading={loading}
          label="Ø košík"
          value={formatEur(agg.avgBasket)}
          Icon={Package}
          iconBg="#fef3c7"
          iconColor="#d97706"
          current={agg.avgBasket}
          previous={prevAgg.avgBasket}
        />
        <KpiCard
          loading={loading}
          label="Aktívni zákazníci"
          value={formatNumber(agg.activeCustomers)}
          Icon={Users}
          iconBg="#ede9fe"
          iconColor="#7c3aed"
          current={agg.activeCustomers}
          previous={prevAgg.activeCustomers}
        />
        <KpiCard
          loading={loading}
          label="Predané gramy"
          value={formatGrams(agg.totalGrams)}
          Icon={Sprout}
          iconBg="#dcfce7"
          iconColor="#166534"
          current={agg.totalGrams}
          previous={prevAgg.totalGrams}
        />
        <KpiCard
          loading={loading}
          label="Ø denné tržby"
          value={formatEur(agg.total / Math.max(1, dailySeries.length))}
          Icon={Activity}
          iconBg="#fee2e2"
          iconColor="#dc2626"
          subtext={`${dailySeries.length} dní`}
        />
      </div>

      {/* Stacked Area chart - tržby v čase */}
      <SectionCard title="Tržby v čase" subtitle="Rozdelenie podľa typu zákazníka">
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : dailySeries.every(d => d.total === 0) ? (
          <div className="h-72"><ChartEmpty message="Žiadne tržby za zvolené obdobie." /></div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailySeries} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 10, fill: '#475569' }} />
              <YAxis tickFormatter={(v) => `${Math.round(v)}€`} tick={{ fontSize: 10, fill: '#475569' }} width={50} />
              <Tooltip
                content={<CustomTooltip formatter={(v: number) => formatEur(v)} />}
                labelFormatter={(label: string) => {
                  const d = new Date(label);
                  return `${d.getDate()}. ${SK_MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="home"
                name="Domáci"
                stackId="1"
                stroke={COLORS.home}
                fill={COLORS.home}
                fillOpacity={0.7}
                isAnimationActive={true}
                animationDuration={400}
              />
              <Area
                type="monotone"
                dataKey="gastro"
                name="Gastro"
                stackId="1"
                stroke={COLORS.gastro}
                fill={COLORS.gastro}
                fillOpacity={0.7}
                isAnimationActive={true}
                animationDuration={400}
              />
              <Area
                type="monotone"
                dataKey="wholesale"
                name="VO"
                stackId="1"
                stroke={COLORS.wholesale}
                fill={COLORS.wholesale}
                fillOpacity={0.7}
                isAnimationActive={true}
                animationDuration={400}
              />
              {dailySeries.length > 14 && <Brush dataKey="date" height={20} stroke="#16a34a" tickFormatter={formatChartDate} />}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* 2-col layout: donut + top 5 plodín */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <SectionCard title="Rozdelenie podľa typu zákazníka" subtitle="Podiel na celkových tržbách">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : donutData.length === 0 ? (
            <div className="h-64"><ChartEmpty message="Žiadne tržby." /></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  isAnimationActive={true}
                  animationDuration={400}
                  label={(entry: any) => {
                    const total = donutData.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                    return `${entry.name} ${pct}%`;
                  }}
                  labelLine={false}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatter={(v: number) => formatEur(v)} />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Top 5 plodín" subtitle="Podľa tržieb za obdobie">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : top5Crops.length === 0 ? (
            <div className="h-64"><ChartEmpty message="Žiadne predaje plodín." /></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart layout="vertical" data={top5Crops} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${Math.round(v)}€`} tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#0f172a' }} width={120} />
                <Tooltip content={<CustomTooltip formatter={(v: number) => formatEur(v)} />} />
                <Bar dataKey="revenue" name="Tržby" isAnimationActive={true} animationDuration={400} radius={[0, 4, 4, 0]}>
                  {top5Crops.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

// ===================== SALES TAB =====================

interface SalesTabProps {
  range: DateRange;
  prevRange: DateRange;
  filteredOrders: Order[];
  prevOrders: Order[];
  crops: Crop[];
  loading: boolean;
}

const SalesTab = ({ range, prevRange, filteredOrders, prevOrders, crops, loading }: SalesTabProps) => {
  const cropsMap = useMemo(() => {
    const m = new Map<string, Crop>();
    crops.forEach(c => m.set(c.id, c));
    return m;
  }, [crops]);

  // ---- Per-crop aggregate (priame predaje, bez expanzie blendov) ----
  const byCrop = useMemo(() => {
    const map = new Map<string, { cropId: string; name: string; color: string; grams: number; orderIds: Set<string>; revenue: number }>();
    filteredOrders.forEach(o => {
      (o.order_items || []).forEach(it => {
        if (!it.crop_id) return;
        if (!map.has(it.crop_id)) {
          const c = cropsMap.get(it.crop_id);
          map.set(it.crop_id, {
            cropId: it.crop_id,
            name: c?.name || 'Neznáma',
            color: c?.color || '#16a34a',
            grams: 0,
            orderIds: new Set(),
            revenue: 0,
          });
        }
        const entry = map.get(it.crop_id)!;
        entry.grams += itemGrams(it);
        entry.orderIds.add(o.id);
        entry.revenue += itemRevenue(it);
      });
    });

    const prevByCrop = new Map<string, number>();
    prevOrders.forEach(o => {
      (o.order_items || []).forEach(it => {
        if (!it.crop_id) return;
        prevByCrop.set(it.crop_id, (prevByCrop.get(it.crop_id) || 0) + itemRevenue(it));
      });
    });

    const totalRev = Array.from(map.values()).reduce((s, e) => s + e.revenue, 0);
    return Array.from(map.values())
      .map(e => ({
        ...e,
        orders: e.orderIds.size,
        avgPricePerGram: e.grams > 0 ? e.revenue / e.grams : 0,
        pctOfTotal: totalRev > 0 ? (e.revenue / totalRev) * 100 : 0,
        prevRevenue: prevByCrop.get(e.cropId) || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, prevOrders, cropsMap]);

  // ---- Per-packaging aggregate ----
  const byPackaging = useMemo(() => {
    const map = new Map<string, { size: string; sizeG: number; qty: number; revenue: number; byType: Record<string, number> }>();
    filteredOrders.forEach(o => {
      const cType = normCustomerType(o.customers?.customer_type);
      (o.order_items || []).forEach(it => {
        if (!it.packaging_size) return;
        if (!map.has(it.packaging_size)) {
          map.set(it.packaging_size, {
            size: it.packaging_size,
            sizeG: parsePackagingGrams(it.packaging_size),
            qty: 0,
            revenue: 0,
            byType: { home: 0, gastro: 0, wholesale: 0 },
          });
        }
        const entry = map.get(it.packaging_size)!;
        entry.qty += (it.quantity || 0);
        entry.revenue += itemRevenue(it);
        entry.byType[cType] += (it.quantity || 0);
      });
    });
    const totalRev = Array.from(map.values()).reduce((s, e) => s + e.revenue, 0);
    return Array.from(map.values())
      .map(e => ({ ...e, pctOfTotal: totalRev > 0 ? (e.revenue / totalRev) * 100 : 0 }))
      .sort((a, b) => a.sizeG - b.sizeG); // numericky 25→50→100→120
  }, [filteredOrders]);

  // ---- Top 10 comparison (aktuálne vs predchádzajúce) ----
  const top10Comparison = useMemo(() => {
    return byCrop.slice(0, 10).map(c => ({
      name: c.name,
      Aktuálne: Math.round(c.revenue),
      Predchádzajúce: Math.round(c.prevRevenue),
    }));
  }, [byCrop]);

  // ---- Týždenné tržby s rolling 4-week priemerom ----
  const weeklyData = useMemo(() => {
    const weekMap: Record<string, { weekKey: string; weekLabel: string; revenue: number }> = {};
    filteredOrders.forEach(o => {
      const d = new Date(o.delivery_date);
      if (isNaN(d.getTime())) return;
      const monday = getMonday(d);
      const key = toIsoDate(monday);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      const label = `${monday.getDate()}.${monday.getMonth() + 1}. – ${sunday.getDate()}.${sunday.getMonth() + 1}.`;
      if (!weekMap[key]) weekMap[key] = { weekKey: key, weekLabel: label, revenue: 0 };
      (o.order_items || []).forEach(it => { weekMap[key].revenue += itemRevenue(it); });
    });
    const arr = Object.values(weekMap).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
    // Rolling 4-week priemer
    return arr.map((w, i) => {
      const window = arr.slice(Math.max(0, i - 3), i + 1);
      const avg = window.reduce((s, x) => s + x.revenue, 0) / window.length;
      return { ...w, rolling: Math.round(avg) };
    });
  }, [filteredOrders]);

  return (
    <div className="space-y-4">
      {/* Sales by Crop table */}
      <SectionCard title="Predaje podľa plodiny" subtitle={`${byCrop.length} plodín v zvolenom období`}>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : byCrop.length === 0 ? (
          <ChartEmpty message="Žiadne predaje plodín." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Plodina</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Predané</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Objednávok</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Tržby</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Ø €/g</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">% z celku</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {byCrop.map(c => (
                  <tr key={c.cropId} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="font-semibold text-[#0f172a]">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-[#0f172a]">{formatGrams(c.grams)}</td>
                    <td className="px-3 py-2 text-right text-[#475569]">{c.orders}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#0f172a]">{formatEur(c.revenue)}</td>
                    <td className="px-3 py-2 text-right text-[#475569]">{c.avgPricePerGram.toFixed(3)} €</td>
                    <td className="px-3 py-2 min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{ width: `${Math.min(100, c.pctOfTotal)}%`, backgroundColor: c.color }}
                          />
                        </div>
                        <span className="text-[10px] text-[#475569] font-semibold w-9 text-right">{c.pctOfTotal.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <TrendBadge current={c.revenue} previous={c.prevRevenue} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Grouped bar — top 10 plodín aktuálne vs predchádzajúce */}
      <SectionCard title="Top 10 plodín — porovnanie období" subtitle="Aktuálne obdobie vs predchádzajúce porovnateľné obdobie">
        {loading ? (
          <Skeleton className="h-80 w-full" />
        ) : top10Comparison.length === 0 ? (
          <div className="h-80"><ChartEmpty message="Žiadne predaje plodín." /></div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={top10Comparison} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} angle={-30} textAnchor="end" height={70} interval={0} />
              <YAxis tickFormatter={(v) => `${Math.round(v)}€`} tick={{ fontSize: 10, fill: '#475569' }} width={50} />
              <Tooltip content={<CustomTooltip formatter={(v: number) => formatEur(v)} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Aktuálne" fill={COLORS.actual} isAnimationActive={true} animationDuration={400} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Predchádzajúce" fill={COLORS.neutral} isAnimationActive={true} animationDuration={400} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Týždenný trend s rolling avg */}
      <SectionCard title="Tržby po týždňoch" subtitle="S kĺzavým 4-týždňovým priemerom">
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : weeklyData.length === 0 ? (
          <div className="h-72"><ChartEmpty message="Žiadne týždenné tržby." /></div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weeklyData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="weekLabel" tick={{ fontSize: 10, fill: '#475569' }} angle={-30} textAnchor="end" height={60} interval={0} />
              <YAxis tickFormatter={(v) => `${Math.round(v)}€`} tick={{ fontSize: 10, fill: '#475569' }} width={50} />
              <Tooltip content={<CustomTooltip formatter={(v: number) => formatEur(v)} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="linear"
                dataKey="revenue"
                name="Týždenné tržby"
                stroke={COLORS.actual}
                strokeWidth={2}
                dot={{ r: 3, fill: COLORS.actual }}
                isAnimationActive={true}
                animationDuration={400}
              />
              <Line
                type="monotone"
                dataKey="rolling"
                name="Kĺzavý priemer (4 týž.)"
                stroke={COLORS.rolling}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={true}
                animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Per-packaging table + stacked bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <SectionCard title="Predaje podľa balenia" subtitle="Zoradené numericky 25g → 150g">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : byPackaging.length === 0 ? (
            <div className="h-64"><ChartEmpty message="Žiadne balenia." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Balenie</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Počet ks</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Tržby</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">% z celku</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {byPackaging.map(p => (
                    <tr key={p.size} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center h-6 px-2 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-xs font-bold text-[#166534]">
                          {p.size}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-[#0f172a]">{formatNumber(p.qty)}</td>
                      <td className="px-3 py-2 text-right font-bold text-[#0f172a]">{formatEur(p.revenue)}</td>
                      <td className="px-3 py-2 min-w-[100px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                            <div className="h-full bg-[#16a34a] transition-all" style={{ width: `${Math.min(100, p.pctOfTotal)}%` }} />
                          </div>
                          <span className="text-[10px] text-[#475569] font-semibold w-9 text-right">{p.pctOfTotal.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Balenia × typ zákazníka" subtitle="Počet kusov v danom balení podľa segmentu">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : byPackaging.length === 0 ? (
            <div className="h-64"><ChartEmpty message="Žiadne dáta." /></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byPackaging} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="size" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} width={40} />
                <Tooltip content={<CustomTooltip formatter={(v: number) => `${formatNumber(v)} ks`} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="byType.home" name="Domáci" stackId="a" fill={COLORS.home} isAnimationActive={true} animationDuration={400} />
                <Bar dataKey="byType.gastro" name="Gastro" stackId="a" fill={COLORS.gastro} isAnimationActive={true} animationDuration={400} />
                <Bar dataKey="byType.wholesale" name="VO" stackId="a" fill={COLORS.wholesale} isAnimationActive={true} animationDuration={400} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

// ===================== CUSTOMERS TAB =====================

interface CustomersTabProps {
  range: DateRange;
  prevRange: DateRange;
  filteredOrders: Order[];
  allOrders: Order[]; // bez filtra obdobia - pre Gastro pivot a Risk analýzu
  customers: Customer[];
  crops: Crop[];
  loading: boolean;
}

const CustomersTab = ({ range, prevRange, filteredOrders, allOrders, customers, crops, loading }: CustomersTabProps) => {
  const [drillCustomerId, setDrillCustomerId] = useState<string | null>(null);

  const cropsMap = useMemo(() => {
    const m = new Map<string, Crop>();
    crops.forEach(c => m.set(c.id, c));
    return m;
  }, [crops]);

  const customerMap = useMemo(() => {
    const m = new Map<string, Customer>();
    customers.forEach(c => m.set(c.id, c));
    return m;
  }, [customers]);

  // ---- Segment summary ----
  const segmentSummary = useMemo(() => {
    const segs: Record<'home' | 'gastro' | 'wholesale', { customers: Set<string>; revenue: number; orderCount: number }> = {
      home: { customers: new Set(), revenue: 0, orderCount: 0 },
      gastro: { customers: new Set(), revenue: 0, orderCount: 0 },
      wholesale: { customers: new Set(), revenue: 0, orderCount: 0 },
    };
    filteredOrders.forEach(o => {
      const t = normCustomerType(o.customers?.customer_type);
      if (o.customer_id) segs[t].customers.add(o.customer_id);
      let rev = 0;
      (o.order_items || []).forEach(it => { rev += itemRevenue(it); });
      segs[t].revenue += rev;
      segs[t].orderCount += 1;
    });
    return (['home', 'gastro', 'wholesale'] as const).map(t => ({
      type: t,
      label: labelCustomerType(t),
      color: COLORS[t],
      activeCount: segs[t].customers.size,
      revenue: segs[t].revenue,
      orderCount: segs[t].orderCount,
      avgBasket: segs[t].orderCount > 0 ? segs[t].revenue / segs[t].orderCount : 0,
      frequency: segs[t].customers.size > 0 ? segs[t].orderCount / segs[t].customers.size : 0,
    }));
  }, [filteredOrders]);

  // ---- Top customers ----
  const topCustomers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: 'home' | 'gastro' | 'wholesale'; revenue: number; orderCount: number; lastOrder: string; prevRevenue: number }>();
    filteredOrders.forEach(o => {
      if (!o.customer_id) return;
      if (!map.has(o.customer_id)) {
        map.set(o.customer_id, {
          id: o.customer_id,
          name: o.customers?.name || customerMap.get(o.customer_id)?.name || 'Neznámy',
          type: normCustomerType(o.customers?.customer_type),
          revenue: 0,
          orderCount: 0,
          lastOrder: '',
          prevRevenue: 0,
        });
      }
      const entry = map.get(o.customer_id)!;
      let rev = 0;
      (o.order_items || []).forEach(it => { rev += itemRevenue(it); });
      entry.revenue += rev;
      entry.orderCount += 1;
      if (!entry.lastOrder || o.delivery_date > entry.lastOrder) {
        entry.lastOrder = o.delivery_date;
      }
    });
    // Previous period
    const prevByCust = new Map<string, number>();
    filteredOrders.forEach(() => { /* noop */ });
    // Compute prev period revenue using allOrders filtered to prevRange
    allOrders.forEach(o => {
      if (!o.customer_id) return;
      const d = (o.delivery_date || '').split('T')[0];
      if (d < prevRange.start || d > prevRange.end) return;
      let rev = 0;
      (o.order_items || []).forEach(it => { rev += itemRevenue(it); });
      prevByCust.set(o.customer_id, (prevByCust.get(o.customer_id) || 0) + rev);
    });
    map.forEach(entry => {
      entry.prevRevenue = prevByCust.get(entry.id) || 0;
    });
    // Frequency = obj/mes
    const monthsInRange = Math.max(1, (new Date(range.end).getTime() - new Date(range.start).getTime()) / (1000 * 60 * 60 * 24 * 30));
    return Array.from(map.values())
      .map(c => ({ ...c, frequency: c.orderCount / monthsInRange }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);
  }, [filteredOrders, allOrders, customerMap, prevRange, range]);

  // ---- Risk: ohrození zákazníci ----
  const riskCustomers = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Pre každého zákazníka: posledná objednávka + ich Ø mesačná tržba (z posledných 90 dní)
    const map = new Map<string, { id: string; name: string; type: 'home' | 'gastro' | 'wholesale'; lastOrder: string; revenue90d: number; orderCount90d: number }>();
    allOrders.forEach(o => {
      if (!o.customer_id) return;
      const d = new Date(o.delivery_date);
      if (d > today) return; // budúce nie
      if (!map.has(o.customer_id)) {
        map.set(o.customer_id, {
          id: o.customer_id,
          name: o.customers?.name || customerMap.get(o.customer_id)?.name || 'Neznámy',
          type: normCustomerType(o.customers?.customer_type),
          lastOrder: '',
          revenue90d: 0,
          orderCount90d: 0,
        });
      }
      const entry = map.get(o.customer_id)!;
      if (!entry.lastOrder || o.delivery_date > entry.lastOrder) entry.lastOrder = o.delivery_date;
      if (d >= ninetyDaysAgo) {
        let rev = 0;
        (o.order_items || []).forEach(it => { rev += itemRevenue(it); });
        entry.revenue90d += rev;
        entry.orderCount90d += 1;
      }
    });
    return Array.from(map.values())
      .filter(c => {
        const lastOrderD = new Date(c.lastOrder);
        return lastOrderD < thirtyDaysAgo && c.orderCount90d > 0;
      })
      .map(c => ({
        ...c,
        avgMonthlyRevenue: c.revenue90d / 3, // posledné 3 mesiace
        daysSinceLastOrder: Math.floor((today.getTime() - new Date(c.lastOrder).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.avgMonthlyRevenue - a.avgMonthlyRevenue)
      .slice(0, 10);
  }, [allOrders, customerMap]);

  // ---- Growth: rastúci zákazníci ----
  const growthCustomers = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const map = new Map<string, { id: string; name: string; type: 'home' | 'gastro' | 'wholesale'; recent: number; previous: number }>();
    allOrders.forEach(o => {
      if (!o.customer_id) return;
      const d = new Date(o.delivery_date);
      if (d > today) return;
      if (!map.has(o.customer_id)) {
        map.set(o.customer_id, {
          id: o.customer_id,
          name: o.customers?.name || customerMap.get(o.customer_id)?.name || 'Neznámy',
          type: normCustomerType(o.customers?.customer_type),
          recent: 0,
          previous: 0,
        });
      }
      const entry = map.get(o.customer_id)!;
      let rev = 0;
      (o.order_items || []).forEach(it => { rev += itemRevenue(it); });
      if (d >= threeMonthsAgo) entry.recent += rev;
      else if (d >= sixMonthsAgo) entry.previous += rev;
    });
    return Array.from(map.values())
      .filter(c => c.previous > 0 && c.recent > c.previous * 1.3)
      .map(c => ({
        ...c,
        growthPct: c.previous > 0 ? Math.round(((c.recent - c.previous) / c.previous) * 100) : 0,
      }))
      .sort((a, b) => b.growthPct - a.growthPct)
      .slice(0, 10);
  }, [allOrders, customerMap]);

  // ---- Gastro monthly pivot ----
  const gastroPivot = useMemo(() => {
    // Posledných 6 mesiacov
    const today = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: SK_MONTHS_NOM[m.getMonth()].slice(0, 3) + ' ' + m.getFullYear().toString().slice(2) });
    }

    const map = new Map<string, { id: string; name: string; cells: Record<string, number>; total: number }>();
    allOrders.forEach(o => {
      if (normCustomerType(o.customers?.customer_type) !== 'gastro') return;
      if (!o.customer_id) return;
      const d = new Date(o.delivery_date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months.find(m => m.key === monthKey)) return;
      if (!map.has(o.customer_id)) {
        map.set(o.customer_id, {
          id: o.customer_id,
          name: o.customers?.name || customerMap.get(o.customer_id)?.name || 'Neznámy',
          cells: {},
          total: 0,
        });
      }
      const entry = map.get(o.customer_id)!;
      let rev = 0;
      (o.order_items || []).forEach(it => { rev += itemRevenue(it); });
      entry.cells[monthKey] = (entry.cells[monthKey] || 0) + rev;
      entry.total += rev;
    });

    const rows = Array.from(map.values()).sort((a, b) => b.total - a.total);
    // Max hodnota pre heatmap intenzitu
    let maxCell = 0;
    rows.forEach(r => Object.values(r.cells).forEach(v => { if (v > maxCell) maxCell = v; }));

    return { months, rows, maxCell };
  }, [allOrders, customerMap]);

  // ---- Drill-down panel data ----
  const drillData = useMemo(() => {
    if (!drillCustomerId) return null;
    const customer = customerMap.get(drillCustomerId);
    if (!customer) return null;

    // 6-mesačný line chart tržieb
    const today = new Date();
    const months: Record<string, { key: string; label: string; revenue: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { key, label: SK_MONTHS_NOM[m.getMonth()].slice(0, 3) + ' ' + m.getFullYear().toString().slice(2), revenue: 0 };
    }

    const cropRev = new Map<string, number>();
    const orderDates: string[] = [];

    allOrders.forEach(o => {
      if (o.customer_id !== drillCustomerId) return;
      const d = new Date(o.delivery_date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let rev = 0;
      (o.order_items || []).forEach(it => {
        const r = itemRevenue(it);
        rev += r;
        if (it.crop_id) {
          cropRev.set(it.crop_id, (cropRev.get(it.crop_id) || 0) + r);
        }
      });
      if (months[monthKey]) months[monthKey].revenue += rev;
      orderDates.push(o.delivery_date);
    });

    const topCrops = Array.from(cropRev.entries())
      .map(([cropId, rev]) => ({
        cropId,
        name: cropsMap.get(cropId)?.name || 'Neznáma',
        color: cropsMap.get(cropId)?.color || '#16a34a',
        revenue: rev,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Priemerný čas medzi objednávkami
    orderDates.sort();
    let avgGap = 0;
    if (orderDates.length > 1) {
      let totalGap = 0;
      for (let i = 1; i < orderDates.length; i++) {
        totalGap += (new Date(orderDates[i]).getTime() - new Date(orderDates[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
      }
      avgGap = totalGap / (orderDates.length - 1);
    }

    return {
      customer,
      monthly: Object.values(months),
      topCrops,
      avgGapDays: avgGap,
      totalOrders: orderDates.length,
    };
  }, [drillCustomerId, allOrders, cropsMap, customerMap]);

  const formatDateShort = (iso: string): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  };

  const daysAgo = (iso: string): number => {
    if (!iso) return -1;
    const d = new Date(iso);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-4">
      {/* Segment summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {segmentSummary.map(s => (
          <div key={s.type} className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color }}>
                <Users className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-[#0f172a]">{s.label}</h3>
            </div>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#475569]">Aktívni</span>
                  <span className="font-bold text-[#0f172a]">{s.activeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Tržby</span>
                  <span className="font-bold text-[#0f172a]">{formatEur(s.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Ø košík</span>
                  <span className="font-bold text-[#0f172a]">{formatEur(s.avgBasket)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Frekvencia</span>
                  <span className="font-bold text-[#0f172a]">{s.frequency.toFixed(1)} obj/zák.</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Top customers table */}
      <SectionCard title="Top zákazníci" subtitle="Kliknite na riadok pre detail">
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : topCustomers.length === 0 ? (
          <ChartEmpty message="Žiadne objednávky." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Zákazník</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Typ</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Tržby</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Obj.</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Posledná</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Freq.</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Trend</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {topCustomers.map(c => {
                  const d = daysAgo(c.lastOrder);
                  return (
                    <tr
                      key={c.id}
                      className={cn(
                        'hover:bg-[#f8fafc] transition-colors cursor-pointer',
                        drillCustomerId === c.id && 'bg-[#f0fdf4]'
                      )}
                      onClick={() => setDrillCustomerId(c.id === drillCustomerId ? null : c.id)}
                    >
                      <td className="px-3 py-2 font-semibold text-[#0f172a]">{c.name}</td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: COLORS[c.type] }}
                        >
                          {labelCustomerType(c.type)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-[#0f172a]">{formatEur(c.revenue)}</td>
                      <td className="px-3 py-2 text-right text-[#475569]">{c.orderCount}</td>
                      <td className="px-3 py-2 text-right text-[#475569]">
                        {d >= 0 ? `pred ${d}d` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-[#475569]">{c.frequency.toFixed(1)}/m</td>
                      <td className="px-3 py-2 text-right">
                        <TrendBadge current={c.revenue} previous={c.prevRevenue} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Eye className="h-3.5 w-3.5 text-[#94a3b8] inline" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Drill-down panel */}
      {drillData && (
        <SectionCard
          title={`Detail: ${drillData.customer.name}`}
          subtitle={`${labelCustomerType(normCustomerType(drillData.customer.customer_type))} · ${drillData.totalOrders} objednávok celkovo`}
          action={
            <button
              onClick={() => setDrillCustomerId(null)}
              className="w-7 h-7 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#dc2626] hover:text-[#dc2626] flex items-center justify-center transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 6m line chart */}
            <div className="lg:col-span-2">
              <p className="text-xs font-semibold text-[#475569] mb-2">Tržby — posledných 6 mesiacov</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={drillData.monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#475569' }} />
                  <YAxis tickFormatter={(v) => `${Math.round(v)}€`} tick={{ fontSize: 10, fill: '#475569' }} width={45} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => formatEur(v)} />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Tržby"
                    stroke={COLORS.actual}
                    strokeWidth={2}
                    dot={{ r: 4, fill: COLORS.actual }}
                    isAnimationActive={true}
                    animationDuration={400}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top crops + stats */}
            <div>
              <p className="text-xs font-semibold text-[#475569] mb-2">Top 5 plodín</p>
              {drillData.topCrops.length === 0 ? (
                <p className="text-xs text-[#94a3b8]">Žiadne predaje</p>
              ) : (
                <div className="space-y-1.5 mb-3">
                  {drillData.topCrops.map(c => (
                    <div key={c.cropId} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-[#0f172a] truncate flex-1">{c.name}</span>
                      <span className="font-bold text-[#16a34a]">{formatEur(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-3 border-t border-[#e2e8f0] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#475569]">Ø čas medzi obj.</span>
                  <span className="font-bold text-[#0f172a]">
                    {drillData.avgGapDays > 0 ? `${drillData.avgGapDays.toFixed(1)} dní` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Celkom objednávok</span>
                  <span className="font-bold text-[#0f172a]">{drillData.totalOrders}</span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Risk + Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <SectionCard title="🔴 Ohrození zákazníci" subtitle="Posledná objednávka >30 dní, zoradení podľa ušlej hodnoty">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : riskCustomers.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-[#16a34a] font-bold">✓ Žiadni ohrození zákazníci</p>
              <p className="text-[11px] text-[#475569] mt-1">Všetci nakupujú pravidelne.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#fee2e2]">
              {riskCustomers.map(c => (
                <div key={c.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#0f172a] truncate">{c.name}</p>
                    <p className="text-[11px] text-[#475569]">
                      <span style={{ color: COLORS[c.type] }}>{labelCustomerType(c.type)}</span>
                      {' · '}
                      pred {c.daysSinceLastOrder}d
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[#dc2626]">{formatEur(c.avgMonthlyRevenue)}/m</p>
                    <p className="text-[10px] text-[#475569]">ušlej hodnoty</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="🟢 Rastúci zákazníci" subtitle="Tržby +30% za posledné 3m vs predchádzajúce 3m">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : growthCustomers.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-[#475569]">Žiadni výrazne rastúci zákazníci.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#dcfce7]">
              {growthCustomers.map(c => (
                <div key={c.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#0f172a] truncate">{c.name}</p>
                    <p className="text-[11px] text-[#475569]">
                      <span style={{ color: COLORS[c.type] }}>{labelCustomerType(c.type)}</span>
                      {' · '}
                      <span className="text-[#16a34a] font-bold">+{c.growthPct}%</span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[#16a34a]">{formatEur(c.recent)}</p>
                    <p className="text-[10px] text-[#475569]">posledné 3m</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Gastro monthly pivot — heatmap */}
      <SectionCard title="Gastro: mesačné tržby" subtitle="Posledných 6 mesiacov, heatmap intenzita = relatívna hodnota">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : gastroPivot.rows.length === 0 ? (
          <ChartEmpty message="Žiadny Gastro zákazník v posledných 6 mesiacoch." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide sticky left-0 bg-[#f8fafc]">Zákazník</th>
                  {gastroPivot.months.map(m => (
                    <th key={m.key} className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">{m.label}</th>
                  ))}
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {gastroPivot.rows.map(r => (
                  <tr key={r.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-3 py-2 font-semibold text-[#0f172a] sticky left-0 bg-white">{r.name}</td>
                    {gastroPivot.months.map(m => {
                      const v = r.cells[m.key] || 0;
                      const intensity = gastroPivot.maxCell > 0 ? v / gastroPivot.maxCell : 0;
                      const bg = intensity > 0
                        ? `rgba(22, 163, 74, ${0.1 + intensity * 0.5})`
                        : 'transparent';
                      return (
                        <td key={m.key} className="px-3 py-2 text-right text-xs" style={{ backgroundColor: bg }}>
                          {v > 0 ? <span className="font-bold text-[#0f172a]">{formatEur(v)}</span> : <span className="text-[#cbd5e1]">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-bold text-[#16a34a] border-l border-[#e2e8f0]">
                      {formatEur(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

// ===================== EXCEL EXPORT =====================

const buildExcel = (params: {
  range: DateRange;
  filteredOrders: Order[];
  prevOrders: Order[];
  allOrders: Order[];
  customers: Customer[];
  crops: Crop[];
}) => {
  const { range, filteredOrders, prevOrders, allOrders, customers, crops } = params;
  const cropsMap = new Map<string, Crop>();
  crops.forEach(c => cropsMap.set(c.id, c));
  const customerMap = new Map<string, Customer>();
  customers.forEach(c => customerMap.set(c.id, c));

  const wb = XLSX.utils.book_new();

  // --- LIST 1: Súhrn ---
  let totalRev = 0, totalOrders = 0, totalGrams = 0;
  const byType: Record<string, number> = { home: 0, gastro: 0, wholesale: 0 };
  const cropRev = new Map<string, number>();
  const customerIds = new Set<string>();
  filteredOrders.forEach(o => {
    let r = 0;
    (o.order_items || []).forEach(it => {
      const rev = itemRevenue(it);
      r += rev;
      totalGrams += itemGrams(it);
      if (it.crop_id) cropRev.set(it.crop_id, (cropRev.get(it.crop_id) || 0) + rev);
    });
    totalRev += r;
    totalOrders += 1;
    byType[normCustomerType(o.customers?.customer_type)] += r;
    if (o.customer_id) customerIds.add(o.customer_id);
  });
  const avgBasket = totalOrders > 0 ? totalRev / totalOrders : 0;
  const top5 = Array.from(cropRev.entries())
    .map(([id, r]) => ({ name: cropsMap.get(id)?.name || 'Neznáma', revenue: r }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const summaryAOA: any[][] = [
    ['GROWBASE — REPORT', '', '', ''],
    [`Obdobie: ${formatRange(range)}`, '', '', ''],
    [`Generované: ${new Date().toLocaleString('sk-SK')}`, '', '', ''],
    ['', '', '', ''],
    ['KĽÚČOVÉ METRIKY', '', '', ''],
    ['Tržby celkom', totalRev, '', ''],
    ['Objednávok', totalOrders, '', ''],
    ['Priemerný košík', avgBasket, '', ''],
    ['Aktívnych zákazníkov', customerIds.size, '', ''],
    ['Predaných gramov', totalGrams, '', ''],
    ['', '', '', ''],
    ['PODĽA TYPU ZÁKAZNÍKA', 'Tržby', '% z celku', ''],
    ['Domáci', byType.home, totalRev > 0 ? (byType.home / totalRev) : 0, ''],
    ['Gastro', byType.gastro, totalRev > 0 ? (byType.gastro / totalRev) : 0, ''],
    ['VO', byType.wholesale, totalRev > 0 ? (byType.wholesale / totalRev) : 0, ''],
    ['', '', '', ''],
    ['TOP 5 PLODÍN', 'Tržby', '', ''],
  ];
  top5.forEach((c, i) => summaryAOA.push([`${i + 1}. ${c.name}`, c.revenue, '', '']));

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAOA);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 10 }];
  // Number formats — € pre cells B6, B8, atď.
  ['B6', 'B7', 'B8', 'B10', 'B13', 'B14', 'B15'].forEach(cell => {
    if (wsSummary[cell]) wsSummary[cell].z = '#,##0.00 €';
  });
  // Top 5 revenues
  top5.forEach((_, i) => {
    const row = 18 + i;
    const cellRef = `B${row}`;
    if (wsSummary[cellRef]) wsSummary[cellRef].z = '#,##0.00 €';
  });
  // Percentá
  ['C13', 'C14', 'C15'].forEach(cell => {
    if (wsSummary[cell]) wsSummary[cell].z = '0.0%';
  });
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Súhrn');

  // --- LIST 2: Predaje po plodine ---
  const cropAggMap = new Map<string, { name: string; grams: number; orders: Set<string>; revenue: number }>();
  filteredOrders.forEach(o => {
    (o.order_items || []).forEach(it => {
      if (!it.crop_id) return;
      if (!cropAggMap.has(it.crop_id)) {
        cropAggMap.set(it.crop_id, {
          name: cropsMap.get(it.crop_id)?.name || 'Neznáma',
          grams: 0,
          orders: new Set(),
          revenue: 0,
        });
      }
      const e = cropAggMap.get(it.crop_id)!;
      e.grams += itemGrams(it);
      e.orders.add(o.id);
      e.revenue += itemRevenue(it);
    });
  });
  const cropAggArr = Array.from(cropAggMap.values())
    .map(c => ({
      name: c.name,
      grams: c.grams,
      orders: c.orders.size,
      revenue: c.revenue,
      avgPricePerGram: c.grams > 0 ? c.revenue / c.grams : 0,
      pct: totalRev > 0 ? c.revenue / totalRev : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const cropHeader = ['Plodina', 'Predané (g)', 'Objednávok', 'Tržby (€)', 'Ø €/g', '% z celku'];
  const cropData = cropAggArr.map(c => [c.name, Math.round(c.grams), c.orders, c.revenue, c.avgPricePerGram, c.pct]);
  // Sumárny riadok
  const cropSum = cropAggArr.reduce(
    (acc, c) => ({
      grams: acc.grams + c.grams,
      orders: acc.orders + c.orders,
      revenue: acc.revenue + c.revenue,
    }),
    { grams: 0, orders: 0, revenue: 0 }
  );
  cropData.push(['SPOLU', Math.round(cropSum.grams), cropSum.orders, cropSum.revenue, '', 1]);

  const wsCrop = XLSX.utils.aoa_to_sheet([cropHeader, ...cropData]);
  wsCrop['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 10 }];
  wsCrop['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
  wsCrop['!views'] = [{ state: 'frozen', ySplit: 1 } as any];
  // Format columns
  for (let r = 1; r <= cropData.length; r++) {
    if (wsCrop[`D${r + 1}`]) wsCrop[`D${r + 1}`].z = '#,##0.00 €';
    if (wsCrop[`E${r + 1}`]) wsCrop[`E${r + 1}`].z = '0.000 €';
    if (wsCrop[`F${r + 1}`]) wsCrop[`F${r + 1}`].z = '0.0%';
  }
  XLSX.utils.book_append_sheet(wb, wsCrop, 'Predaje po plodine');

  // --- LIST 3: Gastro detail (pivot Zákazník × Mesiac) ---
  const today = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: `${SK_MONTHS_NOM[m.getMonth()].slice(0, 3)} ${m.getFullYear().toString().slice(2)}` });
  }
  const gastroMap = new Map<string, { name: string; cells: Record<string, number>; total: number }>();
  allOrders.forEach(o => {
    if (normCustomerType(o.customers?.customer_type) !== 'gastro') return;
    if (!o.customer_id) return;
    const d = new Date(o.delivery_date);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months.find(m => m.key === mk)) return;
    if (!gastroMap.has(o.customer_id)) {
      gastroMap.set(o.customer_id, { name: o.customers?.name || 'Neznámy', cells: {}, total: 0 });
    }
    const e = gastroMap.get(o.customer_id)!;
    let r = 0;
    (o.order_items || []).forEach(it => { r += itemRevenue(it); });
    e.cells[mk] = (e.cells[mk] || 0) + r;
    e.total += r;
  });
  const gastroRows = Array.from(gastroMap.values()).sort((a, b) => b.total - a.total);

  const gastroHeader = ['Zákazník', ...months.map(m => m.label), 'Total'];
  const gastroData = gastroRows.map(r => [r.name, ...months.map(m => r.cells[m.key] || 0), r.total]);
  const gastroColSums = months.map(m => gastroRows.reduce((s, r) => s + (r.cells[m.key] || 0), 0));
  const gastroGrandTotal = gastroColSums.reduce((s, v) => s + v, 0);
  gastroData.push(['SPOLU', ...gastroColSums, gastroGrandTotal]);

  const wsGastro = XLSX.utils.aoa_to_sheet([gastroHeader, ...gastroData]);
  wsGastro['!cols'] = [{ wch: 30 }, ...months.map(() => ({ wch: 12 })), { wch: 14 }];
  wsGastro['!views'] = [{ state: 'frozen', ySplit: 1, xSplit: 1 } as any];
  // Format € pre všetky data cells
  for (let r = 1; r <= gastroData.length; r++) {
    for (let c = 1; c <= months.length + 1; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (wsGastro[cellRef]) wsGastro[cellRef].z = '#,##0.00 €';
    }
  }
  XLSX.utils.book_append_sheet(wb, wsGastro, 'Gastro detail');

  // --- LIST 4: Surové dáta ---
  const rawHeader = ['Dátum doručenia', 'Číslo objednávky', 'Stav', 'Zákazník', 'Typ', 'Plodina/Mix', 'Balenie', 'Množstvo', 'Cena/ks (€)', 'Spolu (€)'];
  const rawData: any[][] = [];
  filteredOrders.forEach(o => {
    const ctName = labelCustomerType(normCustomerType(o.customers?.customer_type));
    (o.order_items || []).forEach((it: any) => {
      rawData.push([
        o.delivery_date,
        o.order_number ? `MR-${String(o.order_number).padStart(3, '0')}` : o.id.slice(0, 8),
        o.status,
        o.customers?.name || customerMap.get(o.customer_id || '')?.name || 'Neznámy',
        ctName,
        it.crop_id ? (cropsMap.get(it.crop_id)?.name || 'Neznáma plodina') : (it.blend_id ? 'MIX (id: ' + it.blend_id.slice(0, 8) + ')' : '—'),
        it.packaging_size || '',
        it.quantity || 0,
        itemUnitPrice(it),
        itemRevenue(it),
      ]);
    });
  });
  // Sort by date desc
  rawData.sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  const wsRaw = XLSX.utils.aoa_to_sheet([rawHeader, ...rawData]);
  wsRaw['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 10 },
    { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
  ];
  wsRaw['!views'] = [{ state: 'frozen', ySplit: 1 } as any];
  for (let r = 1; r <= rawData.length; r++) {
    if (wsRaw[`I${r + 1}`]) wsRaw[`I${r + 1}`].z = '#,##0.00 €';
    if (wsRaw[`J${r + 1}`]) wsRaw[`J${r + 1}`].z = '#,##0.00 €';
  }
  XLSX.utils.book_append_sheet(wb, wsRaw, 'Surové dáta');

  // Filename
  const today2 = new Date();
  const fname = `GrowBase_Report_${today2.getFullYear()}-${String(today2.getMonth() + 1).padStart(2, '0')}-${String(today2.getDate()).padStart(2, '0')}.xlsx`;
  XLSX.writeFile(wb, fname);
};

// ===================== MAIN COMPONENT =====================

const TABS: { key: TabKey; label: string; Icon: any }[] = [
  { key: 'overview', label: 'Prehľad', Icon: BarChart3 },
  { key: 'sales', label: 'Predaje', Icon: ShoppingCart },
  { key: 'customers', label: 'Zákazníci', Icon: Users },
];

const ReportsPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Filter state
  const [preset, setPreset] = useState<PeriodPreset>('this_month');
  const [customRange, setCustomRange] = useState<DateRange>(() => computeDateRange('this_month'));
  const [customerType, setCustomerType] = useState<CustomerTypeFilter>('all');
  const [cropFilter, setCropFilter] = useState<string>('all');

  // Data state
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);

  // Resolved range
  const range = useMemo(() => computeDateRange(preset, customRange), [preset, customRange]);
  const prevRange = useMemo(() => previousRange(range), [range]);

  // ---- FETCH ----
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all orders za posledných 12 mesiacov (na Risk/Growth + drill-down + Gastro pivot)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const [ordersRes, customersRes, cropsRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            id, order_number, delivery_date, status, customer_id,
            customers:customer_id ( id, name, customer_type ),
            order_items ( id, order_id, crop_id, blend_id, quantity, packaging_size, price_per_unit, unit_price, price )
          `)
          .gte('delivery_date', toIsoDate(twelveMonthsAgo))
          .in('status', ACTIVE_ORDER_STATUSES),
        supabase.from('customers').select('id, name, customer_type'),
        supabase.from('crops').select('id, name, color, category'),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (customersRes.error) throw customersRes.error;
      if (cropsRes.error) throw cropsRes.error;

      setAllOrders((ordersRes.data || []) as unknown as Order[]);
      setCustomers((customersRes.data || []) as Customer[]);
      setCrops((cropsRes.data || []) as Crop[]);
    } catch (error: any) {
      console.error('[ReportsPage] Fetch error:', error);
      toast({
        title: 'Chyba',
        description: error?.message || 'Nepodarilo sa načítať dáta.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---- FILTERING ----
  // Filter orders na aktuálne obdobie + customer type + crop
  const passesFilters = useCallback((o: Order, r: DateRange): boolean => {
    const d = (o.delivery_date || '').split('T')[0];
    if (d < r.start || d > r.end) return false;
    if (customerType !== 'all' && normCustomerType(o.customers?.customer_type) !== customerType) return false;
    if (cropFilter !== 'all') {
      const hasCrop = (o.order_items || []).some(it => it.crop_id === cropFilter);
      if (!hasCrop) return false;
    }
    return true;
  }, [customerType, cropFilter]);

  const filteredOrders = useMemo(() => allOrders.filter(o => passesFilters(o, range)), [allOrders, range, passesFilters]);
  const prevOrders = useMemo(() => allOrders.filter(o => passesFilters(o, prevRange)), [allOrders, prevRange, passesFilters]);

  // ---- ALERTS ----
  const alerts = useMemo<AlertItem[]>(() => {
    if (loading) return [];
    const list: AlertItem[] = [];

    // Tržby vs 4-týždňový priemer
    if (preset === 'this_week') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weeklyTotals: number[] = [];
      for (let w = 0; w < 4; w++) {
        const monday = getMonday(today);
        monday.setDate(monday.getDate() - 7 * (w + 1));
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        const wStart = toIsoDate(monday);
        const wEnd = toIsoDate(sunday);
        let total = 0;
        allOrders.forEach(o => {
          const d = (o.delivery_date || '').split('T')[0];
          if (d < wStart || d > wEnd) return;
          (o.order_items || []).forEach(it => { total += itemRevenue(it); });
        });
        weeklyTotals.push(total);
      }
      const avg = weeklyTotals.reduce((s, v) => s + v, 0) / 4;
      const current = filteredOrders.reduce((s, o) => s + (o.order_items || []).reduce((ss, it) => ss + itemRevenue(it), 0), 0);
      if (avg > 0 && current < avg * 0.7) {
        list.push({
          type: 'red',
          text: `Tržby tento týždeň o ${Math.round((1 - current / avg) * 100)}% nižšie ako 4-týždňový priemer`,
          detail: `Aktuálne: ${formatEur(current)} · Priemer: ${formatEur(avg)}`,
        });
      }
    }

    // Risk zákazníci
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const lastOrderByCustomer = new Map<string, string>();
    const activeBeforeRecently = new Set<string>();
    allOrders.forEach(o => {
      if (!o.customer_id) return;
      const d = new Date(o.delivery_date);
      if (d > today) return;
      if (!lastOrderByCustomer.has(o.customer_id) || o.delivery_date > lastOrderByCustomer.get(o.customer_id)!) {
        lastOrderByCustomer.set(o.customer_id, o.delivery_date);
      }
      if (d >= ninetyDaysAgo && d < thirtyDaysAgo) {
        activeBeforeRecently.add(o.customer_id);
      }
    });
    const atRisk = Array.from(activeBeforeRecently).filter(cid => {
      const last = lastOrderByCustomer.get(cid);
      return last && new Date(last) < thirtyDaysAgo;
    });
    if (atRisk.length > 0) {
      list.push({
        type: 'amber',
        text: `${atRisk.length} ${atRisk.length === 1 ? 'zákazník neobjednal' : atRisk.length >= 2 && atRisk.length <= 4 ? 'zákazníci neobjednali' : 'zákazníkov neobjednalo'} viac ako 30 dní`,
        detail: 'Pozri sekciu "Ohrození zákazníci" v záložke Zákazníci.',
      });
    }

    // Rastúce plodiny (current vs prev)
    if (filteredOrders.length > 0 && prevOrders.length > 0) {
      const currCropRev = new Map<string, number>();
      const prevCropRev = new Map<string, number>();
      filteredOrders.forEach(o => (o.order_items || []).forEach(it => {
        if (it.crop_id) currCropRev.set(it.crop_id, (currCropRev.get(it.crop_id) || 0) + itemRevenue(it));
      }));
      prevOrders.forEach(o => (o.order_items || []).forEach(it => {
        if (it.crop_id) prevCropRev.set(it.crop_id, (prevCropRev.get(it.crop_id) || 0) + itemRevenue(it));
      }));
      const growers: { name: string; pct: number }[] = [];
      currCropRev.forEach((curr, cropId) => {
        const prev = prevCropRev.get(cropId) || 0;
        if (prev > 0 && curr > prev * 1.4 && curr > 30) {
          const crop = crops.find(c => c.id === cropId);
          if (crop) growers.push({ name: crop.name, pct: Math.round(((curr - prev) / prev) * 100) });
        }
      });
      growers.sort((a, b) => b.pct - a.pct);
      if (growers.length > 0) {
        const top = growers[0];
        list.push({
          type: 'green',
          text: `${top.name} — predaj +${top.pct}% vs predchádzajúce obdobie`,
          detail: growers.length > 1 ? `Rastie aj ${growers.slice(1, 3).map(g => g.name).join(', ')}` : undefined,
        });
      }
    }

    return list;
  }, [loading, preset, allOrders, filteredOrders, prevOrders, crops]);

  // ---- EXCEL EXPORT ----
  const handleExport = async () => {
    setExporting(true);
    try {
      buildExcel({ range, filteredOrders, prevOrders, allOrders, customers, crops });
      toast({ title: 'Export hotový', description: 'Excel súbor bol vygenerovaný.' });
    } catch (err: any) {
      console.error('[ReportsPage] Export error:', err);
      toast({ title: 'Chyba pri exporte', description: err?.message || 'Skús to znova.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  // ---- RENDER ----
  return (
    <MainLayout hideMobileHeader>
      <div className="min-h-screen pb-20 md:pb-6 space-y-3 md:space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-[#16a34a]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-[#0f172a]">Reporty</h1>
            <p className="text-xs md:text-sm text-[#475569]">Analytika predajov, zákazníkov a trendov</p>
          </div>
        </div>

        {/* Filter bar */}
        <FilterBar
          preset={preset}
          setPreset={setPreset}
          customRange={customRange}
          setCustomRange={setCustomRange}
          range={range}
          customerType={customerType}
          setCustomerType={setCustomerType}
          cropFilter={cropFilter}
          setCropFilter={setCropFilter}
          crops={crops}
          onExport={handleExport}
          exporting={exporting}
        />

        {/* Alerts */}
        {alerts.length > 0 && <AlertsBanner alerts={alerts} />}

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
          <div className="border-b border-[#e2e8f0] overflow-x-auto">
            <div className="flex">
              {TABS.map(t => {
                const Icon = t.Icon;
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                      isActive
                        ? 'border-[#16a34a] text-[#16a34a] bg-[#f0fdf4]'
                        : 'border-transparent text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc]'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-3 md:p-4">
            {/* Lazy render - len aktívna záložka */}
            {activeTab === 'overview' && (
              <OverviewTab
                range={range}
                prevRange={prevRange}
                filteredOrders={filteredOrders}
                prevOrders={prevOrders}
                crops={crops}
                loading={loading}
              />
            )}
            {activeTab === 'sales' && (
              <SalesTab
                range={range}
                prevRange={prevRange}
                filteredOrders={filteredOrders}
                prevOrders={prevOrders}
                crops={crops}
                loading={loading}
              />
            )}
            {activeTab === 'customers' && (
              <CustomersTab
                range={range}
                prevRange={prevRange}
                filteredOrders={filteredOrders}
                allOrders={allOrders}
                customers={customers}
                crops={crops}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
