import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Tag, CheckCircle2, Calendar, AlertCircle } from 'lucide-react';
import { format, startOfDay, getWeek, getYear, startOfWeek, endOfWeek } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useOrders, useCustomers, useCrops, useBlends, useOrderItems } from '@/hooks/useSupabaseData';

export default function PrepPackagingPage() {
  const { data: orders } = useOrders();
  const { data: customers } = useCustomers();
  const { data: crops } = useCrops();
  const { data: blends } = useBlends();
  const { data: orderItems } = useOrderItems();
  const { toast } = useToast();

  const [preparedOrders, setPreparedOrders] = useState<Set<string>>(new Set());
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('gastro');
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [packagingSizeFilter, setPackagingSizeFilter] = useState<string>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [packagingTypeFilter, setPackagingTypeFilter] = useState<string>('all');

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return '-';
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return '-';
    return (customer as any).company_name || customer.name;
  };

  const getCropName = (cropId: string | null) => {
    if (!cropId) return '-';
    const crop = crops.find(c => c.id === cropId);
    return crop?.name || '-';
  };

  const getBlendName = (blendId: string | null) => {
    if (!blendId) return '-';
    const blend = blends.find(b => b.id === blendId);
    return blend?.name || '-';
  };

  const getOrderItemsForOrder = (orderId: string) => {
    return orderItems.filter(item => item.order_id === orderId);
  };

  const availableWeeks = useMemo(() => {
    const weeksMap = new Map<string, { start: Date; end: Date }>();
    orders.forEach(order => {
      if (order.delivery_date && order.status !== 'delivered') {
        const date = new Date(order.delivery_date);
        const weekNum = getWeek(date, { weekStartsOn: 1, locale: sk });
        const year = getYear(date);
        const key = `${year}-W${weekNum.toString().padStart(2, '0')}`;
        if (!weeksMap.has(key)) {
          const weekStart = startOfWeek(date, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
          weeksMap.set(key, { start: weekStart, end: weekEnd });
        }
      }
    });
    return Array.from(weeksMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([key, range]) => ({
        key,
        weekNum: parseInt(key.split('-W')[1]),
        dateRange: `${format(range.start, 'd.M.')} - ${format(range.end, 'd.M.')}`
      }));
  }, [orders]);

  const upcomingOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      if (!order.delivery_date || order.status === 'delivered') return false;
      if (order.status !== 'pending' && order.status !== 'confirmed' && order.status !== 'ready') return false;

      const customer = customers.find(c => c.id === order.customer_id);
      const customerType = customer?.customer_type || 'home';

      if (customerTypeFilter !== 'all' && customerType !== customerTypeFilter) return false;

      return true;
    });

    if (weekFilter !== 'all') {
      const [weekYear, weekNum] = weekFilter.split('-W');
      const year = parseInt(weekYear);
      const week = parseInt(weekNum);

      filtered = filtered.filter(order => {
        const deliveryDate = new Date(order.delivery_date!);
        const orderWeek = getWeek(deliveryDate, { weekStartsOn: 1, locale: sk });
        const orderYear = getYear(deliveryDate);
        return orderYear === year && orderWeek === week;
      });
    }

    if (cropFilter !== 'all') {
      filtered = filtered.filter(order => {
        const items = getOrderItemsForOrder(order.id);
        if (items.length > 0) {
          return items.some(item => item.crop_id === cropFilter || item.blend_id === cropFilter);
        }
        return order.crop_id === cropFilter || order.blend_id === cropFilter;
      });
    }

    if (packagingSizeFilter !== 'all') {
      filtered = filtered.filter(order => {
        const items = getOrderItemsForOrder(order.id);
        if (items.length > 0) {
          return items.some(item => item.packaging_size === packagingSizeFilter);
        }
        return order.packaging_size === packagingSizeFilter;
      });
    }

    if (labelFilter !== 'all') {
      const hasLabel = labelFilter === 'with';
      filtered = filtered.filter(order => {
        const items = getOrderItemsForOrder(order.id);
        if (items.length > 0) {
          return items.some(item => item.has_label === hasLabel);
        }
        return order.has_label === hasLabel;
      });
    }

    if (packagingTypeFilter !== 'all') {
      filtered = filtered.filter(order => {
        return (order as any).packaging_type === packagingTypeFilter;
      });
    }

    return filtered.sort((a, b) => {
      const dateA = a.delivery_date ? new Date(a.delivery_date).getTime() : 0;
      const dateB = b.delivery_date ? new Date(b.delivery_date).getTime() : 0;
      return dateA - dateB;
    });
  }, [orders, customers, orderItems, weekFilter, customerTypeFilter, cropFilter, packagingSizeFilter, labelFilter, packagingTypeFilter]);

  const togglePrepared = (orderId: string) => {
    const newSet = new Set(preparedOrders);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setPreparedOrders(newSet);
  };

  const markAsPrepared = () => {
    if (preparedOrders.size === 0) {
      toast({
        title: 'Nie sú vybrané objednávky',
        description: 'Označte objednávky, ktoré sú pripravené.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Obaly pripravené',
      description: `${preparedOrders.size} obalov bolo pripravených.`,
    });
    setPreparedOrders(new Set());
  };

  const packagingSummary = useMemo(() => {
    const summary: Record<string, number> = {};

    upcomingOrders.forEach(order => {
      const packagingType = (order as any).packaging_type || 'PET';
      const quantity = Math.ceil(order.quantity || 1);
      summary[packagingType] = (summary[packagingType] || 0) + quantity;
    });

    return summary;
  }, [upcomingOrders]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Príprava obalov"
          description="Pripravte krabičky a etikety podľa zvoleného obdobia a typu zákazníka"
          icon={<Package className="h-6 w-6" />}
        />

        <Card className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select value={weekFilter} onValueChange={setWeekFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vybrať týždeň" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všetky týždne</SelectItem>
                    {availableWeeks.map(w => (
                      <SelectItem key={w.key} value={w.key}>
                        Týždeň {w.weekNum} ({w.dateRange})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všetci zákazníci</SelectItem>
                    <SelectItem value="home">Domáci</SelectItem>
                    <SelectItem value="gastro">Gastro</SelectItem>
                    <SelectItem value="wholesale">Veľkoobchod</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                <Select value={packagingSizeFilter} onValueChange={setPackagingSizeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Veľkosť obalu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všetky veľkosti</SelectItem>
                    <SelectItem value="50g">50g</SelectItem>
                    <SelectItem value="100g">100g</SelectItem>
                    <SelectItem value="200g">200g</SelectItem>
                    <SelectItem value="500g">500g</SelectItem>
                    <SelectItem value="750ml">750ml</SelectItem>
                    <SelectItem value="1000ml">1000ml</SelectItem>
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
                <Select value={packagingTypeFilter} onValueChange={setPackagingTypeFilter}>
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
          </div>
        </Card>

        {Object.keys(packagingSummary).length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Súhrn potrebných krabičiek</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(packagingSummary).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-base px-4 py-2">
                  {type}: <span className="font-bold ml-1">{count} ks</span>
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {preparedOrders.size > 0 && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-medium">{preparedOrders.size} obalov označených ako pripravených</span>
              </div>
              <Button onClick={markAsPrepared}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Potvrdiť prípravu
              </Button>
            </div>
          </Card>
        )}

        {upcomingOrders.length === 0 ? (
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title="Žiadne objednávky na prípravu"
            description="V zvolenom období a pre zvolený typ zákazníka nie sú naplánované žiadne objednávky."
          />
        ) : (
          <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Dátum dodania</TableHead>
                <TableHead>Zákazník</TableHead>
                <TableHead>Plodina / Mix</TableHead>
                <TableHead>Hmotnosť balenia</TableHead>
                <TableHead>Typ krabičky</TableHead>
                <TableHead className="text-right">Počet kusov</TableHead>
                <TableHead>Etiketa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingOrders.map((order) => {
                const isPrepared = preparedOrders.has(order.id);
                const customer = customers.find(c => c.id === order.customer_id);
                const customerType = customer?.customer_type || 'home';
                const items = getOrderItemsForOrder(order.id);
                const hasLabel = items.length > 0
                  ? items.some(item => item.has_label !== false)
                  : order.has_label !== false;

                const needsLabel = customerType === 'home' && hasLabel;
                const quantity = Math.ceil(order.quantity || 1);
                const packagingSize = order.packaging_size || '50g';
                const packagingType = (order as any).packaging_type || 'PET';

                const weightInGrams = packagingSize.replace(/[^\d]/g, '');

                const productName = items.length > 0
                  ? items.map(i => {
                      const name = i.crop_id ? getCropName(i.crop_id) : getBlendName(i.blend_id);
                      return `${Math.ceil(i.quantity)}x ${i.packaging_size || '50g'} ${name}`;
                    }).join(', ')
                  : order.crop_id
                    ? `${quantity}x ${packagingSize} ${getCropName(order.crop_id)}`
                    : `${quantity}x ${packagingSize} ${getBlendName(order.blend_id)}`;

                return (
                  <TableRow
                    key={order.id}
                    className={isPrepared ? 'bg-success/10' : ''}
                    onClick={() => togglePrepared(order.id)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isPrepared}
                        onCheckedChange={() => togglePrepared(order.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {order.delivery_date && format(new Date(order.delivery_date), 'd. MMM yyyy', { locale: sk })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{getCustomerName(order.customer_id)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{productName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{weightInGrams} g</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        packagingType === 'rPET' ? 'default' :
                        packagingType === 'EKO' ? 'secondary' :
                        'outline'
                      }>
                        {packagingType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-lg">{quantity}</span>
                    </TableCell>
                    <TableCell>
                      {needsLabel ? (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
                          <Tag className="h-3 w-3" />
                          S ETIKETOU
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          BEZ ETIKETY
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

            <div className="mt-4 p-3 bg-info/10 border border-info/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Inštrukcie:</strong> Zoznam ukazuje objednávky pre zvolené obdobie a typ zákazníka. Pripravte krabičky podľa typu, hmotnosti a počtu. Horný súhrn ukazuje celkový počet každého typu krabičky.
              </p>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
