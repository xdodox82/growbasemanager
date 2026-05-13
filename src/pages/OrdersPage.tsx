// IMPORTANT: Use 'House' not 'Home' - Home is Chrome browser icon, House is home icon
import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import { CategoryFilter } from '@/components/orders/CategoryFilter';
import { CustomerTypeFilter } from '@/components/filters/CustomerTypeFilter';
import { RecurringOrderEditDialog } from '@/components/orders/RecurringOrderEditDialog';
import { RecurringOrderDeleteDialog } from '@/components/orders/RecurringOrderDeleteDialog';
import { RecurringOrderExtendDialog } from '@/components/orders/RecurringOrderExtendDialog';
import { BulkDateChangeDialog } from '@/components/orders/BulkDateChangeDialog';
import { useDeliveryDays } from '@/hooks/useDeliveryDays';
import { ShoppingCart, Plus, Grid3x3, List, FileSpreadsheet, FileText, Pencil, Copy, Trash2, Calendar, Package, Truck, House, Utensils, Store, Scissors, X, MapPin, RefreshCw, Check, Leaf, Sprout, Flower, Palette, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Smartphone, Clock, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, getDay, addWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { OrdersTopBar } from '@/components/orders/OrdersTopBar';
import { OrdersFilterBar } from '@/components/orders/OrdersFilterBar';
import { OrdersStatsBar } from '@/components/orders/OrdersStatsBar';
import { OrdersTableView } from '@/components/orders/OrdersTableView';
import { OrdersCardView } from '@/components/orders/OrdersCardView';
import { OrderDetailDialog } from '@/components/orders/OrderDetailDialog';
import { getStatusLabel } from '@/components/orders/orderUtils';

interface OrderItem {
  id?: string;
  crop_id?: string;
  crop_name: string;
  blend_id?: string;
  quantity: number;
  unit: string;
  packaging_size: string;
  delivery_form: string;
  packaging_type: string;
  packaging_volume_ml: number;
  packaging_id?: string;
  has_label: boolean;
  notes?: string;
  special_requirements?: string;
  price_per_unit?: number | string;
  total_price?: number;
  is_special_item?: boolean;
  custom_crop_name?: string;
}

interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_type: string;
  delivery_date: string;
  status: string;
  order_type: string;
  route?: string;
  week_count?: number;
  total_price?: number;
  charge_delivery?: boolean;
  delivery_price?: number;
  notes?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  recurring_weeks?: number;
  parent_order_id?: string;
  recurring_order_id?: string;
  recurring_start_date?: string;
  recurring_end_date?: string;
  recurring_total_weeks?: number;
  recurring_current_week?: number;
  created_at: string;
  order_items?: OrderItem[];
}

interface Customer {
  id: string;
  name: string;
  company_name: string;
  customer_type: string;
  free_delivery?: boolean;
}

interface Crop {
  id: string;
  name: string;
}

interface Blend {
  id: string;
  name: string;
}

interface Route {
  id: string;
  name: string;
  delivery_day_id?: string;
  delivery_fee_home?: number;
  delivery_fee_gastro?: number;
  delivery_fee_wholesale?: number;
  home_min_free_delivery?: number;
  gastro_min_free_delivery?: number;
  wholesale_min_free_delivery?: number;
}

interface DeliveryDay {
  id: string;
  name: string;
  day_of_week: number;
}

interface Price {
  id: string;
  crop_id?: string;
  blend_id?: string;
  packaging_size: string;
  unit_price: number;
  customer_type: string;
}

interface Packaging {
  id: string;
  name: string;
  type: string;
}

// Helper function to sort order items by value (quantity × price) - highest first
const sortOrderItemsByValue = (items: OrderItem[]): OrderItem[] => {
  if (!items || items.length === 0) return [];

  return [...items].sort((a, b) => {
    const valueA = (parseFloat(a?.quantity?.toString() || '0')) *
                   (parseFloat((a?.price_per_unit?.toString() || '0').replace(',', '.')));
    const valueB = (parseFloat(b?.quantity?.toString() || '0')) *
                   (parseFloat((b?.price_per_unit?.toString() || '0').replace(',', '.')));

    // Sort descending (highest value first)
    return valueB - valueA;
  });
};

// Helper function to format order notes - strip freq tags and Slovak translations
const formatOrderNotes = (notes: string | null): string | null => {
  if (!notes) return null;
  let result = notes;
  result = result.replace(/freq:biweekly/g, '');
  result = result.replace(/freq:weekly/g, '');
  result = result.replace(/Opakovaná každé 2 týždne/g, '');
  result = result.replace(/Opakovaná týždenne/g, '');
  result = result.trim();
  return result.length > 0 ? result : null;
};

const deleteOrderItemsDirectFetch = async (orderId: string) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || supabaseAnonKey;

  const response = await fetch(`${supabaseUrl}/rest/v1/order_items?order_id=eq.${orderId}`, {
    method: 'DELETE',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${accessToken}`,
      'Prefer': 'return=minimal'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Delete call failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response;
};

const createOrderItemDirectFetch = async (itemData: any) => {

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || supabaseAnonKey;

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/create_order_item_with_packaging`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ p_data: itemData })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ RPC ERROR:', errorText);
    throw new Error(`RPC call failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response;
};

export default function OrdersPage() {
  const { toast } = useToast();
  const { getDeliveryDaysArray } = useDeliveryDays();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Force grid view on mobile
  const effectiveViewMode = isMobile ? 'grid' : viewMode;
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [blends, setBlends] = useState<Blend[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDay[]>([]);
  const [plantings, setPlantings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCustomerType, setFilterCustomerType] = useState<string>('all');
  const [filterCrop, setFilterCrop] = useState('all');
  const [orderCategoryFilter, setOrderCategoryFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [filterRoute, setFilterRoute] = useState('all');
  const [showArchive, setShowArchive] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [recurringEditDialog, setRecurringEditDialog] = useState<{
    open: boolean;
    order: Order | null;
  }>({ open: false, order: null });
  const [updateAllFutureOrders, setUpdateAllFutureOrders] = useState(false);
  const [recurringDeleteDialog, setRecurringDeleteDialog] = useState<{
    open: boolean;
    order: Order | null;
  }>({ open: false, order: null });
  const [extendDialog, setExtendDialog] = useState<{
    open: boolean;
    order: Order | null;
  }>({ open: false, order: null });

  const [customerType, setCustomerType] = useState('home');
  const [customerId, setCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [status, setStatus] = useState('pending');
  const [orderType, setOrderType] = useState('jednorazova');
  const [weekCount, setWeekCount] = useState<number | string>(1);
  const [route, setRoute] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [freeDelivery, setFreeDelivery] = useState(false); // Default OFF - auto-calculate delivery, ON = force free
  const [manualDeliveryAmount, setManualDeliveryAmount] = useState(''); // Manual override amount
  const [calculatedDeliveryPrice, setCalculatedDeliveryPrice] = useState(0); // Display-only calculated delivery
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState<'detail' | 'history'>('detail');
  const [bulkDateChangeOpen, setBulkDateChangeOpen] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [currentItem, setCurrentItem] = useState<OrderItem>({
    crop_name: '',
    quantity: 1,
    unit: 'ks',
    packaging_size: '',
    delivery_form: 'rezana',
    packaging_type: 'rPET',
    packaging_volume_ml: 250,
    has_label: false,
    notes: '',
    special_requirements: '',
    price_per_unit: '',
    is_special_item: false,
    custom_crop_name: ''
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const { getDeliveryDaysArray: getDeliveryDaysFromSettings } = useDeliveryDays();
  const [isPriceConfigured, setIsPriceConfigured] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Sledovanie zmien pre kontrolu kapacity
  useEffect(() => {
    if (deliveryDate && orderItems && orderItems.length > 0) {
      const issues = checkCapacityForOrder(deliveryDate, orderItems);
      if (issues.length > 0) {
      }
    }
  }, [deliveryDate, orderItems]);

  // Monitor customer filter changes
  // Reset customer filter when customer type filter changes
  useEffect(() => {
    setCustomerFilter('all');
  }, [filterCustomerType]);

  useEffect(() => {
    if (customerId && customers) {
      const selectedCustomer = customers.find(c => c.id === customerId);
      if (selectedCustomer) {
        if ((selectedCustomer as any).default_packaging_type) {
          setCurrentItem(prev => ({
            ...prev,
            packaging_type: (selectedCustomer as any).default_packaging_type || 'rPET'
          }));
        }
        // Auto-nastaviť etiketu len ak má zákazník always_label — nastaví sa pri pridaní položky
        if (!(selectedCustomer as any).always_label) {
          setCurrentItem(prev => ({ ...prev, has_label: false }));
        }
        // Auto-populate route from customer's assigned delivery route (only for new orders)
        if (!editingOrder && selectedCustomer.delivery_route_id && routes?.length) {
          const customerRoute = routes.find(r => r.id === selectedCustomer.delivery_route_id);
          if (customerRoute) {
            setRoute(customerRoute.name);
          }
        }
      }
    }
  }, [customerId, customers, routes, editingOrder]);

  useEffect(() => {
    const fetchPriceAutomatically = async () => {
      if (!currentItem.is_special_item && currentItem.packaging_size && customerType) {
        // Auto-fetch price for both crops and blends
        if (currentItem.crop_id || currentItem.blend_id) {
          const autoPrice = await autoFetchPrice(
            currentItem.packaging_size,
            customerType,
            currentItem.crop_id,
            currentItem.blend_id
          );
          if (autoPrice > 0) {
            setCurrentItem(prev => ({ ...prev, price_per_unit: autoPrice.toString() }));
          }
        }
      }
    };

    fetchPriceAutomatically();
  }, [currentItem.crop_id, currentItem.blend_id, currentItem.packaging_size, customerType, currentItem.is_special_item]);

  // REACTIVE DELIVERY CALCULATION: Recalculate whenever customer, items, or delivery settings change
  useEffect(() => {
    const calculateDelivery = () => {
      // PRIORITY 1: Free Delivery Toggle
      if (freeDelivery) {
        setCalculatedDeliveryPrice(0);
        return;
      }

      // PRIORITY 2: Manual Amount
      if (manualDeliveryAmount && manualDeliveryAmount.trim() !== '') {
        const manual = parseFloat(manualDeliveryAmount) || 0;
        setCalculatedDeliveryPrice(manual);
        return;
      }

      // PRIORITY 3: Auto-calculate from route
      if (!customerId || !customers || !routes) {
        setCalculatedDeliveryPrice(0);
        return;
      }

      const customer = customers.find(c => c.id === customerId);
      if (!customer) {
        setCalculatedDeliveryPrice(0);
        return;
      }

      // Check customer free delivery exception
      if (customer.free_delivery) {
        setCalculatedDeliveryPrice(0);
        return;
      }

      const custType = customer.customer_type || 'home';

      // CRITICAL: Use selected route from dropdown, NOT customer's assigned route
      // If no route selected or "Žiadna trasa", delivery is 0
      if (!route || route === '' || route === 'Žiadna trasa') {
        setCalculatedDeliveryPrice(0);
        return;
      }

      // Find route by NAME (not ID) from the route dropdown selection
      const deliveryRoute = routes.find(r => r.name === route);

      if (!deliveryRoute) {
        setCalculatedDeliveryPrice(0);
        return;
      }

      // Calculate subtotal from order items
      const subtotal = (orderItems || []).reduce((sum, item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price_per_unit.toString().replace(',', '.')) || 0;
        return sum + (quantity * price);
      }, 0);

      // Get fee and threshold from route based on customer type
      const fee = custType === 'gastro'
        ? parseFloat((deliveryRoute?.delivery_fee_gastro || 0).toString())
        : custType === 'wholesale'
        ? parseFloat((deliveryRoute?.delivery_fee_wholesale || 0).toString())
        : parseFloat((deliveryRoute?.delivery_fee_home || 0).toString());

      const threshold = custType === 'gastro'
        ? parseFloat((deliveryRoute?.gastro_min_free_delivery || 0).toString())
        : custType === 'wholesale'
        ? parseFloat((deliveryRoute?.wholesale_min_free_delivery || 0).toString())
        : parseFloat((deliveryRoute?.home_min_free_delivery || 0).toString());

      // Ak subtotal presiahol threshold → doprava 0€
      const finalDeliveryPrice = subtotal >= threshold ? 0 : fee;

      setCalculatedDeliveryPrice(finalDeliveryPrice);

      // Enhanced logging pre debugging
    };

    calculateDelivery();
  }, [customerId, customers, routes, route, orderItems, freeDelivery, manualDeliveryAmount]);

  const getDeliveryFormLabel = (form: string | null | undefined): string => {
    if (!form || form === 'cut' || form === 'rezana') return 'Zrezaná';
    if (form === 'live' || form === 'ziva') return 'Živá';
    return form;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setDataLoaded(false);
      const [ordersRes, customersRes, cropsRes, blendsRes, routesRes, pricesRes, packagingsRes, deliveryDaysRes, plantingsRes] = await Promise.all([
        supabase.from('orders').select('*, order_items(*), customers(id, name, delivery_route_id, delivery_routes(id, name))').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
        supabase.from('blends').select('*').order('name'),
        supabase.from('delivery_routes').select('*').order('name'),
        supabase.from('prices').select('*'),
        supabase.from('packagings').select('*').order('name'),
        supabase.from('delivery_days').select('*').order('day_of_week'),
        supabase.from('planting_plans').select('*').order('harvest_date'),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (customersRes.data) setCustomers(customersRes.data);
      if (cropsRes.data) setCrops(cropsRes.data);
      if (blendsRes.data) setBlends(blendsRes.data);
      if (routesRes.data) setRoutes(routesRes.data);
      if (pricesRes.data) setPrices(pricesRes.data);
      if (packagingsRes.data) setPackagings(packagingsRes.data);
      if (deliveryDaysRes.data) setDeliveryDays(deliveryDaysRes.data);
      if (plantingsRes.data) setPlantings(plantingsRes.data);

      setDataLoaded(true);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa načítať dáta', variant: 'destructive' });
      setOrders([]);
      setCustomers([]);
      setCrops([]);
      setBlends([]);
      setRoutes([]);
      setPrices([]);
      setPackagings([]);
      setDeliveryDays([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = (orders || []).filter(order => {
    if (filterStatus !== 'all' && order?.status !== filterStatus) return false;

    if (filterCustomerType !== 'all') {
      const customer = customers?.find(c => c.id === order.customer_id);
      if (customer?.customer_type !== filterCustomerType) return false;
    }

    // Filter by specific customer
    if (customerFilter && customerFilter !== 'all') {
      if (order.customer_id !== customerFilter) return false;
    }

    if (filterCrop !== 'all') {
      const hasCrop = order?.order_items?.some(item => item?.crop_name === filterCrop);
      if (!hasCrop) return false;
    }

    // Filter podľa kategórie plodiny
    if (orderCategoryFilter !== 'all') {
      const hasMatchingCategory = order?.order_items?.some(item => {
        // Ak je to blend (mix), kontrolujeme či filter je nastavený na 'mix'
        if (item?.blend_id) {
          return orderCategoryFilter === 'mix';
        }
        // Ak je to crop, kontrolujeme category z crops tabuľky
        if (item?.crop_id) {
          const crop = crops?.find(c => c.id === item.crop_id);
          return crop?.category === orderCategoryFilter;
        }
        return false;
      });
      if (!hasMatchingCategory) return false;
    }

    // Route filter
    if (filterRoute !== 'all' && order?.route !== filterRoute) return false;

    // Archive filter: if showArchive is false, only show active orders (not completed)
    if (!showArchive && (order?.status === 'delivered' || order?.status === 'dorucena')) {
      return false;
    }
    if (!showCancelled && (order?.status === 'cancelled' || order?.status === 'zrusena')) {
      return false;
    }

    // Date filter (calendar multi-select)
    if (selectedDates.length > 0 && order?.delivery_date) {
      const orderDate = new Date(order.delivery_date);
      const matchesDate = selectedDates.some(d => isSameDay(d, orderDate));
      if (!matchesDate) return false;
    }

    // Period filter
    if (filterPeriod !== 'all' && order?.delivery_date) {
      const orderDate = new Date(order.delivery_date);
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay() + 1);

      switch (filterPeriod) {
        case 'this_week': {
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 7);
          if (orderDate < startOfWeek || orderDate >= endOfWeek) return false;
          break;
        }
        case 'next_week': {
          const nextWeekStart = new Date(startOfWeek);
          nextWeekStart.setDate(startOfWeek.getDate() + 7);
          const nextWeekEnd = new Date(nextWeekStart);
          nextWeekEnd.setDate(nextWeekStart.getDate() + 7);
          if (orderDate < nextWeekStart || orderDate >= nextWeekEnd) return false;
          break;
        }
        case 'last_week': {
          const lastWeekStart = new Date(startOfWeek);
          lastWeekStart.setDate(startOfWeek.getDate() - 7);
          const lastWeekEnd = new Date(lastWeekStart);
          lastWeekEnd.setDate(lastWeekStart.getDate() + 7);
          if (orderDate < lastWeekStart || orderDate >= lastWeekEnd) return false;
          break;
        }
        case 'last_2_weeks': {
          const twoWeeksAgoStart = new Date(startOfWeek);
          twoWeeksAgoStart.setDate(startOfWeek.getDate() - 14);
          const twoWeeksAgoEnd = new Date(twoWeeksAgoStart);
          twoWeeksAgoEnd.setDate(twoWeeksAgoStart.getDate() + 7);
          if (orderDate < twoWeeksAgoStart || orderDate >= twoWeeksAgoEnd) return false;
          break;
        }
        case 'last_month': {
          const lastMonth = new Date(today);
          lastMonth.setMonth(today.getMonth() - 1);
          const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
          const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
          if (orderDate < startOfLastMonth || orderDate > endOfLastMonth) return false;
          break;
        }
      }
    }

    // Vyhľadávanie podľa čísla objednávky alebo mena zákazníka
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase().replace('mr-', '').replace('mr', '');
      const orderNum = String((order as any).order_number || '').toLowerCase();
      const custName = String(order.customer_name || '').toLowerCase();
      if (!orderNum.includes(q) && !custName.includes(q)) return false;
    }

    return true;
  });

  const filteredCropsByCategory = useMemo(() => {

    if (!categoryFilter || categoryFilter === 'all') {
      return crops;
    }

    // If "mix" category is selected, return empty array (blends are shown separately)
    if (categoryFilter === 'mix') {
      return [];
    }

    // Now categoryFilter uses database values directly: 'microgreens', 'microherbs', 'edible_flowers'
    const filtered = crops.filter(crop => {
      const matches = crop.category === categoryFilter;
      return matches;
    });
    return filtered;
  }, [crops, categoryFilter]);

  const filteredBlendsByCategory = useMemo(() => {

    // Only show blends when "mix" category is selected
    if (categoryFilter === 'mix') {
      return blends;
    }
    // If no category filter or "all", show blends in "Mixy" group
    if (!categoryFilter || categoryFilter === 'all') {
      return blends;
    }
    // Otherwise don't show blends
    return [];
  }, [blends, categoryFilter]);

  const getDeliveryFee = (order: Order): number => {
    try {
      if (!order || !order.charge_delivery) {
        return 0;
      }

      // Osobný odber je vždy zdarma
      if (order.route === 'Osobný odber') {
        return 0;
      }

      // Ak je delivery_price uložená v DB, použiť ju priamo
      if (order.delivery_price != null && order.delivery_price > 0) {
        return parseFloat(order.delivery_price.toString());
      }

      const customer = customers?.find(c => c.id === order.customer_id);
      if (!customer || customer?.free_delivery) {
        return 0;
      }

      const customerType = customer?.customer_type || 'home';

      // CRITICAL: Use the SELECTED route from the order, NOT customer's default route
      // This ensures orders display the delivery fee based on the route selected during creation
      if (!order.route || order.route === '' || order.route === 'Žiadna trasa') {
        return 0;
      }

      // Find route by NAME from the order's stored route field
      const deliveryRoute = routes?.find(r => r.name === order.route);
      if (!deliveryRoute) {
        return 0;
      }

      // CRITICAL: Calculate order SUBTOTAL from items, not total_price
      let orderSubtotal = 0;
      if (order?.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
        orderSubtotal = order.order_items.reduce((sum, item) => {
          if (!item) return sum;
          const qty = parseFloat(item?.quantity?.toString() || '0');
          const pricePerUnit = parseFloat((item?.price_per_unit?.toString() || '0').replace(',', '.'));
          const itemTotal = qty * pricePerUnit;
          return sum + itemTotal;
        }, 0);
      } else {
        const totalPrice = parseFloat((order?.total_price || 0).toString());
        const deliveryPrice = parseFloat((order?.delivery_price || 0).toString());
        orderSubtotal = totalPrice - deliveryPrice;
      }

      // Get fee and threshold from route based on customer type
      let deliveryFee = 0;
      let minFreeThreshold = 0;

      if (customerType === 'home') {
        deliveryFee = parseFloat((deliveryRoute?.delivery_fee_home || 0).toString());
        minFreeThreshold = parseFloat((deliveryRoute?.home_min_free_delivery || 0).toString());
      } else if (customerType === 'gastro') {
        deliveryFee = parseFloat((deliveryRoute?.delivery_fee_gastro || 0).toString());
        minFreeThreshold = parseFloat((deliveryRoute?.gastro_min_free_delivery || 0).toString());
      } else if (customerType === 'wholesale') {
        deliveryFee = parseFloat((deliveryRoute?.delivery_fee_wholesale || 0).toString());
        minFreeThreshold = parseFloat((deliveryRoute?.wholesale_min_free_delivery || 0).toString());
      }

      // SMIŽANY RULE: If min_free_delivery is 0, delivery is automatically free
      if (minFreeThreshold === 0) {
        return 0;
      }

      // STRICT RULE: If orderSubtotal >= minFreeThreshold, free delivery
      if (orderSubtotal >= minFreeThreshold) {
        return 0;
      }

      return deliveryFee;
    } catch (error) {
      console.error('[OrdersPage] Error calculating delivery fee:', error);
      return 0;
    }
  };

  const getOrderTotal = (order: Order): number => {
    try {
      if (!order) return 0;

      let itemsSubtotal = 0;
      if (order.order_items && Array.isArray(order.order_items)) {
        itemsSubtotal = order.order_items.reduce((sum, item) => {
          if (!item) return sum;
          const qty = parseFloat(item.quantity?.toString() || '0');
          const pricePerUnit = parseFloat(item.price_per_unit?.toString().replace(',', '.') || '0');
          return sum + (qty * pricePerUnit);
        }, 0);
      } else {
        itemsSubtotal = order?.total_price || 0;
      }

      const deliveryFee = getDeliveryFee({ ...order, total_price: itemsSubtotal } as Order);
      return itemsSubtotal + deliveryFee;
    } catch (error) {
      console.error('[OrdersPage] Error calculating order total:', error);
      return 0;
    }
  };

  const totalRevenue = (() => {
    try {
      return (filteredOrders || []).reduce((sum, order) => {
        if (!order) return sum;
        return sum + getOrderTotal(order);
      }, 0);
    } catch (error) {
      console.error('[OrdersPage] Error calculating total revenue:', error);
      return 0;
    }
  })();

  const domaciRevenue = (() => {
    try {
      return (filteredOrders || [])
        .filter(o => {
          if (!o) return false;
          const customer = customers?.find(c => c.id === o.customer_id);
          return customer?.customer_type === 'home';
        })
        .reduce((sum, order) => {
          if (!order) return sum;
          return sum + getOrderTotal(order);
        }, 0);
    } catch (error) {
      console.error('[OrdersPage] Error calculating domaci revenue:', error);
      return 0;
    }
  })();

  const gastroRevenue = (() => {
    try {
      return (filteredOrders || [])
        .filter(o => {
          if (!o) return false;
          const customer = customers?.find(c => c.id === o.customer_id);
          return customer?.customer_type === 'gastro';
        })
        .reduce((sum, order) => {
          if (!order) return sum;
          return sum + getOrderTotal(order);
        }, 0);
    } catch (error) {
      console.error('[OrdersPage] Error calculating gastro revenue:', error);
      return 0;
    }
  })();

  const wholesaleRevenue = (() => {
    try {
      return (filteredOrders || [])
        .filter(o => {
          if (!o) return false;
          const customer = customers?.find(c => c.id === o.customer_id);
          return customer?.customer_type === 'wholesale';
        })
        .reduce((sum, order) => {
          if (!order) return sum;
          return sum + getOrderTotal(order);
        }, 0);
    } catch (error) {
      console.error('[OrdersPage] Error calculating wholesale revenue:', error);
      return 0;
    }
  })();

  const selectedRoute = routes?.find(r => r.name === route);
  const selectedRouteDeliveryDay = deliveryDays?.find(d => d.id === selectedRoute?.delivery_day_id);
  const deliveryDayHint = selectedRouteDeliveryDay
    ? `Dostupný deň rozvozu: ${selectedRouteDeliveryDay.name}`
    : deliveryDays.length > 0
    ? `Dostupné dni rozvozu: ${deliveryDays.map(d => d.name).join(', ')}`
    : '';

  const openNew = () => {

    try {
      setEditingOrder(null);
      setCustomerType('home');
      setCustomerId('');
      setDeliveryDate('');
      setStatus('pending');
      setOrderType('jednorazova');
      setWeekCount(1);
      setRoute('');
      setOrderNotes('');
      setCategoryFilter('all'); // Reset category filter to "all"
      setFreeDelivery(false); // Default: OFF = calculate delivery
      setManualDeliveryAmount(''); // Clear manual amount
      setCalculatedDeliveryPrice(0);
      setOrderItems([]);
      setCurrentItem({
        crop_name: '',
        quantity: 1,
        unit: 'ks',
        packaging_size: '',
        delivery_form: 'rezana',
        packaging_type: 'rPET',
        packaging_volume_ml: 250,
        has_label: false,
        notes: '',
        special_requirements: '',
        price_per_unit: '',
        is_special_item: false,
        custom_crop_name: ''
      });
      setWizardStep(1);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('❌ Error v openNew:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa otvoriť formulár', variant: 'destructive' });
    }
  };

  const openEdit = async (order: Order) => {
    // Check if this is part of a recurring series
    const isPartOfSeries = order.parent_order_id !== null ||
                          (order.is_recurring && (order.recurring_weeks || 0) > 1);

    if (isPartOfSeries) {
      // Show dialog to choose edit type
      setRecurringEditDialog({
        open: true,
        order: order
      });
    } else {
      // Normal edit
      await proceedWithEdit(order);
    }
  };

  const proceedWithEdit = async (order: Order) => {
    try {
      // Load complete order data with order_items from database
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('Error loading order items:', itemsError);
        toast({
          title: 'Chyba',
          description: 'Nepodarilo sa načítať položky objednávky',
          variant: 'destructive'
        });
        return;
      }

      if (orderItems && orderItems.length > 0) {
      }

      setEditingOrder(order);
      setCustomerType(order.customer_type || 'home');
      setCustomerId(order.customer_id);
      setDeliveryDate(order.delivery_date);
      setStatus(order.status);
      const recurrenceType = order.recurrence_pattern || 'jednorazova';
      setOrderType(recurrenceType);
      setWeekCount(order.recurring_weeks || 1);
      setRoute(order.route || '');
      setOrderNotes(order.notes || '');
      // Invert logic: DB stores charge_delivery (true=charge), UI uses freeDelivery (true=free)
      const shouldBeFree = !(order.charge_delivery ?? true);
      setFreeDelivery(shouldBeFree);

      // CRITICAL FIX: Nechaj manualDeliveryAmount prázdne aby sa doprava prepočítala automaticky v reálnom čase
      // useEffect automaticky prepočíta doprava z orderItems
      setManualDeliveryAmount('');
      setCalculatedDeliveryPrice(0);

      // Map order_items to OrderItem interface
      const mappedItems: OrderItem[] = (orderItems || []).map(item => {
        // Normalizuj packaging_size - pridaj "g" ak chýba
        let packagingSize = item.packaging_size || '50g';
        if (packagingSize && !packagingSize.includes('g') && !packagingSize.includes('kg') && !isNaN(Number(packagingSize))) {
          packagingSize = packagingSize + 'g';
        }

        return {
          id: item.id,
          crop_id: item.crop_id || undefined,
          crop_name: item.crop_name || '',
          blend_id: item.blend_id || undefined,
          quantity: item.quantity || 0,
          unit: item.unit || 'ks',
          packaging_size: packagingSize,
          delivery_form: item.delivery_form || 'whole',
          packaging_type: item.package_type || 'rPET',
          packaging_volume_ml: item.package_ml || 250,
          packaging_id: item.packaging_id || undefined,
          has_label: item.has_label_req || false,
          notes: item.notes || '',
          special_requirements: item.special_requirements || '',
          price_per_unit: item.price_per_unit || 0,
          total_price: item.total_price || 0,
          is_special_item: item.is_special_item || false,
          custom_crop_name: item.custom_crop_name || ''
        };
      });

      if (mappedItems.length > 0) {
      }

      setOrderItems(mappedItems);

      // Reset currentItem to empty state when opening edit dialog
      setCurrentItem({
        crop_name: '',
        quantity: 1,
        unit: 'ks',
        packaging_size: '',
        delivery_form: 'rezana',
        packaging_type: 'rPET',
        packaging_volume_ml: 250,
        has_label: false,
        notes: '',
        special_requirements: '',
        price_per_unit: '',
        is_special_item: false,
        custom_crop_name: ''
      });

      setWizardStep(1);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error in proceedWithEdit:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať objednávku',
        variant: 'destructive'
      });
    }
  };

  const openExtendDialog = (order: Order) => {
    setExtendDialog({ open: true, order });
  };

  const handleExtendConfirm = async (additionalWeeks: number) => {
    if (!extendDialog.order) return;

    try {
      const order = extendDialog.order;
      const parentId = order.recurring_order_id || order.parent_order_id || order.id;

      // Calculate new end date
      const currentEndDate = order.recurring_end_date ? new Date(order.recurring_end_date) : new Date();
      const newEndDate = addWeeks(currentEndDate, additionalWeeks);

      // Find all related orders in this recurring series
      const { data: relatedOrders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .or(`id.eq.${parentId},parent_order_id.eq.${parentId},recurring_order_id.eq.${parentId}`)
        .order('delivery_date', { ascending: true });

      if (fetchError) throw fetchError;

      if (!relatedOrders || relatedOrders.length === 0) {
        throw new Error('Nenašli sa žiadne súvisiace objednávky');
      }

      // Get the last order to use as template
      const lastOrder = relatedOrders[relatedOrders.length - 1];
      const currentTotalWeeks = order.recurring_total_weeks || relatedOrders.length;
      const newTotalWeeks = currentTotalWeeks + additionalWeeks;

      // Update all existing orders with new end date and total weeks
      const updatePromises = relatedOrders.map(ro =>
        supabase
          .from('orders')
          .update({
            recurring_end_date: format(newEndDate, 'yyyy-MM-dd'),
            recurring_total_weeks: newTotalWeeks
          })
          .eq('id', ro.id)
      );

      await Promise.all(updatePromises);

      // Load order items from the last order
      const { data: lastOrderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', lastOrder.id);

      if (itemsError) throw itemsError;

      // Create new orders for additional weeks
      let lastDeliveryDate = new Date(lastOrder.delivery_date);
      const newOrdersData = [];

      for (let i = 1; i <= additionalWeeks; i++) {
        lastDeliveryDate = addWeeks(lastDeliveryDate, 1);
        const weekNumber = currentTotalWeeks + i;

        const newOrder = {
          customer_id: lastOrder.customer_id,
          customer_name: lastOrder.customer_name,
          customer_type: lastOrder.customer_type,
          delivery_date: format(lastDeliveryDate, 'yyyy-MM-dd'),
          status: 'pending',
          order_type: lastOrder.order_type,
          route: lastOrder.route,
          charge_delivery: lastOrder.charge_delivery,
          delivery_price: lastOrder.delivery_price,
          notes: lastOrder.notes,
          is_recurring: true,
          recurring_weeks: 1,
          parent_order_id: parentId,
          recurring_order_id: parentId,
          recurring_start_date: order.recurring_start_date,
          recurring_end_date: format(newEndDate, 'yyyy-MM-dd'),
          recurring_current_week: weekNumber,
          recurring_total_weeks: newTotalWeeks,
        };

        newOrdersData.push(newOrder);
      }

      // Insert new orders
      const { data: insertedOrders, error: insertError } = await supabase
        .from('orders')
        .insert(newOrdersData)
        .select();

      if (insertError) throw insertError;

      // Clone order items for each new order
      if (lastOrderItems && lastOrderItems.length > 0 && insertedOrders) {
        const newOrderItems = [];

        for (const newOrder of insertedOrders) {
          for (const item of lastOrderItems) {
            const newItem = {
              order_id: newOrder.id,
              crop_id: item.crop_id,
              crop_name: item.crop_name,
              blend_id: item.blend_id,
              quantity: item.quantity,
              unit: item.unit,
              packaging_size: item.packaging_size,
              delivery_form: item.delivery_form,
              packaging_type: item.packaging_type,
              packaging_volume_ml: item.packaging_volume_ml,
              packaging_id: item.packaging_id,
              has_label: item.has_label,
              notes: item.notes,
              special_requirements: item.special_requirements,
              price_per_unit: item.price_per_unit,
              total_price: item.total_price,
              is_special_item: item.is_special_item,
              custom_crop_name: item.custom_crop_name,
            };
            newOrderItems.push(newItem);
          }
        }

        const { error: itemsInsertError } = await supabase
          .from('order_items')
          .insert(newOrderItems);

        if (itemsInsertError) throw itemsInsertError;

      }

      toast({
        title: 'Úspech',
        description: `Objednávka predĺžená o ${additionalWeeks} ${additionalWeeks === 1 ? 'týždeň' : additionalWeeks < 5 ? 'týždne' : 'týždňov'}`,
      });

      setExtendDialog({ open: false, order: null });
      await loadData();
    } catch (error) {
      console.error('Error extending recurring order:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa predĺžiť objednávku',
        variant: 'destructive',
      });
    }
  };

  const handleRecurringEditConfirm = async (updateAllFuture: boolean) => {
    setUpdateAllFutureOrders(updateAllFuture);
    if (recurringEditDialog.order) {
      await proceedWithEdit(recurringEditDialog.order);
    }
    setRecurringEditDialog({ open: false, order: null });
  };

  const autoFetchPrice = async (packagingSize: string, customerType: string, cropId?: string, blendId?: string) => {
    try {
      const query = supabase
        .from('prices')
        .select('*')
        .eq('packaging_size', packagingSize)
        .eq('customer_type', customerType);

      if (cropId) {
        query.eq('crop_id', cropId);
      } else if (blendId) {
        query.eq('blend_id', blendId);
      } else {
        return 0;
      }

      const { data: priceData } = await query.maybeSingle();

      return priceData?.unit_price || 0;
    } catch (error) {
      console.error('Error fetching price:', error);
      return 0;
    }
  };

  const autoFetchPackaging = async (packagingSize: string, cropId?: string, blendId?: string) => {
    try {
      const weightG = parseInt(packagingSize.replace(/[^0-9]/g, ''));
      if (!weightG) return null;
      if (!cropId && !blendId) return null;

      const itemType = cropId ? 'crop' : 'blend';
      const itemId = cropId || blendId;

      const query = supabase
        .from('packaging_mappings')
        .select('packaging_id, packagings(type, size)')
        .eq('weight_g', weightG);

      if (cropId) {
        query.eq('crop_id', cropId);
      } else if (blendId) {
        query.eq('blend_id', blendId);
      }

      const { data: mapping } = await query.maybeSingle();

      if (mapping && mapping.packagings) {
        const pkg: any = mapping.packagings;
        const volumeMatch = pkg.size?.match(/(\d+)/);
        const volumeMl = volumeMatch ? parseInt(volumeMatch[1]) : 250;

        const result = {
          packaging_id: mapping.packaging_id,
          packaging_type: pkg.type || 'rPET',
          packaging_volume_ml: volumeMl
        };

        return result;
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching packaging mapping:', error);
      return null;
    }
  };

  const addItemToList = async () => {
    if (!currentItem.is_special_item && !currentItem?.crop_name) {
      toast({ title: 'Chyba', description: 'Vyberte plodinu alebo zmes', variant: 'destructive' });
      return;
    }

    if (currentItem.is_special_item && !currentItem.custom_crop_name) {
      toast({ title: 'Chyba', description: 'Zadajte názov špeciálnej položky', variant: 'destructive' });
      return;
    }

    const autoPrice = (currentItem.crop_id || currentItem.blend_id) && customerType && !currentItem.is_special_item
      ? await autoFetchPrice(currentItem.packaging_size, customerType, currentItem.crop_id, currentItem.blend_id)
      : 0;

    const finalCropName = currentItem.is_special_item
      ? currentItem.custom_crop_name
      : currentItem.crop_name;

    const priceValue = autoPrice > 0
      ? autoPrice
      : parseFloat(currentItem.price_per_unit.toString().replace(',', '.')) || 0;

    const selectedCustomer = customers?.find(c => c.id === customerId);
    const alwaysLabel = (selectedCustomer as any)?.always_label || false;

    const itemToAdd = {
      ...currentItem,
      crop_id: currentItem.is_special_item ? null : currentItem.crop_id,
      crop_name: finalCropName,
      quantity: parseFloat(currentItem.quantity) || 1,
      price_per_unit: priceValue,
      is_special_item: currentItem.is_special_item || false,
      custom_crop_name: currentItem.is_special_item ? currentItem.custom_crop_name : null,
      has_label: false,
    };

    setOrderItems([...(orderItems || []), itemToAdd]);
    setCurrentItem({
      crop_name: '',
      quantity: 1,
      unit: 'ks',
      packaging_size: '',
      delivery_form: 'rezana',
      packaging_type: 'rPET',
      packaging_volume_ml: 250,
      has_label: false,
      notes: '',
      special_requirements: '',
      price_per_unit: '',
      is_special_item: false,
      custom_crop_name: ''
    });
  };

  const removeItem = (index: number) => {
    setOrderItems((orderItems || []).filter((_, i) => i !== index));
  };

  const checkCapacityForOrder = (orderDate: string, items: OrderItem[]) => {

    // Získaj harvest date (objednávka môže byť deň zberu alebo deň po zbere)
    const orderDateObj = new Date(orderDate);
    const harvestDate1 = new Date(orderDateObj);
    harvestDate1.setDate(harvestDate1.getDate() - 1); // deň pred
    const harvestDate2 = orderDateObj; // ten istý deň

    const harvestDate1Str = harvestDate1.toISOString().split('T')[0];
    const harvestDate2Str = harvestDate2.toISOString().split('T')[0];

    // Nájdi relevantné výsevy
    const relevantPlantings = plantings.filter(p => {
      if (p.status !== 'planted' && p.status !== 'sown') return false;
      const pHarvest = new Date(p.harvest_date).toISOString().split('T')[0];
      return pHarvest === harvestDate1Str || pHarvest === harvestDate2Str;
    });

    // Vypočítaj kapacitu pre každú plodinu+package_size
    const capacity: Record<string, number> = {};
    relevantPlantings.forEach(p => {
      if (p.tray_combinations && Array.isArray(p.tray_combinations)) {
        p.tray_combinations.forEach((combo: any) => {
          const key = `${p.crop_id}_${combo.package_size || p.package_size}`;
          if (!capacity[key]) capacity[key] = 0;
          capacity[key] += combo.quantity * (combo.capacity || p.tray_capacity || 0);
        });
      }
    });

    // Nájdi už existujúce objednávky na tento deň (okrem editovanej)
    const existingOrders = orders.filter(o => {
      if (o.status === 'delivered' || o.status === 'cancelled') return false;
      if (editingOrder && o.id === editingOrder.id) return false; // preskočiť editovanú
      const oDate = (o.delivery_date || '').split('T')[0];
      return oDate === orderDate.split('T')[0];
    });

    // Vypočítaj už objednané množstvo
    const ordered: Record<string, number> = {};
    existingOrders.forEach(order => {
      if (order.order_items && Array.isArray(order.order_items)) {
        order.order_items.forEach((item: any) => {
          const key = `${item.crop_id}_${item.package_size}`;
          if (!ordered[key]) ordered[key] = 0;
          ordered[key] += item.quantity * item.package_size;
        });
      }
    });

    // Kontroluj každú položku v novej objednávke
    const issues: Array<{
      cropName: string;
      packageSize: number;
      needed: number;
      capacity: number;
      ordered: number;
      shortage: number;
    }> = [];

    items.forEach(item => {
      const key = `${item.crop_id}_${item.package_size}`;
      const itemNeeded = item.quantity * (parseFloat(item.packaging_size) || 0);
      const itemCapacity = capacity[key] || 0;
      const itemOrdered = ordered[key] || 0;
      const availableCapacity = itemCapacity - itemOrdered;

      if (itemNeeded > availableCapacity) {
        issues.push({
          cropName: item.crop_name || 'Neznáma plodina',
          packageSize: parseFloat(item.packaging_size) || 0,
          needed: itemNeeded,
          capacity: itemCapacity,
          ordered: itemOrdered,
          shortage: itemNeeded - availableCapacity
        });
      }
    });

    return issues;
  };

  const saveOrder = async () => {
    if (!customerId) {
      toast({ title: 'Chyba', description: 'Vyberte zákazníka', variant: 'destructive' });
      return;
    }

    if (!deliveryDate) {
      toast({ title: 'Chyba', description: 'Vyberte dátum dodania', variant: 'destructive' });
      return;
    }

    if (!orderItems || orderItems.length === 0) {
      toast({ title: 'Chyba', description: 'Pridajte aspoň jednu položku', variant: 'destructive' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Chyba',
          description: 'Nie ste prihlásený',
          variant: 'destructive',
        });
        return;
      }

      // Zachytiť všetky state hodnoty pred zatvorením dialógu
      const capturedManualDelivery = manualDeliveryAmount;
      const capturedFreeDelivery = freeDelivery;
      const capturedOrderItems = [...(orderItems || [])];
      const capturedCustomerId = customerId;
      const capturedDeliveryDate = deliveryDate;
      const capturedOrderType = orderType;
      const capturedRoute = route;
      const capturedOrderNotes = orderNotes;
      const capturedStatus = status;


      // Zavrieť dialóg IHNEĎ — procesy prebiehajú na pozadí
      setIsDialogOpen(false);
      setWizardStep(1);
      toast({ title: 'Spracovávam...', description: 'Objednávka sa vytvára na pozadí.' });

      const customer = customers?.find(c => c.id === capturedCustomerId);
      const totalPrice = capturedOrderItems.reduce((sum, item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price_per_unit.toString().replace(',', '.')) || 0;
        return sum + (quantity * price);
      }, 0);

      // Calculate delivery fee with priority: Manual Amount > Free Toggle > Auto-calculation
      let deliveryPrice = 0;

      // PRIORITY 1: Free Delivery Toggle (forces 0€)
      if (capturedFreeDelivery) {
        deliveryPrice = 0;
      }
      // PRIORITY 2: Manual Delivery Amount (specific amount entered)
      else if (capturedManualDelivery && capturedManualDelivery.trim() !== '') {
        deliveryPrice = parseFloat(capturedManualDelivery) || 0;
      }
      // PRIORITY 3: Auto-calculate from route settings
      else if (customer) {
        // Auto-calculate delivery from route settings
        const custType = customer.customer_type || 'home';

        // Check if customer has free delivery exception
        if (customer.free_delivery) {
          deliveryPrice = 0;
        } else {
          // CRITICAL: Use selected route from dropdown, NOT customer's assigned route
          let deliveryRoute = null;

          if (capturedRoute && capturedRoute !== '' && route !== 'Žiadna trasa') {
            // Find route by NAME from the route dropdown selection
            deliveryRoute = routes?.find(r => r.name === capturedRoute);
          }

          if (deliveryRoute) {
            let deliveryFee = 0;
            let minFreeDelivery = 0;

            // Individuálna cena dopravy má prednosť pred štandardnými limitmi trasy
            if ((customer as any).custom_delivery_fee != null) {
              deliveryFee = parseFloat((customer as any).custom_delivery_fee);
              minFreeDelivery = parseFloat((customer as any).custom_min_free_delivery || '0');
            } else if (custType === 'home') {
              deliveryFee = parseFloat((deliveryRoute?.delivery_fee_home || 0).toString());
              minFreeDelivery = parseFloat((deliveryRoute?.home_min_free_delivery || 0).toString());
            } else if (custType === 'gastro') {
              deliveryFee = parseFloat((deliveryRoute?.delivery_fee_gastro || 0).toString());
              minFreeDelivery = parseFloat((deliveryRoute?.gastro_min_free_delivery || 0).toString());
            } else if (custType === 'wholesale') {
              deliveryFee = parseFloat((deliveryRoute?.delivery_fee_wholesale || 0).toString());
              minFreeDelivery = parseFloat((deliveryRoute?.wholesale_min_free_delivery || 0).toString());
            }

            // SMIŽANY RULE: If min_free_delivery is 0, delivery is automatically free
            if (minFreeDelivery === 0) {
              deliveryPrice = 0;
            } else if (totalPrice >= minFreeDelivery) {
              // Threshold met: free delivery
              deliveryPrice = 0;
            } else {
              // Below threshold: charge delivery fee
              deliveryPrice = deliveryFee;
            }

          } else {
            console.warn('⚠️ No delivery route selected or invalid route');
          }
        }
      }

      // VALIDATION: If charge_delivery is true but deliveryPrice is 0, recalculate
      // SKIP if manual delivery was set — manual always wins
      if (!capturedFreeDelivery && !capturedManualDelivery && deliveryPrice === 0 && capturedRoute && capturedRoute !== '' && capturedRoute !== 'Žiadna trasa') {
        const deliveryRoute = routes?.find(r => r.name === capturedRoute);
        if (deliveryRoute && customer && !customer.free_delivery) {
          const custType = customer.customer_type || 'home';
          let deliveryFee = 0;
          let minFreeDelivery = 0;

          if ((customer as any).custom_delivery_fee != null) {
            deliveryFee = parseFloat((customer as any).custom_delivery_fee);
            minFreeDelivery = parseFloat((customer as any).custom_min_free_delivery || '0');
          } else if (custType === 'home') {
            deliveryFee = parseFloat((deliveryRoute?.delivery_fee_home || 0).toString());
            minFreeDelivery = parseFloat((deliveryRoute?.home_min_free_delivery || 0).toString());
          } else if (custType === 'gastro') {
            deliveryFee = parseFloat((deliveryRoute?.delivery_fee_gastro || 0).toString());
            minFreeDelivery = parseFloat((deliveryRoute?.gastro_min_free_delivery || 0).toString());
          } else if (custType === 'wholesale') {
            deliveryFee = parseFloat((deliveryRoute?.delivery_fee_wholesale || 0).toString());
            minFreeDelivery = parseFloat((deliveryRoute?.wholesale_min_free_delivery || 0).toString());
          }

          if (minFreeDelivery !== 0 && totalPrice < minFreeDelivery) {
            deliveryPrice = deliveryFee;
          }
        }
      }


      const finalTotalPrice = totalPrice + deliveryPrice;


      const orderData = {
        customer_id: capturedCustomerId,
        customer_name: customer?.company_name || customer?.name || '',
        customer_type: customer?.customer_type || 'home',
        delivery_date: capturedDeliveryDate,
        status: capturedOrderType !== 'jednorazova' ? 'growing' : capturedStatus,
        total_price: Number(parseFloat(finalTotalPrice.toFixed(2))),
        delivery_price: Number(parseFloat(deliveryPrice.toFixed(2))),
        charge_delivery: !capturedFreeDelivery,
        route: capturedRoute || null,
        delivery_route_id: customer?.delivery_route_id || null,
        notes: capturedOrderNotes || null,
        is_recurring: capturedOrderType === 'tyzdenne' || capturedOrderType === 'dvojtyzdenne',
        recurrence_pattern: capturedOrderType !== 'jednorazova' ? capturedOrderType : null,
        recurring_weeks: capturedOrderType !== 'jednorazova' ? parseInt(weekCount) || 1 : null,
        order_source: 'manual',
        user_id: user.id
      };

      if (editingOrder) {
        let ordersToUpdate: Array<{ id: string; delivery_date: string }> = [
          { id: editingOrder.id, delivery_date: editingOrder.delivery_date }
        ];

        // Check if we need to update all future orders
        if (updateAllFutureOrders) {

          // Find parent order ID (either parent_order_id or current order id if it's the parent)
          const parentId = editingOrder.parent_order_id || editingOrder.id;

          // Find all related orders with delivery_date >= current order date
          const { data: relatedOrders, error: fetchError } = await supabase
            .from('orders')
            .select('id, delivery_date')
            .or(`id.eq.${parentId},parent_order_id.eq.${parentId}`)
            .gte('delivery_date', editingOrder.delivery_date)
            .order('delivery_date', { ascending: true });

          if (fetchError) {
            console.error('Error fetching related orders:', fetchError);
            throw fetchError;
          }

          if (relatedOrders && relatedOrders.length > 0) {
            ordersToUpdate = relatedOrders.map(o => ({
              id: o.id,
              delivery_date: o.delivery_date
            }));
          }
        }

        // Update each order individually to preserve delivery_date
        for (const orderToUpdate of ordersToUpdate) {

          // Prepare order data, preserving original delivery_date
          const updateData = {
            ...orderData,
            delivery_date: orderToUpdate.delivery_date // PRESERVE original delivery date!
          };

          const { error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderToUpdate.id);

          if (updateError) {
            console.error(`Error updating order ${orderToUpdate.id}:`, updateError);
            throw updateError;
          }
        }

        // Update order items for all selected orders
        for (const orderToUpdate of ordersToUpdate) {
          const orderId = orderToUpdate.id;

          // Delete existing items
          await deleteOrderItemsDirectFetch(orderId);

          // Prepare new items
          const items = (orderItems || []).map(item => {
            const crop = crops?.find(c => c.id === item.crop_id);
            const blend = blends?.find(b => b.id === item.blend_id);
            const cropName = item.is_special_item
              ? item.custom_crop_name
              : (crop ? crop.name : (blend ? `${blend.name} (Mix)` : ''));

            const weightValue = item.packaging_size?.toString().replace(/[^0-9.]/g, '') || '0';
            const quantity = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price_per_unit.toString().replace(',', '.')) || 0;

            return {
              order_id: orderId,
              crop_id: item.is_special_item ? null : (item.crop_id || null),
              blend_id: item.blend_id || null,
              crop_name: cropName,
              quantity: Number(quantity),
              unit: item.unit,
              packaging_size: weightValue,
              delivery_form: item.delivery_form,
              has_label: item.has_label,
              notes: item.notes || null,
              packaging_type: item.packaging_type || 'PET',
              packaging_volume_ml: item.packaging_volume_ml || null,
              packaging_id: item.packaging_id || null,
              special_requirements: item.special_requirements || null,
              price_per_unit: Number(price),
              total_price: Number(parseFloat((quantity * price).toFixed(2))),
              is_special_item: item.is_special_item || false,
              custom_crop_name: item.is_special_item ? item.custom_crop_name : null,
              user_id: user.id
            };
          });

          // Insert new items
          for (let idx = 0; idx < items.length; idx++) {
            const item = items[idx];

            const itemData = {
              order_id: orderId,
              crop_id: item.crop_id || null,
              blend_id: item.blend_id || null,
              quantity: item.quantity,
              pieces: 0,
              delivery_form: item.delivery_form || 'whole',
              price_per_unit: item.price_per_unit,
              total_price: item.total_price,
              package_type: item.packaging_type || null,
              package_ml: item.packaging_volume_ml || null,
              has_label_req: item.has_label || false,
              crop_name: item.crop_name || null,
              unit: item.unit || 'ks',
              packaging_size: item.packaging_size || '50g',
              notes: item.notes || null,
              packaging_id: item.packaging_id || null,
              special_requirements: item.special_requirements || null,
              is_special_item: item.is_special_item || false,
              custom_crop_name: item.custom_crop_name || null
            };

            try {
              await createOrderItemDirectFetch(itemData);
            } catch (itemError) {
              console.error(`=== DIRECT FETCH ERROR Item ${idx + 1} for order ${orderId} ===`, itemError);
              throw itemError;
            }
          }

          // Decrement packaging stock for each item
          for (const item of orderItems || []) {
            if (item?.packaging_id && item?.quantity) {
              try {
                await supabase.rpc('decrement_packaging_stock', {
                  packaging_id: item.packaging_id,
                  amount: item.quantity
                });
              } catch (pkgError) {
                console.error(`[OrdersPage] Error decrementing packaging stock for order ${orderId}:`, pkgError);
              }
            }
          }
        }

        // Reset state
        setUpdateAllFutureOrders(false);

        // Show success message
        if (ordersToUpdate.length > 1) {
          toast({
            title: 'Úspech',
            description: `Upravených ${ordersToUpdate.length} objednávok`
          });
        } else {
          toast({ title: 'Úspech', description: 'Objednávka upravená' });
        }

        setIsDialogOpen(false);
        await loadData();
      } else {
        // Create parent order
        const { data: newOrder, error } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (error) throw error;

        // Helper function to create order items for an order
        const createOrderItemsForOrder = async (orderId: string) => {
          const items = capturedOrderItems.map(item => {
            const crop = crops?.find(c => c.id === item.crop_id);
            const blend = blends?.find(b => b.id === item.blend_id);
            const cropName = item.is_special_item
              ? item.custom_crop_name
              : (crop ? crop.name : (blend ? `${blend.name} (Mix)` : ''));

            const weightValue = item.packaging_size?.toString().replace(/[^0-9.]/g, '') || '0';
            const quantity = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price_per_unit.toString().replace(',', '.')) || 0;

            return {
              order_id: orderId,
              crop_id: item.is_special_item ? null : (item.crop_id || null),
              blend_id: item.blend_id || null,
              crop_name: cropName,
              quantity: Number(quantity),
              unit: item.unit,
              packaging_size: weightValue,
              delivery_form: item.delivery_form,
              has_label: item.has_label,
              notes: item.notes || null,
              packaging_type: item.packaging_type || 'PET',
              packaging_volume_ml: item.packaging_volume_ml || null,
              packaging_id: item.packaging_id || null,
              special_requirements: item.special_requirements || null,
              price_per_unit: Number(price),
              total_price: Number(parseFloat((quantity * price).toFixed(2))),
              is_special_item: item.is_special_item || false,
              custom_crop_name: item.is_special_item ? item.custom_crop_name : null,
              user_id: user.id
            };
          });

          for (let idx = 0; idx < items.length; idx++) {
            const item = items[idx];

            const itemData = {
              order_id: orderId,
              crop_id: item.crop_id || null,
              blend_id: item.blend_id || null,
              quantity: item.quantity,
              pieces: 0,
              delivery_form: item.delivery_form || 'whole',
              price_per_unit: item.price_per_unit,
              total_price: item.total_price,
              package_type: item.packaging_type || null,
              package_ml: item.packaging_volume_ml || null,
              has_label_req: item.has_label || false,
              crop_name: item.crop_name || null,
              unit: item.unit || 'ks',
              packaging_size: item.packaging_size || '50g',
              notes: item.notes || null,
              packaging_id: item.packaging_id || null,
              special_requirements: item.special_requirements || null,
              is_special_item: item.is_special_item || false,
              custom_crop_name: item.custom_crop_name || null
            };

            try {
              await createOrderItemDirectFetch(itemData);
            } catch (itemError) {
              console.error(`=== DIRECT FETCH ERROR Item ${idx + 1} for order ${orderId} ===`, itemError);
              throw itemError;
            }
          }

          // Decrement packaging stock for each item
          for (const item of orderItems || []) {
            if (item?.packaging_id && item?.quantity) {
              try {
                await supabase.rpc('decrement_packaging_stock', {
                  packaging_id: item.packaging_id,
                  amount: item.quantity
                });
              } catch (pkgError) {
                console.error(`[OrdersPage] Error decrementing packaging stock for order ${orderId}:`, pkgError);
              }
            }
          }
        };

        // Create items for parent order
        await createOrderItemsForOrder(newOrder.id);

        // Check if this is a recurring order
        const isRecurring = capturedOrderType !== 'jednorazova';
        const weeksInterval = capturedOrderType === 'tyzdenne' ? 1 : 2;
        const weeksAhead = 4;
        const recurringCount = isRecurring ? Math.floor(weeksAhead / weeksInterval) : 1;

        if (isRecurring && recurringCount > 0) {

          const childOrders = [];

          for (let i = 1; i <= recurringCount; i++) {
            const newDate = new Date(capturedDeliveryDate);
            newDate.setDate(newDate.getDate() + (weeksInterval * i * 7));
            const newDateString = newDate.toISOString().split('T')[0];

            const childOrderData = {
              customer_id: capturedCustomerId,
              customer_name: customer?.company_name || customer?.name || '',
              customer_type: customer?.customer_type || 'home',
              delivery_date: newDateString,
              status: 'growing',
              total_price: Number(parseFloat(finalTotalPrice.toFixed(2))),
              delivery_price: Number(parseFloat(deliveryPrice.toFixed(2))),
              charge_delivery: !capturedFreeDelivery,
              route: capturedRoute || null,
              delivery_route_id: customer?.delivery_route_id || null,
              notes: capturedOrderNotes || null,
              is_recurring: true,
              recurrence_pattern: capturedOrderType,
              recurring_weeks: recurringCount + 1,
              parent_order_id: newOrder.id,
              order_source: 'recurring',
              user_id: user.id
            };

            childOrders.push(childOrderData);
          }

          // Insert all child orders at once
          const { data: insertedChildOrders, error: childError } = await supabase
            .from('orders')
            .insert(childOrders)
            .select();

          if (childError) {
            console.error('Error creating child orders:', childError);
            throw childError;
          }

          // Create order items for each child order
          for (const childOrder of insertedChildOrders) {
            await createOrderItemsForOrder(childOrder.id);
          }

          toast({
            title: 'Úspech',
            description: `Vytvorených ${recurringCount + 1} objednávok (4 týždne dopredu)`
          });
        } else {
          toast({ title: 'Úspech', description: 'Objednávka vytvorená' });
        }

        setIsDialogOpen(false);
        await loadData();
      }
    } catch (error: any) {
      console.error('=== SAVE ORDER ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error details:', error?.details);
      console.error('Error hint:', error?.hint);
      console.error('Error code:', error?.code);
      console.error('Order data:', {
        customer_id: customerId,
        customer_type: customerType,
        delivery_date: deliveryDate,
        status: status,
        order_type: orderType,
        items_count: orderItems?.length
      });
      console.error('Order items:', orderItems);
      console.error('========================');

      const errorMsg = error?.message || error?.details || 'Nepodarilo sa uložiť objednávku';
      toast({
        title: 'Chyba pri ukladaní',
        description: errorMsg,
        variant: 'destructive'
      });
    }
  };

  const openDeleteDialog = async (orderId: string) => {
    try {
      // Fetch the order to check if it's part of a recurring series
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        toast({
          title: 'Chyba',
          description: 'Nepodarilo sa načítať objednávku',
          variant: 'destructive'
        });
        return;
      }

      // Check if this is part of a recurring series
      // Parent: has children orders (parent_order_id pointing to this id)
      // Child: has parent_order_id set
      let isPartOfSeries = order.parent_order_id !== null ||
                           (order.is_recurring && (order.recurring_weeks || 0) > 1) ||
                           order.recurrence_pattern === 'tyzdenne' ||
                           order.recurrence_pattern === 'dvojtyzdenne';

      // If not detected yet, check if this order has any children in DB
      if (!isPartOfSeries) {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('parent_order_id', orderId);
        if ((count || 0) > 0) isPartOfSeries = true;
      }

      if (isPartOfSeries) {
        // Show recurring delete dialog
        setRecurringDeleteDialog({
          open: true,
          order: order as Order
        });
      } else {
        // Show normal delete dialog
        setOrderToDelete(orderId);
        setDeleteDialogOpen(true);
      }
    } catch (error) {
      console.error('Error in openDeleteDialog:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať objednávku',
        variant: 'destructive'
      });
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderToDelete);
      if (error) throw error;

      toast({ title: 'Úspech', description: 'Objednávka odstránená' });
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa odstrániť objednávku', variant: 'destructive' });
    }
  };

  const handleRecurringDeleteConfirm = async (deleteAllFuture: boolean) => {
    if (!recurringDeleteDialog.order) return;

    try {
      const orderToDelete = recurringDeleteDialog.order;

      if (deleteAllFuture) {

        // Find parent order ID
        const parentId = orderToDelete.parent_order_id || orderToDelete.id;
        const currentDate = orderToDelete.delivery_date;

        // Fetch ALL orders in the series (parent + all children)
        const { data: allSeriesOrders, error: fetchError } = await supabase
          .from('orders')
          .select('id, delivery_date, parent_order_id')
          .or(`id.eq.${parentId},parent_order_id.eq.${parentId}`);

        if (fetchError) throw fetchError;

        // Filter: keep only orders with delivery_date >= current order date
        const ordersToDelete = (allSeriesOrders || []).filter(o =>
          o.delivery_date >= currentDate
        );

        if (ordersToDelete.length > 0) {
          const orderIds = ordersToDelete.map(o => o.id);

          // Delete order_items first (foreign key constraint)
          for (const oid of orderIds) {
            await supabase.from('order_items').delete().eq('order_id', oid);
          }

          // Then delete orders one by one to avoid any constraint issues
          let deletedCount = 0;
          for (const oid of orderIds) {
            const { error: delErr } = await supabase.from('orders').delete().eq('id', oid);
            if (!delErr) deletedCount++;
            else console.error('Error deleting order', oid, delErr);
          }

          toast({
            title: 'Úspech',
            description: `Zmazaných ${deletedCount} objednávok`
          });
        } else {
          toast({ title: 'Info', description: 'Žiadne budúce objednávky na zmazanie' });
        }
      } else {

        // Delete order items first
        const { error: itemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', orderToDelete.id);

        if (itemsError) {
          console.error('Error deleting order items:', itemsError);
          throw itemsError;
        }

        // Then delete the order
        const { error: orderError } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderToDelete.id);

        if (orderError) {
          console.error('Error deleting order:', orderError);
          throw orderError;
        }

        toast({
          title: 'Úspech',
          description: 'Objednávka zmazaná'
        });
      }

      // Close dialog and refresh
      setRecurringDeleteDialog({ open: false, order: null });
      await loadData();
    } catch (error) {
      console.error('Error in handleRecurringDeleteConfirm:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa zmazať objednávku',
        variant: 'destructive'
      });
    }
  };

  const duplicateOrder = async (order: Order) => {
    try {

      // Sanitize and ensure proper data types - convert everything to valid numbers or 0
      const sanitizeNumber = (val: any, defaultValue = 0): number => {
        if (val === null || val === undefined || val === '') return defaultValue;
        const num = typeof val === 'string' ? parseFloat(val) : Number(val);
        return isNaN(num) ? defaultValue : num;
      };

      // Create a completely clean order object with SNAKE_CASE database columns
      // CRITICAL: Database uses snake_case column names, NOT camelCase
      // Strip: id, created_at, updated_at, user_id (auto-populated by trigger)
      const orderData: any = {
        customer_id: order.customer_id,
        customer_name: order.customer_name || '',
        customer_type: order.customer_type || '',
        delivery_date: null, // Reset date - user MUST select new date
        status: 'pending', // Force pending status for new duplicate
        charge_delivery: Boolean(order.charge_delivery),
        // Default to single order (not recurring)
        is_recurring: false,
        recurrence_pattern: null,
        recurring_weeks: null,
        recurring_type: null,
        // Critical: Convert ALL numeric strings to Number
        total_price: Number(order.total_price) || 0,
        delivery_price: Number(order.delivery_price) || 0
      };

      // Add optional fields with proper snake_case database column mapping
      if (order.route) {
        orderData.route = order.route;
      }
      if (order.notes) {
        orderData.notes = order.notes;
      }
      // packaging_type (snake_case) - NOT packagingType (camelCase)
      if (order.packaging_type) {
        orderData.packaging_type = order.packaging_type;
      }
      // has_label (snake_case) - NOT hasLabel (camelCase)
      if (order.has_label !== undefined && order.has_label !== null) {
        orderData.has_label = Boolean(order.has_label);
      }
      // delivery_route_id (snake_case) - NOT deliveryRouteId (camelCase)
      if (order.delivery_route_id) {
        orderData.delivery_route_id = order.delivery_route_id;
      }
      // delivery_type - if exists
      if (order.delivery_type) {
        orderData.delivery_type = order.delivery_type;
      }
      // delivery_order - if exists
      if (order.delivery_order !== undefined && order.delivery_order !== null) {
        orderData.delivery_order = order.delivery_order;
      }

      // Get current user for user_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Add user_id for consistency (even though trigger should auto-populate)
      orderData.user_id = user.id;

      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) {
        console.error('❌ ORDER INSERT FAILED');
        console.error('Error object:', JSON.stringify(error, null, 2));
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Error code:', error.code);
        console.error('Data that was sent:', JSON.stringify(orderData, null, 2));
        throw error;
      }

      // Copy all order items with completely sanitized data
      if (order.order_items && order.order_items.length > 0) {

        const items = order.order_items.map((item, index) => {
          // Create completely clean item with SNAKE_CASE database columns
          // CRITICAL: order_items table does NOT have packaging_type column!
          // packaging_type only exists in orders table, not order_items
          const cleanItem: any = {
            order_id: newOrder.id, // NEW order id
            quantity: Number(item.quantity) || 0, // Convert to Number
            unit: item.unit || 'g',
            // Fields that exist in order_items table (verified against schema)
            packaging_size: item.packaging_size || '',
            delivery_form: item.delivery_form || '',
            packaging_type: item.packaging_type || '',
            packaging_volume_ml: Number(item.packaging_volume_ml) || 0, // integer type
            has_label: Boolean(item.has_label),
            // Price fields - convert to Number
            price_per_unit: Number(item.price_per_unit) || 0,
            total_price: Number(item.total_price) || 0,
            // Add user_id for consistency
            user_id: user.id
          };

          // Add optional fields only if they exist (all snake_case)
          if (item.crop_id) cleanItem.crop_id = item.crop_id;
          if (item.crop_name) cleanItem.crop_name = item.crop_name;
          if (item.blend_id) cleanItem.blend_id = item.blend_id;
          if (item.packaging_id) cleanItem.packaging_id = item.packaging_id;
          if (item.notes) cleanItem.notes = item.notes;
          if (item.special_requirements) cleanItem.special_requirements = item.special_requirements;
          if (item.is_special_item !== undefined) cleanItem.is_special_item = Boolean(item.is_special_item);
          if (item.custom_crop_name) cleanItem.custom_crop_name = item.custom_crop_name;
          if (item.pieces !== undefined && item.pieces !== null) cleanItem.pieces = Number(item.pieces) || 0;

          return cleanItem;
        });

        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];

          const itemData = {
            order_id: newOrder.id,
            crop_id: item.crop_id || null,
            blend_id: item.blend_id || null,
            quantity: item.quantity,
            pieces: item.pieces || 0,
            delivery_form: item.delivery_form || 'whole',
            price_per_unit: item.price_per_unit,
            total_price: item.total_price,
            package_type: item.packaging_type || null,
            package_ml: item.packaging_volume_ml || null,
            has_label_req: item.has_label || false,
            crop_name: item.crop_name || null,
            unit: item.unit || 'ks',
            packaging_size: item.packaging_size || '50g',
            notes: item.notes || null,
            packaging_id: item.packaging_id || null,
            special_requirements: item.special_requirements || null,
            is_special_item: item.is_special_item || false,
            custom_crop_name: item.custom_crop_name || null
          };

          try {
            await createOrderItemDirectFetch(itemData);
          } catch (itemError) {
            console.error('❌ DIRECT FETCH FAILED (DUPLICATE ORDER) Item', idx + 1);
            console.error('Error object:', JSON.stringify(itemError, null, 2));
            console.error('Item that was sent:', JSON.stringify(item, null, 2));
            throw itemError;
          }
        }

      }

      // Reload data
      await loadData();

      // Find and open the new order for editing
      const allOrdersQuery = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', newOrder.id)
        .single();

      if (allOrdersQuery.data) {
        openEdit(allOrdersQuery.data);
      }

      toast({ title: 'Úspech', description: 'Objednávka zduplikovaná - prosím vyberte nový dátum dodania' });
    } catch (error: any) {
      console.error('=== DUPLICATION FAILED ===');
      console.error('Full error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error details:', error?.details);

      toast({
        title: 'Chyba',
        description: `Nepodarilo sa zduplikovať objednávku: ${error?.message || 'Neznáma chyba'}. Skontrolujte konzolu pre detaily.`,
        variant: 'destructive'
      });
    }
  };

  const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      toast({ title: 'Chyba', description: 'Nepodarilo sa zmeniť stav.', variant: 'destructive' });
      return;
    }
    setSelectedOrderDetail(prev => prev ? { ...prev, status: newStatus } : null);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    toast({ title: 'Stav zmenený', description: `Objednávka označená: ${getStatusLabel(newStatus)}.` });
  };

  useEffect(() => {
    if (!detailModalOpen || !selectedOrderDetail) return;
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'e' || e.key === 'E') {
        setDetailModalOpen(false);
        openEdit(selectedOrderDetail);
      }
      if ((e.key === 'd' || e.key === 'D') && selectedOrderDetail.status === 'on_the_way') {
        handleQuickStatusChange(selectedOrderDetail.id, 'delivered');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [detailModalOpen, selectedOrderDetail]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mb-4"></div>
            <div className="text-lg font-semibold text-gray-700">Načítavam dáta...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <OrdersTopBar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNewOrder={openNew}
          onBulkDateChange={() => setBulkDateChangeOpen(true)}
          showArchive={showArchive}
          onShowArchiveChange={setShowArchive}
          showCancelled={showCancelled}
          onShowCancelledChange={setShowCancelled}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />

        <OrdersFilterBar
          filterCustomerType={filterCustomerType}
          onFilterCustomerTypeChange={setFilterCustomerType}
          customerFilter={customerFilter}
          onCustomerFilterChange={setCustomerFilter}
          orderCategoryFilter={orderCategoryFilter}
          onOrderCategoryFilterChange={setOrderCategoryFilter}
          filterCrop={filterCrop}
          onFilterCropChange={setFilterCrop}
          filterPeriod={filterPeriod}
          onFilterPeriodChange={setFilterPeriod}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          selectedDates={selectedDates}
          onSelectedDatesChange={setSelectedDates}
          calendarOpen={calendarOpen}
          onCalendarOpenChange={setCalendarOpen}
          customers={customers}
          crops={crops}
          blends={blends}
          orders={orders}
          getDeliveryDaysArray={getDeliveryDaysFromSettings}
        />

        <OrdersStatsBar
          filteredOrders={filteredOrders}
          customers={customers}
          domaciRevenue={domaciRevenue}
          gastroRevenue={gastroRevenue}
          wholesaleRevenue={wholesaleRevenue}
        />

        {effectiveViewMode === 'list' ? (
          <OrdersTableView
            filteredOrders={filteredOrders}
            getOrderTotal={getOrderTotal}
            onSelectOrder={(order) => { setSelectedOrderDetail(order); setDetailModalOpen(true); }}
            onDuplicate={duplicateOrder}
            onEdit={openEdit}
            onDelete={openDeleteDialog}
          />
        ) : (
          <OrdersCardView
            filteredOrders={filteredOrders}
            customers={customers}
            routes={routes}
            getOrderTotal={getOrderTotal}
            getDeliveryFee={getDeliveryFee}
            onSelectOrder={(order) => { setSelectedOrderDetail(order); setDetailModalOpen(true); }}
            onDuplicate={duplicateOrder}
            onEdit={openEdit}
            onDelete={openDeleteDialog}
          />
        )}

        {filteredOrders.length === 0 && (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">Žiadne objednávky</p>
            <p className="text-gray-400 text-sm mt-1">Začnite pridaním novej objednávky</p>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setWizardStep(1); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto z-[60]" onInteractOutside={(e) => e.preventDefault()}>
          {(() => {
            try {
              const safeCustomers = customers || [];
              const safeRoutes = routes || [];
              const safePackagings = packagings || [];

              /* Step indicator */
              const stepLabels = ['Zákazník', 'Produkty', 'Doprava'];
              const StepIndicator = () => (
                <div className="flex items-center justify-center gap-0 mb-5 mt-1">
                  {stepLabels.map((label, i) => {
                    const n = i + 1;
                    const done = wizardStep > n;
                    const active = wizardStep === n;
                    return (
                      <div key={n} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                            done ? 'bg-[#10b981] border-[#10b981] text-white' :
                            active ? 'bg-white border-[#10b981] text-[#10b981]' :
                            'bg-white border-[#cbd5e1] text-[#94a3b8]'
                          }`}>
                            {done ? <Check className="h-3.5 w-3.5" /> : n}
                          </div>
                          <span className={`text-[10px] mt-1 font-medium ${active || done ? 'text-[#10b981]' : 'text-[#94a3b8]'}`}>{label}</span>
                        </div>
                        {i < stepLabels.length - 1 && (
                          <div className={`w-14 h-0.5 mx-1 mb-4 transition-colors ${wizardStep > n ? 'bg-[#10b981]' : 'bg-[#e2e8f0]'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              );

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-base">{editingOrder ? 'Upraviť objednávku' : 'Nová objednávka'}</DialogTitle>
                  </DialogHeader>

                  <StepIndicator />

                  {/* STEP 1: Zákazník & Dodanie */}
                  {wizardStep === 1 && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-semibold text-[#475569] font-bold uppercase tracking-wider mb-2 block">Typ zákazníka</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <button type="button" onClick={async () => { setCustomerType('home'); setCustomerId(''); if ((currentItem?.crop_id || currentItem?.blend_id) && currentItem?.packaging_size) { const p = await autoFetchPrice(currentItem.packaging_size, 'home', currentItem.crop_id, currentItem.blend_id); setCurrentItem(prev => ({ ...prev, price_per_unit: p > 0 ? p.toString() : (prev.price_per_unit || '') })); } }} className={`h-14 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${customerType === 'home' ? 'border-[#10b981] bg-emerald-50' : 'border-[#cbd5e1] hover:border-[#cbd5e1]'}`}>
                            <House className={`h-4 w-4 ${customerType === 'home' ? 'text-[#10b981]' : 'text-[#94a3b8]'}`} />
                            <span className="text-xs font-medium">Domáci</span>
                          </button>
                          <button type="button" onClick={async () => { setCustomerType('gastro'); setCustomerId(''); if ((currentItem?.crop_id || currentItem?.blend_id) && currentItem?.packaging_size) { const p = await autoFetchPrice(currentItem.packaging_size, 'gastro', currentItem.crop_id, currentItem.blend_id); setCurrentItem(prev => ({ ...prev, price_per_unit: p > 0 ? p.toString() : (prev.price_per_unit || '') })); } }} className={`h-14 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${customerType === 'gastro' ? 'border-blue-500 bg-blue-50' : 'border-[#cbd5e1] hover:border-[#cbd5e1]'}`}>
                            <Utensils className={`h-4 w-4 ${customerType === 'gastro' ? 'text-blue-500' : 'text-[#94a3b8]'}`} />
                            <span className="text-xs font-medium">Gastro</span>
                          </button>
                          <button type="button" onClick={async () => { setCustomerType('wholesale'); setCustomerId(''); if ((currentItem?.crop_id || currentItem?.blend_id) && currentItem?.packaging_size) { const p = await autoFetchPrice(currentItem.packaging_size, 'wholesale', currentItem.crop_id, currentItem.blend_id); setCurrentItem(prev => ({ ...prev, price_per_unit: p > 0 ? p.toString() : (prev.price_per_unit || '') })); } }} className={`h-14 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${customerType === 'wholesale' ? 'border-orange-500 bg-orange-50' : 'border-[#cbd5e1] hover:border-[#cbd5e1]'}`}>
                            <Store className={`h-4 w-4 ${customerType === 'wholesale' ? 'text-orange-500' : 'text-[#94a3b8]'}`} />
                            <span className="text-xs font-medium">VO</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-medium">Zákazník *</Label>
                          <div className="mt-1 [&_button]:h-10 [&_[role=combobox]]:h-10">
                            <SearchableCustomerSelect
                              customers={safeCustomers}
                              value={customerId || ''}
                              onValueChange={(newId) => {
                                setCustomerId(newId);
                                const c = safeCustomers.find(c => c.id === newId);
                                if (c && (c as any).delivery_route_id) {
                                  const r = safeRoutes.find(r => r.id === (c as any).delivery_route_id);
                                  if (r) setRoute(r.name);
                                }
                              }}
                              filterByType={customerType}
                              placeholder="Vyberte zákazníka"
                              allowAll={false}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Trasa</Label>
                          <select value={route || ''} onChange={(e) => setRoute(e.target.value)} className="mt-1 w-full h-10 px-3 border border-[#cbd5e1] rounded-md text-sm bg-white">
                            <option value="">Žiadna trasa</option>
                            {safeRoutes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-medium">Dátum dodania *</Label>
                          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn('w-full h-10 justify-start text-left font-normal mt-1 border-[#cbd5e1]', !deliveryDate && 'text-muted-foreground')}>
                                <Calendar className="mr-2 h-4 w-4" />
                                {deliveryDate ? format(new Date(deliveryDate), 'dd. MMM yyyy', { locale: sk }) : 'Vyberte dátum'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={deliveryDate ? new Date(deliveryDate) : undefined}
                                onSelect={(date) => { if (date) { setDeliveryDate(format(date, 'yyyy-MM-dd')); setDatePopoverOpen(false); } }}
                                locale={sk}
                                modifiers={{ deliveryDay: (date) => getDeliveryDaysArray().includes(getDay(date)) }}
                                modifiersStyles={{ deliveryDay: { backgroundColor: '#d1fae5', color: '#065f46', fontWeight: 'bold' } }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          {deliveryDayHint && <p className="text-[11px] text-[#475569] mt-1">{deliveryDayHint}</p>}
                        </div>
                        <div>
                          {editingOrder && (
                            <>
                              <Label className="text-sm font-medium">Stav</Label>
                              <select value={status || 'pending'} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full h-10 px-3 border border-[#cbd5e1] rounded-md text-sm bg-white">
                                <option value="pending">Čakajúca</option>
                                <option value="confirmed">Potvrdená</option>
                                <option value="ready">Pripravená</option>
                                <option value="delivered">Doručená</option>
                                <option value="cancelled">Zrušená</option>
                              </select>
                            </>
                          )}
                        </div>
                      </div>

                        <div className="grid grid-cols-1 gap-3">
                        <div>
                          <Label className="text-sm font-medium">Typ objednávky</Label>
                          <select value={orderType || 'jednorazova'} onChange={(e) => setOrderType(e.target.value)} className="mt-1 w-full h-10 px-3 border border-[#cbd5e1] rounded-md text-sm bg-white">
                            <option value="jednorazova">Jednorazová</option>
                            <option value="tyzdenne">Týždenne</option>
                            <option value="dvojtyzdenne">Dvojtýždenne</option>
                          </select>
                          {orderType !== 'jednorazova' && (
                            <p className="mt-1.5 text-xs text-[#16a34a] flex items-center gap-1">
                              <span>✓</span> Automaticky sa vygenerujú objednávky 4 týždne dopredu (status: Rastie)
                            </p>
                          )}
                        </div>
                        </div>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-4">

                      {/* Kategória chips */}
                      <div>
                        <label className="text-[10px] font-semibold text-[#475569] font-bold uppercase tracking-wider mb-2 block">Kategória plodiny</label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { v: '', l: 'Všetky' },
                            { v: 'microgreens', l: 'Mikrozelenia' },
                            { v: 'microherbs', l: 'Mikrobylinky' },
                            { v: 'edible_flowers', l: 'Jedlé kvety' },
                            { v: 'mix', l: 'Mixy' },
                          ].map(cat => (
                            <button
                              key={cat.v}
                              type="button"
                              onClick={() => setCategoryFilter(cat.v)}
                              className={`px-3 py-1 rounded-md border-[1.5px] text-[11px] font-medium transition-colors ${
                                categoryFilter === cat.v
                                  ? 'bg-[#16a34a] border-[#16a34a] text-white'
                                  : 'border-[#cbd5e1] text-[#374151] bg-white hover:border-[#bbf7d0] hover:text-[#16a34a] hover:bg-[#f0fdf4]'
                              }`}
                            >{cat.l}</button>
                          ))}
                        </div>
                      </div>

                      {/* Zoznam pridaných položiek */}
                      {(orderItems || []).length > 0 && (
                        <div className="bg-white border border-[#cbd5e1] rounded-xl overflow-hidden">
                          <div className="px-4 py-2 bg-[#f8fafc] border-b-2 border-[#cbd5e1] flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-[#475569] font-bold uppercase tracking-wider">
                              Pridané položky ({orderItems.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => setOrderItems(prev => prev.map(item => ({ ...item, has_label: !prev.every(i => i.has_label) })))}
                              className={`flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-semibold border transition-colors ${
                                orderItems.every(i => i.has_label)
                                  ? 'bg-[#fef08a] border-[#fbbf24] text-[#854d0e]'
                                  : 'bg-white border-[#cbd5e1] text-[#475569] hover:border-[#fbbf24] hover:bg-[#fef9c3]'
                              }`}
                            >
                              <Tag className="h-3 w-3" />
                              {orderItems.every(i => i.has_label) ? 'Etiketa: Všetky ✓' : 'Etiketa pre všetky'}
                            </button>
                          </div>
                          <div className="divide-y divide-[#f8fafc]">
                            {orderItems.map((item, idx) => {
                              if (!item) return null;
                              const itemTotal = (item.quantity || 0) * (parseFloat(String(item.price_per_unit || '0').replace(',', '.')) || 0);
                              return (
                                <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#f8fafc]">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-bold text-[#0f172a]">{item.crop_name}</div>
                                    <div className="text-[11px] text-[#475569] mt-0.5">
                                      {item.quantity} × {item.packaging_size} · {item.packaging_volume_ml}ml {item.packaging_type}
                                      {item.has_label ? ' · Etiketa' : ''}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="text-[13px] font-bold text-[#0f172a]">{itemTotal.toFixed(2)} €</div>
                                    <div className="text-[11px] text-[#94a3b8]">{parseFloat(String(item.price_per_unit || '0')).toFixed(2)} € / ks</div>
                                  </div>
                                  <div className="flex gap-0.5 shrink-0">
                                    <button
                                      type="button"
                                      className="w-7 h-7 rounded-md border border-[#cbd5e1] bg-white flex items-center justify-center text-[#64748b] hover:bg-[#eff6ff] hover:border-[#bfdbfe] hover:text-[#2563eb] transition-colors"
                                      onClick={() => {
                                        let ps = String(item?.packaging_size || '');
                                        if (ps && !ps.includes('g') && !ps.includes('kg') && !isNaN(Number(ps))) ps += 'g';
                                        setCurrentItem({ ...item, packaging_size: ps, quantity: Number(item.quantity || 1), price_per_unit: item.price_per_unit?.toString() || '' });
                                        removeItem(idx);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      className="w-7 h-7 rounded-md border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#dc2626] hover:text-white transition-colors"
                                      onClick={() => removeItem(idx)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Pridať novú položku */}
                      <div className="bg-white border border-[#cbd5e1] rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-[#f0fdf4] border-b border-[#bbf7d0]">
                          <span className="text-[10px] font-semibold text-[#16a34a] uppercase tracking-wider">
                            {currentItem.crop_name ? `Pridávam: ${currentItem.crop_name}` : 'Pridať položku'}
                          </span>
                        </div>
                        <div className="p-4 space-y-3">

                          {/* Špeciálna položka toggle */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="special-item-wiz"
                              checked={currentItem?.is_special_item || false}
                              onChange={(e) => {
                                setCurrentItem(prev => ({ ...prev, is_special_item: e.target.checked }));
                                if (e.target.checked) setIsPriceConfigured(true);
                              }}
                              className="h-4 w-4 rounded"
                            />
                            <label htmlFor="special-item-wiz" className="text-[12px] text-[#374151] cursor-pointer">
                              Špeciálna položka (manuálne zadanie)
                            </label>
                          </div>

                          {/* Plodina + Gramáž v jednom riadku */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-semibold text-[#475569] font-bold uppercase tracking-wider mb-1.5 block">
                                Plodina / Mix *
                              </label>
                              <Select
                                value={currentItem?.crop_id ? `crop:${currentItem.crop_id}` : currentItem?.blend_id ? `blend:${currentItem.blend_id}` : ''}
                                onValueChange={async (value) => {
                                  const [type, id] = value.split(':');
                                  if (type === 'crop') {
                                    const sel = crops?.find(c => c.id === id);
                                    setCurrentItem(prev => ({ ...prev, crop_id: id, blend_id: undefined, crop_name: sel?.name || '' }));
                                    if (currentItem?.packaging_size && customerType) {
                                      const [price, pkg] = await Promise.all([
                                        autoFetchPrice(currentItem.packaging_size, customerType, id, undefined),
                                        autoFetchPackaging(currentItem.packaging_size, id, undefined)
                                      ]);
                                      setIsPriceConfigured(price > 0);
                                      setCurrentItem(prev => ({ ...prev, price_per_unit: price > 0 ? price.toString() : '', packaging_volume_ml: pkg?.packaging_volume_ml || prev.packaging_volume_ml, packaging_id: pkg?.packaging_id || prev.packaging_id }));
                                    }
                                  } else {
                                    const sel = blends?.find(b => b.id === id);
                                    setCurrentItem(prev => ({ ...prev, blend_id: id, crop_id: undefined, crop_name: sel?.name || '' }));
                                    if (currentItem?.packaging_size && customerType) {
                                      const [price, pkg] = await Promise.all([
                                        autoFetchPrice(currentItem.packaging_size, customerType, undefined, id),
                                        autoFetchPackaging(currentItem.packaging_size, undefined, id)
                                      ]);
                                      setIsPriceConfigured(price > 0);
                                      setCurrentItem(prev => ({ ...prev, price_per_unit: price > 0 ? price.toString() : '', packaging_volume_ml: pkg?.packaging_volume_ml || prev.packaging_volume_ml, packaging_id: pkg?.packaging_id || prev.packaging_id }));
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger className="h-9 bg-white border-[#cbd5e1] text-[13px]">
                                  <SelectValue placeholder="Vyber plodinu..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white z-[9999]">
                                  {filteredCropsByCategory.length > 0 && (
                                    <SelectGroup>
                                      <SelectLabel>Plodiny</SelectLabel>
                                      {filteredCropsByCategory.map(c => <SelectItem key={c.id} value={`crop:${c.id}`}>{c.name}</SelectItem>)}
                                    </SelectGroup>
                                  )}
                                  {filteredBlendsByCategory.length > 0 && (
                                    <SelectGroup>
                                      <SelectLabel>Mixy</SelectLabel>
                                      {filteredBlendsByCategory.map(b => <SelectItem key={b.id} value={`blend:${b.id}`}>{b.name}</SelectItem>)}
                                    </SelectGroup>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-[#475569] font-bold uppercase tracking-wider mb-1.5 block">
                                Gramáž *
                              </label>
                              {currentItem?.is_special_item ? (
                                <Input
                                  placeholder="napr. 30g"
                                  value={currentItem?.packaging_size || ''}
                                  onChange={(e) => setCurrentItem(prev => ({ ...prev, packaging_size: e.target.value }))}
                                  onBlur={(e) => {
                                    const v = e.target.value;
                                    if (v && !v.endsWith('g') && !isNaN(Number(v)))
                                      setCurrentItem(prev => ({ ...prev, packaging_size: v + 'g' }));
                                  }}
                                  className="h-9 bg-white border-[#cbd5e1] text-[13px]"
                                />
                              ) : (
                                <Select
                                  value={currentItem?.packaging_size || ''}
                                  onValueChange={async (value) => {
                                    setCurrentItem(prev => ({ ...prev, packaging_size: value }));
                                    if ((currentItem?.crop_id || currentItem?.blend_id) && customerType) {
                                      const [price, pkg] = await Promise.all([
                                        autoFetchPrice(value, customerType, currentItem.crop_id, currentItem.blend_id),
                                        autoFetchPackaging(value, currentItem.crop_id, currentItem.blend_id)
                                      ]);
                                      setIsPriceConfigured(price > 0);
                                      setCurrentItem(prev => ({ ...prev, price_per_unit: price > 0 ? price.toString() : '', packaging_volume_ml: pkg?.packaging_volume_ml || prev.packaging_volume_ml, packaging_id: pkg?.packaging_id || prev.packaging_id }));
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-9 bg-white border-[#cbd5e1] text-[13px]">
                                    <SelectValue placeholder="Gramáž" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white z-[9999]">
                                    {['25g','50g','60g','70g','100g','120g','150g'].map(w => (
                                      <SelectItem key={w} value={w}>{w}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>

                          {/* Počet kusov + Obal (auto) + Cena */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-semibold text-[#475569] font-bold uppercase tracking-wider mb-1.5 block">
                                Počet ks *
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  className="w-9 h-9 rounded-md border border-[#cbd5e1] bg-white flex items-center justify-center text-[#374151] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors font-bold text-lg"
                                  onClick={() => setCurrentItem(prev => ({ ...prev, quantity: Math.max(1, (Number(prev.quantity) || 1) - 1) }))}
                                >−</button>
                                <input
                                  type="number"
                                  value={currentItem?.quantity || 1}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setCurrentItem(prev => ({ ...prev, quantity: v === '' ? '' : (parseInt(v) || 1) }));
                                  }}
                                  onBlur={(e) => {
                                    if (!e.target.value || parseInt(e.target.value) < 1)
                                      setCurrentItem(prev => ({ ...prev, quantity: 1 }));
                                  }}
                                  className="w-12 h-9 text-center border border-[#cbd5e1] rounded-md text-[13px] font-bold text-[#0f172a] bg-white"
                                />
                                <button
                                  type="button"
                                  className="w-9 h-9 rounded-md border border-[#cbd5e1] bg-white flex items-center justify-center text-[#374151] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors font-bold text-lg"
                                  onClick={() => setCurrentItem(prev => ({ ...prev, quantity: (Number(prev.quantity) || 1) + 1 }))}
                                >+</button>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-[#475569] font-bold uppercase tracking-wider mb-1.5 block">
                                Obal (auto)
                              </label>
                              <div className="h-9 px-3 border border-[#cbd5e1] rounded-md bg-[#f8fafc] flex items-center text-[13px] text-[#475569]">
                                {currentItem?.packaging_volume_ml ? `${currentItem.packaging_volume_ml}ml` : 'auto'}
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-[#475569] font-bold uppercase tracking-wider mb-1.5 block">
                                Cena / ks (€)
                              </label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder={!isPriceConfigured && !currentItem.is_special_item ? 'Chýba cena' : '0.00'}
                                value={currentItem.price_per_unit || ''}
                                onChange={(e) => setCurrentItem(prev => ({ ...prev, price_per_unit: e.target.value }))}
                                disabled={!isPriceConfigured && !currentItem.is_special_item}
                                className="h-9 border-[#cbd5e1] text-[13px] disabled:bg-[#f8fafc] disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>

                          {/* Sekundárne polia v rozbaľovacom riadku */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] font-semibold text-[#475569] font-bold uppercase tracking-wider mb-1.5 block">Forma</label>
                              <select
                                value={currentItem?.delivery_form || 'rezana'}
                                onChange={(e) => setCurrentItem(prev => ({ ...prev, delivery_form: e.target.value }))}
                                className="w-full h-9 px-3 border border-[#cbd5e1] rounded-md text-[13px] bg-white text-[#374151]"
                              >
                                <option value="rezana">Zrezaná</option>
                                <option value="ziva">Živá</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-[#475569] font-bold uppercase tracking-wider mb-1.5 block">Typ obalu</label>
                              <select
                                value={currentItem?.packaging_type || 'rPET'}
                                onChange={(e) => setCurrentItem(prev => ({ ...prev, packaging_type: e.target.value }))}
                                className="w-full h-9 px-3 border border-[#cbd5e1] rounded-md text-[13px] bg-white text-[#374151]"
                              >
                                <option value="rPET">rPET</option>
                                <option value="PET">PET</option>
                                <option value="EKO">EKO</option>
                                <option value="Vratný obal">Vratný obal</option>
                              </select>
                            </div>
                            <div className="flex items-end pb-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="has_label_wiz"
                                  checked={currentItem?.has_label || false}
                                  onChange={(e) => setCurrentItem(prev => ({ ...prev, has_label: e.target.checked }))}
                                  className="h-4 w-4 rounded border-[#cbd5e1]"
                                />
                                <label htmlFor="has_label_wiz" className="text-[12px] text-[#374151] cursor-pointer">Etiketa</label>
                              </div>
                            </div>
                          </div>

                          {/* Cena celkom preview */}
                          {currentItem.crop_name && currentItem.packaging_size && currentItem.price_per_unit && (
                            <div className="flex items-center justify-between px-3 py-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg">
                              <span className="text-[12px] text-[#166534]">
                                {currentItem.quantity || 1} × {currentItem.crop_name} {currentItem.packaging_size}
                              </span>
                              <span className="text-[13px] font-bold text-[#16a34a]">
                                {((Number(currentItem.quantity) || 1) * (parseFloat(String(currentItem.price_per_unit || '0').replace(',', '.')) || 0)).toFixed(2)} €
                              </span>
                            </div>
                          )}

                          {/* Tlačidlo pridať */}
                          <button
                            type="button"
                            onClick={addItemToList}
                            className="w-full h-10 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Pridať do objednávky
                          </button>
                        </div>
                      </div>

                      {/* Medzisúčet */}
                      {(orderItems || []).length > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#cbd5e1] rounded-xl">
                          <span className="text-[12px] font-semibold text-[#374151]">
                            Medzisúčet · {orderItems.reduce((s, i) => s + (i?.quantity || 0), 0)} ks
                          </span>
                          <span className="text-[15px] font-bold text-[#0f172a]">
                            {orderItems.reduce((s, i) => s + ((i?.quantity || 0) * (parseFloat(String(i?.price_per_unit || '0').replace(',', '.')) || 0)), 0).toFixed(2)} €
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 3: Doprava & Súhrn */}
                  {wizardStep === 3 && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs font-semibold text-[#475569] font-bold uppercase tracking-wider mb-1.5 block">Poznámky k objednávke</Label>
                        <textarea value={orderNotes || ''} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Špeciálne pokyny pre objednávku..." className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-sm min-h-[72px] resize-none" />
                      </div>

                      <div className="border border-[#cbd5e1] rounded-xl p-4 space-y-3 bg-[#f8fafc]">
                        <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-wider">Nastavenia dopravy</h3>
                        <div className="flex items-center gap-3">
                          <Switch id="free-delivery-wiz" checked={freeDelivery} onCheckedChange={(v) => { setFreeDelivery(v); if (v) setManualDeliveryAmount(''); }} />
                          <Label htmlFor="free-delivery-wiz" className="text-sm font-medium cursor-pointer">Doprava zdarma</Label>
                        </div>
                        <div>
                          <Label className="text-xs text-[#94a3b8] mb-1 block">Manuálna suma dopravy (€)</Label>
                          <Input type="number" min="0" step="0.01" placeholder="Auto-výpočet z trasy" value={manualDeliveryAmount} onChange={(e) => setManualDeliveryAmount(e.target.value)} disabled={freeDelivery} className="h-9 text-sm border-[#cbd5e1] disabled:bg-white disabled:opacity-50" />
                          <p className="text-[11px] text-[#94a3b8] mt-1">{freeDelivery ? 'Doprava zdarma je aktívna' : 'Nechajte prázdne pre auto-výpočet podľa trasy'}</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-[#cbd5e1]">
                          <span className="text-sm font-medium text-[#374151]">Vypočítaná doprava:</span>
                          <span className="text-lg font-bold text-[#10b981]">{calculatedDeliveryPrice.toFixed(2)} €</span>
                        </div>
                        {calculatedDeliveryPrice === 0 && orderItems.length > 0 && !freeDelivery && (
                          <p className="text-sm text-[#10b981] font-medium flex items-center gap-1"><Check className="h-3.5 w-3.5" />Doprava zdarma</p>
                        )}
                      </div>

                      {(() => {
                        if (!deliveryDate || !orderItems || orderItems.length === 0) return null;
                        const issues = checkCapacityForOrder(deliveryDate, orderItems);
                        if (issues.length === 0) return null;
                        return (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                            <h4 className="font-semibold text-red-800 text-sm mb-2 flex items-center gap-1.5">
                              <svg className="h-4 w-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              Nedostatok kapacity
                            </h4>
                            <div className="space-y-1.5">
                              {issues.map((issue, i) => (
                                <div key={i} className="bg-white rounded-lg border border-red-200 px-3 py-2 text-xs">
                                  <p className="font-semibold text-red-900">{issue.cropName} — {issue.packageSize}g</p>
                                  <div className="grid grid-cols-2 gap-x-4 mt-1 text-[#64748b]">
                                    <span>Kapacita: <b>{issue.capacity}g</b></span>
                                    <span>Objednané: <b>{issue.ordered}g</b></span>
                                    <span>Pridáte: <b>{issue.needed}g</b></span>
                                    <span className="text-red-700 font-semibold">Chýba: <b>{issue.shortage}g</b></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-[11px] text-red-600 mt-2">Môžete zvoliť iný dátum alebo pokračovať na vlastné riziko.</p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Navigation footer */}
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#cbd5e1]">
                    <div>
                      {wizardStep === 1 ? (
                        <Button variant="outline" className="h-9 px-4 text-sm border-[#cbd5e1]" onClick={() => { setIsDialogOpen(false); setWizardStep(1); }}>Zrušiť</Button>
                      ) : (
                        <Button variant="outline" className="h-9 px-4 text-sm border-[#cbd5e1]" onClick={() => setWizardStep(s => s - 1)}>
                          <ChevronLeft className="h-4 w-4 mr-1" />Späť
                        </Button>
                      )}
                    </div>
                    <div>
                      {wizardStep < 3 ? (
                        <Button className="h-9 px-5 text-sm bg-[#10b981] hover:bg-[#059669]" disabled={wizardStep === 1 && (!customerId || !deliveryDate)} onClick={() => setWizardStep(s => s + 1)}>
                          Ďalej<ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <Button className="h-9 px-5 text-sm bg-[#10b981] hover:bg-[#059669]" onClick={saveOrder}>
                          <Check className="h-4 w-4 mr-1.5" />{editingOrder ? 'Uložiť zmeny' : 'Vytvoriť objednávku'}
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              );
            } catch (error) {
              console.error('Modal rendering error:', error);
              return <div className="p-4 text-red-600">Error loading form</div>;
            }
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť objednávku</AlertDialogTitle>
            <AlertDialogDescription>
              Naozaj chcete odstrániť túto objednávku? Táto akcia sa nedá vrátiť späť.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Zrušiť
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteOrder}
              className="bg-red-600 hover:bg-red-700"
            >
              Odstrániť
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RecurringOrderEditDialog
        open={recurringEditDialog.open}
        onClose={() => setRecurringEditDialog({ open: false, order: null })}
        onConfirm={handleRecurringEditConfirm}
        orderDate={recurringEditDialog.order?.delivery_date || ''}
      />

      <RecurringOrderDeleteDialog
        open={recurringDeleteDialog.open}
        onClose={() => setRecurringDeleteDialog({ open: false, order: null })}
        onConfirm={handleRecurringDeleteConfirm}
        orderDate={recurringDeleteDialog.order?.delivery_date || ''}
      />

      <RecurringOrderExtendDialog
        open={extendDialog.open}
        onClose={() => setExtendDialog({ open: false, order: null })}
        onConfirm={handleExtendConfirm}
        currentEndDate={extendDialog.order?.recurring_end_date}
      />

      <BulkDateChangeDialog
        open={bulkDateChangeOpen}
        onOpenChange={setBulkDateChangeOpen}
        onSuccess={loadData}
      />


      <OrderDetailDialog
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        order={selectedOrderDetail}
        activeTab={detailActiveTab}
        onTabChange={setDetailActiveTab}
        isMobile={isMobile}
        customers={customers}
        routes={routes}
        getDeliveryFee={getDeliveryFee}
        getOrderTotal={getOrderTotal}
        onQuickStatusChange={handleQuickStatusChange}
        onEdit={openEdit}
        onExtend={openExtendDialog}
      />

    </MainLayout>
  );
}
