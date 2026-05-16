import { useState, useCallback, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useHarvestDays } from '@/hooks/useHarvestDays';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Calendar,
  Plus,
  Minus,
  Pencil,
  Trash2,
  Leaf,
  Loader2,
  Sprout,
  CalendarDays,
  LayoutGrid,
  List,
  CheckCircle2,
  CheckCircle,
  Circle,
  Info,
  Beaker,
  RotateCcw,
  Sparkles,
  Package,
  Layers,
  TreePine,
  Flower2,
  Lightbulb,
  StickyNote,
  FlaskConical,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Target,
  Scale,
  Sun,
  Moon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, parseISO, differenceInDays, startOfDay, subDays } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ===================== TYPES =====================

interface Crop {
  id: string;
  name: string;
  color: string;
  days_to_harvest: number;
  days_in_darkness?: number;
  days_on_light?: number;
  growth_days?: number;
  category?: string;
  reserved_percentage?: number;
  tray_configs?: Record<string, { seed_density?: number; seed_density_grams?: number; expected_yield?: number; yield_grams?: number }>;
}

interface TrayConfig {
  seed_density_grams: number;
  yield_grams: number;
}

interface PlantingPlan {
  id: string;
  crop_id: string;
  sow_date: string;
  expected_harvest_date?: string;
  tray_size: 'XL' | 'L' | 'M' | 'S';
  tray_count: number;
  seed_amount_grams: number;
  total_seed_grams: number;
  status: string;
  completed_at?: string;
  actual_yield_grams?: number | null;
  is_manual?: boolean;
  crops?: Crop;
  tray_config?: TrayConfig | null;
  source_orders?: string[] | null;
}

interface TrayDetail {
  size: 'XL' | 'L' | 'M' | 'S';
  count: number;
  seeds_per_tray: number;
  total_seeds: number;
  plan_id?: string;
  is_manual?: boolean;
}

interface GroupedPlantingPlan {
  id: string;
  crop_id: string;
  sow_date: string;
  expected_harvest_date?: string;
  status: string;
  completed_at?: string;
  crops?: Crop;
  trays: TrayDetail[];
  source_orders?: string[] | null;
  total_seed_grams: number;
  is_manual?: boolean;
  actual_yield_grams?: number | null;
}

interface ShelfConfig {
  id: string;
  name: string;
  zone: string; // 'dark' / 'light'
  shelves: number;
  positions_per_shelf: number;
  notes?: string;
  is_active: boolean;
}

interface HarvestDay {
  id: string;
  day_of_week: number; // 0-6
  label: string;
  is_active: boolean;
}

interface OrderForPlanning {
  id: string;
  order_number: number;
  delivery_date: string;
  status: string;
  customer_name?: string;
  order_items?: any[];
}

interface TodaysSowingItem {
  cropId: string;
  cropName: string;
  cropColor: string;
  cropDarkness: number;
  cropLight: number;
  trays: TrayDetail[];
  totalGrams: number;
  harvestDate: string;
  isManual: boolean;
  planIds: string[];
}

interface DayPlan {
  date: string; // yyyy-mm-dd
  items: TodaysSowingItem[];
}

interface CapacityInfo {
  darkUsed: number;
  darkTotal: number;
  lightUsed: number;
  lightTotal: number;
}

interface LateOrderInfo {
  orderId: string;
  orderNumber: number;
  customerName: string;
  cropName: string;
  cropId: string;
  deliveryDate: string;
  daysToHarvest: number;
  daysAvailable: number;
  quantityGrams: number;
}

interface PredictionRow {
  cropId: string;
  cropName: string;
  abc: 'A' | 'B' | 'C';
  orderedGrams: number;
  predictedGrams: number;
  confidence: number;
  recommendation: string;
}

// ===================== CONSTANTS =====================

const TRAY_SIZE_ORDER: Record<string, number> = {
  'XL': 1,
  'L': 2,
  'M': 3,
  'S': 4,
};

// Pozičná hodnota tácky pre kapacitné výpočty
const TRAY_POSITION_VALUE: Record<string, number> = {
  'XL': 1.0,
  'L': 1.0,
  'M': 1 / 3,
  'S': 1 / 3,
};

const sortTrayCombinations = (trays: TrayDetail[]): TrayDetail[] => {
  return [...trays].sort((a, b) => {
    const orderA = TRAY_SIZE_ORDER[a.size] || 999;
    const orderB = TRAY_SIZE_ORDER[b.size] || 999;
    return orderA - orderB;
  });
};

const calcPositions = (trays: TrayDetail[]): number => {
  return trays.reduce((sum, t) => sum + (TRAY_POSITION_VALUE[t.size] || 1) * t.count, 0);
};

const SK_WEEKDAYS = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];

const formatOrderNumber = (n: number): string => `MR-${String(n).padStart(3, '0')}`;

type ViewMode = 'cards' | 'list' | 'calendar';
type StatusFilter = 'all' | 'planned' | 'in_progress' | 'completed';
type Tab = 'plan' | 'prediction' | 'analysis';

// ===================== MAIN COMPONENT =====================

const PlantingPlanPage = () => {
  const { isAdmin } = useAuth();
  const { getHarvestDateForDelivery } = useHarvestDays();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Core state
  const [plans, setPlans] = useState<PlantingPlan[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [shelves, setShelves] = useState<ShelfConfig[]>([]);
  const [harvestDays, setHarvestDays] = useState<HarvestDay[]>([]);
  const [futureOrders, setFutureOrders] = useState<OrderForPlanning[]>([]);
  const [historicalOrders, setHistoricalOrders] = useState<OrderForPlanning[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('plan');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [generateCardOpen, setGenerateCardOpen] = useState(false);
  const [onlySowDays, setOnlySowDays] = useState(true);

  // Dialog state
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlantingPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<GroupedPlantingPlan | PlantingPlan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [groupedEditDialog, setGroupedEditDialog] = useState<{
    open: boolean;
    plan: GroupedPlantingPlan | null;
  }>({ open: false, plan: null });

  const [newPlantingDialog, setNewPlantingDialog] = useState(false);
  const [yieldDialog, setYieldDialog] = useState<{
    open: boolean;
    plan: GroupedPlantingPlan | null;
  }>({ open: false, plan: null });
  const [actualYield, setActualYield] = useState<number>(0);

  const [addTrayDialog, setAddTrayDialog] = useState<{
    open: boolean;
    plan: GroupedPlantingPlan | null;
  }>({ open: false, plan: null });
  const [addTraySize, setAddTraySize] = useState<'XL' | 'L' | 'M' | 'S'>('M');
  const [addTrayCount, setAddTrayCount] = useState(1);
  const [addTrayNote, setAddTrayNote] = useState('');

  // Form state
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCropId, setSelectedCropId] = useState('');
  const [sowDate, setSowDate] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [selectedTraySize, setSelectedTraySize] = useState<'XL' | 'L' | 'M' | 'S'>('XL');
  const [trayCount, setTrayCount] = useState(0);
  const [useCustomDensity, setUseCustomDensity] = useState(false);
  const [customSeedDensity, setCustomSeedDensity] = useState(0);
  const [isMixedPlanting, setIsMixedPlanting] = useState(false);
  const [mixCrops, setMixCrops] = useState<{ cropId: string; percentage: number }[]>([
    { cropId: '', percentage: 50 },
    { cropId: '', percentage: 50 },
  ]);
  const [isTest, setIsTest] = useState(false);
  const [notes, setNotes] = useState('');

  // Date range
  const today = new Date().toISOString().split('T')[0];
  const defaultEndDate = addDays(new Date(), 60).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const formatGrams = (g: number) => Math.round(g * 10) / 10;

  // ===================== DERIVED — FORM =====================

  const selectedCrop = useMemo(() => crops.find(c => c.id === selectedCropId), [crops, selectedCropId]);
  const filteredCrops = useMemo(() => {
    if (selectedCategory === 'all') return crops;
    return crops.filter(c => c.category === selectedCategory);
  }, [crops, selectedCategory]);

  const dbSeedDensity = useMemo(() => {
    if (!selectedCrop?.tray_configs) return 0;
    const config = selectedCrop.tray_configs[selectedTraySize];
    return config?.seed_density_grams || config?.seed_density || 0;
  }, [selectedCrop, selectedTraySize]);

  const mixedSeedDensity = useMemo(() => {
    if (!isMixedPlanting || !selectedTraySize) return 0;
    let total = 0;
    mixCrops.forEach(mc => {
      if (!mc.cropId) return;
      const crop = crops.find(c => c.id === mc.cropId);
      if (!crop?.tray_configs?.[selectedTraySize]) return;
      const fullDensity = crop.tray_configs[selectedTraySize].seed_density_grams || crop.tray_configs[selectedTraySize].seed_density || 0;
      total += fullDensity * (mc.percentage / 100);
    });
    return total;
  }, [isMixedPlanting, mixCrops, selectedTraySize, crops]);

  const seedDensity = isMixedPlanting ? mixedSeedDensity : (useCustomDensity ? customSeedDensity : dbSeedDensity);
  const totalSeedGrams = trayCount * seedDensity;

  const resetForm = () => {
    setSelectedCategory('all');
    setSelectedCropId('');
    setSowDate('');
    setHarvestDate('');
    setSelectedTraySize('XL');
    setTrayCount(0);
    setUseCustomDensity(false);
    setCustomSeedDensity(0);
    setIsMixedPlanting(false);
    setMixCrops([
      { cropId: '', percentage: 50 },
      { cropId: '', percentage: 50 },
    ]);
    setIsTest(false);
    setNotes('');
  };

  const handleCropSelect = (cropId: string) => {
    setSelectedCropId(cropId);
    setUseCustomDensity(false);
    setCustomSeedDensity(0);
  };

  // ===================== FETCH FUNCTIONS =====================

  const fetchCrops = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, days_to_harvest, days_in_darkness, days_on_light, tray_configs, color, category, reserved_percentage')
        .order('name');
      if (error) throw error;
      setCrops(data || []);
    } catch (error) {
      console.error('Error fetching crops:', error);
    }
  }, []);

  const fetchShelves = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('shelf_config')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setShelves(data || []);
    } catch (error) {
      console.error('Error fetching shelves:', error);
    }
  }, []);

  const fetchHarvestDays = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('harvest_days_config')
        .select('*')
        .eq('is_active', true)
        .order('day_of_week');
      if (error) throw error;
      setHarvestDays(data || []);
    } catch (error) {
      console.error('Error fetching harvest days:', error);
    }
  }, []);

  const fetchFutureOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, customer_name, delivery_date, status,
          order_items (
            crop_id, quantity, packaging_size,
            crops:crop_id ( id, name, days_to_harvest, days_in_darkness, days_on_light, tray_configs, reserved_percentage, color, category )
          )
        `)
        .gte('delivery_date', today)
        .in('status', ['growing', 'packed', 'on_the_way', 'pending', 'pending_approval', 'confirmed', 'cakajuca', 'potvrdena', 'pripravena']);
      if (error) throw error;
      setFutureOrders((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching future orders:', error);
    }
  }, [today]);

  const fetchHistoricalOrders = useCallback(async () => {
    try {
      const ninetyDaysAgo = subDays(new Date(), 90).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, customer_name, delivery_date, status,
          order_items (
            crop_id, quantity, packaging_size,
            crops:crop_id ( id, name, days_to_harvest, days_in_darkness, days_on_light )
          )
        `)
        .gte('delivery_date', ninetyDaysAgo)
        .lte('delivery_date', today)
        .in('status', ['growing', 'packed', 'on_the_way', 'delivered', 'completed', 'dorucena']);
      if (error) throw error;
      setHistoricalOrders((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching historical orders:', error);
    }
  }, [today]);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const { data: plansData, error } = await supabase
        .from('planting_plans')
        .select(`
          *,
          crops:crop_id(id, name, color, days_to_harvest, days_in_darkness, days_on_light, tray_configs)
        `)
        .gte('expected_harvest_date', startDate)
        .lte('expected_harvest_date', endDate)
        .order('sow_date');

      if (error) throw error;

      const plansWithConfig = (plansData || []).map((plan) => {
        let trayConfig: TrayConfig | null = null;
        if (plan.crops?.tray_configs) {
          const configs = plan.crops.tray_configs;
          if (configs[plan.tray_size]) {
            const sizeConfig = configs[plan.tray_size];
            trayConfig = {
              seed_density_grams: sizeConfig.seed_density_grams || sizeConfig.seed_density || 0,
              yield_grams: sizeConfig.yield_grams || sizeConfig.expected_yield || 0,
            };
          }
        }
        return {
          ...plan,
          tray_config: trayConfig || {
            seed_density_grams: plan.seed_amount_grams || 0,
            yield_grams: 0,
          },
        };
      });

      setPlans(plansWithConfig);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať plány sadenia.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, toast]);

  // ===================== GROUPING =====================

  const groupedPlans = useMemo<GroupedPlantingPlan[]>(() => {
    const grouped = new Map<string, GroupedPlantingPlan>();
    plans.forEach(plan => {
      const key = `${plan.crop_id}_${plan.sow_date}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: plan.id,
          crop_id: plan.crop_id,
          sow_date: plan.sow_date,
          expected_harvest_date: plan.expected_harvest_date,
          status: plan.status,
          completed_at: plan.completed_at,
          crops: plan.crops,
          trays: [],
          source_orders: plan.source_orders,
          total_seed_grams: 0,
          is_manual: false,
          actual_yield_grams: null,
        });
      }
      const group = grouped.get(key)!;
      group.trays.push({
        size: plan.tray_size,
        count: plan.tray_count,
        seeds_per_tray: plan.seed_amount_grams,
        total_seeds: plan.total_seed_grams,
        plan_id: plan.id,
        is_manual: plan.is_manual === true,
      });
      group.total_seed_grams += plan.total_seed_grams;
      if (plan.is_manual) group.is_manual = true;
      if (plan.actual_yield_grams != null) {
        group.actual_yield_grams = (group.actual_yield_grams || 0) + plan.actual_yield_grams;
      }
      if (plan.source_orders && plan.source_orders.length > 0) {
        const existing = group.source_orders || [];
        group.source_orders = [...new Set([...existing, ...plan.source_orders])];
      }
    });
    return Array.from(grouped.values());
  }, [plans]);

  const filteredPlans = useMemo(() => {
    if (statusFilter === 'all') return groupedPlans;
    return groupedPlans.filter(p => p.status === statusFilter);
  }, [groupedPlans, statusFilter]);

  const statusCounts = useMemo(() => ({
    all: groupedPlans.length,
    planned: groupedPlans.filter(p => p.status === 'planned').length,
    in_progress: groupedPlans.filter(p => p.status === 'in_progress').length,
    completed: groupedPlans.filter(p => p.status === 'completed').length,
  }), [groupedPlans]);

  const plansByDate = useMemo(() => {
    const grouped: Record<string, GroupedPlantingPlan[]> = {};
    filteredPlans.forEach(plan => {
      if (!grouped[plan.sow_date]) grouped[plan.sow_date] = [];
      grouped[plan.sow_date].push(plan);
    });
    return grouped;
  }, [filteredPlans]);

  const sortedDates = useMemo(() => Object.keys(plansByDate).sort(), [plansByDate]);

  // ===================== TODAY'S SOWING WIDGET =====================

  const todaysSowing = useMemo<TodaysSowingItem[]>(() => {
    const todayPlans = groupedPlans.filter(p => p.sow_date === today && p.status !== 'cancelled');
    return todayPlans.map(p => ({
      cropId: p.crop_id,
      cropName: p.crops?.name || 'Neznáma',
      cropColor: p.crops?.color || '#16a34a',
      cropDarkness: p.crops?.days_in_darkness || 2,
      cropLight: p.crops?.days_on_light || 5,
      trays: p.trays,
      totalGrams: p.total_seed_grams,
      harvestDate: p.expected_harvest_date || '',
      isManual: !!p.is_manual,
      planIds: p.trays.map(t => t.plan_id).filter(Boolean) as string[],
    }));
  }, [groupedPlans, today]);

  // ===================== DYNAMIC HORIZON =====================

  const planningHorizonDays = useMemo(() => {
    const activeCropDays = crops
      .filter(c => c.days_to_harvest && c.days_to_harvest > 0)
      .map(c => c.days_to_harvest);
    const maxDays = activeCropDays.length > 0 ? Math.max(...activeCropDays) : 30;
    return Math.max(maxDays, 30);
  }, [crops]);

  const dynamicDayPlans = useMemo<DayPlan[]>(() => {
    const days: DayPlan[] = [];
    const todayDate = startOfDay(new Date());
    for (let i = 0; i < planningHorizonDays; i++) {
      const date = addDays(todayDate, i);
      const dateStr = date.toISOString().split('T')[0];
      const items: TodaysSowingItem[] = groupedPlans
        .filter(p => p.sow_date === dateStr && p.status !== 'cancelled')
        .map(p => ({
          cropId: p.crop_id,
          cropName: p.crops?.name || 'Neznáma',
          cropColor: p.crops?.color || '#16a34a',
          cropDarkness: p.crops?.days_in_darkness || 2,
          cropLight: p.crops?.days_on_light || 5,
          trays: p.trays,
          totalGrams: p.total_seed_grams,
          harvestDate: p.expected_harvest_date || '',
          isManual: !!p.is_manual,
          planIds: p.trays.map(t => t.plan_id).filter(Boolean) as string[],
        }));
      days.push({ date: dateStr, items });
    }
    return days;
  }, [planningHorizonDays, groupedPlans]);

  const filteredDayPlans = useMemo(() => {
    if (!onlySowDays) return dynamicDayPlans;
    return dynamicDayPlans.filter(d => d.items.length > 0);
  }, [dynamicDayPlans, onlySowDays]);

  // ===================== CAPACITY =====================

  const capacityTotals = useMemo(() => {
    let dark = 0;
    let light = 0;
    shelves.forEach(s => {
      const capacity = s.shelves * s.positions_per_shelf;
      if (s.zone === 'dark') dark += capacity;
      else if (s.zone === 'light') light += capacity;
    });
    return { darkTotal: dark, lightTotal: light };
  }, [shelves]);

  const capacityForDay = useCallback((dateStr: string): CapacityInfo => {
    const date = parseISO(dateStr);
    let darkUsed = 0;
    let lightUsed = 0;
    groupedPlans.forEach(p => {
      if (p.status === 'cancelled' || p.status === 'completed') return;
      const sow = parseISO(p.sow_date);
      const darkDays = p.crops?.days_in_darkness ?? 2;
      const totalDays = p.crops?.days_to_harvest ?? 10;
      const darkEnd = addDays(sow, darkDays);
      const harvest = addDays(sow, totalDays);
      const positions = calcPositions(p.trays);
      if (date >= sow && date < darkEnd) darkUsed += positions;
      else if (date >= darkEnd && date <= harvest) lightUsed += positions;
    });
    return {
      darkUsed: Math.round(darkUsed * 10) / 10,
      darkTotal: capacityTotals.darkTotal,
      lightUsed: Math.round(lightUsed * 10) / 10,
      lightTotal: capacityTotals.lightTotal,
    };
  }, [groupedPlans, capacityTotals]);

  const todayCapacity = useMemo(() => capacityForDay(today), [capacityForDay, today]);

  // ===================== LATE ORDERS =====================

  const lateOrders = useMemo<LateOrderInfo[]>(() => {
    const result: LateOrderInfo[] = [];
    const todayDate = startOfDay(new Date());
    futureOrders.forEach(order => {
      const deliveryDate = parseISO(order.delivery_date);
      const daysAvailable = differenceInDays(deliveryDate, todayDate);
      order.order_items?.forEach((item: any) => {
        if (!item.crops || !item.crop_id) return;
        const daysToHarvest = item.crops.days_to_harvest || 0;
        if (daysToHarvest > 0 && daysAvailable < daysToHarvest && daysAvailable >= 0) {
          const grams = parseFloat(item.packaging_size?.replace(/[^0-9.]/g, '') || '0') * (item.quantity || 0);
          result.push({
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: order.customer_name || 'Neznámy',
            cropName: item.crops.name || 'Neznáma',
            cropId: item.crop_id,
            deliveryDate: order.delivery_date,
            daysToHarvest,
            daysAvailable,
            quantityGrams: grams,
          });
        }
      });
    });
    return result;
  }, [futureOrders]);

  // ===================== ABC ANALYSIS + PREDICTION =====================

  const abcAndPrediction = useMemo<PredictionRow[]>(() => {
    if (historicalOrders.length === 0 || crops.length === 0) return [];

    // 1) Spočítaj revenue/grams za 90 dní pre každú plodinu
    const cropRevenue: Record<string, number> = {};
    const cropHistoryByDay: Record<string, Record<string, number>> = {}; // cropId -> dateStr -> grams

    historicalOrders.forEach(order => {
      order.order_items?.forEach((item: any) => {
        if (!item.crop_id) return;
        const grams = parseFloat(item.packaging_size?.replace(/[^0-9.]/g, '') || '0') * (item.quantity || 0);
        if (grams <= 0) return;
        cropRevenue[item.crop_id] = (cropRevenue[item.crop_id] || 0) + grams;
        if (!cropHistoryByDay[item.crop_id]) cropHistoryByDay[item.crop_id] = {};
        const d = order.delivery_date;
        cropHistoryByDay[item.crop_id][d] = (cropHistoryByDay[item.crop_id][d] || 0) + grams;
      });
    });

    // 2) ABC — top 20% A, ďalších 30% B, zvyšok C podľa revenue
    const sortedCrops = Object.entries(cropRevenue)
      .sort(([, a], [, b]) => b - a);
    const totalCrops = sortedCrops.length;
    const aCount = Math.max(1, Math.floor(totalCrops * 0.2));
    const bCount = Math.max(1, Math.floor(totalCrops * 0.3));
    const abcMap: Record<string, 'A' | 'B' | 'C'> = {};
    sortedCrops.forEach(([id], idx) => {
      if (idx < aCount) abcMap[id] = 'A';
      else if (idx < aCount + bCount) abcMap[id] = 'B';
      else abcMap[id] = 'C';
    });

    // 3) Current orders — pre každú plodinu spočítaj objednané gramy za najbližšie 3 dni zberu
    const currentOrdersByCropAndDay: Record<string, Record<number, number>> = {};
    futureOrders.forEach(order => {
      const dDate = parseISO(order.delivery_date);
      const dow = dDate.getDay();
      order.order_items?.forEach((item: any) => {
        if (!item.crop_id) return;
        const grams = parseFloat(item.packaging_size?.replace(/[^0-9.]/g, '') || '0') * (item.quantity || 0);
        if (grams <= 0) return;
        if (!currentOrdersByCropAndDay[item.crop_id]) currentOrdersByCropAndDay[item.crop_id] = {};
        currentOrdersByCropAndDay[item.crop_id][dow] = (currentOrdersByCropAndDay[item.crop_id][dow] || 0) + grams;
      });
    });

    // 4) Pre každú plodinu — kĺzavý priemer za posledné 3 týždne pre každý aktívny deň zberu
    const result: PredictionRow[] = [];
    const activeDows = harvestDays.map(h => h.day_of_week);

    Object.keys(cropRevenue).forEach(cropId => {
      const crop = crops.find(c => c.id === cropId);
      if (!crop) return;
      const history = cropHistoryByDay[cropId] || {};

      // Pre každý aktívny deň zberu spočítaj priemery 3 posledných týždňov
      let totalPredicted = 0;
      let totalOrdered = 0;
      let weeksWithData = 0;
      let totalChecks = 0;

      activeDows.forEach(dow => {
        // Posledné 3 dátumy s daným dow
        const dates: string[] = [];
        for (let i = 1; i <= 21 && dates.length < 3; i++) {
          const d = subDays(new Date(), i);
          if (d.getDay() === dow) dates.push(d.toISOString().split('T')[0]);
        }
        const grams = dates.map(d => history[d] || 0);
        const presentWeeks = grams.filter(g => g > 0).length;
        const avg = grams.length > 0 ? grams.reduce((a, b) => a + b, 0) / grams.length : 0;
        totalPredicted += avg;
        totalOrdered += currentOrdersByCropAndDay[cropId]?.[dow] || 0;
        weeksWithData += presentWeeks;
        totalChecks += dates.length;
      });

      // Confidence — % týždňov s objednávkou
      const confidence = totalChecks > 0 ? Math.round((weeksWithData / totalChecks) * 100) : 0;

      // Recommendation
      let recommendation = 'OK';
      const diff = totalPredicted - totalOrdered;
      if (totalOrdered === 0 && totalPredicted === 0) {
        recommendation = '—';
      } else if (diff > 80) {
        recommendation = `+1 tácka L`;
      } else if (diff > 40) {
        recommendation = `+1 tácka M`;
      } else if (diff < -50) {
        recommendation = 'Stačí menej';
      } else if (confidence < 50) {
        recommendation = 'Málo dát';
      } else if (confidence < 70) {
        recommendation = 'Zvážiť +M';
      }

      result.push({
        cropId,
        cropName: crop.name,
        abc: abcMap[cropId] || 'C',
        orderedGrams: Math.round(totalOrdered),
        predictedGrams: Math.round(totalPredicted),
        confidence,
        recommendation,
      });
    });

    return result.sort((a, b) => {
      const abcOrder = { A: 0, B: 1, C: 2 };
      if (abcOrder[a.abc] !== abcOrder[b.abc]) return abcOrder[a.abc] - abcOrder[b.abc];
      return b.predictedGrams - a.predictedGrams;
    });
  }, [historicalOrders, futureOrders, crops, harvestDays]);

  const abcMap = useMemo(() => {
    const map: Record<string, 'A' | 'B' | 'C'> = {};
    abcAndPrediction.forEach(p => { map[p.cropId] = p.abc; });
    return map;
  }, [abcAndPrediction]);

  // ===================== YIELD ANALYSIS =====================

  const yieldAnalysis = useMemo(() => {
    const byCrop: Record<string, { planned: number; actual: number; cropName: string }> = {};
    plans.forEach(p => {
      if (p.status !== 'completed' || p.actual_yield_grams == null) return;
      const cropId = p.crop_id;
      if (!byCrop[cropId]) {
        byCrop[cropId] = { planned: 0, actual: 0, cropName: p.crops?.name || 'Neznáma' };
      }
      const planned = (p.tray_config?.yield_grams || 0) * p.tray_count;
      byCrop[cropId].planned += planned;
      byCrop[cropId].actual += p.actual_yield_grams || 0;
    });
    return Object.entries(byCrop).map(([cropId, data]) => ({
      cropId,
      cropName: data.cropName,
      planned: Math.round(data.planned),
      actual: Math.round(data.actual),
      efficiency: data.planned > 0 ? Math.round((data.actual / data.planned) * 100) : 0,
    })).sort((a, b) => b.efficiency - a.efficiency);
  }, [plans]);


  // ===================== GENERATE / OPTIMIZE / CRUD =====================

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, delivery_date, status,
          order_items (
            crop_id, quantity, packaging_size,
            crops:crop_id ( id, name, days_to_harvest, tray_configs, reserved_percentage )
          )
        `)
        .gte('delivery_date', startDate)
        .lte('delivery_date', endDate)
        .in('status', ['growing', 'packed', 'on_the_way', 'pending', 'pending_approval', 'confirmed', 'cakajuca', 'potvrdena', 'pripravena']);

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        toast({
          title: 'Žiadne objednávky',
          description: 'V danom období neboli nájdené žiadne aktívne objednávky.',
        });
        return;
      }

      const grouped = groupOrdersByCropAndHarvestDate(orders);
      if (grouped.length === 0) {
        toast({
          title: 'Žiadne položky',
          description: 'Objednávky neobsahujú žiadne plodiny na sadenie.',
        });
        return;
      }

      let createdCount = 0;
      for (const g of grouped) {
        const created = await createPlantingTasksForGroup(g);
        createdCount += created;
      }

      toast({
        title: 'Plán vygenerovaný',
        description: `Vytvorených ${createdCount} výsevov.`,
      });
      await fetchPlans();
      await fetchFutureOrders();
    } catch (err) {
      console.error('Generate plan error:', err);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa vygenerovať plán sadenia.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  function groupOrdersByCropAndHarvestDate(orders: any[]) {
    const groups = new Map<string, {
      crop: any;
      harvestDate: string;
      totalRequired: number;
      orderIds: string[];
    }>();

    orders.forEach(order => {
      const harvestDate = getHarvestDateForDelivery(order.delivery_date);
      order.order_items?.forEach((item: any) => {
        if (!item.crop_id || !item.crops) return;
        const key = `${item.crop_id}_${harvestDate}`;
        if (!groups.has(key)) {
          groups.set(key, {
            crop: item.crops,
            harvestDate,
            totalRequired: 0,
            orderIds: [],
          });
        }
        const g = groups.get(key)!;
        const grams = parseFloat(item.packaging_size?.replace(/[^0-9.]/g, '') || '0');
        g.totalRequired += grams * (item.quantity || 0);
        if (!g.orderIds.includes(order.id)) g.orderIds.push(order.id);
      });
    });

    return Array.from(groups.values());
  }

  async function createPlantingTasksForGroup(group: {
    crop: any;
    harvestDate: string;
    totalRequired: number;
    orderIds: string[];
  }) {
    const { crop, harvestDate, totalRequired, orderIds } = group;
    const plantingDate = new Date(harvestDate);
    plantingDate.setDate(plantingDate.getDate() - (crop.days_to_harvest || 10));
    const plantingDateStr = plantingDate.toISOString().split('T')[0];

    const reservePercent = crop.reserved_percentage || 5;
    const reserve = reservePercent / 100;
    const withReserve = totalRequired * (1 + reserve);

    // Vymaž len AUTO-generované plány pre túto kombináciu, neher sa manuálnych
    const { error: deleteError } = await supabase
      .from('planting_plans')
      .delete()
      .eq('crop_id', crop.id)
      .eq('expected_harvest_date', harvestDate)
      .not('source_orders', 'is', null)
      .eq('is_manual', false);

    if (deleteError) console.error('Chyba pri mazaní:', deleteError);

    const trayConfig = optimizeTrayConfiguration(crop, withReserve);

    let created = 0;
    for (const tray of trayConfig) {
      const { error: insertError } = await supabase.from('planting_plans').insert({
        crop_id: crop.id,
        sow_date: plantingDateStr,
        expected_harvest_date: harvestDate,
        tray_size: tray.size,
        tray_count: tray.count,
        seed_amount_grams: tray.seedsPerTray,
        total_seed_grams: tray.seedsPerTray * tray.count,
        status: 'planned',
        source_orders: orderIds,
        is_manual: false,
        notes: `Auto z objednávok (${Math.round(totalRequired)}g požadovaných, výnos ${Math.round(tray.yieldPerTray * tray.count)}g)`,
      });
      if (!insertError) created++;
      else console.error(`Chyba pri vytváraní plánu ${tray.size}:`, insertError);
    }
    return created;
  }

  function optimizeTrayConfiguration(crop: any, requiredYield: number) {
    const trayConfigs = crop.tray_configs || {};
    const sizes = [
      { name: 'XL', seeds: trayConfigs.XL?.seed_density_grams || trayConfigs.XL?.seed_density || 0, yield: trayConfigs.XL?.yield_grams || trayConfigs.XL?.expected_yield || 0 },
      { name: 'L', seeds: trayConfigs.L?.seed_density_grams || trayConfigs.L?.seed_density || 0, yield: trayConfigs.L?.yield_grams || trayConfigs.L?.expected_yield || 0 },
      { name: 'M', seeds: trayConfigs.M?.seed_density_grams || trayConfigs.M?.seed_density || 0, yield: trayConfigs.M?.yield_grams || trayConfigs.M?.expected_yield || 0 },
      { name: 'S', seeds: trayConfigs.S?.seed_density_grams || trayConfigs.S?.seed_density || 0, yield: trayConfigs.S?.yield_grams || trayConfigs.S?.expected_yield || 0 },
    ].filter(s => s.seeds > 0 && s.yield > 0);

    if (sizes.length === 0) return [];

    const result: Array<{ size: string; count: number; seedsPerTray: number; yieldPerTray: number }> = [];
    let remaining = requiredYield;

    if (remaining <= sizes[0].yield) {
      const perfect = sizes.find(s => s.yield >= remaining);
      if (perfect) {
        result.push({ size: perfect.name, count: 1, seedsPerTray: perfect.seeds, yieldPerTray: perfect.yield });
        return result;
      }
    }

    const xl = sizes.find(s => s.name === 'XL');
    if (xl && xl.yield > 0) {
      const xlCount = Math.floor(remaining / xl.yield);
      if (xlCount > 0) {
        result.push({ size: 'XL', count: xlCount, seedsPerTray: xl.seeds, yieldPerTray: xl.yield });
        remaining -= xlCount * xl.yield;
      }
    }

    if (remaining > 0) {
      const others = sizes.filter(s => s.name !== 'XL');
      let selected = null;
      for (const s of others) {
        if (s.yield >= remaining) { selected = s; break; }
      }
      if (!selected && others.length > 0) selected = others[0];
      if (selected) {
        result.push({ size: selected.name, count: 1, seedsPerTray: selected.seeds, yieldPerTray: selected.yield });
      }
    }
    return result;
  }

  const handleMarkComplete = async (planId: string, cropId?: string, sowDate?: string) => {
    // Otvor yield dialog pred dokončením
    const plan = groupedPlans.find(p => (cropId && sowDate ? (p.crop_id === cropId && p.sow_date === sowDate) : p.id === planId));
    if (plan) {
      setYieldDialog({ open: true, plan });
      setActualYield(0);
      return;
    }
    // Fallback bez yield dialógu
    await markCompleteDirect(planId, cropId, sowDate, null);
  };

  const markCompleteDirect = async (planId: string, cropId?: string, sowDate?: string, yieldGrams?: number | null) => {
    try {
      const update: any = { status: 'completed', completed_at: new Date().toISOString() };
      // actual_yield_grams nemôžeme cez group update rovnomerne — uložíme len ak je len jeden plán
      if (cropId && sowDate) {
        const { error } = await supabase
          .from('planting_plans')
          .update(update)
          .eq('crop_id', cropId)
          .eq('sow_date', sowDate);
        if (error) throw error;

        // Ak je zadaný yield, rozdeľ ho proporčne podľa plánovaného výnosu
        if (yieldGrams != null && yieldGrams > 0) {
          const plan = groupedPlans.find(p => p.crop_id === cropId && p.sow_date === sowDate);
          if (plan) {
            const totalPlanned = plan.trays.reduce((sum, t) => {
              const cfg = plan.crops?.tray_configs?.[t.size];
              const y = (cfg?.yield_grams || cfg?.expected_yield || 0) * t.count;
              return sum + y;
            }, 0);
            for (const t of plan.trays) {
              if (!t.plan_id) continue;
              const cfg = plan.crops?.tray_configs?.[t.size];
              const trayPlanned = (cfg?.yield_grams || cfg?.expected_yield || 0) * t.count;
              const share = totalPlanned > 0 ? trayPlanned / totalPlanned : (1 / plan.trays.length);
              await supabase
                .from('planting_plans')
                .update({ actual_yield_grams: Math.round(yieldGrams * share) })
                .eq('id', t.plan_id);
            }
          }
        }
      } else {
        const payload: any = { ...update };
        if (yieldGrams != null && yieldGrams > 0) payload.actual_yield_grams = yieldGrams;
        const { error } = await supabase
          .from('planting_plans')
          .update(payload)
          .eq('id', planId);
        if (error) throw error;
      }

      toast({ title: 'Výsev dokončený', description: 'Plán bol označený ako hotový.' });
      setIsDetailDialogOpen(false);
      setYieldDialog({ open: false, plan: null });
      await fetchPlans();
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa označiť plán.', variant: 'destructive' });
    }
  };

  const handleMarkPlanned = async (planId: string, cropId?: string, sowDate?: string) => {
    try {
      const update: any = { status: 'planned', completed_at: null, actual_yield_grams: null };
      if (cropId && sowDate) {
        const { error } = await supabase
          .from('planting_plans')
          .update(update)
          .eq('crop_id', cropId)
          .eq('sow_date', sowDate);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('planting_plans')
          .update(update)
          .eq('id', planId);
        if (error) throw error;
      }
      toast({ title: 'Plán obnovený', description: 'Plán bol vrátený do plánovaných.' });
      setIsDetailDialogOpen(false);
      await fetchPlans();
    } catch (error) {
      console.error('Error marking planned:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa vrátiť plán.', variant: 'destructive' });
    }
  };

  const openDetailDialog = (plan: GroupedPlantingPlan | PlantingPlan) => {
    setSelectedPlan(plan);
    setIsDetailDialogOpen(true);
  };

  const openEditDialog = async (plan: PlantingPlan | GroupedPlantingPlan) => {
    const isGrouped = (plan as GroupedPlantingPlan).trays && (plan as GroupedPlantingPlan).trays.length > 1;
    if (isGrouped) {
      setGroupedEditDialog({ open: true, plan: plan as GroupedPlantingPlan });
      setIsDetailDialogOpen(false);
      return;
    }

    let actualPlan: PlantingPlan;
    if ((plan as GroupedPlantingPlan).trays) {
      const { data: firstPlan, error } = await supabase
        .from('planting_plans')
        .select('*')
        .eq('crop_id', plan.crop_id)
        .eq('sow_date', plan.sow_date)
        .limit(1)
        .single();
      if (error || !firstPlan) {
        toast({ title: 'Chyba', description: 'Nepodarilo sa načítať plán.', variant: 'destructive' });
        return;
      }
      actualPlan = firstPlan as PlantingPlan;
    } else {
      actualPlan = plan as PlantingPlan;
    }

    setEditingPlan(actualPlan);

    if ((actualPlan as any).is_mixed && (actualPlan as any).mix_configuration) {
      setIsMixedPlanting(true);
      try {
        const mixConfig = typeof (actualPlan as any).mix_configuration === 'string'
          ? JSON.parse((actualPlan as any).mix_configuration)
          : (actualPlan as any).mix_configuration;
        setMixCrops(mixConfig.map((item: any) => ({ cropId: item.crop_id, percentage: item.percentage })));
        if (mixConfig.length > 0) {
          const firstCrop = crops.find(c => c.id === mixConfig[0].crop_id);
          setSelectedCategory(firstCrop?.category || 'all');
        }
      } catch (e) {
        console.error('Mix parse error:', e);
        setMixCrops([{ cropId: '', percentage: 50 }, { cropId: '', percentage: 50 }]);
      }
      setSelectedCropId('');
    } else {
      setIsMixedPlanting(false);
      setMixCrops([{ cropId: '', percentage: 50 }, { cropId: '', percentage: 50 }]);
      const crop = crops.find(c => c.id === actualPlan.crop_id);
      setSelectedCategory(crop?.category || 'all');
      setSelectedCropId(actualPlan.crop_id);
      if (crop?.tray_configs) {
        const dbDensity = crop.tray_configs[actualPlan.tray_size]?.seed_density_grams ||
                          crop.tray_configs[actualPlan.tray_size]?.seed_density || 0;
        if (actualPlan.seed_amount_grams !== dbDensity) {
          setUseCustomDensity(true);
          setCustomSeedDensity(actualPlan.seed_amount_grams);
        } else {
          setUseCustomDensity(false);
          setCustomSeedDensity(0);
        }
      }
    }

    setSowDate(actualPlan.sow_date);
    setSelectedTraySize(actualPlan.tray_size);
    setTrayCount(actualPlan.tray_count);
    setIsTest((actualPlan as any).is_test || false);
    setNotes((actualPlan as any).notes || '');
    setIsDetailDialogOpen(false);
    setNewPlantingDialog(true);
  };

  const handleEditSpecificTray = async (plan: GroupedPlantingPlan, traySize: string) => {
    const { data: dbPlan, error } = await supabase
      .from('planting_plans')
      .select('*')
      .eq('crop_id', plan.crop_id)
      .eq('sow_date', plan.sow_date)
      .eq('tray_size', traySize)
      .maybeSingle();
    if (error || !dbPlan) {
      toast({ title: 'Chyba', description: 'Nepodarilo sa načítať plán.', variant: 'destructive' });
      return;
    }
    setGroupedEditDialog({ open: false, plan: null });
    setEditingPlan(dbPlan as PlantingPlan);

    if ((dbPlan as any).is_mixed && (dbPlan as any).mix_configuration) {
      setIsMixedPlanting(true);
      try {
        const mc = typeof (dbPlan as any).mix_configuration === 'string'
          ? JSON.parse((dbPlan as any).mix_configuration)
          : (dbPlan as any).mix_configuration;
        setMixCrops(mc.map((item: any) => ({ cropId: item.crop_id, percentage: item.percentage })));
        if (mc.length > 0) {
          const firstCrop = crops.find(c => c.id === mc[0].crop_id);
          setSelectedCategory(firstCrop?.category || 'all');
        }
      } catch (e) {
        setMixCrops([{ cropId: '', percentage: 50 }, { cropId: '', percentage: 50 }]);
      }
      setSelectedCropId('');
    } else {
      setIsMixedPlanting(false);
      setMixCrops([{ cropId: '', percentage: 50 }, { cropId: '', percentage: 50 }]);
      const crop = crops.find(c => c.id === dbPlan.crop_id);
      setSelectedCategory(crop?.category || 'all');
      setSelectedCropId(dbPlan.crop_id);
      if (crop?.tray_configs) {
        const dbDensity = crop.tray_configs[dbPlan.tray_size]?.seed_density_grams ||
                          crop.tray_configs[dbPlan.tray_size]?.seed_density || 0;
        if (dbPlan.seed_amount_grams !== dbDensity) {
          setUseCustomDensity(true);
          setCustomSeedDensity(dbPlan.seed_amount_grams);
        } else {
          setUseCustomDensity(false);
          setCustomSeedDensity(0);
        }
      }
    }

    setSowDate(dbPlan.sow_date);
    setSelectedTraySize(dbPlan.tray_size);
    setTrayCount(dbPlan.tray_count);
    setIsTest((dbPlan as any).is_test || false);
    setNotes((dbPlan as any).notes || '');
    setNewPlantingDialog(true);
  };

  const handleCreatePlanting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const isEdit = !!editingPlan;

    if (isMixedPlanting) {
      const total = mixCrops.reduce((sum, c) => sum + c.percentage, 0);
      if (total !== 100) {
        toast({ title: 'Chyba validácie', description: 'Súčet percent musí byť 100%', variant: 'destructive' });
        setSaving(false);
        return;
      }
      if (mixCrops.some(c => !c.cropId)) {
        toast({ title: 'Chyba validácie', description: 'Vyberte všetky plodiny', variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    try {
      const dataToSave: any = {
        crop_id: isMixedPlanting ? null : selectedCropId,
        sow_date: sowDate,
        expected_harvest_date: harvestDate || null,
        tray_size: selectedTraySize,
        tray_count: trayCount,
        seed_amount_grams: seedDensity,
        total_seed_grams: totalSeedGrams,
        status: 'planned',
        is_mixed: isMixedPlanting,
        mix_configuration: isMixedPlanting ? mixCrops.map(mc => ({
          crop_id: mc.cropId,
          crop_name: crops.find(c => c.id === mc.cropId)?.name,
          percentage: mc.percentage,
        })) : null,
        is_test: isTest,
        is_manual: true, // manuálne vytvorené alebo editované
        notes: notes.trim() || null,
      };

      let error;
      if (isEdit) {
        const r = await supabase.from('planting_plans').update(dataToSave).eq('id', editingPlan!.id);
        error = r.error;
      } else {
        const r = await supabase.from('planting_plans').insert(dataToSave);
        error = r.error;
      }

      if (error) {
        console.error('Save error:', error);
        toast({ title: 'Chyba pri ukladaní', description: error.message || 'Neznáma chyba', variant: 'destructive' });
        setSaving(false);
        return;
      }

      toast({
        title: isEdit ? 'Uložené' : 'Výsev vytvorený',
        description: isEdit ? 'Plán bol aktualizovaný.' : 'Plán bol vytvorený.',
      });
      setNewPlantingDialog(false);
      setEditingPlan(null);
      resetForm();
      await fetchPlans();
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa uložiť.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('planting_plans').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Vymazané', description: 'Plán bol vymazaný.' });
      setDeleteId(null);
      await fetchPlans();
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa vymazať.', variant: 'destructive' });
    }
  };

  const handleAddTray = async () => {
    if (!addTrayDialog.plan) return;
    const plan = addTrayDialog.plan;
    const crop = crops.find(c => c.id === plan.crop_id);
    if (!crop) {
      toast({ title: 'Chyba', description: 'Plodina nenájdená.', variant: 'destructive' });
      return;
    }
    const cfg = crop.tray_configs?.[addTraySize];
    const seedDens = cfg?.seed_density_grams || cfg?.seed_density || 0;
    try {
      const { error } = await supabase.from('planting_plans').insert({
        crop_id: plan.crop_id,
        sow_date: plan.sow_date,
        expected_harvest_date: plan.expected_harvest_date,
        tray_size: addTraySize,
        tray_count: addTrayCount,
        seed_amount_grams: seedDens,
        total_seed_grams: seedDens * addTrayCount,
        status: 'planned',
        is_manual: true,
        notes: addTrayNote.trim() || null,
      });
      if (error) throw error;
      toast({ title: 'Tácka pridaná', description: `Pridaných ${addTrayCount}×${addTraySize}.` });
      setAddTrayDialog({ open: false, plan: null });
      setAddTraySize('M');
      setAddTrayCount(1);
      setAddTrayNote('');
      await fetchPlans();
    } catch (error) {
      console.error('Add tray error:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa pridať tácku.', variant: 'destructive' });
    }
  };

  const handleRemoveTray = async (planId: string) => {
    try {
      const { error } = await supabase.from('planting_plans').delete().eq('id', planId);
      if (error) throw error;
      toast({ title: 'Tácka odstránená' });
      await fetchPlans();
    } catch (error) {
      console.error('Remove tray error:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa odstrániť.', variant: 'destructive' });
    }
  };

  // ===================== EFFECTS =====================

  useEffect(() => {
    fetchPlans();
    fetchCrops();
    fetchShelves();
    fetchHarvestDays();
    fetchFutureOrders();
  }, [fetchPlans, fetchCrops, fetchShelves, fetchHarvestDays, fetchFutureOrders]);

  // Predikcia — lazy load len keď user otvorí tab
  useEffect(() => {
    if ((activeTab === 'prediction' || activeTab === 'analysis') && historicalOrders.length === 0 && !loadingPrediction) {
      setLoadingPrediction(true);
      fetchHistoricalOrders().finally(() => setLoadingPrediction(false));
    }
  }, [activeTab, historicalOrders.length, loadingPrediction, fetchHistoricalOrders]);

  useEffect(() => {
    if (!sowDate) {
      setHarvestDate('');
      return;
    }
    if (isMixedPlanting && mixCrops.length > 0) {
      const maxGrowth = mixCrops.reduce((max, mc) => {
        if (!mc.cropId) return max;
        const c = crops.find(cc => cc.id === mc.cropId);
        const g = c?.growth_days || c?.days_to_harvest || 0;
        return Math.max(max, g);
      }, 0);
      if (maxGrowth > 0) {
        setHarvestDate(format(addDays(new Date(sowDate), maxGrowth), 'yyyy-MM-dd'));
      } else setHarvestDate('');
    } else if (selectedCropId) {
      const c = crops.find(cc => cc.id === selectedCropId);
      const g = c?.growth_days || c?.days_to_harvest;
      if (g) setHarvestDate(format(addDays(new Date(sowDate), g), 'yyyy-MM-dd'));
      else setHarvestDate('');
    }
  }, [sowDate, selectedCropId, isMixedPlanting, mixCrops, crops]);

  // ===================== HELPERS FOR RENDER =====================

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd.M.yyyy', { locale: sk });
    } catch { return dateStr; }
  };

  const formatDateShort = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd.M.', { locale: sk });
    } catch { return dateStr; }
  };

  const getHarvestDate = (plan: PlantingPlan | GroupedPlantingPlan) => {
    if (plan.expected_harvest_date) {
      try { return parseISO(plan.expected_harvest_date); } catch {}
    }
    try {
      const sd = parseISO(plan.sow_date);
      const days = plan.crops?.days_to_harvest || 10;
      return addDays(sd, days);
    } catch { return new Date(); }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[#d1fae5] text-[#064e3b]';
      case 'in_progress': return 'bg-[#dcfce7] text-[#166534]';
      case 'cancelled': return 'bg-[#f8fafc] text-[#94a3b8]';
      case 'planned':
      default: return 'bg-[#fef3c7] text-[#92400e]';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Hotové';
      case 'in_progress': return 'Prebieha';
      case 'cancelled': return 'Zrušené';
      case 'planned':
      default: return 'Naplánované';
    }
  };

  const getAbcBadgeStyle = (abc: 'A' | 'B' | 'C') => {
    switch (abc) {
      case 'A': return 'bg-[#dcfce7] text-[#166534]';
      case 'B': return 'bg-[#dbeafe] text-[#1e40af]';
      case 'C': return 'bg-[#f1f5f9] text-[#475569]';
    }
  };

  const getCapacityColor = (used: number, total: number) => {
    if (total === 0) return { bar: 'bg-[#94a3b8]', text: 'text-[#475569]' };
    const pct = (used / total) * 100;
    if (pct >= 95) return { bar: 'bg-[#dc2626]', text: 'text-[#dc2626]' };
    if (pct >= 80) return { bar: 'bg-[#d97706]', text: 'text-[#d97706]' };
    return { bar: 'bg-[#16a34a]', text: 'text-[#16a34a]' };
  };

  const filterChips: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'Všetky', count: statusCounts.all },
    { value: 'planned', label: 'Naplánované', count: statusCounts.planned },
    { value: 'in_progress', label: 'Prebieha', count: statusCounts.in_progress },
    { value: 'completed', label: 'Dokončené', count: statusCounts.completed },
  ];


  // ===================== RENDER =====================

  return (
    <MainLayout hideMobileHeader>
      <div className="min-h-screen bg-[#f8fafc] pb-20 md:pb-6">
        {/* HEADER */}
        <div className="bg-white border-b border-[#e2e8f0] px-4 md:px-6 py-4">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
                <Sprout className="h-5 w-5 text-[#16a34a]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-[#0f172a] truncate">Plán sadenia</h1>
                <p className="text-xs md:text-sm text-[#475569] truncate">
                  {groupedPlans.length} {groupedPlans.length === 1 ? 'výsev' : (groupedPlans.length >= 2 && groupedPlans.length <= 4 ? 'výsevy' : 'výsevov')}
                  {planningHorizonDays > 0 && ` • horizont ${planningHorizonDays} dní`}
                </p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => setNewPlantingDialog(true)}
                className="flex-shrink-0 h-9 px-3 md:px-4 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nový výsev</span>
              </button>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4">

          {/* WIDGET — DNES SADIŠ */}
          <TodaysSowingWidget
            items={todaysSowing}
            onItemClick={(item) => {
              const plan = groupedPlans.find(p => p.crop_id === item.cropId && p.sow_date === today);
              if (plan) openDetailDialog(plan);
            }}
            formatDate={formatDate}
            formatGrams={formatGrams}
          />

          {/* KAPACITNÝ PREHĽAD */}
          <CapacityOverview
            capacity={todayCapacity}
            getCapacityColor={getCapacityColor}
          />

          {/* NESKORÉ OBJEDNÁVKY */}
          {lateOrders.length > 0 && (
            <LateOrdersBanner lateOrders={lateOrders} formatDate={formatDate} />
          )}

          {/* HLAVNÉ TABS */}
          <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
            <div className="border-b border-[#e2e8f0] px-2 md:px-4">
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { value: 'plan', label: 'Plán', icon: CalendarDays },
                  { value: 'prediction', label: 'Predikcia', icon: TrendingUp },
                  { value: 'analysis', label: 'Analýza', icon: BarChart3 },
                ].map(tab => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value as Tab)}
                      className={cn(
                        'flex items-center gap-2 px-3 md:px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                        active ? 'border-[#16a34a] text-[#16a34a]' : 'border-transparent text-[#475569] hover:text-[#0f172a]'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'plan' && (
              <div>
                {/* Filter chips */}
                <div className="px-3 md:px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
                  <div className="flex flex-wrap items-center gap-2">
                    {filterChips.map(chip => (
                      <button
                        key={chip.value}
                        onClick={() => setStatusFilter(chip.value)}
                        className={cn(
                          'h-8 px-3 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5',
                          statusFilter === chip.value
                            ? 'bg-[#16a34a] border-[#16a34a] text-white'
                            : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] hover:bg-[#f0fdf4]'
                        )}
                      >
                        <span>{chip.label}</span>
                        <span
                          className={cn(
                            'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold',
                            statusFilter === chip.value ? 'bg-white/25 text-white' : 'bg-[#f1f5f9] text-[#475569]'
                          )}
                        >
                          {chip.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generovanie — kolapsovateľná karta */}
                <div className="border-b border-[#e2e8f0]">
                  <button
                    onClick={() => setGenerateCardOpen(!generateCardOpen)}
                    className="w-full px-3 md:px-4 py-3 flex items-center justify-between hover:bg-[#f8fafc] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#16a34a]" />
                      <span className="text-sm font-bold text-[#0f172a]">Generovať plán z objednávok</span>
                    </div>
                    {generateCardOpen ? <ChevronUp className="h-4 w-4 text-[#475569]" /> : <ChevronDown className="h-4 w-4 text-[#475569]" />}
                  </button>

                  {generateCardOpen && (
                    <div className="px-3 md:px-4 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#475569] mb-1.5">Dátum od</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full h-9 px-3 rounded-md border border-[#e2e8f0] text-sm text-[#0f172a] bg-white focus:outline-none focus:border-[#16a34a]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#475569] mb-1.5">Dátum do</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full h-9 px-3 rounded-md border border-[#e2e8f0] text-sm text-[#0f172a] bg-white focus:outline-none focus:border-[#16a34a]"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="w-full h-9 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                          >
                            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            Vygenerovať plán
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* View mode switcher */}
                <div className="border-b border-[#e2e8f0] px-2 md:px-4 bg-white">
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {[
                      { value: 'cards', label: 'Karty', icon: LayoutGrid },
                      { value: 'list', label: 'Zoznam', icon: List, hideMobile: true },
                      { value: 'calendar', label: 'Kalendár', icon: Calendar },
                    ].map(v => {
                      const Icon = v.icon;
                      const active = viewMode === v.value;
                      return (
                        <button
                          key={v.value}
                          onClick={() => setViewMode(v.value as ViewMode)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap',
                            v.hideMobile && 'hidden md:flex',
                            active ? 'border-[#16a34a] text-[#16a34a]' : 'border-transparent text-[#475569] hover:text-[#0f172a]'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Plan content */}
                <div className="p-3 md:p-4">
                  {loading ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
                          <Skeleton className="h-6 w-40 mb-3" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : filteredPlans.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 rounded-xl bg-[#f1f5f9] flex items-center justify-center mb-3">
                        <CalendarDays className="h-7 w-7 text-[#94a3b8]" />
                      </div>
                      <h3 className="text-base font-bold text-[#0f172a] mb-1">Žiadne plány sadenia</h3>
                      <p className="text-sm text-[#475569] max-w-sm">
                        Vygenerujte plán pre vybrané obdobie alebo vytvorte nový výsev manuálne.
                      </p>
                    </div>
                  ) : viewMode === 'cards' ? (
                    <PlanCardsView
                      plans={filteredPlans}
                      isAdmin={isAdmin}
                      isMobile={isMobile}
                      abcMap={abcMap}
                      onOpenDetail={openDetailDialog}
                      onMarkComplete={handleMarkComplete}
                      onMarkPlanned={handleMarkPlanned}
                      onEdit={openEditDialog}
                      onDelete={(id) => setDeleteId(id)}
                      onAddTray={(plan) => setAddTrayDialog({ open: true, plan })}
                      formatDate={formatDate}
                      formatGrams={formatGrams}
                      getStatusBadgeStyle={getStatusBadgeStyle}
                      getStatusLabel={getStatusLabel}
                      getAbcBadgeStyle={getAbcBadgeStyle}
                    />
                  ) : viewMode === 'list' ? (
                    <PlanListView
                      plans={filteredPlans}
                      isAdmin={isAdmin}
                      abcMap={abcMap}
                      onOpenDetail={openDetailDialog}
                      onMarkComplete={handleMarkComplete}
                      onMarkPlanned={handleMarkPlanned}
                      onEdit={openEditDialog}
                      onDelete={(id) => setDeleteId(id)}
                      formatDate={formatDate}
                      formatGrams={formatGrams}
                      getHarvestDate={getHarvestDate}
                      getStatusBadgeStyle={getStatusBadgeStyle}
                      getStatusLabel={getStatusLabel}
                      getAbcBadgeStyle={getAbcBadgeStyle}
                    />
                  ) : (
                    <DynamicCalendarView
                      dayPlans={filteredDayPlans}
                      onlySowDays={onlySowDays}
                      onToggleOnlySow={() => setOnlySowDays(!onlySowDays)}
                      capacityForDay={capacityForDay}
                      getCapacityColor={getCapacityColor}
                      onItemClick={(item, dateStr) => {
                        const plan = groupedPlans.find(p => p.crop_id === item.cropId && p.sow_date === dateStr);
                        if (plan) openDetailDialog(plan);
                      }}
                      formatDate={formatDate}
                      formatDateShort={formatDateShort}
                      today={today}
                    />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'prediction' && (
              <PredictionView
                rows={abcAndPrediction}
                loading={loadingPrediction}
                getAbcBadgeStyle={getAbcBadgeStyle}
              />
            )}

            {activeTab === 'analysis' && (
              <YieldAnalysisView
                yieldAnalysis={yieldAnalysis}
                loading={loadingPrediction}
              />
            )}
          </div>
        </div>


        {/* DETAIL DIALOG */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#0f172a]">Detail plánu sadenia</DialogTitle>
            </DialogHeader>

            {selectedPlan && (
              <PlanDetailContent
                plan={selectedPlan as GroupedPlantingPlan}
                isAdmin={isAdmin}
                futureOrders={futureOrders}
                abc={abcMap[selectedPlan.crop_id]}
                onClose={() => setIsDetailDialogOpen(false)}
                onMarkComplete={(planId, cropId, sowDate) => handleMarkComplete(planId, cropId, sowDate)}
                onMarkPlanned={(planId, cropId, sowDate) => handleMarkPlanned(planId, cropId, sowDate)}
                onEdit={openEditDialog}
                onAddTray={(plan) => setAddTrayDialog({ open: true, plan })}
                onRemoveTray={handleRemoveTray}
                formatDate={formatDate}
                formatGrams={formatGrams}
                getHarvestDate={getHarvestDate}
                getStatusBadgeStyle={getStatusBadgeStyle}
                getStatusLabel={getStatusLabel}
                getAbcBadgeStyle={getAbcBadgeStyle}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* YIELD DIALOG */}
        <Dialog open={yieldDialog.open} onOpenChange={(open) => {
          if (!open) setYieldDialog({ open: false, plan: null });
        }}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#0f172a] flex items-center gap-2">
                <Scale className="h-5 w-5 text-[#16a34a]" />
                Zaznamenať výnos
              </DialogTitle>
              <DialogDescription className="text-[#475569]">
                {yieldDialog.plan?.crops?.name} — {yieldDialog.plan ? formatDate(yieldDialog.plan.sow_date) : ''}
              </DialogDescription>
            </DialogHeader>

            {yieldDialog.plan && (
              <div className="space-y-4">
                <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#475569]">Plánovaný výnos:</span>
                    <span className="font-bold text-[#0f172a]">
                      {formatGrams(yieldDialog.plan.trays.reduce((sum, t) => {
                        const cfg = yieldDialog.plan!.crops?.tray_configs?.[t.size];
                        const y = (cfg?.yield_grams || cfg?.expected_yield || 0) * t.count;
                        return sum + y;
                      }, 0))}g
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#475569]">Tácky:</span>
                    <span className="font-bold text-[#0f172a]">
                      {sortTrayCombinations(yieldDialog.plan.trays).map(t => `${t.count}×${t.size}`).join(', ')}
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="yield-input" className="text-xs font-semibold text-[#475569]">
                    Skutočný výnos (g)
                  </Label>
                  <Input
                    id="yield-input"
                    type="number"
                    min="0"
                    step="1"
                    value={actualYield === 0 ? '' : actualYield}
                    onChange={(e) => setActualYield(e.target.value === '' ? 0 : parseInt(e.target.value))}
                    placeholder="napr. 320"
                    className="text-sm h-9 mt-1.5 border-[#e2e8f0]"
                  />
                  <p className="text-[11px] text-[#475569] mt-1">
                    Nezadávaj nič pre dokončenie bez zaznamenania výnosu.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <button
                onClick={() => setYieldDialog({ open: false, plan: null })}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={() => {
                  if (yieldDialog.plan) {
                    markCompleteDirect(
                      yieldDialog.plan.id,
                      yieldDialog.plan.crop_id,
                      yieldDialog.plan.sow_date,
                      actualYield > 0 ? actualYield : null
                    );
                  }
                }}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Dokončiť výsev
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ADD TRAY DIALOG */}
        <Dialog open={addTrayDialog.open} onOpenChange={(open) => {
          if (!open) {
            setAddTrayDialog({ open: false, plan: null });
            setAddTraySize('M');
            setAddTrayCount(1);
            setAddTrayNote('');
          }
        }}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#0f172a] flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#16a34a]" />
                Pridať tácku k výsevu
              </DialogTitle>
              <DialogDescription className="text-[#475569]">
                {addTrayDialog.plan?.crops?.name} — {addTrayDialog.plan ? formatDate(addTrayDialog.plan.sow_date) : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold text-[#475569]">Veľkosť</Label>
                  <Select value={addTraySize} onValueChange={(v) => setAddTraySize(v as 'XL' | 'L' | 'M' | 'S')}>
                    <SelectTrigger className="h-9 text-sm mt-1.5 border-[#e2e8f0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XL">XL</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="S">S</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#475569]">Počet</Label>
                  <Input
                    type="number"
                    min="1"
                    value={addTrayCount}
                    onChange={(e) => setAddTrayCount(parseInt(e.target.value) || 1)}
                    className="text-sm h-9 mt-1.5 border-[#e2e8f0]"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#475569]">Poznámka</Label>
                <Textarea
                  value={addTrayNote}
                  onChange={(e) => setAddTrayNote(e.target.value)}
                  placeholder="napr. čakám na väčšiu objednávku"
                  rows={2}
                  className="resize-none text-sm mt-1.5 border-[#e2e8f0]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <button
                onClick={() => setAddTrayDialog({ open: false, plan: null })}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleAddTray}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Pridať
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* GROUPED EDIT DIALOG */}
        <Dialog open={groupedEditDialog.open} onOpenChange={(open) => {
          if (!open) setGroupedEditDialog({ open: false, plan: null });
        }}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#0f172a]">
                Upraviť výsev — {groupedEditDialog.plan?.crops?.name}
              </DialogTitle>
              <DialogDescription className="text-[#475569]">
                Tento výsev má {groupedEditDialog.plan?.trays?.length} tácok. Vyberte ktorú chcete upraviť:
              </DialogDescription>
            </DialogHeader>

            {groupedEditDialog.plan && (
              <div className="space-y-2">
                {sortTrayCombinations(groupedEditDialog.plan.trays).map((tray, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg border border-[#e2e8f0] p-3 flex items-center justify-between hover:border-[#bbf7d0] hover:bg-[#f0fdf4] transition-colors"
                  >
                    <div>
                      <p className="font-bold text-[#0f172a]">{tray.count} × {tray.size}</p>
                      <p className="text-xs text-[#475569]">{tray.seeds_per_tray}g/tácka • {tray.total_seeds}g celkom</p>
                    </div>
                    <button
                      onClick={() => handleEditSpecificTray(groupedEditDialog.plan!, tray.size)}
                      className="h-8 px-3 rounded-md bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Upraviť
                    </button>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <button
                onClick={() => setGroupedEditDialog({ open: false, plan: null })}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors"
              >
                Zrušiť
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* NEW PLANTING / EDIT DIALOG */}
        <Dialog open={newPlantingDialog} onOpenChange={(open) => {
          setNewPlantingDialog(open);
          if (!open) {
            setEditingPlan(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white p-4">
            <DialogHeader>
              <DialogTitle className="text-base text-[#0f172a]">
                {editingPlan ? 'Upraviť výsev' : 'Nový výsev'}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#475569]">
                {editingPlan ? 'Upravte existujúci plán sadenia.' : 'Vytvorte nový plán — štandardná produkcia alebo kombinovaný výsev.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreatePlanting}>
              <div className="space-y-3">
                {/* Kategória */}
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Kategória plodiny</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { value: 'all', label: 'Všetko', icon: Leaf },
                      { value: 'microgreens', label: 'Mikrozelenina', icon: Sprout },
                      { value: 'microherbs', label: 'Mikrobylinky', icon: TreePine },
                      { value: 'edible_flowers', label: 'Jedlé kvety', icon: Flower2 },
                    ].map(cat => {
                      const Icon = cat.icon;
                      const active = selectedCategory === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setSelectedCategory(cat.value)}
                          className={cn(
                            'h-9 rounded-md text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5 border transition-colors',
                            active
                              ? 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]'
                              : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a]'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="leading-none">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mix / Test toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Layers className="h-4 w-4 text-[#16a34a] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[#0f172a] leading-tight">Kombinovaný</p>
                        <p className="text-[10px] text-[#475569] leading-tight">Viac plodín</p>
                      </div>
                    </div>
                    <Switch
                      checked={isMixedPlanting}
                      onCheckedChange={(checked) => {
                        setIsMixedPlanting(checked === true);
                        if (checked === false) {
                          setMixCrops([
                            { cropId: '', percentage: 50 },
                            { cropId: '', percentage: 50 },
                          ]);
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-[#fde68a] bg-[#fffbeb] p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Beaker className="h-4 w-4 text-[#d97706] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[#0f172a] leading-tight">Test</p>
                        <p className="text-[10px] text-[#475569] leading-tight">Test osiva</p>
                      </div>
                    </div>
                    <Switch checked={isTest} onCheckedChange={setIsTest} />
                  </div>
                </div>

                {/* Plodina/Mix select */}
                {!isMixedPlanting ? (
                  <div>
                    <Label htmlFor="crop" className="text-xs font-semibold text-[#475569]">Plodina *</Label>
                    <Select value={selectedCropId} onValueChange={handleCropSelect}>
                      <SelectTrigger id="crop" className="h-9 text-sm mt-1.5 border-[#e2e8f0]">
                        <SelectValue placeholder="Vyberte plodinu" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCrops.map(crop => (
                          <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f8fafc] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-[#475569]">Plodiny a percentá *</Label>
                      <button
                        type="button"
                        onClick={() => setMixCrops([...mixCrops, { cropId: '', percentage: 0 }])}
                        className="h-7 px-2 rounded-md border border-[#e2e8f0] bg-white text-[11px] font-semibold text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] flex items-center gap-1 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Pridať
                      </button>
                    </div>

                    <div className="space-y-2">
                      {mixCrops.map((mixCrop, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Select
                            value={mixCrop.cropId}
                            onValueChange={(val) => {
                              const newMixCrops = [...mixCrops];
                              newMixCrops[index].cropId = val;
                              setMixCrops(newMixCrops);
                            }}
                          >
                            <SelectTrigger className="h-9 text-sm flex-1 border-[#e2e8f0] bg-white">
                              <SelectValue placeholder="Plodina" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredCrops.map(crop => (
                                <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1 w-24">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={mixCrop.percentage === 0 ? '' : mixCrop.percentage}
                              onChange={(e) => {
                                const newMixCrops = [...mixCrops];
                                newMixCrops[index].percentage = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                setMixCrops(newMixCrops);
                              }}
                              placeholder="0"
                              className="h-9 text-sm w-16 border-[#e2e8f0]"
                            />
                            <span className="text-sm text-[#475569]">%</span>
                          </div>
                          {mixCrops.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setMixCrops(mixCrops.filter((_, i) => i !== index))}
                              className="h-9 w-9 rounded-md border border-[#e2e8f0] bg-white text-[#dc2626] hover:bg-[#fef2f2] flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className={cn(
                      'text-xs font-bold',
                      mixCrops.reduce((sum, c) => sum + c.percentage, 0) === 100 ? 'text-[#16a34a]' : 'text-[#dc2626]'
                    )}>
                      Súčet: {mixCrops.reduce((sum, c) => sum + c.percentage, 0)}%
                      {mixCrops.reduce((sum, c) => sum + c.percentage, 0) === 100 && ' ✓'}
                    </div>
                  </div>
                )}

                {/* Tray size + count */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="traySize" className="text-xs font-semibold text-[#475569]">Veľkosť tácky *</Label>
                    <Select value={selectedTraySize} onValueChange={(val) => setSelectedTraySize(val as 'XL' | 'L' | 'M' | 'S')}>
                      <SelectTrigger id="traySize" className="h-9 text-sm mt-1.5 border-[#e2e8f0]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="XL">XL</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="S">S</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="trayCount" className="text-xs font-semibold text-[#475569]">Počet táciek *</Label>
                    <Input
                      id="trayCount"
                      type="number"
                      min="0"
                      step="1"
                      value={trayCount === 0 ? '' : trayCount}
                      onChange={(e) => setTrayCount(e.target.value === '' ? 0 : parseInt(e.target.value))}
                      placeholder="0"
                      className="h-9 text-sm mt-1.5 border-[#e2e8f0]"
                    />
                  </div>
                </div>

                {/* Density */}
                {!isMixedPlanting && (
                  <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f8fafc] space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-[#475569]">Hustota semien</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="custom-density"
                          checked={useCustomDensity}
                          onCheckedChange={(checked) => {
                            setUseCustomDensity(checked === true);
                            if (checked === false) setCustomSeedDensity(0);
                            else setCustomSeedDensity(dbSeedDensity);
                          }}
                        />
                        <Label htmlFor="custom-density" className="text-[11px] text-[#475569] cursor-pointer">Vlastná</Label>
                      </div>
                    </div>
                    {useCustomDensity ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={customSeedDensity === 0 ? '' : customSeedDensity}
                          onChange={(e) => setCustomSeedDensity(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          className="text-sm h-9 border-[#e2e8f0] bg-white"
                          placeholder="0"
                        />
                        <span className="text-xs text-[#475569] whitespace-nowrap">g/tácka</span>
                      </div>
                    ) : (
                      <div className="text-sm text-[#475569]">
                        Automaticky: <span className="font-bold text-[#0f172a]">{formatGrams(seedDensity)}g/tácka</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[#e2e8f0] flex justify-between items-center">
                      <span className="text-xs text-[#475569]">Celkom pre všetky tácky:</span>
                      <span className="text-sm font-bold text-[#16a34a]">{formatGrams(totalSeedGrams)}g</span>
                    </div>
                  </div>
                )}

                {isMixedPlanting && (
                  <div className="rounded-lg border border-[#e2e8f0] p-3 bg-[#f8fafc]">
                    <Label className="text-xs font-semibold text-[#475569] mb-2 block">Celková hustota semien (mix)</Label>
                    <div className="space-y-1 text-xs">
                      {mixCrops.map((mc, idx) => {
                        if (!mc.cropId) return null;
                        const crop = crops.find(c => c.id === mc.cropId);
                        if (!crop?.tray_configs?.[selectedTraySize]) return null;
                        const fullDensity = crop.tray_configs[selectedTraySize].seed_density_grams || crop.tray_configs[selectedTraySize].seed_density || 0;
                        const mixDensity = fullDensity * (mc.percentage / 100);
                        return (
                          <div key={idx} className="flex justify-between text-[#475569]">
                            <span>• {crop.name} ({mc.percentage}%)</span>
                            <span className="font-semibold text-[#0f172a]">{mixDensity.toFixed(1)}g</span>
                          </div>
                        );
                      })}
                      <div className="border-t border-[#e2e8f0] pt-1.5 mt-1.5 flex justify-between font-bold">
                        <span className="text-[#0f172a]">Celkom:</span>
                        <span className="text-[#0f172a]">{mixedSeedDensity.toFixed(1)}g / tácka</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-[#e2e8f0]">
                        <span className="text-[#475569]">Celková potreba:</span>
                        <span className="font-bold text-[#16a34a]">{formatGrams(totalSeedGrams)}g</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="sow-date" className="text-xs font-semibold text-[#475569]">Dátum výsevu *</Label>
                    <Input
                      id="sow-date"
                      type="date"
                      value={sowDate}
                      onChange={(e) => setSowDate(e.target.value)}
                      required
                      className="text-sm h-9 mt-1.5 border-[#e2e8f0]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="harvest-date" className="text-xs font-semibold text-[#475569]">Dátum zberu</Label>
                    <Input
                      id="harvest-date"
                      type="date"
                      value={harvestDate}
                      disabled
                      className="text-sm h-9 mt-1.5 bg-[#f8fafc] border-[#e2e8f0]"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes" className="text-xs font-semibold text-[#475569]">
                    Poznámka <span className="text-[#94a3b8] font-normal">(voliteľné)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="napr. šarža semien, poznámky k testu..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none text-sm mt-1.5 border-[#e2e8f0]"
                  />
                </div>
              </div>

              <DialogFooter className="mt-4 gap-2">
                <button
                  type="button"
                  onClick={() => setNewPlantingDialog(false)}
                  className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    (isMixedPlanting
                      ? (mixCrops.length === 0 || mixCrops.some(mc => !mc.cropId) || mixCrops.reduce((sum, mc) => sum + mc.percentage, 0) !== 100)
                      : !selectedCropId
                    ) ||
                    !selectedTraySize ||
                    trayCount === 0 ||
                    !sowDate ||
                    !harvestDate
                  }
                  className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingPlan ? 'Uložiť' : 'Vytvoriť výsev'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRM */}
        <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Vymazať plán sadenia?</AlertDialogTitle>
              <AlertDialogDescription>
                Táto akcia je nevratná. Plán sadenia bude natrvalo odstránený.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušiť</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && handleDelete(deleteId)}
                className="bg-[#dc2626] text-white hover:bg-[#b91c1c]"
              >
                Vymazať
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};


// ===================== SUB-COMPONENTS =====================

// --- Widget: Dnes sadiš ---
interface TodaysSowingWidgetProps {
  items: TodaysSowingItem[];
  onItemClick: (item: TodaysSowingItem) => void;
  formatDate: (d: string) => string;
  formatGrams: (g: number) => number;
}

const TodaysSowingWidget = ({ items, onItemClick, formatDate, formatGrams }: TodaysSowingWidgetProps) => {
  if (items.length === 0) {
    return (
      <div className="bg-[#f0fdf4] rounded-xl border border-[#bbf7d0] shadow-sm p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="h-5 w-5 text-[#16a34a]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#0f172a]">Dnes nič nesadíš</h3>
          <p className="text-xs text-[#475569]">Pekný deň — žiadne výsevy nie sú naplánované na dnes.</p>
        </div>
      </div>
    );
  }

  const totalTrays = items.reduce((sum, i) => sum + i.trays.reduce((s, t) => s + t.count, 0), 0);
  const totalGrams = items.reduce((sum, i) => sum + i.totalGrams, 0);

  return (
    <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
      <div className="bg-[#f0fdf4] border-b border-[#bbf7d0] px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sprout className="h-4 w-4 text-[#16a34a] flex-shrink-0" />
          <h3 className="text-sm font-bold text-[#0f172a]">Dnes sadíš</h3>
        </div>
        <div className="text-xs text-[#475569] font-semibold whitespace-nowrap">
          {items.length} {items.length === 1 ? 'plodina' : 'plodín'} • {totalTrays} {totalTrays === 1 ? 'tácka' : 'tácok'} • {formatGrams(totalGrams)}g
        </div>
      </div>
      <div className="divide-y divide-[#e2e8f0]">
        {items.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onItemClick(item)}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#f8fafc] transition-colors',
              item.isManual && 'border-l-4 border-l-[#f59e0b]'
            )}
          >
            <div
              className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border"
              style={{ backgroundColor: `${item.cropColor}15`, borderColor: `${item.cropColor}30` }}
            >
              <Sprout className="h-4 w-4" style={{ color: item.cropColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-[#0f172a] truncate">{item.cropName}</span>
                {item.isManual && <Pencil className="h-3 w-3 text-[#f59e0b] flex-shrink-0" />}
              </div>
              <p className="text-xs text-[#475569] truncate">
                {sortTrayCombinations(item.trays).map(t => `${t.count}×${t.size}`).join(', ')}
                {item.harvestDate && ` • zber ${formatDate(item.harvestDate)}`}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-bold text-[#16a34a]">{formatGrams(item.totalGrams)}g</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Widget: Kapacitný prehľad ---
interface CapacityOverviewProps {
  capacity: CapacityInfo;
  getCapacityColor: (used: number, total: number) => { bar: string; text: string };
}

const CapacityOverview = ({ capacity, getCapacityColor }: CapacityOverviewProps) => {
  const darkPct = capacity.darkTotal > 0 ? (capacity.darkUsed / capacity.darkTotal) * 100 : 0;
  const lightPct = capacity.lightTotal > 0 ? (capacity.lightUsed / capacity.lightTotal) * 100 : 0;
  const darkColor = getCapacityColor(capacity.darkUsed, capacity.darkTotal);
  const lightColor = getCapacityColor(capacity.lightUsed, capacity.lightTotal);

  return (
    <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
      <h3 className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
        <Target className="h-4 w-4 text-[#16a34a]" />
        Aktuálne obsadenie regálov
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Moon className="h-3.5 w-3.5 text-[#475569]" />
              <span className="text-xs font-semibold text-[#475569]">Klíčenie</span>
            </div>
            <span className={cn('text-xs font-bold', darkColor.text)}>
              {capacity.darkUsed} / {capacity.darkTotal} poz.
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
            <div
              className={cn('h-full transition-all', darkColor.bar)}
              style={{ width: `${Math.min(100, darkPct)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 text-[#475569]" />
              <span className="text-xs font-semibold text-[#475569]">Svetlo</span>
            </div>
            <span className={cn('text-xs font-bold', lightColor.text)}>
              {capacity.lightUsed} / {capacity.lightTotal} poz.
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
            <div
              className={cn('h-full transition-all', lightColor.bar)}
              style={{ width: `${Math.min(100, lightPct)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Banner: Neskoré objednávky ---
interface LateOrdersBannerProps {
  lateOrders: LateOrderInfo[];
  formatDate: (d: string) => string;
}

const LateOrdersBanner = ({ lateOrders, formatDate }: LateOrdersBannerProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#fef2f2] rounded-xl border border-[#fecaca] shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#fee2e2] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 text-[#dc2626] flex-shrink-0" />
          <span className="text-sm font-bold text-[#0f172a]">
            {lateOrders.length} {lateOrders.length === 1 ? 'objednávku' : 'objednávok'} nestihneš vypestovať
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-[#dc2626]" /> : <ChevronDown className="h-4 w-4 text-[#dc2626]" />}
      </button>
      {expanded && (
        <div className="border-t border-[#fecaca] divide-y divide-[#fecaca]">
          {lateOrders.map((late, idx) => (
            <div key={idx} className="px-4 py-2.5 bg-white">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#dc2626]">{formatOrderNumber(late.orderNumber)}</span>
                    <span className="font-semibold text-sm text-[#0f172a] truncate">{late.customerName}</span>
                  </div>
                  <p className="text-xs text-[#475569]">
                    {late.cropName} • {Math.round(late.quantityGrams)}g • zber {formatDate(late.deliveryDate)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] text-[#dc2626] font-bold">{late.daysAvailable}/{late.daysToHarvest} dní</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// --- View: Plan Cards ---
interface ViewProps {
  plans: GroupedPlantingPlan[];
  isAdmin: boolean;
  abcMap: Record<string, 'A' | 'B' | 'C'>;
  onOpenDetail: (plan: GroupedPlantingPlan) => void;
  onMarkComplete: (planId: string, cropId?: string, sowDate?: string) => void;
  onMarkPlanned: (planId: string, cropId?: string, sowDate?: string) => void;
  onEdit: (plan: GroupedPlantingPlan) => void;
  onDelete: (id: string) => void;
  formatDate: (date: string) => string;
  formatGrams: (g: number) => number;
  getStatusBadgeStyle: (s: string) => string;
  getStatusLabel: (s: string) => string;
  getAbcBadgeStyle: (abc: 'A' | 'B' | 'C') => string;
}

interface CardsViewProps extends ViewProps {
  isMobile: boolean;
  onAddTray: (plan: GroupedPlantingPlan) => void;
}

const PlanCardsView = ({
  plans, isAdmin, isMobile, abcMap,
  onOpenDetail, onMarkComplete, onMarkPlanned, onEdit, onDelete, onAddTray,
  formatDate, formatGrams, getStatusBadgeStyle, getStatusLabel, getAbcBadgeStyle,
}: CardsViewProps) => {
  return (
    <>
      {/* MOBILE */}
      <div className="md:hidden divide-y divide-[#e2e8f0]">
        {plans.map(plan => {
          const isMixed = (plan as any).is_mixed;
          const isTest = (plan as any).is_test;
          const cropColor = plan.crops?.color || '#16a34a';
          const abc = abcMap[plan.crop_id];
          return (
            <div
              key={plan.id}
              onClick={() => onOpenDetail(plan)}
              className={cn(
                'flex items-center gap-3 py-3 px-1 cursor-pointer active:bg-[#f8fafc] transition-colors',
                plan.status === 'completed' && 'opacity-70',
                plan.is_manual && 'border-l-4 border-l-[#f59e0b] pl-2'
              )}
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{ backgroundColor: `${cropColor}15`, borderColor: `${cropColor}30` }}
              >
                {isMixed ? (
                  <Layers className="h-5 w-5" style={{ color: cropColor }} />
                ) : (
                  <Sprout className="h-5 w-5" style={{ color: cropColor }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-[#0f172a] truncate">
                    {isMixed ? 'Kombinovaný' : (plan.crops?.name || 'Neznáma')}
                  </span>
                  {abc && (
                    <span className={cn('inline-flex items-center h-4 px-1.5 rounded text-[9px] font-bold', getAbcBadgeStyle(abc))}>
                      {abc}
                    </span>
                  )}
                  {plan.is_manual && <Pencil className="h-3 w-3 text-[#f59e0b] flex-shrink-0" />}
                  {isTest && (
                    <span className="inline-flex items-center h-4 px-1.5 rounded bg-[#fef3c7] text-[#92400e] text-[9px] font-bold">TEST</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#475569]">
                  <span>{formatDate(plan.sow_date)}</span>
                  <span className="text-[#cbd5e1]">•</span>
                  <span className="truncate">
                    {sortTrayCombinations(plan.trays).map(t => `${t.count}×${t.size}`).join(', ')}
                  </span>
                </div>
                <span className={cn('inline-flex items-center h-4 px-1.5 mt-1 rounded text-[9px] font-bold', getStatusBadgeStyle(plan.status))}>
                  {getStatusLabel(plan.status).toUpperCase()}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isAdmin) return;
                  plan.status === 'completed'
                    ? onMarkPlanned(plan.id, plan.crop_id, plan.sow_date)
                    : onMarkComplete(plan.id, plan.crop_id, plan.sow_date);
                }}
                disabled={!isAdmin}
                className={cn(
                  'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors',
                  plan.status === 'completed'
                    ? 'bg-[#16a34a] text-white'
                    : 'border-2 border-[#cbd5e1] text-[#cbd5e1] hover:border-[#16a34a] hover:text-[#16a34a]'
                )}
              >
                {plan.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </button>
            </div>
          );
        })}
      </div>

      {/* DESKTOP */}
      <div className="hidden md:grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {plans.map(plan => {
          const isMixed = (plan as any).is_mixed;
          const isTest = (plan as any).is_test;
          const cropColor = plan.crops?.color || '#16a34a';
          const abc = abcMap[plan.crop_id];
          return (
            <div
              key={plan.id}
              onClick={() => onOpenDetail(plan)}
              className={cn(
                'bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all',
                plan.is_manual ? 'border-[#fcd34d] hover:border-[#f59e0b]' : 'border-[#cbd5e1] hover:border-[#bbf7d0]',
                plan.status === 'completed' && 'bg-[#f8fafc]'
              )}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{ backgroundColor: `${cropColor}15`, borderColor: `${cropColor}30` }}
                >
                  {isMixed ? (
                    <Layers className="h-5 w-5" style={{ color: cropColor }} />
                  ) : (
                    <Sprout className="h-5 w-5" style={{ color: cropColor }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-[#0f172a] truncate">
                      {isMixed ? 'Kombinovaný' : (plan.crops?.name || 'Neznáma')}
                    </h3>
                    {plan.is_manual && <Pencil className="h-3 w-3 text-[#f59e0b] flex-shrink-0" />}
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className={cn('inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold', getStatusBadgeStyle(plan.status))}>
                      {getStatusLabel(plan.status).toUpperCase()}
                    </span>
                    {abc && (
                      <span className={cn('inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold', getAbcBadgeStyle(abc))}>
                        {abc}
                      </span>
                    )}
                    {isTest && (
                      <span className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded-full bg-[#fef3c7] text-[#92400e] text-[10px] font-bold">
                        <FlaskConical className="h-2.5 w-2.5" />
                        TEST
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#475569] mb-3">
                <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-semibold">{formatDate(plan.sow_date)}</span>
                <span className="text-[#94a3b8]">→</span>
                <span>{formatDate(addDays(parseISO(plan.sow_date), plan.crops?.days_to_harvest || 10).toISOString())}</span>
              </div>

              <div className="space-y-1 mb-3">
                {sortTrayCombinations(plan.trays).map((tray, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className={cn('font-bold', tray.is_manual ? 'text-[#d97706]' : 'text-[#0f172a]')}>
                      {tray.is_manual && '✎ '}{tray.count} × {tray.size}
                    </span>
                    <span className="text-[#475569]">{formatGrams(tray.seeds_per_tray)}g/tácka</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 border-t border-[#e2e8f0]">
                  <span className="text-[#475569]">Celkom:</span>
                  <span className="font-bold text-[#16a34a]">{formatGrams(plan.total_seed_grams || 0)}g</span>
                </div>
              </div>

              {plan.status === 'completed' && plan.actual_yield_grams != null && (
                <div className="flex items-center gap-1.5 mb-3 text-xs">
                  <Scale className="h-3 w-3 text-[#16a34a] flex-shrink-0" />
                  <span className="text-[#475569]">Skutočný výnos:</span>
                  <span className="font-bold text-[#0f172a] ml-auto">{plan.actual_yield_grams}g</span>
                </div>
              )}

              {(plan as any).notes && (
                <div className="flex items-start gap-1.5 mb-3 text-xs text-[#475569]">
                  <StickyNote className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{(plan as any).notes}</span>
                </div>
              )}

              <div className="flex items-center gap-1 pt-3 border-t border-[#e2e8f0]" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() =>
                    plan.status === 'completed'
                      ? onMarkPlanned(plan.id, plan.crop_id, plan.sow_date)
                      : onMarkComplete(plan.id, plan.crop_id, plan.sow_date)
                  }
                  disabled={!isAdmin}
                  className={cn(
                    'flex-1 h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50',
                    plan.status === 'completed'
                      ? 'bg-[#16a34a] hover:bg-[#15803d] text-white'
                      : 'border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a]'
                  )}
                >
                  {plan.status === 'completed' ? <CheckCircle className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                  <span>Hotovo</span>
                </button>
                <button
                  onClick={() => onAddTray(plan)}
                  disabled={!isAdmin}
                  title="Pridať tácku"
                  className="h-8 w-8 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] disabled:opacity-50 flex items-center justify-center transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onEdit(plan)}
                  disabled={!isAdmin}
                  className="h-8 w-8 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] disabled:opacity-50 flex items-center justify-center transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(plan.id)}
                  disabled={!isAdmin}
                  className="h-8 w-8 rounded-md border border-[#e2e8f0] text-[#dc2626] hover:border-[#fecaca] hover:bg-[#fef2f2] disabled:opacity-50 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// --- View: Plan List ---
interface ListViewProps extends ViewProps {
  getHarvestDate: (plan: GroupedPlantingPlan) => Date;
}

const PlanListView = ({
  plans, isAdmin, abcMap,
  onOpenDetail, onMarkComplete, onMarkPlanned, onEdit, onDelete,
  formatDate, formatGrams, getHarvestDate, getStatusBadgeStyle, getStatusLabel, getAbcBadgeStyle,
}: ListViewProps) => {
  return (
    <div className="overflow-x-auto -mx-3 md:-mx-4">
      <table className="w-full text-sm">
        <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
          <tr>
            <th className="text-left px-3 md:px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Plodina</th>
            <th className="text-center px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Výsev</th>
            <th className="text-center px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Zber</th>
            <th className="text-center px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Tácky</th>
            <th className="text-center px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Semená</th>
            <th className="text-center px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Stav</th>
            <th className="text-right px-3 md:px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Akcie</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e2e8f0] bg-white">
          {plans.map(plan => {
            const isMixed = (plan as any).is_mixed;
            const isTest = (plan as any).is_test;
            const cropColor = plan.crops?.color || '#16a34a';
            const abc = abcMap[plan.crop_id];
            return (
              <tr
                key={plan.id}
                onClick={() => onOpenDetail(plan)}
                className={cn(
                  'cursor-pointer hover:bg-[#f8fafc] transition-colors',
                  plan.status === 'completed' && 'bg-[#f8fafc]',
                  plan.is_manual && 'border-l-4 border-l-[#f59e0b]'
                )}
              >
                <td className="px-3 md:px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 border"
                      style={{ backgroundColor: `${cropColor}15`, borderColor: `${cropColor}30` }}
                    >
                      {isMixed ? (
                        <Layers className="h-3.5 w-3.5" style={{ color: cropColor }} />
                      ) : (
                        <Leaf className="h-3.5 w-3.5" style={{ color: cropColor }} />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-[#0f172a] truncate">
                        {isMixed ? 'Kombinovaný' : (plan.crops?.name || 'Neznáma')}
                      </span>
                      {abc && (
                        <span className={cn('inline-flex items-center h-4 px-1.5 rounded text-[9px] font-bold flex-shrink-0', getAbcBadgeStyle(abc))}>
                          {abc}
                        </span>
                      )}
                      {plan.is_manual && <Pencil className="h-3 w-3 text-[#f59e0b] flex-shrink-0" />}
                      {isTest && (
                        <span className="inline-flex items-center h-4 px-1.5 rounded bg-[#fef3c7] text-[#92400e] text-[9px] font-bold flex-shrink-0">TEST</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-[#475569]">{formatDate(plan.sow_date)}</td>
                <td className="px-3 py-3 text-center text-[#475569]">{formatDate(getHarvestDate(plan).toISOString())}</td>
                <td className="px-3 py-3 text-center">
                  <div className="flex flex-col gap-0.5">
                    {sortTrayCombinations(plan.trays).map((tray, idx) => (
                      <span key={idx} className="text-[#0f172a] font-semibold text-xs">{tray.count}×{tray.size}</span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    {sortTrayCombinations(plan.trays).map((tray, idx) => (
                      <span key={idx} className="text-[11px] text-[#475569]">{formatGrams(tray.seeds_per_tray)}g/t</span>
                    ))}
                    <span className="font-bold text-[#16a34a] text-xs border-t border-[#e2e8f0] pt-0.5 mt-0.5">
                      Σ {formatGrams(plan.trays.reduce((sum, t) => sum + t.total_seeds, 0))}g
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={cn('inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold', getStatusBadgeStyle(plan.status))}>
                    {getStatusLabel(plan.status).toUpperCase()}
                  </span>
                </td>
                <td className="px-3 md:px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() =>
                        plan.status === 'completed'
                          ? onMarkPlanned(plan.id, plan.crop_id, plan.sow_date)
                          : onMarkComplete(plan.id, plan.crop_id, plan.sow_date)
                      }
                      disabled={!isAdmin}
                      className={cn(
                        'h-8 w-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-50',
                        plan.status === 'completed'
                          ? 'bg-[#16a34a] text-white hover:bg-[#15803d]'
                          : 'border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a]'
                      )}
                    >
                      {plan.status === 'completed' ? <CheckCircle className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => onOpenDetail(plan)}
                      className="h-8 w-8 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] flex items-center justify-center transition-colors"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onEdit(plan)}
                      disabled={!isAdmin}
                      className="h-8 w-8 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] disabled:opacity-50 flex items-center justify-center transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(plan.id)}
                      disabled={!isAdmin}
                      className="h-8 w-8 rounded-md border border-[#e2e8f0] text-[#dc2626] hover:border-[#fecaca] hover:bg-[#fef2f2] disabled:opacity-50 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};


// --- View: Dynamic Calendar ---
interface DynamicCalendarViewProps {
  dayPlans: DayPlan[];
  onlySowDays: boolean;
  onToggleOnlySow: () => void;
  capacityForDay: (dateStr: string) => CapacityInfo;
  getCapacityColor: (used: number, total: number) => { bar: string; text: string };
  onItemClick: (item: TodaysSowingItem, dateStr: string) => void;
  formatDate: (d: string) => string;
  formatDateShort: (d: string) => string;
  today: string;
}

const DynamicCalendarView = ({
  dayPlans, onlySowDays, onToggleOnlySow, capacityForDay, getCapacityColor,
  onItemClick, formatDate, formatDateShort, today,
}: DynamicCalendarViewProps) => {
  const tomorrow = addDays(new Date(), 1).toISOString().split('T')[0];
  const weekEnd = addDays(new Date(), 7).toISOString().split('T')[0];

  const getDayColor = (date: string) => {
    if (date === today) return { bg: 'bg-[#f0fdf4]', border: 'border-[#bbf7d0]', label: 'DNES', labelColor: 'text-[#16a34a]' };
    if (date === tomorrow) return { bg: 'bg-[#eff6ff]', border: 'border-[#bfdbfe]', label: 'ZAJTRA', labelColor: 'text-[#2563eb]' };
    if (date < weekEnd) return { bg: 'bg-white', border: 'border-[#e2e8f0]', label: null, labelColor: '' };
    return { bg: 'bg-white', border: 'border-[#e2e8f0]', label: null, labelColor: '' };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#475569]">
          <span className="font-bold text-[#0f172a]">{dayPlans.length}</span> {dayPlans.length === 1 ? 'deň' : 'dní'} v pláne
        </p>
        <button
          onClick={onToggleOnlySow}
          className={cn(
            'h-8 px-3 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5',
            onlySowDays
              ? 'bg-[#16a34a] border-[#16a34a] text-white'
              : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0]'
          )}
        >
          {onlySowDays ? <CheckCircle className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
          Len dni so sadením
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {dayPlans.map(day => {
          const dayColor = getDayColor(day.date);
          const cap = capacityForDay(day.date);
          const darkPct = cap.darkTotal > 0 ? (cap.darkUsed / cap.darkTotal) * 100 : 0;
          const lightPct = cap.lightTotal > 0 ? (cap.lightUsed / cap.lightTotal) * 100 : 0;
          const darkColor = getCapacityColor(cap.darkUsed, cap.darkTotal);
          const lightColor = getCapacityColor(cap.lightUsed, cap.lightTotal);
          const dow = parseISO(day.date).getDay();

          return (
            <div
              key={day.date}
              className={cn('rounded-xl border shadow-sm p-3', dayColor.bg, dayColor.border)}
            >
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[#16a34a]" />
                  <h3 className="font-bold text-sm text-[#0f172a]">{formatDate(day.date)}</h3>
                  <span className="text-[10px] text-[#94a3b8] uppercase">{SK_WEEKDAYS[dow]}</span>
                </div>
                {dayColor.label && (
                  <span className={cn('text-[9px] font-bold', dayColor.labelColor)}>
                    {dayColor.label}
                  </span>
                )}
              </div>

              {day.items.length === 0 ? (
                <p className="text-xs text-[#94a3b8] italic py-2">Žiadne sadenie</p>
              ) : (
                <div className="space-y-1 mb-2">
                  {day.items.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => onItemClick(item, day.date)}
                      className={cn(
                        'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-white transition-colors',
                        item.isManual && 'border-l-2 border-l-[#f59e0b]'
                      )}
                    >
                      <Sprout className="h-3.5 w-3.5 flex-shrink-0" style={{ color: item.cropColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-[#0f172a] truncate flex items-center gap-1">
                          {item.cropName}
                          {item.isManual && <Pencil className="h-2.5 w-2.5 text-[#f59e0b]" />}
                        </p>
                        <p className="text-[10px] text-[#475569]">
                          {sortTrayCombinations(item.trays).map(t => `${t.count}×${t.size}`).join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(cap.darkUsed > 0 || cap.lightUsed > 0) && (
                <div className="pt-2 border-t border-[#e2e8f0] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Moon className="h-2.5 w-2.5 text-[#475569]" />
                    <span className="text-[10px] text-[#475569] w-12">Klíč:</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden">
                      <div className={cn('h-full', darkColor.bar)} style={{ width: `${Math.min(100, darkPct)}%` }} />
                    </div>
                    <span className={cn('text-[10px] font-bold w-12 text-right', darkColor.text)}>
                      {cap.darkUsed}/{cap.darkTotal}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sun className="h-2.5 w-2.5 text-[#475569]" />
                    <span className="text-[10px] text-[#475569] w-12">Svetlo:</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[#f1f5f9] overflow-hidden">
                      <div className={cn('h-full', lightColor.bar)} style={{ width: `${Math.min(100, lightPct)}%` }} />
                    </div>
                    <span className={cn('text-[10px] font-bold w-12 text-right', lightColor.text)}>
                      {cap.lightUsed}/{cap.lightTotal}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- View: Prediction ---
interface PredictionViewProps {
  rows: PredictionRow[];
  loading: boolean;
  getAbcBadgeStyle: (abc: 'A' | 'B' | 'C') => string;
}

const PredictionView = ({ rows, loading, getAbcBadgeStyle }: PredictionViewProps) => {
  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center">
        <TrendingUp className="h-10 w-10 text-[#94a3b8] mb-3" />
        <h3 className="text-base font-bold text-[#0f172a] mb-1">Nedostatok dát</h3>
        <p className="text-sm text-[#475569] max-w-sm">
          Predikcia vyžaduje historické objednávky za posledných 90 dní.
        </p>
      </div>
    );
  }

  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return 'text-[#16a34a]';
    if (conf >= 70) return 'text-[#2563eb]';
    if (conf >= 50) return 'text-[#d97706]';
    return 'text-[#dc2626]';
  };

  return (
    <div className="p-3 md:p-4">
      <div className="mb-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg p-3 flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-[#16a34a] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-[#0f172a] font-bold mb-0.5">Klzavý priemer + ABC analýza</p>
          <p className="text-xs text-[#475569]">
            Priemer gramov za posledné 3 týždne podľa dňa zberu. Confidence = pravidelnosť objednávok.
            ABC: top 20% = A, ďalších 30% = B, zvyšok = C.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 md:-mx-4">
        <table className="w-full text-sm">
          <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
            <tr>
              <th className="text-left px-3 md:px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Plodina</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">ABC</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Obj. (g)</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Predikcia (g)</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Conf.</th>
              <th className="text-left px-3 md:px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Odporúčanie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0] bg-white">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-[#f8fafc] transition-colors">
                <td className="px-3 md:px-4 py-3 text-left">
                  <span className="font-bold text-[#0f172a]">{row.cropName}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={cn('inline-flex items-center h-5 px-2 rounded-full text-[11px] font-bold', getAbcBadgeStyle(row.abc))}>
                    {row.abc}
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-[#475569] font-mono text-xs">
                  {row.orderedGrams}
                </td>
                <td className="px-3 py-3 text-right font-bold text-[#0f172a] font-mono text-xs">
                  {row.predictedGrams}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={cn('font-bold text-xs', getConfidenceColor(row.confidence))}>
                    {row.confidence}%
                  </span>
                </td>
                <td className="px-3 md:px-4 py-3 text-left text-xs text-[#0f172a] font-semibold">
                  {row.recommendation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- View: Yield Analysis ---
interface YieldAnalysisRow {
  cropId: string;
  cropName: string;
  planned: number;
  actual: number;
  efficiency: number;
}

interface YieldAnalysisViewProps {
  yieldAnalysis: YieldAnalysisRow[];
  loading: boolean;
}

const YieldAnalysisView = ({ yieldAnalysis, loading }: YieldAnalysisViewProps) => {
  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (yieldAnalysis.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center">
        <BarChart3 className="h-10 w-10 text-[#94a3b8] mb-3" />
        <h3 className="text-base font-bold text-[#0f172a] mb-1">Žiadne dáta o výnosoch</h3>
        <p className="text-sm text-[#475569] max-w-sm">
          Po dokončení výsevov zaznamenaj skutočný výnos. Údaje sa zobrazia po prvých záznamoch.
        </p>
      </div>
    );
  }

  const getEffColor = (eff: number) => {
    if (eff >= 95) return 'text-[#16a34a]';
    if (eff >= 80) return 'text-[#2563eb]';
    if (eff >= 60) return 'text-[#d97706]';
    return 'text-[#dc2626]';
  };

  return (
    <div className="p-3 md:p-4">
      <div className="mb-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg p-3 flex items-start gap-2">
        <Scale className="h-4 w-4 text-[#16a34a] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-[#0f172a] font-bold mb-0.5">Plánovaný vs skutočný výnos</p>
          <p className="text-xs text-[#475569]">
            Efektivita = skutočný výnos / plánovaný výnos × 100. Údaje sú za všetky dokončené výsevy.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 md:-mx-4">
        <table className="w-full text-sm">
          <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
            <tr>
              <th className="text-left px-3 md:px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Plodina</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Plánované (g)</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Skutočné (g)</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Rozdiel</th>
              <th className="text-right px-3 md:px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">Efektivita</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0] bg-white">
            {yieldAnalysis.map((row, idx) => {
              const diff = row.actual - row.planned;
              return (
                <tr key={idx} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-3 md:px-4 py-3 text-left">
                    <span className="font-bold text-[#0f172a]">{row.cropName}</span>
                  </td>
                  <td className="px-3 py-3 text-right text-[#475569] font-mono text-xs">{row.planned}</td>
                  <td className="px-3 py-3 text-right font-bold text-[#0f172a] font-mono text-xs">{row.actual}</td>
                  <td className={cn('px-3 py-3 text-right font-bold font-mono text-xs', diff >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]')}>
                    {diff >= 0 ? '+' : ''}{diff}
                  </td>
                  <td className="px-3 md:px-4 py-3 text-right">
                    <span className={cn('font-bold text-sm', getEffColor(row.efficiency))}>
                      {row.efficiency}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Plan Detail Content (renderované v Detail Dialog) ---
interface PlanDetailContentProps {
  plan: GroupedPlantingPlan;
  isAdmin: boolean;
  futureOrders: OrderForPlanning[];
  abc?: 'A' | 'B' | 'C';
  onClose: () => void;
  onMarkComplete: (planId: string, cropId?: string, sowDate?: string) => void;
  onMarkPlanned: (planId: string, cropId?: string, sowDate?: string) => void;
  onEdit: (plan: GroupedPlantingPlan) => void;
  onAddTray: (plan: GroupedPlantingPlan) => void;
  onRemoveTray: (planId: string) => void;
  formatDate: (d: string) => string;
  formatGrams: (g: number) => number;
  getHarvestDate: (plan: GroupedPlantingPlan) => Date;
  getStatusBadgeStyle: (s: string) => string;
  getStatusLabel: (s: string) => string;
  getAbcBadgeStyle: (abc: 'A' | 'B' | 'C') => string;
}

const PlanDetailContent = ({
  plan, isAdmin, futureOrders, abc,
  onClose, onMarkComplete, onMarkPlanned, onEdit, onAddTray, onRemoveTray,
  formatDate, formatGrams, getHarvestDate,
  getStatusBadgeStyle, getStatusLabel, getAbcBadgeStyle,
}: PlanDetailContentProps) => {
  const isMixed = (plan as any).is_mixed;
  const isTest = (plan as any).is_test;
  const cropColor = plan.crops?.color || '#16a34a';
  const harvestDate = getHarvestDate(plan);
  const daysToHarvest = plan.crops?.days_to_harvest || 10;
  const planNotes = (plan as any).notes as string | undefined;

  // Mix configuration parsing
  let mixConfig: any[] | null = null;
  if (isMixed && (plan as any).mix_configuration) {
    try {
      const raw = (plan as any).mix_configuration;
      mixConfig = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      mixConfig = null;
    }
  }

  // Lookup source orders (full info)
  const sourceOrderDetails = (plan.source_orders || [])
    .map(oid => futureOrders.find(o => o.id === oid))
    .filter(Boolean) as OrderForPlanning[];

  // Late warning — koľko dní zostáva
  const todayDate = startOfDay(new Date());
  const daysUntilHarvest = differenceInDays(harvestDate, todayDate);
  const isLate = plan.status !== 'completed' && daysUntilHarvest < daysToHarvest && daysUntilHarvest >= 0;

  // Total planned yield
  const totalPlannedYield = plan.trays.reduce((sum, t) => {
    const cfg = plan.crops?.tray_configs?.[t.size];
    return sum + (cfg?.yield_grams || cfg?.expected_yield || 0) * t.count;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header — plodina + badges */}
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border"
          style={{ backgroundColor: `${cropColor}15`, borderColor: `${cropColor}30` }}
        >
          {isMixed ? (
            <Layers className="h-6 w-6" style={{ color: cropColor }} />
          ) : (
            <Sprout className="h-6 w-6" style={{ color: cropColor }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-[#0f172a]">
              {isMixed ? 'Kombinovaný výsev' : (plan.crops?.name || 'Neznáma')}
            </h2>
            {plan.is_manual && (
              <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[#fef3c7] text-[#92400e] text-[10px] font-bold">
                <Pencil className="h-2.5 w-2.5" />
                MANUÁLNY
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className={cn('inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold', getStatusBadgeStyle(plan.status))}>
              {getStatusLabel(plan.status).toUpperCase()}
            </span>
            {abc && (
              <span className={cn('inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold', getAbcBadgeStyle(abc))}>
                ABC: {abc}
              </span>
            )}
            {isTest && (
              <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[#fef3c7] text-[#92400e] text-[10px] font-bold">
                <FlaskConical className="h-2.5 w-2.5" />
                TEST
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Late warning */}
      {isLate && (
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-[#dc2626] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[#0f172a]">Riziko nestihnúť zber</p>
            <p className="text-xs text-[#475569]">
              Do plánovaného zberu zostáva {daysUntilHarvest} dní, plodina potrebuje {daysToHarvest} dní.
            </p>
          </div>
        </div>
      )}

      {/* Meta info grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">Výsev</p>
          <p className="text-sm font-bold text-[#0f172a]">{formatDate(plan.sow_date)}</p>
        </div>
        <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">Zber</p>
          <p className="text-sm font-bold text-[#0f172a]">{formatDate(harvestDate.toISOString())}</p>
        </div>
        <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">Dni rastu</p>
          <p className="text-sm font-bold text-[#0f172a]">{daysToHarvest} dní</p>
        </div>
        <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">Klíčenie / Svetlo</p>
          <p className="text-sm font-bold text-[#0f172a]">
            {plan.crops?.days_in_darkness ?? 2}d / {plan.crops?.days_on_light ?? (daysToHarvest - (plan.crops?.days_in_darkness ?? 2))}d
          </p>
        </div>
      </div>

      {/* Mix configuration */}
      {isMixed && mixConfig && mixConfig.length > 0 && (
        <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
          <h3 className="text-xs font-bold text-[#0f172a] mb-2 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#16a34a]" />
            Konfigurácia mixu
          </h3>
          <div className="space-y-1.5">
            {mixConfig.map((mc: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-[#0f172a] font-semibold">{mc.crop_name || 'Neznáma'}</span>
                <span className="font-bold text-[#16a34a]">{mc.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tray combinations */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
        <h3 className="text-xs font-bold text-[#0f172a] mb-2 flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-[#16a34a]" />
          Kombinácia tácok
        </h3>
        <div className="divide-y divide-[#e2e8f0]">
          {sortTrayCombinations(plan.trays).map((tray, idx) => (
            <div key={idx} className={cn(
              'flex items-center justify-between py-2',
              tray.is_manual && 'border-l-2 border-l-[#f59e0b] pl-2'
            )}>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-[#0f172a]">{tray.count} × {tray.size}</span>
                {tray.is_manual && <Pencil className="h-3 w-3 text-[#f59e0b]" />}
              </div>
              <div className="text-right">
                <p className="text-xs text-[#475569]">{formatGrams(tray.seeds_per_tray)}g/tácka</p>
                <p className="text-xs font-bold text-[#0f172a]">{formatGrams(tray.total_seeds)}g celkom</p>
              </div>
              {isAdmin && plan.status !== 'completed' && tray.is_manual && tray.plan_id && (
                <button
                  onClick={() => onRemoveTray(tray.plan_id!)}
                  className="ml-2 h-7 w-7 rounded-md border border-[#e2e8f0] text-[#dc2626] hover:bg-[#fef2f2] flex items-center justify-center transition-colors"
                  title="Odstrániť tácku"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 mt-1 border-t-2 border-[#e2e8f0]">
            <span className="text-xs font-bold text-[#0f172a]">Celkové semená</span>
            <span className="text-sm font-bold text-[#16a34a]">{formatGrams(plan.total_seed_grams || 0)}g</span>
          </div>
          {totalPlannedYield > 0 && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[#475569]">Plánovaný výnos</span>
              <span className="font-bold text-[#0f172a]">{formatGrams(totalPlannedYield)}g</span>
            </div>
          )}
        </div>
      </div>

      {/* Yield info — completed */}
      {plan.status === 'completed' && plan.actual_yield_grams != null && (
        <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg p-3">
          <h3 className="text-xs font-bold text-[#0f172a] mb-2 flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-[#16a34a]" />
            Skutočný výnos
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-[#0f172a]">{plan.actual_yield_grams}g</p>
              {totalPlannedYield > 0 && (
                <p className="text-xs text-[#475569]">
                  Efektivita: <span className="font-bold text-[#16a34a]">
                    {Math.round((plan.actual_yield_grams / totalPlannedYield) * 100)}%
                  </span>
                </p>
              )}
            </div>
            {totalPlannedYield > 0 && (
              <div className="text-right">
                <p className="text-xs text-[#475569]">Plán</p>
                <p className="text-sm font-bold text-[#475569]">{formatGrams(totalPlannedYield)}g</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Source orders */}
      {sourceOrderDetails.length > 0 && (
        <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
          <h3 className="text-xs font-bold text-[#0f172a] mb-2 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-[#16a34a]" />
            Zdroj objednávok ({sourceOrderDetails.length})
          </h3>
          <div className="space-y-1.5">
            {sourceOrderDetails.map((order, idx) => {
              const grams = (order.order_items || []).reduce((sum: number, it: any) => {
                const g = parseFloat((it.packaging_size || '').replace(/[^0-9.]/g, '') || '0') * (it.quantity || 0);
                return sum + g;
              }, 0);
              return (
                <div key={idx} className="flex items-center justify-between text-xs border-b border-[#e2e8f0] last:border-0 pb-1.5 last:pb-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-[#16a34a] flex-shrink-0">
                      {formatOrderNumber(order.order_number)}
                    </span>
                    <span className="text-[#0f172a] font-semibold truncate">{order.customer_name || 'Neznámy'}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[#475569]">{formatDate(order.delivery_date)}</span>
                    {grams > 0 && <span className="text-[#0f172a] font-bold ml-1.5">{Math.round(grams)}g</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {planNotes && (
        <div className="bg-[#fffbeb] border border-[#fde68a] rounded-lg p-3">
          <h3 className="text-xs font-bold text-[#0f172a] mb-1 flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5 text-[#d97706]" />
            Poznámka
          </h3>
          <p className="text-xs text-[#475569] whitespace-pre-wrap">{planNotes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e2e8f0]">
        <button
          onClick={onClose}
          className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors"
        >
          Zavrieť
        </button>

        {isAdmin && plan.status !== 'completed' && (
          <button
            onClick={() => onMarkComplete(plan.id, plan.crop_id, plan.sow_date)}
            className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            Dokončiť
          </button>
        )}

        {isAdmin && plan.status === 'completed' && (
          <button
            onClick={() => onMarkPlanned(plan.id, plan.crop_id, plan.sow_date)}
            className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Vrátiť do plánu
          </button>
        )}

        {isAdmin && plan.status !== 'completed' && (
          <>
            <button
              onClick={() => onEdit(plan)}
              className="h-9 px-3 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Upraviť
            </button>
            <button
              onClick={() => onAddTray(plan)}
              className="h-9 px-3 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Pridať tácku
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PlantingPlanPage;
