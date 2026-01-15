import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-components';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlantingPlans, useOrders, useCrops, useCustomers } from '@/hooks/useSupabaseData';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Leaf,
  Scissors,
  Truck
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { sk } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const WEEKDAYS = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'sow' | 'harvest' | 'delivery';
  title: string;
  color: string;
  details?: string;
}

export default function CalendarPage() {
  const { data: plantingPlans } = usePlantingPlans();
  const { data: orders } = useOrders();
  const { data: crops } = useCrops();
  const { data: customers } = useCustomers();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getCropName = (cropId: string | null) => {
    if (!cropId) return 'Neznáma plodina';
    return crops.find(c => c.id === cropId)?.name || 'Neznáma plodina';
  };

  const getCropColor = (cropId: string | null) => {
    if (!cropId) return '#888888';
    return crops.find(c => c.id === cropId)?.color || '#888888';
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return 'Neznámy zákazník';
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Neznámy zákazník';
    return customer.company_name || customer.name || 'Neznámy zákazník';
  };

  // Generate calendar events from planting plans and orders
  const events = useMemo((): CalendarEvent[] => {
    const allEvents: CalendarEvent[] = [];

    // Sowing events from planting plans
    plantingPlans.forEach(plan => {
      if (plan.status === 'planned' || plan.status === 'sown') {
        allEvents.push({
          id: `sow-${plan.id}`,
          date: new Date(plan.sow_date),
          type: 'sow',
          title: `Výsev: ${getCropName(plan.crop_id)}`,
          color: getCropColor(plan.crop_id),
          details: `${plan.tray_count || 1} tácov`
        });
      }
    });

    // Harvest events from planting plans
    plantingPlans.forEach(plan => {
      if (plan.status !== 'harvested' && plan.expected_harvest_date) {
        allEvents.push({
          id: `harvest-${plan.id}`,
          date: new Date(plan.expected_harvest_date),
          type: 'harvest',
          title: `Zber: ${getCropName(plan.crop_id)}`,
          color: getCropColor(plan.crop_id),
          details: `${plan.tray_count || 1} tácov`
        });
      }
    });

    // Delivery events from orders
    orders.forEach(order => {
      if (order.status !== 'delivered' && order.status !== 'cancelled' && order.delivery_date) {
        allEvents.push({
          id: `delivery-${order.id}`,
          date: new Date(order.delivery_date),
          type: 'delivery',
          title: `Dodávka: ${getCustomerName(order.customer_id)}`,
          color: '#3b82f6',
          details: `${order.quantity} ${order.unit || 'g'}`
        });
      }
    });

    return allEvents;
  }, [plantingPlans, orders, crops, customers]);

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.date), day));
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'sow':
        return <Leaf className="h-3 w-3" />;
      case 'harvest':
        return <Scissors className="h-3 w-3" />;
      case 'delivery':
        return <Truck className="h-3 w-3" />;
    }
  };

  const stats = useMemo(() => {
    const monthEvents = events.filter(e => isSameMonth(new Date(e.date), currentMonth));
    return {
      sow: monthEvents.filter(e => e.type === 'sow').length,
      harvest: monthEvents.filter(e => e.type === 'harvest').length,
      delivery: monthEvents.filter(e => e.type === 'delivery').length,
    };
  }, [events, currentMonth]);

  return (
    <MainLayout>
      <PageHeader 
        title="Kalendár" 
        description="Prehľad výsevu, zberu a dodávok"
      />

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 bg-success/10 border-success/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <Leaf className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Výsevy</p>
                <p className="text-2xl font-bold text-success">{stats.sow}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-warning/10 border-warning/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Scissors className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zbery</p>
                <p className="text-2xl font-bold text-warning">{stats.harvest}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-info/10 border-info/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/20">
                <Truck className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dodávky</p>
                <p className="text-2xl font-bold text-info">{stats.delivery}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Calendar */}
        <Card className="p-4 md:p-6">
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg md:text-xl font-semibold min-w-[150px] md:min-w-[200px] text-center">
                {format(currentMonth, 'LLLL yyyy', { locale: sk })}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(new Date())}
              className="gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Dnes</span>
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(day => (
              <div 
                key={day} 
                className="text-center text-xs md:text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={index}
                  className={`
                    min-h-[60px] md:min-h-[100px] p-1 md:p-2 rounded-lg border transition-colors
                    ${isCurrentMonth ? 'bg-card border-border' : 'bg-muted/30 border-transparent'}
                    ${isCurrentDay ? 'ring-2 ring-primary' : ''}
                  `}
                >
                  <div className={`
                    text-xs md:text-sm font-medium mb-1
                    ${isCurrentDay ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                  `}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <Tooltip key={event.id}>
                        <TooltipTrigger asChild>
                          <div
                            className="flex items-center gap-1 text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ 
                              backgroundColor: `${event.color}20`,
                              color: event.color
                            }}
                          >
                            {getEventIcon(event.type)}
                            <span className="truncate hidden sm:inline">{event.title.split(': ')[1]}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{event.title}</p>
                          {event.details && <p className="text-xs text-muted-foreground">{event.details}</p>}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1 rounded bg-success/20">
                <Leaf className="h-3 w-3 text-success" />
              </div>
              <span>Výsev</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1 rounded bg-warning/20">
                <Scissors className="h-3 w-3 text-warning" />
              </div>
              <span>Zber</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1 rounded bg-info/20">
                <Truck className="h-3 w-3 text-info" />
              </div>
              <span>Dodávka</span>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
