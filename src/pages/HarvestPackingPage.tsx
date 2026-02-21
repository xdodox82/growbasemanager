import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomerTypeFilter } from '@/components/filters/CustomerTypeFilter';
import { CategoryFilter } from '@/components/orders/CategoryFilter';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';
import { sk } from 'date-fns/locale';

interface Customer {
  id: string;
  name: string;
  customer_type: string;
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
  notes?: string;
  crop?: Crop;
  blend?: Blend;
}

interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_type: string;
  delivery_date: string;
  status: string;
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

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [completedProducts, setCompletedProducts] = useState<Set<string>>(new Set());

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
  }, [selectedDate]);

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
      .select('actual_harvest_date')
      .gte('actual_harvest_date', format(start, 'yyyy-MM-dd'))
      .lte('actual_harvest_date', format(end, 'yyyy-MM-dd'))
      .not('actual_harvest_date', 'is', null);

    if (data) {
      setOrdersForCalendar(data.map(pp => ({ delivery_date: pp.actual_harvest_date })));
    }
  };

  const loadOrdersForDate = async () => {
    try {
      console.log('📅 Loading orders for actual_harvest_date:', format(selectedDate, 'yyyy-MM-dd'));

      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { data: plantingPlans, error: ppError } = await supabase
        .from('planting_plans')
        .select('order_id')
        .eq('actual_harvest_date', dateStr);

      if (ppError) {
        console.error('❌ Error loading planting plans:', ppError);
        return;
      }

      if (!plantingPlans || plantingPlans.length === 0) {
        console.log('ℹ️ No planting plans for this harvest date');
        setOrders([]);
        return;
      }

      const orderIds = plantingPlans
        .map(pp => pp.order_id)
        .filter((id): id is string => id !== null);

      if (orderIds.length === 0) {
        console.log('ℹ️ No orders linked to planting plans');
        setOrders([]);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          items:order_items(
            *,
            crop:products(id, name, category),
            blend:blends(id, name)
          )
        `)
        .in('id', orderIds)
        .order('customer_type', { ascending: false });

      if (error) {
        console.error('❌ Error loading orders:', error);
        return;
      }

      console.log('✅ Loaded orders for harvest date:', data?.length);
      setOrders(data || []);

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

    return orders.filter(order => {
      if (customerTypeFilter !== 'all' && order.customer_type !== customerTypeFilter) {
        return false;
      }

      if (customerFilter !== 'all' && order.customer_id !== customerFilter) {
        return false;
      }

      if (categoryFilter !== 'all' || cropFilter !== 'all') {
        const hasMatchingItem = order.items?.some(item => {
          const crop = crops.find(c => c.id === item.crop_id);
          const isBlend = !!item.blend_id;

          if (categoryFilter === 'mix') {
            return isBlend && (cropFilter === 'all' || item.blend_id === cropFilter);
          }

          if (categoryFilter !== 'all' && crop?.category !== categoryFilter) {
            return false;
          }

          if (cropFilter !== 'all') {
            return item.crop_id === cropFilter || item.blend_id === cropFilter;
          }

          return true;
        });

        if (!hasMatchingItem) return false;
      }

      return true;
    });
  }, [orders, customerTypeFilter, customerFilter, categoryFilter, cropFilter, crops]);

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
  }, [filteredOrders, crops, blends]);

  const singleProducts = groupedByProduct.filter(g => g.productType === 'crop');
  const mixProducts = groupedByProduct.filter(g => g.productType === 'blend');

  const allSingleComplete = singleProducts.length > 0 && singleProducts.every(p => completedProducts.has(p.productId));

  const handleMarkComplete = (productId: string) => {
    setCompletedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });

    toast({
      title: completedProducts.has(productId) ? 'Zrušené' : 'Označené',
      description: completedProducts.has(productId) ? 'Zrušené dokončenie' : 'Označené ako dokončené'
    });
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
            const selected = isSameDay(day, selectedDate);

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
                  setSelectedDate(day);
                  setCalendarOpen(false);
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
        </div>
      </div>
    );
  };

  const renderProductCard = (group: ProductGroup, section: 'single' | 'mix') => {
    const isCompleted = completedProducts.has(group.productId);
    const isDisabled = section === 'mix' && !allSingleComplete;

    const sortedOrders = sortOrdersByCustomerType(group.orders);

    return (
      <Card key={group.productId} className={isDisabled ? 'opacity-50' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {section === 'single' ? (
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
                {group.category && (
                  <p className="text-sm text-muted-foreground">
                    {group.category === 'microgreens' && 'Mikrozelenina'}
                    {group.category === 'microherbs' && 'Mikrobylinky'}
                    {group.category === 'edible_flowers' && 'Jedlé kvety'}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant={isCompleted ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleMarkComplete(group.productId)}
              disabled={isDisabled}
              className={isCompleted ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isCompleted ? 'Hotové' : 'Označiť'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedOrders.map(({ order, items }) => (
              <div key={order.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getCustomerTypeIcon(order.customer_type)}
                  <div>
                    <p className="font-medium text-sm">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCustomerTypeLabel(order.customer_type)}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  {items.map((item, idx) => (
                    <div key={idx}>
                      <Badge variant="secondary">
                        {item.quantity}× {item.package_ml}ml
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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
            <CustomerTypeFilter
              value={customerTypeFilter}
              onChange={setCustomerTypeFilter}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Deň doručenia</label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'EEEE d.M.yyyy', { locale: sk })}
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Plodina / Mix</label>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Zákazník</label>
                <SearchableCustomerSelect
                  customers={customers}
                  value={customerFilter}
                  onChange={setCustomerFilter}
                  placeholder="Všetci zákazníci"
                  customerTypeFilter={customerTypeFilter}
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
                <h2 className="text-2xl font-bold">1️⃣ Single plodiny - Zber a balenie</h2>
                <p className="text-muted-foreground">Zber a balenie jednotlivých plodín</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {singleProducts.map(group => renderProductCard(group, 'single'))}
            </div>
          </div>
        )}

        {mixProducts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">2️⃣ Mixy - Balenie</h2>
                <p className={allSingleComplete ? 'text-green-600 font-medium' : 'text-amber-600'}>
                  {allSingleComplete
                    ? '✓ Všetky single plodiny dokončené - môžete pokračovať'
                    : '⚠ Najprv dokončite všetky single plodiny'
                  }
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mixProducts.map(group => renderProductCard(group, 'mix'))}
            </div>
          </div>
        )}

        {singleProducts.length === 0 && mixProducts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Žiadne objednávky pre vybraný deň
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
