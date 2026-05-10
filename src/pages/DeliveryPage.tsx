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
import { Truck, FileSpreadsheet, FileText, CircleCheck as CheckCircle2, Calendar as CalendarIcon, Filter, Undo2, Navigation, CreditCard, Euro, House, Utensils, Store, Building2, Settings, GripVertical, Phone, ChevronLeft, ChevronRight, Wallet, CircleAlert as AlertCircle, Plus, X, MapPin } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';

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
        'cursor-pointer hover:bg-[#f8fafc] transition-colors h-11 border-b border-[#f1f5f9]'
      )}
      onClick={() => onOrderClick(order)}
    >
      <TableCell onClick={(e) => e.stopPropagation()} className="py-0 w-8">
        <button className="cursor-grab active:cursor-grabbing touch-none p-1" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-[#cbd5e1] hover:text-[#94a3b8]" />
        </button>
      </TableCell>

      {/* ZÁKAZNÍK */}
      <TableCell className="py-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-sm text-[#0f172a]">{order.customerName}</span>
          {order.deliveryNotes && (
            <div className="flex items-center gap-1 text-xs text-[#f59e0b]">
              <Navigation className="h-3 w-3" />
              {order.deliveryNotes}
            </div>
          )}
          {order.notes && (
            <div className="text-xs text-[#64748b]">{order.notes}</div>
          )}
        </div>
      </TableCell>

      {/* ADRESA */}
      <TableCell className="hidden lg:table-cell py-2">
        {order.customerAddress && (
          <span className="text-xs text-[#64748b]">{order.customerAddress}</span>
        )}
      </TableCell>

      {/* KONTAKT */}
      <TableCell className="hidden lg:table-cell py-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-1.5">
          {order.customerPhone && (
            <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1 text-[#2563eb] hover:underline text-xs">
              <Phone className="h-3.5 w-3.5" />{order.customerPhone}
            </a>
          )}
          {order.customerAddress && (
            <a
              href={currentNav === 'waze'
                ? `https://waze.com/ul?q=${encodeURIComponent(order.customerAddress)}`
                : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.customerAddress)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#2563eb] hover:underline text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <Navigation className="h-3.5 w-3.5" />
              {currentNav === 'waze' ? 'Waze' : 'Maps'}
            </a>
          )}
        </div>
      </TableCell>

      {/* CENA */}
      <TableCell className="py-2 text-right">
        <div className="font-bold text-sm text-[#0f172a]">{order.totalPrice.toFixed(2)} €</div>
        {(order.deliveryFee || 0) > 0 && (
          <div className="text-xs text-[#94a3b8]">+ {(order.deliveryFee || 0).toFixed(2)} € dop.</div>
        )}
        {order.isPaid && (
          <span className="text-[10px] font-semibold text-[#16a34a] bg-[#dcfce7] px-1.5 py-0.5 rounded">Zaplatené</span>
        )}
      </TableCell>

      {/* AKCIE */}
      <TableCell className="py-2 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1.5">
          {order.paymentMethod !== 'invoice' && (
            <button
              title={order.isPaid ? 'Označiť ako nezaplatené' : 'Označiť ako zaplatené'}
              onClick={() => order.isPaid ? handleMarkAsUnpaid(order.id, order.notes) : handleMarkAsPaid(order.id, order.notes)}
              className={`flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs font-medium border transition-colors ${
                order.isPaid
                  ? 'bg-[#16a34a] text-white border-[#16a34a]'
                  : 'bg-white text-[#475569] border-[#e2e8f0] hover:border-[#16a34a] hover:text-[#16a34a]'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              {order.isPaid ? 'Zapl.' : 'Nezapl.'}
            </button>
          )}
          {order.status === 'packed' && (
            <button title="Na ceste" onClick={() => markOrderOnTheWay(order.id)}
              className="flex items-center gap-1 px-2 h-7 rounded-lg text-xs font-medium border border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb] hover:bg-[#dbeafe] transition-colors">
              <Truck className="h-3.5 w-3.5" />
            </button>
          )}
          <button title="Doručené" onClick={() => markOrderDelivered(order.id)}
            className="flex items-center gap-1 px-2 h-7 rounded-lg text-xs font-medium border border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a] hover:bg-[#dcfce7] transition-colors">
            <CheckCircle2 className="h-3.5 w-3.5" />
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
  const [rozvozStarted, setRozvozStarted] = useState(false);

  // ── Mobile redesign states ──
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [doneOrders, setDoneOrders] = useState<Set<string>>(new Set());
  const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false);

  // ── Dlhová peňaženka ──
  const [activeTab, setActiveTab] = useState<'delivery' | 'debts'>('delivery');
  const [debts, setDebts] = useState<any[]>([]);
  const [debtsLoading, setDebtsLoading] = useState(false);
  const [debtDialog, setDebtDialog] = useState<{ open: boolean; order: any | null }>({ open: false, order: null });
  const [debtAmount, setDebtAmount] = useState('');
  const [debtNote, setDebtNote] = useState('');
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; debt: any | null }>({ open: false, debt: null });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [debtTypeFilter, setDebtTypeFilter] = useState('all');
  const [debtCustomerSearch, setDebtCustomerSearch] = useState('all');

  const handleNavToggle = () => {
    const next = navApp === 'waze' ? 'maps' : 'waze';
    setNavApp(next);
  };

  // ── Dlhy — fetch ──────────────────────────────────────────────────────────

  const fetchDebts = async () => {
    setDebtsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_debts')
        .select(`*, customer:customers(id, name, customer_type), order:orders(id, delivery_date)`)
        .neq('status', 'paid')
        .order('created_at', { ascending: false });
      if (!error && data) setDebts(data);
    } catch (e) { console.error(e); }
    finally { setDebtsLoading(false); }
  };

  const fetchDebtPayments = async (debtId: string) => {
    const { data } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('debt_id', debtId)
      .order('paid_at', { ascending: true });
    return data || [];
  };

  useEffect(() => {
    if (activeTab === 'debts') fetchDebts();
  }, [activeTab]);

  const createDebt = async () => {
    if (!debtDialog.order || !debtAmount) return;
    const amount = parseFloat(debtAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;
    const order = debtDialog.order;
    const customer = customers.find(c => c.id === order.customer_id);
    try {
      await supabase.from('payment_debts').insert({
        customer_id: order.customer_id,
        order_id: order.id,
        delivery_date: order.delivery_date,
        amount_owed: amount,
        amount_paid: 0,
        notes: debtNote || null,
        status: 'unpaid',
      });
      toast({ title: '⚠️ Dlh zaznamenaný', description: `${customer?.name} dlží ${amount.toFixed(2)} €` });
      setDebtDialog({ open: false, order: null });
      setDebtAmount('');
      setDebtNote('');
      if (activeTab === 'debts') fetchDebts();
    } catch (e) { console.error(e); }
  };

  const addDebtPayment = async () => {
    if (!paymentDialog.debt || !paymentAmount) return;
    const amount = parseFloat(paymentAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;
    const debt = paymentDialog.debt;
    const newPaid = Math.min((debt.amount_paid || 0) + amount, debt.amount_owed);
    const newStatus = newPaid >= debt.amount_owed ? 'paid' : 'partial';
    try {
      await supabase.from('debt_payments').insert({
        debt_id: debt.id,
        amount,
        paid_at: format(new Date(), 'yyyy-MM-dd'),
        notes: paymentNote || null,
      });
      await supabase.from('payment_debts').update({
        amount_paid: newPaid,
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', debt.id);
      toast({ title: newStatus === 'paid' ? '✅ Dlh uhradený' : '💰 Platba zaznamenaná', description: `Zaplatené: ${amount.toFixed(2)} €` });
      setPaymentDialog({ open: false, debt: null });
      setPaymentAmount('');
      setPaymentNote('');
      fetchDebts();
    } catch (e) { console.error(e); }
  };

  const markDebtFullyPaid = async (debt: any) => {
    const remaining = debt.amount_owed - (debt.amount_paid || 0);
    if (remaining <= 0) return;
    try {
      await supabase.from('debt_payments').insert({
        debt_id: debt.id,
        amount: remaining,
        paid_at: format(new Date(), 'yyyy-MM-dd'),
        notes: 'Plná úhrada',
      });
      await supabase.from('payment_debts').update({
        amount_paid: debt.amount_owed,
        status: 'paid',
        updated_at: new Date().toISOString(),
      }).eq('id', debt.id);
      toast({ title: '✅ Dlh plne uhradený' });
      fetchDebts();
    } catch (e) { console.error(e); }
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
    setRozvozStarted(false);
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
      const routeId = (order as any).delivery_route_id
        ?? customers.find(c => c.id === order.customer_id)?.delivery_route_id;
      return routeId === routeFilter;
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

    return result;
  };

  // Mark order as paid
  const handleMarkAsPaid = async (orderId: string, currentNotes: string | null) => {

    const order = orders.find(o => o.id === orderId);

    const newNotes = currentNotes ? `${currentNotes} | Zaplatené` : 'Zaplatené';

    const { error, data } = await updateOrder(orderId, { notes: newNotes });

    if (!error) {
      toast({
        title: 'Platba zaznamenaná',
        description: 'Objednávka bola označená ako zaplatená.'
      });

      // Refetch orders from DB
      await refetchOrders();
    } else {
      console.error('  ERROR:', error);
    }
  };

  // Mark order as unpaid
  const handleMarkAsUnpaid = async (orderId: string, currentNotes: string | null) => {

    const order = orders.find(o => o.id === orderId);

    const newNotes = currentNotes?.replace(/\s*\|\s*Zaplatené/gi, '').replace(/Zaplatené\s*\|?\s*/gi, '').replace(/zaplatené/gi, '').trim() || '';

    const { error, data } = await updateOrder(orderId, { notes: newNotes || null });

    if (!error) {
      toast({
        title: 'Platba zrušená',
        description: 'Označenie platby bolo odstránené.'
      });

      // Refetch orders from DB
      await refetchOrders();
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
      const routeId = (order as any).delivery_route_id ?? customer?.delivery_route_id;
      const route = routes?.find(r => r.id === routeId);
      const orderTotal = calculateOrderTotal(order, customer?.customer_type || null);
      const deliveryFee = calculateDeliveryFee(orderTotal, customer, route, customer?.customer_type || null, (order as any).charge_delivery);
      return sum + deliveryFee;
    }, 0);
  };

  const calculateGrandTotal = () => {
    return calculateItemsTotal() + calculateDeliveryTotal();
  };

  const calculatePaid = () => {

    const paid = allOrdersForReport.filter(o => isOrderPaid(o));

    const total = paid.reduce((sum, order) => {
      const customer = customers?.find(c => c.id === order.customer_id);
      const orderTotal = calculateOrderTotal(order, customer?.customer_type || null);
      const routeId = (order as any).delivery_route_id ?? customer?.delivery_route_id;
      const route = routes?.find(r => r.id === routeId);
      const deliveryFee = calculateDeliveryFee(orderTotal, customer, route, customer?.customer_type || null, (order as any).charge_delivery);
      return sum + orderTotal + deliveryFee;
    }, 0);

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
        const routeId = (order as any).delivery_route_id ?? customer?.delivery_route_id;
        const route = routes?.find(r => r.id === routeId);
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
        const routeId = (order as any).delivery_route_id ?? customer?.delivery_route_id;
        const route = routes?.find(r => r.id === routeId);
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
      const routeId = (order as any).delivery_route_id ?? customer?.delivery_route_id;
      const route = routes?.find(r => r.id === routeId);
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
      await refetchOrders(); // ← sync PC view
      if (order) {
        await consumeOrderInventory(
          order.crop_id || null,
          order.delivery_form || 'cut',
          order.packaging_size || '50g',
          Math.ceil(order.quantity || 1),
          order.has_label !== false
        );

        const isRecurring = (order as any).notes?.includes('freq:');
        const paymentMethod = (order as any).payment_method;

        if (isRecurring && paymentMethod === 'wallet' && order.customer_id) {
          try {
            const { data: customerData } = await supabase
              .from('customers')
              .select('credit, wallet_enabled, name, email')
              .eq('id', order.customer_id)
              .maybeSingle();

            if (customerData?.wallet_enabled && (customerData.credit || 0) > 0) {
              const { data: orderItemsData } = await supabase
                .from('order_items')
                .select('price_per_unit, quantity')
                .eq('order_id', orderId);

              const itemsTotal = (orderItemsData || []).reduce((sum: number, item: any) =>
                sum + (parseFloat(item.price_per_unit) * item.quantity), 0);

              const deliveryFee = (order as any).charge_delivery ? ((order as any).delivery_price || 0) : 0;
              const orderTotal = itemsTotal > 0 ? itemsTotal + deliveryFee : ((order as any).total_price || 0) + deliveryFee;

              const currentCredit = customerData.credit || 0;
              const walletPayment = Math.min(currentCredit, orderTotal);
              const remainder = Math.max(0, orderTotal - walletPayment);
              const newCredit = Math.max(0, currentCredit - walletPayment);

              await supabase
                .from('customers')
                .update({ credit: newCredit })
                .eq('id', order.customer_id);

              await supabase
                .from('orders')
                .update({
                  wallet_payment: walletPayment,
                  wallet_remainder: remainder > 0 ? remainder : null,
                })
                .eq('id', orderId);

              await supabase
                .from('credit_transactions')
                .insert({
                  customer_id: order.customer_id,
                  amount: -walletPayment,
                  type: 'order_payment',
                  status: 'completed',
                  order_id: orderId,
                  note: `Platba opakovanej objednávky z Pugilaru${remainder > 0 ? ` — doplatiť ${remainder.toFixed(2)} €` : ' — plne uhradené'}`,
                });

              toast({
                title: 'Doručené + Pugilar',
                description: `Odpočítané ${walletPayment.toFixed(2)} € z Pugilaru${remainder > 0 ? `, doplatiť ${remainder.toFixed(2)} €` : ' — plne uhradené'}`,
              });
            } else {
              toast({
                title: 'Doručené',
                description: 'Kredit v Pugilari je prázdny — zákazník platí pri prevzatí.',
              });
            }
          } catch (walletErr) {
            console.error('Wallet payment error:', walletErr);
            toast({
              title: 'Doručené',
              description: 'Objednávka doručená, ale chyba pri odpočítaní Pugilaru.',
            });
          }
        } else {
          toast({
            title: 'Doručené',
            description: 'Objednávka bola označená ako doručená a zásoby boli odpočítané.',
          });
        }
      }
    }
  };

  const returnToReady = async (orderId: string) => {
    const { error } = await updateOrder(orderId, { status: 'packed' });
    if (!error) {
      // Zmaž nezaplatené dlhy pre túto objednávku
      await supabase.from('payment_debts')
        .delete()
        .eq('order_id', orderId)
        .in('status', ['unpaid', 'partial']);
      // Odober "Zaplatené" z poznámok
      const order = orders.find(o => o.id === orderId);
      if (order?.notes?.toLowerCase().includes('zaplatené')) {
        const newNotes = order.notes.replace(/\s*\|\s*Zaplatené/gi, '').replace(/Zaplatené\s*\|?\s*/gi, '').trim();
        await updateOrder(orderId, { notes: newNotes || null });
      }
      await refetchOrders();
      toast({ title: 'Vrátené', description: 'Objednávka vrátená na rozvoz, dlh zmazaný.' });
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
      <MainLayout hideMobileHeader>
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
    <MainLayout hideMobileHeader>
      <PageHeader
        title="Rozvoz"
        description="Prehľad objednávok na rozvoz"
      >
      </PageHeader>

      {/* ── Tab switcher ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 mb-4">
        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            activeTab === 'delivery'
              ? 'bg-[#16a34a] text-white border-[#16a34a]'
              : 'bg-white text-[#475569] border-[#e2e8f0] hover:border-[#bbf7d0]'
          }`}
        >
          <Truck className="h-4 w-4" /> Rozvoz
        </button>
        <button
          onClick={() => setActiveTab('debts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            activeTab === 'debts'
              ? 'bg-[#dc2626] text-white border-[#dc2626]'
              : 'bg-white text-[#475569] border-[#e2e8f0] hover:border-[#fca5a5]'
          }`}
        >
          <Wallet className="h-4 w-4" />
          Dlhová peňaženka
          {debts.length > 0 && (
            <span className="bg-white text-[#dc2626] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {debts.length}
            </span>
          )}
        </button>
      </div>

      {/* ── DLHY TAB ─────────────────────────────────────────────── */}
      {activeTab === 'debts' && (
        <div className="px-4 space-y-4 pb-8">
          {/* Filtre */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {(['all', 'home', 'gastro', 'wholesale'] as const).map(type => {
                const labels = { all: 'Všetci', home: 'Domáci', gastro: 'Gastro', wholesale: 'VO' };
                const icons = { all: null, home: <House className="h-3 w-3" />, gastro: <Utensils className="h-3 w-3" />, wholesale: <Store className="h-3 w-3" /> };
                return (
                  <button key={type} onClick={() => setDebtTypeFilter(type)}
                    className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full border text-xs font-medium transition-colors ${
                      debtTypeFilter === type
                        ? 'bg-[#0f172a] text-white border-[#0f172a]'
                        : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
                    }`}>
                    {icons[type]}{labels[type]}
                  </button>
                );
              })}
            </div>
            <SearchableCustomerSelect
              customers={customers.filter(c => debtTypeFilter === 'all' || c.customer_type === debtTypeFilter)}
              value={debtCustomerSearch}
              onValueChange={setDebtCustomerSearch}
              placeholder="Všetci zákazníci"
              allowAll={true}
            />
          </div>

          {debtsLoading ? (
            <div className="text-center py-8 text-[#64748b]">Načítavam dlhy...</div>
          ) : debts.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e2e8f0] py-16 flex flex-col items-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-[#f0fdf4] flex items-center justify-center mb-4">
                <Wallet className="h-7 w-7 text-[#16a34a]" />
              </div>
              <h3 className="text-base font-semibold text-[#0f172a] mb-1">Žiadne nezaplatené dlhy</h3>
              <p className="text-sm text-[#64748b]">Všetky objednávky sú uhradené.</p>
            </div>
          ) : (() => {
            // Group debts by customer
            const filteredDebts = debts.filter(d => {
              const typeOk = debtTypeFilter === 'all' || d.customer?.customer_type === debtTypeFilter;
              const custOk = debtCustomerSearch === 'all' || d.customer_id === debtCustomerSearch;
              return typeOk && custOk;
            });
            const grouped: Record<string, any[]> = {};
            filteredDebts.forEach(d => {
              const cid = d.customer_id || 'unknown';
              if (!grouped[cid]) grouped[cid] = [];
              grouped[cid].push(d);
            });
            return Object.entries(grouped).map(([custId, custDebts]) => {
              const customer = custDebts[0]?.customer;
              const totalOwed = custDebts.reduce((s, d) => s + (d.amount_owed || 0), 0);
              const totalPaid = custDebts.reduce((s, d) => s + (d.amount_paid || 0), 0);
              const totalRemaining = totalOwed - totalPaid;
              const custType = customer?.customer_type || 'home';
              const typeColors = {
                home: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#16a34a]',
                gastro: 'bg-[#eff6ff] border-[#bfdbfe] text-[#2563eb]',
                wholesale: 'bg-[#fff7ed] border-[#fed7aa] text-[#d97706]',
              };
              const typeLabels = { home: 'Domáci', gastro: 'Gastro', wholesale: 'VO' };
              return (
                <div key={custId} className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                  {/* Customer header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#fef2f2] border-b border-[#fecaca]">
                    <AlertCircle className="h-5 w-5 text-[#dc2626] shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#0f172a]">{customer?.name || 'Neznámy'}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${typeColors[custType as keyof typeof typeColors] || typeColors.home}`}>
                          {typeLabels[custType as keyof typeof typeLabels] || custType}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-[#64748b]">Celkový dlh</div>
                      <div className="text-lg font-bold text-[#dc2626]">{totalRemaining.toFixed(2)} €</div>
                    </div>
                  </div>
                  {/* Individual debts */}
                  <div className="divide-y divide-[#f1f5f9]">
                    {custDebts.map(debt => {
                      const remaining = (debt.amount_owed || 0) - (debt.amount_paid || 0);
                      return (
                        <div key={debt.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-[#0f172a]">
                                  {debt.delivery_date ? format(new Date(debt.delivery_date), 'd. MMM yyyy', { locale: sk }) : '—'}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                                  debt.status === 'partial'
                                    ? 'bg-[#fff7ed] border-[#fed7aa] text-[#d97706]'
                                    : 'bg-[#fef2f2] border-[#fecaca] text-[#dc2626]'
                                }`}>
                                  {debt.status === 'partial' ? 'Čiastočne' : 'Nezaplatené'}
                                </span>
                              </div>
                              <div className="text-xs text-[#64748b] mt-0.5">
                                Dlžná suma: <span className="font-semibold text-[#0f172a]">{(debt.amount_owed || 0).toFixed(2)} €</span>
                                {(debt.amount_paid || 0) > 0 && (
                                  <> · Zaplatené: <span className="font-semibold text-[#16a34a]">{(debt.amount_paid || 0).toFixed(2)} €</span></>
                                )}
                              </div>
                              {debt.notes && <div className="text-xs text-[#94a3b8] mt-0.5 italic">{debt.notes}</div>}
                              <div className="text-sm font-bold text-[#dc2626] mt-1">
                                Zostatok: {remaining.toFixed(2)} €
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <button
                                onClick={() => { setPaymentDialog({ open: true, debt }); setPaymentAmount(remaining.toFixed(2)); setPaymentNote(''); }}
                                className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#16a34a] text-white text-xs font-semibold hover:bg-[#15803d] transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" /> Platba
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ── Debt Dialog ───────────────────────────────────────────── */}
      <Dialog open={debtDialog.open} onOpenChange={open => { if (!open) { setDebtDialog({ open: false, order: null }); setDebtAmount(''); setDebtNote(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#dc2626]" /> Zaznamenať dlh
            </DialogTitle>
          </DialogHeader>
          {debtDialog.order && (
            <div className="space-y-4 pt-2">
              <div className="bg-[#fef2f2] rounded-lg p-3 text-sm">
                <div className="font-semibold text-[#0f172a]">{customers.find(c => c.id === debtDialog.order?.customer_id)?.name}</div>
                <div className="text-[#64748b]">
                  {debtDialog.order?.delivery_date ? format(new Date(debtDialog.order.delivery_date), 'd. MMMM yyyy', { locale: sk }) : ''}
                  {' · '}celková suma: <span className="font-semibold">{debtDialog.order?.totalPrice?.toFixed(2)} €</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#0f172a] block mb-1.5">Nezaplatená suma (€)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={debtAmount}
                  onChange={e => setDebtAmount(e.target.value)}
                  placeholder={debtDialog.order?.totalPrice?.toFixed(2) || '0.00'}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#0f172a] block mb-1.5">Poznámka (voliteľné)</label>
                <textarea
                  value={debtNote}
                  onChange={e => setDebtNote(e.target.value)}
                  rows={2}
                  placeholder="Napr. zaplatí budúci týždeň..."
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setDebtDialog({ open: false, order: null }); setDebtAmount(''); setDebtNote(''); }}
                  className="flex-1 h-10 rounded-lg border border-[#e2e8f0] text-sm font-medium text-[#475569] hover:bg-[#f8fafc]">
                  Zrušiť
                </button>
                <button onClick={createDebt}
                  className="flex-1 h-10 rounded-lg bg-[#dc2626] text-white text-sm font-semibold hover:bg-[#b91c1c] transition-colors">
                  Zaznamenať dlh
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Payment Dialog ────────────────────────────────────────── */}
      <Dialog open={paymentDialog.open} onOpenChange={open => { if (!open) { setPaymentDialog({ open: false, debt: null }); setPaymentAmount(''); setPaymentNote(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#16a34a]" /> Zaznamenať platbu
            </DialogTitle>
          </DialogHeader>
          {paymentDialog.debt && (
            <div className="space-y-4 pt-2">
              <div className="bg-[#f0fdf4] rounded-lg p-3 text-sm space-y-1">
                <div className="font-semibold text-[#0f172a]">{paymentDialog.debt.customer?.name}</div>
                <div className="flex justify-between text-xs text-[#64748b]">
                  <span>Dlžná suma:</span>
                  <span className="font-semibold text-[#0f172a]">{(paymentDialog.debt.amount_owed || 0).toFixed(2)} €</span>
                </div>
                {(paymentDialog.debt.amount_paid || 0) > 0 && (
                  <div className="flex justify-between text-xs text-[#64748b]">
                    <span>Už zaplatené:</span>
                    <span className="font-semibold text-[#16a34a]">{(paymentDialog.debt.amount_paid || 0).toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold border-t border-[#bbf7d0] pt-1 mt-1">
                  <span>Zostatok:</span>
                  <span className="text-[#dc2626]">{((paymentDialog.debt.amount_owed || 0) - (paymentDialog.debt.amount_paid || 0)).toFixed(2)} €</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-[#0f172a] block mb-1.5">Suma platby (€)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                />
                <p className="text-[11px] text-[#94a3b8] mt-1">
                  Dátum platby: {format(new Date(), 'd. MMMM yyyy', { locale: sk })} (automaticky)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#0f172a] block mb-1.5">Poznámka (voliteľné)</label>
                <input
                  type="text" value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  placeholder="Napr. v hotovosti..."
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setPaymentDialog({ open: false, debt: null }); setPaymentAmount(''); setPaymentNote(''); }}
                  className="flex-1 h-10 rounded-lg border border-[#e2e8f0] text-sm font-medium text-[#475569] hover:bg-[#f8fafc]">
                  Zrušiť
                </button>
                <button onClick={addDebtPayment}
                  className="flex-1 h-10 rounded-lg bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors">
                  Uložiť platbu
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* ── ROZVOZ TAB ───────────────────────────────────────────── */}
      {activeTab === 'delivery' && (<>
      {/* DESKTOP Filter - GrowBase štýl */}
      <div className="hidden md:block">

        {/* Top bar — PageHeader náhrada */}
        <div className="flex items-center justify-between gap-4 px-6 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#dcfce7] border border-[#bbf7d0] flex items-center justify-center">
              <Truck className="h-5 w-5 text-[#16a34a]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0f172a] leading-none">Rozvoz</h1>
              <p className="text-xs text-[#94a3b8] mt-0.5">Prehľad objednávok na rozvoz</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (rozvozStarted) { setRozvozStarted(false); return; }
                const packedOrders = pendingOrders.filter(o => o.status === 'packed' || o.status === 'on_the_way');
                if (packedOrders.length === 0) {
                  toast({ title: 'Žiadne zabalené objednávky', description: 'Nie sú žiadne zabalené objednávky na prepnutie.' });
                  return;
                }
                for (const order of packedOrders) await updateOrder(order.id, { status: 'on_the_way' });
                await refetchOrders();
                setRozvozStarted(true);
                toast({ title: '🚚 Rozvoz spustený!', description: `${packedOrders.length} objednávok je na ceste.` });
              }}
              className={`flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border transition-colors ${
                rozvozStarted
                  ? 'bg-[#2563eb] text-white border-[#2563eb]'
                  : 'bg-[#16a34a] text-white border-[#16a34a] hover:bg-[#15803d]'
              }`}
            >
              <Truck className="h-4 w-4" />
              {rozvozStarted ? 'Rozvoz prebieha' : 'Štart rozvozu'}
            </button>
            <button onClick={exportToExcel}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#e2e8f0] bg-white text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button onClick={exportToPDF}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#e2e8f0] bg-white text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">
              <FileText className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>

        {/* Filter card */}
        <div className="mx-6 mb-4 bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex flex-wrap gap-4 items-center border-b border-[#f1f5f9]">
            {/* Dátum */}
            <div className="flex items-center gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 h-8 px-3 rounded-lg border border-[#e2e8f0] bg-white text-sm font-medium text-[#0f172a] hover:border-[#bbf7d0] transition-colors">
                    <CalendarIcon className="h-3.5 w-3.5 text-[#16a34a]" />
                    {selectedDates.length === 1 ? format(selectedDates[0], 'd. MMMM yyyy', { locale: sk }) : `${selectedDates.length} dní`}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-xl" align="start">
                  <CalendarGrid />
                </PopoverContent>
              </Popover>
            </div>
            <div className="w-px h-5 bg-[#e2e8f0]" />
            {/* Zákazník typ chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide shrink-0">Zákazník</span>
              {(['all','home','gastro','wholesale'] as const).map(t => {
                const labels = { all: 'Všetci', home: 'Domáci', gastro: 'Gastro', wholesale: 'VO' };
                const icons: Record<string,any> = { all: null, home: <House className="h-3 w-3" />, gastro: <Utensils className="h-3 w-3" />, wholesale: <Store className="h-3 w-3" /> };
                return (
                  <button key={t} onClick={() => setSelectedCustomerType(t)}
                    className={`inline-flex items-center gap-1 px-3 h-7 rounded-full border text-xs font-medium transition-colors ${
                      selectedCustomerType === t ? 'bg-[#0f172a] border-[#0f172a] text-white' : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
                    }`}>
                    {icons[t]}{labels[t]}
                  </button>
                );
              })}
            </div>
            <div className="w-px h-5 bg-[#e2e8f0]" />
            {/* Trasa chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wide shrink-0">Trasa</span>
              <button onClick={() => setRouteFilter('all')}
                className={`inline-flex items-center gap-1 px-3 h-7 rounded-full border text-xs font-medium transition-colors ${
                  routeFilter === 'all' ? 'bg-[#0f172a] border-[#0f172a] text-white' : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
                }`}>Všetky</button>
              {routes.map(route => (
                <button key={route.id} onClick={() => setRouteFilter(route.id)}
                  className={`inline-flex items-center gap-1 px-3 h-7 rounded-full border text-xs font-medium transition-colors ${
                    routeFilter === route.id ? 'bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8]' : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
                  }`}>
                  <MapPin className="h-3 w-3" />{route.name}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-3">
              {/* Zákazník search */}
              <SearchableCustomerSelect customers={customers} value={customerFilter} onValueChange={setCustomerFilter}
                placeholder="Všetci zákazníci" filterByType={selectedCustomerType} allowAll={true} className="w-48" />
              {/* Zobraziť doručené */}
              <label className="flex items-center gap-2 text-sm text-[#475569] cursor-pointer whitespace-nowrap">
                <Switch checked={showArchive} onCheckedChange={setShowArchive} />
                Doručené
              </label>
            </div>
          </div>

          {/* Progress + summary */}
          {ordersForDate.length > 0 && (
            <div className="px-4 py-3 flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide">Priebeh rozvozu</span>
                  <span className="text-xs font-semibold text-[#0f172a]">{deliveredCount} / {totalItemsCount} doručených</span>
                </div>
                <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                  <div className="h-full bg-[#16a34a] rounded-full transition-all duration-500"
                    style={{ width: totalItemsCount > 0 ? `${(deliveredCount / totalItemsCount) * 100}%` : '0%' }} />
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                {[
                  { label: 'Hotovosť', value: (() => {
                    const cash = pendingOrders.reduce((sum, o) => {
                      const c = customers.find(c => c.id === o.customer_id);
                      const walletPay = (o as any).wallet_payment || 0;
                      const voucherDiscount = (o as any).voucher_discount || 0;
                      const ot = calculateOrderTotal(o, c?.customer_type || null);
                      const df = o.delivery_price ?? 0;
                      return sum + Math.max(0, ot + df - voucherDiscount - walletPay);
                    }, 0);
                    return `${cash.toFixed(2)} €`;
                  })(), color: 'text-[#16a34a]' },
                  { label: 'Na rozvoz', value: `${pendingCount}`, color: 'text-[#0f172a]' },
                  { label: 'Doručených', value: `${deliveredCount}`, color: 'text-[#0f172a]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[#f8fafc] rounded-lg px-3 py-1.5 text-center min-w-[80px]">
                    <div className="text-[10px] text-[#94a3b8]">{label}</div>
                    <div className={`text-sm font-semibold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Finančné zúčtovanie */}
        {allOrdersForReport.length > 0 && (
          <div className="mx-6 mb-4">
            <button onClick={() => setFinancialReportOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[#e2e8f0] shadow-sm hover:border-[#bbf7d0] transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center shrink-0">
                <Euro className="h-4 w-4 text-[#16a34a]" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-[#0f172a]">Finančné zúčtovanie rozvozu</div>
                <div className="text-xs text-[#94a3b8]">{format(selectedDate, 'd. MMMM yyyy', { locale: sk })} · {totalItemsCount} objednávok · {pendingCount} na rozvoz · {deliveredCount} doručených</div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#94a3b8]" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="mx-6 space-y-4 pb-8">
          {sortedPendingOrders.length === 0 && sortedDeliveredOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e2e8f0] py-16 flex flex-col items-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-[#f1f5f9] flex items-center justify-center mb-4">
                <Truck className="h-7 w-7 text-[#94a3b8]" />
              </div>
              <h3 className="text-base font-semibold text-[#0f172a] mb-1">Žiadne objednávky</h3>
              <p className="text-sm text-[#64748b]">Na tento deň nie sú naplánované žiadne rozvozy.</p>
            </div>
          ) : (
            <>
              {/* Na rozvoz */}
              {sortedPendingOrders.length > 0 && (
                <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f1f5f9] bg-gradient-to-r from-[#f0fdf4] to-[#f8fafc]">
                    <div className="flex items-center gap-2.5">
                      <Truck className="h-4 w-4 text-[#16a34a]" />
                      <span className="font-semibold text-[#14532d] text-sm">Na rozvoz</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] rounded-full">
                      {pendingCount} {pendingCount === 1 ? 'objednávka' : pendingCount < 5 ? 'objednávky' : 'objednávok'}
                    </span>
                  </div>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                            <TableHead className="w-8 py-2.5"></TableHead>
                            <TableHead className="font-semibold text-[#475569] text-xs uppercase tracking-wide py-2.5">Zákazník</TableHead>
                            <TableHead className="hidden lg:table-cell font-semibold text-[#475569] text-xs uppercase tracking-wide py-2.5">Adresa</TableHead>
                            <TableHead className="hidden lg:table-cell font-semibold text-[#475569] text-xs uppercase tracking-wide py-2.5">Kontakt</TableHead>
                            <TableHead className="font-semibold text-[#475569] text-xs uppercase tracking-wide py-2.5 text-right">Cena</TableHead>
                            <TableHead className="font-semibold text-[#475569] text-xs uppercase tracking-wide py-2.5 text-center">Akcia</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <SortableContext items={sortedPendingOrders.flatMap(([_, item]) => item.orders.map(o => o.id))} strategy={verticalListSortingStrategy}>
                            {sortedPendingOrders.map(([key, item]) =>
                              item.orders.map((order, orderIdx) => (
                                <SortableOrderRow key={order.id} order={order} orderIdx={orderIdx} item={item}
                                  getCropColor={getCropColor} getPackagingSummary={getPackagingSummary}
                                  openInGoogleMaps={openInGoogleMaps} markOrderDelivered={markOrderDelivered}
                                  markOrderOnTheWay={markOrderOnTheWay} handleMarkAsPaid={handleMarkAsPaid}
                                  handleMarkAsUnpaid={handleMarkAsUnpaid} navigationMode={navigationMode}
                                  setNavigationMode={setNavigationMode}
                                  onOrderClick={(order) => { setSelectedOrderDetail(order); setDetailModalOpen(true); }}
                                />
                              ))
                            )}
                          </SortableContext>
                        </TableBody>
                      </Table>
                    </div>
                  </DndContext>
                </div>
              )}

              {/* Doručené */}
              {sortedDeliveredOrders.length > 0 && (
                <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f1f5f9] bg-gradient-to-r from-[#dcfce7] to-[#f0fdf4]">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#16a34a]" />
                      <span className="font-semibold text-[#14532d] text-sm">Doručené dnes</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] rounded-full">
                      {deliveredCount} {deliveredCount === 1 ? 'objednávka' : deliveredCount < 5 ? 'objednávky' : 'objednávok'}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                          <TableHead className="font-semibold text-[#475569] text-xs uppercase tracking-wide py-2.5">Zákazník</TableHead>
                          <TableHead className="hidden lg:table-cell font-semibold text-[#475569] text-xs uppercase tracking-wide py-2.5">Adresa</TableHead>
                          <TableHead className="hidden lg:table-cell font-semibold text-[#475569] text-xs uppercase tracking-wide py-2.5">Kontakt</TableHead>
                          <TableHead className="font-semibold text-[#475569] text-xs uppercase tracking-wide py-2.5 text-right">Cena</TableHead>
                          <TableHead className="font-semibold text-[#475569] text-xs uppercase tracking-wide py-2.5 text-center">Akcia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedDeliveredOrders.map(([key, item]) =>
                          item.orders.map((order) => (
                            <TableRow key={order.id} className="bg-[#f0fdf4]/50 hover:bg-[#dcfce7]/50 cursor-pointer transition-colors"
                              onClick={() => { setSelectedOrderDetail(order); setDetailModalOpen(true); }}>
                              <TableCell className="py-2">
                                <span className="font-semibold text-sm text-[#166534]">{order.customerName}</span>
                                {order.deliveryNotes && <div className="text-xs text-[#94a3b8] italic"><MapPin className="h-3 w-3 inline mr-0.5" />{order.deliveryNotes}</div>}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell py-2 text-sm text-[#64748b]">{order.customerAddress}</TableCell>
                              <TableCell className="hidden lg:table-cell py-2" onClick={e => e.stopPropagation()}>
                                <div className="flex flex-col gap-1">
                                  {order.customerPhone && (
                                    <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1 text-[#2563eb] hover:underline text-xs">
                                      <Phone className="h-3.5 w-3.5" />{order.customerPhone}
                                    </a>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                <span className="font-semibold text-sm text-[#16a34a]">{order.totalPrice.toFixed(2)} €</span>
                              </TableCell>
                              <TableCell className="py-2 text-center" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => returnToReady(order.id)}
                                    className="flex items-center gap-1 px-2.5 h-7 rounded-lg border border-[#e2e8f0] bg-white text-xs font-medium text-[#475569] hover:bg-[#f8fafc]">
                                    <Undo2 className="h-3.5 w-3.5" /> Späť
                                  </button>
                                  {order.paymentMethod !== 'invoice' && (
                                    <button onClick={() => order.isPaid ? handleMarkAsUnpaid(order.id, order.notes) : handleMarkAsPaid(order.id, order.notes)}
                                      className={`flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs font-medium transition-colors ${
                                        order.isPaid ? 'bg-[#16a34a] text-white' : 'border border-[#e2e8f0] bg-white text-[#475569]'
                                      }`}>
                                      <CreditCard className="h-3.5 w-3.5" />
                                      {order.isPaid ? 'Zaplatené' : 'Nezaplatené'}
                                    </button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>


      {/* ═══════════════════════════════════════════════════════════
          MOBILE LAYOUT — GrowBase redesign
          ═══════════════════════════════════════════════════════════ */}
      <div className="block md:hidden">

        {/* ── Action bar ── */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-[#e2e8f0]">
          <button
            onClick={async () => {
              if (rozvozStarted) { setRozvozStarted(false); return; }
              const packedOrders = pendingOrders.filter(o => o.status === 'packed' || o.status === 'on_the_way');
              if (packedOrders.length === 0) {
                toast({ title: 'Žiadne zabalené objednávky', description: 'Nie sú žiadne zabalené objednávky na prepnutie.' });
                return;
              }
              for (const order of packedOrders) await updateOrder(order.id, { status: 'on_the_way' });
              await refetchOrders();
              setRozvozStarted(true);
              toast({ title: '🚚 Rozvoz spustený!', description: `${packedOrders.length} objednávok je na ceste.` });
            }}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${
              rozvozStarted
                ? 'bg-[#2563eb] text-white border-[#2563eb]'
                : 'bg-[#16a34a] text-white border-[#16a34a]'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            {rozvozStarted ? 'Prebieha' : 'Štart'}
          </button>
          <span className={`text-xs flex-1 ${rozvozStarted ? 'text-[#2563eb]' : 'text-[#94a3b8]'}`}>
            {rozvozStarted ? 'Zákazníci vidia stav "Na ceste"' : 'Zákazníci uvidia "Na ceste"'}
          </span>
          <button
            onClick={() => setMobileFiltersOpen(p => !p)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${
              mobileFiltersOpen || selectedCustomerType !== 'all' || routeFilter !== 'all' || customerFilter !== 'all'
                ? 'bg-[#f0fdf4] border-[#16a34a] text-[#166534]'
                : 'bg-white border-[#e2e8f0] text-[#475569]'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtre
            {(selectedCustomerType !== 'all' || routeFilter !== 'all' || customerFilter !== 'all') && (
              <span className="bg-[#16a34a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {[selectedCustomerType !== 'all', routeFilter !== 'all', customerFilter !== 'all'].filter(Boolean).length}
              </span>
            )}
          </button>
          {/* Dátum picker */}
          <button
            onClick={() => setMobileCalendarOpen(p => !p)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${
              mobileCalendarOpen
                ? 'bg-[#16a34a] text-white border-[#16a34a]'
                : 'bg-white border-[#e2e8f0] text-[#0f172a]'
            }`}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {selectedDates.length === 1 ? format(selectedDates[0], 'd. MMM', { locale: sk }) : `${selectedDates.length} dní`}
          </button>
        </div>

        {/* ── Inline kalendár panel ── */}
        {mobileCalendarOpen && (
          <div className="bg-white border-b border-[#e2e8f0] flex flex-col items-center py-3">
            <CalendarGrid />
            <button onClick={() => setMobileCalendarOpen(false)}
              className="mt-2 mx-4 w-[calc(100%-2rem)] h-9 rounded-xl bg-[#16a34a] text-white text-sm font-semibold">
              Potvrdiť ({selectedDates.length === 1 ? format(selectedDates[0], 'd. MMM', { locale: sk }) : `${selectedDates.length} dní`})
            </button>
          </div>
        )}

        {/* ── Filter panel (skladateľný) ── */}
        {mobileFiltersOpen && (
          <div className="bg-white border-b border-[#e2e8f0] px-4 py-3 flex flex-col gap-3">
            {/* Zákazník typ */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide w-14 shrink-0">Zákazník</span>
              {(['all','home','gastro','wholesale'] as const).map(t => {
                const labels = { all: 'Všetci', home: 'Domáci', gastro: 'Gastro', wholesale: 'VO' };
                const icons = { all: null, home: <House className="h-3 w-3" />, gastro: <Utensils className="h-3 w-3" />, wholesale: <Store className="h-3 w-3" /> };
                return (
                  <button key={t} onClick={() => setSelectedCustomerType(t)}
                    className={`inline-flex items-center gap-1 px-2.5 h-6 rounded-full border text-[11px] font-medium transition-colors ${
                      selectedCustomerType === t ? 'bg-[#0f172a] border-[#0f172a] text-white' : 'bg-white border-[#e2e8f0] text-[#475569]'
                    }`}>
                    {icons[t]}{labels[t]}
                  </button>
                );
              })}
            </div>
            {/* Trasa */}
            {routes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide w-14 shrink-0">Trasa</span>
                <button onClick={() => setRouteFilter('all')}
                  className={`inline-flex items-center gap-1 px-2.5 h-6 rounded-full border text-[11px] font-medium transition-colors ${
                    routeFilter === 'all' ? 'bg-[#0f172a] border-[#0f172a] text-white' : 'bg-white border-[#e2e8f0] text-[#475569]'
                  }`}>Všetky</button>
                {routes.map(route => (
                  <button key={route.id} onClick={() => setRouteFilter(route.id)}
                    className={`inline-flex items-center gap-1 px-2.5 h-6 rounded-full border text-[11px] font-medium transition-colors ${
                      routeFilter === route.id ? 'bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8]' : 'bg-white border-[#e2e8f0] text-[#475569]'
                    }`}>
                    <MapPin className="h-3 w-3" />{route.name}
                  </button>
                ))}
              </div>
            )}
            {/* Zákazník search */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide w-14 shrink-0">Klient</span>
              <div className="flex-1">
                <SearchableCustomerSelect customers={customers} value={customerFilter} onValueChange={setCustomerFilter} placeholder="Všetci zákazníci" filterByType={selectedCustomerType} allowAll={true} />
              </div>
            </div>
            {(selectedCustomerType !== 'all' || routeFilter !== 'all' || customerFilter !== 'all') && (
              <div className="flex justify-end">
                <button onClick={() => { setSelectedCustomerType('all'); setRouteFilter('all'); setCustomerFilter('all'); }}
                  className="text-xs text-[#64748b] hover:text-[#dc2626] flex items-center gap-1">
                  <X className="h-3 w-3" /> Zrušiť filtre
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Progress bar ── */}
        {ordersForDate.length > 0 && (
          <div className="bg-white px-4 py-3 border-b border-[#e2e8f0]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide">Priebeh rozvozu</span>
              <span className="text-xs font-semibold text-[#0f172a]">{deliveredCount} / {totalItemsCount} doručených</span>
            </div>
            <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden mb-2">
              <div className="h-full bg-[#16a34a] rounded-full transition-all duration-500"
                style={{ width: totalItemsCount > 0 ? `${(deliveredCount / totalItemsCount) * 100}%` : '0%' }} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-2 py-2 text-center">
                <div className="text-[10px] font-semibold text-[#475569] text-center">Hotovosť</div>
                <div className="text-sm font-bold text-[#16a34a] text-center">
                  {(() => {
                    const cash = pendingOrders.reduce((sum, o) => {
                      const c = customers.find(c => c.id === o.customer_id);
                      const walletPay = (o as any).wallet_payment || 0;
                      const voucherDiscount = (o as any).voucher_discount || 0;
                      const ot = calculateOrderTotal(o, c?.customer_type || null);
                      const df = o.delivery_price ?? 0;
                      const total = ot + df - voucherDiscount;
                      return sum + Math.max(0, total - walletPay);
                    }, 0);
                    return `${cash.toFixed(2)} €`;
                  })()}
                </div>
              </div>
              <div className="bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-2 py-2 text-center">
                <div className="text-[10px] font-semibold text-[#475569] text-center">Zastávky</div>
                <div className="text-sm font-bold text-[#0f172a] text-center">{pendingCount} ostáva</div>
              </div>
              <div className="bg-[#f8fafc] border border-[#cbd5e1] rounded-lg px-2 py-2 text-center">
                <div className="text-[10px] font-semibold text-[#475569] text-center">Celkom</div>
                <div className="text-sm font-bold text-[#0f172a] text-center">{totalItemsCount} obj.</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Stop list ── */}
        {sortedPendingOrders.length === 0 && sortedDeliveredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f1f5f9] flex items-center justify-center mb-4">
              <Truck className="h-7 w-7 text-[#94a3b8]" />
            </div>
            <h3 className="text-base font-semibold text-[#0f172a] mb-1">Žiadne objednávky</h3>
            <p className="text-sm text-[#64748b]">Na tento deň nie sú naplánované žiadne rozvozy.</p>
          </div>
        ) : (
          <div className="px-3 pt-3 pb-32 space-y-2">
            {/* Finančné zúčtovanie */}
            {allOrdersForReport.length > 0 && (
              <button onClick={() => setFinancialReportOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[#e2e8f0] shadow-sm hover:border-[#bbf7d0] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center shrink-0">
                  <Euro className="h-4 w-4 text-[#16a34a]" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold text-[#0f172a]">Finančné zúčtovanie</div>
                  <div className="text-xs text-[#94a3b8]">{format(selectedDate, 'd. MMMM yyyy', { locale: sk })} · {totalItemsCount} obj.</div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#94a3b8]" />
              </button>
            )}

            {/* Na rozvoz */}
            {pendingCount > 0 && (
              <div>
                <div className="flex items-center gap-2 py-2 px-1">
                  <div className="flex-1 h-px bg-[#e2e8f0]" />
                  <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wide">Na rozvoz</span>
                  <span className="text-[10px] font-semibold bg-[#f1f5f9] text-[#475569] px-2 py-0.5 rounded-full">{pendingCount}</span>
                  <div className="flex-1 h-px bg-[#e2e8f0]" />
                </div>
                {(() => {
                  // Flat list of pending orders sorted by delivery_order
                  const flatPending = sortedPendingOrders.flatMap(([_, g]) => g.orders);
                  const uniqueByCustomer = flatPending.reduce((acc, o) => {
                    if (!acc.find(x => x.id === o.id)) acc.push(o);
                    return acc;
                  }, [] as typeof flatPending);
                  return uniqueByCustomer.map((order, idx) => {
                    const customer = customers.find(c => c.id === order.customerId);
                    const routeName = routes.find(r => r.id === ((order as any).delivery_route_id ?? customer?.delivery_route_id))?.name || null;
                    const walletPay = (pendingOrders.find(o => o.id === order.id) as any)?.wallet_payment || 0;
                    const voucherDiscount = (pendingOrders.find(o => o.id === order.id) as any)?.voucher_discount || 0;
                    const voucherCode = (pendingOrders.find(o => o.id === order.id) as any)?.voucher_code || null;
                    const rawOrder = pendingOrders.find(o => o.id === order.id);
                    const payType = walletPay > 0 && walletPay >= order.totalPrice ? 'wallet'
                      : voucherCode ? 'voucher' : 'cash';
                    const cashDue = Math.max(0, order.totalPrice - walletPay - voucherDiscount);
                    const dotColor = rawOrder?.status === 'on_the_way' ? 'bg-[#3b82f6]'
                      : rawOrder?.status === 'packed' ? 'bg-[#f59e0b]' : 'bg-[#94a3b8]';
                    const typeColors: Record<string,string> = {
                      home: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#16a34a]',
                      gastro: 'bg-[#eff6ff] border-[#bfdbfe] text-[#2563eb]',
                      wholesale: 'bg-[#fff7ed] border-[#fed7aa] text-[#d97706]',
                    };
                    const typeIcons: Record<string,any> = {
                      home: <House className="h-3.5 w-3.5" />,
                      gastro: <Utensils className="h-3.5 w-3.5" />,
                      wholesale: <Store className="h-3.5 w-3.5" />,
                    };
                    const ct = order.customerType || 'home';
                    return (
                      <button key={order.id} onClick={() => setSelectedStopIndex(idx)}
                        className="w-full text-left bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden hover:border-[#16a34a] hover:shadow-md transition-all">
                        <div className="flex items-center gap-2.5 px-3 py-3">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${typeColors[ct] || typeColors.home}`}>
                            {typeIcons[ct] || typeIcons.home}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base text-[#0f172a] truncate">{order.customerName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {order.customerAddress && <span className="text-xs text-[#94a3b8] truncate max-w-[140px]">{order.customerAddress}</span>}
                              {routeName && <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] rounded-md shrink-0">{routeName}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-base font-bold text-[#0f172a]">{order.totalPrice.toFixed(2)} €</span>
                            {payType === 'cash' && cashDue > 0 && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa] rounded-md">Hotovosť</span>
                            )}
                            {payType === 'wallet' && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] rounded-md">Pugiľar</span>
                            )}
                            {payType === 'voucher' && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#f5f3ff] text-[#7c3aed] border border-[#e9d5ff] rounded-md">🎁 Poukaz</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            )}

            {/* Doručené */}
            {showArchive && deliveredCount > 0 && (
              <div>
                <div className="flex items-center gap-2 py-2 px-1">
                  <div className="flex-1 h-px bg-[#bbf7d0]" />
                  <span className="text-[10px] font-bold text-[#16a34a] uppercase tracking-wide">Doručené</span>
                  <span className="text-[10px] font-semibold bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] px-2 py-0.5 rounded-full">{deliveredCount}</span>
                  <div className="flex-1 h-px bg-[#bbf7d0]" />
                </div>
                {sortedDeliveredOrders.flatMap(([_, g]) => g.orders).map((order, idx) => (
                  <button key={order.id}
                    onClick={() => setSelectedStopIndex(pendingCount + idx)}
                    className="w-full text-left bg-[#f0fdf4] rounded-xl border border-[#bbf7d0] overflow-hidden mb-2 hover:border-[#16a34a] transition-colors">
                    <div className="flex items-center gap-2.5 px-3 py-3">
                      <CheckCircle2 className="h-4 w-4 text-[#16a34a] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-[#166534] truncate">{order.customerName}</div>
                        {order.customerAddress && <div className="text-xs text-[#4ade80] truncate">{order.customerAddress}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-bold text-[#16a34a]">{order.totalPrice.toFixed(2)} €</span>
                        <span className="text-[9px] text-[#94a3b8]">Klepni pre vrátenie</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Fullscreen stop detail ── */}
        {selectedStopIndex !== null && (() => {
          // Zahrnúť aj doručené — aby fungovalo "Vrátiť späť"
          const flatPending = sortedPendingOrders.flatMap(([_, g]) => g.orders).reduce((acc, o) => {
            if (!acc.find((x: any) => x.id === o.id)) acc.push(o);
            return acc;
          }, [] as any[]);
          const flatDelivered = sortedDeliveredOrders.flatMap(([_, g]) => g.orders).reduce((acc, o) => {
            if (!acc.find((x: any) => x.id === o.id)) acc.push(o);
            return acc;
          }, [] as any[]);
          const allStops = [...flatPending, ...flatDelivered];
          const order = allStops[selectedStopIndex];
          if (!order) return null;
          const rawOrder = orders.find(o => o.id === order.id); // všetky orders, nie len pending
          const customer = customers.find(c => c.id === order.customerId);
          const routeName = routes.find(r => r.id === ((rawOrder as any)?.delivery_route_id ?? customer?.delivery_route_id))?.name || null;
          const walletPay = (rawOrder as any)?.wallet_payment || 0;
          const walletRemainder = (rawOrder as any)?.wallet_remainder || 0;
          const voucherDiscount = (rawOrder as any)?.voucher_discount || 0;
          const voucherCode = (rawOrder as any)?.voucher_code || null;
          const isDone = doneOrders.has(order.id) || rawOrder?.status === 'delivered';
          const cashDue = Math.max(0, order.totalPrice - walletPay - voucherDiscount);
          const payType = walletPay > 0 && walletPay >= order.totalPrice ? 'wallet' : voucherCode ? 'voucher' : 'cash';
          const typeColors: Record<string,string> = {
            home: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#16a34a]',
            gastro: 'bg-[#eff6ff] border-[#bfdbfe] text-[#2563eb]',
            wholesale: 'bg-[#fff7ed] border-[#fed7aa] text-[#d97706]',
          };
          const typeLabels: Record<string,string> = { home: 'Domáci', gastro: 'Gastro', wholesale: 'VO' };
          const typeIcons: Record<string,any> = {
            home: <House className="h-4 w-4" />,
            gastro: <Utensils className="h-4 w-4" />,
            wholesale: <Store className="h-4 w-4" />,
          };
          const ct = order.customerType || 'home';
          return (
            <div className="fixed inset-0 bg-[#f8fafc] z-50 flex flex-col">
              {/* Nav */}
              <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#e2e8f0]">
                <button onClick={() => setSelectedStopIndex(null)} className="flex items-center gap-1.5 text-[#16a34a] font-semibold text-sm">
                  <ChevronLeft className="h-5 w-5" /> Späť
                </button>
                <span className="text-xs font-semibold text-[#94a3b8]">Zastávka {selectedStopIndex + 1} / {allStops.length}</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setSelectedStopIndex(Math.max(0, selectedStopIndex - 1))} disabled={selectedStopIndex === 0}
                    className="w-8 h-8 rounded-lg border border-[#e2e8f0] bg-white flex items-center justify-center disabled:opacity-30">
                    <ChevronLeft className="h-4 w-4 text-[#475569]" />
                  </button>
                  <button onClick={() => setSelectedStopIndex(Math.min(allStops.length - 1, selectedStopIndex + 1))} disabled={selectedStopIndex === allStops.length - 1}
                    className="w-8 h-8 rounded-lg border border-[#e2e8f0] bg-white flex items-center justify-center disabled:opacity-30">
                    <ChevronRight className="h-4 w-4 text-[#475569]" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-24">
                {/* Adresa + navigácia */}
                <div className="bg-white rounded-xl border border-[#e2e8f0] p-3">
                  <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1">Adresa zastávky</div>
                  <div className="font-semibold text-sm text-[#0f172a] mb-3">{order.customerAddress || 'Adresa nie je zadaná'}</div>
                  <div className="flex gap-2">
                    {order.customerAddress && (
                      <a href={`https://waze.com/ul?q=${encodeURIComponent(order.customerAddress)}`} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#2563eb] text-white text-xs font-semibold">
                        <Navigation className="h-3.5 w-3.5" /> Waze
                      </a>
                    )}
                    {order.customerPhone && (
                      <a href={`tel:${order.customerPhone}`}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border border-[#e2e8f0] bg-white text-xs font-semibold text-[#475569]">
                        <Phone className="h-3.5 w-3.5" /> {order.customerPhone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Zákazník blok */}
                <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                  {/* Hlavička */}
                  <div className="flex items-center gap-2.5 px-3 py-3 border-b border-[#f1f5f9]">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${typeColors[ct] || typeColors.home}`}>
                      {typeIcons[ct] || typeIcons.home}
                    </div>
                    <div className="flex-1 font-bold text-base text-[#0f172a]">{order.customerName}</div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${typeColors[ct] || typeColors.home}`}>
                      {typeLabels[ct] || ct}
                    </span>
                    {routeName && <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] rounded-md">{routeName}</span>}
                  </div>

                  {/* Položky */}
                  <div className="px-3 py-2.5 border-b border-[#f1f5f9]">
                    <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-2">Položky objednávky</div>
                    <div className="space-y-2">
                      {order.itemsDetail?.length > 0 ? order.itemsDetail.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-[#0f172a]">{item.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-[#64748b]">{item.quantity} × {item.size}</span>
                              {item.package_type && <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#16a34a] text-white rounded">{item.package_type}</span>}
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-[#0f172a] shrink-0">{item.price.toFixed(2)} €</span>
                        </div>
                      )) : (
                        <div className="text-sm text-[#64748b]">Objednávka</div>
                      )}
                    </div>
                  </div>

                  {/* Cenový súhrn */}
                  <div className="px-3 py-2.5 bg-[#f8fafc] border-b border-[#f1f5f9] space-y-1">
                    <div className="flex justify-between text-xs text-[#64748b]">
                      <span>Medzisúčet</span><span>{(order.totalPrice - (order.deliveryFee || 0)).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#64748b]">
                      <span>Doprava</span>
                      <span className={(order.deliveryFee || 0) === 0 ? 'text-[#16a34a] font-medium' : ''}>
                        {(order.deliveryFee || 0) === 0 ? 'Zdarma' : `${(order.deliveryFee || 0).toFixed(2)} €`}
                      </span>
                    </div>
                    {walletPay > 0 && <div className="flex justify-between text-xs text-[#16a34a]"><span>Pugiľar</span><span>−{walletPay.toFixed(2)} €</span></div>}
                    {voucherDiscount > 0 && <div className="flex justify-between text-xs text-[#7c3aed]"><span>Poukaz</span><span>−{voucherDiscount.toFixed(2)} €</span></div>}
                    <div className="flex justify-between text-sm font-bold pt-1 border-t border-[#e2e8f0]">
                      <span>K úhrade</span>
                      {payType === 'cash' ? <span className="text-[#dc2626]">{cashDue.toFixed(2)} € hotovosť</span>
                        : payType === 'wallet' ? <span className="text-[#16a34a]">Uhradené z Pugiľaru</span>
                        : <span className="text-[#7c3aed]">Uhradené poukazom</span>}
                    </div>
                    {walletRemainder > 0 && (
                      <div className="mt-1 p-2 bg-[#fff7ed] rounded-lg border border-[#fed7aa]">
                        <p className="text-xs text-[#c2410c] font-medium">💵 Doplatiť pri doručení: {walletRemainder.toFixed(2)} €</p>
                      </div>
                    )}
                  </div>

                  {/* Akcie */}
                  {!isDone ? (
                    <div className="flex gap-2 px-3 py-3">
                      <button onClick={async () => {
                        setDebtDialog({ open: true, order: { ...order, id: order.id, delivery_date: rawOrder?.delivery_date, customer_id: order.customerId, totalPrice: order.totalPrice } });
                        setDebtAmount(cashDue.toFixed(2));
                        setDebtNote('');
                        // Označíme ako doručené aj pri dlhu
                        await markOrderDelivered(order.id);
                        setDoneOrders(p => new Set(p).add(order.id));
                      }}
                        className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] text-xs font-semibold">
                        <AlertCircle className="h-4 w-4" /> Prevzaté + dlh
                      </button>
                      {payType === 'cash' ? (
                        <button onClick={async () => {
                          await handleMarkAsPaid(order.id, rawOrder?.notes || null);
                          await markOrderDelivered(order.id);
                          setDoneOrders(p => new Set(p).add(order.id));
                          if (selectedStopIndex < allStops.length - 1) setSelectedStopIndex(selectedStopIndex + 1);
                          else setSelectedStopIndex(null);
                        }}
                          className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg bg-[#16a34a] text-white text-xs font-semibold hover:bg-[#15803d] transition-colors">
                          <CreditCard className="h-4 w-4" /> Prevzaté + zaplatené
                        </button>
                      ) : (
                        <button onClick={async () => {
                          await markOrderDelivered(order.id);
                          setDoneOrders(p => new Set(p).add(order.id));
                          if (selectedStopIndex < allStops.length - 1) setSelectedStopIndex(selectedStopIndex + 1);
                          else setSelectedStopIndex(null);
                        }}
                          className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg bg-[#16a34a] text-white text-xs font-semibold hover:bg-[#15803d] transition-colors">
                          <CheckCircle2 className="h-4 w-4" /> Prevzaté
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2 px-3 py-3">
                      <button onClick={async () => {
                        await returnToReady(order.id);
                        setDoneOrders(p => { const n = new Set(p); n.delete(order.id); return n; });
                      }}
                        className="flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-[#e2e8f0] bg-white text-[#475569] text-xs font-semibold hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#fca5a5] transition-colors">
                        <Undo2 className="h-4 w-4" /> Vrátiť späť
                      </button>
                      <div className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg bg-[#dcfce7] border border-[#bbf7d0] text-[#166534] text-xs font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> Hotovo — doručené
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-3 pt-3 pb-[calc(0.75rem+64px)] flex gap-2">
                <button onClick={() => setSelectedStopIndex(null)}
                  className="w-12 h-12 rounded-xl border border-[#e2e8f0] bg-white flex items-center justify-center text-[#475569] shrink-0">
                  <Truck className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    if (selectedStopIndex < allStops.length - 1) setSelectedStopIndex(selectedStopIndex + 1);
                    else setSelectedStopIndex(null);
                  }}
                  className="flex-1 h-12 rounded-xl bg-[#16a34a] text-white font-semibold text-sm flex items-center justify-center gap-2">
                  {selectedStopIndex < allStops.length - 1 ? (
                    <><span>Ďalšia zastávka</span><ChevronRight className="h-5 w-5" /></>
                  ) : (
                    <span>Dokončiť rozvoz</span>
                  )}
                </button>
              </div>
            </div>
          );
        })()}
      </div>
      {/* ═══════════════════════════════════════════════════════════
          KONIEC MOBILE LAYOUT
          ═══════════════════════════════════════════════════════════ */}


      {/* Detail Dialog */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-[#f1f5f9]">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#dcfce7] border border-[#bbf7d0] flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-[#16a34a]" />
              </div>
              <div>
                <div className="text-base font-bold text-[#0f172a]">{selectedOrderDetail?.customerName}</div>
                <div className="text-xs text-[#94a3b8] font-normal">{format(new Date(selectedDate), 'd. MMMM yyyy', { locale: sk })}</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedOrderDetail && (
            <div className="p-5 space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {selectedOrderDetail.customerAddress && (
                  <div className="col-span-2 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] px-4 py-3">
                    <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1">Adresa</div>
                    <div className="text-sm font-semibold text-[#0f172a]">{selectedOrderDetail.customerAddress}</div>
                    {selectedOrderDetail.customerAddress && (
                      <a href={`https://waze.com/ul?q=${encodeURIComponent(selectedOrderDetail.customerAddress)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 mt-2 text-xs text-[#2563eb] font-medium hover:underline">
                        <Navigation className="h-3.5 w-3.5" /> Navigovať vo Waze
                      </a>
                    )}
                  </div>
                )}
                {selectedOrderDetail.customerPhone && (
                  <div className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] px-4 py-3">
                    <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1">Telefón</div>
                    <a href={`tel:${selectedOrderDetail.customerPhone}`} className="text-sm font-semibold text-[#2563eb] hover:underline flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />{selectedOrderDetail.customerPhone}
                    </a>
                  </div>
                )}
                <div className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] px-4 py-3">
                  <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-1">Platba</div>
                  <div className="text-sm font-semibold text-[#0f172a]">
                    {selectedOrderDetail.paymentMethod === 'cash' ? 'Hotovosť' :
                     selectedOrderDetail.paymentMethod === 'invoice' ? 'Faktúra' : 'Iné'}
                  </div>
                </div>
              </div>

              {selectedOrderDetail.deliveryNotes && (
                <div className="bg-[#fefce8] rounded-xl border border-[#fde68a] px-4 py-3">
                  <div className="text-[10px] font-bold text-[#854d0e] uppercase tracking-wide mb-1">Poznámky k doručeniu</div>
                  <div className="text-sm text-[#713f12]">{selectedOrderDetail.deliveryNotes}</div>
                </div>
              )}

              {/* Položky */}
              <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#f1f5f9] bg-[#f8fafc]">
                  <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide">Položky objednávky</span>
                </div>
                <div className="divide-y divide-[#f1f5f9]">
                  {selectedOrderDetail.itemsDetail.sort((a, b) => b.price - a.price).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-[#0f172a]">{item.name}</div>
                        <div className="text-xs text-[#64748b]">{item.quantity} × {item.size}g</div>
                      </div>
                      <div className="font-bold text-sm text-[#16a34a]">{item.price.toFixed(2)} €</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cenový súhrn */}
              <div className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] px-4 py-3 space-y-2">
                <div className="flex justify-between text-sm text-[#64748b]">
                  <span>Medzisúčet</span>
                  <span>{(selectedOrderDetail.totalPrice - (selectedOrderDetail.deliveryFee || 0)).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm text-[#64748b]">
                  <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Doprava</span>
                  <span className={(selectedOrderDetail.deliveryFee || 0) === 0 ? 'text-[#16a34a] font-medium' : ''}>
                    {(selectedOrderDetail.deliveryFee || 0) === 0 ? 'Zdarma' : `${(selectedOrderDetail.deliveryFee || 0).toFixed(2)} €`}
                  </span>
                </div>
                {(selectedOrderDetail as any).voucherDiscount > 0 && (
                  <div className="flex justify-between text-sm text-[#7c3aed]">
                    <span>Poukaz</span>
                    <span>−{((selectedOrderDetail as any).voucherDiscount || 0).toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[#e2e8f0]">
                  <span className="font-bold text-sm text-[#0f172a]">K úhrade</span>
                  <span className="font-bold text-lg text-[#0f172a]">{selectedOrderDetail.totalPrice.toFixed(2)} €</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setDetailModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-[#e2e8f0] bg-white text-sm font-medium text-[#475569] hover:bg-[#f8fafc]">
                  Zavrieť
                </button>
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
              Finančné zúčtovanie rozvozu
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
                <div className="text-xs text-gray-600">Zaplatené</div>
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
      </>)}
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
