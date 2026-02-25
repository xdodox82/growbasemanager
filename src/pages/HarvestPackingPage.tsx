import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerTypeFilter } from '@/components/filters/CustomerTypeFilter';
import { CategoryFilter } from '@/components/orders/CategoryFilter';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Scissors,
  Package,
  CheckCircle2,
  Home,
  Utensils,
  Store,
  Calendar as CalendarIcon,
  Leaf,
  Palette,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  AlertTriangle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';
import { sk } from 'date-fns/locale';

interface DeliveryRoute {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  customer_type: string;
  delivery_route?: DeliveryRoute;
}

interface Crop {
  id: string;
  name: string;
  category: string;
}

interface Blend {
  id: string;
  name: string;
}

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
  blend?: Blend;
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
  route?: string;
  customer?: Customer;
  items?: OrderItem[];
}

interface ProductGroup {
  productId: string;
  productName: string;
  productType: 'crop' | 'blend';
  category?: string;
  orders: {
    order: Order;
    items: OrderItem[];
  }[];
}

export default function HarvestPackingPage() {
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [blends, setBlends] = useState<Blend[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliverySettings, setDeliverySettings] = useState<any>(null);
  const [ordersForCalendar, setOrdersForCalendar] = useState<any[]>([]);

  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [packagingSizeFilter, setPackagingSizeFilter] = useState<string>('all');
  const [availableSizes, setAvailableSizes] = useState<number[]>([]);
  const [completedProducts, setCompletedProducts] = useState<Set<string>>(new Set());
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [singleProductsOrder, setSingleProductsOrder] = useState<string[]>([]);
  const [mixProductsOrder, setMixProductsOrder] = useState<string[]>([]);
  const [itemsOrder, setItemsOrder] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (deliverySettings) {
      loadOrdersForCalendar();
    }
  }, [calendarMonth, deliverySettings]);

  useEffect(() => {
    loadOrdersForDate();
    setPackagingSizeFilter('all');
  }, [selectedDates]);

  // Načítaj dostupné veľkosti balení z objednávok
  useEffect(() => {
    console.log('🔍 DEBUGGING availableSizes');
    console.log('Orders count:', orders.length);
    console.log('Orders:', orders);

    if (orders.length > 0) {
      const sizes = orders.flatMap(order => {
        console.log('Order items:', order.items);
        return order.items?.map(item => {
          console.log('Item packaging_size:', item.packaging_size);
          return item.packaging_size;
        }) || [];
      });

      console.log('All sizes:', sizes);

      const uniqueSizes = [...new Set(sizes)]
        .filter((size): size is number => size != null)
        .sort((a, b) => a - b);

      console.log('Unique sizes:', uniqueSizes);
      setAvailableSizes(uniqueSizes);
    }
  }, [orders]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [deliverySettingsRes, customersRes, cropsRes, blendsRes] = await Promise.all([
        supabase
          .from('delivery_days_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('customers').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
        supabase.from('blends').select('*').order('name')
      ]);

      if (deliverySettingsRes.data) setDeliverySettings(deliverySettingsRes.data);
      if (customersRes.data) setCustomers(customersRes.data);
      if (cropsRes.data) setCrops(cropsRes.data);
      if (blendsRes.data) setBlends(blendsRes.data);

    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať dáta',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOrdersForCalendar = async () => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);

    const { data } = await supabase
      .from('planting_plans')
      .select('expected_harvest_date')
      .gte('expected_harvest_date', format(start, 'yyyy-MM-dd'))
      .lte('expected_harvest_date', format(end, 'yyyy-MM-dd'))
      .not('expected_harvest_date', 'is', null);

    if (data) {
      setOrdersForCalendar(data.map(pp => ({ delivery_date: pp.expected_harvest_date })));
    }
  };

  const loadOrdersForDate = async () => {
    try {
      if (selectedDates.length === 0) {
        setOrders([]);
        return;
      }

      console.log('📅 Loading orders for multiple dates:', selectedDates.map(d => format(d, 'yyyy-MM-dd')));

      const allOrders: any[] = [];
      const uniqueOrderIds = new Set<string>();

      for (const date of selectedDates) {
        const dateStr = format(date, 'yyyy-MM-dd');

        // SPÔSOB 1: Načítaj orders cez planting_plans (pre crops)
        const { data: plantingPlans, error: ppError } = await supabase
          .from('planting_plans')
          .select('source_orders, crop_id, actual_harvest_date, status')
          .eq('expected_harvest_date', dateStr)
          .not('source_orders', 'is', null);

        if (ppError) {
          console.error('❌ Error loading planting plans:', ppError);
        }

        // Extrahuj order IDs z planting plans
        const orderIdsFromPlans = plantingPlans
          ?.flatMap(pp => {
            try {
              const parsed = typeof pp.source_orders === 'string'
                ? JSON.parse(pp.source_orders)
                : pp.source_orders;
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })
          .filter((id): id is string => typeof id === 'string' && id.length > 0) || [];

        console.log('📦 Order IDs from planting plans for', dateStr, ':', orderIdsFromPlans.length);

        // SPÔSOB 2: Načítaj orders priamo podľa delivery_date (pre mixy bez plans)
        const { data: directOrders } = await supabase
          .from('orders')
          .select(`
            *,
            route,
            customer:customers(
              *,
              delivery_route:delivery_routes(id, name)
            ),
            items:order_items(
              *,
              package_ml,
              package_type,
              has_label_req,
              crop:products(id, name, category),
              blend:blends(id, name)
            )
          `)
          .eq('delivery_date', dateStr);

        console.log('📦 Direct orders by delivery_date for', dateStr, ':', directOrders?.length || 0);

        // Načítaj orders z planting_plans
        const { data: ordersFromPlans, error: ordersError } = orderIdsFromPlans.length > 0
          ? await supabase
              .from('orders')
              .select(`
                *,
                route,
                customer:customers(
                  *,
                  delivery_route:delivery_routes(id, name)
                ),
                items:order_items(
                  *,
                  package_ml,
                  package_type,
                  has_label_req,
                  crop:products(id, name, category),
                  blend:blends(id, name)
                )
              `)
              .in('id', orderIdsFromPlans)
          : { data: [], error: null };

        if (ordersError) {
          console.error('❌ Error loading orders from plans:', ordersError);
        }

        console.log('📦 Orders from planting plans for', dateStr, ':', ordersFromPlans?.length || 0);

        // Kombinuj obe skupiny orders
        const dateOrders = [
          ...(ordersFromPlans || []),
          ...(directOrders || [])
        ];

        // Pridaj do celkového zoznamu (sleduj unique IDs)
        dateOrders.forEach(order => {
          if (!uniqueOrderIds.has(order.id)) {
            uniqueOrderIds.add(order.id);
            allOrders.push(order);
          }
        });
      }

      console.log('✅ Total unique orders from all dates:', allOrders.length);
      console.log('📋 Orders detail:', allOrders.map(order => ({
        id: order.id,
        customer: order.customer?.name,
        items_count: order.items?.length || 0,
        items: order.items?.map(item => ({
          crop_id: item.crop_id,
          blend_id: item.blend_id,
          crop_name: item.crop?.name,
          blend_name: item.blend?.name,
          packaging_size: item.packaging_size,
          quantity: item.quantity
        }))
      })));

      // Zoradi podľa customer_type
      allOrders.sort((a, b) => {
        if (a.customer_type === 'business' && b.customer_type !== 'business') return -1;
        if (a.customer_type !== 'business' && b.customer_type === 'business') return 1;
        return 0;
      });

      setOrders(allOrders);

    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const filteredCrops = useMemo(() => {
    if (categoryFilter === 'all') return crops;
    if (categoryFilter === 'mix') return [];
    return crops.filter(c => c.category === categoryFilter);
  }, [crops, categoryFilter]);

  const filteredBlends = useMemo(() => {
    if (categoryFilter === 'all' || categoryFilter === 'mix') return blends;
    return [];
  }, [blends, categoryFilter]);

  const filteredOrders = useMemo(() => {
    console.log('🔍 Filtering orders...');
    console.log('  Total orders:', orders.length);
    console.log('  Filters:', { customerTypeFilter, categoryFilter, cropFilter, customerFilter });

    // FILTER LEN NA ZÁKAZNÍKA - kategória a plodina sa filtrujú až v groupovaní!
    return orders.filter(order => {
      // Filter typ zákazníka
      const customerTypeMatch =
        customerTypeFilter === 'all' ||
        order.customer_type === customerTypeFilter;

      // Filter konkrétneho zákazníka
      const customerMatch =
        customerFilter === 'all' ||
        order.customer_id === customerFilter;

      return customerTypeMatch && customerMatch;
    });
  }, [orders, customerTypeFilter, customerFilter, categoryFilter, cropFilter, crops]);

  const groupedByProduct = useMemo(() => {
    console.log('🔍 GROUPING PRODUCTS - categoryFilter:', categoryFilter);
    console.log('🔄 Starting grouping...', {
      filteredOrdersCount: filteredOrders.length,
      categoryFilter: categoryFilter,
      cropFilter: cropFilter
    });

    const groups: Record<string, ProductGroup> = {};

    filteredOrders.forEach((order, orderIndex) => {
      console.log(`  📝 Processing order ${orderIndex + 1}/${filteredOrders.length}:`, {
        order_id: order.id,
        customer: order.customer?.name,
        items_count: order.items?.length || 0
      });

      order.items?.forEach(item => {
        const productId = item.crop_id || item.blend_id || 'unknown';
        const productType = item.crop_id ? 'crop' : 'blend';
        const crop = item.crop || crops.find(c => c.id === item.crop_id);
        const blend = item.blend || blends.find(b => b.id === item.blend_id);
        const productName = crop?.name || blend?.name || item.crop_name || 'Neznámy produkt';
        const category = crop?.category;

        console.log('  📦 Item check:', {
          productName,
          productType,
          categoryFilter,
          crop_id: item.crop_id,
          blend_id: item.blend_id,
          category
        });

        // FILTER NA ÚROVNI ITEM - aplikuj kategóriu a crop filter
        // 1. Filter kategórie
        const categoryMatch = (() => {
          // Ak je "all" → zobraz VŠETKO (crops aj blends)
          if (categoryFilter === 'all') {
            return true;
          }

          // Ak je "mix" → zobraz len blends
          if (categoryFilter === 'mix') {
            return item.blend_id !== null;
          }

          // Pre ostatné kategórie → zobraz len crops s danou kategóriou
          return item.crop_id !== null && crop?.category === categoryFilter;
        })();

        if (!categoryMatch) {
          console.log('    ❌ Filtered out - category mismatch');
          return;
        }

        // 2. Filter konkrétnej plodiny/blendu
        if (cropFilter !== 'all') {
          const cropMatch = item.crop_id === cropFilter || item.blend_id === cropFilter;
          if (!cropMatch) {
            console.log('    ❌ Filtered out - crop/blend mismatch');
            return;
          }
        }

        // 3. Filter pre veľkosť balenia
        if (packagingSizeFilter !== 'all') {
          if (item.packaging_size?.toString() !== packagingSizeFilter) {
            console.log('    ❌ Filtered out - packaging size mismatch');
            return;
          }
        }

        console.log('    ✅ PASSED - all filters matched');

        if (!groups[productId]) {
          groups[productId] = {
            productId,
            productName,
            productType,
            category,
            orders: []
          };
        }

        const existingOrder = groups[productId].orders.find(o => o.order.id === order.id);
        if (existingOrder) {
          existingOrder.items.push(item);
        } else {
          groups[productId].orders.push({
            order,
            items: [item]
          });
        }
      });
    });

    return Object.values(groups);
  }, [filteredOrders, crops, blends, categoryFilter, cropFilter, packagingSizeFilter]);

  const singleProducts = groupedByProduct.filter(g => g.productType === 'crop' && !completedProducts.has(g.productId));
  const mixProducts = groupedByProduct.filter(g => g.productType === 'blend' && !completedProducts.has(g.productId));
  const completedProductsList = groupedByProduct.filter(g => completedProducts.has(g.productId));

  console.log('📦 Grouped products:', groupedByProduct.length);
  console.log('🌱 Single products:', singleProducts.length);
  console.log('🎨 Mix products:', mixProducts.length);
  console.log('✅ Completed products:', completedProductsList.length);
  console.log('🔍 Category filter:', categoryFilter);

  useEffect(() => {
    const savedOrder = localStorage.getItem('harvestPacking_singleOrder');
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        const validOrder = parsedOrder.filter((id: string) =>
          singleProducts.some(p => p.productId === id)
        );
        const newProducts = singleProducts
          .filter(p => !validOrder.includes(p.productId))
          .map(p => p.productId);
        setSingleProductsOrder([...validOrder, ...newProducts]);
      } catch (e) {
        setSingleProductsOrder(singleProducts.map(p => p.productId));
      }
    } else {
      setSingleProductsOrder(singleProducts.map(p => p.productId));
    }
  }, [singleProducts.map(p => p.productId).join(',')]);

  useEffect(() => {
    const savedOrder = localStorage.getItem('harvestPacking_mixOrder');
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        const validOrder = parsedOrder.filter((id: string) =>
          mixProducts.some(p => p.productId === id)
        );
        const newProducts = mixProducts
          .filter(p => !validOrder.includes(p.productId))
          .map(p => p.productId);
        setMixProductsOrder([...validOrder, ...newProducts]);
      } catch (e) {
        setMixProductsOrder(mixProducts.map(p => p.productId));
      }
    } else {
      setMixProductsOrder(mixProducts.map(p => p.productId));
    }
  }, [mixProducts.map(p => p.productId).join(',')]);

  useEffect(() => {
    const newOrder: Record<string, string[]> = {};

    [...singleProducts, ...mixProducts].forEach(product => {
      const sortedOrders = sortOrdersByCustomerType(product.orders);
      const itemIds: string[] = [];

      sortedOrders.forEach(({ order, items }) => {
        items.forEach((item, idx) => {
          const itemKey = `${order.id}-${item.id || idx}`;
          itemIds.push(itemKey);
        });
      });

      const savedOrder = localStorage.getItem(`harvestPacking_itemsOrder_${product.productId}`);
      if (savedOrder) {
        try {
          const parsedOrder = JSON.parse(savedOrder);
          const validOrder = parsedOrder.filter((id: string) => itemIds.includes(id));
          const newItems = itemIds.filter(id => !validOrder.includes(id));
          newOrder[product.productId] = [...validOrder, ...newItems];
        } catch (e) {
          newOrder[product.productId] = itemIds;
        }
      } else {
        newOrder[product.productId] = itemIds;
      }
    });

    setItemsOrder(newOrder);
  }, [singleProducts.map(p => p.productId).join(','), mixProducts.map(p => p.productId).join(','), JSON.stringify(filteredOrders.map(o => o.id))]);

  const sortedSingleProducts = singleProductsOrder
    .map(id => singleProducts.find(p => p.productId === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  const sortedMixProducts = mixProductsOrder
    .map(id => mixProducts.find(p => p.productId === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  const handleMarkComplete = async (productId: string) => {
    const isCurrentlyCompleted = completedProducts.has(productId);

    try {
      const dateStr = selectedDates.length > 0 ? format(selectedDates[0], 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      if (isCurrentlyCompleted) {
        // Zruš dokončenie - odstráň actual_harvest_date
        const { error } = await supabase
          .from('planting_plans')
          .update({
            actual_harvest_date: null,
            status: 'growing'
          })
          .eq('crop_id', productId)
          .eq('expected_harvest_date', dateStr);

        if (error) throw error;

        setCompletedProducts(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });

        toast({
          title: 'Zrušené',
          description: 'Zrušené dokončenie zberu'
        });
      } else {
        // Označ ako hotové - nastav actual_harvest_date
        const { error } = await supabase
          .from('planting_plans')
          .update({
            actual_harvest_date: todayStr,
            status: 'harvested'
          })
          .eq('crop_id', productId)
          .eq('expected_harvest_date', dateStr);

        if (error) throw error;

        setCompletedProducts(prev => {
          const next = new Set(prev);
          next.add(productId);
          return next;
        });

        toast({
          title: 'Označené',
          description: 'Označené ako dokončené'
        });
      }
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa uložiť zmenu',
        variant: 'destructive'
      });
    }
  };

  const getCustomerTypeIcon = (type: string) => {
    switch (type) {
      case 'home': return <Home className="h-4 w-4" />;
      case 'gastro': return <Utensils className="h-4 w-4" />;
      case 'wholesale': return <Store className="h-4 w-4" />;
      default: return null;
    }
  };

  const getCustomerTypeLabel = (type: string) => {
    switch (type) {
      case 'home': return 'Domáci';
      case 'gastro': return 'Gastro';
      case 'wholesale': return 'VO';
      default: return type;
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndSingle = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSingleProductsOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('harvestPacking_singleOrder', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const handleDragEndMix = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMixProductsOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('harvestPacking_mixOrder', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const handleToggleItemComplete = (orderItemKey: string) => {
    setCompletedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderItemKey)) {
        newSet.delete(orderItemKey);
      } else {
        newSet.add(orderItemKey);
      }
      return newSet;
    });
  };

  const handleItemDragEnd = (event: DragEndEvent, productId: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setItemsOrder(prev => {
      const items = prev[productId] || [];
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);

      if (oldIndex === -1 || newIndex === -1) return prev;

      const newOrder = arrayMove(items, oldIndex, newIndex);

      localStorage.setItem(
        `harvestPacking_itemsOrder_${productId}`,
        JSON.stringify(newOrder)
      );

      return {
        ...prev,
        [productId]: newOrder
      };
    });
  };

  const sortOrdersByCustomerType = (orders: { order: Order; items: OrderItem[] }[]) => {
    const typeOrder = { gastro: 1, wholesale: 2, home: 3 };
    return [...orders].sort((a, b) => {
      const aType = a.order.customer_type || 'home';
      const bType = b.order.customer_type || 'home';
      return (typeOrder[aType as keyof typeof typeOrder] || 99) - (typeOrder[bType as keyof typeof typeOrder] || 99);
    });
  };

  const isDeliveryDay = (date: Date) => {
    if (!deliverySettings) return false;
    const dayOfWeek = getDay(date);
    const dayMap: Record<number, string> = {
      1: 'monday', 2: 'tuesday', 3: 'wednesday',
      4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday'
    };
    return deliverySettings[dayMap[dayOfWeek]] === true;
  };

  const hasOrdersOnDate = (date: Date) => {
    return ordersForCalendar.some(order =>
      isSameDay(new Date(order.delivery_date), date)
    );
  };

  const goToPreviousMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const renderCalendar = () => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });

    const firstDayOfWeek = getDay(start);
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    return (
      <div className="w-[320px] p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-base">
            {format(calendarMonth, 'MMMM yyyy', { locale: sk })}
          </h3>
          <Button variant="ghost" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-600 w-9 h-6 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="w-9 h-9" />
          ))}

          {days.map(day => {
            const isDelivery = isDeliveryDay(day);
            const hasOrders = hasOrdersOnDate(day);
            const today = isToday(day);
            const selected = selectedDates.some(d => isSameDay(d, day));

            let bgColor = 'bg-white hover:bg-gray-50';

            if (isDelivery) {
              bgColor = 'bg-green-200 hover:bg-green-300';
            } else if (hasOrders) {
              bgColor = 'bg-yellow-300 hover:bg-yellow-400';
            }

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  // Toggle mode: pridaj/odoberaj deň (funguje na mobile aj PC)
                  setSelectedDates(prev => {
                    const exists = prev.some(d => isSameDay(d, day));
                    if (exists) {
                      return prev.filter(d => !isSameDay(d, day));
                    } else {
                      return [...prev, day];
                    }
                  });
                }}
                className={`
                  ${bgColor}
                  ${today ? 'ring-2 ring-green-600' : ''}
                  ${selected ? 'ring-2 ring-blue-500' : ''}
                  rounded-full w-9 h-9 flex items-center justify-center
                  text-sm font-medium cursor-pointer transition-all
                `}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-200 border border-gray-300" />
            <span>Rozvozový deň</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-300 border border-gray-300" />
            <span>Objednávky</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full ring-2 ring-blue-500" />
            <span>Vybraný deň</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 text-gray-600">
            <span className="font-medium">Tip:</span> Ctrl/Cmd + klik pre výber viacerých dní
          </div>
        </div>
      </div>
    );
  };

  const getRouteColor = (route: string) => {
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-300',
      'bg-purple-50 text-purple-700 border-purple-300',
      'bg-pink-50 text-pink-700 border-pink-300',
      'bg-orange-50 text-orange-700 border-orange-300',
      'bg-teal-50 text-teal-700 border-teal-300',
      'bg-indigo-50 text-indigo-700 border-indigo-300',
    ];

    let hash = 0;
    for (let i = 0; i < route.length; i++) {
      hash = ((hash << 5) - hash) + route.charCodeAt(i);
      hash = hash & hash;
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const getRouteName = (order: Order): string | null => {
    if (order.route) return order.route;

    if (order.customer?.delivery_route?.name) {
      return order.customer.delivery_route.name;
    }

    return null;
  };

  const SortableOrderItem = ({
    item,
    order,
    itemKey,
    isCompleted
  }: {
    item: OrderItem;
    order: Order;
    itemKey: string;
    isCompleted: boolean;
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: itemKey });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style}>
        <div
          className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-2 px-3 leading-tight rounded ${
            isCompleted
              ? 'bg-green-100 border-l-4 border-green-500'
              : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2 flex-1">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            {getCustomerTypeIcon(order.customer_type)}
            <span className="font-medium text-gray-900 text-sm">
              {order.customer_name}
            </span>
            <span className="text-xs text-gray-500">
              ({getCustomerTypeLabel(order.customer_type)})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="text-sm font-medium text-gray-900">
              {item.quantity} × {item.packaging_size || 'N/A'}{item.packaging_size ? 'g' : ''}
              {item.package_ml && (
                <span className="text-xs md:text-sm text-gray-600">
                  {' '}({item.package_ml}ml)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center px-1.5 py-0.5 bg-green-600 text-white text-xs font-medium rounded">
                {item.package_type || 'rPET'}
              </span>
              {item.returned_packaging_count > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded">
                  Vratný: {item.returned_packaging_count}×
                </span>
              )}
              {item.has_label_req && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-50 text-black text-xs font-medium rounded border border-yellow-200">
                  🏷️ Etiketa
                </span>
              )}
            </div>

            {getRouteName(order) && (
              <Badge
                variant="outline"
                className={`text-xs px-1.5 py-0.5 ${getRouteColor(getRouteName(order)!)}`}
              >
                🚚 {getRouteName(order)}
              </Badge>
            )}

            <button
              onClick={() => handleToggleItemComplete(itemKey)}
              className={`px-4 py-2 text-sm font-semibold rounded transition-colors ml-auto md:ml-0 ${
                isCompleted
                  ? 'bg-green-200 hover:bg-green-300'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {isCompleted ? '✓ Hotovo' : '✓ Hotovo'}
            </button>
          </div>

          {order.notes && (
            <div className="mt-2 bg-red-50 border-2 border-red-500 rounded-md p-2 w-full">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-700 flex-shrink-0 mt-0.5" />
                <span className="text-red-700 font-bold text-sm">
                  POZNÁMKA: {order.notes}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const SortableProductListCard = ({ group, section }: { group: ProductGroup; section: 'single' | 'mix' }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: group.productId });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const sortedOrders = sortOrdersByCustomerType(group.orders);
    const isCompleted = completedProducts.has(group.productId);

    return (
      <div ref={setNodeRef} style={style}>
        <Card className={`p-4 ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-3 pb-3 border-b">
            <div className="flex items-center gap-3">
              <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1">
                <GripVertical className="w-5 h-5" />
              </button>
              {section === 'single' ? (
                <Leaf className="h-5 w-5 text-green-600" />
              ) : (
                <Palette className="h-5 w-5 text-purple-600" />
              )}
              <h3 className="flex-1 text-base font-semibold text-gray-900">{group.productName}</h3>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleItemDragEnd(event, group.productId)}
          >
            <SortableContext
              items={itemsOrder[group.productId] || []}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {(itemsOrder[group.productId] || [])
                  .map(itemKey => {
                    for (const { order, items } of sortedOrders) {
                      for (let idx = 0; idx < items.length; idx++) {
                        const item = items[idx];
                        const key = `${order.id}-${item.id || idx}`;
                        if (key === itemKey) {
                          return { item, order, itemKey };
                        }
                      }
                    }
                    return null;
                  })
                  .filter((data): data is NonNullable<typeof data> => data !== null)
                  .map(({ item, order, itemKey }) => (
                    <SortableOrderItem
                      key={itemKey}
                      item={item}
                      order={order}
                      itemKey={itemKey}
                      isCompleted={completedItems.has(itemKey)}
                    />
                  ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="mt-3 pt-3 border-t text-sm text-gray-600">
            Celkom: {group.orders.length} objednáv{group.orders.length === 1 ? 'ka' : group.orders.length < 5 ? 'ky' : 'ok'}
          </div>
        </Card>
      </div>
    );
  };


  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p>Načítavam...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Zber a balenie"
        description="Organizácia zberu a balenia produktov podľa dňa doručenia"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Filtre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <CustomerTypeFilter
                value={customerTypeFilter}
                onChange={setCustomerTypeFilter}
                showLabel={false}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 text-center mb-2">
                  {selectedDates.length === 1 ? 'Deň doručenia' : `Vybrané dni (${selectedDates.length})`}
                </label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-10 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDates.length === 1
                        ? format(selectedDates[0], 'EEEE d.M.yyyy', { locale: sk })
                        : selectedDates
                            .sort((a, b) => a.getTime() - b.getTime())
                            .map(d => format(d, 'd.M.', { locale: sk }))
                            .join(', ')
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    {renderCalendar()}
                  </PopoverContent>
                </Popover>
              </div>

              <CategoryFilter
                value={categoryFilter}
                onChange={(value) => {
                  setCategoryFilter(value);
                  setCropFilter('all');
                }}
              />

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 text-center mb-2">Plodina / Mix</label>
                <select
                  value={cropFilter}
                  onChange={(e) => setCropFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="all">Všetky plodiny</option>
                  {categoryFilter === 'mix'
                    ? filteredBlends.map(blend => (
                        <option key={blend.id} value={blend.id}>
                          {blend.name}
                        </option>
                      ))
                    : filteredCrops.map(crop => (
                        <option key={crop.id} value={crop.id}>
                          {crop.name}
                        </option>
                      ))
                  }
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 text-center mb-2">
                  Veľkosť balenia
                </label>
                <Select
                  value={packagingSizeFilter}
                  onValueChange={setPackagingSizeFilter}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Všetky" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všetky veľkosti</SelectItem>
                    {availableSizes.map(size => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}g
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 text-center mb-2">Zákazník</label>
                <SearchableCustomerSelect
                  customers={customers}
                  value={customerFilter}
                  onValueChange={setCustomerFilter}
                  placeholder="Všetci zákazníci"
                  filterByType={customerTypeFilter}
                  allowAll={true}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {singleProducts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Scissors className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Zber a balenie jednotlivých plodín</h2>
              </div>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndSingle}
            >
              <SortableContext
                items={singleProductsOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {sortedSingleProducts.map(group => (
                    <SortableProductListCard
                      key={group.productId}
                      group={group}
                      section="single"
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {mixProducts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Balenie mixov</h2>
              </div>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndMix}
            >
              <SortableContext
                items={mixProductsOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {sortedMixProducts.map(group => (
                    <SortableProductListCard
                      key={group.productId}
                      group={group}
                      section="mix"
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {singleProducts.length === 0 && mixProducts.length === 0 && completedProductsList.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Žiadne objednávky pre vybraný deň
              </p>
            </CardContent>
          </Card>
        )}

        {completedProductsList.length > 0 && (
          <Card className="mt-8 border-green-200 bg-green-50/50">
            <CardHeader className="bg-green-100/50">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Hotové produkty
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedProductsList.map(group => {
                  const sortedOrders = sortOrdersByCustomerType(group.orders);
                  return (
                    <Card key={group.productId} className="border-green-300 bg-white">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {group.productType === 'crop' ? (
                              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <Leaf className="h-5 w-5 text-green-600" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Palette className="h-5 w-5 text-purple-600" />
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-lg">{group.productName}</CardTitle>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkComplete(group.productId)}
                            className="text-amber-600 hover:text-amber-700"
                          >
                            ↩ Vrátiť
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {sortedOrders.map(({ order, items }) => (
                            <div key={order.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                {getCustomerTypeIcon(order.customer_type)}
                                <span className="font-semibold text-sm">{order.customer_name}</span>
                                <span className="text-gray-600 text-xs">
                                  ({getCustomerTypeLabel(order.customer_type)})
                                </span>
                              </div>
                              <div className="text-right space-y-1">
                                {items.map((item, idx) => (
                                  <div key={idx} className="text-sm text-gray-700">
                                    <span className="font-medium">
                                      {item.quantity} × {item.packaging_size || 'N/A'}{item.packaging_size ? 'g' : ''}
                                    </span>
                                    {item.package_ml && (
                                      <span className="text-gray-500 text-sm">
                                        {' '}({item.package_ml}ml)
                                      </span>
                                    )}
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 bg-green-600 text-white text-xs font-medium rounded">
                                      {item.package_type || 'rPET'}
                                    </span>
                                    {item.returned_packaging_count > 0 && (
                                      <span className="ml-2 text-blue-600 text-sm">
                                        [Vratný obal: {item.returned_packaging_count}×]
                                      </span>
                                    )}
                                    {item.has_label_req && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-50 text-black text-xs font-medium rounded border border-yellow-200">
                                        🏷️ Etiketa
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
