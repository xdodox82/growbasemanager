import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { Bell, AlertTriangle, Calendar, Truck, Package, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { addDays, isWithinInterval, startOfDay, format } from 'date-fns';
import { sk } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'low_stock' | 'harvest_due' | 'delivery_due' | 'order_pending';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  link?: string;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('dismissed-notifications');
    return stored ? JSON.parse(stored) : [];
  });

  const { seeds, packagings, substrates, plantingPlans, orders, crops } = useAppStore();

  const notifications = useMemo(() => {
    const notifs: Notification[] = [];
    const today = startOfDay(new Date());
    const threeDaysFromNow = addDays(today, 3);
    const sevenDaysFromNow = addDays(today, 7);

    // Low stock alerts - Seeds (based on quantity threshold)
    seeds.forEach((seed) => {
      const threshold = 100; // grams threshold for low stock
      const quantityInGrams = seed.quantityUnit === 'kg' ? seed.quantity * 1000 : seed.quantity;
      if (quantityInGrams <= threshold) {
        const crop = crops.find(c => c.id === seed.cropId);
        notifs.push({
          id: `seed-low-${seed.id}`,
          type: 'low_stock',
          title: 'Nízka zásoba semien',
          message: `${crop?.name || 'Neznáma plodina'} - zostáva ${seed.quantity} ${seed.quantityUnit}`,
          priority: quantityInGrams === 0 ? 'high' : 'medium',
          timestamp: new Date(),
          link: '/inventory/seeds',
        });
      }
    });

    // Low stock alerts - Packaging (based on quantity threshold)
    packagings.forEach((pkg) => {
      const threshold = 10; // pieces threshold for low stock
      if (pkg.quantity <= threshold) {
        notifs.push({
          id: `pkg-low-${pkg.id}`,
          type: 'low_stock',
          title: 'Nízka zásoba obalov',
          message: `${pkg.type} - zostáva ${pkg.quantity} ks`,
          priority: pkg.quantity === 0 ? 'high' : 'medium',
          timestamp: new Date(),
          link: '/inventory/packaging',
        });
      }
    });

    // Low stock alerts - Substrates (based on currentStock)
    substrates.forEach((sub) => {
      const threshold = 10; // liters/kg threshold for low stock
      if (sub.currentStock <= threshold) {
        const typeName = sub.type === 'coconut' ? 'Kokos' : sub.type === 'peat' ? 'Rašelina' : (sub.customType || 'Substrát');
        notifs.push({
          id: `sub-low-${sub.id}`,
          type: 'low_stock',
          title: 'Nízka zásoba substrátu',
          message: `${typeName} - zostáva ${sub.currentStock} ${sub.quantityUnit}`,
          priority: sub.currentStock === 0 ? 'high' : 'medium',
          timestamp: new Date(),
          link: '/inventory/substrate',
        });
      }
    });

    // Upcoming harvests (within 3 days) - only for growing or sown status
    plantingPlans
      .filter(plan => plan.status === 'sown' || plan.status === 'scheduled')
      .forEach((plan) => {
        const harvestDate = startOfDay(new Date(plan.harvestDate));
        if (isWithinInterval(harvestDate, { start: today, end: threeDaysFromNow })) {
          const crop = crops.find(c => c.id === plan.cropId);
          const daysUntil = Math.ceil((harvestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          notifs.push({
            id: `harvest-${plan.id}`,
            type: 'harvest_due',
            title: 'Blížiaci sa zber',
            message: `${crop?.name || 'Neznáma plodina'} - ${daysUntil === 0 ? 'dnes' : `o ${daysUntil} ${daysUntil === 1 ? 'deň' : 'dni'}`}`,
            priority: daysUntil === 0 ? 'high' : 'medium',
            timestamp: harvestDate,
            link: '/harvest',
          });
        }
      });

    // Pending orders with upcoming delivery
    orders
      .filter(order => order.status === 'pending' || order.status === 'growing')
      .forEach((order) => {
        const deliveryDate = startOfDay(new Date(order.deliveryDate));
        if (isWithinInterval(deliveryDate, { start: today, end: sevenDaysFromNow })) {
          const daysUntil = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          notifs.push({
            id: `order-${order.id}`,
            type: 'delivery_due',
            title: 'Blížiaca sa dodávka',
            message: `Objednávka #${order.id.slice(0, 6)} - ${format(deliveryDate, 'd. MMM', { locale: sk })}`,
            priority: daysUntil <= 1 ? 'high' : daysUntil <= 3 ? 'medium' : 'low',
            timestamp: deliveryDate,
            link: '/orders',
          });
        }
      });

    // Pending orders that need attention
    orders
      .filter(order => order.status === 'pending')
      .forEach((order) => {
        const orderDate = new Date(order.createdAt);
        const daysSinceOrder = Math.ceil((today.getTime() - startOfDay(orderDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceOrder >= 1) {
          notifs.push({
            id: `pending-${order.id}`,
            type: 'order_pending',
            title: 'Nevybavená objednávka',
            message: `Objednávka čaká ${daysSinceOrder} ${daysSinceOrder === 1 ? 'deň' : 'dní'} na potvrdenie`,
            priority: daysSinceOrder >= 3 ? 'high' : 'medium',
            timestamp: orderDate,
            link: '/orders',
          });
        }
      });

    // Filter out dismissed notifications and sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return notifs
      .filter(n => !dismissedIds.includes(n.id))
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [seeds, packagings, substrates, plantingPlans, orders, crops, dismissedIds]);

  const highPriorityCount = notifications.filter(n => n.priority === 'high').length;

  const dismissNotification = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissed-notifications', JSON.stringify(newDismissed));
  };

  const clearAllDismissed = () => {
    setDismissedIds([]);
    localStorage.removeItem('dismissed-notifications');
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'low_stock':
        return <Package className="h-4 w-4" />;
      case 'harvest_due':
        return <Calendar className="h-4 w-4" />;
      case 'delivery_due':
        return <Truck className="h-4 w-4" />;
      case 'order_pending':
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'medium':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'low':
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold",
              highPriorityCount > 0 
                ? "bg-destructive text-destructive-foreground animate-pulse" 
                : "bg-warning text-warning-foreground"
            )}>
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 md:w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">Upozornenia</h3>
          <Badge variant="secondary">{notifications.length}</Badge>
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Žiadne nové upozornenia</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 transition-colors relative group",
                    notification.priority === 'high' && "bg-destructive/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg border",
                      getPriorityColor(notification.priority)
                    )}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {notification.message}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {notification.link && (
                    <a 
                      href={notification.link}
                      className="absolute inset-0"
                      onClick={() => setIsOpen(false)}
                    />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {dismissedIds.length > 0 && (
          <div className="p-2 border-t border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={clearAllDismissed}
            >
              Zobraziť skryté upozornenia ({dismissedIds.length})
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}