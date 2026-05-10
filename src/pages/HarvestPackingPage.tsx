// IMPORTANT: Use 'House' not 'Home' - Home is Chrome browser icon
import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import { useToast } from '@/hooks/use-toast';
import { useDeliveryDays } from '@/hooks/useDeliveryDays';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext, closestCenter, DragEndEvent,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, sortableKeyboardCoordinates, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Scissors, Package, Check, RotateCcw, House, Utensils, Store, Calendar as CalendarIcon, Leaf, Blend, ChevronLeft, ChevronRight, GripVertical, TriangleAlert as AlertTriangle, Tag, Filter, ChevronDown, ChevronUp, Sprout, Flower2, Grid3x3, X } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isToday,
} from 'date-fns';
import { sk } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeliveryRoute { id: string; name: string; }
interface Customer { id: string; name: string; customer_type: string; delivery_route?: DeliveryRoute; }
interface Crop { id: string; name: string; category: string; }
interface BlendType { id: string; name: string; }

interface OrderItem {
  id: string;
  order_id: string;
  crop_id?: string;
  blend_id?: string;
  crop_name?: string;
  quantity: number;
  package_ml?: number;
  package_type?: string;
  packaging_size?: number;
  returned_packaging_count?: number;
  has_label_req?: boolean;
  notes?: string;
  crop?: Crop;
  blend?: BlendType;
  route?: string;
  delivery_route_name?: string;
}

interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_type: string;
  delivery_date: string;
  status: string;
  notes?: string;
  route?: string;
  customer?: Customer;
  items?: OrderItem[];
}

interface ProductGroup {
  productId: string;
  productName: string;
  productType: 'crop' | 'blend';
  category?: string;
  orders: { order: Order; items: OrderItem[] }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CUST_TYPE = {
  home:      { label: 'Domáci',  Icon: House,    bg: 'bg-[#f0fdf4]', border: 'border-[#bbf7d0]', text: 'text-[#16a34a]' },
  gastro:    { label: 'Gastro',  Icon: Utensils, bg: 'bg-[#eff6ff]', border: 'border-[#bfdbfe]', text: 'text-[#2563eb]' },
  wholesale: { label: 'VO',      Icon: Store,    bg: 'bg-[#fff7ed]', border: 'border-[#fed7aa]', text: 'text-[#d97706]' },
} as const;

const getCfg = (type: string) => CUST_TYPE[type as keyof typeof CUST_TYPE] ?? CUST_TYPE.home;

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
    <button onClick={onClick} className={[
      'inline-flex items-center gap-1.5 px-3 h-7 rounded-full border text-xs font-medium transition-colors',
      active ? activeStyles[variant] : 'bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#cbd5e1]',
    ].join(' ')}>
      {children}
    </button>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HarvestPackingPage() {
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [blends, setBlends] = useState<BlendType[]>([]);
  const [loading, setLoading] = useState(true);
  const { getDeliveryDaysArray } = useDeliveryDays();
  const [ordersForCalendar, setOrdersForCalendar] = useState<any[]>([]);

  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cropFilter, setCropFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [packagingSizeFilter, setPackagingSizeFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [packTypeFilter, setPackTypeFilter] = useState('all');
  const [availableSizes, setAvailableSizes] = useState<number[]>([]);
  const [availableRoutes, setAvailableRoutes] = useState<string[]>([]);
  const [availablePackTypes, setAvailablePackTypes] = useState<string[]>([]);

  // State
  const [completedProducts, setCompletedProducts] = useState<Set<string>>(new Set());
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [singleProductsOrder, setSingleProductsOrder] = useState<string[]>([]);
  const [mixProductsOrder, setMixProductsOrder] = useState<string[]>([]);
  const [itemsOrder, setItemsOrder] = useState<Record<string, string[]>>({});

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { loadOrdersForCalendar(); }, [calendarMonth]);
  useEffect(() => { loadOrdersForDate(); setPackagingSizeFilter('all'); }, [selectedDates]);

  useEffect(() => {
    if (orders.length > 0) {
      const completed = new Set<string>();
      orders.forEach(order => {
        if (['ready', 'packed', 'on_the_way', 'delivered', 'dorucena'].includes(order.status)) {
          order.items?.forEach(item => completed.add(`${order.id}-${item.id || 0}`));
        }
      });
      setCompletedItems(completed);
    }
  }, [orders]);

  useEffect(() => {
    if (orders.length > 0) {
      const sizes = orders.flatMap(o => o.items?.map(i => i.packaging_size) || []);
      setAvailableSizes([...new Set(sizes)].filter((s): s is number => s != null).sort((a, b) => a - b));

      const routes = orders
        .map(o => o.customer?.delivery_route?.name || o.route || null)
        .filter((r): r is string => !!r);
      setAvailableRoutes([...new Set(routes)].sort());

      const packTypes = orders
        .flatMap(o => o.items?.map((i: any) => i.package_type || 'rPET') || [])
        .filter(Boolean);
      setAvailablePackTypes([...new Set(packTypes)].sort());
    }
  }, [orders]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [customersRes, cropsRes, blendsRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
        supabase.from('blends').select('*').order('name'),
      ]);
      if (customersRes.data) setCustomers(customersRes.data);
      if (cropsRes.data) setCrops(cropsRes.data);
      if (blendsRes.data) setBlends(blendsRes.data);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa načítať dáta', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadOrdersForCalendar = async () => {
    const { data } = await supabase
      .from('planting_plans')
      .select('expected_harvest_date')
      .gte('expected_harvest_date', format(startOfMonth(calendarMonth), 'yyyy-MM-dd'))
      .lte('expected_harvest_date', format(endOfMonth(calendarMonth), 'yyyy-MM-dd'))
      .not('expected_harvest_date', 'is', null);
    if (data) setOrdersForCalendar(data.map(pp => ({ delivery_date: pp.expected_harvest_date })));
  };

  const loadOrdersForDate = async () => {
    try {
      if (selectedDates.length === 0) { setOrders([]); return; }

      const allOrders: any[] = [];
      const uniqueOrderIds = new Set<string>();

      for (const date of selectedDates) {
        const dateStr = format(date, 'yyyy-MM-dd');

        const { data: plantingPlans } = await supabase
          .from('planting_plans')
          .select('source_orders, crop_id, actual_harvest_date, status')
          .eq('expected_harvest_date', dateStr)
          .not('source_orders', 'is', null);

        const orderIdsFromPlans = plantingPlans?.flatMap(pp => {
          try {
            const parsed = typeof pp.source_orders === 'string' ? JSON.parse(pp.source_orders) : pp.source_orders;
            return Array.isArray(parsed) ? parsed : [];
          } catch { return []; }
        }).filter((id): id is string => typeof id === 'string' && id.length > 0) || [];

        const { data: directOrders } = await supabase
          .from('orders')
          .select(`*, route, customer:customers(*, delivery_route:delivery_routes(id, name)),
            items:order_items(*, package_ml, package_type, has_label_req,
              crop:products(id, name, category), blend:blends(id, name))`)
          .eq('delivery_date', dateStr);

        const { data: ordersFromPlans } = orderIdsFromPlans.length > 0
          ? await supabase
              .from('orders')
              .select(`*, route, customer:customers(*, delivery_route:delivery_routes(id, name)),
                items:order_items(*, package_ml, package_type, has_label_req,
                  crop:products(id, name, category), blend:blends(id, name))`)
              .in('id', orderIdsFromPlans)
          : { data: [] };

        [...(ordersFromPlans || []), ...(directOrders || [])].forEach(order => {
          if (!uniqueOrderIds.has(order.id)) {
            uniqueOrderIds.add(order.id);
            allOrders.push(order);
          }
        });
      }

      allOrders.sort((a, b) => {
        if (a.customer_type === 'business' && b.customer_type !== 'business') return -1;
        if (a.customer_type !== 'business' && b.customer_type === 'business') return 1;
        return 0;
      });

      const { data: packagingMappings } = await supabase
        .from('packaging_mappings')
        .select('crop_id, weight_g, packagings(type, size)');

      const enrichedOrders = allOrders.map(order => ({
        ...order,
        items: (order.items || []).map((item: any) => {
          if (item.package_ml && item.package_type) return item;
          if (item.crop_id && item.packaging_size) {
            const weightG = parseInt(String(item.packaging_size).replace(/[^0-9]/g, ''));
            const mapping = (packagingMappings || []).find(
              (m: any) => m.crop_id === item.crop_id && m.weight_g === weightG
            );
            if (mapping && mapping.packagings) {
              const pkg = mapping.packagings as any;
              const volumeMatch = pkg.size?.match(/(\d+)/);
              return {
                ...item,
                package_type: item.package_type || pkg.type || 'rPET',
                package_ml: item.package_ml || (volumeMatch ? parseInt(volumeMatch[1]) : null),
              };
            }
          }
          return item;
        }),
      }));

      setOrders(enrichedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  // ── Filters & grouping ─────────────────────────────────────────────────────

  const filteredCrops = useMemo(() => {
    if (categoryFilter === 'all') return crops;
    if (categoryFilter === 'mix') return [];
    return crops.filter(c => c.category === categoryFilter);
  }, [crops, categoryFilter]);

  const filteredBlends = useMemo(() => {
    if (categoryFilter === 'all' || categoryFilter === 'mix') return blends;
    return [];
  }, [blends, categoryFilter]);

  const filteredOrders = useMemo(() =>
    orders.filter(order => {
      if (customerTypeFilter !== 'all' && order.customer_type !== customerTypeFilter) return false;
      if (customerFilter !== 'all' && order.customer_id !== customerFilter) return false;
      if (routeFilter !== 'all') {
        const orderRoute = order.customer?.delivery_route?.name || order.route || null;
        if (orderRoute !== routeFilter) return false;
      }
      return true;
    }),
  [orders, customerTypeFilter, customerFilter, routeFilter]);

  const groupedByProduct = useMemo(() => {
    const groups: Record<string, ProductGroup> = {};

    filteredOrders.forEach(order => {
      order.items?.forEach(item => {
        const productId = item.crop_id || item.blend_id || 'unknown';
        const productType = item.crop_id ? 'crop' : 'blend';
        const crop = item.crop || crops.find(c => c.id === item.crop_id);
        const blend = item.blend || blends.find(b => b.id === item.blend_id);
        const productName = crop?.name || blend?.name || item.crop_name || 'Neznámy produkt';
        const category = crop?.category;

        // Category filter
        const categoryMatch = (() => {
          if (categoryFilter === 'all') return true;
          if (categoryFilter === 'mix') return item.blend_id != null;
          return item.crop_id != null && crop?.category === categoryFilter;
        })();
        if (!categoryMatch) return;

        // Crop filter
        if (cropFilter !== 'all' && item.crop_id !== cropFilter && item.blend_id !== cropFilter) return;

        // Size filter
        if (packagingSizeFilter !== 'all' && item.packaging_size?.toString() !== packagingSizeFilter) return;

        // Pack type filter
        if (packTypeFilter !== 'all' && (item.package_type || 'rPET') !== packTypeFilter) return;

        if (!groups[productId]) {
          groups[productId] = { productId, productName, productType, category, orders: [] };
        }

        const existingOrder = groups[productId].orders.find(o => o.order.id === order.id);
        if (existingOrder) existingOrder.items.push(item);
        else groups[productId].orders.push({ order, items: [item] });
      });
    });

    return Object.values(groups);
  }, [filteredOrders, crops, blends, categoryFilter, cropFilter, packagingSizeFilter, packTypeFilter]);

  const singleProducts = groupedByProduct.filter(g => g.productType === 'crop' && !completedProducts.has(g.productId));
  const mixProducts    = groupedByProduct.filter(g => g.productType === 'blend' && !completedProducts.has(g.productId));
  const completedProductsList = groupedByProduct.filter(g => completedProducts.has(g.productId));

  // ── Product order persistence ──────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem('harvestPacking_singleOrder');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        const valid = p.filter((id: string) => singleProducts.some(s => s.productId === id));
        const fresh = singleProducts.filter(s => !valid.includes(s.productId)).map(s => s.productId);
        setSingleProductsOrder([...valid, ...fresh]);
      } catch { setSingleProductsOrder(singleProducts.map(p => p.productId)); }
    } else {
      setSingleProductsOrder(singleProducts.map(p => p.productId));
    }
  }, [singleProducts.map(p => p.productId).join(',')]);

  useEffect(() => {
    const saved = localStorage.getItem('harvestPacking_mixOrder');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        const valid = p.filter((id: string) => mixProducts.some(m => m.productId === id));
        const fresh = mixProducts.filter(m => !valid.includes(m.productId)).map(m => m.productId);
        setMixProductsOrder([...valid, ...fresh]);
      } catch { setMixProductsOrder(mixProducts.map(p => p.productId)); }
    } else {
      setMixProductsOrder(mixProducts.map(p => p.productId));
    }
  }, [mixProducts.map(p => p.productId).join(',')]);

  useEffect(() => {
    const newOrder: Record<string, string[]> = {};
    [...singleProducts, ...mixProducts].forEach(product => {
      const sortedOrds = sortOrdersByCustomerType(product.orders);
      const itemIds: string[] = [];
      sortedOrds.forEach(({ order, items }) =>
        items.forEach((item, idx) => itemIds.push(`${order.id}-${item.id || idx}`))
      );
      const saved = localStorage.getItem(`harvestPacking_itemsOrder_${product.productId}`);
      if (saved) {
        try {
          const p = JSON.parse(saved);
          const valid = p.filter((id: string) => itemIds.includes(id));
          const fresh = itemIds.filter(id => !valid.includes(id));
          newOrder[product.productId] = [...valid, ...fresh];
        } catch { newOrder[product.productId] = itemIds; }
      } else {
        newOrder[product.productId] = itemIds;
      }
    });
    setItemsOrder(newOrder);
  }, [singleProducts.map(p => p.productId).join(','), mixProducts.map(p => p.productId).join(','), JSON.stringify(filteredOrders.map(o => o.id))]);

  const sortedSingleProducts = singleProductsOrder.map(id => singleProducts.find(p => p.productId === id)).filter((p): p is NonNullable<typeof p> => p !== undefined);
  const sortedMixProducts    = mixProductsOrder.map(id => mixProducts.find(p => p.productId === id)).filter((p): p is NonNullable<typeof p> => p !== undefined);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleMarkComplete = async (productId: string) => {
    const isCurrentlyCompleted = completedProducts.has(productId);
    try {
      const dateStr = selectedDates.length > 0 ? format(selectedDates[0], 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      if (isCurrentlyCompleted) {
        await supabase.from('planting_plans')
          .update({ actual_harvest_date: null, status: 'growing' })
          .eq('crop_id', productId).eq('expected_harvest_date', dateStr);
        setCompletedProducts(prev => { const n = new Set(prev); n.delete(productId); return n; });
        toast({ title: 'Zrušené', description: 'Zrušené dokončenie zberu' });
      } else {
        await supabase.from('planting_plans')
          .update({ actual_harvest_date: todayStr, status: 'harvested' })
          .eq('crop_id', productId).eq('expected_harvest_date', dateStr);
        setCompletedProducts(prev => new Set(prev).add(productId));
        toast({ title: 'Označené', description: 'Označené ako dokončené' });
      }
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa uložiť zmenu', variant: 'destructive' });
    }
  };

  const updateOrderStatus = async (orderId: string, isCompleting: boolean) => {
    const { error } = await supabase.from('orders')
      .update({ status: isCompleting ? 'packed' : null })
      .eq('id', orderId);
    if (!error && isCompleting) {
      toast({ title: '📦 Zabalená', description: 'Objednávka je zabalená a pripravená na rozvoz' });
    }
  };

  const handleToggleItemComplete = async (orderItemKey: string, orderId: string) => {
    const isCompleting = !completedItems.has(orderItemKey);
    setCompletedItems(prev => {
      const n = new Set(prev);
      isCompleting ? n.add(orderItemKey) : n.delete(orderItemKey);
      return n;
    });
    await updateOrderStatus(orderId, isCompleting);
  };

  // ── DnD ───────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEndSingle = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSingleProductsOrder(items => {
        const newOrder = arrayMove(items, items.indexOf(active.id as string), items.indexOf(over.id as string));
        localStorage.setItem('harvestPacking_singleOrder', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const handleDragEndMix = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMixProductsOrder(items => {
        const newOrder = arrayMove(items, items.indexOf(active.id as string), items.indexOf(over.id as string));
        localStorage.setItem('harvestPacking_mixOrder', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const handleItemDragEnd = (event: DragEndEvent, productId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItemsOrder(prev => {
      const items = prev[productId] || [];
      const newOrder = arrayMove(items, items.indexOf(active.id as string), items.indexOf(over.id as string));
      localStorage.setItem(`harvestPacking_itemsOrder_${productId}`, JSON.stringify(newOrder));
      return { ...prev, [productId]: newOrder };
    });
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const sortOrdersByCustomerType = (orders: { order: Order; items: OrderItem[] }[]) => {
    const typeOrder = { gastro: 1, wholesale: 2, home: 3 };
    return [...orders].sort((a, b) =>
      (typeOrder[a.order.customer_type as keyof typeof typeOrder] || 99) -
      (typeOrder[b.order.customer_type as keyof typeof typeOrder] || 99)
    );
  };

  const isDeliveryDay = (date: Date) => getDeliveryDaysArray().includes(getDay(date));
  const hasOrdersOnDate = (date: Date) => ordersForCalendar.some(o => isSameDay(new Date(o.delivery_date), date));

  const getRouteName = (order: Order): string | null =>
    order.route || order.customer?.delivery_route?.name || null;

  const getRouteColor = (route: string) => {
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-pink-50 text-pink-700 border-pink-200',
      'bg-orange-50 text-orange-700 border-orange-200',
      'bg-teal-50 text-teal-700 border-teal-200',
    ];
    let hash = 0;
    for (let i = 0; i < route.length; i++) { hash = ((hash << 5) - hash) + route.charCodeAt(i); hash = hash & hash; }
    return colors[Math.abs(hash) % colors.length];
  };

  const activeFilterCount = [
    customerTypeFilter !== 'all', categoryFilter !== 'all',
    cropFilter !== 'all', packagingSizeFilter !== 'all',
    customerFilter !== 'all', routeFilter !== 'all', packTypeFilter !== 'all',
  ].filter(Boolean).length;

  // ── Calendar ───────────────────────────────────────────────────────────────

  const CalendarGrid = () => {
    const start = startOfMonth(calendarMonth);
    const days  = eachDayOfInterval({ start, end: endOfMonth(calendarMonth) });
    const pad   = getDay(start) === 0 ? 6 : getDay(start) - 1;

    return (
      <div className="w-[308px] p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCalendarMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f1f5f9] transition-colors">
            <ChevronLeft className="h-4 w-4 text-[#475569]" />
          </button>
          <span className="text-sm font-semibold text-[#0f172a] capitalize">
            {format(calendarMonth, 'LLLL yyyy', { locale: sk })}
          </span>
          <button onClick={() => setCalendarMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))}
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
            { cls: 'bg-[#fef9c3]', label: 'Objednávky' },
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

  // ── Item row ───────────────────────────────────────────────────────────────

  const SortableOrderItem = ({ item, order, itemKey, isCompleted }: {
    item: OrderItem; order: Order; itemKey: string; isCompleted: boolean;
  }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: itemKey });
    const cfg = getCfg(order.customer_type);
    const Icon = cfg.Icon;
    const isRecurring = order.notes?.includes('freq:weekly') || order.notes?.includes('freq:biweekly');
    const cleanNotes = order.notes
      ?.replace(/freq:(weekly|biweekly)/g, '')
      .replace(/\|/g, '')
      .replace(/\bpickup\b/gi, 'Osobný odber')
      .replace(/\bpreorder\b/gi, 'Predobjednávka')
      .replace(/\bPredobjednávka\b/g, 'Predobjednávka')
      .trim();
    const routeName = getRouteName(order);

    return (
      <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
        <div className={[
          'flex items-center gap-3 px-4 py-3 transition-colors border-t border-[#f1f5f9]',
          isCompleted ? 'bg-[#f0fdf4]' : 'hover:bg-[#f8fafc]',
        ].join(' ')}>
          {/* Drag handle */}
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-[#cbd5e1] hover:text-[#94a3b8] shrink-0">
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Customer icon */}
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.border}`}>
            <Icon className={`h-4 w-4 ${cfg.text}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-[#0f172a] truncate">{order.customer_name}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                {cfg.label}
              </span>
              {isRecurring && (
                <span title="Opakovaná objednávka" className="text-[10px] px-1.5 py-0.5 bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] rounded-md font-medium">🔄</span>
              )}
              {routeName && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${getRouteColor(routeName)}`}>
                  🚚 {routeName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[13px] font-semibold text-[#0f172a]">
                {item.quantity} × {item.packaging_size || 'N/A'}{item.packaging_size ? 'g' : ''}
              </span>
              {item.package_ml && (
                <span className="text-[11px] text-[#94a3b8]">({item.package_ml}ml)</span>
              )}
              <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#16a34a] text-white rounded">
                {item.package_type || 'rPET'}
              </span>
              {item.has_label_req && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#fef08a] text-[#854d0e] text-[10px] font-bold rounded border border-[#fde047]">
                  <Tag className="h-2.5 w-2.5" />ETIKETA
                </span>
              )}
              {(item.returned_packaging_count ?? 0) > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] rounded-md font-medium">
                  Vratný: {item.returned_packaging_count}×
                </span>
              )}
              {cleanNotes && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-red-300 rounded text-[10px] text-red-700 font-medium">
                  <AlertTriangle className="h-2.5 w-2.5 text-yellow-500" />
                  {cleanNotes}
                </span>
              )}
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={() => handleToggleItemComplete(itemKey, order.id)}
            className={[
              'shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-semibold transition-colors border',
              isCompleted
                ? 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0] hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#fca5a5]'
                : 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0] hover:bg-[#dcfce7] hover:text-[#166634] hover:border-[#bbf7d0]',
            ].join(' ')}
          >
            {isCompleted
              ? <><RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Vrátiť</span></>
              : <><Check className="h-3.5 w-3.5" /><span className="hidden sm:inline">Hotovo</span></>
            }
          </button>
        </div>
      </div>
    );
  };

  // ── Product card ───────────────────────────────────────────────────────────

  const SortableProductCard = ({ group, section }: { group: ProductGroup; section: 'single' | 'mix' }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.productId });
    const isCompleted = completedProducts.has(group.productId);
    const sortedOrds = sortOrdersByCustomerType(group.orders);
    const totalItems = group.orders.reduce((acc, { items }) => acc + items.length, 0);

    return (
      <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
        className={['rounded-xl border shadow-sm overflow-hidden', isCompleted ? 'border-[#bbf7d0]' : 'border-[#e2e8f0]'].join(' ')}>

        {/* Card header */}
        <div className={[
          'flex items-center gap-2.5 px-4 py-3 border-b',
          section === 'mix'
            ? 'bg-gradient-to-r from-[#f5f3ff] to-[#faf8ff] border-[#e9d5ff]'
            : isCompleted
            ? 'bg-gradient-to-r from-[#dcfce7] to-[#f0fdf4] border-[#bbf7d0]'
            : 'bg-gradient-to-r from-[#f0fdf4] to-[#f8fafc] border-[#d1fae5]',
        ].join(' ')}>
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-[#cbd5e1] hover:text-[#94a3b8] p-0.5 shrink-0">
            <GripVertical className="w-4 h-4" />
          </button>

          {isCompleted
            ? <Check className="h-4 w-4 text-[#16a34a] shrink-0" />
            : section === 'mix'
            ? <Blend className="h-4 w-4 text-[#7c3aed] shrink-0" />
            : <Leaf className="h-4 w-4 text-[#16a34a] shrink-0" />
          }

          <span className={[
            'font-semibold flex-1 text-[15px] tracking-tight',
            section === 'mix' ? 'text-[#5b21b6]' : 'text-[#14532d]',
          ].join(' ')}>
            {group.productName}
          </span>

          <span className={[
            'text-xs font-medium px-2 py-0.5 rounded-full border',
            section === 'mix'
              ? 'bg-[#f5f3ff] text-[#5b21b6] border-[#e9d5ff]'
              : 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]',
          ].join(' ')}>
            {totalItems} {totalItems === 1 ? 'objednávka' : totalItems < 5 ? 'objednávky' : 'objednávok'}
          </span>

          <button
            onClick={() => handleMarkComplete(group.productId)}
            className={[
              'flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[11px] font-medium transition-colors',
              isCompleted
                ? 'border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#fca5a5]'
                : section === 'mix'
                ? 'border-[#e9d5ff] bg-[#f5f3ff] text-[#5b21b6] hover:bg-[#ede9fe]'
                : 'border-[#bbf7d0] bg-[#f0fdf4] text-[#166534] hover:bg-[#dcfce7]',
            ].join(' ')}
          >
            {isCompleted ? <><RotateCcw className="h-3 w-3" /> Vrátiť</> : <><Check className="h-3 w-3" /> Hotovo</>}
          </button>
        </div>

        {/* Items */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleItemDragEnd(e, group.productId)}>
          <SortableContext items={itemsOrder[group.productId] || []} strategy={verticalListSortingStrategy}>
            {(itemsOrder[group.productId] || [])
              .map(itemKey => {
                for (const { order, items } of sortedOrds) {
                  for (let idx = 0; idx < items.length; idx++) {
                    const item = items[idx];
                    if (`${order.id}-${item.id || idx}` === itemKey) return { item, order, itemKey };
                  }
                }
                return null;
              })
              .filter((d): d is NonNullable<typeof d> => d !== null)
              .map(({ item, order, itemKey }) => (
                <SortableOrderItem
                  key={itemKey} item={item} order={order} itemKey={itemKey}
                  isCompleted={completedItems.has(itemKey)}
                />
              ))}
          </SortableContext>
        </DndContext>
      </div>
    );
  };

  // ── Section header ─────────────────────────────────────────────────────────

  const SectionHeader = ({ icon, label, count, variant = 'green' }: {
    icon: React.ReactNode; label: string; count: number; variant?: 'green' | 'purple' | 'done';
  }) => {
    const colors = {
      green:  { line: 'bg-[#e2e8f0]', badge: 'bg-[#f1f5f9] text-[#0f172a]', label: 'text-[#475569]' },
      purple: { line: 'bg-[#e9d5ff]', badge: 'bg-[#f5f3ff] text-[#5b21b6] border border-[#e9d5ff]', label: 'text-[#5b21b6]' },
      done:   { line: 'bg-[#bbf7d0]', badge: 'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]', label: 'text-[#16a34a]' },
    };
    const c = colors[variant];
    return (
      <div className="flex items-center gap-2.5 my-4">
        {icon}
        <span className={`text-[11px] font-bold uppercase tracking-widest ${c.label}`}>{label}</span>
        <div className={`flex-1 h-px ${c.line}`} />
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{count}</span>
      </div>
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <MainLayout hideMobileHeader>
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-[#64748b]">Načítavam...</div>
        </div>
      </MainLayout>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <MainLayout hideMobileHeader>
      <div className="w-full space-y-3 pb-8 px-4 md:px-6">

        {/* Top bar */}
        <div className="flex items-start justify-between gap-4 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#dcfce7] border border-[#bbf7d0] flex items-center justify-center">
              <Scissors className="h-5 w-5 text-[#16a34a]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0f172a] leading-none">Zber a balenie</h1>
              <p className="text-xs text-[#94a3b8] mt-0.5">Organizácia zberu a balenia podľa dátumu</p>
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

        {/* Filter card */}
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
            {/* Date display */}
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
              <Chip active={customerTypeFilter === 'all'} onClick={() => setCustomerTypeFilter('all')} variant="neutral">Všetci</Chip>
              <Chip active={customerTypeFilter === 'home'} onClick={() => setCustomerTypeFilter('home')} variant="green"><House className="h-3 w-3" /> Domáci</Chip>
              <Chip active={customerTypeFilter === 'gastro'} onClick={() => setCustomerTypeFilter('gastro')} variant="blue"><Utensils className="h-3 w-3" /> Gastro</Chip>
              <Chip active={customerTypeFilter === 'wholesale'} onClick={() => setCustomerTypeFilter('wholesale')} variant="orange"><Store className="h-3 w-3" /> VO</Chip>
            </div>
          </div>

          {filtersOpen && (
            <div className="px-4 pb-4 border-t border-[#f1f5f9] pt-3 flex flex-col gap-3">
              {/* Category */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide w-14 shrink-0">Kategória</span>
                <div className="w-px h-4 bg-[#e2e8f0]" />
                <Chip active={categoryFilter === 'all'} onClick={() => { setCategoryFilter('all'); setCropFilter('all'); }} variant="neutral">Všetky</Chip>
                <Chip active={categoryFilter === 'microgreens'} onClick={() => { setCategoryFilter('microgreens'); setCropFilter('all'); }} variant="green"><Leaf className="h-3 w-3" /> Mikrozelenina</Chip>
                <Chip active={categoryFilter === 'microherbs'} onClick={() => { setCategoryFilter('microherbs'); setCropFilter('all'); }} variant="green"><Sprout className="h-3 w-3" /> Mikrobylinky</Chip>
                <Chip active={categoryFilter === 'edible_flowers'} onClick={() => { setCategoryFilter('edible_flowers'); setCropFilter('all'); }} variant="green"><Flower2 className="h-3 w-3" /> Kvety</Chip>
                <Chip active={categoryFilter === 'mix'} onClick={() => { setCategoryFilter('mix'); setCropFilter('all'); }} variant="blue"><Grid3x3 className="h-3 w-3" /> Mixy</Chip>
              </div>

              {/* Size */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide w-14 shrink-0">Veľkosť</span>
                <div className="w-px h-4 bg-[#e2e8f0]" />
                <Chip active={packagingSizeFilter === 'all'} onClick={() => setPackagingSizeFilter('all')} variant="neutral">Všetky</Chip>
                {availableSizes.map(size => (
                  <Chip key={size} active={packagingSizeFilter === size.toString()} onClick={() => setPackagingSizeFilter(size.toString())} variant="neutral">
                    {size}g
                  </Chip>
                ))}
              </div>

              {/* Route */}
              {availableRoutes.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide w-14 shrink-0">Trasa</span>
                  <div className="w-px h-4 bg-[#e2e8f0]" />
                  <Chip active={routeFilter === 'all'} onClick={() => setRouteFilter('all')} variant="neutral">Všetky</Chip>
                  {availableRoutes.map(route => (
                    <Chip key={route} active={routeFilter === route} onClick={() => setRouteFilter(route)} variant="blue">
                      🚚 {route}
                    </Chip>
                  ))}
                </div>
              )}

              {/* Pack type */}
              {availablePackTypes.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide w-14 shrink-0">Obal</span>
                  <div className="w-px h-4 bg-[#e2e8f0]" />
                  <Chip active={packTypeFilter === 'all'} onClick={() => setPackTypeFilter('all')} variant="neutral">Všetky</Chip>
                  {availablePackTypes.map(pt => (
                    <Chip key={pt} active={packTypeFilter === pt} onClick={() => setPackTypeFilter(pt)} variant="neutral">
                      {pt}
                    </Chip>
                  ))}
                </div>
              )}

              {/* Crop/blend */}
              {(filteredCrops.length > 0 || filteredBlends.length > 0) && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide w-14 shrink-0">Plodina</span>
                  <div className="w-px h-4 bg-[#e2e8f0]" />
                  <Chip active={cropFilter === 'all'} onClick={() => setCropFilter('all')} variant="neutral">Všetky</Chip>
                  {(categoryFilter === 'mix' ? filteredBlends : filteredCrops).map(item => (
                    <Chip key={item.id} active={cropFilter === item.id} onClick={() => setCropFilter(item.id)} variant="neutral">
                      {item.name}
                    </Chip>
                  ))}
                </div>
              )}

              {/* Customer */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wide w-14 shrink-0">Klient</span>
                <div className="w-px h-4 bg-[#e2e8f0]" />
                <div className="flex-1 min-w-[200px]">
                  <SearchableCustomerSelect
                    customers={customers.filter(c => customerTypeFilter === 'all' || c.customer_type === customerTypeFilter)}
                    value={customerFilter}
                    onValueChange={setCustomerFilter}
                    placeholder="Všetci zákazníci"
                    allowAll={true}
                  />
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => { setCustomerTypeFilter('all'); setCategoryFilter('all'); setCropFilter('all'); setPackagingSizeFilter('all'); setCustomerFilter('all'); setRouteFilter('all'); setPackTypeFilter('all'); }}
                    className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#dc2626] transition-colors">
                    <X className="h-3 w-3" /> Zrušiť filtre
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {singleProducts.length === 0 && mixProducts.length === 0 && completedProductsList.length === 0 ? (
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
          </div>
        ) : (
          <>
            {/* Plodiny */}
            {singleProducts.length > 0 && (
              <div>
                <SectionHeader
                  icon={<Scissors className="h-4 w-4 text-[#16a34a]" />}
                  label="Zber a balenie plodín"
                  count={singleProducts.length}
                  variant="green"
                />
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSingle}>
                  <SortableContext items={singleProductsOrder} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {sortedSingleProducts.map(group => (
                        <SortableProductCard key={group.productId} group={group} section="single" />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Mixy */}
            {mixProducts.length > 0 && (
              <div>
                <SectionHeader
                  icon={<Blend className="h-4 w-4 text-[#7c3aed]" />}
                  label="Balenie mixov"
                  count={mixProducts.length}
                  variant="purple"
                />
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndMix}>
                  <SortableContext items={mixProductsOrder} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {sortedMixProducts.map(group => (
                        <SortableProductCard key={group.productId} group={group} section="mix" />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Hotové */}
            {completedProductsList.length > 0 && (
              <div>
                <SectionHeader
                  icon={<Check className="h-4 w-4 text-[#16a34a]" />}
                  label="Hotové"
                  count={completedProductsList.length}
                  variant="done"
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {completedProductsList.map(group => {
                    const sortedOrds = sortOrdersByCustomerType(group.orders);
                    return (
                      <div key={group.productId} className="bg-[#f0fdf4] rounded-xl border border-[#bbf7d0] shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#d1fae5] bg-[#dcfce7]">
                          {group.productType === 'blend'
                            ? <Blend className="h-4 w-4 text-[#7c3aed] shrink-0" />
                            : <Check className="h-4 w-4 text-[#16a34a] shrink-0" />
                          }
                          <span className="font-semibold text-[14px] text-[#14532d] flex-1">{group.productName}</span>
                          <button
                            onClick={() => handleMarkComplete(group.productId)}
                            className="flex items-center gap-1 h-6 px-2 rounded-md border border-[#e2e8f0] bg-white text-[11px] font-medium text-[#64748b] hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#fca5a5] transition-colors">
                            <RotateCcw className="h-3 w-3" /> Vrátiť
                          </button>
                        </div>
                        <div className="divide-y divide-[#d1fae5]">
                          {sortedOrds.map(({ order, items }) => {
                            const cfg = getCfg(order.customer_type);
                            const Icon = cfg.Icon;
                            return (
                              <div key={order.id} className="flex items-center gap-2 px-4 py-2.5">
                                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.border}`}>
                                  <Icon className={`h-3.5 w-3.5 ${cfg.text}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-sm text-[#0f172a] truncate block">{order.customer_name}</span>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {items.map((item, idx) => (
                                      <span key={idx} className="text-[11px] font-semibold text-[#166534]">
                                        {item.quantity} × {item.packaging_size}g
                                        {item.package_ml ? ` (${item.package_ml}ml)` : ''}
                                        {item.has_label_req && <span className="ml-1 text-[#854d0e]">· ETI</span>}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
