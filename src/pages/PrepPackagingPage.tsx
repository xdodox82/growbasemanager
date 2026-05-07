import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CalendarIcon, Package, Check, RotateCcw, House, Utensils, Store, Tag,
  ChevronLeft, ChevronRight, Leaf, Sprout, Flower2, Grid3x3, GripVertical,
  Blend, Filter, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GroupedItem {
  crop_name: string;
  package_ml: string;
  package_type: string;
  total_pieces: number;
  is_blend?: boolean;
  itemsWithLabel: Array<{
    id: string;
    order_id: string;
    order_item_id: string;
    name: string;
    type: string;
    pieces: number;
    prepared: boolean;
    packaging_size: string;
    package_ml: string;
    package_type: string;
  }>;
  itemsWithoutLabel: Array<{
    id: string;
    order_id: string;
    order_item_id: string;
    name: string;
    type: string;
    pieces: number;
    prepared: boolean;
    packaging_size: string;
    package_ml: string;
    package_type: string;
  }>;
}

const CUSTOMER_TYPE_CONFIG = {
  home:      { label: 'Domáci',  Icon: House,    bg: 'bg-[#f0fdf4]', border: 'border-[#16a34a]', text: 'text-[#16a34a]', iconColor: 'text-[#16a34a]' },
  gastro:    { label: 'Gastro',  Icon: Utensils, bg: 'bg-[#eff6ff]', border: 'border-[#2563eb]', text: 'text-[#2563eb]', iconColor: 'text-[#2563eb]' },
  wholesale: { label: 'VO',      Icon: Store,    bg: 'bg-[#fff7ed]', border: 'border-[#d97706]', text: 'text-[#d97706]', iconColor: 'text-[#d97706]' },
} as const;

const getTypeConfig = (type: string) =>
  CUSTOMER_TYPE_CONFIG[type as keyof typeof CUSTOMER_TYPE_CONFIG] ?? CUSTOMER_TYPE_CONFIG.home;

export default function PrepPackagingPage() {
  const { toast } = useToast();

  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [packagingTypeFilter, setPackagingTypeFilter] = useState<string>('rPET');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [deliverySettings, setDeliverySettings] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [ordersForCalendar, setOrdersForCalendar] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [preparedItems, setPreparedItems] = useState<Set<string>>(new Set());

  const [cropOrder, setCropOrder] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('prep_packaging_order');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const fetchDeliverySettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('delivery_days_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) setDeliverySettings(data);
    };
    fetchDeliverySettings();
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabase.from('customers').select('*').order('name');
      if (!error) setCustomers(data || []);
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    const fetchOrdersForCalendar = async () => {
      const start = startOfMonth(calendarMonth);
      const end = endOfMonth(calendarMonth);
      const { data } = await supabase
        .from('orders')
        .select('delivery_date')
        .gte('delivery_date', format(start, 'yyyy-MM-dd'))
        .lte('delivery_date', format(end, 'yyyy-MM-dd'));
      if (data) setOrdersForCalendar(data);
    };
    if (deliverySettings) fetchOrdersForCalendar();
  }, [calendarMonth, deliverySettings]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (selectedDates.length === 0) { setAllOrders([]); return; }
      const allOrdersData: any[] = [];
      for (const date of selectedDates) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const { data, error } = await supabase
          .from('orders')
          .select(`*, customer:customers(*), items:order_items(*, crop:products(name, category), blend:blends(name))`)
          .eq('delivery_date', dateStr)
          .order('customer_name');
        if (!error && data) allOrdersData.push(...data);
      }
      const uniqueOrders = Array.from(new Map(allOrdersData.map(o => [o.id, o])).values());
      setAllOrders(uniqueOrders);
    };
    fetchOrders();
  }, [selectedDates]);

  useEffect(() => {
    let filtered = [...allOrders];
    if (customerTypeFilter !== 'all') filtered = filtered.filter(o => o.customer_type === customerTypeFilter);
    if (customerFilter && customerFilter !== 'all') filtered = filtered.filter(o => o.customer_id === customerFilter);
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'blends') {
        filtered = filtered.filter(o => o.items?.some((i: any) => i.blend_id !== null));
      } else {
        filtered = filtered.filter(o => o.items?.some((i: any) => i.crop?.category === categoryFilter));
      }
    }
    if (sizeFilter !== 'all') {
      const filterValue = parseInt(sizeFilter.replace('ml', ''));
      filtered = filtered.filter(o => o.items?.some((i: any) => i.package_ml === filterValue));
    }
    if (labelFilter !== 'all') {
      const needsLabel = labelFilter === 'yes';
      filtered = filtered.filter(o =>
        o.items?.some((i: any) => i.has_label_req === needsLabel || i.needs_label === needsLabel)
      );
    }
    if (packagingTypeFilter !== 'all') {
      filtered = filtered.filter(o => o.items?.some((i: any) => i.package_type === packagingTypeFilter));
    }
    setFilteredOrders(filtered);
  }, [allOrders, customerTypeFilter, customerFilter, categoryFilter, sizeFilter, labelFilter, packagingTypeFilter]);

  useEffect(() => {
    if (filteredOrders.length > 0) {
      const prepared = new Set<string>();
      filteredOrders.forEach(order => {
        if (order.status === 'packaging_ready') {
          order.items?.forEach((item: any) => prepared.add(`${order.id}-${item.id}`));
        }
      });
      setPreparedItems(prepared);
    }
  }, [filteredOrders]);

  const isDeliveryDay = (date: Date): boolean => {
    if (!deliverySettings) return false;
    const d = getDay(date);
    const map = [deliverySettings.sunday, deliverySettings.monday, deliverySettings.tuesday,
      deliverySettings.wednesday, deliverySettings.thursday, deliverySettings.friday, deliverySettings.saturday];
    return map[d] || false;
  };

  const hasOrdersOnDate = (date: Date) =>
    ordersForCalendar.some(o => isSameDay(new Date(o.delivery_date), date));

  const goToPreviousMonth = () => setCalendarMonth(p => { const d = new Date(p); d.setMonth(d.getMonth() - 1); return d; });
  const goToNextMonth    = () => setCalendarMonth(p => { const d = new Date(p); d.setMonth(d.getMonth() + 1); return d; });

  const CalendarGrid = () => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });
    const firstDayOfWeek = getDay(start);
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    return (
      <div className="w-[308px] p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={goToPreviousMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f1f5f9] transition-colors">
            <ChevronLeft className="h-4 w-4 text-[#475569]" />
          </button>
          <span className="text-sm font-semibold text-[#0f172a] capitalize">
            {format(calendarMonth, 'LLLL yyyy', { locale: sk })}
          </span>
          <button onClick={goToNextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f1f5f9] transition-colors">
            <ChevronRight className="h-4 w-4 text-[#475569]" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(day => (
            <div key={day} className="h-8 flex items-center justify-center text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: paddingDays }).map((_, i) => <div key={`pad-${i}`} className="w-10 h-10" />)}
          {days.map(day => {
            const isDelivery = isDeliveryDay(day);
            const hasOrders = hasOrdersOnDate(day);
            const today = isToday(day);
            const selected = selectedDates.some(d => isSameDay(d, day));

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDates(prev => {
                  const exists = prev.some(d => isSameDay(d, day));
                  return exists ? prev.filter(d => !isSameDay(d, day)) : [...prev, day];
                })}
                className={[
                  'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all relative',
                  selected
                    ? 'bg-[#16a34a] text-white shadow-sm'
                    : isDelivery
                    ? 'bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]'
                    : hasOrders
                    ? 'bg-[#fef9c3] text-[#713f12] hover:bg-[#fef08a]'
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
            { color: 'bg-[#dcfce7] border-[#bbf7d0]', label: 'Rozvozový deň' },
            { color: 'bg-[#fef9c3] border-[#fef08a]', label: 'Objednávky mimo rozvozu' },
            { color: 'bg-[#16a34a]', label: 'Vybraný deň' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className={`w-4 h-4 rounded-md ${color} border shrink-0`} />
              <span className="text-xs text-[#475569]">{label}</span>
            </div>
          ))}
          <p className="text-[11px] text-[#94a3b8] pt-1">Klikni na deň pre výber / zrušenie výberu</p>
        </div>
      </div>
    );
  };

  // ── Grouped items logic (unchanged) ─────────────────────────────────────
  const groupedItems = (() => {
    const groups: Record<string, GroupedItem> = {};

    filteredOrders.forEach(order => {
      if (!order.items || order.items.length === 0) return;

      order.items.forEach((item: any) => {
        const customerName = order.customer_type === 'home'
          ? order.customer_name
          : (order.customer?.company_name || order.customer_name);

        const packageSize = item.packaging_size;
        const packageMl = item.package_ml;
        if (!packageSize) return;

        const cropName = item.crop?.name || item.blend?.name || 'Neznáme';
        const isBlend = !!item.blend?.name;
        const packageType = item.packaging_type || 'rPET';
        const hasLabel = item.has_label_req === true;
        const key = `${cropName}-${packageSize}`;

        if (!groups[key]) {
          groups[key] = {
            crop_name: cropName,
            package_ml: packageSize,
            package_type: packageType,
            total_pieces: 0,
            is_blend: isBlend,
            itemsWithLabel: [],
            itemsWithoutLabel: [],
          };
        }

        const itemId = `${order.id}-${item.id}`;
        const pieces = Math.ceil(item.quantity || 1);
        groups[key].total_pieces += pieces;

        const customerItem = {
          id: itemId,
          order_id: order.id,
          order_item_id: item.id,
          name: customerName || 'Neznámy',
          type: order.customer_type || 'home',
          pieces,
          prepared: preparedItems.has(itemId),
          packaging_size: packageSize,
          package_ml: packageMl || packageSize,
          package_type: packageType,
          has_label_req: hasLabel,
        };

        if (hasLabel) groups[key].itemsWithLabel.push(customerItem);
        else groups[key].itemsWithoutLabel.push(customerItem);
      });
    });

    const sortItems = (items: any[]) => items.sort((a, b) => {
      const typeOrder: Record<string, number> = { gastro: 1, wholesale: 2, home: 3 };
      const tA = typeOrder[a.type] || 999, tB = typeOrder[b.type] || 999;
      if (tA !== tB) return tA - tB;
      const mlA = parseInt(a.package_ml) || 0, mlB = parseInt(b.package_ml) || 0;
      if (mlA !== mlB) return mlA - mlB;
      return a.name.localeCompare(b.name);
    });

    Object.values(groups).forEach(group => {
      group.itemsWithLabel = sortItems(group.itemsWithLabel);
      group.itemsWithoutLabel = sortItems(group.itemsWithoutLabel);
    });

    return Object.values(groups).sort((a, b) => a.crop_name.localeCompare(b.crop_name));
  })();

  const unpreparedGroups = groupedItems
    .map(group => {
      const wL = group.itemsWithLabel.filter(c => !c.prepared);
      const woL = group.itemsWithoutLabel.filter(c => !c.prepared);
      return { ...group, itemsWithLabel: wL, itemsWithoutLabel: woL, total_pieces: [...wL, ...woL].reduce((s, c) => s + c.pieces, 0) };
    })
    .filter(g => g.itemsWithLabel.length > 0 || g.itemsWithoutLabel.length > 0);

  const preparedGroups = groupedItems
    .map(group => {
      const wL = group.itemsWithLabel.filter(c => c.prepared);
      const woL = group.itemsWithoutLabel.filter(c => c.prepared);
      return { ...group, itemsWithLabel: wL, itemsWithoutLabel: woL, total_pieces: [...wL, ...woL].reduce((s, c) => s + c.pieces, 0) };
    })
    .filter(g => g.itemsWithLabel.length > 0 || g.itemsWithoutLabel.length > 0);

  const saveCropOrder = (order: Record<string, number>) =>
    localStorage.setItem('prep_packaging_order', JSON.stringify(order));

  const sortGroupsByCropOrder = (groups: typeof unpreparedGroups) =>
    [...groups].sort((a, b) => {
      const oA = cropOrder[a.crop_name ?? ''] ?? 999;
      const oB = cropOrder[b.crop_name ?? ''] ?? 999;
      if (oA !== 999 && oB !== 999) return oA - oB;
      if (oA !== 999) return -1;
      if (oB !== 999) return 1;
      return (a.crop_name ?? '').localeCompare(b.crop_name ?? '', 'sk');
    });

  const sortedUnpreparedGroups = sortGroupsByCropOrder(unpreparedGroups);
  const sortedPreparedGroups   = sortGroupsByCropOrder(preparedGroups);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = sortedUnpreparedGroups.length > 0 ? sortedUnpreparedGroups : sortedPreparedGroups;
    const oldIdx = current.findIndex(i => i.crop_name === active.id);
    const newIdx = current.findIndex(i => i.crop_name === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = [...current];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);
    const newOrder: Record<string, number> = {};
    reordered.forEach((item, idx) => { newOrder[item.crop_name || ''] = idx; });
    setCropOrder(newOrder);
    saveCropOrder(newOrder);
  };

  const updateOrderStatus = async (orderId: string, isPreparing: boolean) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: isPreparing ? 'packaging_ready' : null })
      .eq('id', orderId);
    if (error) { console.error('❌ Error updating order status:', error); return; }
    if (isPreparing) toast({ title: 'Obaly pripravené', description: 'Kontrola obalov dokončená' });
  };

  const markAsPrepared   = async (itemId: string, orderId: string) => {
    setPreparedItems(prev => new Set(prev).add(itemId));
    await updateOrderStatus(orderId, true);
  };
  const markAsUnprepared = async (itemId: string, orderId: string) => {
    setPreparedItems(prev => { const s = new Set(prev); s.delete(itemId); return s; });
    await updateOrderStatus(orderId, false);
  };

  const totalItems     = unpreparedGroups.reduce((s, g) => s + g.itemsWithLabel.length + g.itemsWithoutLabel.length, 0)
                       + preparedGroups.reduce((s, g)   => s + g.itemsWithLabel.length + g.itemsWithoutLabel.length, 0);
  const totalPrepared  = preparedGroups.reduce((s, g)   => s + g.itemsWithLabel.length + g.itemsWithoutLabel.length, 0);
  const progressPct    = totalItems > 0 ? Math.round((totalPrepared / totalItems) * 100) : 0;

  const activeFilterCount = [
    categoryFilter !== 'all',
    sizeFilter !== 'all',
    labelFilter !== 'all',
    packagingTypeFilter !== 'all',
    customerTypeFilter !== 'all',
    customerFilter !== 'all',
  ].filter(Boolean).length;

  // ── SortableCard component ───────────────────────────────────────────────
  const SortableCard = ({ item, children, isPrepared = false }: { item: any; children: React.ReactNode; isPrepared?: boolean }) => {
    const cropName = item.crop_name || '';
    const isBlend  = item.is_blend;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cropName });

    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
        className={[
          'rounded-xl border shadow-sm overflow-hidden',
          isPrepared ? 'bg-[#f0fdf4] border-[#bbf7d0]' : 'bg-white border-[#e2e8f0]',
        ].join(' ')}
      >
        {/* Card header */}
        <div className={[
          'flex items-center gap-2.5 px-3 py-2.5 border-b',
          isPrepared ? 'border-[#bbf7d0] bg-[#dcfce7]/50' : 'border-[#f1f5f9] bg-[#f8fafc]',
        ].join(' ')}>
          <button
            {...attributes} {...listeners}
            className="cursor-grab active:cursor-grabbing text-[#cbd5e1] hover:text-[#94a3b8] transition-colors p-0.5 shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {isPrepared
            ? <Check className="h-4 w-4 text-[#16a34a] shrink-0" />
            : isBlend
            ? <Blend className="h-4 w-4 text-[#7c3aed] shrink-0" />
            : <Leaf className="h-4 w-4 text-[#16a34a] shrink-0" />
          }

          <span className={[
            'font-semibold text-sm flex-1',
            isPrepared ? 'text-[#166534]' : 'text-[#0f172a]',
          ].join(' ')}>
            {cropName}
          </span>

          <span className={[
            'text-xs font-medium px-2 py-0.5 rounded-full',
            isPrepared ? 'bg-[#bbf7d0] text-[#166534]' : 'bg-[#f1f5f9] text-[#64748b]',
          ].join(' ')}>
            {item.total_pieces} ks
          </span>
        </div>

        {/* Card body */}
        <div className="divide-y divide-[#f1f5f9]">
          {children}
        </div>
      </div>
    );
  };

  // ── Item row component ───────────────────────────────────────────────────
  const ItemRow = ({
    item,
    isPrepared,
    onAction,
    actionLabel,
    ActionIcon,
    actionVariant = 'default',
  }: {
    item: any;
    isPrepared: boolean;
    onAction: () => void;
    actionLabel: string;
    ActionIcon: React.ElementType;
    actionVariant?: 'default' | 'prepared';
  }) => {
    const cfg = getTypeConfig(item.type);
    const Icon = cfg.Icon;

    return (
      <div className={[
        'flex items-center gap-3 px-3 py-2.5 transition-colors',
        isPrepared ? 'bg-[#f0fdf4]' : 'hover:bg-[#f8fafc]',
      ].join(' ')}>

        {/* Customer type icon */}
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.border}`}>
          <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
        </div>

        {/* Name + type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-[#0f172a] truncate">{item.name}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs text-[#475569] font-medium">
              {item.pieces} × {item.packaging_size}g
            </span>
            <span className="text-[10px] text-[#94a3b8]">({item.package_ml}ml)</span>
            <span className="inline-flex items-center px-1.5 py-0.5 bg-[#16a34a] text-white text-[10px] font-semibold rounded">
              {item.package_type}
            </span>
            {item.has_label_req && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-400 text-amber-900 text-[10px] font-bold rounded border border-amber-500">
                <Tag className="h-2.5 w-2.5" />
                ETIKETA
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={onAction}
          className={[
            'shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold transition-colors',
            actionVariant === 'prepared'
              ? 'bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0] border border-[#bbf7d0]'
              : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] border border-[#e2e8f0]',
          ].join(' ')}
        >
          <ActionIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{actionLabel}</span>
        </button>
      </div>
    );
  };

  // ── Groups renderer ──────────────────────────────────────────────────────
  const renderGroups = (groups: typeof sortedUnpreparedGroups, isPrepared: boolean) => (
    groups.map((group, idx) => (
      <SortableCard key={group.crop_name || idx} item={group} isPrepared={isPrepared}>
        {/* Items with label */}
        {group.itemsWithLabel?.map(item => (
          isPrepared ? (
            <ItemRow
              key={item.id}
              item={item}
              isPrepared={true}
              onAction={() => markAsUnprepared(item.id, item.order_id)}
              actionLabel="Vrátiť"
              ActionIcon={RotateCcw}
            />
          ) : (
            <ItemRow
              key={item.id}
              item={item}
              isPrepared={preparedItems.has(item.id)}
              onAction={() => markAsPrepared(item.id, item.order_id)}
              actionLabel="Hotovo"
              ActionIcon={Check}
              actionVariant={preparedItems.has(item.id) ? 'prepared' : 'default'}
            />
          )
        ))}

        {/* Divider */}
        {group.itemsWithLabel?.length > 0 && group.itemsWithoutLabel?.length > 0 && (
          <div className="border-t border-dashed border-[#e2e8f0] mx-3" />
        )}

        {/* Items without label */}
        {group.itemsWithoutLabel?.map(item => (
          isPrepared ? (
            <ItemRow
              key={item.id}
              item={item}
              isPrepared={true}
              onAction={() => markAsUnprepared(item.id, item.order_id)}
              actionLabel="Vrátiť"
              ActionIcon={RotateCcw}
            />
          ) : (
            <ItemRow
              key={item.id}
              item={item}
              isPrepared={preparedItems.has(item.id)}
              onAction={() => markAsPrepared(item.id, item.order_id)}
              actionLabel="Hotovo"
              ActionIcon={Check}
              actionVariant={preparedItems.has(item.id) ? 'prepared' : 'default'}
            />
          )
        ))}
      </SortableCard>
    ))
  );

  const hasContent = unpreparedGroups.length > 0 || preparedGroups.length > 0;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-4 pb-8">

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#dcfce7] border border-[#bbf7d0] flex items-center justify-center">
                <Package className="h-5 w-5 text-[#16a34a]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#0f172a] leading-none">Príprava obalov</h1>
                <p className="text-xs text-[#94a3b8] mt-0.5">Krabičky a etikety podľa dátumu</p>
              </div>
            </div>
          </div>

          {/* Date picker button */}
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

        {/* ── Progress bar (only when content exists) ──────────────── */}
        {hasContent && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#475569] uppercase tracking-wide">Pripravenosť</span>
              <span className="text-xs font-bold text-[#0f172a]">{totalPrepared} / {totalItems} položiek</span>
            </div>
            <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#16a34a] rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {progressPct === 100 && (
              <div className="flex items-center gap-1.5 mt-2">
                <Check className="h-3.5 w-3.5 text-[#16a34a]" />
                <span className="text-xs font-semibold text-[#166534]">Všetky obaly pripravené!</span>
              </div>
            )}
          </div>
        )}

        {/* ── Filter bar ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          {/* Filter header row */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#f1f5f9]">
            <Filter className="h-4 w-4 text-[#94a3b8]" />
            <span className="text-sm font-semibold text-[#0f172a] flex-1">Filtre</span>

            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-[#dcfce7] text-[#166534] text-[11px] font-bold rounded-full border border-[#bbf7d0]">
                {activeFilterCount}
              </span>
            )}

            <button
              onClick={() => setFiltersOpen(p => !p)}
              className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#16a34a] transition-colors"
            >
              {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Always-visible: date label + customer type chips */}
          <div className="px-4 py-3 flex flex-wrap items-center gap-2">
            {/* Date display */}
            <div className="flex items-center gap-1.5 text-sm text-[#475569]">
              <CalendarIcon className="h-3.5 w-3.5 text-[#94a3b8]" />
              <span className="font-medium text-[#0f172a]">
                {selectedDates.length === 1
                  ? format(selectedDates[0], 'EEEE, d. MMMM yyyy', { locale: sk })
                  : selectedDates.sort((a, b) => a.getTime() - b.getTime()).map(d => format(d, 'd.M.', { locale: sk })).join(', ')}
              </span>
            </div>

            <div className="w-px h-4 bg-[#e2e8f0] hidden sm:block" />

            {/* Customer type chips */}
            {(['all', 'home', 'gastro', 'wholesale'] as const).map(type => {
              const active = customerTypeFilter === type;
              if (type === 'all') {
                return (
                  <button
                    key="all"
                    onClick={() => setCustomerTypeFilter('all')}
                    className={`flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold border transition-colors ${
                      active ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'bg-white text-[#475569] border-[#e2e8f0] hover:border-[#cbd5e1]'
                    }`}
                  >
                    Všetci
                  </button>
                );
              }
              const cfg = getTypeConfig(type);
              const Icon = cfg.Icon;
              return (
                <button
                  key={type}
                  onClick={() => setCustomerTypeFilter(type)}
                  className={`flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold border transition-colors ${
                    active
                      ? `${cfg.bg} ${cfg.border} ${cfg.text}`
                      : 'bg-white text-[#475569] border-[#e2e8f0] hover:border-[#cbd5e1]'
                  }`}
                >
                  <Icon className={`h-3 w-3 ${active ? cfg.iconColor : ''}`} />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Collapsible advanced filters */}
          {filtersOpen && (
            <div className="px-4 pb-4 border-t border-[#f1f5f9] pt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {/* Customer select */}
              <div className="col-span-2 sm:col-span-3 md:col-span-2">
                <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5">Zákazník</label>
                <SearchableCustomerSelect
                  value={customerFilter}
                  onValueChange={setCustomerFilter}
                  customers={customers.filter(c => customerTypeFilter === 'all' || c.customer_type === customerTypeFilter)}
                  placeholder="Všetci zákazníci"
                  allowAll={true}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5">Kategória</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 text-xs border-[#e2e8f0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="!z-[100]">
                    <SelectItem value="all"><span className="flex items-center gap-1.5 text-xs">Všetky</span></SelectItem>
                    <SelectItem value="microgreens"><span className="flex items-center gap-1.5 text-xs"><Leaf className="h-3 w-3 text-green-600" />Mikrozelenina</span></SelectItem>
                    <SelectItem value="microherbs"><span className="flex items-center gap-1.5 text-xs"><Sprout className="h-3 w-3 text-green-600" />Mikrobylinky</span></SelectItem>
                    <SelectItem value="edible_flowers"><span className="flex items-center gap-1.5 text-xs"><Flower2 className="h-3 w-3 text-pink-500" />Jedlé kvety</span></SelectItem>
                    <SelectItem value="blends"><span className="flex items-center gap-1.5 text-xs"><Grid3x3 className="h-3 w-3 text-blue-600" />Mixy</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Size */}
              <div>
                <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5">Veľkosť</label>
                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger className="h-8 text-xs border-[#e2e8f0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="!z-[100]">
                    {['all', '250ml', '500ml', '750ml', '1000ml', '1200ml', '1500ml'].map(v => (
                      <SelectItem key={v} value={v}><span className="text-xs">{v === 'all' ? 'Všetky' : v}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Label */}
              <div>
                <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5">Etiketa</label>
                <Select value={labelFilter} onValueChange={setLabelFilter}>
                  <SelectTrigger className="h-8 text-xs border-[#e2e8f0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="!z-[100]">
                    <SelectItem value="all"><span className="text-xs">Všetko</span></SelectItem>
                    <SelectItem value="yes"><span className="text-xs">Áno</span></SelectItem>
                    <SelectItem value="no"><span className="text-xs">Nie</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Packaging type */}
              <div>
                <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5">Druh obalu</label>
                <Select value={packagingTypeFilter} onValueChange={setPackagingTypeFilter}>
                  <SelectTrigger className="h-8 text-xs border-[#e2e8f0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="!z-[100]">
                    {['all', 'rPET', 'PET', 'EKO', 'Vrátny obal'].map(v => (
                      <SelectItem key={v} value={v}><span className="text-xs">{v === 'all' ? 'Všetky' : v}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset button */}
              {activeFilterCount > 0 && (
                <div className="col-span-2 sm:col-span-3 md:col-span-5 flex justify-end">
                  <button
                    onClick={() => {
                      setCategoryFilter('all'); setSizeFilter('all'); setLabelFilter('all');
                      setPackagingTypeFilter('rPET'); setCustomerTypeFilter('all'); setCustomerFilter('all');
                    }}
                    className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#dc2626] transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Zrušiť filtre
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Content ──────────────────────────────────────────────────── */}
        {!hasContent ? (
          /* Empty state */
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm py-16 flex flex-col items-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[#f1f5f9] flex items-center justify-center mb-4">
              <Package className="h-7 w-7 text-[#94a3b8]" />
            </div>
            <h3 className="text-base font-semibold text-[#0f172a] mb-1">Žiadne objednávky</h3>
            <p className="text-sm text-[#64748b] max-w-sm">
              Pre {selectedDates.length === 1
                ? format(selectedDates[0], 'dd. MM. yyyy', { locale: sk })
                : 'vybrané dátumy'} a zvolenú kombináciu filtrov nie sú naplánované žiadne objednávky.
            </p>
            <p className="text-xs text-[#94a3b8] mt-3">
              Načítaných: {allOrders.length} | Po filtrovaní: {filteredOrders.length}
            </p>
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={[...sortedUnpreparedGroups, ...sortedPreparedGroups].map(g => g.crop_name || '')}
              strategy={verticalListSortingStrategy}
            >

              {/* ── PRIPRAVIŤ ─────────────────────────────────────────── */}
              {sortedUnpreparedGroups.length > 0 && (
                <div className="space-y-3">
                  {/* Section header */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[#475569] uppercase tracking-widest">Na prípravu</span>
                    <div className="flex-1 h-px bg-[#e2e8f0]" />
                    <span className="text-xs font-semibold text-[#0f172a] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
                      {sortedUnpreparedGroups.reduce((s, g) => s + g.itemsWithLabel.length + g.itemsWithoutLabel.length, 0)} položiek
                    </span>
                  </div>

                  {/* PLODINY */}
                  {sortedUnpreparedGroups.filter(g => !g.is_blend).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-0.5">
                        <Leaf className="h-3.5 w-3.5 text-[#16a34a]" />
                        <span className="text-xs font-semibold text-[#166534] uppercase tracking-wide">Plodiny</span>
                        <span className="text-[10px] text-[#94a3b8]">
                          ({sortedUnpreparedGroups.filter(g => !g.is_blend).length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {renderGroups(sortedUnpreparedGroups.filter(g => !g.is_blend), false)}
                      </div>
                    </div>
                  )}

                  {/* MIXY */}
                  {sortedUnpreparedGroups.filter(g => g.is_blend).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-0.5">
                        <Blend className="h-3.5 w-3.5 text-[#7c3aed]" />
                        <span className="text-xs font-semibold text-[#5b21b6] uppercase tracking-wide">Mixy</span>
                        <span className="text-[10px] text-[#94a3b8]">
                          ({sortedUnpreparedGroups.filter(g => g.is_blend).length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {renderGroups(sortedUnpreparedGroups.filter(g => g.is_blend), false)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── HOTOVÉ ───────────────────────────────────────────── */}
              {sortedPreparedGroups.length > 0 && (
                <div className="space-y-3">
                  {/* Section header */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[#16a34a] uppercase tracking-widest">Pripravené</span>
                    <div className="flex-1 h-px bg-[#bbf7d0]" />
                    <span className="text-xs font-semibold text-[#166534] bg-[#dcfce7] px-2 py-0.5 rounded-full border border-[#bbf7d0]">
                      {sortedPreparedGroups.reduce((s, g) => s + g.itemsWithLabel.length + g.itemsWithoutLabel.length, 0)} položiek
                    </span>
                  </div>

                  {/* PLODINY */}
                  {sortedPreparedGroups.filter(g => !g.is_blend).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-0.5">
                        <Leaf className="h-3.5 w-3.5 text-[#16a34a]" />
                        <span className="text-xs font-semibold text-[#166534] uppercase tracking-wide">Plodiny</span>
                        <span className="text-[10px] text-[#94a3b8]">
                          ({sortedPreparedGroups.filter(g => !g.is_blend).length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {renderGroups(sortedPreparedGroups.filter(g => !g.is_blend), true)}
                      </div>
                    </div>
                  )}

                  {/* MIXY */}
                  {sortedPreparedGroups.filter(g => g.is_blend).length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-0.5">
                        <Blend className="h-3.5 w-3.5 text-[#7c3aed]" />
                        <span className="text-xs font-semibold text-[#5b21b6] uppercase tracking-wide">Mixy</span>
                        <span className="text-[10px] text-[#94a3b8]">
                          ({sortedPreparedGroups.filter(g => g.is_blend).length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {renderGroups(sortedPreparedGroups.filter(g => g.is_blend), true)}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </SortableContext>
          </DndContext>
        )}
      </div>
    </MainLayout>
  );
}
