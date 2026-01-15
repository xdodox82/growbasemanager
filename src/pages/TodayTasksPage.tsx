import { useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-components';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlantingPlans, useOrders, useCrops, useBlends, useCustomers } from '@/hooks/useSupabaseData';
import { Sprout, Sun, Scissors, Package, Truck, Leaf, Weight, Droplets } from 'lucide-react';
import { format, isToday, parseISO, addDays, isSameDay } from 'date-fns';
import { sk } from 'date-fns/locale';

export default function TodayTasksPage() {
  const { data: plantingPlans } = usePlantingPlans();
  const { data: orders } = useOrders();
  const { data: crops } = useCrops();
  const { data: blends } = useBlends();
  const { data: customers } = useCustomers();

  const today = new Date();

  const getCropName = (cropId: string | null) => {
    if (!cropId) return 'Neznáma plodina';
    return crops.find(c => c.id === cropId)?.name || 'Neznáma plodina';
  };

  const getBlendName = (blendId: string | null) => {
    if (!blendId) return 'Neznáma zmes';
    return blends.find(b => b.id === blendId)?.name || 'Neznáma zmes';
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return 'Neznámy zákazník';
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Neznámy zákazník';
    return customer.company_name || customer.name || 'Neznámy zákazník';
  };

  const getCropColor = (cropId: string | null) => {
    if (!cropId) return '#22c55e';
    return crops.find(c => c.id === cropId)?.color || '#22c55e';
  };

  // Tasks to sow today
  const sowingTasks = useMemo(() => {
    return plantingPlans.filter(plan => {
      if (!plan.sow_date || plan.status !== 'planned') return false;
      return isToday(parseISO(plan.sow_date));
    });
  }, [plantingPlans]);

  // Tasks to move to light today (based on sow_date + days_in_darkness)
  const lightTasks = useMemo(() => {
    return plantingPlans.filter(plan => {
      if (!plan.sow_date || plan.status !== 'sown') return false;
      const crop = crops.find(c => c.id === plan.crop_id);
      if (!crop) return false;
      const daysInDarkness = crop.days_in_darkness || 2;
      const moveToLightDate = addDays(parseISO(plan.sow_date), daysInDarkness);
      return isSameDay(moveToLightDate, today);
    });
  }, [plantingPlans, crops]);

  // Tasks to remove weight today (based on sow_date + days_to_germination)
  const weightRemovalTasks = useMemo(() => {
    return plantingPlans.filter(plan => {
      if (!plan.sow_date) return false;
      if (plan.status !== 'sown' && plan.status !== 'germinating') return false;
      const crop = crops.find(c => c.id === plan.crop_id);
      if (!crop || !crop.needs_weight) return false;
      const daysToGermination = crop.days_to_germination || 2;
      const weightRemovalDate = addDays(parseISO(plan.sow_date), daysToGermination);
      return isSameDay(weightRemovalDate, today);
    });
  }, [plantingPlans, crops]);

  // Tasks to soak seeds today
  const soakingTasks = useMemo(() => {
    return plantingPlans.filter(plan => {
      if (!plan.sow_date || plan.status !== 'planned') return false;
      const crop = crops.find(c => c.id === plan.crop_id);
      if (!crop || !crop.seed_soaking) return false;

      const soakingHours = (plan as any).soaking_hours_before_sowing || 12;
      const sowDate = parseISO(plan.sow_date);
      const soakingStartDate = addDays(sowDate, -Math.floor(soakingHours / 24));

      return isSameDay(soakingStartDate, today);
    });
  }, [plantingPlans, crops]);

  // Tasks to harvest today
  const harvestTasks = useMemo(() => {
    return plantingPlans.filter(plan => {
      if (!plan.expected_harvest_date) return false;
      if (plan.status === 'harvested') return false;
      return isToday(parseISO(plan.expected_harvest_date));
    });
  }, [plantingPlans]);

  // Orders to deliver/pack today
  const deliveryTasks = useMemo(() => {
    return orders.filter(order => {
      if (!order.delivery_date) return false;
      if (order.status === 'delivered' || order.status === 'cancelled' || order.skipped) return false;
      return isToday(parseISO(order.delivery_date));
    });
  }, [orders]);

  const TaskBubble = ({ 
    title, 
    icon: Icon, 
    items, 
    emptyText, 
    color,
    renderItem 
  }: { 
    title: string; 
    icon: React.ComponentType<{ className?: string }>; 
    items: any[]; 
    emptyText: string; 
    color: string;
    renderItem: (item: any) => React.ReactNode;
  }) => (
    <Card className="p-6 h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{title}</h3>
          <Badge variant="secondary" className="mt-1">
            {items.length} {items.length === 1 ? 'úloha' : items.length < 5 ? 'úlohy' : 'úloh'}
          </Badge>
        </div>
      </div>
      
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyText}</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {items.map((item, index) => (
            <div key={index}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <MainLayout>
      <PageHeader 
        title="Dnešné úlohy" 
        description={`Prehľad úloh na ${format(today, 'EEEE, d. MMMM yyyy', { locale: sk })}`}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* 0. Soaking Tasks */}
        <TaskBubble
          title="Namáčanie semien"
          icon={Droplets}
          items={soakingTasks}
          emptyText="Dnes nie je potrebné namáčať semená"
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
          renderItem={(plan) => {
            const crop = crops.find(c => c.id === plan.crop_id);
            const soakingHours = (plan as any).soaking_hours_before_sowing || 12;
            return (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: getCropColor(plan.crop_id) }}
                  />
                  <div>
                    <p className="font-medium text-sm">{getCropName(plan.crop_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {soakingHours}h pred výsevom ({format(parseISO(plan.sow_date), 'd.M.')})
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400">
                  Namočiť
                </Badge>
              </div>
            );
          }}
        />

        {/* 1. Sowing Tasks */}
        <TaskBubble
          title="Sadenie"
          icon={Sprout}
          items={sowingTasks}
          emptyText="Dnes nie je naplánované žiadne sadenie"
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
          renderItem={(plan) => (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: getCropColor(plan.crop_id) }}
                />
                <div>
                  <p className="font-medium text-sm">{getCropName(plan.crop_id)}</p>
                  <p className="text-xs text-muted-foreground">{plan.tray_count || 1} tácov</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">Zasadiť</Badge>
            </div>
          )}
        />

        {/* 2. Weight Removal Tasks */}
        <TaskBubble
          title="Odťaženie"
          icon={Weight}
          items={weightRemovalTasks}
          emptyText="Dnes nie je potrebné odťažiť"
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400"
          renderItem={(plan) => (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: getCropColor(plan.crop_id) }}
                />
                <div>
                  <p className="font-medium text-sm">{getCropName(plan.crop_id)}</p>
                  <p className="text-xs text-muted-foreground">{plan.tray_count || 1} tácov</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-400">
                Odťažiť
              </Badge>
            </div>
          )}
        />

        {/* 3. Move to Light Tasks */}
        <TaskBubble
          title="Presun na svetlo"
          icon={Sun}
          items={lightTasks}
          emptyText="Dnes nie je potrebné presúvať na svetlo"
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
          renderItem={(plan) => (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: getCropColor(plan.crop_id) }}
                />
                <div>
                  <p className="font-medium text-sm">{getCropName(plan.crop_id)}</p>
                  <p className="text-xs text-muted-foreground">{plan.tray_count || 1} tácov</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400">
                Na svetlo
              </Badge>
            </div>
          )}
        />

        {/* Harvest Tasks */}
        <TaskBubble
          title="Zber"
          icon={Scissors}
          items={harvestTasks}
          emptyText="Dnes nie je naplánovaný žiadny zber"
          color="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
          renderItem={(plan) => (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: getCropColor(plan.crop_id) }}
                />
                <div>
                  <p className="font-medium text-sm">{getCropName(plan.crop_id)}</p>
                  <p className="text-xs text-muted-foreground">{plan.tray_count || 1} tácov</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400">
                Zberať
              </Badge>
            </div>
          )}
        />

        {/* Delivery/Packing Tasks */}
        <TaskBubble
          title="Balenie a dodávka"
          icon={Truck}
          items={deliveryTasks}
          emptyText="Dnes nie sú naplánované žiadne dodávky"
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
          renderItem={(order) => (
            <div className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">{getCustomerName(order.customer_id)}</p>
                <Badge variant="outline" className="text-xs">
                  {order.delivery_form === 'cut' ? 'Rezané' : 'Živé'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: getCropColor(order.crop_id) }}
                />
                <p className="text-xs text-muted-foreground">
                  {order.crop_id ? getCropName(order.crop_id) : getBlendName(order.blend_id)} - {order.quantity} {order.unit}
                </p>
              </div>
              <div className="mt-2 flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  <Scissors className="h-3 w-3 mr-1" />
                  Zrezať
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <Package className="h-3 w-3 mr-1" />
                  Zabaliť
                </Badge>
              </div>
            </div>
          )}
        />
      </div>

      {/* Summary */}
      <Card className="mt-6 p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Leaf className="h-5 w-5 text-primary" />
          Denný súhrn
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{sowingTasks.length}</p>
            <p className="text-sm text-muted-foreground">Sadenie</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{weightRemovalTasks.length}</p>
            <p className="text-sm text-muted-foreground">Odťaženie</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{lightTasks.length}</p>
            <p className="text-sm text-muted-foreground">Na svetlo</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{harvestTasks.length}</p>
            <p className="text-sm text-muted-foreground">Zber</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{deliveryTasks.length}</p>
            <p className="text-sm text-muted-foreground">Dodávky</p>
          </div>
        </div>
      </Card>
    </MainLayout>
  );
}
