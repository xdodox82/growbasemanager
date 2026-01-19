import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrders, useCustomers, useCrops, useBlends, useOrderItems, useDeliveryRoutes } from '@/hooks/useSupabaseData';
import { usePrices, useVatSettings } from '@/hooks/usePrices';
import { Truck, FileSpreadsheet, FileText, CheckCircle2, CalendarIcon, Filter, Undo2, Navigation, CreditCard, Euro, Home, UtensilsCrossed, Building2, Settings, GripVertical, Phone } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, isSameDay, startOfDay } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useInventoryConsumption } from '@/hooks/useInventoryConsumption';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { RouteManagement } from '@/components/delivery/RouteManagement';
import { DeliveryDaysSettings } from '@/components/delivery/DeliveryDaysSettings';
import { CustomerTypeFilter } from '@/components/filters/CustomerTypeFilter';
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
  selectedOrderIds: Set<string>;
  toggleOrderSelection: (orderId: string) => void;
  getCropColor: (cropId: string | null) => string;
  getPackagingSummary: (summary: Record<string, number>, itemName?: string) => string;
  openInGoogleMaps: (address: string) => void;
  markOrderDelivered: (orderId: string) => void;
  handleMarkAsPaid: (orderId: string, notes: string | null) => void;
  handleMarkAsUnpaid: (orderId: string, notes: string | null) => void;
}

function SortableOrderRow({
  order,
  orderIdx,
  item,
  selectedOrderIds,
  toggleOrderSelection,
  getCropColor,
  getPackagingSummary,
  openInGoogleMaps,
  markOrderDelivered,
  handleMarkAsPaid,
  handleMarkAsUnpaid,
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

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'relative z-50' : ''}>
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            className="cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
          <Checkbox
            checked={selectedOrderIds.has(order.id)}
            onCheckedChange={() => toggleOrderSelection(order.id)}
          />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate">{order.customerName}</span>
            {order.customerPhone && (
              <a
                href={`tel:${order.customerPhone}`}
                className="flex-shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors"
                title={`Zavolať ${order.customerPhone}`}
              >
                <Phone className="h-4 w-4 text-green-600 dark:text-green-500" />
              </a>
            )}
          </div>
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
      <TableCell className="hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {order.itemsDetail.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5 mr-2 mb-1">
              <Badge variant="secondary" className="text-xs font-normal">
                {item.quantity} x {item.size} {item.name}
              </Badge>
              <span className="text-xs font-semibold text-green-600 dark:text-green-500">
                {item.price.toFixed(2)} €
              </span>
            </div>
          ))}
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {order.customerAddress && (
          <div className="flex items-center gap-2">
            <span className="truncate max-w-xs text-xs">{order.customerAddress}</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 flex-shrink-0"
                  title="Navigácia"
                >
                  <Navigation className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start gap-2 h-9"
                    onClick={() => {
                      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress!)}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Navigation className="h-4 w-4" />
                    Google Maps
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start gap-2 h-9"
                    onClick={() => {
                      const url = `https://waze.com/ul?q=${encodeURIComponent(order.customerAddress!)}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Navigation className="h-4 w-4" />
                    Waze
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="text-right">
          <div className="text-xl font-bold text-green-600 dark:text-green-500">
            {order.totalPrice.toFixed(2)} €
          </div>
          {(order.deliveryFee || 0) > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              (vrátane dopravy {(order.deliveryFee || 0).toFixed(2)} €)
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => markOrderDelivered(order.id)}
            className="gap-1 h-8"
          >
            <CheckCircle2 className="h-3 w-3" />
            Doručené
          </Button>
          {order.paymentMethod === 'invoice' ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
              <CreditCard className="h-3 w-3" />
              <span>Uhradené faktúrou</span>
            </div>
          ) : order.isPaid ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleMarkAsUnpaid(order.id, order.notes)}
              className="gap-1 h-8 text-success"
            >
              <CreditCard className="h-3 w-3" />
              Zaplatené ✓
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarkAsPaid(order.id, order.notes)}
              className="gap-1 h-8"
            >
              <CreditCard className="h-3 w-3" />
              Označiť zaplatené
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function DeliveryPage() {
  const { data: orders, update: updateOrder, loading: ordersLoading } = useOrders();
  const { data: customers, loading: customersLoading } = useCustomers();
  const { data: crops, loading: cropsLoading } = useCrops();
  const { data: blends, loading: blendsLoading } = useBlends();
  const { data: orderItems, loading: orderItemsLoading } = useOrderItems();
  const { data: routes, loading: routesLoading } = useDeliveryRoutes();
  const { getPrice } = usePrices();
  const { calculateWithVat, isVatEnabled, vatRate } = useVatSettings();
  const { toast } = useToast();
  const { consumeOrderInventory } = useInventoryConsumption();

  const isLoading = ordersLoading || customersLoading || cropsLoading || blendsLoading || orderItemsLoading || routesLoading;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showArchive, setShowArchive] = useState(true);

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;

    setSelectedOrderIds(new Set());
    setSelectedDate(date);
  };

  // Get orders for delivery on the selected date
  let ordersForDate = orders.filter(order => {
    if (!order.delivery_date) return false;
    if (!isSameDay(startOfDay(new Date(order.delivery_date)), startOfDay(selectedDate))) return false;

    // Filter by status based on archive setting
    if (showArchive) {
      return order.status === 'ready' || order.status === 'delivered';
    } else {
      return order.status === 'ready';
    }
  });

  // Filter by customer type if selected
  if (selectedCustomerType !== 'all') {
    ordersForDate = ordersForDate.filter(order => {
      const customer = customers.find(c => c.id === order.customer_id);
      return customer?.customer_type === selectedCustomerType;
    });
  }

  // Filter by route if selected
  if (routeFilter !== 'all') {
    ordersForDate = ordersForDate.filter(order => {
      const customer = customers.find(c => c.id === order.customer_id);
      return customer?.delivery_route_id === routeFilter;
    });
  }

  // Split into pending (ready) and delivered orders
  const pendingOrders = ordersForDate.filter(order => order.status === 'ready');
  const deliveredOrders = ordersForDate.filter(order => order.status === 'delivered');

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
    const items = orderItems.filter(item => item.order_id === order.id);

    if (items.length > 0) {
      // Multi-item order
      return items.reduce((total, item) => {
        const unitPrice = getPrice(item.crop_id, item.blend_id, item.packaging_size || '100g', customerType || undefined);
        const itemTotal = (unitPrice || 0) * item.quantity;
        return total + calculateWithVat(itemTotal);
      }, 0);
    } else {
      // Single-item order (legacy)
      const unitPrice = getPrice(order.crop_id, order.blend_id, order.packaging_size || '100g', customerType || undefined);
      const total = (unitPrice || 0) * order.quantity;
      return calculateWithVat(total);
    }
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
    if (!route) return 0;

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
    return order.notes?.toLowerCase().includes('zaplatené') || order.notes?.toLowerCase().includes('zaplatene') || false;
  };

  // Mark order as paid
  const handleMarkAsPaid = async (orderId: string, currentNotes: string | null) => {
    const newNotes = currentNotes ? `${currentNotes} | Zaplatené` : 'Zaplatené';
    const { error } = await updateOrder(orderId, { notes: newNotes });
    if (!error) {
      toast({
        title: 'Platba zaznamenaná',
        description: 'Objednávka bola označená ako zaplatená.'
      });
    }
  };

  // Mark order as unpaid
  const handleMarkAsUnpaid = async (orderId: string, currentNotes: string | null) => {
    const newNotes = currentNotes?.replace(/\s*\|\s*Zaplatené/gi, '').replace(/Zaplatené\s*\|?\s*/gi, '').replace(/zaplatené/gi, '').trim() || '';
    const { error } = await updateOrder(orderId, { notes: newNotes || null });
    if (!error) {
      toast({
        title: 'Platba zrušená',
        description: 'Označenie platby bolo odstránené.'
      });
    }
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
      const unitPrice = getPrice(item.crop_id, item.blend_id, item.packaging_size || '100g', customerType || undefined);
      const itemTotal = calculateWithVat((unitPrice || 0) * item.quantity);
      return {
        quantity: item.quantity,
        name: itemName,
        size: item.packaging_size,
        price: itemTotal,
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
      const orderTotal = calculateOrderTotal(order, customerType);
      const chargeDelivery = (order as any).charge_delivery !== false;
      const deliveryFee = calculateDeliveryFee(orderTotal, customer, route, customerType, chargeDelivery);

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
        itemsDetail: itemsDetail || [{
          quantity: 1,
          name: getItemName(order),
          size: order.packaging_size || '50g',
          price: calculateOrderTotal(order, customerType),
        }],
        deliveryOrder: (order as any).delivery_order || 999,
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
    return sortedPendingOrders
      .map(([key, group]) => {
        let filteredOrders = group.orders;

        if (selectedCustomerType !== 'all') {
          filteredOrders = filteredOrders.filter(o => o.customerType === selectedCustomerType);
        }

        if (paymentFilter === 'paid') {
          filteredOrders = filteredOrders.filter(o => o.isPaid);
        } else if (paymentFilter === 'unpaid') {
          filteredOrders = filteredOrders.filter(o => !o.isPaid);
        }

        return [key, { ...group, orders: filteredOrders }] as [string, typeof group];
      })
      .filter(([_, group]) => group.orders.length > 0);
  }, [sortedPendingOrders, selectedCustomerType, paymentFilter]);

  const filteredDeliveredOrders = useMemo(() => {
    return sortedDeliveredOrders
      .map(([key, group]) => {
        let filteredOrders = group.orders;

        if (selectedCustomerType !== 'all') {
          filteredOrders = filteredOrders.filter(o => o.customerType === selectedCustomerType);
        }

        if (paymentFilter === 'paid') {
          filteredOrders = filteredOrders.filter(o => o.isPaid);
        } else if (paymentFilter === 'unpaid') {
          filteredOrders = filteredOrders.filter(o => !o.isPaid);
        }

        return [key, { ...group, orders: filteredOrders }] as [string, typeof group];
      })
      .filter(([_, group]) => group.orders.length > 0);
  }, [sortedDeliveredOrders, selectedCustomerType, paymentFilter]);

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

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
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
      setSelectedOrderIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
      toast({
        title: 'Doručené',
        description: 'Objednávka bola označená ako doručená a zásoby boli odpočítané.',
      });
    }
  };

  const markSelectedDelivered = async () => {
    if (selectedOrderIds.size === 0) return;

    const promises = Array.from(selectedOrderIds).map(async orderId => {
      const order = orders.find(o => o.id === orderId);
      await updateOrder(orderId, { status: 'delivered' });
      if (order) {
        await consumeOrderInventory(
          order.crop_id || null,
          order.delivery_form || 'cut',
          order.packaging_size || '50g',
          Math.ceil(order.quantity || 1),
          order.has_label !== false
        );
      }
    });
    await Promise.all(promises);

    setSelectedOrderIds(new Set());
    toast({
      title: 'Vybrané doručené',
      description: `${selectedOrderIds.size} objednávok bolo označených ako doručené.`,
    });
  };

  const returnToReady = async (orderId: string) => {
    const { error } = await updateOrder(orderId, { status: 'ready' });
    if (!error) {
      toast({
        title: 'Vrátené',
        description: 'Objednávka bola vrátená do zoznamu na rozvoz.',
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
    .filter(o => (o.status === 'ready' || o.status === 'delivered') && o.delivery_date)
    .map(o => startOfDay(new Date(o.delivery_date!)));

  if (isLoading) {
    return (
      <MainLayout>
        <PageHeader
          title="Rozvoz"
          description="Prehľad objednávok na rozvoz a správa trás"
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

  return (
    <MainLayout>
      <PageHeader
        title="Rozvoz"
        description="Prehľad objednávok na rozvoz a správa trás"
      >
        <Button variant="outline" onClick={exportToExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel
        </Button>
        <Button variant="outline" onClick={exportToPDF} className="gap-2">
          <FileText className="h-4 w-4" />
          Export PDF
        </Button>
      </PageHeader>

      <Tabs defaultValue="delivery" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="delivery">
            <Truck className="h-4 w-4 mr-2" />
            Rozvoz
          </TabsTrigger>
          <TabsTrigger value="routes">
            <Settings className="h-4 w-4 mr-2" />
            Správa trás
          </TabsTrigger>
        </TabsList>

        <TabsContent value="delivery" className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Dátum rozvozu</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'd. MMMM yyyy', { locale: sk }) : "Vyberte dátum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  locale={sk}
                  initialFocus
                  modifiers={{
                    orders: orderDates,
                  }}
                  modifiersStyles={{
                    orders: {
                      border: '2px solid hsl(var(--primary))',
                      borderRadius: '50%',
                    },
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Typ zákazníka</label>
            <CustomerTypeFilter
              value={selectedCustomerType}
              onChange={setSelectedCustomerType}
              showLabel={false}
            />
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Stav platby</label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full">
                <CreditCard className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Stav platby" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetky</SelectItem>
                <SelectItem value="paid">Zaplatené</SelectItem>
                <SelectItem value="unpaid">Nezaplatené</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Rozvozová trasa</label>
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="w-full">
                <Navigation className="mr-2 h-4 w-4" />
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

          <div className="flex-1 flex items-end">
            <div className="flex items-center gap-2">
              <Switch
                id="delivery-archive-toggle"
                checked={showArchive}
                onCheckedChange={setShowArchive}
              />
              <Label htmlFor="delivery-archive-toggle" className="text-sm font-medium cursor-pointer">
                Zobraziť doručené
              </Label>
            </div>
          </div>
        </div>
      </Card>

      {/* Financial Totals */}
      {deliveryTotals.total > 0 && (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Celková hodnota</p>
                <p className="text-2xl font-bold">{formatPrice(deliveryTotals.total)} €</p>
              </div>
              <Euro className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Zaplatené</p>
                <p className="text-2xl font-bold text-success">{formatPrice(deliveryTotals.paid)} €</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Zostáva doplatiť</p>
                <p className="text-2xl font-bold text-warning">{formatPrice(deliveryTotals.unpaid)} €</p>
              </div>
              <CreditCard className="h-8 w-8 text-warning" />
            </div>
          </Card>
        </div>
      )}

      {/* Customer Type Breakdown */}
      {(deliveryTotals.home > 0 || deliveryTotals.gastro > 0 || deliveryTotals.wholesale > 0) && (
        <Card className="p-4 mb-6">
          <p className="text-sm font-medium mb-3">Rozdelenie podľa typu zákazníka</p>
          <div className="flex flex-wrap gap-3">
            {deliveryTotals.home > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex-1 min-w-[150px]">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium">Domáci</span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatPrice(deliveryTotals.home)} €</span>
              </div>
            )}
            {deliveryTotals.gastro > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex-1 min-w-[150px]">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium">Gastro</span>
                </div>
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{formatPrice(deliveryTotals.gastro)} €</span>
              </div>
            )}
            {deliveryTotals.wholesale > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex-1 min-w-[150px]">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium">Veľkoobchod</span>
                </div>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{formatPrice(deliveryTotals.wholesale)} €</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Per-customer totals for gastro/wholesale */}
      {Object.keys(deliveryTotals.byCustomer).length > 0 && (
        <Card className="p-4 mb-6">
          <p className="text-sm font-medium mb-3">Sumy podľa zákazníkov (Gastro/Veľkoobchod)</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(deliveryTotals.byCustomer).map(([id, data]) => (
              <div
                key={id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  data.type === 'gastro' && "bg-orange-50 dark:bg-orange-900/20",
                  data.type === 'wholesale' && "bg-purple-50 dark:bg-purple-900/20"
                )}
              >
                {data.type === 'gastro' ? (
                  <UtensilsCrossed className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                ) : (
                  <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                )}
                <span className="text-sm font-medium">{data.name}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    data.type === 'gastro' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
                    data.type === 'wholesale' && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  )}
                >
                  {formatPrice(data.total)} €
                </Badge>
                {data.isPaid && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Zaplatené
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-6">
        {/* Summary Card */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {format(selectedDate, 'd. MMMM yyyy', { locale: sk })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {totalItemsCount} položiek celkom • {pendingCount} na rozvoz • {deliveredCount} doručených
              </p>
            </div>
          </div>
        </Card>

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
                  {selectedOrderIds.size > 0 && (
                    <Button
                      size="sm"
                      onClick={markSelectedDelivered}
                      variant="outline"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Označiť vybrané ({selectedOrderIds.size})
                    </Button>
                  )}
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="rounded-lg border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedOrderIds.size === pendingOrders.length && pendingOrders.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedOrderIds(new Set(pendingOrders.map(o => o.id)));
                                } else {
                                  setSelectedOrderIds(new Set());
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Zákazník</TableHead>
                          <TableHead className="hidden md:table-cell">Obsah objednávky</TableHead>
                          <TableHead className="hidden lg:table-cell">Adresa</TableHead>
                          <TableHead>Cena</TableHead>
                          <TableHead className="hidden md:table-cell">Akcia</TableHead>
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
                                selectedOrderIds={selectedOrderIds}
                                toggleOrderSelection={toggleOrderSelection}
                                getCropColor={getCropColor}
                                getPackagingSummary={getPackagingSummary}
                                openInGoogleMaps={openInGoogleMaps}
                                markOrderDelivered={markOrderDelivered}
                                handleMarkAsPaid={handleMarkAsPaid}
                                handleMarkAsUnpaid={handleMarkAsUnpaid}
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
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Doručené dnes</h3>
                    <p className="text-sm text-muted-foreground">
                      {deliveredCount} {deliveredCount === 1 ? 'položka' : deliveredCount < 5 ? 'položky' : 'položiek'} úspešne doručených
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zákazník</TableHead>
                        <TableHead className="hidden md:table-cell">Obsah objednávky</TableHead>
                        <TableHead className="hidden lg:table-cell">Adresa</TableHead>
                        <TableHead>Cena</TableHead>
                        <TableHead className="hidden md:table-cell">Akcia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedDeliveredOrders.map(([key, item]) => (
                        item.orders.map((order, orderIdx) => (
                          <TableRow key={order.id} className="bg-success/5">
                            <TableCell className="text-muted-foreground">
                              <span className="truncate">{order.customerName}</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              <div className="flex flex-wrap gap-1">
                                {order.itemsDetail.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 mr-2 mb-1">
                                    <Badge variant="secondary" className="text-xs font-normal opacity-60">
                                      {item.quantity} x {item.size} {item.name}
                                    </Badge>
                                    <span className="text-xs font-semibold text-green-600/60 dark:text-green-500/60">
                                      {item.price.toFixed(2)} €
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {order.customerAddress && (
                                <div className="flex items-center gap-2">
                                  <span className="truncate max-w-xs text-xs">{order.customerAddress}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openInGoogleMaps(order.customerAddress!)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Navigation className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              <div className="text-right">
                                <div className="text-xl font-bold text-green-600/60 dark:text-green-500/60">
                                  {order.totalPrice.toFixed(2)} €
                                </div>
                                {(order.deliveryFee || 0) > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    (vrátane dopravy {(order.deliveryFee || 0).toFixed(2)} €)
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => returnToReady(order.id)}
                                  className="gap-1 h-8"
                                >
                                  <Undo2 className="h-3 w-3" />
                                  Späť
                                </Button>
                                {order.paymentMethod === 'invoice' ? (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                                    <CreditCard className="h-3 w-3" />
                                    <span>Uhradené faktúrou</span>
                                  </div>
                                ) : order.isPaid ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleMarkAsUnpaid(order.id, order.notes)}
                                    className="gap-1 h-8 text-success"
                                  >
                                    <CreditCard className="h-3 w-3" />
                                    Zaplatené ✓
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkAsPaid(order.id, order.notes)}
                                    className="gap-1 h-8"
                                  >
                                    <CreditCard className="h-3 w-3" />
                                    Zaplatiť
                                  </Button>
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

        {/* Finančné zúčtovanie */}
        {(filteredPendingOrders.length > 0 || filteredDeliveredOrders.length > 0) && (
          <Card className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-2 border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Finančné zúčtovanie rozvozu
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Celková suma za tovar</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {deliveryTotals.totalProducts.toFixed(2)} €
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Celková suma za dopravu</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {deliveryTotals.totalDelivery.toFixed(2)} €
                </p>
              </div>
              <div className="space-y-1 md:text-right">
                <p className="text-sm font-semibold text-muted-foreground">CELKOM NA VYBRATIE</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {deliveryTotals.total.toFixed(2)} €
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Zaplatené</p>
                <p className="font-semibold text-green-600 dark:text-green-400">
                  {deliveryTotals.paid.toFixed(2)} €
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Nezaplatené</p>
                <p className="font-semibold text-orange-600 dark:text-orange-400">
                  {deliveryTotals.unpaid.toFixed(2)} €
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Domácnosti</p>
                <p className="font-semibold">{deliveryTotals.home.toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gastro/Veľkoobchod</p>
                <p className="font-semibold">
                  {(deliveryTotals.gastro + deliveryTotals.wholesale).toFixed(2)} €
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
        </TabsContent>

        <TabsContent value="routes" className="space-y-6">
          <DeliveryDaysSettings />
          <RouteManagement />
        </TabsContent>
      </Tabs>
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
