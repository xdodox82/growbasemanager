import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerTypeFilter } from '@/components/filters/CustomerTypeFilter';
import { CategoryFilter } from '@/components/orders/CategoryFilter';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Scissors,
  Package,
  CheckCircle2,
  Home,
  Utensils,
  Store,
  Calendar,
  Leaf,
  Sprout,
  Flower,
  Palette
} from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
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
}

interface Order {
  id: string;
  customer_id: string;
  delivery_date: string;
  actual_harvest_date?: string;
  status: string;
  customer?: Customer;
  order_items?: OrderItem[];
}

interface ProductGroup {
  productId: string;
  productName: string;
  productType: 'crop' | 'blend';
  category?: string;
  orders: Order[];
}

export default function HarvestPackingPage() {
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [blends, setBlends] = useState<Blend[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedHarvestDate, setSelectedHarvestDate] = useState<string>('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [completedProducts, setCompletedProducts] = useState<Set<string>>(new Set());

  const harvestDates = useMemo(() => {
    const dates: string[] = [];
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });

    for (let week = 0; week < 4; week++) {
      const tuesday = addDays(startDate, week * 7 + 1);
      const thursday = addDays(startDate, week * 7 + 3);
      dates.push(format(tuesday, 'yyyy-MM-dd'));
      dates.push(format(thursday, 'yyyy-MM-dd'));
    }

    return dates;
  }, []);

  useEffect(() => {
    if (harvestDates.length > 0) {
      setSelectedHarvestDate(harvestDates[0]);
    }
  }, [harvestDates]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [ordersRes, customersRes, cropsRes, blendsRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            *,
            customer:customers(id, name, customer_type),
            order_items(*)
          `)
          .order('delivery_date', { ascending: true }),
        supabase.from('customers').select('*'),
        supabase.from('crops').select('*'),
        supabase.from('blends').select('*')
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as any);
      if (customersRes.data) setCustomers(customersRes.data);
      if (cropsRes.data) setCrops(cropsRes.data);
      if (blendsRes.data) setBlends(blendsRes.data);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať dáta',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCrops = useMemo(() => {
    if (categoryFilter === 'all') return crops;
    if (categoryFilter === 'mix') return [];
    return crops.filter(c => c.category === categoryFilter);
  }, [crops, categoryFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (order.actual_harvest_date !== selectedHarvestDate) return false;

      if (customerTypeFilter !== 'all' && order.customer?.customer_type !== customerTypeFilter) {
        return false;
      }

      if (customerFilter !== 'all' && order.customer_id !== customerFilter) {
        return false;
      }

      return true;
    });
  }, [orders, selectedHarvestDate, customerTypeFilter, customerFilter]);

  const groupedByProduct = useMemo(() => {
    const groups: Record<string, ProductGroup> = {};

    filteredOrders.forEach(order => {
      order.order_items?.forEach(item => {
        const productId = item.crop_id || item.blend_id || 'unknown';
        const productType = item.crop_id ? 'crop' : 'blend';
        const crop = crops.find(c => c.id === item.crop_id);
        const blend = blends.find(b => b.id === item.blend_id);
        const productName = crop?.name || blend?.name || item.crop_name || 'Neznámy produkt';
        const category = crop?.category;

        if (categoryFilter !== 'all') {
          if (categoryFilter === 'mix' && productType !== 'blend') return;
          if (categoryFilter !== 'mix' && category !== categoryFilter) return;
        }

        if (cropFilter !== 'all' && productId !== cropFilter) return;

        if (!groups[productId]) {
          groups[productId] = {
            productId,
            productName,
            productType,
            category,
            orders: []
          };
        }

        groups[productId].orders.push(order);
      });
    });

    return Object.values(groups);
  }, [filteredOrders, crops, blends, categoryFilter, cropFilter]);

  const singleProducts = groupedByProduct.filter(g => g.productType === 'crop');
  const mixProducts = groupedByProduct.filter(g => g.productType === 'blend');

  const allSingleComplete = singleProducts.every(p => completedProducts.has(p.productId));

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
      title: 'Označené',
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

  const sortOrdersByCustomerType = (orders: Order[]) => {
    const typeOrder = { gastro: 1, wholesale: 2, home: 3 };
    return [...orders].sort((a, b) => {
      const aType = a.customer?.customer_type || 'home';
      const bType = b.customer?.customer_type || 'home';
      return (typeOrder[aType as keyof typeof typeOrder] || 99) - (typeOrder[bType as keyof typeof typeOrder] || 99);
    });
  };

  const groupByDeliveryDate = (orders: Order[]) => {
    const groups: Record<string, Order[]> = {};
    orders.forEach(order => {
      const date = order.delivery_date || 'unknown';
      if (!groups[date]) groups[date] = [];
      groups[date].push(order);
    });
    return groups;
  };

  const renderProductCard = (group: ProductGroup, section: 'single' | 'mix') => {
    const isCompleted = completedProducts.has(group.productId);
    const isDisabled = section === 'mix' && !allSingleComplete;

    const ordersByDeliveryDate = groupByDeliveryDate(group.orders);

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
          {Object.entries(ordersByDeliveryDate).map(([deliveryDate, dateOrders]) => (
            <div key={deliveryDate} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  Doručenie: {format(new Date(deliveryDate), 'EEEE d.M.', { locale: sk })}
                </span>
              </div>
              <div className="space-y-2">
                {sortOrdersByCustomerType(dateOrders).map(order => {
                  const items = order.order_items?.filter(
                    item => (item.crop_id || item.blend_id) === group.productId
                  );

                  return (
                    <div key={order.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getCustomerTypeIcon(order.customer?.customer_type || '')}
                        <div>
                          <p className="font-medium text-sm">{order.customer?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getCustomerTypeLabel(order.customer?.customer_type || '')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {items?.map((item, idx) => (
                          <div key={idx} className="text-sm">
                            <Badge variant="secondary">
                              {item.quantity}× {item.package_ml}ml
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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
        description="Organizácia zberu a balenia produktov podľa dňa zberu"
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
                <label className="text-sm font-medium">Deň zberu</label>
                <Select value={selectedHarvestDate} onValueChange={setSelectedHarvestDate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {harvestDates.map(date => (
                      <SelectItem key={date} value={date}>
                        {format(new Date(date), 'EEEE d.M.yyyy', { locale: sk })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <CategoryFilter
                value={categoryFilter}
                onChange={(value) => {
                  setCategoryFilter(value);
                  setCropFilter('all');
                }}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Plodina</label>
                <Select value={cropFilter} onValueChange={setCropFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Všetky plodiny" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všetky plodiny</SelectItem>
                    {categoryFilter === 'mix'
                      ? blends.map(blend => (
                          <SelectItem key={blend.id} value={blend.id}>
                            {blend.name}
                          </SelectItem>
                        ))
                      : filteredCrops.map(crop => (
                          <SelectItem key={crop.id} value={crop.id}>
                            {crop.name}
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
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
                Žiadne objednávky pre vybraný deň zberu
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
