import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Check, RotateCcw, Home, Utensils, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useOrders, useCustomers, useCrops, useBlends } from '@/hooks/useSupabaseData';
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
  const { data: orders } = useOrders();
  const { data: customers } = useCustomers();
  const { data: crops } = useCrops();
  const { data: blends } = useBlends();
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'home' | 'gastro' | 'wholesale'>('all');
  const [packageTypeFilter, setPackageTypeFilter] = useState('rPET');
  const [packageSizeFilter, setPackageSizeFilter] = useState('all');
  const [cropFilter, setCropFilter] = useState('all');
  const [labelFilter, setLabelFilter] = useState<'all' | 'with' | 'without'>('all');
  const [preparedItems, setPreparedItems] = useState<Set<string>>(new Set());
  const [deliverySettings, setDeliverySettings] = useState<any>(null);

  useEffect(() => {
    loadDeliverySettings();
  }, []);

  const loadDeliverySettings = async () => {
    const { data } = await supabase
      .from('delivery_days_settings')
      .select('*')
      .single();

    setDeliverySettings(data);
  };

  const isDeliveryDay = (date: Date) => {
    if (!deliverySettings) return false;

    const dayOfWeek = getDay(date);

    switch(dayOfWeek) {
      case 0: return deliverySettings.sunday;
      case 1: return deliverySettings.monday;
      case 2: return deliverySettings.tuesday;
      case 3: return deliverySettings.wednesday;
      case 4: return deliverySettings.thursday;
      case 5: return deliverySettings.friday;
      case 6: return deliverySettings.saturday;
      default: return false;
    }
  };

  const hasOrdersOnDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return orders?.some(order => order.delivery_date === dateStr) || false;
  };

  const getOrderCountOnDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return orders?.filter(order => order.delivery_date === dateStr).length || 0;
  };

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const filteredOrders = useMemo(() => {
    let filtered = orders || [];

    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      filtered = filtered.filter(order => order.delivery_date === dateStr);
    }

    if (customerTypeFilter !== 'all') {
      filtered = filtered.filter(order => {
        const customer = customers.find(c => c.id === order.customer_id);
        return customer?.customer_type === customerTypeFilter;
      });
    }

    if (packageTypeFilter !== 'all') {
      filtered = filtered.filter(order => {
        if ((order as any).packaging_type === packageTypeFilter) return true;
        return false;
      });
    }

    if (packageSizeFilter !== 'all') {
      filtered = filtered.filter(order => {
        const size = order.packaging_size;
        return size === packageSizeFilter;
      });
    }

    if (cropFilter !== 'all') {
      filtered = filtered.filter(order => {
        return order.crop_id === cropFilter || order.blend_id === cropFilter;
      });
    }

    if (labelFilter === 'with') {
      filtered = filtered.filter(order => order.has_label === true);
    } else if (labelFilter === 'without') {
      filtered = filtered.filter(order => order.has_label === false);
    }

    filtered = filtered.filter(order =>
      order.status === 'pending' || order.status === 'confirmed' || order.status === 'ready'
    );

    return filtered;
  }, [orders, customers, selectedDate, customerTypeFilter, packageTypeFilter, packageSizeFilter, cropFilter, labelFilter]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, GroupedItem> = {};

    filteredOrders.forEach(order => {
      const customer = customers.find(c => c.id === order.customer_id);
      const customerName = customer?.customer_type === 'home'
        ? customer?.name
        : ((customer as any)?.company_name || customer?.name);

      const packageSize = order.packaging_size;
      if (!packageSize || !packageSize.includes('ml')) return;

      const crop = crops.find(c => c.id === order.crop_id);
      const blend = blends.find(b => b.id === order.blend_id);
      const cropName = crop?.name || blend?.name || 'Neznáme';

      const packageType = (order as any).packaging_type || 'rPET';
      const hasLabel = order.has_label !== false;

      const key = `${cropName}-${packageSize}-${hasLabel}`;

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

      const itemId = `${order.id}`;
      const pieces = Math.ceil(order.quantity || 1);

      groups[key].total_pieces += pieces;
      groups[key].customers.push({
        id: itemId,
        order_id: order.id,
        order_item_id: order.id,
        name: customerName || 'Neznámy',
        type: customer?.customer_type || 'home',
        pieces: pieces,
        prepared: preparedItems.has(itemId),
      });
    });

    return Object.values(groups).sort((a, b) => {
      if (a.has_label && !b.has_label) return -1;
      if (!a.has_label && b.has_label) return 1;
      return a.crop_name.localeCompare(b.crop_name);
    });
  }, [filteredOrders, customers, crops, blends, preparedItems]);

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

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setCustomerTypeFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              customerTypeFilter === 'all'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white border-gray-300 hover:border-green-600'
            }`}
          >
            <Check className="h-4 w-4" />
            Všetci
          </button>

          <button
            onClick={() => setCustomerTypeFilter('home')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              customerTypeFilter === 'home'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white border-gray-300 hover:border-green-600'
            }`}
          >
            <Home className="h-4 w-4" />
            Domáci
          </button>

          <button
            onClick={() => setCustomerTypeFilter('gastro')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              customerTypeFilter === 'gastro'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white border-gray-300 hover:border-green-600'
            }`}
          >
            <Utensils className="h-4 w-4" />
            Gastro
          </button>

          <button
            onClick={() => setCustomerTypeFilter('wholesale')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              customerTypeFilter === 'wholesale'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white border-gray-300 hover:border-green-600'
            }`}
          >
            <Package className="h-4 w-4" />
            VO
          </button>
        </div>

        <div className="bg-white border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold">
              {format(currentMonth, 'LLLL yyyy', { locale: sk }).toUpperCase()}
            </h3>

            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: (getDay(daysInMonth[0]) + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {daysInMonth.map(day => {
              const isDelivery = isDeliveryDay(day);
              const hasOrders = hasOrdersOnDate(day);
              const orderCount = getOrderCountOnDate(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              let bgColor = 'bg-white';
              if (isDelivery) {
                bgColor = 'bg-green-200';
              } else if (hasOrders) {
                bgColor = 'bg-yellow-300';
              }

              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    relative
                    w-10 h-10
                    rounded-full
                    flex items-center justify-center
                    transition-all
                    ${bgColor}
                    ${isToday ? 'ring-2 ring-green-600 ring-offset-2' : ''}
                    ${isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : ''}
                    ${hasOrders || isDelivery ? 'hover:opacity-80' : 'hover:bg-gray-100'}
                    ${!hasOrders && !isDelivery ? 'text-gray-400' : 'text-gray-900 font-medium'}
                  `}
                >
                  {format(day, 'd')}
                  {orderCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {orderCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-200 border" />
              <span>Rozvozový deň</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-yellow-300 border" />
              <span>Objednávky mimo rozvozu</span>
            </div>
          </div>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Select value={cropFilter} onValueChange={setCropFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Plodina / Mix" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všetky plodiny</SelectItem>
                  {crops.map(crop => (
                    <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
                  ))}
                  {blends.map(blend => (
                    <SelectItem key={blend.id} value={blend.id}>{blend.name} (Mix)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={packageSizeFilter} onValueChange={setPackageSizeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Všetky veľkosti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všetky veľkosti</SelectItem>
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
              <Select value={labelFilter} onValueChange={setLabelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Etiketa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všetko</SelectItem>
                  <SelectItem value="with">S etiketou</SelectItem>
                  <SelectItem value="without">Bez etikety</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={packageTypeFilter} onValueChange={setPackageTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Typ krabičky" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všetky typy</SelectItem>
                  <SelectItem value="PET">PET</SelectItem>
                  <SelectItem value="rPET">rPET</SelectItem>
                  <SelectItem value="EKO">EKO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {unpreparedGroups.length === 0 && preparedGroups.length === 0 ? (
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title="Žiadne objednávky na prípravu"
            description="Pre zvolený dátum a typ zákazníka nie sú naplánované žiadne objednávky."
          />
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
