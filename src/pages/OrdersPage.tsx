import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { OrderSearchBar } from '@/components/orders/OrderSearchBar';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import { CategoryFilter } from '@/components/orders/CategoryFilter';
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
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { sk } from 'date-fns/locale';

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
  packaging_material: string;
  packaging_volume_ml: number;
  packaging_id?: string;
  has_label: boolean;
  notes?: string;
  special_requirements?: string;
  price_per_unit?: number | string;
  total_price?: number;
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

export default function OrdersPage() {
  console.log('[OrdersPage] Component rendering started');
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [blends, setBlends] = useState<Blend[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCustomerType, setFilterCustomerType] = useState<string>('all');
  const [filterCrop, setFilterCrop] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const [customerType, setCustomerType] = useState('home');
  const [customerId, setCustomerId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [status, setStatus] = useState('cakajuca');
  const [orderType, setOrderType] = useState('jednorazova');
  const [weekCount, setWeekCount] = useState(1);
  const [route, setRoute] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [chargeDelivery, setChargeDelivery] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  const [currentItem, setCurrentItem] = useState<OrderItem>({
    crop_name: '',
    quantity: 1,
    unit: 'ks',
    packaging_size: '',
    delivery_form: 'rezana',
    packaging_type: '',
    packaging_material: 'rPET',
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const fetchPriceAutomatically = async () => {
      if (!currentItem.is_special_item && currentItem.crop_id && currentItem.packaging_size && customerType) {
        const autoPrice = await autoFetchPrice(currentItem.crop_id, currentItem.packaging_size, customerType);
        if (autoPrice > 0) {
          setCurrentItem(prev => ({ ...prev, price_per_unit: autoPrice.toString() }));
        }
      }
    };

    fetchPriceAutomatically();
  }, [currentItem.crop_id, currentItem.packaging_size, customerType, currentItem.is_special_item]);

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

  const loadData = async () => {
    try {
      setLoading(true);
      setDataLoaded(false);
      const [ordersRes, customersRes, cropsRes, blendsRes, routesRes, pricesRes, packagingsRes, deliveryDaysRes, profileRes] = await Promise.all([
        supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('name'),
        supabase.from('crops').select('*').order('name'),
        supabase.from('blends').select('*').order('name'),
        supabase.from('delivery_routes').select('*').order('name'),
        supabase.from('prices').select('*'),
        supabase.from('packagings').select('*').order('name'),
        supabase.from('delivery_days').select('*').order('day_of_week'),
        supabase.from('profiles').select('delivery_settings').maybeSingle(),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (customersRes.data) setCustomers(customersRes.data);
      if (cropsRes.data) setCrops(cropsRes.data);
      if (blendsRes.data) setBlends(blendsRes.data);
      if (routesRes.data) setRoutes(routesRes.data);
      if (pricesRes.data) setPrices(pricesRes.data);
      if (packagingsRes.data) setPackagings(packagingsRes.data);
      if (deliveryDaysRes.data) setDeliveryDays(deliveryDaysRes.data);
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

    if (searchQuery) {
      const customer = customers?.find(c => c.id === order.customer_id);
      const searchLower = searchQuery.toLowerCase();
      const customerName = (customer?.name || '').toLowerCase();
      const companyName = (customer?.company_name || '').toLowerCase();
      if (!customerName.includes(searchLower) && !companyName.includes(searchLower)) {
        return false;
      }
    }

    return true;
  });

  const filteredCropsByCategory = useMemo(() => {
    if (!categoryFilter) return crops;

    const categoryMap: { [key: string]: string } = {
      'Mikrozelenina': 'microgreens',
      'Mikrobylinky': 'microherbs',
      'Jedlé kvety': 'edible_flowers'
    };

    const categoryKey = categoryMap[categoryFilter];
    if (!categoryKey) return crops;

    return crops.filter(crop => crop.category === categoryKey);
  }, [crops, categoryFilter]);

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

      // CRITICAL: Find the delivery route assigned to this customer
      const customerRouteId = customer?.delivery_route_id;
      if (!customerRouteId) {
        return 0;
      }

      const deliveryRoute = routes?.find(r => r.id === customerRouteId);
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

      // STRICT RULE: If orderSubtotal < minFreeThreshold, charge delivery fee
      if (minFreeThreshold > 0 && orderSubtotal >= minFreeThreshold) {
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
    setChargeDelivery(false);
    setOrderItems([]);
    setCurrentItem({
      crop_name: '',
      quantity: 1,
      unit: 'ks',
      packaging_size: '',
      delivery_form: 'rezana',
      packaging_type: '',
      packaging_material: 'rPET',
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

  const openEdit = (order: Order) => {
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
    setChargeDelivery(order.charge_delivery || false);
    setOrderItems(order.order_items || []);
    setIsDialogOpen(true);
  };

  const autoFetchPrice = async (cropId: string, packagingSize: string, customerType: string) => {
    try {
      const { data: priceData } = await supabase
        .from('prices')
        .select('*')
        .eq('crop_id', cropId)
        .eq('packaging_size', packagingSize)
        .eq('customer_type', customerType)
        .maybeSingle();

      return priceData?.unit_price || 0;
    } catch (error) {
      console.error('Error fetching price:', error);
      return 0;
    }
  };

  const autoFetchPackaging = async (cropId: string, packagingSize: string) => {
    try {
      const weightG = parseInt(packagingSize.replace(/[^0-9]/g, ''));
      if (!weightG) return null;

      console.log(`📦 Auto-fetching packaging for crop ${cropId}, weight ${weightG}g`);

      const { data: mapping } = await supabase
        .from('packaging_mappings')
        .select('packaging_id, packagings(type, size)')
        .eq('crop_id', cropId)
        .eq('weight_g', weightG)
        .maybeSingle();

      if (mapping && mapping.packagings) {
        const pkg: any = mapping.packagings;
        const volumeMatch = pkg.size?.match(/(\d+)/);
        const volumeMl = volumeMatch ? parseInt(volumeMatch[1]) : 250;

        const result = {
          packaging_id: mapping.packaging_id,
          packaging_material: pkg.type || 'rPET',
          packaging_volume_ml: volumeMl
        };

        console.log('✅ Auto-selected packaging:', result);
        return result;
      }

      console.log('⚠️ No packaging mapping found for this crop and weight');
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

    const autoPrice = currentItem.crop_id && customerType && !currentItem.is_special_item
      ? await autoFetchPrice(currentItem.crop_id, currentItem.packaging_size, customerType)
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
      packaging_type: '',
      packaging_material: 'rPET',
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

      // Calculate delivery fee automatically based on customer's assigned route settings
      let deliveryPrice = 0;

      if (chargeDelivery && customer) {
        const custType = customer.customer_type || 'home';

        // Check if customer has free delivery exception
        if (customer.free_delivery) {
          deliveryPrice = 0;
        } else {
          // Find customer's assigned delivery route
          const customerRouteId = customer?.delivery_route_id;
          const deliveryRoute = routes?.find(r => r.id === customerRouteId);

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

            // Check if free delivery threshold met
            if (minFreeDelivery > 0 && totalPrice >= minFreeDelivery) {
              deliveryPrice = 0;
            } else {
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
            console.warn('⚠️ No delivery route found for customer:', customer.name);
          }
        }
      }

      const finalTotalPrice = totalPrice + deliveryPrice;

      const orderData = {
        customer_id: customerId,
        customer_name: customer?.company_name || customer?.name || '',
        customer_type: customer?.customer_type || 'home',
        delivery_date: deliveryDate,
        status: status,
        total_price: parseFloat(finalTotalPrice.toFixed(2)),
        delivery_price: parseFloat(deliveryPrice.toFixed(2)),
        charge_delivery: chargeDelivery,
        route: route || null,
        notes: orderNotes || null,
        is_recurring: orderType === 'tyzdenne' || orderType === 'dvojtyzdenne',
        recurrence_pattern: orderType !== 'jednorazova' ? orderType : null,
        recurring_weeks: orderType !== 'jednorazova' ? parseInt(weekCount) || 1 : null,
        user_id: user.id
      };

      if (editingOrder) {
        const { error } = await supabase.from('orders').update(orderData).eq('id', editingOrder.id);
        if (error) throw error;

        await supabase.from('order_items').delete().eq('order_id', editingOrder.id);

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
            order_id: editingOrder.id,
            crop_id: item.is_special_item ? null : (item.crop_id || null),
            blend_id: item.blend_id || null,
            crop_name: cropName,
            quantity: quantity,
            unit: item.unit,
            packaging_size: weightValue,
            delivery_form: item.delivery_form,
            has_label: item.has_label,
            notes: item.notes || null,
            packaging_material: item.packaging_material || 'PET',
            packaging_volume_ml: item.packaging_volume_ml || null,
            packaging_id: item.packaging_id || null,
            special_requirements: item.special_requirements || null,
            price_per_unit: price,
            total_price: parseFloat((quantity * price).toFixed(2)),
            is_special_item: item.is_special_item || false,
            custom_crop_name: item.is_special_item ? item.custom_crop_name : null,
            user_id: user.id
          };
        });
        const { error: itemsError } = await supabase.from('order_items').insert(items);
        if (itemsError) throw itemsError;

        for (const item of orderItems || []) {
          if (item?.packaging_id && item?.quantity) {
            try {
              await supabase.rpc('decrement_packaging_stock', {
                packaging_id: item.packaging_id,
                amount: item.quantity
              });
            } catch (pkgError) {
              console.error('[OrdersPage] Error decrementing packaging stock:', pkgError);
            }
          }
        }

        toast({ title: 'Úspech', description: 'Objednávka upravená' });
        setIsDialogOpen(false);
        await loadData();
      } else {
        const { data: newOrder, error } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (error) throw error;

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
            order_id: newOrder.id,
            crop_id: item.is_special_item ? null : (item.crop_id || null),
            blend_id: item.blend_id || null,
            crop_name: cropName,
            quantity: quantity,
            unit: item.unit,
            packaging_size: weightValue,
            delivery_form: item.delivery_form,
            has_label: item.has_label,
            notes: item.notes || null,
            packaging_material: item.packaging_material || 'PET',
            packaging_volume_ml: item.packaging_volume_ml || null,
            packaging_id: item.packaging_id || null,
            special_requirements: item.special_requirements || null,
            price_per_unit: price,
            total_price: parseFloat((quantity * price).toFixed(2)),
            is_special_item: item.is_special_item || false,
            custom_crop_name: item.is_special_item ? item.custom_crop_name : null,
            user_id: user.id
          };
        });
        const { error: itemsError } = await supabase.from('order_items').insert(items);
        if (itemsError) throw itemsError;

        for (const item of orderItems || []) {
          if (item?.packaging_id && item?.quantity) {
            try {
              await supabase.rpc('decrement_packaging_stock', {
                packaging_id: item.packaging_id,
                amount: item.quantity
              });
            } catch (pkgError) {
              console.error('[OrdersPage] Error decrementing packaging stock:', pkgError);
            }
          }
        }

        toast({ title: 'Úspech', description: 'Objednávka vytvorená' });
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

  const openDeleteDialog = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteDialogOpen(true);
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

  const duplicateOrder = async (order: Order) => {
    try {
      const orderData = {
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        delivery_date: order.delivery_date,
        status: 'cakajuca'
      };

      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      if (order.order_items && order.order_items.length > 0) {
        const items = order.order_items.map(item => ({
          order_id: newOrder.id,
          crop_id: item.crop_id,
          blend_id: item.blend_id,
          quantity: item.quantity,
          unit: item.unit,
          packaging_size: item.packaging_size,
          delivery_form: item.delivery_form,
          has_label: item.has_label,
          notes: item.notes
        }));
        await supabase.from('order_items').insert(items);
      }

      toast({ title: 'Úspech', description: 'Objednávka zduplikovaná' });
      await loadData();
    } catch (error) {
      console.error('Error duplicating order:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa zduplikovať objednávku', variant: 'destructive' });
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

          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Všetky týždne" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všetky týždne</SelectItem>
              <SelectItem value="this_week">Tento týždeň</SelectItem>
              <SelectItem value="next_week">Budúci týždeň</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Všetky" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všetky</SelectItem>
              <SelectItem value="cakajuca">Čakajúca</SelectItem>
              <SelectItem value="potvrdena">Potvrdená</SelectItem>
              <SelectItem value="pripravena">Pripravená</SelectItem>
              <SelectItem value="dorucena">Doručená</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">Typ:</span>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant={filterCustomerType === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterCustomerType('all')}
                className={filterCustomerType === 'all' ? 'h-8 bg-[#10b981] hover:bg-[#059669]' : 'h-8'}
              >
                Všetci
              </Button>
              <Button
                variant={filterCustomerType === 'home' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterCustomerType('home')}
                className={filterCustomerType === 'home' ? 'h-8 bg-[#10b981] hover:bg-[#059669]' : 'h-8'}
              >
                <Home className="h-4 w-4 mr-1" />
                Domáci
              </Button>
              <Button
                variant={filterCustomerType === 'gastro' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterCustomerType('gastro')}
                className={filterCustomerType === 'gastro' ? 'h-8 bg-[#10b981] hover:bg-[#059669]' : 'h-8'}
              >
                <Utensils className="h-4 w-4 mr-1" />
                Gastro
              </Button>
              <Button
                variant={filterCustomerType === 'wholesale' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterCustomerType('wholesale')}
                className={filterCustomerType === 'wholesale' ? 'h-8 bg-[#10b981] hover:bg-[#059669]' : 'h-8'}
              >
                <Store className="h-4 w-4 mr-1" />
                VO
              </Button>
            </div>
          </div>

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
                        <Badge className={`border ${getStatusBadgeClass(order.status)} text-xs font-semibold px-2 py-0.5`}>
                          {getStatusLabel(order.status)}
                        </Badge>
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
                      <Badge className={`mt-1.5 border ${getStatusBadgeClass(order.status)} text-xs font-semibold px-2.5 py-0.5`}>
                        {getStatusLabel(order.status)}
                      </Badge>
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

                    if (!order.charge_delivery) {
                      return null;
                    }

                    const deliveryFee = getDeliveryFee(order);
                    if (deliveryFee > 0) {
                      return (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Doprava:</span>
                          <span className="font-semibold text-gray-900">{deliveryFee.toFixed(2)} €</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#10b981] font-medium">Doprava zdarma</span>
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
                            if (currentItem?.crop_id && currentItem?.packaging_size) {
                              const autoPrice = await autoFetchPrice(currentItem.crop_id, currentItem.packaging_size, 'home');
                              setCurrentItem({ ...currentItem, price_per_unit: autoPrice > 0 ? autoPrice.toString() : (currentItem?.price_per_unit || '') });
                            }
                          }}
                          className={`p-1.5 rounded-lg border-2 transition-all ${
                            customerType === 'home'
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Home className={`h-4 w-4 mx-auto mb-0.5 ${
                            customerType === 'home' ? 'text-green-500' : 'text-gray-400'
                          }`} />
                          <div className="text-xs font-medium">Domáci</div>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setCustomerType('gastro');
                            setCustomerId('');
                            if (currentItem?.crop_id && currentItem?.packaging_size) {
                              const autoPrice = await autoFetchPrice(currentItem.crop_id, currentItem.packaging_size, 'gastro');
                              setCurrentItem({ ...currentItem, price_per_unit: autoPrice > 0 ? autoPrice.toString() : (currentItem?.price_per_unit || '') });
                            }
                          }}
                          className={`p-1.5 rounded-lg border-2 transition-all ${
                            customerType === 'gastro'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Utensils className={`h-4 w-4 mx-auto mb-0.5 ${
                            customerType === 'gastro' ? 'text-blue-500' : 'text-gray-400'
                          }`} />
                          <div className="text-xs font-medium">Gastro</div>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setCustomerType('wholesale');
                            setCustomerId('');
                            if (currentItem?.crop_id && currentItem?.packaging_size) {
                              const autoPrice = await autoFetchPrice(currentItem.crop_id, currentItem.packaging_size, 'wholesale');
                              setCurrentItem({ ...currentItem, price_per_unit: autoPrice > 0 ? autoPrice.toString() : (currentItem?.price_per_unit || '') });
                            }
                          }}
                          className={`p-1.5 rounded-lg border-2 transition-all ${
                            customerType === 'wholesale'
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Store className={`h-4 w-4 mx-auto mb-0.5 ${
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
                            onChange={setCustomerId}
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
                          className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                        <Input
                          type="date"
                          value={deliveryDate || ''}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="mt-1"
                        />
                        {deliveryDayHint && (
                          <p className="text-xs text-gray-500 mt-1">{deliveryDayHint}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm">Stav</Label>
                        <select
                          value={status || 'cakajuca'}
                          onChange={(e) => setStatus(e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                          value={weekCount === 1 ? '' : weekCount}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setWeekCount(value === '' ? 1 : parseInt(value) || 1);
                          }}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">Počet týždňov na opakovanie</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 py-2">
                      <Switch
                        id="charge-delivery"
                        checked={chargeDelivery}
                        onCheckedChange={setChargeDelivery}
                      />
                      <Label htmlFor="charge-delivery" className="text-sm font-medium cursor-pointer">
                        Počítať dopravu
                      </Label>
                    </div>

                    <div className="border-t pt-2.5 mt-2.5">
                      <h3 className="font-medium text-sm mb-2.5">Pridať produkt</h3>

                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          id="special-item-modal"
                          checked={currentItem?.is_special_item || false}
                          onChange={(e) => setCurrentItem({ ...currentItem, is_special_item: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="special-item-modal" className="text-sm cursor-pointer">
                          Špeciálna položka (manuálne zadanie)
                        </Label>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          {!currentItem?.is_special_item && (
                            <CategoryFilter
                              value={categoryFilter}
                              onChange={setCategoryFilter}
                            />
                          )}

                          <div>
                            <Label className="text-sm">Plodina *</Label>
                            {currentItem?.is_special_item ? (
                              <Input
                                type="text"
                                value={currentItem?.custom_crop_name || ''}
                                onChange={(e) => setCurrentItem({ ...currentItem, custom_crop_name: e.target.value, crop_name: e.target.value })}
                                className="mt-1"
                                placeholder="Názov produktu"
                              />
                            ) : (
                              <select
                                value={currentItem?.crop_id || ''}
                                onChange={async (e) => {
                                  const cropId = e.target.value;
                                  const crop = crops?.find(c => c.id === cropId);
                                  if (crop) {
                                    const packagingSize = currentItem?.packaging_size || '';
                                    const autoPackaging = packagingSize ? await autoFetchPackaging(crop.id, packagingSize) : null;

                                    setCurrentItem({
                                      ...currentItem,
                                      crop_id: crop.id,
                                      crop_name: crop.name,
                                      price_per_unit: '',
                                      ...(autoPackaging || {})
                                    });
                                  }
                                }}
                                className="mt-1 w-full px-3 h-10 border border-gray-300 rounded-md text-sm"
                              >
                                <option value="">Vyberte produkt</option>
                                {(filteredCropsByCategory || []).map(crop => (
                                  <option key={crop?.id} value={crop?.id}>{crop?.name}</option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div>
                            <Label className="text-sm">Forma</Label>
                            <select
                              value={currentItem?.delivery_form || 'rezana'}
                              onChange={(e) => setCurrentItem({ ...currentItem, delivery_form: e.target.value })}
                              className="mt-1 w-full px-3 h-10 border border-gray-300 rounded-md text-sm"
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
                              placeholder="0.00"
                              value={currentItem.price_per_unit || ''}
                              onChange={(e) => {
                                setCurrentItem({ ...currentItem, price_per_unit: e.target.value });
                              }}
                              className="mt-1 h-10"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm">Množstvo a Jednotka</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                placeholder="1"
                                value={currentItem?.quantity || 1}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 1;
                                  setCurrentItem({ ...currentItem, quantity: value });
                                }}
                                className="flex-1 h-10"
                              />
                              <select
                                value={currentItem?.unit || 'ks'}
                                onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
                                className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm h-10"
                              >
                                <option value="ks">ks</option>
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm">Váha</Label>
                            <Input
                              list="weight-options"
                              type="text"
                              value={currentItem?.packaging_size || ''}
                              onChange={async (e) => {
                                let value = e.target.value.trim();

                                // Update immediately
                                setCurrentItem({ ...currentItem, packaging_size: value });

                                // If user types just a number, wait for blur to append 'g'
                                // But if user selects from datalist (includes 'g'), process immediately
                                if (value && value.includes('g') && currentItem?.crop_id && customerType) {
                                  const [autoPrice, autoPackaging] = await Promise.all([
                                    autoFetchPrice(currentItem.crop_id, value, customerType),
                                    autoFetchPackaging(currentItem.crop_id, value)
                                  ]);

                                  setCurrentItem({
                                    ...currentItem,
                                    packaging_size: value,
                                    price_per_unit: autoPrice > 0 ? autoPrice.toString() : (currentItem?.price_per_unit || ''),
                                    ...(autoPackaging || {})
                                  });
                                }
                              }}
                              onBlur={async (e) => {
                                let value = e.target.value.trim();
                                if (!value) return;

                                // Auto-append 'g' if user enters just a number
                                if (/^\d+$/.test(value)) {
                                  value = value + 'g';

                                  // Update with 'g' appended
                                  if (currentItem?.crop_id && customerType) {
                                    const [autoPrice, autoPackaging] = await Promise.all([
                                      autoFetchPrice(currentItem.crop_id, value, customerType),
                                      autoFetchPackaging(currentItem.crop_id, value)
                                    ]);

                                    setCurrentItem({
                                      ...currentItem,
                                      packaging_size: value,
                                      price_per_unit: autoPrice > 0 ? autoPrice.toString() : (currentItem?.price_per_unit || ''),
                                      ...(autoPackaging || {})
                                    });
                                  } else {
                                    setCurrentItem({ ...currentItem, packaging_size: value });
                                  }
                                }
                              }}
                              className="mt-1 h-10"
                              placeholder="Vyberte alebo zadajte (napr. 8g, 50g, 100g)"
                            />
                            <datalist id="weight-options">
                              <option value="25g" />
                              <option value="50g" />
                              <option value="60g" />
                              <option value="70g" />
                              <option value="100g" />
                              <option value="120g" />
                              <option value="150g" />
                            </datalist>
                          </div>

                          <div>
                            <Label className="text-sm">Typ obalu</Label>
                            <select
                              value={currentItem?.packaging_material || 'rPET'}
                              onChange={(e) => setCurrentItem({ ...currentItem, packaging_material: e.target.value })}
                              className="mt-1 w-full px-3 h-10 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="PET">PET</option>
                              <option value="rPET">rPET</option>
                              <option value="EKO">EKO</option>
                            </select>
                          </div>

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
                              className="mt-1 w-full px-3 h-10 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="250">250ml</option>
                              <option value="500">500ml</option>
                              <option value="750">750ml</option>
                              <option value="1000">1000ml</option>
                              <option value="1200">1200ml</option>
                            </select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="has_label"
                              checked={currentItem?.has_label || false}
                              onChange={(e) => setCurrentItem({ ...currentItem, has_label: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            <Label htmlFor="has_label" className="text-sm font-normal cursor-pointer">Etiketa</Label>
                          </div>
                        </div>
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
                                      • Obal: {item?.packaging_material || 'rPET'} • {item?.packaging_volume_ml || 250}ml
                                      {item?.special_requirements && (
                                        <span className="text-orange-600 font-medium"> • {item.special_requirements}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => {
                                      setCurrentItem(item);
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
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <Badge className={`border ${getStatusBadgeClass(selectedOrderDetail.status)} text-xs font-semibold px-2 py-0.5 w-fit`}>
                    {getStatusLabel(selectedOrderDetail.status)}
                  </Badge>
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
                            {item?.packaging_material && ` • ${item.packaging_material}`}
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

                  if (!selectedOrderDetail.charge_delivery) {
                    return null;
                  }

                  const deliveryFee = getDeliveryFee(selectedOrderDetail);
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
                  } else {
                    return (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#10b981] flex items-center gap-1 font-medium">
                          <Truck className="h-3 w-3" />
                          Doprava zdarma
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
