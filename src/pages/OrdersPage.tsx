import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
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
import { OrderSearchBar } from '@/components/orders/OrderSearchBar';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import { CategoryFilter } from '@/components/orders/CategoryFilter';
import { CustomerTypeFilter } from '@/components/filters/CustomerTypeFilter';
import { RecurringOrderEditDialog } from '@/components/orders/RecurringOrderEditDialog';
import { RecurringOrderDeleteDialog } from '@/components/orders/RecurringOrderDeleteDialog';
import { useDeliveryDays } from '@/hooks/useDeliveryDays';
import {
  ShoppingCart,
  Plus,
  Grid3x3,
  List,
  FileSpreadsheet,
  FileText,
  Edit,
  Copy,
  Trash2,
  Calendar,
  Package,
  Truck,
  Home,
  Utensils,
  Store,
  Scissors,
  X,
  MapPin,
  RefreshCw,
  Check,
  Leaf,
  Sprout,
  Flower,
  Palette
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, getDay } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  console.log('🚀 VERSION 2.0 - NEW SCHEMA ACTIVE - Using package_ml, package_type, has_label_req');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || supabaseAnonKey;

  console.log('✅ Final Payload with NEW SCHEMA:', {
    package_type: itemData.package_type,
    package_ml: itemData.package_ml,
    has_label_req: itemData.has_label_req
  });

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

  console.log('✅ RPC SUCCESS - Item created with new schema');
  return response;
};

export default function OrdersPage() {
  console.log('[OrdersPage] Component rendering started');
  const { toast } = useToast();
  const { getDeliveryDaysArray } = useDeliveryDays();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showArchive, setShowArchive] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const [customerType, setCustomerType] = useState('home');
  const [customerId, setCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [status, setStatus] = useState('cakajuca');
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
  const [deliverySettings, setDeliverySettings] = useState<any>(null);
  const [isPriceConfigured, setIsPriceConfigured] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Sledovanie zmien pre kontrolu kapacity
  useEffect(() => {
    if (deliveryDate && orderItems && orderItems.length > 0) {
      const issues = checkCapacityForOrder(deliveryDate, orderItems);
      if (issues.length > 0) {
        console.log('⚠️ Capacity issues detected:', issues);
      }
    }
  }, [deliveryDate, orderItems]);

  useEffect(() => {
    if (customerId && customers) {
      const selectedCustomer = customers.find(c => c.id === customerId);
      if (selectedCustomer && (selectedCustomer as any).default_packaging_type) {
        setCurrentItem(prev => ({
          ...prev,
          packaging_type: (selectedCustomer as any).default_packaging_type || 'rPET'
        }));
      }
    }
  }, [customerId, customers]);

  // DEBUG useEffect - sleduje zmeny v currentItem
  useEffect(() => {
    console.log('🔄 CurrentItem changed:', {
      packaging_size: currentItem?.packaging_size,
      is_special_item: currentItem?.is_special_item,
      crop_id: currentItem?.crop_id,
      blend_id: currentItem?.blend_id,
      quantity: currentItem?.quantity
    });
  }, [currentItem]);

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

  useEffect(() => {
    if (selectedOrderDetail && deliverySettings && customers?.length > 0) {
      try {
        const recalculatedFee = getDeliveryFee(selectedOrderDetail);
        const currentStoredFee = parseFloat((selectedOrderDetail?.delivery_price || 0).toString());

        if (Math.abs(recalculatedFee - currentStoredFee) > 0.01) {
          console.warn(`⚠️ Order ${selectedOrderDetail?.id?.substring(0, 8)} has incorrect delivery fee. Stored: ${currentStoredFee}€, Should be: ${recalculatedFee}€`);
        }
      } catch (error) {
        console.error('[OrdersPage] Error validating order delivery fee:', error);
      }
    }
  }, [selectedOrderDetail, deliverySettings, customers]);

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
      console.log('═══════════════════════════════════════');
      console.log('🚚 PREPOČET DOPRAVY');
      console.log('═══════════════════════════════════════');
      console.log(`📦 Položky: ${(orderItems || []).length}`);
      console.log(`💰 Subtotal: ${subtotal.toFixed(2)}€`);
      console.log(`📊 Threshold (${custType}): ${threshold}€`);
      console.log(`🚗 Fee: ${fee}€`);
      console.log(`✅ VÝSLEDNÁ DOPRAVA: ${finalDeliveryPrice.toFixed(2)}€ ${finalDeliveryPrice === 0 ? '🎉 ZDARMA!' : ''}`);
      console.log('═══════════════════════════════════════');
    };

    calculateDelivery();
  }, [customerId, customers, routes, route, orderItems, freeDelivery, manualDeliveryAmount]);

  const loadData = async () => {
    try {
      setLoading(true);
      setDataLoaded(false);
      const [ordersRes, customersRes, cropsRes, blendsRes, routesRes, pricesRes, packagingsRes, deliveryDaysRes, profileRes, plantingsRes] = await Promise.all([
        supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
        supabase.from('blends').select('*').order('name'),
        supabase.from('delivery_routes').select('*').order('name'),
        supabase.from('prices').select('*'),
        supabase.from('packagings').select('*').order('name'),
        supabase.from('delivery_days').select('*').order('day_of_week'),
        supabase.from('profiles').select('delivery_settings').maybeSingle(),
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
      if (profileRes.data?.delivery_settings) {
        console.log('✅ Delivery settings loaded:', profileRes.data.delivery_settings);
        setDeliverySettings(profileRes.data.delivery_settings);
      } else {
        console.warn('⚠️ No delivery settings found in profile');
        setDeliverySettings(null);
      }

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

    if (searchQuery) {
      const customer = customers?.find(c => c.id === order.customer_id);
      const searchLower = searchQuery.toLowerCase();
      const customerName = (customer?.name || '').toLowerCase();
      const companyName = (customer?.company_name || '').toLowerCase();
      if (!customerName.includes(searchLower) && !companyName.includes(searchLower)) {
        return false;
      }
    }

    // Archive filter: if showArchive is false, only show active orders (not completed)
    if (!showArchive && order?.status === 'dorucena') {
      return false;
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

    return true;
  });

  const filteredCropsByCategory = useMemo(() => {
    if (!categoryFilter) return crops;

    // If "mix" category is selected, return empty array (blends are shown separately)
    if (categoryFilter === 'mix') {
      return [];
    }

    // Now categoryFilter uses database values directly: 'microgreens', 'microherbs', 'edible_flowers'
    return crops.filter(crop => crop.category === categoryFilter);
  }, [crops, categoryFilter]);

  const filteredBlendsByCategory = useMemo(() => {
    // Only show blends when "mix" category is selected
    if (categoryFilter === 'mix') {
      return blends;
    }
    // If no category filter, show blends in "Mixy" group
    if (!categoryFilter) {
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

      console.log(`[getDeliveryFee] Order ${order.id?.substring(0, 8)}: Customer ${customer.name} (${customerType}), Route: ${deliveryRoute.name}, Subtotal: ${orderSubtotal.toFixed(2)}€, Threshold: ${minFreeThreshold.toFixed(2)}€, Fee: ${deliveryFee.toFixed(2)}€`);

      // SMIŽANY RULE: If min_free_delivery is 0, delivery is automatically free
      if (minFreeThreshold === 0) {
        console.log(`[getDeliveryFee] Free delivery (Smižany rule: threshold is 0)`);
        return 0;
      }

      // STRICT RULE: If orderSubtotal >= minFreeThreshold, free delivery
      if (orderSubtotal >= minFreeThreshold) {
        console.log(`[getDeliveryFee] Free delivery (threshold met)`);
        return 0;
      }

      console.log(`[getDeliveryFee] Charging delivery fee: ${deliveryFee.toFixed(2)}€`);
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
    setEditingOrder(null);
    setCustomerType('home');
    setCustomerId('');
    setDeliveryDate('');
    setStatus('cakajuca');
    setOrderType('jednorazova');
    setWeekCount(1);
    setRoute('');
    setOrderNotes('');
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
    setIsDialogOpen(true);
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

      console.log('📦 Loaded order items for edit:', orderItems);
      if (orderItems && orderItems.length > 0) {
        console.log('🔍 First item packaging_size from DB:', orderItems[0]?.packaging_size);
        console.log('🔍 First item package_type from DB:', orderItems[0]?.package_type);
        console.log('🔍 First item package_ml from DB:', orderItems[0]?.package_ml);
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

      console.log('🗺️ Mapped items:', mappedItems);
      if (mappedItems.length > 0) {
        console.log('🗺️ First mapped item packaging_size:', mappedItems[0]?.packaging_size);
        console.log('🗺️ First mapped item packaging_type:', mappedItems[0]?.packaging_type);
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
      console.log(`📦 Auto-fetching packaging for ${itemType} ${itemId}, weight ${weightG}g`);

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

        console.log('✅ Auto-selected packaging:', result);
        return result;
      }

      console.log('⚠️ No packaging mapping found for this', itemType, 'and weight');
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

    const itemToAdd = {
      ...currentItem,
      crop_id: currentItem.is_special_item ? null : currentItem.crop_id,
      crop_name: finalCropName,
      quantity: parseFloat(currentItem.quantity) || 1,
      price_per_unit: priceValue,
      is_special_item: currentItem.is_special_item || false,
      custom_crop_name: currentItem.is_special_item ? currentItem.custom_crop_name : null
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
    console.log('🔍 Kontrolujem kapacitu pre objednávku:', { orderDate, items });

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

    console.log(`📅 Relevantné výsevy pre ${orderDate}:`, relevantPlantings.length);

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

    console.log('📊 Kontrola kapacity:', { capacity, ordered, issues });
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

      const customer = customers?.find(c => c.id === customerId);
      const totalPrice = (orderItems || []).reduce((sum, item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price_per_unit.toString().replace(',', '.')) || 0;
        return sum + (quantity * price);
      }, 0);

      // Calculate delivery fee with priority: Manual Amount > Free Toggle > Auto-calculation
      let deliveryPrice = 0;

      // PRIORITY 1: Free Delivery Toggle (forces 0€)
      if (freeDelivery) {
        deliveryPrice = 0;
        console.log('💶 Manual override: Free delivery toggle ON');
      }
      // PRIORITY 2: Manual Delivery Amount (specific amount entered)
      else if (manualDeliveryAmount && manualDeliveryAmount.trim() !== '') {
        deliveryPrice = parseFloat(manualDeliveryAmount) || 0;
        console.log('💶 Manual override: Delivery amount set to', deliveryPrice);
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

          if (route && route !== '' && route !== 'Žiadna trasa') {
            // Find route by NAME from the route dropdown selection
            deliveryRoute = routes?.find(r => r.name === route);
          }

          if (deliveryRoute) {
            let deliveryFee = 0;
            let minFreeDelivery = 0;

            // Get fee and threshold from route based on customer type
            if (custType === 'home') {
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

            console.log('💶 Auto-calculated delivery price from route:', {
              routeName: deliveryRoute.name,
              customerType: custType,
              orderSubtotal: totalPrice,
              deliveryFee,
              minFreeDelivery,
              finalDeliveryPrice: deliveryPrice,
              freeDeliveryException: customer.free_delivery
            });
          } else {
            console.warn('⚠️ No delivery route selected or invalid route');
          }
        }
      }

      // VALIDATION: If charge_delivery is true but deliveryPrice is 0, recalculate
      if (!freeDelivery && deliveryPrice === 0 && route && route !== '' && route !== 'Žiadna trasa') {
        console.warn('⚠️ VALIDATION: Delivery fee is 0€ but charge_delivery is enabled. Recalculating...');

        const deliveryRoute = routes?.find(r => r.name === route);
        if (deliveryRoute && customer && !customer.free_delivery) {
          const custType = customer.customer_type || 'home';
          let deliveryFee = 0;
          let minFreeDelivery = 0;

          if (custType === 'home') {
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
            console.log('✅ VALIDATION: Recalculated delivery fee:', deliveryPrice);
          }
        }
      }

      const finalTotalPrice = totalPrice + deliveryPrice;

      console.log('💾 SAVING ORDER:', {
        customerType: customer?.customer_type,
        route: route,
        subtotal: totalPrice.toFixed(2),
        deliveryPrice: deliveryPrice.toFixed(2),
        totalPrice: finalTotalPrice.toFixed(2),
        chargeDelivery: !freeDelivery,
        freeDeliveryToggle: freeDelivery,
        manualAmount: manualDeliveryAmount
      });

      const orderData = {
        customer_id: customerId,
        customer_name: customer?.company_name || customer?.name || '',
        customer_type: customer?.customer_type || 'home',
        delivery_date: deliveryDate,
        status: status,
        total_price: Number(parseFloat(finalTotalPrice.toFixed(2))),
        delivery_price: Number(parseFloat(deliveryPrice.toFixed(2))),
        charge_delivery: !freeDelivery,
        route: route || null,
        notes: orderNotes || null,
        is_recurring: orderType === 'tyzdenne' || orderType === 'dvojtyzdenne',
        recurrence_pattern: orderType !== 'jednorazova' ? orderType : null,
        recurring_weeks: orderType !== 'jednorazova' ? parseInt(weekCount) || 1 : null,
        user_id: user.id
      };

      if (editingOrder) {
        let ordersToUpdate: Array<{ id: string; delivery_date: string }> = [
          { id: editingOrder.id, delivery_date: editingOrder.delivery_date }
        ];

        // Check if we need to update all future orders
        if (updateAllFutureOrders) {
          console.log('=== UPDATING ALL FUTURE RECURRING ORDERS ===');

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
            console.log(`Found ${ordersToUpdate.length} orders to update:`, ordersToUpdate);
          }
        }

        // Update each order individually to preserve delivery_date
        for (const orderToUpdate of ordersToUpdate) {
          console.log(`=== UPDATING ORDER ${orderToUpdate.id} (delivery: ${orderToUpdate.delivery_date}) ===`);

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
          console.log(`=== UPDATING ORDER ITEMS FOR ORDER ${orderId} ===`);

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
            console.log(`Item ${idx + 1} for order ${orderId}:`, item);

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
              console.log(`✅ DIRECT FETCH SUCCESS Item ${idx + 1} for order ${orderId}`);
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

          console.log(`=== INSERTING ORDER_ITEMS FOR ORDER ${orderId} VIA RPC ===`);

          for (let idx = 0; idx < items.length; idx++) {
            const item = items[idx];
            console.log(`Item ${idx + 1}:`, item);
            console.log(`  package_type: ${item.packaging_type}`);
            console.log(`  package_ml: ${item.packaging_volume_ml}`);
            console.log(`  has_label_req: ${item.has_label}`);

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
              console.log(`✅ DIRECT FETCH SUCCESS Item ${idx + 1} for order ${orderId}`);
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
        const isRecurring = orderType !== 'jednorazova';
        const recurringCount = isRecurring ? parseInt(weekCount) || 1 : 1;

        if (isRecurring && recurringCount > 1) {
          console.log(`=== CREATING ${recurringCount - 1} CHILD ORDERS ===`);

          const childOrders = [];

          for (let i = 1; i < recurringCount; i++) {
            // Calculate new delivery date
            const weeksToAdd = orderType === 'tyzdenne' ? i : i * 2;
            const newDate = new Date(deliveryDate);
            newDate.setDate(newDate.getDate() + (weeksToAdd * 7));
            const newDateString = newDate.toISOString().split('T')[0];

            console.log(`Child order ${i}: ${newDateString} (${weeksToAdd} weeks from parent)`);

            // Create child order data
            const childOrderData = {
              customer_id: customerId,
              customer_name: customer?.company_name || customer?.name || '',
              customer_type: customer?.customer_type || 'home',
              delivery_date: newDateString,
              status: status,
              total_price: Number(parseFloat(finalTotalPrice.toFixed(2))),
              delivery_price: Number(parseFloat(deliveryPrice.toFixed(2))),
              charge_delivery: !freeDelivery,
              route: route || null,
              notes: orderNotes || null,
              is_recurring: true,
              recurrence_pattern: orderType,
              recurring_weeks: recurringCount,
              parent_order_id: newOrder.id,
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

          console.log(`✅ Created ${insertedChildOrders.length} child orders`);

          // Create order items for each child order
          for (const childOrder of insertedChildOrders) {
            console.log(`Creating items for child order ${childOrder.id} (${childOrder.delivery_date})`);
            await createOrderItemsForOrder(childOrder.id);
          }

          toast({
            title: 'Úspech',
            description: `Vytvorených ${recurringCount} opakujúcich sa objednávok`
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
      const isPartOfSeries = order.parent_order_id !== null ||
                            (order.is_recurring && (order.recurring_weeks || 0) > 1);

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
        console.log('=== DELETING ALL FUTURE RECURRING ORDERS ===');

        // Find parent order ID
        const parentId = orderToDelete.parent_order_id || orderToDelete.id;

        // Find all related orders with delivery_date >= current order date
        const { data: relatedOrders, error: fetchError } = await supabase
          .from('orders')
          .select('id')
          .or(`id.eq.${parentId},parent_order_id.eq.${parentId}`)
          .gte('delivery_date', orderToDelete.delivery_date);

        if (fetchError) {
          console.error('Error fetching related orders:', fetchError);
          throw fetchError;
        }

        if (relatedOrders && relatedOrders.length > 0) {
          const orderIds = relatedOrders.map(o => o.id);
          console.log(`Deleting ${orderIds.length} orders:`, orderIds);

          // First delete order_items (foreign key constraint)
          const { error: itemsError } = await supabase
            .from('order_items')
            .delete()
            .in('order_id', orderIds);

          if (itemsError) {
            console.error('Error deleting order items:', itemsError);
            throw itemsError;
          }

          // Then delete orders
          const { error: ordersError } = await supabase
            .from('orders')
            .delete()
            .in('id', orderIds);

          if (ordersError) {
            console.error('Error deleting orders:', ordersError);
            throw ordersError;
          }

          toast({
            title: 'Úspech',
            description: `Zmazaných ${orderIds.length} objednávok`
          });
        }
      } else {
        console.log('=== DELETING SINGLE ORDER ===');

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
      console.log('=== STARTING ORDER DUPLICATION ===');
      console.log('Original order:', order);

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

      console.log('Sanitized order data for insert:', orderData);

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

      console.log('✅ Order created successfully:', newOrder);

      // Copy all order items with completely sanitized data
      if (order.order_items && order.order_items.length > 0) {
        console.log('Processing', order.order_items.length, 'order items...');

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

          console.log(`Item ${index + 1} sanitized:`, cleanItem);
          return cleanItem;
        });

        console.log('Inserting items:', items);

        console.log('=== INSERTING ORDER_ITEMS (DUPLICATE ORDER) VIA RPC ===');

        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          console.log(`Item ${idx + 1}:`, item);
          console.log(`  package_type: ${item.packaging_type}`);
          console.log(`  package_ml: ${item.packaging_volume_ml}`);
          console.log(`  has_label_req: ${item.has_label}`);

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
            console.log(`✅ DIRECT FETCH SUCCESS (DUPLICATE ORDER) Item ${idx + 1}`);
          } catch (itemError) {
            console.error('❌ DIRECT FETCH FAILED (DUPLICATE ORDER) Item', idx + 1);
            console.error('Error object:', JSON.stringify(itemError, null, 2));
            console.error('Item that was sent:', JSON.stringify(item, null, 2));
            throw itemError;
          }
        }

        console.log('✅ Order items created successfully');
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
        console.log('Opening edit dialog for new order');
        openEdit(allOrdersQuery.data);
      }

      console.log('=== DUPLICATION COMPLETED SUCCESSFULLY ===');
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'cakajuca':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'potvrdena':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pripravena':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'dorucena':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'zrusena':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'cakajuca': return 'Čakajúca';
      case 'potvrdena': return 'Potvrdená';
      case 'pripravena': return 'Pripravená';
      case 'dorucena': return 'Doručená';
      case 'zrusena': return 'Zrušená';
      default: return status;
    }
  };

  const formatDeliveryDate = (dateString: string) => {
    try {
      if (!dateString) return '-';
      const date = parseISO(dateString);
      return format(date, 'dd.MM.yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || '-';
    }
  };

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
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Objednávky</h1>
          <p className="text-sm text-gray-500 mt-1">Spravujte objednávky od zákazníkov</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-1">
            <Button onClick={openNew} className="bg-[#10b981] hover:bg-[#059669] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nová objednávka
            </Button>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export do Excelu
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <OrderSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Hľadať podľa mena zákazníka..."
          />

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Všetky stavy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všetky stavy</SelectItem>
              <SelectItem value="cakajuca">Čakajúca</SelectItem>
              <SelectItem value="potvrdena">Potvrdená</SelectItem>
              <SelectItem value="pripravena">Pripravená</SelectItem>
              <SelectItem value="dorucena">Doručená</SelectItem>
            </SelectContent>
          </Select>

          <CustomerTypeFilter
            value={filterCustomerType}
            onChange={setFilterCustomerType}
          />

          <Select value={orderCategoryFilter} onValueChange={setOrderCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Kategória plodiny" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5}>
              <SelectItem value="all">Všetky kategórie</SelectItem>
              <SelectItem value="microgreens">
                <Leaf className="h-4 w-4 text-green-600 mr-2 inline" />Mikrozelenina
              </SelectItem>
              <SelectItem value="microherbs">
                <Sprout className="h-4 w-4 text-green-600 mr-2 inline" />Mikrobylinky
              </SelectItem>
              <SelectItem value="edible_flowers">
                <Flower className="h-4 w-4 text-green-600 mr-2 inline" />Jedlé kvety
              </SelectItem>
              <SelectItem value="mix">
                <Palette className="h-4 w-4 text-green-600 mr-2 inline" />Mixy
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCrop} onValueChange={setFilterCrop}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Všetky plodiny" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto z-[100]">
              <SelectItem value="all">Všetky plodiny</SelectItem>
              {(crops || []).map(crop => (
                <SelectItem key={crop?.id} value={crop?.name || ''}>{crop?.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Všetky týždne" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všetky týždne</SelectItem>
              <SelectItem value="this_week">Tento týždeň</SelectItem>
              <SelectItem value="next_week">Budúci týždeň</SelectItem>
              <SelectItem value="last_week">Minulý týždeň</SelectItem>
              <SelectItem value="last_2_weeks">Pred 2 týždňami</SelectItem>
              <SelectItem value="last_month">Minulý mesiac</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              id="archive-toggle"
              checked={showArchive}
              onCheckedChange={setShowArchive}
            />
            <Label htmlFor="archive-toggle" className="text-sm font-medium cursor-pointer">
              Zobraziť archív
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-[#10b981]/20 hover:border-[#10b981]/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#10b981] flex items-center justify-center">
                  <Home className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700 uppercase">Domáci</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-[#10b981]">{domaciRevenue.toFixed(2)} €</div>
                <p className="text-[10px] text-gray-500">
                  {(filteredOrders || []).filter(o => {
                    const customer = customers?.find(c => c.id === o?.customer_id);
                    return customer?.customer_type === 'home';
                  }).length} obj.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg p-3 border border-blue-500/20 hover:border-blue-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Utensils className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700 uppercase">Gastro</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">{gastroRevenue.toFixed(2)} €</div>
                <p className="text-[10px] text-gray-500">
                  {(filteredOrders || []).filter(o => {
                    const customer = customers?.find(c => c.id === o?.customer_id);
                    return customer?.customer_type === 'gastro';
                  }).length} obj.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-500/20 hover:border-orange-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Store className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700 uppercase">Veľkoobchod</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-orange-600">{wholesaleRevenue.toFixed(2)} €</div>
                <p className="text-[10px] text-gray-500">
                  {(filteredOrders || []).filter(o => {
                    const customer = customers?.find(c => c.id === o?.customer_id);
                    return customer?.customer_type === 'wholesale';
                  }).length} obj.
                </p>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Zákazník</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dátum dodania</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trasa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Celková cena</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Akcie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedOrderDetail(order);
                        setDetailModalOpen(true);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center text-white">
                            <ShoppingCart className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-900">{order.customer_name || 'Bez názvu'}</div>
                            {order.order_items && order.order_items.length > 0 && (
                              <div className="text-xs text-gray-500">
                                {(order.order_items || []).reduce((sum, item) => sum + (item?.quantity || 0), 0)} položiek
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDeliveryDate(order.delivery_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {order.route || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center flex-wrap gap-2">
                          <Badge className={`border ${getStatusBadgeClass(order.status)} text-xs font-semibold px-2 py-0.5`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                          {(order.parent_order_id || (order.is_recurring && (order.recurring_weeks || 0) > 1)) && (
                            <div className="flex items-center" title="Opakujúca sa objednávka">
                              <RefreshCw className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-base font-bold text-[#10b981]">
                          {(getOrderTotal(order) || 0).toFixed(2)} €
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-gray-100"
                            onClick={() => duplicateOrder(order)}
                          >
                            <Copy className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-gray-100"
                            onClick={() => openEdit(order)}
                          >
                            <Edit className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-50"
                            onClick={() => openDeleteDialog(order.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="p-5 hover:shadow-xl transition-all bg-white rounded-xl border border-gray-200 cursor-pointer" onClick={() => {
                setSelectedOrderDetail(order);
                setDetailModalOpen(true);
              }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center text-white shadow-md">
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                      {order.order_items && order.order_items.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-[#10b981] flex items-center justify-center shadow">
                          <span className="text-xs font-bold text-[#10b981]">
                            {(order.order_items || []).reduce((sum, item) => sum + (item?.quantity || 0), 0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-gray-900">{order.customer_name || 'Bez názvu'}</h3>
                      <div className="flex items-center flex-wrap gap-2 mt-1.5">
                        <Badge className={`border ${getStatusBadgeClass(order.status)} text-xs font-semibold px-2.5 py-0.5`}>
                          {getStatusLabel(order.status)}
                        </Badge>
                        {(order.parent_order_id || (order.is_recurring && (order.recurring_weeks || 0) > 1)) && (
                          <div className="flex items-center" title="Opakujúca sa objednávka">
                            <RefreshCw className="h-4 w-4 text-blue-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-gray-100"
                      onClick={() => duplicateOrder(order)}
                    >
                      <Copy className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-gray-100"
                      onClick={() => openEdit(order)}
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-50"
                      onClick={() => openDeleteDialog(order.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      Dodanie: {formatDeliveryDate(order.delivery_date)}
                    </span>
                  </div>
                  {order.route && (
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Trasa: {order.route}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-3 space-y-2">
                  {(() => {
                    if (customers.length === 0 || routes.length === 0) {
                      return null;
                    }

                    const deliveryFee = getDeliveryFee(order);
                    const orderSubtotal = (order.order_items || []).reduce((sum, item) => {
                      if (!item) return sum;
                      const qty = parseFloat(item?.quantity?.toString() || '0');
                      const pricePerUnit = parseFloat((item?.price_per_unit?.toString() || '0').replace(',', '.'));
                      return sum + (qty * pricePerUnit);
                    }, 0);
                    const isFreeDelivery = deliveryFee === 0 && orderSubtotal > 0;

                    // If charge_delivery is false or deliveryFee is 0, show free shipping
                    if (!order.charge_delivery || deliveryFee === 0) {
                      return (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Doprava:</span>
                          <span className="font-semibold text-[#10b981]">Zdarma</span>
                        </div>
                      );
                    }

                    // Show delivery fee if it's greater than 0
                    if (deliveryFee > 0) {
                      return (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Doprava:</span>
                          <span className="font-semibold text-gray-900">{deliveryFee.toFixed(2)} €</span>
                        </div>
                      );
                    }
                  })()}
                  <div className="flex justify-between items-center">
                    <span className="text-base text-gray-700 font-semibold">Celkom:</span>
                    <span className="text-2xl font-bold text-[#10b981]">
                      {(getOrderTotal(order) || 0).toFixed(2)} €
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {filteredOrders.length === 0 && (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">Žiadne objednávky</p>
            <p className="text-gray-400 text-sm mt-1">Začnite pridaním novej objednávky</p>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto z-[60]">
          {(() => {
            try {
              return (
                <>
                  <DialogHeader>
                    <DialogTitle>{editingOrder ? 'Upraviť objednávku' : 'Nová objednávka'}</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-2.5 py-3">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Typ zákazníka</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setCustomerType('home');
                            setCustomerId('');
                            if ((currentItem?.crop_id || currentItem?.blend_id) && currentItem?.packaging_size) {
                              const autoPrice = await autoFetchPrice(currentItem.packaging_size, 'home', currentItem.crop_id, currentItem.blend_id);
                              setCurrentItem({ ...currentItem, price_per_unit: autoPrice > 0 ? autoPrice.toString() : (currentItem?.price_per_unit || '') });
                            }
                          }}
                          className={`h-16 p-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                            customerType === 'home'
                              ? 'border-[#10b981] bg-green-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Home className={`h-5 w-5 mb-1 ${
                            customerType === 'home' ? 'text-[#10b981]' : 'text-gray-400'
                          }`} />
                          <div className="text-xs font-medium">Domáci</div>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setCustomerType('gastro');
                            setCustomerId('');
                            if ((currentItem?.crop_id || currentItem?.blend_id) && currentItem?.packaging_size) {
                              const autoPrice = await autoFetchPrice(currentItem.packaging_size, 'gastro', currentItem.crop_id, currentItem.blend_id);
                              setCurrentItem({ ...currentItem, price_per_unit: autoPrice > 0 ? autoPrice.toString() : (currentItem?.price_per_unit || '') });
                            }
                          }}
                          className={`h-16 p-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                            customerType === 'gastro'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Utensils className={`h-5 w-5 mb-1 ${
                            customerType === 'gastro' ? 'text-blue-500' : 'text-gray-400'
                          }`} />
                          <div className="text-xs font-medium">Gastro</div>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setCustomerType('wholesale');
                            setCustomerId('');
                            if ((currentItem?.crop_id || currentItem?.blend_id) && currentItem?.packaging_size) {
                              const autoPrice = await autoFetchPrice(currentItem.packaging_size, 'wholesale', currentItem.crop_id, currentItem.blend_id);
                              setCurrentItem({ ...currentItem, price_per_unit: autoPrice > 0 ? autoPrice.toString() : (currentItem?.price_per_unit || '') });
                            }
                          }}
                          className={`h-16 p-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                            customerType === 'wholesale'
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Store className={`h-5 w-5 mb-1 ${
                            customerType === 'wholesale' ? 'text-orange-500' : 'text-gray-400'
                          }`} />
                          <div className="text-xs font-medium">VO</div>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Zákazník *</Label>
                        <div className="mt-0.5">
                          <SearchableCustomerSelect
                            customers={customers}
                            value={customerId || ''}
                            onChange={(newCustomerId) => {
                              setCustomerId(newCustomerId);
                              const selectedCustomer = customers.find(c => c.id === newCustomerId);
                              if (selectedCustomer && (selectedCustomer as any).delivery_route_id) {
                                const customerRoute = routes?.find(r => r.id === (selectedCustomer as any).delivery_route_id);
                                if (customerRoute) {
                                  setRoute(customerRoute.name);
                                }
                              }
                            }}
                            filterByType={customerType}
                            placeholder="Vyberte zákazníka"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Trasa</Label>
                        <select
                          value={route || ''}
                          onChange={(e) => setRoute(e.target.value)}
                          className="mt-0.5 w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                        >
                          <option value="">Žiadna trasa</option>
                          {(routes || []).map(r => (
                            <option key={r?.id} value={r?.name}>{r?.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Dátum *</Label>
                        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-10 justify-start text-left font-normal mt-1 border-slate-200",
                                !deliveryDate && "text-muted-foreground"
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {deliveryDate ? format(new Date(deliveryDate), 'dd. MMMM yyyy', { locale: sk }) : "Vyberte dátum"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={deliveryDate ? new Date(deliveryDate) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setDeliveryDate(format(date, 'yyyy-MM-dd'));
                                  setDatePopoverOpen(false);
                                }
                              }}
                              locale={sk}
                              modifiers={{
                                deliveryDay: (date) => {
                                  const deliveryDays = getDeliveryDaysArray();
                                  return deliveryDays.includes(getDay(date));
                                }
                              }}
                              modifiersStyles={{
                                deliveryDay: {
                                  backgroundColor: '#d1fae5',
                                  color: '#065f46',
                                  fontWeight: 'bold'
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {deliveryDayHint && (
                          <p className="text-xs text-gray-500 mt-1">{deliveryDayHint}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm">Stav</Label>
                        <select
                          value={status || 'cakajuca'}
                          onChange={(e) => setStatus(e.target.value)}
                          className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                        >
                          <option value="cakajuca">Čakajúca</option>
                          <option value="potvrdena">Potvrdená</option>
                          <option value="pripravena">Pripravená</option>
                          <option value="dorucena">Doručená</option>
                          <option value="zrusena">Zrušená</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Typ</Label>
                        <select
                          value={orderType || 'jednorazova'}
                          onChange={(e) => setOrderType(e.target.value)}
                          className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                        >
                          <option value="jednorazova">Jednorazová</option>
                          <option value="tyzdenne">Týždenne</option>
                          <option value="dvojtyzdenne">Dvojtýždenne</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-sm">Počet týždňov</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="1"
                          value={weekCount}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            console.log('weekCount onChange:', inputValue);
                            if (inputValue === '') {
                              setWeekCount('');
                            } else {
                              const cleanValue = inputValue.replace(/[^0-9]/g, '');
                              if (cleanValue !== '') {
                                const num = parseInt(cleanValue);
                                if (num <= 52) {
                                  setWeekCount(num);
                                }
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '') {
                              setWeekCount(1);
                            } else {
                              const num = parseInt(inputValue);
                              if (isNaN(num) || num < 1) {
                                setWeekCount(1);
                              } else if (num > 52) {
                                setWeekCount(52);
                              }
                            }
                          }}
                          className="mt-1 h-10 border-slate-200"
                        />
                        <p className="text-xs text-gray-500 mt-1">Počet týždňov na opakovanie</p>
                      </div>
                    </div>

                    <div className="border-t pt-2.5 mt-2.5">
                      <h3 className="font-medium text-sm mb-2.5">Pridať produkt</h3>

                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          id="special-item-modal"
                          checked={currentItem?.is_special_item || false}
                          onChange={(e) => {
                            setCurrentItem({ ...currentItem, is_special_item: e.target.checked });
                            // Allow manual price input for special items
                            if (e.target.checked) {
                              setIsPriceConfigured(true);
                            }
                          }}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="special-item-modal" className="text-sm cursor-pointer">
                          Špeciálna položka (manuálne zadanie)
                        </Label>
                      </div>

{/* SEKCIA: VÝBER PLODINY A KATEGÓRIE */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-p-4 bg-slate-50 p-4 rounded-lg">
                        <div className="space-y-2">
                          <CategoryFilter
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Plodina / Mix *</Label>
                          <Select
                            value={
                              currentItem?.crop_id
                                ? `crop:${currentItem.crop_id}`
                                : currentItem?.blend_id
                                ? `blend:${currentItem.blend_id}`
                                : ""
                            }
                            onValueChange={async (value) => {
                              const [type, id] = value.split(':');

                              if (type === 'crop') {
                                const selectedCrop = crops?.find(c => c.id === id);
                                setCurrentItem(prev => ({
                                  ...prev,
                                  crop_id: id,
                                  blend_id: undefined,
                                  crop_name: selectedCrop?.name || ""
                                }));

                                // Auto-fetch price and packaging if weight is already selected
                                if (currentItem?.packaging_size && customerType) {
                                  const [price, pkg] = await Promise.all([
                                    autoFetchPrice(currentItem.packaging_size, customerType, id, undefined),
                                    autoFetchPackaging(currentItem.packaging_size, id, undefined)
                                  ]);

                                  // Track if price is configured
                                  setIsPriceConfigured(price > 0);

                                  setCurrentItem(prev => ({
                                    ...prev,
                                    price_per_unit: price > 0 ? price.toString() : '',
                                    packaging_volume_ml: pkg?.packaging_volume_ml || prev.packaging_volume_ml,
                                    packaging_id: pkg?.packaging_id || prev.packaging_id
                                  }));
                                }
                              } else if (type === 'blend') {
                                const selectedBlend = blends?.find(b => b.id === id);
                                setCurrentItem(prev => ({
                                  ...prev,
                                  blend_id: id,
                                  crop_id: undefined,
                                  crop_name: selectedBlend?.name || ""
                                }));

                                // Auto-fetch price and packaging if weight is already selected
                                if (currentItem?.packaging_size && customerType) {
                                  const [price, pkg] = await Promise.all([
                                    autoFetchPrice(currentItem.packaging_size, customerType, undefined, id),
                                    autoFetchPackaging(currentItem.packaging_size, undefined, id)
                                  ]);

                                  // Track if price is configured
                                  setIsPriceConfigured(price > 0);

                                  setCurrentItem(prev => ({
                                    ...prev,
                                    price_per_unit: price > 0 ? price.toString() : '',
                                    packaging_volume_ml: pkg?.packaging_volume_ml || prev.packaging_volume_ml,
                                    packaging_id: pkg?.packaging_id || prev.packaging_id
                                  }));
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                              <SelectValue placeholder="Vyberte plodinu alebo mix" />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-[9999]">
                              {filteredCropsByCategory.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>Samostatné plodiny</SelectLabel>
                                  {filteredCropsByCategory.map((crop) => (
                                    <SelectItem key={crop.id} value={`crop:${crop.id}`}>{crop.name}</SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              {filteredBlendsByCategory.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>Mixy</SelectLabel>
                                  {filteredBlendsByCategory.map((blend) => (
                                    <SelectItem key={blend.id} value={`blend:${blend.id}`}>{blend.name}</SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* SEKCIA: VÁHA A MNOŽSTVO */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg mt-2">
                        <div className="space-y-2">
                          <Label>Váha</Label>
                          {(() => {
                            console.log('🎯 Current item packaging_size in form:', currentItem?.packaging_size);
                            console.log('🎯 Current item is_special_item:', currentItem?.is_special_item);
                            return null;
                          })()}
                          {currentItem?.is_special_item ? (
                            <Input
                              placeholder="Zadajte váhu (napr. 30)"
                              value={currentItem?.packaging_size || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                console.log('📝 Input onChange - new value:', val);
                                setCurrentItem(prev => ({ ...prev, packaging_size: val }));
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                if (val && !val.endsWith('g') && !isNaN(Number(val))) {
                                  setCurrentItem(prev => ({ ...prev, packaging_size: val + 'g' }));
                                }
                              }}
                              className="h-10 bg-white border-slate-200"
                            />
                          ) : (
                            <Select
                              value={currentItem?.packaging_size || ''}
                              onValueChange={async (value) => {
                                console.log('📝 Select onChange - new value:', value);
                                setCurrentItem(prev => ({ ...prev, packaging_size: value }));
                                // AUTOMATIC FETCHING OF PRICE AND PACKAGING
                                if ((currentItem?.crop_id || currentItem?.blend_id) && customerType) {
                                  const [price, pkg] = await Promise.all([
                                    autoFetchPrice(value, customerType, currentItem.crop_id, currentItem.blend_id),
                                    autoFetchPackaging(value, currentItem.crop_id, currentItem.blend_id)
                                  ]);

                                  // Track if price is configured
                                  setIsPriceConfigured(price > 0);

                                  setCurrentItem(prev => ({
                                    ...prev,
                                    price_per_unit: price > 0 ? price.toString() : '',
                                    packaging_volume_ml: pkg?.packaging_volume_ml || prev.packaging_volume_ml,
                                    packaging_id: pkg?.packaging_id || prev.packaging_id
                                  }));
                                }
                              }}
                            >
                              <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                                <SelectValue placeholder="Vyberte gramáž" />
                              </SelectTrigger>
                              <SelectContent className="bg-white z-[9999]">
                                {['25g', '50g', '60g', '70g', '100g', '120g', '150g'].map((w) => (
                                  <SelectItem key={w} value={w}>{w}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Množstvo (ks)</Label>
                          <Input
                            type="number"
                            value={currentItem?.quantity || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentItem(prev => ({
                                ...prev,
                                quantity: val === '' ? '' : (parseInt(val) || 1)
                              }));
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || parseInt(e.target.value) < 1) {
                                setCurrentItem(prev => ({ ...prev, quantity: 1 }));
                              }
                            }}
                            className="h-10 bg-white border-slate-200"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <Label className="text-sm">Forma</Label>
                          <select
                            value={currentItem?.delivery_form || 'rezana'}
                            onChange={(e) => setCurrentItem({ ...currentItem, delivery_form: e.target.value })}
                            className="mt-1 w-full px-3 h-10 border border-slate-200 rounded-md text-sm bg-white"
                          >
                            <option value="rezana">Zrezaná</option>
                            <option value="ziva">Živá</option>
                          </select>
                        </div>

                        <div>
                          <Label className="text-sm">Cena (€)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder={!isPriceConfigured && !currentItem.is_special_item ? 'Chýba cena' : '0.00'}
                            value={currentItem.price_per_unit || ''}
                            onChange={(e) => {
                              setCurrentItem({ ...currentItem, price_per_unit: e.target.value });
                            }}
                            disabled={!isPriceConfigured && !currentItem.is_special_item}
                            className="mt-1 h-10 border-slate-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Typ obalu</Label>
                          <select
                            value={currentItem?.packaging_type || 'rPET'}
                            onChange={(e) => setCurrentItem({ ...currentItem, packaging_type: e.target.value })}
                            className="mt-1 w-full px-3 h-10 border border-slate-200 rounded-md text-sm bg-white"
                          >
                            <option value="rPET">rPET</option>
                            <option value="PET">PET</option>
                            <option value="EKO">EKO</option>
                            <option value="Vratný obal">Vratný obal</option>
                          </select>
                        </div>

                        {currentItem?.packaging_type !== 'Vratný obal' && (
                          <div>
                            <Label className="text-sm">Veľkosť krabičky (ml)</Label>
                            <select
                              value={currentItem?.packaging_volume_ml || 250}
                              onChange={(e) => {
                                const volumeVal = parseInt(e.target.value) || 250;
                                const selectedPkg = (packagings || []).find(p => p?.size && p.size.includes(volumeVal.toString()));
                                setCurrentItem({
                                  ...currentItem,
                                  packaging_volume_ml: volumeVal,
                                  packaging_id: selectedPkg?.id || currentItem?.packaging_id
                                });
                              }}
                              className="mt-1 w-full px-3 h-10 border border-slate-200 rounded-md text-sm bg-white"
                            >
                              <option value="250">250ml</option>
                              <option value="500">500ml</option>
                              <option value="750">750ml</option>
                              <option value="1000">1000ml</option>
                              <option value="1200">1200ml</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 mt-3">
                        <input
                          type="checkbox"
                          id="has_label"
                          checked={currentItem?.has_label || false}
                          onChange={(e) => setCurrentItem({ ...currentItem, has_label: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <Label htmlFor="has_label" className="text-sm font-normal cursor-pointer">Etiketa</Label>
                      </div>

                      <div className="mt-3">
                        <Label className="text-sm">Poznámky / Špeciálne požiadavky</Label>
                        <textarea
                          value={currentItem?.special_requirements || ''}
                          onChange={(e) => setCurrentItem({ ...currentItem, special_requirements: e.target.value })}
                          placeholder="Napríklad: bez koreňov, extra rezané, balenie oddelene..."
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[60px] resize-y"
                        />
                      </div>

                      <button
                        onClick={addItemToList}
                        className="mt-3 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Pridať položku do zoznamu
                      </button>
                    </div>

                    {(orderItems || []).length > 0 && (
                      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mt-3">
                        <h3 className="font-semibold text-sm mb-3 text-green-800 uppercase tracking-wide">Pridané položky</h3>
                        <div className="space-y-2.5">
                          {(orderItems || []).map((item, index) => {
                            if (!item) return null;
                            const itemPrice = (item?.quantity || 0) * (parseFloat(item?.price_per_unit?.toString().replace(',', '.')) || 0);
                            const formLabel = item?.delivery_form === 'rezana' ? 'Zrezaná' : 'Živá';
                            return (
                              <div key={index} className="bg-white p-3 rounded-lg border border-green-200 shadow-sm">
                                <div className="flex justify-between items-center">
                                  <div className="flex-1">
                                    <div className="text-sm text-gray-900 flex items-center gap-1 flex-wrap">
                                      <span className="font-semibold">{item?.quantity || 0}ks</span>
                                      <span>•</span>
                                      <span className="font-medium">{item?.crop_name || '-'}</span>
                                      <span>•</span>
                                      <span className="text-gray-600">{item?.packaging_size ? (item.packaging_size.includes('g') || item.packaging_size.includes('kg') ? item.packaging_size : `${item.packaging_size}g`) : '-'}</span>
                                      <span className="text-gray-500">({formLabel})</span>
                                      {item?.has_label && (
                                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                          🏷️ Etiketa
                                        </Badge>
                                      )}
                                      <span className="font-bold text-[#10b981]">--- {itemPrice.toFixed(2)} €</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      • Obal: {item?.packaging_type || 'rPET'} • {item?.packaging_volume_ml || 250}ml
                                      {item?.special_requirements && (
                                        <span className="text-orange-600 font-medium"> • {item.special_requirements}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => {
                                      console.log('✏️ Editing item:', item);
                                      console.log('✏️ Item packaging_size:', item?.packaging_size);
                                      console.log('✏️ Item packaging_type:', item?.packaging_type);
                                      console.log('✏️ Item packaging_volume_ml:', item?.packaging_volume_ml);

                                      // OPRAVA: Normalizuj packaging_size - pridaj "g" ak chýba
                                      let normalizedPackagingSize = String(item?.packaging_size || '');
                                      if (normalizedPackagingSize && !normalizedPackagingSize.includes('g') && !normalizedPackagingSize.includes('kg') && !isNaN(Number(normalizedPackagingSize))) {
                                        normalizedPackagingSize = normalizedPackagingSize + 'g';
                                      }

                                      // OPRAVA: Explicitný spread s typovou konverziou
                                      setCurrentItem({
                                        ...item,
                                        packaging_size: normalizedPackagingSize,
                                        quantity: Number(item?.quantity || 1),
                                        price_per_unit: item?.price_per_unit?.toString() || ''
                                      });

                                      console.log('✏️ After setCurrentItem, normalized packaging_size:', normalizedPackagingSize);

                                      removeItem(index);
                                    }} className="ml-2">
                                      <Edit className="h-4 w-4 text-blue-500" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm font-medium">Poznámky k objednávke</Label>
                    <textarea
                      value={orderNotes || ''}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Poznámky alebo špeciálne pokyny pre objednávku..."
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[80px] resize-y"
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-medium text-sm mb-3">Nastavenia dopravy</h3>
                    <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Switch
                          id="free-delivery"
                          checked={freeDelivery}
                          onCheckedChange={(checked) => {
                            setFreeDelivery(checked);
                            if (checked) {
                              setManualDeliveryAmount('');
                            }
                          }}
                        />
                        <Label htmlFor="free-delivery" className="text-sm font-medium cursor-pointer">
                          Doprava zdarma
                        </Label>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Manuálna suma dopravy (€)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Auto-výpočet z trasy"
                          value={manualDeliveryAmount}
                          onChange={(e) => setManualDeliveryAmount(e.target.value)}
                          disabled={freeDelivery}
                          className="h-10 text-sm"
                        />
                        <p className="text-xs text-gray-500">
                          {freeDelivery
                            ? 'Doprava zdarma je zapnutá - manuálna suma je deaktivovaná'
                            : 'Nechajte prázdne pre automatický výpočet podľa trasy'}
                        </p>
                      </div>
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Vypočítaná doprava:</span>
                          <span className="text-lg font-bold text-green-600">{calculatedDeliveryPrice.toFixed(2)} €</span>
                        </div>
                        {(() => {
                          const showFreeDeliveryMessage = calculatedDeliveryPrice === 0 && orderItems && orderItems.length > 0 && !freeDelivery;

                          if (showFreeDeliveryMessage) {
                            return (
                              <p className="text-sm text-green-600 font-bold flex items-center gap-1">
                                <Check className="h-4 w-4" />
                                Doprava zdarma
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* CAPACITY WARNING */}
                  {(() => {
                    if (!deliveryDate || !orderItems || orderItems.length === 0) {
                      return null;
                    }

                    const capacityIssues = checkCapacityForOrder(deliveryDate, orderItems);

                    if (capacityIssues.length === 0) return null;

                    return (
                      <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-red-800 mb-2">⚠️ NEDOSTATOK KAPACITY</h3>
                            <p className="text-sm text-red-700 mb-3">
                              Na dátum {new Date(deliveryDate).toLocaleDateString('sk-SK')} nemáte dostatok vysadených plodín:
                            </p>
                            <div className="space-y-2">
                              {capacityIssues.map((issue, idx) => (
                                <div key={idx} className="bg-white border border-red-200 rounded p-3 text-sm">
                                  <p className="font-semibold text-red-900 mb-1">
                                    {issue.cropName} - {issue.packageSize}g
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-gray-600">Kapacita:</span>
                                      <span className="font-medium ml-1">{issue.capacity}g</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Už objednané:</span>
                                      <span className="font-medium ml-1">{issue.ordered}g</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Chcete pridať:</span>
                                      <span className="font-medium ml-1">{issue.needed}g</span>
                                    </div>
                                    <div>
                                      <span className="text-red-700 font-semibold">Chýba:</span>
                                      <span className="font-bold text-red-700 ml-1">{issue.shortage}g</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-red-600 mt-3">
                              Môžete zvoliť iný dátum alebo pridať objednávku aj tak (na vlastné riziko).
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Zrušiť
                    </Button>
                    <Button onClick={saveOrder} className="bg-[#10b981] hover:bg-[#059669]">
                      {editingOrder ? 'Uložiť zmeny' : 'Vytvoriť objednávku'}
                    </Button>
                  </DialogFooter>
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
                  <div className="font-semibold text-gray-900">{selectedOrderDetail.customer_name || 'Bez názvu'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Dátum dodania</div>
                  <div className="font-semibold text-gray-900">{formatDeliveryDate(selectedOrderDetail.delivery_date)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Trasa</div>
                  <div className="font-semibold text-gray-900">{selectedOrderDetail.route || '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-600 mb-1.5">Status</div>
                  <div className="flex items-center flex-wrap gap-2">
                    <Badge className={`border ${getStatusBadgeClass(selectedOrderDetail.status)} text-xs font-semibold px-2 py-0.5`}>
                      {getStatusLabel(selectedOrderDetail.status)}
                    </Badge>
                    {(selectedOrderDetail.parent_order_id || (selectedOrderDetail.is_recurring && (selectedOrderDetail.recurring_weeks || 0) > 1)) && (
                      <div className="flex items-center" title="Opakujúca sa objednávka">
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedOrderDetail.notes && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-semibold text-blue-900 mb-1">Poznámky:</div>
                  <div className="text-sm text-blue-800">{selectedOrderDetail.notes}</div>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-semibold text-base mb-3">Položky objednávky:</h3>
                <div className="space-y-2">
                  {(selectedOrderDetail.order_items || []).map((item, idx) => {
                    if (!item) return null;
                    const itemPrice = (item?.quantity || 0) * (parseFloat(item?.price_per_unit?.toString().replace(',', '.')) || 0);
                    const formLabel = item?.delivery_form === 'rezana' ? 'Zrezaná' : 'Živá';
                    const weightDisplay = item?.packaging_size ? (item.packaging_size.includes('g') || item.packaging_size.includes('kg') ? item.packaging_size : `${item.packaging_size}g`) : '-';
                    return (
                      <div key={idx} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {item?.quantity || 0}ks • {item?.crop_name || '-'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {weightDisplay} • {formLabel}
                            {item?.packaging_type && ` • ${item.packaging_type}`}
                            {item?.packaging_volume_ml && ` • ${item.packaging_volume_ml}ml`}
                          </div>
                          {item?.notes && (
                            <div className="text-xs text-gray-500 mt-1 italic">{item.notes}</div>
                          )}
                        </div>
                        <div className="font-bold text-[#10b981] text-lg ml-4">
                          {itemPrice.toFixed(2)} €
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Medzisúčet:</span>
                  <span className="font-semibold text-gray-900">
                    {(() => {
                      if (selectedOrderDetail.order_items && Array.isArray(selectedOrderDetail.order_items)) {
                        const subtotal = selectedOrderDetail.order_items.reduce((sum, item) => {
                          if (!item) return sum;
                          const qty = parseFloat(item.quantity?.toString() || '0');
                          const pricePerUnit = parseFloat(item.price_per_unit?.toString().replace(',', '.') || '0');
                          return sum + (qty * pricePerUnit);
                        }, 0);
                        return subtotal.toFixed(2);
                      }
                      return (selectedOrderDetail?.total_price || 0).toFixed(2);
                    })()}€
                  </span>
                </div>
                {(() => {
                  if (customers.length === 0 || routes.length === 0) {
                    return null;
                  }

                  const deliveryFee = getDeliveryFee(selectedOrderDetail);

                  // If charge_delivery is false or deliveryFee is 0, show free shipping
                  if (!selectedOrderDetail.charge_delivery || deliveryFee === 0) {
                    return (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#10b981] flex items-center gap-1 font-medium">
                          <Truck className="h-3 w-3" />
                          Doprava: Zdarma
                        </span>
                      </div>
                    );
                  }

                  // Show delivery fee if it's greater than 0
                  if (deliveryFee > 0) {
                    return (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          Doprava:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {deliveryFee.toFixed(2)} €
                        </span>
                      </div>
                    );
                  }
                })()}
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="text-lg text-gray-700 font-semibold">Celkom:</span>
                  <span className="text-3xl font-bold text-[#10b981]">
                    {(getOrderTotal(selectedOrderDetail) || 0).toFixed(2)} €
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                  Zatvoriť
                </Button>
                <Button
                  variant="default"
                  className="bg-[#10b981] hover:bg-[#059669]"
                  onClick={() => {
                    setDetailModalOpen(false);
                    openEdit(selectedOrderDetail);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Upraviť
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
