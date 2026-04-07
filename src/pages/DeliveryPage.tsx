// IMPORTANT: Use 'House' not 'Home' - Home is Chrome browser icon, House is home icon
import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CustomerTypeFilter } from '@/components/filters/CustomerTypeFilter';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useOrders, useCustomers, useCrops, useBlends, useOrderItems, useDeliveryRoutes } from '@/hooks/useSupabaseData';
import { usePrices, useVatSettings } from '@/hooks/usePrices';
import { useDeliveryDays } from '@/hooks/useDeliveryDays';
import { Truck, FileSpreadsheet, FileText, CircleCheck as CheckCircle2, Calendar as CalendarIcon, Filter, Undo2, Navigation, CreditCard, Euro, House, Utensils, Store, Building2, Settings, GripVertical, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import { format, isSameDay, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useInventoryConsumption } from '@/hooks/useInventoryConsumption';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { DeliveryDaysSettings } from '@/components/delivery/DeliveryDaysSettings';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// Format price with Slovak decimal separator (comma) and remove trailing zeros
const formatPrice = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  let formatted = rounded.toString().replace('.', ',');
  if (formatted.includes(',')) {
    formatted = formatted.replace(/,?0+$/, '');
  }
  return formatted;
};

interface SortableOrderRowProps {
  order: any;
  orderIdx: number;
  item: any;
  getCropColor: (cropId: string | null) => string;
  getPackagingSummary: (summary: Record<string, number>, itemName?: string) => string;
  openInGoogleMaps: (address: string) => void;
  markOrderDelivered: (orderId: string) => void;
  markOrderOnTheWay: (orderId: string) => void;
  handleMarkAsPaid: (orderId: string, notes: string | null) => void;
  handleMarkAsUnpaid: (orderId: string, notes: string | null) => void;
  onOrderClick: (order: any) => void;
  navigationMode: {[key: string]: 'waze' | 'maps'};
  setNavigationMode: React.Dispatch<React.SetStateAction<{[key: string]: 'waze' | 'maps'}>>;
}

function SortableOrderRow({
  order,
  orderIdx,
  item,
  getCropColor,
  getPackagingSummary,
  openInGoogleMaps,
  markOrderDelivered,
  markOrderOnTheWay,
  handleMarkAsPaid,
  handleMarkAsUnpaid,
  onOrderClick,
  navigationMode,
  setNavigationMode,
}: SortableOrderRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const currentNav = navigationMode[order.id] || 'waze';

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging ? 'relative z-50' : '',
        'cursor-pointer hover:bg-gray-50 transition-colors h-10'
      )}
      onClick={() => onOrderClick(order)}
    >
      <TableCell onClick={(e) => e.stopPropagation()} className="py-0.5">
        <button
          className="cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
      </TableCell>

      {/* ZÁKAZNÍK - tučný, väčší */}
      <TableCell className="text-center py-0.5">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-lg">{order.customerName}</span>
          {order.deliveryNotes && (
            <div className="text-xs text-muted-foreground italic">
              📍 {order.deliveryNotes}
            </div>
          )}
          {order.notes && (
            <div className="text-xs text-amber-600 dark:text-amber-500 font-medium">
              💬 {order.notes}
            </div>
          )}
        </div>
      </TableCell>

      {/* ADRESA */}
      <TableCell className="hidden lg:table-cell text-center py-0.5">
        {order.customerAddress && (
          <span className="text-sm">{order.customerAddress}</span>
        )}
      </TableCell>

      {/* KONTAKT - telefón + swipe navigácia */}
      <TableCell className="hidden lg:table-cell py-0.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-2">
          {/* Telefón */}
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
            >
              <Phone className="h-4 w-4" />
              {order.customerPhone}
            </a>
          )}

          {/* Swipe navigácia */}
          {order.customerAddress && (
            <div
              className="relative select-none cursor-grab active:cursor-grabbing"
              onTouchStart={(e) => {
                const startX = e.touches[0].clientX;
                const handleTouchMove = (moveEvent: TouchEvent) => {
                  const deltaX = moveEvent.touches[0].clientX - startX;
                  if (Math.abs(deltaX) > 50) {
                    setNavigationMode(prev => ({
                      ...prev,
                      [order.id]: prev[order.id] === 'waze' ? 'maps' : 'waze'
                    }));
                    document.removeEventListener('touchmove', handleTouchMove);
                  }
                };
                document.addEventListener('touchmove', handleTouchMove);
                document.addEventListener('touchend', () => {
                  document.removeEventListener('touchmove', handleTouchMove);
                }, { once: true });
              }}
            >
              {currentNav === 'waze' ? (
                <a
                  href={`https://waze.com/ul?q=${encodeURIComponent(order.customerAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                >
                  <Navigation className="h-4 w-4" />
                  Waze
                </a>
              ) : (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.customerAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-green-600 hover:underline text-sm"
                >
                  <Navigation className="h-4 w-4" />
                  Maps
                </a>
              )}
            </div>
          )}
        </div>
      </TableCell>

      {/* CENA */}
      <TableCell className="text-center py-0.5">
        <div className="text-xl font-bold text-green-600 dark:text-green-500">
          {order.totalPrice.toFixed(2)} €
        </div>
        {(order.deliveryFee || 0) > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            (vrátane dopravy {(order.deliveryFee || 0).toFixed(2)} €)
          </div>
        )}
      </TableCell>

      {/* AKCIE */}
      <TableCell className="hidden md:table-cell py-0.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-2">

          {/* Zaplatené ikona */}
          {order.paymentMethod === 'invoice' ? (
            <div
              title="Uhradené faktúrou"
              className="p-2 rounded-full text-blue-600 bg-blue-50"
            >
              <CreditCard className="h-6 w-6" />
            </div>
          ) : (
            <button
              title={order.isPaid ? "Označiť ako nezaplatené" : "Označiť ako zaplatené"}
              onClick={(e) => {
                e.stopPropagation();
                if (order.isPaid) {
                  handleMarkAsUnpaid(order.id, order.notes);
                } else {
                  handleMarkAsPaid(order.id, order.notes);
                }
              }}
              className={`p-2 rounded-full transition-colors ${
                order.isPaid
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <CreditCard className="h-6 w-6" />
            </button>
          )}

          {/* Na ceste ikona - zobrazí sa len ak je status packed */}
          {order.status === 'packed' && (
            <button
              title="Označiť ako na ceste"
              onClick={(e) => {
                e.stopPropagation();
                markOrderOnTheWay(order.id);
              }}
              className="p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Truck className="h-6 w-6" />
            </button>
          )}

          {/* Doručené ikona */}
          <button
            title="Označiť ako doručené"
            onClick={(e) => {
              e.stopPropagation();
              markOrderDelivered(order.id);
            }}
            className="p-2 rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
          >
            <CheckCircle2 className="h-6 w-6" />
          </button>

        </div>
      </TableCell>
    </TableRow>
  );
}

function DeliveryPage() {
  const { data: orders, update: updateOrder, refetch: refetchOrders, loading: ordersLoading } = useOrders();
  const { data: customers, loading: customersLoading } = useCustomers();
  const { data: crops, loading: cropsLoading } = useCrops();
  const { data: blends, loading: blendsLoading } = useBlends();
  const { data: orderItems, loading: orderItemsLoading } = useOrderItems();
  const { data: routes, loading: routesLoading } = useDeliveryRoutes();
  const { getPrice } = usePrices();
  const { calculateWithVat, isVatEnabled, vatRate } = useVatSettings();
  const { toast } = useToast();
  const { consumeOrderInventory } = useInventoryConsumption();
  const { settings: deliverySettings } = useDeliveryDays();

  const isLoading = ordersLoading || customersLoading || cropsLoading || blendsLoading || orderItemsLoading || routesLoading;

  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>('all');
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [showArchive, setShowArchive] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<typeof orders[0] | null>(null);
  const [navigationMode, setNavigationMode] = useState<{[key: string]: 'waze' | 'maps'}>({});
  const [financialReportOpen, setFinancialReportOpen] = useState(false);

  const [navApp, setNavApp] = useState<'waze' | 'maps'>('waze');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  const handleNavToggle = () => {
    const next = navApp === 'waze' ? 'maps' : 'waze';
    setNavApp(next);
  };

  const openNavigation = (address: string) => {
    if (!address) return;
    const encoded = encodeURIComponent(address);
    const url = navApp === 'waze'
      ? `https://waze.com/ul?q=${encoded}`
      : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    if (selectedDates.length > 0) {
      setSelectedDate(selectedDates[0]);
    }
  }, [selectedDates]);

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;

    setSelectedOrderIds(new Set());
    setSelectedDate(date);
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

  const goToPreviousMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const hasOrdersOnDate = (date: Date) => {
    return orders.some(order =>
      order.delivery_date &&
      isSameDay(startOfDay(new Date(order.delivery_date)), startOfDay(date))
    );
  };

  // Get orders for delivery on the selected date
  console.log('📅 DeliveryPage - Selected dates:', selectedDates);
  console.log('📦 DeliveryPage - All orders:', orders.length);

  let ordersForDate = orders.filter(order => {
    if (!order.delivery_date) return false;

    // Check if order delivery_date matches ANY of the selected dates
    const orderDate = startOfDay(new Date(order.delivery_date));
    const matchesSelectedDate = selectedDates.some(selectedDate =>
      isSameDay(orderDate, startOfDay(selectedDate))
    );

    if (!matchesSelectedDate) return false;

    // Filter by status based on archive setting
    if (showArchive) {
      return ['ready', 'packed', 'on_the_way', 'delivered'].includes(order.status || '');
    } else {
      return ['ready', 'packed', 'on_the_way'].includes(order.status || '');
    }
  });

  // Filter by customer type if selected
  if (selectedCustomerType !== 'all') {
    ordersForDate = ordersForDate.filter(order => {
      const customer = customers.find(c => c.id === order.customer_id);
      return customer?.customer_type === selectedCustomerType;
    });
  }

  // Filter by specific customer if selected
  if (customerFilter !== 'all') {
    ordersForDate = ordersForDate.filter(order => {
      return order.customer_id === customerFilter;
    });
  }

  // Filter by route if selected
  if (routeFilter !== 'all') {
    ordersForDate = ordersForDate.filter(order => {
      const customer = customers.find(c => c.id === order.customer_id);
      return customer?.delivery_route_id === routeFilter;
    });
  }

  // Split into pending (ready/packed/on_the_way) and delivered orders
  const pendingOrders = ordersForDate.filter(order => ['ready', 'packed', 'on_the_way'].includes(order.status || ''));
  const deliveredOrders = ordersForDate.filter(order => order.status === 'delivered');

  // All orders for financial report (delivered + ready/packed/on_the_way)
  const allOrdersForReport = ordersForDate.filter(order =>
    ['ready', 'packed', 'on_the_way', 'delivered'].includes(order.status || '')
  );

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
    // Prioritize company_name for all customers
    return customer.company_name || customer.name || 'Neznámy zákazník';
  };

  const getItemName = (order: { crop_id?: string | null; blend_id?: string | null }) => {
    if (order.crop_id) {
      return getCropName(order.crop_id);
    }
    if (order.blend_id) {
      const blend = blends.find(b => b.id === order.blend_id);
      return blend?.name || 'Neznáma zmes';
    }
    return 'Neznáma položka';
  };

  // Calculate total price for an order (products only, without delivery)
  const calculateOrderTotal = (order: typeof orders[0], customerType: string | null) => {
    let itemsSubtotal = 0;

    const items = orderItems.filter(item => item.order_id === order.id);

    if (items.length > 0) {
      // Multi-item order - prices already include VAT in DB
      itemsSubtotal = items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity?.toString() || '0');
        const pricePerUnit = parseFloat(item.price_per_unit?.toString().replace(',', '.') || '0');
        return sum + (qty * pricePerUnit);
      }, 0);
    } else {
      // Single-item order (legacy)
      itemsSubtotal = order?.total_price || 0;
    }

    return itemsSubtotal;
  };

  // Calculate delivery fee for an order
  const calculateDeliveryFee = (orderTotal: number, customer: any, route: any, customerType?: string, chargeDelivery?: boolean) => {
    // PRIORITY 1: Manual toggle - if charge_delivery is FALSE, no fee
    if (chargeDelivery === false) {
      return 0;
    }

    // PRIORITY 2: Check if customer has free delivery exception
    if (customer?.free_delivery) {
      return 0;
    }

    // PRIORITY 3: Return route delivery fee based on customer type, considering free delivery thresholds
    if (!route) {
      return 0;
    }

    const type = customerType || customer?.customer_type || 'home';

    // Check if order total exceeds free delivery threshold for this customer type
    let minFreeDelivery = 0;
    let deliveryFee = 0;

    if (type === 'gastro') {
      minFreeDelivery = route.gastro_min_free_delivery ?? 0;
      deliveryFee = route.delivery_fee_gastro ?? route.delivery_fee ?? 0;
    } else if (type === 'wholesale') {
      minFreeDelivery = route.wholesale_min_free_delivery ?? 0;
      deliveryFee = route.delivery_fee_wholesale ?? route.delivery_fee ?? 0;
    } else {
      minFreeDelivery = route.home_min_free_delivery ?? 0;
      deliveryFee = route.delivery_fee_home ?? route.delivery_fee ?? 0;
    }

    // If min free delivery threshold is met, no delivery fee
    if (minFreeDelivery > 0 && orderTotal >= minFreeDelivery) {
      return 0;
    }

    return deliveryFee;
  };

  // Check if order is paid (notes contain 'Zaplatené')
  const isOrderPaid = (order: typeof orders[0]) => {
    const notes = order?.notes || '';
    const result = notes.toLowerCase().includes('zaplatené') || notes.toLowerCase().includes('zaplatene');

    console.log('🔍 isOrderPaid check:', {
      orderId: order.id,
      notes: notes,
      includes: result
    });

    return result;
  };

  // Mark order as paid
  const handleMarkAsPaid = async (orderId: string, currentNotes: string | null) => {
    console.log('💳 MARKING AS PAID:', orderId);

    const order = orders.find(o => o.id === orderId);
    console.log('  Current order:', order);
    console.log('  Current notes:', currentNotes);
    console.log('  Current isPaid:', order ? isOrderPaid(order) : 'N/A');

    const newNotes = currentNotes ? `${currentNotes} | Zaplatené` : 'Zaplatené';
    console.log('  New notes:', newNotes);

    const { error, data } = await updateOrder(orderId, { notes: newNotes });
    console.log('  Supabase response:', { error, data });

    if (!error) {
      toast({
        title: 'Platba zaznamenaná',
        description: 'Objednávka bola označená ako zaplatená.'
      });
      console.log('  Should refetch orders now!');

      // Refetch orders from DB
      console.log('  🔄 Calling refetchOrders...');
      await refetchOrders();
      console.log('  ✅ Refetch complete!');
    } else {
      console.error('  ERROR:', error);
    }
  };

  // Mark order as unpaid
  const handleMarkAsUnpaid = async (orderId: string, currentNotes: string | null) => {
    console.log('💳 MARKING AS UNPAID:', orderId);

    const order = orders.find(o => o.id === orderId);
    console.log('  Current order:', order);
    console.log('  Current notes:', currentNotes);
    console.log('  Current isPaid:', order ? isOrderPaid(order) : 'N/A');

    const newNotes = currentNotes?.replace(/\s*\|\s*Zaplatené/gi, '').replace(/Zaplatené\s*\|?\s*/gi, '').replace(/zaplatené/gi, '').trim() || '';
    console.log('  New notes:', newNotes);

    const { error, data } = await updateOrder(orderId, { notes: newNotes || null });
    console.log('  Supabase response:', { error, data });

    if (!error) {
      toast({
        title: 'Platba zrušená',
        description: 'Označenie platby bolo odstránené.'
      });
      console.log('  Should refetch orders now!');

      // Refetch orders from DB
      console.log('  🔄 Calling refetchOrders...');
      await refetchOrders();
      console.log('  ✅ Refetch complete!');
    } else {
      console.error('  ERROR:', error);
    }
  };

  // Financial report calculations
  const calculateItemsTotal = () => {
    return allOrdersForReport.reduce((sum, order) => {
      const customer = customers?.find(c => c.id === order.customer_id);
      const orderTotal = calculateOrderTotal(order, customer?.customer_type || null);
      return sum + orderTotal;
    }, 0);
  };

  const calculateDeliveryTotal = () => {
    return allOrdersForReport.reduce((sum, order) => {
      const customer = customers?.find(c => c.id === order.customer_id);
      const route = routes?.find(r => r.id === customer?.delivery_route_id);
      const orderTotal = calculateOrderTotal(order, customer?.customer_type || null);
      const deliveryFee = calculateDeliveryFee(orderTotal, customer, route, customer?.customer_type || null, (order as any).charge_delivery);
      return sum + deliveryFee;
    }, 0);
  };

  const calculateGrandTotal = () => {
    return calculateItemsTotal() + calculateDeliveryTotal();
  };

  const calculatePaid = () => {
    console.log('💰 Calculating paid...');
    console.log('  All orders for report:', allOrdersForReport.length);

    console.log('  ✅ Using isOrderPaid for delivered + ready orders:');
    const paid = allOrdersForReport.filter(o => isOrderPaid(o));
    console.log('    Found:', paid.length, paid.map(o => ({ id: o.id, status: o.status })));

    const total = paid.reduce((sum, order) => {
      const customer = customers?.find(c => c.id === order.customer_id);
      const orderTotal = calculateOrderTotal(order, customer?.customer_type || null);
      const route = routes?.find(r => r.id === customer?.delivery_route_id);
      const deliveryFee = calculateDeliveryFee(orderTotal, customer, route, customer?.customer_type || null, (order as any).charge_delivery);
      console.log('    Order', order.id, `(${order.status}):`, orderTotal, '+', deliveryFee, '=', orderTotal + deliveryFee);
      return sum + orderTotal + deliveryFee;
    }, 0);

    console.log('  TOTAL PAID:', total);
    return total;
  };

  const calculateUnpaid = () => {
    return calculateGrandTotal() - calculatePaid();
  };

  const calculateTotalRemaining = () => {
    return calculateUnpaid();
  };

  const calculateHouseholds = () => {
    return allOrdersForReport
      .filter(o => {
        const customer = customers?.find(c => c.id === o.customer_id);
        return customer?.customer_type === 'home';
      })
      .reduce((sum, order) => {
        const customer = customers?.find(c => c.id === order.customer_id);
        const orderTotal = calculateOrderTotal(order, customer?.customer_type || null);
        const route = routes?.find(r => r.id === customer?.delivery_route_id);
        const deliveryFee = calculateDeliveryFee(orderTotal, customer, route, customer?.customer_type || null, (order as any).charge_delivery);
        return sum + orderTotal + deliveryFee;
      }, 0);
  };

  const calculateGastro = () => {
    return allOrdersForReport
      .filter(o => {
        const customer = customers?.find(c => c.id === o.customer_id);
        return customer?.customer_type === 'gastro' || customer?.customer_type === 'wholesale';
      })
      .reduce((sum, order) => {
        const customer = customers?.find(c => c.id === order.customer_id);
        const orderTotal = calculateOrderTotal(order, customer?.customer_type || null);
        const route = routes?.find(r => r.id === customer?.delivery_route_id);
        const deliveryFee = calculateDeliveryFee(orderTotal, customer, route, customer?.customer_type || null, (order as any).charge_delivery);
        return sum + orderTotal + deliveryFee;
      }, 0);
  };


  const getOrderItemsDetail = (orderId: string, customerType?: string | null) => {
    const items = orderItems.filter(item => item.order_id === orderId);
    if (items.length === 0) return null;

    return items.map(item => {
      const itemName = item.crop_id
        ? getCropName(item.crop_id)
        : item.blend_id
        ? (blends.find(b => b.id === item.blend_id)?.name || 'Neznáma zmes')
        : 'Neznáma položka';
      // Prices already include VAT in DB
      const qty = parseFloat(item.quantity?.toString() || '0');
      const pricePerUnit = parseFloat(item.price_per_unit?.toString().replace(',', '.') || '0');
      const itemTotal = qty * pricePerUnit;
      return {
        quantity: item.quantity,
        name: itemName,
        size: item.packaging_size,
        price: itemTotal,
        // Debug info from DB
        dbPricePerUnit: item.price_per_unit,
        dbTotalPrice: item.total_price,
        dbCropId: item.crop_id,
        dbBlendId: item.blend_id,
      };
    });
  };

  // Helper function to group orders
  const groupOrders = (ordersList: typeof orders) => {
    const grouped = ordersList.reduce((acc, order) => {
      const key = order.crop_id || order.blend_id || 'unknown';
      if (!acc[key]) {
        acc[key] = {
          name: getItemName(order),
          cropId: order.crop_id,
          blendId: order.blend_id,
          totalQuantity: 0,
          packagingSummary: {} as Record<string, number>,
          orders: [],
        };
      }
      acc[key].totalQuantity += order.quantity || 0;

      const packagingKey = order.packaging_size || '50g';
      acc[key].packagingSummary[packagingKey] = (acc[key].packagingSummary[packagingKey] || 0) + 1;

      const customer = customers.find(c => c.id === order.customer_id);
      const customerType = customer?.customer_type || 'home';
      const paymentMethod = (customer as any)?.payment_method || 'cash';
      const itemsDetail = getOrderItemsDetail(order.id, customerType);
      const route = routes?.find(r => r.id === customer?.delivery_route_id);
      // ✅ VŽDY prepočítaj z order_items
      const orderTotal = calculateOrderTotal(order, customerType);
      const chargeDelivery = (order as any).charge_delivery !== false;
      // Use stored delivery price first, fallback to calculation
      const deliveryFee = order.delivery_price ?? calculateDeliveryFee(orderTotal, customer, route, customerType, chargeDelivery);

      acc[key].orders.push({
        id: order.id,
        customerId: order.customer_id,
        customerName: getCustomerName(order.customer_id),
        customerType,
        customerAddress: customer?.address || null,
        customerPhone: customer?.phone || null,
        deliveryNotes: customer?.delivery_notes || null,
        paymentMethod,
        quantity: order.quantity || 0,
        unit: order.unit || 'g',
        packagingSize: order.packaging_size || '50g',
        hasLabel: order.has_label !== false,
        deliveryForm: order.delivery_form || 'cut',
        totalPrice: orderTotal + deliveryFee,
        deliveryFee,
        isPaid: isOrderPaid(order),
        notes: order.notes,
        dbTotalPrice: order.total_price,
        dbDeliveryPrice: order.delivery_price,
        itemsDetail: itemsDetail || [{
          quantity: 1,
          name: getItemName(order),
          size: order.packaging_size || '50g',
          price: calculateOrderTotal(order, customerType),
        }],
        deliveryOrder: (order as any).delivery_order || 999,
        voucherCode: (order as any).voucher_code || null,
        voucherDiscount: (order as any).voucher_discount || 0,
      });
      return acc;
    }, {} as Record<string, {
      name: string;
      cropId?: string | null;
      blendId?: string | null;
      totalQuantity: number;
      packagingSummary: Record<string, number>;
      orders: {
        id: string;
        customerId: string | null;
        customerName: string;
        customerType: string;
        customerAddress: string | null;
        customerPhone: string | null;
        deliveryNotes: string | null;
        paymentMethod: 'cash' | 'invoice';
        quantity: number;
        unit: string;
        packagingSize: string;
        hasLabel: boolean;
        deliveryForm: string;
        totalPrice: number;
        deliveryFee: number;
        isPaid: boolean;
        notes: string | null;
        itemsDetail: Array<{
          quantity: number;
          name: string;
          size: string;
          price: number;
        }>;
        deliveryOrder: number;
        voucherCode: string | null;
        voucherDiscount: number;
      }[]
    }>);

    // Sort orders within each group by delivery_order first, then by customer name
    Object.values(grouped).forEach(group => {
      group.orders.sort((a, b) => {
        if (a.deliveryOrder !== b.deliveryOrder) {
          return a.deliveryOrder - b.deliveryOrder;
        }
        return a.customerName.localeCompare(b.customerName);
      });
    });

    // Sort groups by crop harvest order
    return Object.entries(grouped).sort(([keyA, groupA], [keyB, groupB]) => {
      const cropA = crops.find(c => c.id === groupA.cropId);
      const cropB = crops.find(c => c.id === groupB.cropId);
      const orderA = (cropA as any)?.harvest_order ?? 999;
      const orderB = (cropB as any)?.harvest_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return groupA.name.localeCompare(groupB.name);
    });
  };

  // Group pending and ready orders separately
  const sortedPendingOrders = groupOrders(pendingOrders);
  const sortedDeliveredOrders = groupOrders(deliveredOrders);

  // Apply filters to pending and delivered orders
  const filteredPendingOrders = useMemo(() => {
    console.log('🔍 DeliveryPage - Pending orders:', sortedPendingOrders.length);
    return sortedPendingOrders
      .map(([key, group]) => {
        let filteredOrders = group.orders;

        if (selectedCustomerType !== 'all') {
          filteredOrders = filteredOrders.filter(o => o.customerType === selectedCustomerType);
        }

        return [key, { ...group, orders: filteredOrders }] as [string, typeof group];
      })
      .filter(([_, group]) => group.orders.length > 0);
  }, [sortedPendingOrders, selectedCustomerType]);

  const filteredDeliveredOrders = useMemo(() => {
    return sortedDeliveredOrders
      .map(([key, group]) => {
        let filteredOrders = group.orders;

        if (selectedCustomerType !== 'all') {
          filteredOrders = filteredOrders.filter(o => o.customerType === selectedCustomerType);
        }

        return [key, { ...group, orders: filteredOrders }] as [string, typeof group];
      })
      .filter(([_, group]) => group.orders.length > 0);
  }, [sortedDeliveredOrders, selectedCustomerType]);

  // Calculate delivery totals
  const deliveryTotals = useMemo(() => {
    try {
      if (!filteredPendingOrders || !filteredDeliveredOrders) {
        return {
          total: 0,
          paid: 0,
          unpaid: 0,
          home: 0,
          gastro: 0,
          wholesale: 0,
          totalProducts: 0,
          totalDelivery: 0,
          byCustomer: {}
        };
      }

      const allFilteredOrders = [
        ...filteredPendingOrders.flatMap(([_, group]) => group?.orders || []),
        ...filteredDeliveredOrders.flatMap(([_, group]) => group?.orders || [])
      ].filter(order => order && typeof order.totalPrice === 'number' && !isNaN(order.totalPrice));

      const totals = {
        total: 0,
        paid: 0,
        unpaid: 0,
        home: 0,
        gastro: 0,
        wholesale: 0,
        totalProducts: 0,
        totalDelivery: 0,
        byCustomer: {} as Record<string, { name: string; total: number; type: string | null; isPaid: boolean }>
      };

      for (const order of allFilteredOrders) {
        const orderPrice = Number(order.totalPrice) || 0;
        const deliveryFee = Number(order.deliveryFee) || 0;
        const productPrice = orderPrice - deliveryFee;

        totals.total += orderPrice;
        totals.totalProducts += productPrice;
        totals.totalDelivery += deliveryFee;

        if (order.isPaid) {
          totals.paid += orderPrice;
        } else {
          totals.unpaid += orderPrice;
        }

        if (order.customerType === 'home') {
          totals.home += orderPrice;
        } else if (order.customerType === 'gastro') {
          totals.gastro += orderPrice;
        } else if (order.customerType === 'wholesale') {
          totals.wholesale += orderPrice;
        }

        if (order.customerType === 'gastro' || order.customerType === 'wholesale') {
          const customerKey = `${order.customerName || 'unknown'}-${order.customerType}`;
          if (!totals.byCustomer[customerKey]) {
            totals.byCustomer[customerKey] = {
              name: order.customerName || 'Neznámy zákazník',
              total: 0,
              type: order.customerType,
              isPaid: order.isPaid || false
            };
          }
          totals.byCustomer[customerKey].total += orderPrice;
        }
      }

      return totals;
    } catch (error) {
      console.error('Error calculating delivery totals:', error);
      return {
        total: 0,
        paid: 0,
        unpaid: 0,
        home: 0,
        gastro: 0,
        wholesale: 0,
        totalProducts: 0,
        totalDelivery: 0,
        byCustomer: {}
      };
    }
  }, [filteredPendingOrders, filteredDeliveredOrders]);

  // Format packaging summary
  const getPackagingSummary = (summary: Record<string, number>, itemName?: string) => {
    return Object.entries(summary)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([size, count]) => itemName ? `${count} x ${size} ${itemName}` : `${count} x ${size}`)
      .join(', ');
  };

  const markOrderDelivered = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    const { error } = await updateOrder(orderId, { status: 'delivered' });
    if (!error) {
      if (order) {
        await consumeOrderInventory(
          order.crop_id || null,
          order.delivery_form || 'cut',
          order.packaging_size || '50g',
          Math.ceil(order.quantity || 1),
          order.has_label !== false
        );
      }
      toast({
        title: 'Doručené',
        description: 'Objednávka bola označená ako doručená a zásoby boli odpočítané.',
      });
    }
  };

  const returnToReady = async (orderId: string) => {
    const { error } = await updateOrder(orderId, { status: 'packed' });
    if (!error) {
      toast({
        title: 'Vrátené',
        description: 'Objednávka bola vrátená do zoznamu na rozvoz.',
      });
    }
  };

  const markOrderOnTheWay = async (orderId: string) => {
    const { error } = await updateOrder(orderId, { status: 'on_the_way' });
    if (!error) {
      toast({
        title: '🚚 Na ceste',
        description: 'Objednávka je na ceste k zákazníkovi.',
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const allOrdersFlat = sortedPendingOrders.flatMap(([_, item]) =>
      item.orders.map(order => order.id)
    );

    const oldIndex = allOrdersFlat.indexOf(active.id as string);
    const newIndex = allOrdersFlat.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderArray = arrayMove(allOrdersFlat, oldIndex, newIndex);

    const updatePromises = newOrderArray.map((orderId, index) =>
      updateOrder(orderId, { delivery_order: index + 1 })
    );

    await Promise.all(updatePromises);

    toast({
      title: 'Poradie zmenené',
      description: 'Poradie rozvozu bolo aktualizované.',
    });
  };

  const openInGoogleMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  const deliveredCount = deliveredOrders.length;
  const totalItemsCount = ordersForDate.length;
  const pendingCount = pendingOrders.length;

  const exportToExcel = () => {
    const rows: any[] = [];

    sortedPendingOrders.forEach(([key, item]) => {
      item.orders.forEach((order, idx) => {
        rows.push({
          'Status': idx === 0 ? 'Na rozvoz' : '',
          'Položka': idx === 0 ? item.name : '',
          'Balenia': idx === 0 ? getPackagingSummary(item.packagingSummary, item.name) : '',
          'Zákazník': order.customerName,
          'Balenie': `1x ${order.packagingSize}`,
          'Adresa': order.customerAddress || '',
        });
      });
    });

    if (sortedDeliveredOrders.length > 0) {
      rows.push({});
      rows.push({ 'Status': 'DORUČENÉ' });
      sortedDeliveredOrders.forEach(([key, item]) => {
        item.orders.forEach((order, idx) => {
          rows.push({
            'Status': '',
            'Položka': idx === 0 ? item.name : '',
            'Balenia': idx === 0 ? getPackagingSummary(item.packagingSummary, item.name) : '',
            'Zákazník': order.customerName,
            'Balenie': `1x ${order.packagingSize}`,
            'Adresa': order.customerAddress || '',
          });
        });
      });
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rozvoz');

    ws['!cols'] = [
      { wch: 18 },
      { wch: 25 },
      { wch: 18 },
      { wch: 25 },
      { wch: 12 },
      { wch: 35 },
    ];

    XLSX.writeFile(wb, `rozvoz-${format(selectedDate, 'yyyy-MM-dd')}.xlsx`);
  };

  const escapeHtml = (unsafe: string): string => {
    return unsafe.replace(/[&<>"']/g, (m) => {
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return escapeMap[m] || m;
    });
  };

  const exportToPDF = () => {
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rozvoz - ${format(selectedDate, 'd. MMMM yyyy', { locale: sk })}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 20px; }
          h2 { font-size: 18px; margin-top: 30px; margin-bottom: 10px; background: #f5f5f5; padding: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .checkbox { width: 20px; height: 20px; border: 2px solid #333; display: inline-block; margin-right: 10px; }
          .section { margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <h1>Rozvoz - ${format(selectedDate, 'd. MMMM yyyy', { locale: sk })}</h1>

        <div class="section">
          <h2>Na rozvoz (${pendingCount})</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">✓</th>
                <th>Položka</th>
                <th>Balenia</th>
                <th>Zákazník</th>
                <th>Balenie</th>
                <th>Adresa</th>
              </tr>
            </thead>
            <tbody>
              ${sortedPendingOrders.map(([key, item]) =>
                item.orders.map((order, idx) => `
                  <tr>
                    <td><span class="checkbox"></span></td>
                    <td>${idx === 0 ? escapeHtml(item.name) : ''}</td>
                    <td>${idx === 0 ? escapeHtml(getPackagingSummary(item.packagingSummary, item.name)) : ''}</td>
                    <td>${escapeHtml(order.customerName)}</td>
                    <td>1x ${escapeHtml(order.packagingSize)}</td>
                    <td>${escapeHtml(order.customerAddress || '')}</td>
                  </tr>
                `).join('')
              ).join('')}
            </tbody>
          </table>
        </div>

        ${sortedDeliveredOrders.length > 0 ? `
        <div class="section">
          <h2>Doručené (${deliveredCount})</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">✓</th>
                <th>Položka</th>
                <th>Balenia</th>
                <th>Zákazník</th>
                <th>Balenie</th>
                <th>Adresa</th>
              </tr>
            </thead>
            <tbody>
              ${sortedDeliveredOrders.map(([key, item]) =>
                item.orders.map((order, idx) => `
                  <tr>
                    <td><span class="checkbox"></span></td>
                    <td>${idx === 0 ? escapeHtml(item.name) : ''}</td>
                    <td>${idx === 0 ? escapeHtml(getPackagingSummary(item.packagingSummary, item.name)) : ''}</td>
                    <td>${escapeHtml(order.customerName)}</td>
                    <td>1x ${escapeHtml(order.packagingSize)}</td>
                    <td>${escapeHtml(order.customerAddress || '')}</td>
                  </tr>
                `).join('')
              ).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Dates with orders for calendar highlighting
  const orderDates = orders
    .filter(o => ['ready', 'packed', 'on_the_way', 'delivered'].includes(o.status || '') && o.delivery_date)
    .map(o => startOfDay(new Date(o.delivery_date!)));

  if (isLoading) {
    return (
      <MainLayout>
        <PageHeader
          title="Rozvoz"
          description="Prehľad objednávok na rozvoz"
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Načítavam dáta...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

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
            const selected = selectedDates.some(d => isSameDay(d, day));

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
                  const exists = selectedDates.some(d => isSameDay(d, day));
                  if (exists) {
                    setSelectedDates(prev => prev.filter(d => !isSameDay(d, day)));
                  } else {
                    setSelectedDates(prev => [...prev, day]);
                  }
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
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full ring-2 ring-blue-500" />
            <span>Vybraný deň</span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 text-gray-600">
            <span className="font-medium">Tip:</span> Kliknutím vyberte/zrušte dni
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <PageHeader
        title="Rozvoz"
        description="Prehľad objednávok na rozvoz"
      >
      </PageHeader>
      {/* DESKTOP Filter - rovnaké šírky, centrované labely */}
      <div className="hidden md:block space-y-3 p-4 bg-white border-b mb-6">

        {/* Typ zákazníka - presné ikony z HarvestPackingPage */}
        <div className="flex justify-start">
          <CustomerTypeFilter
            value={selectedCustomerType}
            onChange={setSelectedCustomerType}
          />
        </div>

        {/* Polia s labelmi - VŠETKY flex-1, centrované labely */}
        <div className="flex gap-3 items-end">

          {/* Dátum rozvozu - flex-1 */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium text-gray-700 text-center">
              Dátum rozvozu
            </label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 w-full">
                  <CalendarIcon className="h-4 w-4 text-gray-500 shrink-0" />
                  <span>
                    {selectedDates.length === 1
                      ? format(selectedDates[0], 'd. MMM', { locale: sk })
                      : `${selectedDates.length} dní`}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarGrid />
              </PopoverContent>
            </Popover>
          </div>

          {/* Zákazník - flex-1 */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium text-gray-700 text-center">
              Zákazník
            </label>
            <SearchableCustomerSelect
              customers={customers}
              value={customerFilter}
              onValueChange={setCustomerFilter}
              placeholder="Všetci zákazníci"
              filterByType={selectedCustomerType}
              allowAll={true}
              className="w-full"
            />
          </div>

          {/* Rozvozová trasa - flex-1 */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium text-gray-700 text-center">
              Rozvozová trasa
            </label>
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="text-sm border-gray-300 w-full">
                <Navigation className="h-4 w-4 text-gray-500 mr-2 shrink-0" />
                <SelectValue placeholder="Všetky trasy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetky trasy</SelectItem>
                {routes.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zobraziť doručené - flex-1 */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium text-gray-700 text-center">
              Zobraziť doručené
            </label>
            <div className="flex items-center justify-center border border-gray-300 rounded-lg py-2 bg-white h-10">
              <Switch
                checked={showArchive}
                onCheckedChange={setShowArchive}
              />
            </div>
          </div>

          <div className="flex gap-2 items-end pb-0.5">
            <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>

        </div>
      </div>

      {/* MOBILE Filter */}
      <Card className="block md:hidden p-4 mb-6">
        {/* Riadok 1: Dátum rozvozu */}
        <div className="mb-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDates.length === 1
                  ? format(selectedDates[0], 'd. MMMM yyyy', { locale: sk })
                  : `${selectedDates.length} dní`
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarGrid />
            </PopoverContent>
          </Popover>
        </div>

        {/* Riadok 2: Typ zákazníka */}
        <div className="mb-3">
          <CustomerTypeFilter
            value={selectedCustomerType}
            onChange={setSelectedCustomerType}
            showLabel={false}
          />
        </div>

        {/* Riadok 3: Zákazník + Trasa vedľa seba */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <SearchableCustomerSelect
              customers={customers}
              value={customerFilter}
              onValueChange={setCustomerFilter}
              placeholder="Všetci zákazníci"
              filterByType={selectedCustomerType}
              allowAll={true}
            />
          </div>
          <div className="flex-1">
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="text-sm">
                <Navigation className="h-3.5 w-3.5 text-gray-500 mr-1 shrink-0" />
                <SelectValue placeholder="Všetky trasy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetky trasy</SelectItem>
                {routes.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Riadok 4: Zobraziť doručené */}
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <Switch
            checked={showArchive}
            onCheckedChange={setShowArchive}
          />
          Zobraziť doručené
        </label>
      </Card>

      <div className="space-y-6">
        {/* Finančný report - vždy hore ak sú nejaké objednávky */}
        {allOrdersForReport.length > 0 && (
          <Card className="p-4 bg-green-50 border-green-200">
            <button
              onClick={() => setFinancialReportOpen(true)}
              className="w-full flex items-center justify-between hover:bg-green-100 rounded-lg p-2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Euro className="h-6 w-6 text-green-600" />
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Finančné zúčtovanie rozvozu
                  </h3>
                  <p className="text-sm text-gray-600">
                    {format(selectedDate, 'd. MMMM yyyy', { locale: sk })} • {totalItemsCount} položiek • {pendingCount} na rozvoz • {deliveredCount} doručených
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </Card>
        )}

        {sortedPendingOrders.length === 0 && sortedDeliveredOrders.length === 0 ? (
          <EmptyState
            icon={<Truck className="h-8 w-8" />}
            title="Žiadne položky"
            description="Na tento deň nie sú naplánované žiadne rozvozy."
          />
        ) : (
          <>
            {/* Pending Orders Section */}
            {sortedPendingOrders.length > 0 && (
              <Card className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Na rozvoz</h3>
                      <p className="text-sm text-muted-foreground">
                        {pendingCount} {pendingCount === 1 ? 'položka' : pendingCount < 5 ? 'položky' : 'položiek'} na doručenie
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const packedOrders = pendingOrders.filter(o => o.status === 'packed');
                      if (packedOrders.length === 0) {
                        toast({ title: 'Žiadne zabalené objednávky', description: 'Nie sú žiadne zabalené objednávky na prepnutie.' });
                        return;
                      }
                      if (!window.confirm(`Prepnúť ${packedOrders.length} zabalených objednávok na "Na ceste"?`)) return;
                      for (const order of packedOrders) {
                        await updateOrder(order.id, { status: 'on_the_way' });
                      }
                      await refetchOrders();
                      toast({ title: '🚚 Rozvoz spustený!', description: `${packedOrders.length} objednávok je teraz na ceste.` });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
                  >
                    <Truck className="h-4 w-4" />
                    🚚 Štart rozvozu
                  </button>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  {/* Mobile karty */}
                  <div className="block md:hidden space-y-3 mb-4">
                    {sortedPendingOrders.map(([key, item]) =>
                      item.orders.map(order => (
                        <div
                          key={order.id}
                          className={`rounded-2xl border-2 overflow-hidden shadow-sm cursor-pointer ${
                            order.status === 'on_the_way'
                              ? 'border-blue-400 bg-blue-50'
                              : order.status === 'packed'
                              ? 'border-amber-400 bg-amber-50'
                              : 'border-gray-200 bg-white'
                          }`}
                          onClick={() => setExpandedOrderIds(prev => {
                            const next = new Set(prev);
                            if (next.has(order.id)) {
                              next.delete(order.id);
                            } else {
                              next.add(order.id);
                            }
                            return next;
                          })}
                        >
                          {/* Status bar */}
                          <div className={`px-4 py-1.5 flex items-center justify-between ${
                            order.status === 'on_the_way'
                              ? 'bg-blue-500'
                              : order.status === 'packed'
                              ? 'bg-amber-500'
                              : 'bg-gray-400'
                          }`}>
                            <span className="text-white text-xs font-bold">
                              {order.status === 'on_the_way' ? '🚚 Na ceste' :
                               order.status === 'packed' ? '📦 Zabalená' : '✓ Pripravená'}
                            </span>
                            {order.isPaid && (
                              <span className="text-white text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                                💳 Zaplatené
                              </span>
                            )}
                          </div>

                          <div className="p-4">
                            {/* Meno + Cena */}
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-bold text-xl text-gray-900">{order.customerName}</p>
                                {order.customerAddress && (
                                  <p className="text-xs text-gray-500 mt-0.5">{order.customerAddress}</p>
                                )}
                                {order.deliveryNotes && (
                                  <p className="text-xs text-amber-600 mt-0.5">📍 {order.deliveryNotes}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">{order.totalPrice.toFixed(2)} €</p>
                                {(order.deliveryFee || 0) > 0 ? (
                                  <p className="text-xs text-gray-400">vrátane {order.deliveryFee.toFixed(2)} € doprava</p>
                                ) : (
                                  <p className="text-xs text-green-500 font-medium">doprava zdarma</p>
                                )}
                              </div>
                            </div>
                            {(order as any).voucherCode && (
                              <div className="mt-2 mb-2 px-3 py-2 bg-green-100 rounded-xl border border-green-300 w-full">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold text-green-700">💳 Zaplatené poukazom</p>
                                  <p className="text-xs font-bold text-green-700">-{((order as any).voucherDiscount || 0).toFixed(2)} €</p>
                                </div>
                                {((order as any).voucherDiscount || 0) >= order.totalPrice ? (
                                  <p className="text-xs text-green-600 mt-0.5">✅ Plne hradené — nepýtať hotovosť</p>
                                ) : (
                                  <p className="text-xs text-green-600 mt-0.5">
                                    K úhrade v hotovosti: {Math.max(0, order.totalPrice - ((order as any).voucherDiscount || 0)).toFixed(2)} €
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Vždy viditeľné mini tlačidlá */}
                            {!expandedOrderIds.has(order.id) && (
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                {(() => {
                                  const fullyPaidByVoucher = (order.voucherDiscount || 0) >= order.totalPrice && order.totalPrice > 0;
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (fullyPaidByVoucher) return;
                                        if (order.isPaid) {
                                          handleMarkAsUnpaid(order.id, order.notes);
                                        } else {
                                          handleMarkAsPaid(order.id, order.notes);
                                        }
                                      }}
                                      disabled={fullyPaidByVoucher}
                                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                                        fullyPaidByVoucher
                                          ? 'bg-green-600 text-white opacity-75 cursor-not-allowed'
                                          : order.isPaid
                                          ? 'bg-green-600 text-white'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      <CreditCard className="h-5 w-5" />
                                      {fullyPaidByVoucher ? '✅ Poukazom' : order.isPaid ? 'Zaplatené' : 'Nezaplatené'}
                                    </button>
                                  );
                                })()}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markOrderDelivered(order.id);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-green-600 hover:text-white transition-colors"
                                >
                                  <CheckCircle2 className="h-5 w-5" />
                                  Doručené
                                </button>
                              </div>
                            )}

                            {/* Rozbalený obsah */}
                            {expandedOrderIds.has(order.id) && (
                              <div onClick={(e) => e.stopPropagation()}>
                                {/* Položky */}
                                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
                                  {order.itemsDetail.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span className="text-gray-700">{item.quantity} × {item.size}g {item.name}</span>
                                      <span className="font-semibold text-gray-900">{item.price.toFixed(2)} €</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Akčné tlačidlá — veľké, dobre klikateľné */}
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  {/* Navigácia */}
                                  {order.customerAddress && (
                                    <div className="flex gap-1">
                                      <a
                                        href={navApp === 'waze'
                                          ? `https://waze.com/ul?q=${encodeURIComponent(order.customerAddress)}`
                                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress)}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm"
                                      >
                                        <Navigation className="h-5 w-5" />
                                        {navApp === 'waze' ? 'Waze' : 'Maps'}
                                      </a>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleNavToggle(); }}
                                        className="px-3 py-3 bg-blue-100 text-blue-700 rounded-xl text-xs font-bold"
                                      >
                                        ⇄
                                      </button>
                                    </div>
                                  )}

                                  {/* Telefón */}
                                  {order.customerPhone && (
                                    <a
                                      href={`tel:${order.customerPhone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm"
                                    >
                                      <Phone className="h-5 w-5" />
                                      Volať
                                    </a>
                                  )}
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                  {/* Zaplatené */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (order.isPaid) {
                                        handleMarkAsUnpaid(order.id, order.notes);
                                      } else {
                                        handleMarkAsPaid(order.id, order.notes);
                                      }
                                    }}
                                    className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-xs font-bold transition-colors ${
                                      order.isPaid
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    <CreditCard className="h-6 w-6" />
                                    {order.isPaid ? 'Zaplatené' : 'Nezaplatené'}
                                  </button>

                                  {/* Na ceste - len ak packed */}
                                  {order.status === 'packed' ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markOrderOnTheWay(order.id);
                                      }}
                                      className="flex flex-col items-center justify-center gap-1 py-3 bg-blue-500 text-white rounded-xl text-xs font-bold"
                                    >
                                      <Truck className="h-6 w-6" />
                                      Na ceste
                                    </button>
                                  ) : (
                                    <div className="rounded-xl bg-gray-50" />
                                  )}

                                  {/* Doručené */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markOrderDelivered(order.id);
                                    }}
                                    className="flex flex-col items-center justify-center gap-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-green-600 hover:text-white transition-colors"
                                  >
                                    <CheckCircle2 className="h-6 w-6" />
                                    Doručené
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop tabuľka */}
                  <div className="hidden md:block rounded-lg border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="h-10">
                          <TableHead className="w-12"></TableHead>
                          <TableHead className="text-center font-bold text-base">Zákazník</TableHead>
                          <TableHead className="hidden lg:table-cell text-center font-bold text-base">Adresa</TableHead>
                          <TableHead className="hidden lg:table-cell text-center font-bold text-base">Kontakt</TableHead>
                          <TableHead className="text-center font-bold text-base">Cena</TableHead>
                          <TableHead className="hidden md:table-cell text-center font-bold text-base">Akcia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <SortableContext
                          items={sortedPendingOrders.flatMap(([_, item]) => item.orders.map(o => o.id))}
                          strategy={verticalListSortingStrategy}
                        >
                          {sortedPendingOrders.map(([key, item]) => (
                            item.orders.map((order, orderIdx) => (
                              <SortableOrderRow
                                key={order.id}
                                order={order}
                                orderIdx={orderIdx}
                                item={item}
                                getCropColor={getCropColor}
                                getPackagingSummary={getPackagingSummary}
                                openInGoogleMaps={openInGoogleMaps}
                                markOrderDelivered={markOrderDelivered}
                                markOrderOnTheWay={markOrderOnTheWay}
                                handleMarkAsPaid={handleMarkAsPaid}
                                handleMarkAsUnpaid={handleMarkAsUnpaid}
                                navigationMode={navigationMode}
                                setNavigationMode={setNavigationMode}
                                onOrderClick={(order) => {
                                  setSelectedOrderDetail(order);
                                  setDetailModalOpen(true);
                                }}
                              />
                            ))
                          ))}
                        </SortableContext>
                      </TableBody>
                    </Table>
                  </div>
                </DndContext>
              </Card>
            )}

            {/* Delivered Orders Section */}
            {sortedDeliveredOrders.length > 0 && (
              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Doručené dnes</h3>
                    <p className="text-sm text-muted-foreground">
                      {deliveredCount} {deliveredCount === 1 ? 'položka' : deliveredCount < 5 ? 'položky' : 'položiek'} úspešne doručených
                    </p>
                  </div>
                </div>

                {/* Mobile karty - Delivered */}
                <div className="block md:hidden space-y-3">
                  {sortedDeliveredOrders.map(([key, item]) =>
                    item.orders.map(order => (
                      <div
                        key={order.id}
                        className="bg-success/5 rounded-lg border border-success/20 p-4 cursor-pointer"
                        onClick={() => {
                          setSelectedOrderDetail(order);
                          setDetailModalOpen(true);
                        }}
                      >
                        {/* Riadok 1: Meno + Cena */}
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-base text-success">{order.customerName}</span>
                          <span className="text-green-600/60 font-bold text-lg">
                            {order.totalPrice.toFixed(2)} €
                          </span>
                        </div>

                        {/* Riadok 3: Akčné tlačidlá */}
                        <div className="flex items-center gap-2 pt-3 border-t border-success/20">
                          {/* Telefón */}
                          {order.customerPhone && (
                            <a
                              href={`tel:${order.customerPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100"
                            >
                              <Phone className="h-5 w-5 text-blue-600" />
                            </a>
                          )}

                          {/* Navigácia */}
                          {order.customerAddress && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openNavigation(order.customerAddress);
                                }}
                                onTouchStart={(e) => {
                                  const startX = e.touches[0].clientX;
                                  const handleTouchMove = (moveEvent: TouchEvent) => {
                                    const deltaX = moveEvent.touches[0].clientX - startX;
                                    if (Math.abs(deltaX) > 30) {
                                      handleNavToggle();
                                      document.removeEventListener('touchmove', handleTouchMove);
                                    }
                                  };
                                  document.addEventListener('touchmove', handleTouchMove);
                                  document.addEventListener('touchend', () => {
                                    document.removeEventListener('touchmove', handleTouchMove);
                                  }, { once: true });
                                }}
                                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 active:bg-blue-200 select-none"
                              >
                                <Navigation className="h-5 w-5 text-blue-600" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavToggle();
                                }}
                                className="text-xs text-gray-500 px-2 py-1 rounded bg-gray-100"
                              >
                                {navApp === 'waze' ? 'Waze' : 'Maps'}
                              </button>
                            </>
                          )}

                          <div className="flex-1" />

                          {/* Späť */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              returnToReady(order.id);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700"
                          >
                            <Undo2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Späť</span>
                          </button>

                          {/* Zaplatené */}
                          {order.paymentMethod !== 'invoice' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (order.isPaid) {
                                  handleMarkAsUnpaid(order.id, order.notes);
                                } else {
                                  handleMarkAsPaid(order.id, order.notes);
                                }
                              }}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                                order.isPaid
                                  ? 'bg-success text-white'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              <CreditCard className="h-6 w-6" />
                              <span className="hidden sm:inline">Zapl.</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop tabuľka - Delivered */}
                <div className="hidden md:block rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-10">
                        <TableHead className="text-center font-bold text-base">Zákazník</TableHead>
                        <TableHead className="hidden lg:table-cell text-center font-bold text-base">Adresa</TableHead>
                        <TableHead className="hidden lg:table-cell text-center font-bold text-base">Kontakt</TableHead>
                        <TableHead className="text-center font-bold text-base">Cena</TableHead>
                        <TableHead className="hidden md:table-cell text-center font-bold text-base">Akcia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedDeliveredOrders.map(([key, item]) => (
                        item.orders.map((order, orderIdx) => (
                          <TableRow
                            key={order.id}
                            className="bg-success/5 cursor-pointer hover:bg-success/10 transition-colors h-10"
                            onClick={() => {
                              setSelectedOrderDetail(order);
                              setDetailModalOpen(true);
                            }}
                          >
                            {/* ZÁKAZNÍK */}
                            <TableCell className="text-center text-muted-foreground py-0.5">
                              <span className="font-bold text-lg">{order.customerName}</span>
                            </TableCell>

                            {/* ADRESA */}
                            <TableCell className="hidden lg:table-cell text-center text-muted-foreground py-0.5">
                              {order.customerAddress && (
                                <span className="text-sm">{order.customerAddress}</span>
                              )}
                            </TableCell>

                            {/* KONTAKT */}
                            <TableCell className="hidden lg:table-cell text-muted-foreground py-0.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col items-center gap-2">
                                {/* Telefón */}
                                {order.customerPhone && (
                                  <a
                                    href={`tel:${order.customerPhone}`}
                                    className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                                  >
                                    <Phone className="h-4 w-4" />
                                    {order.customerPhone}
                                  </a>
                                )}

                                {/* Swipe navigácia */}
                                {order.customerAddress && (
                                  <div
                                    className="relative select-none cursor-grab active:cursor-grabbing"
                                    onTouchStart={(e) => {
                                      const startX = e.touches[0].clientX;
                                      const handleTouchMove = (moveEvent: TouchEvent) => {
                                        const deltaX = moveEvent.touches[0].clientX - startX;
                                        if (Math.abs(deltaX) > 50) {
                                          setNavigationMode(prev => ({
                                            ...prev,
                                            [order.id]: prev[order.id] === 'waze' ? 'maps' : 'waze'
                                          }));
                                          document.removeEventListener('touchmove', handleTouchMove);
                                        }
                                      };
                                      document.addEventListener('touchmove', handleTouchMove);
                                      document.addEventListener('touchend', () => {
                                        document.removeEventListener('touchmove', handleTouchMove);
                                      }, { once: true });
                                    }}
                                  >
                                    {(navigationMode[order.id] || 'waze') === 'waze' ? (
                                      <a
                                        href={`https://waze.com/ul?q=${encodeURIComponent(order.customerAddress)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                                      >
                                        <Navigation className="h-4 w-4" />
                                        Waze
                                      </a>
                                    ) : (
                                      <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.customerAddress)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-green-600 hover:underline text-sm"
                                      >
                                        <Navigation className="h-4 w-4" />
                                        Maps
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* CENA */}
                            <TableCell className="text-center text-muted-foreground py-0.5">
                              <div className="text-xl font-bold text-green-600/60 dark:text-green-500/60">
                                {order.totalPrice.toFixed(2)} €
                              </div>
                              {(order.deliveryFee || 0) > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  (vrátane dopravy {(order.deliveryFee || 0).toFixed(2)} €)
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-0.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">

                                {/* Späť do Ready ikona */}
                                <button
                                  title="Vrátiť späť"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    returnToReady(order.id);
                                  }}
                                  className="p-2 rounded-full text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                >
                                  <Undo2 className="h-6 w-6" />
                                </button>

                                {/* Zaplatené ikona - ak nie je invoice */}
                                {order.paymentMethod === 'invoice' ? (
                                  <div
                                    title="Uhradené faktúrou"
                                    className="p-2 rounded-full text-blue-600 bg-blue-50"
                                  >
                                    <CreditCard className="h-6 w-6" />
                                  </div>
                                ) : (
                                  <button
                                    title={order.isPaid ? "Označiť ako nezaplatené" : "Označiť ako zaplatené"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (order.isPaid) {
                                        handleMarkAsUnpaid(order.id, order.notes);
                                      } else {
                                        handleMarkAsPaid(order.id, order.notes);
                                      }
                                    }}
                                    className={`p-2 rounded-full transition-colors ${
                                      order.isPaid
                                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                  >
                                    <CreditCard className="h-6 w-6" />
                                  </button>
                                )}

                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Detail objednávky</DialogTitle>
          </DialogHeader>
          {selectedOrderDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Zákazník</div>
                  <div className="font-semibold text-gray-900">{selectedOrderDetail.customerName || 'Bez názvu'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Dátum dodania</div>
                  <div className="font-semibold text-gray-900">
                    {format(new Date(selectedDate), 'dd. MM. yyyy', { locale: sk })}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-600">Platobná metóda</div>
                  <div className="font-semibold text-gray-900">
                    {selectedOrderDetail.paymentMethod === 'cash' ? 'Hotovosť' :
                     selectedOrderDetail.paymentMethod === 'invoice' ? 'Faktúra' : 'Iné'}
                  </div>
                </div>
              </div>

              {selectedOrderDetail.customerAddress && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-semibold text-blue-900 mb-1">Adresa:</div>
                  <div className="text-sm text-blue-800">{selectedOrderDetail.customerAddress}</div>
                </div>
              )}

              {selectedOrderDetail.deliveryNotes && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-sm font-semibold text-amber-900 mb-1">Poznámky k doručeniu:</div>
                  <div className="text-sm text-amber-800">{selectedOrderDetail.deliveryNotes}</div>
                </div>
              )}

              {selectedOrderDetail.notes && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-semibold text-blue-900 mb-1">Poznámky:</div>
                  <div className="text-sm text-blue-800">{selectedOrderDetail.notes}</div>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-semibold text-base mb-3">Položky objednávky:</h3>
                <div className="space-y-2">
                  {selectedOrderDetail.itemsDetail
                    .sort((a, b) => {
                      // Sort by price descending (most expensive first)
                      return b.price - a.price;
                    })
                    .map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {item.quantity} × {item.size} g {item.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {item.price.toFixed(2)} €
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Medzisúčet:</span>
                  <span className="font-semibold text-gray-900">
                    {(selectedOrderDetail.totalPrice - (selectedOrderDetail.deliveryFee || 0)).toFixed(2)}€
                  </span>
                </div>
                {(selectedOrderDetail.deliveryFee || 0) > 0 ? (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Doprava:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {(selectedOrderDetail.deliveryFee || 0).toFixed(2)} €
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600 flex items-center gap-1 font-medium">
                      <Truck className="h-3 w-3" />
                      Doprava: Zdarma
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="text-lg text-gray-700 font-semibold">Celkom:</span>
                  <span className="text-3xl font-bold text-green-600">
                    {selectedOrderDetail.totalPrice.toFixed(2)} €
                  </span>
                </div>
                {(selectedOrderDetail as any).voucherCode && (
                  <div className="mt-3 p-3 bg-green-50 rounded-xl border-2 border-green-300">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-green-700">💳 Darčekový poukaz</p>
                      <p className="text-sm font-bold text-green-700">
                        -{((selectedOrderDetail as any).voucherDiscount || 0).toFixed(2)} €
                      </p>
                    </div>
                    <p className="text-xs text-green-600 font-mono mb-1">
                      Kód: {(selectedOrderDetail as any).voucherCode}
                    </p>
                    {((selectedOrderDetail as any).voucherDiscount || 0) >= selectedOrderDetail.totalPrice ? (
                      <p className="text-sm font-bold text-green-700 text-center mt-2 py-1 bg-green-100 rounded-lg">
                        ✅ Plne hradené poukazom — NEPÝTAŤ HOTOVOSŤ
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-orange-600 text-center mt-2 py-1 bg-orange-50 rounded-lg border border-orange-200">
                        💵 K úhrade v hotovosti: {Math.max(0, selectedOrderDetail.totalPrice - ((selectedOrderDetail as any).voucherDiscount || 0)).toFixed(2)} €
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setDetailModalOpen(false)}
                >
                  Zavrieť
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Finančný report dialog */}
      <Dialog open={financialReportOpen} onOpenChange={setFinancialReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              💰 Finančné zúčtovanie rozvozu
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Hlavné súčty */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-600">Tovar</div>
                <div className="text-lg font-bold text-blue-600">
                  {calculateItemsTotal().toFixed(2)} €
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-600">Doprava</div>
                <div className="text-lg font-bold text-orange-600">
                  {calculateDeliveryTotal().toFixed(2)} €
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-600">Celkom</div>
                <div className="text-lg font-bold text-green-600">
                  {calculateGrandTotal().toFixed(2)} €
                </div>
              </div>
            </div>

            {/* Platby */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-gray-600">✅ Zaplatené</div>
                <div className="text-base font-bold text-green-600">
                  {calculatePaid().toFixed(2)} €
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs text-gray-600">⏳ Nezaplatené</div>
                <div className="text-base font-bold text-red-600">
                  {calculateUnpaid().toFixed(2)} €
                </div>
              </div>
            </div>

            {/* Podľa typu */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-600">🏠 Domácnosti</div>
                <div className="text-base font-bold">
                  {calculateHouseholds().toFixed(2)} €
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-xs text-gray-600">🍴 Gastro/VO</div>
                <div className="text-base font-bold text-orange-600">
                  {calculateGastro().toFixed(2)} €
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

export default function DeliveryPageWithErrorBoundary() {
  return (
    <ErrorBoundary fullScreen fallbackMessage="Chyba pri načítavaní modulu Rozvoz">
      <DeliveryPage />
    </ErrorBoundary>
  );
}
