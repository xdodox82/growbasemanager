import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Package, Check, RotateCcw, Home, Utensils, Tag, ChevronLeft, ChevronRight, Leaf, Sprout, Flower, Grid3x3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GroupedItem {
  crop_name: string;
  package_ml: string;
  package_type: string;
  has_label: boolean;
  total_pieces: number;
  customers: Array<{
    id: string;
    order_id: string;
    order_item_id: string;
    name: string;
    type: string;
    pieces: number;
    prepared: boolean;
  }>;
}

export default function PrepPackagingPage() {
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [packagingTypeFilter, setPackagingTypeFilter] = useState<string>('rPET');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [deliverySettings, setDeliverySettings] = useState<any>(null);
  const [ordersForCalendar, setOrdersForCalendar] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [preparedItems, setPreparedItems] = useState<Set<string>>(new Set());

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

    if (deliverySettings) {
      fetchOrdersForCalendar();
    }
  }, [calendarMonth, deliverySettings]);

  useEffect(() => {
    const fetchOrders = async () => {
      console.log('🔍 Fetching orders for date:', format(selectedDate, 'yyyy-MM-dd'));

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*),
          items:order_items(
            *,
            crop:products(name, category),
            blend:blends(name)
          )
        `)
        .eq('delivery_date', format(selectedDate, 'yyyy-MM-dd'))
        .order('customer_name');

      console.log('📊 Fetched orders:', data);
      console.log('❌ Error:', error);

      if (data) {
        console.log('✅ Setting allOrders, count:', data.length);
        setAllOrders(data);
      }
    };

    fetchOrders();
  }, [selectedDate]);

  useEffect(() => {
    console.log('🔧 Applying filters...');
    console.log('  allOrders count:', allOrders.length);
    console.log('  customerTypeFilter:', customerTypeFilter);
    console.log('  categoryFilter:', categoryFilter);

    let filtered = [...allOrders];

    if (customerTypeFilter !== 'all') {
      filtered = filtered.filter(order => order.customer_type === customerTypeFilter);
      console.log('  After customer filter:', filtered.length);
    }

    if (categoryFilter !== 'all') {
      if (categoryFilter === 'blends') {
        filtered = filtered.filter(order =>
          order.items?.some((item: any) => item.blend_id !== null)
        );
      } else {
        filtered = filtered.filter(order =>
          order.items?.some((item: any) => item.crop?.category === categoryFilter)
        );
      }
      console.log('  After category filter:', filtered.length);
    }

    if (sizeFilter !== 'all') {
      console.log('  🔍 Size filter:', sizeFilter);
      console.log('  🔍 Items package_ml:',
        allOrders.flatMap(o => o.items || []).map(i => i.package_ml)
      );

      // Preveď filter hodnotu na číslo (napr. "750ml" → 750)
      const filterValue = parseInt(sizeFilter.replace('ml', ''));

      filtered = filtered.filter(order =>
        order.items?.some((item: any) => item.package_ml === filterValue)
      );
      console.log('  After size filter:', filtered.length);
    }

    if (labelFilter !== 'all') {
      console.log('  🔍 Label filter:', labelFilter);
      console.log('  🔍 Items has_label_req:',
        allOrders.flatMap(o => o.items || []).map(i => i.has_label_req)
      );
      console.log('  🔍 Items needs_label:',
        allOrders.flatMap(o => o.items || []).map(i => i.needs_label)
      );

      const needsLabel = labelFilter === 'yes';
      filtered = filtered.filter(order =>
        order.items?.some((item: any) =>
          item.has_label_req === needsLabel || item.needs_label === needsLabel
        )
      );
      console.log('  After label filter:', filtered.length);
    }

    if (packagingTypeFilter !== 'all') {
      filtered = filtered.filter(order =>
        order.items?.some((item: any) =>
          item.package_type === packagingTypeFilter
        )
      );
      console.log('  After packaging filter:', filtered.length);
    }

    console.log('✅ Final filteredOrders count:', filtered.length);
    setFilteredOrders(filtered);
  }, [allOrders, customerTypeFilter, categoryFilter, sizeFilter, labelFilter, packagingTypeFilter]);

  const isDeliveryDay = (date: Date): boolean => {
    if (!deliverySettings) return false;
    const dayOfWeek = getDay(date);

    switch (dayOfWeek) {
      case 0: return deliverySettings.sunday || false;
      case 1: return deliverySettings.monday || false;
      case 2: return deliverySettings.tuesday || false;
      case 3: return deliverySettings.wednesday || false;
      case 4: return deliverySettings.thursday || false;
      case 5: return deliverySettings.friday || false;
      case 6: return deliverySettings.saturday || false;
      default: return false;
    }
  };

  const hasOrdersOnDate = (date: Date): boolean => {
    return ordersForCalendar.some(order =>
      isSameDay(new Date(order.delivery_date), date)
    );
  };

  const goToPreviousMonth = () => {
    setCalendarMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCalendarMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const CalendarGrid = () => {
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
            <div className="w-5 h-5 rounded-full bg-green-200 border border-gray-300" />
            <span className="text-gray-600">Rozvozový deň</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-yellow-300 border border-gray-300" />
            <span className="text-gray-600">Objednávky mimo rozvozu</span>
          </div>
        </div>
      </div>
    );
  };

  const groupedItems = (() => {
    console.log('📦 Creating groupedItems from filteredOrders:', filteredOrders.length);
    const groups: Record<string, GroupedItem> = {};

    filteredOrders.forEach(order => {
      console.log('  Processing order:', order.id, 'items count:', order.items?.length);
      if (!order.items || order.items.length === 0) {
        console.log('    ⚠️ Order has no items, skipping');
        return;
      }

      order.items.forEach((item: any) => {
        const customerName = order.customer_type === 'home'
          ? order.customer_name
          : (order.customer?.company_name || order.customer_name);

        const packageSize = item.packaging_size;
        if (!packageSize) {
          console.log('    ⚠️ Item has no packaging_size, skipping');
          return;
        }

        const cropName = item.crop?.name || item.blend?.name || 'Neznáme';
        const packageType = item.packaging_type || 'rPET';
        const hasLabel = item.needs_label !== false;

        const key = `${cropName}-${packageSize}-${hasLabel}`;
        console.log('    ✓ Item:', cropName, packageSize, 'label:', hasLabel);

        if (!groups[key]) {
          groups[key] = {
            crop_name: cropName,
            package_ml: packageSize,
            package_type: packageType,
            has_label: hasLabel,
            total_pieces: 0,
            customers: [],
          };
        }

        const itemId = `${order.id}-${item.id}`;
        const pieces = Math.ceil(item.quantity || 1);

        groups[key].total_pieces += pieces;
        groups[key].customers.push({
          id: itemId,
          order_id: order.id,
          order_item_id: item.id,
          name: customerName || 'Neznámy',
          type: order.customer_type || 'home',
          pieces: pieces,
          prepared: preparedItems.has(itemId),
        });
      });
    });

    const result = Object.values(groups).sort((a, b) => {
      if (a.has_label && !b.has_label) return -1;
      if (!a.has_label && b.has_label) return 1;
      return a.crop_name.localeCompare(b.crop_name);
    });

    console.log('📦 Final groupedItems count:', result.length);
    return result;
  })();

  const unpreparedGroups = groupedItems
    .map(group => ({
      ...group,
      customers: group.customers.filter(c => !c.prepared),
      total_pieces: group.customers.filter(c => !c.prepared).reduce((sum, c) => sum + c.pieces, 0),
    }))
    .filter(g => g.customers.length > 0);

  const preparedGroups = groupedItems
    .map(group => ({
      ...group,
      customers: group.customers.filter(c => c.prepared),
      total_pieces: group.customers.filter(c => c.prepared).reduce((sum, c) => sum + c.pieces, 0),
    }))
    .filter(g => g.customers.length > 0);

  const markAsPrepared = (itemId: string) => {
    setPreparedItems(prev => new Set(prev).add(itemId));
    toast({ title: 'Označené', description: 'Položka pripravená' });
  };

  const markAsUnprepared = (itemId: string) => {
    setPreparedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
    toast({ title: 'Vrátené', description: 'Položka vrátená' });
  };

  const totalUnprepared = unpreparedGroups.reduce((sum, g) => sum + g.customers.length, 0);
  const totalPrepared = preparedGroups.reduce((sum, g) => sum + g.customers.length, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Príprava obalov"
          description="Pripravte krabičky a etikety podľa zvoleného dátumu a typu zákazníka"
          icon={<Package className="h-6 w-6" />}
        />

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filtre</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Typ zákazníka
              </label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={customerTypeFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCustomerTypeFilter('all')}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Všetci
                </Button>
                <Button
                  variant={customerTypeFilter === 'home' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCustomerTypeFilter('home')}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Domáci
                </Button>
                <Button
                  variant={customerTypeFilter === 'gastro' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCustomerTypeFilter('gastro')}
                >
                  <Utensils className="h-4 w-4 mr-2" />
                  Gastro
                </Button>
                <Button
                  variant={customerTypeFilter === 'wholesale' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCustomerTypeFilter('wholesale')}
                >
                  <Package className="h-4 w-4 mr-2" />
                  VO
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Dátum
                </label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'dd.MM.yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarGrid />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Kategória
                </label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kategória" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5} className="!z-[100]">
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Všetky kategórie
                      </div>
                    </SelectItem>
                    <SelectItem value="microgreens">
                      <div className="flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-green-600" />
                        Mikrozelenina
                      </div>
                    </SelectItem>
                    <SelectItem value="microherbs">
                      <div className="flex items-center gap-2">
                        <Sprout className="h-4 w-4 text-green-600" />
                        Mikrobylinky
                      </div>
                    </SelectItem>
                    <SelectItem value="edible_flowers">
                      <div className="flex items-center gap-2">
                        <Flower className="h-4 w-4 text-pink-500" />
                        Jedlé kvety
                      </div>
                    </SelectItem>
                    <SelectItem value="blends">
                      <div className="flex items-center gap-2">
                        <Grid3x3 className="h-4 w-4 text-blue-600" />
                        Mixy
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Veľkosť
                </label>
                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Všetky" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5} className="!z-[100]">
                    <SelectItem value="all">Všetky</SelectItem>
                    <SelectItem value="250ml">250ml</SelectItem>
                    <SelectItem value="500ml">500ml</SelectItem>
                    <SelectItem value="750ml">750ml</SelectItem>
                    <SelectItem value="1000ml">1000ml</SelectItem>
                    <SelectItem value="1200ml">1200ml</SelectItem>
                    <SelectItem value="1500ml">1500ml</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Etiketa
                </label>
                <Select value={labelFilter} onValueChange={setLabelFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Všetko" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5} className="!z-[100]">
                    <SelectItem value="all">Všetko</SelectItem>
                    <SelectItem value="yes">Áno</SelectItem>
                    <SelectItem value="no">Nie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                  Druh obalu
                </label>
                <Select value={packagingTypeFilter} onValueChange={setPackagingTypeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Typ" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={5} className="!z-[100]">
                    <SelectItem value="all">Všetky</SelectItem>
                    <SelectItem value="rPET">rPET</SelectItem>
                    <SelectItem value="PET">PET</SelectItem>
                    <SelectItem value="EKO">EKO</SelectItem>
                    <SelectItem value="Vrátny obal">Vrátny obal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {unpreparedGroups.length === 0 && preparedGroups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Žiadne objednávky pre vybraný deň
            </h3>
            <p className="text-gray-600 mb-2">
              Vybraný dátum: <span className="font-semibold">{format(selectedDate, 'dd.MM.yyyy (EEEE)', { locale: sk })}</span>
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Pre tento dátum a zvolenú kombináciu filtrov nie sú naplánované žiadne objednávky.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Počet načítaných objednávok: {allOrders.length} | Po filtrovaní: {filteredOrders.length}
            </p>
          </div>
        ) : (
          <>
            {unpreparedGroups.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  PRIPRAVIŤ ({totalUnprepared} {totalUnprepared === 1 ? 'položka' : totalUnprepared < 5 ? 'položky' : 'položiek'})
                </h2>

                <div className="space-y-4">
                  {unpreparedGroups.map((group, idx) => (
                    <Card key={idx} className="p-4 bg-white shadow-sm">
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b">
                        <span className="text-2xl">🌱</span>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{group.crop_name}</h3>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="font-medium">{group.package_ml}</span>
                            <Badge variant={group.package_type === 'rPET' ? 'default' : group.package_type === 'EKO' ? 'secondary' : 'outline'}>
                              {group.package_type}
                            </Badge>
                            {group.has_label ? (
                              <Badge className="bg-green-600 text-white gap-1">
                                <Tag className="h-3 w-3" />
                                S ETIKETOU
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                BEZ ETIKETY
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {group.customers.map(customer => (
                          <div key={customer.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded">
                            <div className="flex items-center gap-3">
                              {customer.type === 'home' && <Home className="h-4 w-4 text-blue-500" />}
                              {customer.type === 'gastro' && <Utensils className="h-4 w-4 text-orange-500" />}
                              {customer.type === 'wholesale' && <Package className="h-4 w-4 text-purple-500" />}
                              <span className="font-medium">{customer.name}</span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-gray-600 font-semibold">{customer.pieces} ks</span>
                              <Button
                                size="sm"
                                onClick={() => markAsPrepared(customer.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Hotovo
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <p className="font-bold text-lg">
                          SPOLU: {group.total_pieces} {group.total_pieces === 1 ? 'kus' : group.total_pieces < 5 ? 'kusy' : 'kusov'}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {preparedGroups.length > 0 && (
              <>
                <div className="border-t-4 border-gray-300 my-8"></div>

                <div>
                  <h2 className="text-xl font-bold mb-4 text-green-600 flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    PRIPRAVENÉ ({totalPrepared} {totalPrepared === 1 ? 'položka' : totalPrepared < 5 ? 'položky' : 'položiek'})
                  </h2>

                  <div className="space-y-4">
                    {preparedGroups.map((group, idx) => (
                      <Card key={idx} className="p-4 bg-green-50 shadow-sm border-green-200">
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-green-200">
                          <span className="text-2xl">✅</span>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{group.crop_name}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <span className="font-medium">{group.package_ml}</span>
                              <Badge variant={group.package_type === 'rPET' ? 'default' : group.package_type === 'EKO' ? 'secondary' : 'outline'}>
                                {group.package_type}
                              </Badge>
                              {group.has_label ? (
                                <Badge className="bg-green-600 text-white gap-1">
                                  <Tag className="h-3 w-3" />
                                  S ETIKETOU
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  BEZ ETIKETY
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {group.customers.map(customer => (
                            <div key={customer.id} className="flex items-center justify-between py-2 px-3 bg-white rounded">
                              <div className="flex items-center gap-3">
                                {customer.type === 'home' && <Home className="h-4 w-4 text-blue-500" />}
                                {customer.type === 'gastro' && <Utensils className="h-4 w-4 text-orange-500" />}
                                {customer.type === 'wholesale' && <Package className="h-4 w-4 text-purple-500" />}
                                <span className="font-medium">{customer.name}</span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-gray-600 font-semibold">{customer.pieces} ks</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAsUnprepared(customer.id)}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Vrátiť
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="font-bold text-lg text-green-700">
                            SPOLU: {group.total_pieces} {group.total_pieces === 1 ? 'kus' : group.total_pieces < 5 ? 'kusy' : 'kusov'} • ✅ PRIPRAVENÉ
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
