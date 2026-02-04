import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, StatCard, EmptyState } from '@/components/ui/page-components';
import { useCrops, useCustomers, useOrders, usePlantingPlans, useTasks, useOrderItems } from '@/hooks/useSupabaseData';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Leaf,
  Users,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Sprout,
  Scissors,
  Package,
  History,
  ChevronDown,
  ChevronUp,
  Bell,
  Truck,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { format, isSameDay, isToday, startOfDay, addDays, differenceInDays, isBefore, isAfter } from 'date-fns';
import { sk, cs, enUS, de } from 'date-fns/locale';
import { LowStockAlerts, OrdersChart, ProductionOverview, PlantingStats } from '@/components/dashboard';
import SoakingReminders from '@/components/dashboard/SoakingReminders';

const locales = {
  sk,
  cz: cs,
  en: enUS,
  de,
};

const TASK_TYPE_LABELS: Record<string, string> = {
  sow: 'Výsev',
  water: 'Zalievanie',
  harvest: 'Zber',
  deliver: 'Doručenie',
  pack: 'Balenie',
};

const Dashboard = () => {
  const { data: crops } = useCrops();
  const { data: customers } = useCustomers();
  const { data: orders } = useOrders();
  const { data: plantingPlans } = usePlantingPlans();
  const { data: orderItems } = useOrderItems();
  const { data: tasks, update: updateTask, add: addTask, toggleComplete } = useTasks();
  const { t, language } = useLanguage();
  const [showHistory, setShowHistory] = useState(false);

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');

  // Calculate active customers (unique customers with active orders)
  const activeCustomerIds = new Set(
    activeOrders.map(o => o.customer_id).filter(Boolean)
  );
  const activeCustomersCount = activeCustomerIds.size;

  // Calculate trays in growth (sown + growing status)
  const traysInGrowth = plantingPlans
    .filter(p => p.status === 'sown' || p.status === 'growing')
    .reduce((sum, p) => sum + (p.tray_count || 0), 0);

  // Helper function to parse packaging size to grams
  const parsePackagingSize = (size: string): number => {
    if (!size) return 0;
    const match = size.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // Helper function to get yield per tray based on tray size
  const getYieldPerTray = (crop: any, traySize: string): number => {
    if (!crop || !traySize) return 80; // Default 80g

    const trayConfigs = crop.tray_configs || {};
    const config = trayConfigs[traySize];

    if (config) {
      return config.yield_grams || config.expected_yield || 80;
    }

    // Default yields by tray size
    const defaults: Record<string, number> = {
      XL: 80,
      L: 65,
      M: 48,
      S: 32
    };

    return defaults[traySize] || 80;
  };

  // Calculate harvest capacity for next 7 days
  const calculateHarvestCapacity = () => {
    console.log('📊 Počítam kapacitu zberu...');

    // Get next 7 days
    const today = new Date();
    const next7Days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      next7Days.push(date.toISOString().split('T')[0]);
    }

    // Capacity by harvest date and crop+package key
    const capacityByDate: Record<string, Record<string, {
      cropName: string;
      cropId: string;
      packageSize: number;
      capacity: number;
      ordered: number;
      free: number;
    }>> = {};

    next7Days.forEach(harvestDate => {
      capacityByDate[harvestDate] = {};

      // Find plantings with this harvest date that are active
      const plantingsForDate = plantingPlans.filter(p => {
        if (!p.expected_harvest_date) return false;
        const pHarvestDate = new Date(p.expected_harvest_date).toISOString().split('T')[0];
        return pHarvestDate === harvestDate &&
               (p.status === 'sown' || p.status === 'growing' || p.status === 'planned');
      });

      console.log(`📅 ${harvestDate}: ${plantingsForDate.length} výsevov`);

      // Calculate capacity for each planting
      plantingsForDate.forEach(p => {
        const crop = crops.find(c => c.id === p.crop_id);
        if (!crop) return;

        const trayCount = p.tray_count || 0;
        const traySize = p.tray_size || 'XL';
        const yieldPerTray = getYieldPerTray(crop, traySize);
        const totalCapacity = trayCount * yieldPerTray;

        // Store capacity by crop (we'll add package sizes later when processing orders)
        const cropKey = p.crop_id || '';
        if (!capacityByDate[harvestDate][cropKey]) {
          capacityByDate[harvestDate][cropKey] = {
            cropName: crop.name || 'Neznáma plodina',
            cropId: cropKey,
            packageSize: 0, // Will be set per package size variant
            capacity: totalCapacity,
            ordered: 0,
            free: totalCapacity
          };
        } else {
          capacityByDate[harvestDate][cropKey].capacity += totalCapacity;
          capacityByDate[harvestDate][cropKey].free += totalCapacity;
        }
      });

      // Find orders that will be delivered on this date or next day
      // (harvest can be day before delivery)
      const deliveryDate1 = harvestDate;
      const deliveryDate2 = new Date(harvestDate);
      deliveryDate2.setDate(deliveryDate2.getDate() + 1);
      const deliveryDate2Str = deliveryDate2.toISOString().split('T')[0];

      const ordersForDate = orders.filter(o => {
        if (o.status === 'delivered' || o.status === 'cancelled') return false;
        const deliveryDate = (o.delivery_date || '').split('T')[0];
        return deliveryDate === deliveryDate1 || deliveryDate === deliveryDate2Str;
      });

      console.log(`📦 ${harvestDate}: ${ordersForDate.length} objednávok`);

      // First pass: collect all package sizes for each crop
      const packageSizesByCrop: Record<string, Set<number>> = {};
      ordersForDate.forEach(order => {
        const items = orderItems.filter(item => item.order_id === order.id);

        items.forEach(item => {
          if (!item.crop_id) return;
          const packageSize = parsePackagingSize(item.packaging_size || '50g');
          if (!packageSizesByCrop[item.crop_id]) {
            packageSizesByCrop[item.crop_id] = new Set();
          }
          packageSizesByCrop[item.crop_id].add(packageSize);
        });
      });

      // Create package size variants for crops that have capacity
      const newCapacityEntries: Record<string, typeof capacityByDate[string][string]> = {};
      Object.keys(capacityByDate[harvestDate]).forEach(cropId => {
        const baseEntry = capacityByDate[harvestDate][cropId];
        const packageSizes = packageSizesByCrop[cropId];

        if (packageSizes && packageSizes.size > 0) {
          // Create variant for each package size
          packageSizes.forEach(packageSize => {
            const key = `${cropId}_${packageSize}`;
            newCapacityEntries[key] = {
              ...baseEntry,
              packageSize: packageSize,
              ordered: 0
            };
          });
          // Remove the base entry
          delete capacityByDate[harvestDate][cropId];
        }
      });

      // Add new entries
      Object.assign(capacityByDate[harvestDate], newCapacityEntries);

      // Second pass: calculate ordered amounts
      ordersForDate.forEach(order => {
        const items = orderItems.filter(item => item.order_id === order.id);

        items.forEach(item => {
          if (!item.crop_id) return;

          const packageSize = parsePackagingSize(item.packaging_size || '50g');
          const quantity = item.quantity || 0;
          const totalGrams = quantity * packageSize;

          const key = `${item.crop_id}_${packageSize}`;

          if (capacityByDate[harvestDate][key]) {
            capacityByDate[harvestDate][key].ordered += totalGrams;
          }
        });
      });

      // Calculate free capacity
      Object.values(capacityByDate[harvestDate]).forEach(crop => {
        crop.free = crop.capacity - crop.ordered;
      });
    });

    console.log('✅ Kapacita vypočítaná:', capacityByDate);
    return capacityByDate;
  };

  // Generate daily tasks from planting plans and orders
  const dailyTasks = useMemo(() => {
    const today = startOfDay(new Date());
    const generatedTasks: Array<{
      id: string;
      type: 'sow' | 'harvest' | 'deliver' | 'pack';
      title: string;
      subtitle?: string;
      cropId?: string | null;
      orderId?: string | null;
      planId?: string;
      completed: boolean;
    }> = [];

    // Tasks from planting plans - sowing today
    plantingPlans
      .filter(plan => isSameDay(new Date(plan.sow_date), today) && plan.status === 'planned')
      .forEach(plan => {
        const crop = crops.find(c => c.id === plan.crop_id);
        generatedTasks.push({
          id: `sow-${plan.id}`,
          type: 'sow',
          title: `Zasiať ${crop?.name || 'plodinu'}`,
          subtitle: `${plan.tray_count || 1} ${(plan.tray_count || 1) === 1 ? 'tác' : (plan.tray_count || 1) < 5 ? 'tácy' : 'tácov'}`,
          cropId: plan.crop_id,
          planId: plan.id,
          completed: plan.status !== 'planned',
        });
      });

    // Tasks from planting plans - harvesting today
    plantingPlans
      .filter(plan => plan.expected_harvest_date && isSameDay(new Date(plan.expected_harvest_date), today) && plan.status !== 'harvested')
      .forEach(plan => {
        const crop = crops.find(c => c.id === plan.crop_id);
        generatedTasks.push({
          id: `harvest-${plan.id}`,
          type: 'harvest',
          title: `Zozbierať ${crop?.name || 'plodinu'}`,
          subtitle: `${plan.tray_count || 1} ${(plan.tray_count || 1) === 1 ? 'tác' : (plan.tray_count || 1) < 5 ? 'tácy' : 'tácov'}`,
          cropId: plan.crop_id,
          planId: plan.id,
          completed: plan.status === 'harvested',
        });
      });

    // Tasks from orders - delivery today
    orders
      .filter(order => order.delivery_date && isSameDay(new Date(order.delivery_date), today) && order.status !== 'delivered' && order.status !== 'cancelled')
      .forEach(order => {
        const customer = customers.find(c => c.id === order.customer_id);
        generatedTasks.push({
          id: `deliver-${order.id}`,
          type: 'deliver',
          title: `Doručiť objednávku`,
          subtitle: `${customer?.name || 'Zákazník'} - ${order.quantity} ${order.unit || 'g'}`,
          orderId: order.id,
          completed: order.status === 'delivered',
        });
      });

    return generatedTasks;
  }, [plantingPlans, orders, crops, customers]);

  const pendingTasks = dailyTasks.filter(t => !t.completed);
  const completedToday = dailyTasks.filter(t => t.completed);

  const dateLocale = locales[language as keyof typeof locales] || locales.sk;

  // Debug logs
  console.log('📊 Dashboard Stats:');
  console.log(`- Total crops: ${crops.length}`);
  console.log(`- Active orders: ${activeOrders.length}`);
  console.log(`- Active customers: ${activeCustomersCount}`);
  console.log(`- Trays in growth: ${traysInGrowth}`);

  // Upcoming notifications - next 3 days
  const upcomingNotifications = useMemo(() => {
    const today = startOfDay(new Date());
    const in3Days = addDays(today, 3);
    const notifications: Array<{
      id: string;
      type: 'harvest' | 'delivery';
      title: string;
      daysUntil: number;
      date: Date;
      urgent: boolean;
    }> = [];

    // Upcoming harvests
    plantingPlans
      .filter(plan => {
        if (!plan.expected_harvest_date) return false;
        const harvestDate = startOfDay(new Date(plan.expected_harvest_date));
        return plan.status !== 'harvested' && 
               isAfter(harvestDate, today) && 
               isBefore(harvestDate, in3Days);
      })
      .forEach(plan => {
        const crop = crops.find(c => c.id === plan.crop_id);
        const harvestDate = new Date(plan.expected_harvest_date!);
        const daysUntil = differenceInDays(startOfDay(harvestDate), today);
        notifications.push({
          id: `harvest-notif-${plan.id}`,
          type: 'harvest',
          title: `${crop?.name || 'Plodina'} - ${plan.tray_count || 1} tácov`,
          daysUntil,
          date: harvestDate,
          urgent: daysUntil <= 1,
        });
      });

    // Upcoming deliveries
    orders
      .filter(order => {
        if (!order.delivery_date) return false;
        const deliveryDate = startOfDay(new Date(order.delivery_date));
        return order.status !== 'delivered' && 
               order.status !== 'cancelled' &&
               isAfter(deliveryDate, today) && 
               isBefore(deliveryDate, in3Days);
      })
      .forEach(order => {
        const customer = customers.find(c => c.id === order.customer_id);
        const deliveryDate = new Date(order.delivery_date!);
        const daysUntil = differenceInDays(startOfDay(deliveryDate), today);
        notifications.push({
          id: `delivery-notif-${order.id}`,
          type: 'delivery',
          title: customer?.name || 'Zákazník',
          daysUntil,
          date: deliveryDate,
          urgent: daysUntil <= 1,
        });
      });

    return notifications.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [plantingPlans, orders, crops, customers]);

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'sow': return <Sprout className="h-4 w-4" />;
      case 'harvest': return <Scissors className="h-4 w-4" />;
      case 'deliver': return <ShoppingCart className="h-4 w-4" />;
      case 'pack': return <Package className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTaskColor = (type: string) => {
    switch (type) {
      case 'sow': return 'bg-success/20 text-success';
      case 'harvest': return 'bg-warning/20 text-warning';
      case 'deliver': return 'bg-primary/20 text-primary';
      case 'pack': return 'bg-info/20 text-info';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title={t('nav.dashboard')}
        description={`${t('dashboard.welcome')} ${format(new Date(), 'EEEE, d. MMMM yyyy', { locale: dateLocale })}`}
      />

      {/* Soaking Reminders */}
      <div className="mb-6">
        <SoakingReminders />
      </div>

      {/* Upcoming Notifications */}
      {upcomingNotifications.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-5 w-5 text-warning" />
            <h3 className="font-semibold text-foreground">Blížiace sa termíny</h3>
            <Badge variant="secondary" className="ml-1">{upcomingNotifications.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingNotifications.slice(0, 6).map((notif) => (
              <Alert 
                key={notif.id} 
                variant={notif.urgent ? "destructive" : "default"}
                className={notif.urgent ? "border-destructive/50 bg-destructive/10" : "border-warning/50 bg-warning/10"}
              >
                <div className="flex items-start gap-3">
                  {notif.type === 'harvest' ? (
                    <Scissors className={`h-5 w-5 ${notif.urgent ? 'text-destructive' : 'text-warning'}`} />
                  ) : (
                    <Truck className={`h-5 w-5 ${notif.urgent ? 'text-destructive' : 'text-warning'}`} />
                  )}
                  <div className="flex-1">
                    <AlertTitle className="text-sm font-medium">
                      {notif.type === 'harvest' ? 'Zber' : 'Doručenie'} - {notif.daysUntil === 1 ? 'zajtra' : `o ${notif.daysUntil} dni`}
                    </AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                      {notif.title} • {format(notif.date, 'd.M.yyyy', { locale: dateLocale })}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Alerts */}
      <LowStockAlerts />

      {/* Charts Section */}
      <div className="mt-6 mb-6">
        <OrdersChart />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title={t('dashboard.totalCrops')}
          value={crops.length}
          icon={<Leaf className="h-6 w-6" />}
        />
        <StatCard
          title={t('dashboard.activeOrders')}
          value={activeOrders.length}
          icon={<ShoppingCart className="h-6 w-6" />}
        />
        <StatCard
          title={t('dashboard.customers')}
          value={activeCustomersCount}
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          title={t('dashboard.traysGrowing')}
          value={traysInGrowth}
          icon={<Sprout className="h-6 w-6" />}
        />
      </div>

      {/* Harvest Capacity Widget */}
      <Card className="p-4 md:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold">Kapacita zberu - Tento týždeň</h2>
        </div>

        {(() => {
          const capacityData = calculateHarvestCapacity();
          const hasData = Object.values(capacityData).some(dateData =>
            Object.keys(dateData).length > 0
          );

          if (!hasData) {
            return (
              <p className="text-sm text-muted-foreground">
                Žiadne vysadené výsevy na najbližších 7 dní.
              </p>
            );
          }

          return (
            <div className="space-y-6">
              {Object.entries(capacityData).map(([date, crops]) => {
                if (Object.keys(crops).length === 0) return null;

                const dateObj = new Date(date);
                const dayName = dateObj.toLocaleDateString('sk-SK', { weekday: 'short' });
                const dateFormatted = dateObj.toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' });

                return (
                  <div key={date} className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-medium text-foreground mb-3">
                      {dayName} {dateFormatted}
                    </h3>

                    <div className="space-y-3">
                      {Object.values(crops).map((crop, idx) => {
                        const percentage = crop.capacity > 0
                          ? (crop.ordered / crop.capacity) * 100
                          : 0;

                        let barColor = 'bg-green-500';
                        let statusColor = 'text-green-600';
                        let statusIcon = '🟢';

                        if (percentage >= 100) {
                          barColor = 'bg-red-500';
                          statusColor = 'text-red-600';
                          statusIcon = '🔴';
                        } else if (percentage >= 80) {
                          barColor = 'bg-amber-500';
                          statusColor = 'text-amber-600';
                          statusIcon = '🟡';
                        }

                        return (
                          <div key={idx} className="bg-muted/30 rounded p-3">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-medium text-sm">
                                {crop.cropName} - {crop.packageSize}g
                              </p>
                              <span className={`text-xs font-semibold ${statusColor}`}>
                                {percentage.toFixed(0)}%
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-muted rounded-full h-2 mb-2">
                              <div
                                className={`${barColor} h-2 rounded-full transition-all`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>

                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Kapacita: <strong>{crop.capacity}g</strong></span>
                              <span>Objednané: <strong>{crop.ordered}g</strong></span>
                            </div>

                            {crop.free > 0 ? (
                              <p className="text-xs text-green-600 mt-1 font-medium">
                                {statusIcon} Voľné: {crop.free}g (cca {Math.floor(crop.free / crop.packageSize)} balení)
                              </p>
                            ) : crop.free === 0 ? (
                              <p className="text-xs text-amber-600 mt-1 font-medium">
                                {statusIcon} Plná kapacita - nedávaj viac objednávok!
                              </p>
                            ) : (
                              <p className="text-xs text-red-600 mt-1 font-semibold">
                                ⚠️ PREKROČENÁ KAPACITA o {Math.abs(crop.free)}g!
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Card>

      {/* Planting Statistics */}
      <div className="mb-6">
        <PlantingStats />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Tasks with Checkboxes */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Dnešné úlohy</h2>
                <p className="text-sm text-muted-foreground">
                  {pendingTasks.length} zostáva, {completedToday.length} hotových
                </p>
              </div>
            </div>
            <Link to="/harvest">
              <Button variant="ghost" size="sm">Zber úrody</Button>
            </Link>
          </div>

          {dailyTasks.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Na dnes nie sú naplánované žiadne úlohy.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Pending tasks */}
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3 transition-all hover:bg-secondary/50"
                >
                  <Checkbox checked={task.completed} disabled />
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${getTaskColor(task.type)}`}>
                    {getTaskIcon(task.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{task.subtitle}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                    {TASK_TYPE_LABELS[task.type]}
                  </Badge>
                </div>
              ))}

              {/* Completed tasks today */}
              {completedToday.length > 0 && (
                <div className="pt-3 border-t border-border mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Dokončené dnes</p>
                  {completedToday.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg p-3 opacity-60"
                    >
                      <Checkbox checked disabled />
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${getTaskColor(task.type)}`}>
                        {getTaskIcon(task.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-through truncate">{task.title}</p>
                        {task.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{task.subtitle}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Production Overview */}
        <ProductionOverview />
      </div>
    </MainLayout>
  );
};

export default Dashboard;
