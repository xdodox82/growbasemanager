// IMPORTANT: Use 'House' not 'Home' - Home is Chrome browser icon, House is home icon
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarIcon, Package, Check, RotateCcw, House, Utensils, Store, Tag,
  ChevronLeft, ChevronRight, Leaf, Blend, Filter, X, ChevronDown, ChevronUp,
  GripVertical, Sprout, Flower2, Grid3x3,
} from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isToday,
} from 'date-fns';
import { sk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerItem {
  id: string;
  order_id: string;
  order_item_id: string;
  name: string;
  type: string;
  pieces: number;
  prepared: boolean;
  packaging_size: string;
  package_ml: string | null;
  package_type: string;
  has_label_req: boolean;
  order_items?: any[];
  delivery_date?: string;
}

interface SizeSubgroup {
  size_key: string;
  package_ml: string | null;
  package_type: string;
  total_pieces: number;
  items: CustomerItem[];
}

interface GroupedItem {
  crop_name: string;
  is_blend: boolean;
  total_pieces: number;
  size_subgroups: SizeSubgroup[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CUST_TYPE = {
  home:      { label: 'Domáci',  Icon: House,    bg: 'bg-[#f0fdf4]', border: 'border-[#bbf7d0]', text: 'text-[#16a34a]' },
  gastro:    { label: 'Gastro',  Icon: Utensils, bg: 'bg-[#eff6ff]', border: 'border-[#bfdbfe]', text: 'text-[#2563eb]' },
  wholesale: { label: 'VO',      Icon: Store,    bg: 'bg-[#fff7ed]', border: 'border-[#fed7aa]', text: 'text-[#d97706]' },
} as const;

const getCfg = (type: string) =>
  CUST_TYPE[type as keyof typeof CUST_TYPE] ?? CUST_TYPE.home;

// ─── Chip ─────────────────────────────────────────────────────────────────────

const Chip = ({
  active, onClick, children, variant = 'green',
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
  variant?: 'green' | 'blue' | 'orange' | 'neutral';
}) => {
  const activeStyles = {
    green:   'bg-[#dcfce7] border-[#bbf7d0] text-[#166534]',
    blue:    'bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8]',
    orange:  'bg-[#fff7ed] border-[#fed7aa] text-[#c2410c]',
    neutral: 'bg-[#0f172a] border-[#0f172a] text-white',
  };
  return (
    <button
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 px-3 h-7 rounded-full border text-xs font-medium transition-colors',
        active ? activeStyles[variant] : 'bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#cbd5e1]',
      ].join(' ')}
    >
      {children}
    </button>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PrepPackagingPage() {
  const { toast } = useToast();

  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [custTypeFilter, setCustTypeFilter] = useState('all');
  const [labelFilter, setLabelFilter]       = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sizeFilter, setSizeFilter]         = useState('all');
  const [pkgTypeFilter, setPkgTypeFilter]   = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');

  const [deliverySettings, setDeliverySettings] = useState<any>(null);
  const [customers, setCustomers]               = useState<any[]>([]);
  const [ordersForCalendar, setOrdersForCalendar] = useState<any[]>([]);
  const [allOrders, setAllOrders]               = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders]     = useState<any[]>([]);
  const [preparedItems, setPreparedItems]       = useState<Set<string>>(new Set());
  const [detailItem, setDetailItem]             = useState<CustomerItem | null>(null);

  const [cropOrder, setCropOrder] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('prep_packaging_order') || '{}'); } catch { return {}; }
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('delivery_days_settings').select('*').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setDeliverySettings(data); });
    });
  }, []);

  useEffect(() => {
    supabase.from('customers').select('*').order('name').then(({ data }) => {
      if (data) setCustomers(data);
    });
  }, []);

  useEffect(() => {
    if (!deliverySettings) return;
    const start = startOfMonth(calendarMonth);
    const end   = endOfMonth(calendarMonth);
    supabase.from('orders').select('delivery_date')
      .gte('delivery_date', format(start, 'yyyy-MM-dd'))
      .lte('delivery_date', format(end, 'yyyy-MM-dd'))
      .then(({ data }) => { if (data) setOrdersForCalendar(data); });
  }, [calendarMonth, deliverySettings]);

  useEffect(() => {
    if (selectedDates.length === 0) { setAllOrders([]); return; }
    const load = async () => {
      const all: any[] = [];
      for (const date of selectedDates) {
        const { data, error } = await supabase
          .from('orders')
          .select(`*, customer:customers(*), items:order_items(*, crop:products(name, category), blend:blends(name))`)
          .eq('delivery_date', format(date, 'yyyy-MM-dd'))
          .order('customer_name');
        if (!error && data) all.push(...data);
      }
      setAllOrders(Array.from(new Map(all.map(o => [o.id, o])).values()));
    };
    load();
  }, [selectedDates]);

  useEffect(() => {
    let f = [...allOrders];
    if (custTypeFilter !== 'all') f = f.filter(o => o.customer_type === custTypeFilter);
    if (customerFilter !== 'all') f = f.filter(o => o.customer_id === customerFilter);
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'blends') f = f.filter(o => o.items?.some((i: any) => i.blend_id !== null));
      else f = f.filter(o => o.items?.some((i: any) => i.crop?.category === categoryFilter));
    }
    if (sizeFilter !== 'all') {
      const ml = parseInt(sizeFilter);
      f = f.filter(o => o.items?.some((i: any) => i.package_ml === ml));
    }
    if (labelFilter !== 'all') {
      const need = labelFilter === 'yes';
      f = f.filter(o => o.items?.some((i: any) => (i.has_label_req === need || i.needs_label === need)));
    }
    if (pkgTypeFilter !== 'all') {
      f = f.filter(o => o.items?.some((i: any) =>
        i.package_type === pkgTypeFilter || i.packaging_type === pkgTypeFilter));
    }
    setFilteredOrders(f);
  }, [allOrders, custTypeFilter, customerFilter, categoryFilter, sizeFilter, labelFilter, pkgTypeFilter]);

  useEffect(() => {
    const prepared = new Set<string>();
    filteredOrders.forEach(order => {
      if (order.status === 'packaging_ready') {
        order.items?.forEach((item: any) => prepared.add(`${order.id}-${item.id}`));
      }
    });
    setPreparedItems(prepared);
  }, [filteredOrders]);

  // ── Calendar ───────────────────────────────────────────────────────────────

  const isDeliveryDay = (date: Date) => {
    if (!deliverySettings) return false;
    const d = getDay(date);
    const map = [deliverySettings.sunday, deliverySettings.monday, deliverySettings.tuesday,
      deliverySettings.wednesday, deliverySettings.thursday, deliverySettings.friday, deliverySettings.saturday];
    return map[d] || false;
  };

  const hasOrdersOnDate = (date: Date) =>
    ordersForCalendar.some(o => isSameDay(new Date(o.delivery_date), date));

  const CalendarGrid = () => {
    const start = startOfMonth(calendarMonth);
    const days  = eachDayOfInterval({ start, end: endOfMonth(calendarMonth) });
    const pad   = getDay(start) === 0 ? 6 : getDay(start) - 1;
    return (
      <div className="w-[308px] p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCalendarMonth(p => { const d = new Date(p); d.setMonth(d.getMonth() - 1); return d; })}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f1f5f9] transition-colors">
            <ChevronLeft className="h-4 w-4 text-[#475569]" />
          </button>
          <span className="text-sm font-semibold text-[#0f172a] capitalize">
            {format(calendarMonth, 'LLLL yyyy', { locale: sk })}
          </span>
          <button onClick={() => setCalendarMonth(p => { const d = new Date(p); d.setMonth(d.getMonth() + 1); return d; })}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f1f5f9] transition-colors">
            <ChevronRight className="h-4 w-4 text-[#475569]" />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {['Po','Ut','St','Št','Pi','So','Ne'].map(d => (
            <div key={d} className="h-8 flex items-center justify-center text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: pad }).map((_, i) => <div key={`p${i}`} className="w-10 h-10" />)}
          {days.map(day => {
            const selected = selectedDates.some(d => isSameDay(d, day));
            const delivery = isDeliveryDay(day);
            const hasOrders = hasOrdersOnDate(day);
            const today = isToday(day);
            return (
              <button key={day.toISOString()}
                onClick={() => setSelectedDates(prev => {
                  const exists = prev.some(d => isSameDay(d, day));
                  return exists ? prev.filter(d => !isSameDay(d, day)) : [...prev, day];
                })}
                className={[
                  'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                  selected ? 'bg-[#16a34a] text-white shadow-sm'
                    : delivery ? 'bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]'
                    : hasOrders ? 'bg-[#fef9c3] text-[#713f12] hover:bg-[#fef08a]'
                    : 'text-[#0f172a] hover:bg-[#f1f5f9]',
                  today && !selected ? 'ring-2 ring-[#16a34a] ring-offset-1' : '',
                ].filter(Boolean).join(' ')}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-[#e2e8f0] space-y-2">
          {[
            { cls: 'bg-[#dcfce7]', label: 'Rozvozový deň' },
            { cls: 'bg-[#fef9c3]', label: 'Objednávky mimo rozvozu' },
            { cls: 'bg-[#16a34a]', label: 'Vybraný deň' },
          ].map(({ cls, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className={`w-4 h-4 rounded-md ${cls} border border-[#e2e8f0] shrink-0`} />
              <span className="text-xs text-[#475569]">{label}</span>
            </div>
          ))}
          <p className="text-[11px] text-[#94a3b8] pt-1">Klikni na deň pre výber / zrušenie</p>
        </div>
      </div>
    );
  };

  // ── Group logic ────────────────────────────────────────────────────────────

  const groupedItems: GroupedItem[] = (() => {
    const crops: Record<string, GroupedItem> = {};
    const typeOrder: Record<string, number> = { gastro: 1, wholesale: 2, home: 3 };

    filteredOrders.forEach(order => {
      order.items?.forEach((item: any) => {
        const cropName    = item.crop?.name || item.blend?.name || 'Neznáme';
        const isBlend     = !!item.blend?.name;
        const pkgSize     = item.packaging_size;
        if (!pkgSize) return;

        const packageMl   = item.package_ml ? `${item.package_ml}ml` : null;
        const packageType = item.packaging_type || item.package_type || 'rPET';
        const hasLabel    = item.has_label_req === true || item.needs_label === true;
        const pieces      = Math.ceil(item.quantity || 1);
        const sizeKey     = `${pkgSize}g`;
        const itemId      = `${order.id}-${item.id}`;
        const custName    = (order.customer_type === 'gastro' || order.customer_type === 'wholesale')
          ? (order.customer?.company_name || order.customer_name)
          : order.customer_name;

        if (!crops[cropName]) crops[cropName] = { crop_name: cropName, is_blend: isBlend, total_pieces: 0, size_subgroups: [] };

        const crop = crops[cropName];
        // Group by sizeKey only — merge null and non-null package_ml into same group
        let sub = crop.size_subgroups.find(s => s.size_key === sizeKey);
        if (!sub) {
          sub = { size_key: sizeKey, package_ml: packageMl, package_type: packageType, total_pieces: 0, items: [] };
          crop.size_subgroups.push(sub);
        } else if (!sub.package_ml && packageMl) {
          // Upgrade null to actual ml value if we find one
          sub.package_ml = packageMl;
        }

        sub.items.push({
          id: itemId, order_id: order.id, order_item_id: item.id,
          name: custName || 'Neznámy', type: order.customer_type || 'home',
          pieces, prepared: preparedItems.has(itemId),
          packaging_size: pkgSize, package_ml: packageMl, package_type: packageType, has_label_req: hasLabel,
          order_items: order.items, delivery_date: order.delivery_date,
        });
        sub.total_pieces += pieces;
        crop.total_pieces += pieces;
      });
    });

    Object.values(crops).forEach(crop => {
      crop.size_subgroups.sort((a, b) => parseInt(a.size_key) - parseInt(b.size_key));
      crop.size_subgroups.forEach(sub =>
        sub.items.sort((a, b) => {
          const td = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
          return td !== 0 ? td : a.name.localeCompare(b.name, 'sk');
        })
      );
    });

    return Object.values(crops).sort((a, b) => a.crop_name.localeCompare(b.crop_name, 'sk'));
  })();

  const splitGroups = (groups: GroupedItem[], wantPrepared: boolean): GroupedItem[] =>
    groups.map(g => {
      const subs  = g.size_subgroups
        .map(s => ({ ...s, items: s.items.filter(i => preparedItems.has(i.id) === wantPrepared) }))
        .filter(s => s.items.length > 0);
      const total = subs.reduce((acc, s) => acc + s.items.reduce((a, i) => a + i.pieces, 0), 0);
      return { ...g, size_subgroups: subs, total_pieces: total };
    }).filter(g => g.size_subgroups.length > 0);

  const sortByCropOrder = (groups: GroupedItem[]) =>
    [...groups].sort((a, b) => {
      const oA = cropOrder[a.crop_name] ?? 999, oB = cropOrder[b.crop_name] ?? 999;
      if (oA !== 999 && oB !== 999) return oA - oB;
      if (oA !== 999) return -1; if (oB !== 999) return 1;
      return a.crop_name.localeCompare(b.crop_name, 'sk');
    });

  const unpreparedGroups = sortByCropOrder(splitGroups(groupedItems, false));
  const preparedGroups   = sortByCropOrder(splitGroups(groupedItems, true));

  // Summary
  const summaryCounts = (() => {
    const map: Record<string, { total: number; withLabel: number }> = {};
    groupedItems.forEach(g =>
      g.size_subgroups.forEach(s => {
        const key = s.package_ml ? `${s.package_type} ${s.package_ml}` : s.package_type;
        if (!map[key]) map[key] = { total: 0, withLabel: 0 };
        s.items.forEach(i => { map[key].total += i.pieces; if (i.has_label_req) map[key].withLabel += i.pieces; });
      })
    );
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 4);
  })();

  // Progress
  const totalItems    = groupedItems.reduce((acc, g) => acc + g.size_subgroups.reduce((a, s) => a + s.items.length, 0), 0);
  const totalPrepared = preparedGroups.reduce((acc, g) => acc + g.size_subgroups.reduce((a, s) => a + s.items.length, 0), 0);
  const progressPct   = totalItems > 0 ? Math.round((totalPrepared / totalItems) * 100) : 0;
  const hasContent    = unpreparedGroups.length > 0 || preparedGroups.length > 0;

  const activeFilterCount = [custTypeFilter, labelFilter, categoryFilter, sizeFilter, pkgTypeFilter, customerFilter]
    .filter(v => v !== 'all').length;

  // ── Actions ────────────────────────────────────────────────────────────────

  const updateOrderStatus = async (orderId: string, done: boolean) => {
    await supabase.from('orders').update({ status: done ? 'packaging_ready' : null }).eq('id', orderId);
    if (done) toast({ title: 'Obaly pripravené', description: 'Kontrola obalov dokončená' });
  };

  const markItem = async (itemId: string, orderId: string, done: boolean) => {
    setPreparedItems(prev => { const s = new Set(prev); done ? s.add(itemId) : s.delete(itemId); return s; });
    await updateOrderStatus(orderId, done);
  };

  const markAllInGroup = async (group: GroupedItem, done: boolean) => {
    const updates = group.size_subgroups.flatMap(s => s.items.map(i => ({ itemId: i.id, orderId: i.order_id })));
    setPreparedItems(prev => {
      const s = new Set(prev);
      updates.forEach(({ itemId }) => done ? s.add(itemId) : s.delete(itemId));
      return s;
    });
    for (const { itemId, orderId } of updates) await updateOrderStatus(orderId, done);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = unpreparedGroups.length > 0 ? unpreparedGroups : preparedGroups;
    const oldIdx  = current.findIndex(i => i.crop_name === active.id);
    const newIdx  = current.findIndex(i => i.crop_name === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = [...current];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);
    const newOrder: Record<string, number> = {};
    reordered.forEach((item, idx) => { newOrder[item.crop_name] = idx; });
    setCropOrder(newOrder);
    localStorage.setItem('prep_packaging_order', JSON.stringify(newOrder));
  };

  // ── Sub-components ─────────────────────────────────────────────────────────

  const ItemRow = ({ item, isPrepared }: { item: CustomerItem; isPrepared: boolean }) => {
    const cfg = getCfg(item.type);
    const Icon = cfg.Icon;
    return (
      <div
        onClick={() => setDetailItem(item)}
        className={[
          'flex items-center gap-3 px-4 py-3 lg:py-2.5 cursor-pointer transition-colors border-t border-[#f1f5f9]',
          isPrepared ? 'bg-[#f0fdf4] hover:bg-[#dcfce7]/40' : 'hover:bg-[#f8fafc]',
        ].join(' ')}
      >
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.border}`}>
          <Icon className={`h-4 w-4 ${cfg.text}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-[#0f172a] truncate">{item.name}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[13px] font-semibold text-[#0f172a]">
              {item.pieces} × {item.packaging_size}g
            </span>
            {item.package_ml && (
              <span className="text-[11px] text-[#94a3b8]">({item.package_ml})</span>
            )}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#16a34a] text-white rounded">
              {item.package_type}
            </span>
            {item.has_label_req && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#fef08a] text-[#854d0e] text-[10px] font-bold rounded border border-[#fde047]">
                <Tag className="h-2.5 w-2.5" />ETIKETA
              </span>
            )}
          </div>
        </div>

        <button
          onClick={e => { e.stopPropagation(); markItem(item.id, item.order_id, !isPrepared); }}
          className={[
            'shrink-0 flex items-center gap-1.5 px-4 h-11 lg:h-9 lg:px-3 rounded-xl lg:rounded-lg text-sm lg:text-xs font-semibold transition-colors border',
            isPrepared
              ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#fca5a5]'
              : 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0] hover:bg-[#dcfce7] hover:text-[#166634] hover:border-[#bbf7d0]',
          ].join(' ')}
        >
          {isPrepared
            ? <><RotateCcw className="h-4 w-4" /><span className="hidden sm:inline">Vrátiť</span></>
            : <><Check className="h-4 w-4" /><span className="hidden sm:inline">Hotovo</span></>
          }
        </button>
      </div>
    );
  };

  const SortableCard = ({ group, isPrepared }: { group: GroupedItem; isPrepared: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({ id: group.crop_name });

    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
        className={['rounded-xl border shadow-sm overflow-hidden', isPrepared ? 'border-[#bbf7d0]' : 'border-[#e2e8f0]'].join(' ')}
      >
        {/* Header */}
        <div className={[
          'flex items-center gap-2.5 px-4 py-3 lg:py-2.5 border-b',
          isPrepared
            ? 'bg-gradient-to-r from-[#dcfce7] to-[#f0fdf4] border-[#bbf7d0]'
            : 'bg-gradient-to-r from-[#f0fdf4] to-[#f8fafc] border-[#d1fae5]',
        ].join(' ')}>
          <button {...attributes} {...listeners}
            className="cursor-grab active:cursor-grabbing text-[#cbd5e1] hover:text-[#94a3b8] p-0.5 shrink-0">
            <GripVertical className="w-4 h-4" />
          </button>

          {isPrepared ? <Check className="h-4 w-4 text-[#16a34a] shrink-0" />
            : group.is_blend ? <Blend className="h-4 w-4 text-[#7c3aed] shrink-0" />
            : <Leaf className="h-4 w-4 text-[#16a34a] shrink-0" />
          }

          <span className="font-semibold flex-1 text-[17px] tracking-tight text-[#14532d]">
            {group.crop_name}
          </span>

          {/* When only one size: show pkg info inline next to name */}
          {group.size_subgroups.length === 1 && (
            <span className="text-[12px] font-semibold text-[#166634] bg-[#f0fdf4] border border-[#d1fae5] px-2.5 py-1 rounded-md">
              {group.size_subgroups[0].size_key}{group.size_subgroups[0].package_ml ? ` · ${group.size_subgroups[0].package_type} ${group.size_subgroups[0].package_ml}` : ` · ${group.size_subgroups[0].package_type}`}
            </span>
          )}

          <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-[#dcfce7] text-[#166534] border-[#bbf7d0]">
            {group.total_pieces} ks
          </span>

          {!isPrepared ? (
            <button onClick={() => markAllInGroup(group, true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] text-[12px] font-medium text-[#166534] hover:bg-[#dcfce7] transition-colors">
              <Check className="h-3.5 w-3.5" /> Všetko
            </button>
          ) : (
            <button onClick={() => markAllInGroup(group, false)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#e2e8f0] bg-white text-[12px] font-medium text-[#64748b] hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#fca5a5] transition-colors">
              <RotateCcw className="h-3 w-3" /> Vrátiť
            </button>
          )}
        </div>

        {/* Size subgroups */}
        {group.size_subgroups.map((sub, idx) => (
          <div key={`${sub.size_key}-${sub.package_ml}-${idx}`} className={idx > 0 ? 'border-t border-[#e2e8f0]' : ''}>
            {/* Only show size header when crop has multiple sizes */}
            {group.size_subgroups.length > 1 && (
              <div className="flex items-center gap-2 px-4 py-1 border-b border-[#e2e8f0]">
                <span className="text-[11px] font-semibold text-[#64748b]">
                  {sub.size_key}{sub.package_ml ? ` · ${sub.package_type} ${sub.package_ml}` : ` · ${sub.package_type}`}
                </span>
                <div className="flex-1 h-px bg-[#e2e8f0]" />
                <span className="text-[10px] text-[#94a3b8]">{sub.total_pieces} ks</span>
              </div>
            )}
            {sub.items.map(item => (
              <ItemRow key={item.id} item={item} isPrepared={preparedItems.has(item.id)} />
            ))}
          </div>
        ))}
      </div>
    );
  };

  const SectionHeader = ({ label, count, done = false }: { label: string; count: number; done?: boolean }) => (
    <div className="flex items-center gap-2.5 my-4">
      <span className={`text-[10px] font-bold uppercase tracking-widest ${done ? 'text-[#16a34a]' : 'text-[#475569]'}`}>{label}</span>
      <div className={`flex-1 h-px ${done ? 'bg-[#bbf7d0]' : 'bg-[#e2e8f0]'}`} />
      <span className={['text-xs font-semibold px-2 py-0.5 rounded-full',
        done ? 'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]' : 'bg-[#f1f5f9] text-[#0f172a]'].join(' ')}>
        {count} položiek
      </span>
    </div>
  );

  const renderGroupList = (groups: GroupedItem[], isPrepared: boolean) => {
    const crops  = groups.filter(g => !g.is_blend);
    const blends = groups.filter(g => g.is_blend);
    return (
      <>
        {crops.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 mb-2 ml-0.5">
              <Leaf className="h-3.5 w-3.5 text-[#16a34a]" />
              <span className="text-xs font-semibold text-[#166534] uppercase tracking-wide">Plodiny</span>
              <span className="text-[10px] text-[#94a3b8]">({crops.length})</span>
            </div>
            {crops.map(g => <SortableCard key={g.crop_name} group={g} isPrepared={isPrepared} />)}
          </div>
        )}
        {blends.length > 0 && (
          <div className="space-y-2 mt-3">
            <div className="flex items-center gap-1.5 mb-2 ml-0.5">
              <Blend className="h-3.5 w-3.5 text-[#7c3aed]" />
              <span className="text-xs font-semibold text-[#5b21b6] uppercase tracking-wide">Mixy</span>
              <span className="text-[10px] text-[#94a3b8]">({blends.length})</span>
            </div>
            {blends.map(g => <SortableCard key={g.crop_name} group={g} isPrepared={isPrepared} />)}
          </div>
        )}
      </>
    );
  };

  // ── Detail modal ───────────────────────────────────────────────────────────

  const DetailModal = () => {
    if (!detailItem) return null;
    const cfg   = getCfg(detailItem.type);
    const Icon  = cfg.Icon;
    const order = filteredOrders.find(o => o.id === detailItem.order_id);
    const isDone = preparedItems.has(detailItem.id);

    return (
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-[420px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-[#f1f5f9]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.border}`}>
                <Icon className={`h-5 w-5 ${cfg.text}`} />
              </div>
              <div>
                <DialogTitle className="text-[15px] font-semibold text-[#0f172a] leading-tight">
                  {detailItem.name}
                </DialogTitle>
                <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md border mt-0.5 ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                  {cfg.label}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Hmotnosť', value: `${detailItem.pieces} × ${detailItem.packaging_size}g` },
                { label: 'Obal',     value: `${detailItem.package_type} ${detailItem.package_ml}` },
                { label: 'Etiketa',  value: detailItem.has_label_req ? 'Áno' : 'Nie' },
                { label: 'Stav',     value: isDone ? 'Pripravené' : 'Na prípravu' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#f8fafc] border border-[#f1f5f9] rounded-lg px-3 py-2.5">
                  <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">{label}</div>
                  <div className="text-[13px] font-semibold text-[#0f172a]">{value}</div>
                </div>
              ))}
            </div>

            {order?.items && (
              <div>
                <div className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                  Položky v objednávke
                </div>
                <div className="space-y-1">
                  {order.items.map((item: any, idx: number) => {
                    const name = item.crop?.name || item.blend?.name || 'Neznáme';
                    const isCurrent = item.id === detailItem.order_item_id;
                    return (
                      <div key={idx} className={[
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                        isCurrent
                          ? 'bg-[#dcfce7] border border-[#bbf7d0]'
                          : 'bg-[#f8fafc] border border-[#f1f5f9] opacity-70',
                      ].join(' ')}>
                        <span className="flex-1 font-medium text-[#0f172a]">{name}</span>
                        <span className="text-xs font-semibold px-1.5 py-0.5 bg-[#16a34a] text-white rounded">
                          {item.packaging_type || item.package_type || 'rPET'}
                        </span>
                        {(item.has_label_req || item.needs_label) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#fef08a] text-[#854d0e] text-[10px] font-bold rounded border border-[#fde047]">
                            <Tag className="h-2.5 w-2.5" />ETI
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#f8fafc] border border-[#f1f5f9] rounded-lg text-xs text-[#64748b]">
              <CalendarIcon className="h-3.5 w-3.5 text-[#94a3b8]" />
              <span>Doručenie:</span>
              <span className="font-semibold text-[#0f172a]">
                {detailItem.delivery_date
                  ? format(new Date(detailItem.delivery_date), 'EEEE, d. MMMM yyyy', { locale: sk })
                  : '—'}
              </span>
            </div>
          </div>

          <div className="flex gap-2 px-5 pb-5">
            <button onClick={() => setDetailItem(null)}
              className="flex-1 h-10 rounded-lg border border-[#e2e8f0] text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">
              Zavrieť
            </button>
            <button
              onClick={() => { markItem(detailItem.id, detailItem.order_id, !isDone); setDetailItem(null); }}
              className={[
                'flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
                isDone
                  ? 'bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] hover:bg-[#fee2e2] hover:text-[#dc2626]'
                  : 'bg-[#16a34a] text-white hover:bg-[#15803d]',
              ].join(' ')}
            >
              {isDone
                ? <><RotateCcw className="h-4 w-4" /> Vrátiť</>
                : <><Check className="h-4 w-4" /> Označiť hotovo</>
              }
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className="w-full space-y-3 pb-8 px-4 md:px-6">

        {/* Top bar */}
        <div className="flex items-start justify-between gap-4 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#dcfce7] border border-[#bbf7d0] flex items-center justify-center">
              <Package className="h-5 w-5 text-[#16a34a]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0f172a] leading-none">Príprava obalov</h1>
              <p className="text-xs text-[#94a3b8] mt-0.5">Krabičky a etikety podľa dátumu</p>
            </div>
          </div>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 h-9 px-3 rounded-xl border border-[#e2e8f0] bg-white text-sm font-medium text-[#0f172a] hover:border-[#bbf7d0] hover:bg-[#f0fdf4] transition-colors shadow-sm shrink-0">
                <CalendarIcon className="h-4 w-4 text-[#16a34a]" />
                <span>
                  {selectedDates.length === 1
                    ? format(selectedDates[0], 'd. MMM', { locale: sk })
                    : `${selectedDates.length} dni`}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 shadow-xl border-[#e2e8f0]" align="end">
              <CalendarGrid />
            </PopoverContent>
          </Popover>
        </div>

        {/* Progress */}
        {hasContent && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#475569] uppercase tracking-wide">Pripravenosť</span>
              <span className="text-xs font-bold text-[#0f172a]">{totalPrepared} / {totalItems} položiek</span>
            </div>
            <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
              <div className="h-full bg-[#16a34a] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            {progressPct === 100 && totalItems > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <Check className="h-3.5 w-3.5 text-[#16a34a]" />
                <span className="text-xs font-semibold text-[#166534]">Všetky obaly pripravené!</span>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#f1f5f9] cursor-pointer"
            onClick={() => setFiltersOpen(p => !p)}>
            <Filter className="h-4 w-4 text-[#64748b]" />
            <span className="text-sm font-semibold text-[#0f172a] flex-1">Filtre</span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-[#dcfce7] text-[#166534] text-[11px] font-bold rounded-full border border-[#bbf7d0]">
                {activeFilterCount}
              </span>
            )}
            <button className={[
              'flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold border transition-colors',
              filtersOpen
                ? 'bg-[#0f172a] text-white border-[#0f172a]'
                : 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0] hover:bg-[#e2e8f0]',
            ].join(' ')}>
              {filtersOpen ? <><ChevronUp className="h-3.5 w-3.5" /> Skryť</> : <><ChevronDown className="h-3.5 w-3.5" /> Rozšírené</>}
            </button>
          </div>

          <div className="px-4 py-3 flex flex-col gap-3">
            {/* Date label */}
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" />
              <span className="font-medium text-[#0f172a]">
                {selectedDates.length === 1
                  ? format(selectedDates[0], 'EEEE, d. MMMM yyyy', { locale: sk })
                  : selectedDates.sort((a, b) => a.getTime() - b.getTime()).map(d => format(d, 'd.M.', { locale: sk })).join(', ')}
              </span>
            </div>
            {/* Customer type */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide w-14 shrink-0">Zákazník</span>
              <div className="w-px h-4 bg-[#e2e8f0]" />
              <Chip active={custTypeFilter === 'all'} onClick={() => setCustTypeFilter('all')} variant="neutral">Všetci</Chip>
              <Chip active={custTypeFilter === 'home'} onClick={() => setCustTypeFilter('home')} variant="green"><House className="h-3 w-3" /> Domáci</Chip>
              <Chip active={custTypeFilter === 'gastro'} onClick={() => setCustTypeFilter('gastro')} variant="blue"><Utensils className="h-3 w-3" /> Gastro</Chip>
              <Chip active={custTypeFilter === 'wholesale'} onClick={() => setCustTypeFilter('wholesale')} variant="orange"><Store className="h-3 w-3" /> VO</Chip>
            </div>
            {/* Label */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide w-14 shrink-0">Etiketa</span>
              <div className="w-px h-4 bg-[#e2e8f0]" />
              <Chip active={labelFilter === 'all'} onClick={() => setLabelFilter('all')} variant="neutral">Všetko</Chip>
              <Chip active={labelFilter === 'yes'} onClick={() => setLabelFilter('yes')} variant="green"><Tag className="h-3 w-3" /> S etiketou</Chip>
              <Chip active={labelFilter === 'no'} onClick={() => setLabelFilter('no')} variant="neutral">Bez etikety</Chip>
            </div>
          </div>

          {/* Advanced */}
          {filtersOpen && (
            <div className="px-4 pb-4 border-t border-[#f1f5f9] pt-3 flex flex-col gap-3">
              {/* Category */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide w-14 shrink-0">Kategória</span>
                <div className="w-px h-4 bg-[#e2e8f0]" />
                <Chip active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')} variant="neutral">Všetky</Chip>
                <Chip active={categoryFilter === 'microgreens'} onClick={() => setCategoryFilter('microgreens')} variant="green"><Leaf className="h-3 w-3" /> Mikrozelenina</Chip>
                <Chip active={categoryFilter === 'microherbs'} onClick={() => setCategoryFilter('microherbs')} variant="green"><Sprout className="h-3 w-3" /> Bylinky</Chip>
                <Chip active={categoryFilter === 'edible_flowers'} onClick={() => setCategoryFilter('edible_flowers')} variant="green"><Flower2 className="h-3 w-3" /> Kvety</Chip>
                <Chip active={categoryFilter === 'blends'} onClick={() => setCategoryFilter('blends')} variant="blue"><Grid3x3 className="h-3 w-3" /> Mixy</Chip>
              </div>
              {/* Size */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide w-14 shrink-0">Veľkosť</span>
                <div className="w-px h-4 bg-[#e2e8f0]" />
                {['all','250','500','750','1000','1200','1500'].map(v => (
                  <Chip key={v} active={sizeFilter === v} onClick={() => setSizeFilter(v)} variant="neutral">
                    {v === 'all' ? 'Všetky' : `${v}ml`}
                  </Chip>
                ))}
              </div>
              {/* Pkg type */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide w-14 shrink-0">Obal</span>
                <div className="w-px h-4 bg-[#e2e8f0]" />
                {['all','rPET','PET','EKO','Vrátny obal'].map(v => (
                  <Chip key={v} active={pkgTypeFilter === v} onClick={() => setPkgTypeFilter(v)} variant="neutral">
                    {v === 'all' ? 'Všetky' : v}
                  </Chip>
                ))}
              </div>
              {/* Customer */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide w-14 shrink-0">Klient</span>
                <div className="w-px h-4 bg-[#e2e8f0]" />
                <div className="flex-1 min-w-[200px]">
                  <SearchableCustomerSelect
                    value={customerFilter}
                    onValueChange={setCustomerFilter}
                    customers={customers.filter(c => custTypeFilter === 'all' || c.customer_type === custTypeFilter)}
                    placeholder="Všetci zákazníci"
                    allowAll={true}
                  />
                </div>
              </div>
              {activeFilterCount > 0 && (
                <div className="flex justify-end pt-1">
                  <button onClick={() => { setCustTypeFilter('all'); setLabelFilter('all'); setCategoryFilter('all'); setSizeFilter('all'); setPkgTypeFilter('all'); setCustomerFilter('all'); }}
                    className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#dc2626] transition-colors">
                    <X className="h-3 w-3" /> Zrušiť filtre
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        {hasContent && summaryCounts.length > 0 && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-3">
            <div className="text-[11px] font-bold text-[#475569] uppercase tracking-wide mb-2">Súhrn obalov na dnes</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {summaryCounts.map(([key, val], i) => {
                const colors = [
                  { bg: 'bg-[#eff6ff]', border: 'border-[#bfdbfe]', keyC: 'text-[#1d4ed8]', numC: 'text-[#1e3a8a]', subC: 'text-[#3b82f6]' },
                  { bg: 'bg-[#f0fdf4]', border: 'border-[#bbf7d0]', keyC: 'text-[#16a34a]', numC: 'text-[#14532d]', subC: 'text-[#16a34a]' },
                  { bg: 'bg-[#fff7ed]', border: 'border-[#fed7aa]', keyC: 'text-[#c2410c]', numC: 'text-[#7c2d12]', subC: 'text-[#ea580c]' },
                  { bg: 'bg-[#fdf4ff]', border: 'border-[#e9d5ff]', keyC: 'text-[#7c3aed]', numC: 'text-[#4c1d95]', subC: 'text-[#7c3aed]' },
                ];
                const c = colors[i % colors.length];
                return (
                  <div key={key} className={`${c.bg} border ${c.border} rounded-xl px-4 py-3 flex flex-col items-center text-center`}>
                    <div className={`text-[12px] font-semibold ${c.keyC} mb-1`}>{key}</div>
                    <div className={`text-[28px] font-bold ${c.numC} leading-none`}>{val.total}</div>
                    {val.withLabel > 0
                      ? <div className={`text-[11px] font-medium text-[#16a34a] mt-1.5 flex items-center gap-1`}><Tag className="h-2.5 w-2.5" /> {val.withLabel} s etiketou</div>
                      : <div className={`text-[11px] font-medium ${c.subC} mt-1.5 opacity-70`}>bez etikety</div>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main content */}
        {!hasContent ? (
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm py-16 flex flex-col items-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[#f1f5f9] flex items-center justify-center mb-4">
              <Package className="h-7 w-7 text-[#94a3b8]" />
            </div>
            <h3 className="text-base font-semibold text-[#0f172a] mb-1">Žiadne objednávky</h3>
            <p className="text-sm text-[#64748b] max-w-sm">
              Pre {selectedDates.length === 1
                ? format(selectedDates[0], 'dd. MM. yyyy', { locale: sk })
                : 'vybrané dátumy'} nie sú naplánované žiadne objednávky.
            </p>
            <p className="text-xs text-[#94a3b8] mt-2">
              Načítané: {allOrders.length} · Po filtrovaní: {filteredOrders.length}
            </p>
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={[...unpreparedGroups, ...preparedGroups].map(g => g.crop_name)}
              strategy={verticalListSortingStrategy}
            >
              {unpreparedGroups.length > 0 && (
                <div>
                  <SectionHeader label="Na prípravu"
                    count={unpreparedGroups.reduce((acc, g) => acc + g.size_subgroups.reduce((a, s) => a + s.items.length, 0), 0)} />
                  {renderGroupList(unpreparedGroups, false)}
                </div>
              )}
              {preparedGroups.length > 0 && (
                <div>
                  <SectionHeader label="Pripravené"
                    count={preparedGroups.reduce((acc, g) => acc + g.size_subgroups.reduce((a, s) => a + s.items.length, 0), 0)}
                    done />
                  {renderGroupList(preparedGroups, true)}
                </div>
              )}
            </SortableContext>
          </DndContext>
        )}

        <DetailModal />
      </div>
    </MainLayout>
  );
}
