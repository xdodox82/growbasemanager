import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlantingPlans, useOrders, useCrops, useCustomers } from '@/hooks/useSupabaseData';
import { 
  Sprout, 
  ShoppingCart, 
  Calendar,
  ChevronRight,
  Package,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { addDays, isSameDay, startOfWeek, endOfWeek, isWithinInterval, format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export function MobileDashboard() {
  const { data: plantingPlans } = usePlantingPlans();
  const { data: orders } = useOrders();
  const { data: crops } = useCrops();
  const { data: customers } = useCustomers();

  // Today's tasks
  const today = new Date();
  const tomorrow = addDays(today, 1);

  // Harvests for today/tomorrow
  const todayHarvests = plantingPlans.filter(p => 
    p.expected_harvest_date && isSameDay(new Date(p.expected_harvest_date), today) && p.status !== 'harvested'
  );
  const tomorrowHarvests = plantingPlans.filter(p => 
    p.expected_harvest_date && isSameDay(new Date(p.expected_harvest_date), tomorrow) && p.status !== 'harvested'
  );

  // Deliveries for today/tomorrow
  const todayDeliveries = orders.filter(o => 
    o.delivery_date && isSameDay(new Date(o.delivery_date), today) && 
    o.status !== 'delivered' && o.status !== 'cancelled'
  );
  const tomorrowDeliveries = orders.filter(o => 
    o.delivery_date && isSameDay(new Date(o.delivery_date), tomorrow) && 
    o.status !== 'delivered' && o.status !== 'cancelled'
  );

  // Active growing
  const growing = plantingPlans.filter(p => 
    p.status === 'growing' || p.status === 'sown' || p.status === 'planned'
  );

  // Pending orders
  const pendingOrders = orders.filter(o => 
    o.status !== 'delivered' && o.status !== 'cancelled'
  );

  const getCropName = (cropId: string | null) => {
    if (!cropId) return 'Neznáma';
    return crops.find(c => c.id === cropId)?.name || 'Neznáma';
  };

  const getCropColor = (cropId: string | null) => {
    if (!cropId) return '#888';
    return crops.find(c => c.id === cropId)?.color || '#888';
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return 'Neznámy';
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Neznámy';
    return customer.company_name || customer.name || 'Neznámy';
  };

  // Weekly tray statistics
  const weeklyStats = useMemo(() => {
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const thisWeekPlans = plantingPlans.filter(plan => {
      const sowDate = new Date(plan.sow_date);
      return isWithinInterval(sowDate, { start: thisWeekStart, end: thisWeekEnd });
    });

    return {
      trays: thisWeekPlans.reduce((sum, p) => sum + (p.tray_count || 1), 0),
      dateRange: `${format(thisWeekStart, 'd.M.', { locale: sk })} - ${format(thisWeekEnd, 'd.M.', { locale: sk })}`,
    };
  }, [plantingPlans, today]);

  // Expected yield by crop
  const yieldByCrop = useMemo(() => {
    const activePlans = plantingPlans.filter(p => 
      p.status !== 'harvested' && p.status !== 'cancelled'
    );

    const yieldMap = new Map<string, { name: string; color: string; yield: number }>();

    activePlans.forEach(plan => {
      if (plan.is_combined && plan.crop_components && Array.isArray(plan.crop_components)) {
        plan.crop_components.forEach((component: { crop_id: string; percentage: number }) => {
          const crop = crops.find(c => c.id === component.crop_id);
          if (!crop) return;
          const proportionalYield = (crop.expected_yield || 0) * (plan.tray_count || 1) * (component.percentage / 100);
          const existing = yieldMap.get(component.crop_id);
          if (existing) {
            existing.yield += proportionalYield;
          } else {
            yieldMap.set(component.crop_id, {
              name: crop.name,
              color: crop.color || '#22c55e',
              yield: proportionalYield,
            });
          }
        });
      } else if (plan.crop_id) {
        const crop = crops.find(c => c.id === plan.crop_id);
        if (!crop) return;
        const expectedYield = (crop.expected_yield || 0) * (plan.tray_count || 1);
        const existing = yieldMap.get(plan.crop_id);
        if (existing) {
          existing.yield += expectedYield;
        } else {
          yieldMap.set(plan.crop_id, {
            name: crop.name,
            color: crop.color || '#22c55e',
            yield: expectedYield,
          });
        }
      }
    });

    return Array.from(yieldMap.values())
      .sort((a, b) => b.yield - a.yield)
      .slice(0, 4);
  }, [plantingPlans, crops]);

  return (
    <div className="space-y-4 pb-24">
      {/* Weekly Stats */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Tento týždeň</h3>
          <span className="text-xs text-muted-foreground ml-auto">{weeklyStats.dateRange}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-success/10 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sprout className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Tácok</span>
            </div>
            <p className="text-xl font-bold">{weeklyStats.trays}</p>
          </div>
          <div className="rounded-lg bg-info/10 p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-info" />
              <span className="text-xs text-muted-foreground">Úroda</span>
            </div>
            <p className="text-xl font-bold">{yieldByCrop.reduce((s, c) => s + c.yield, 0).toFixed(0)}g</p>
          </div>
        </div>
        {yieldByCrop.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            {yieldByCrop.map((crop, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: crop.color }} />
                <span className="flex-1 truncate">{crop.name}</span>
                <span className="text-muted-foreground">{crop.yield.toFixed(0)}g</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 touch-target">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Sprout className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{growing.length}</p>
              <p className="text-xs text-muted-foreground">Rastie</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 touch-target">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/20 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingOrders.length}</p>
              <p className="text-xs text-muted-foreground">Objednávok</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Today's Tasks */}
      {(todayHarvests.length > 0 || todayDeliveries.length > 0) && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Dnes</h3>
          </div>

          <div className="space-y-2">
            {todayHarvests.map(plan => (
              <Link 
                key={plan.id} 
                to="/harvest"
                className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30 touch-target"
              >
                <Sprout className="h-5 w-5 text-warning" />
                <div className="flex-1">
                  <p className="font-medium">{getCropName(plan.crop_id)}</p>
                  <p className="text-xs text-muted-foreground">{plan.tray_count || 1} tácov na zber</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}

            {todayDeliveries.map(order => (
              <Link 
                key={order.id} 
                to="/delivery"
                className="flex items-center gap-3 p-3 rounded-lg bg-info/10 border border-info/30 touch-target"
              >
                <Package className="h-5 w-5 text-info" />
                <div className="flex-1">
                  <p className="font-medium">{getCustomerName(order.customer_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.quantity} {order.unit} na dodanie
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Tomorrow's Tasks */}
      {(tomorrowHarvests.length > 0 || tomorrowDeliveries.length > 0) && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Zajtra</h3>
          </div>

          <div className="space-y-2">
            {tomorrowHarvests.map(plan => (
              <div 
                key={plan.id} 
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 touch-target"
              >
                <div 
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: getCropColor(plan.crop_id) }}
                />
                <div className="flex-1">
                  <p className="font-medium">{getCropName(plan.crop_id)}</p>
                  <p className="text-xs text-muted-foreground">{plan.tray_count || 1} tácov</p>
                </div>
                <Badge variant="outline" className="text-xs">Zber</Badge>
              </div>
            ))}

            {tomorrowDeliveries.map(order => (
              <div 
                key={order.id} 
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 touch-target"
              >
                <Package className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{getCustomerName(order.customer_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.quantity} {order.unit}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">Dodanie</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Growing Overview */}
      {growing.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-success" />
              <h3 className="font-semibold">Čo rastie</h3>
            </div>
            <Link to="/planting">
              <Button variant="ghost" size="sm" className="gap-1">
                Všetky
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {growing.slice(0, 5).map(plan => {
              const daysToHarvest = plan.expected_harvest_date 
                ? Math.ceil((new Date(plan.expected_harvest_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 0;
              return (
                <div 
                  key={plan.id} 
                  className="flex items-center gap-3 p-2 rounded-lg"
                >
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${getCropColor(plan.crop_id)}20` }}
                  >
                    <Sprout className="h-4 w-4" style={{ color: getCropColor(plan.crop_id) }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{getCropName(plan.crop_id)}</p>
                    <p className="text-xs text-muted-foreground">{plan.tray_count || 1} tácov</p>
                  </div>
                  <Badge 
                    variant={daysToHarvest <= 2 ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {daysToHarvest}d
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {growing.length === 0 && todayHarvests.length === 0 && todayDeliveries.length === 0 && (
        <Card className="p-8 text-center">
          <Sprout className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Žiadne aktívne úlohy</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Začnite pridaním nového výsevu
          </p>
          <Link to="/planting">
            <Button className="gap-2">
              <Sprout className="h-4 w-4" />
              Nový výsev
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
