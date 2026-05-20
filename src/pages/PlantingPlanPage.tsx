import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  ChevronRight,
  ChevronLeft,
  Target,
  Scale,
  Sun,
  Moon,
  ExternalLink,
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
  stacking_height?: number;
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
  customer_id?: string;
  customers?: { id: string; customer_type?: string | null } | null;
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

// Pre KLÍČENIE: tácky sú stohnuté na sebe — 1 pozícia v regáli pojme `stackingHeight` tácok.
// Pre SVETLO/zber: použij štandardný TRAY_POSITION_VALUE (XL=1, L=1, M=1/3, S=1/3).
const calcPositionsForGermination = (trays: TrayDetail[], stackingHeight: number): number => {
  const stack = Math.max(1, stackingHeight); // safety: ak by bolo 0/null
  return trays.reduce((sum, t) => sum + t.count / stack, 0);
};

const SK_WEEKDAYS = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];

const formatOrderNumber = (n: number): string => `MR-${String(n).padStart(3, '0')}`;

type ViewMode = 'cards' | 'list' | 'week' | 'calendar';
type StatusFilter = 'all' | 'planned' | 'in_progress' | 'completed';
type Tab = 'plan' | 'prediction' | 'analysis';

// ===================== BLEND EXPANSION (čisté funkcie, bez DB calls) =====================

interface BlendLeafCrop {
  cropId: string;
  grams: number;
}

// Parsuje crop_percentages z DB (jsonb alebo string) do unifikovaného arrayu.
// Podporuje obe konvencie kľúčov: {cropId, percentage, isBlend} aj {crop_id, percentage, is_blend}.
const parseCropPercentages = (raw: any): Array<{ cropId: string; percentage: number; isBlend: boolean }> => {
  let arr: any[];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch { arr = []; }
  } else {
    arr = [];
  }
  return arr
    .map((p: any) => {
      const cropId = p.cropId || p.crop_id;
      if (!cropId) return null;
      const percentage = typeof p.percentage === 'number' ? p.percentage : parseFloat(p.percentage || '0');
      const isBlend = p.isBlend === true || p.is_blend === true;
      return { cropId, percentage, isBlend };
    })
    .filter((p: any) => p !== null && p.percentage > 0) as Array<{ cropId: string; percentage: number; isBlend: boolean }>;
};

// Rekurzívne expanduje mix na pole leaf-plodín so správnymi gramážami.
// allBlendsMap: { [blendId]: { id, name, crop_ids[], crop_percentages } }
// Vráti flat array [{cropId, grams}] kde cropId je vždy LEAF (plodina, nie sub-blend).
// Maximálna hĺbka rekurzie = 5 (ochrana proti cirkulárnym referenciám).
const expandBlendToLeafCrops = (
  blendId: string,
  totalGrams: number,
  allBlendsMap: Record<string, any>,
  depth: number = 0
): BlendLeafCrop[] => {
  if (depth > 5) {
    console.warn(`[blend-expand] depth>5, prerušujem rekurziu pre blend ${blendId}`);
    return [];
  }
  const blend = allBlendsMap[blendId];
  if (!blend) {
    console.warn(`[blend-expand] blend ${blendId} nie je v allBlendsMap`);
    return [];
  }

  let percentages = parseCropPercentages(blend.crop_percentages);

  // Fallback: ak crop_percentages prázdne ale crop_ids existuje → rovné rozdelenie.
  // V tomto prípade nevieme či zložky sú sub-blendy → predpokladáme plodiny (isBlend=false).
  if (percentages.length === 0 && Array.isArray(blend.crop_ids) && blend.crop_ids.length > 0) {
    const equalPct = 100 / blend.crop_ids.length;
    percentages = blend.crop_ids.map((cid: string) => ({ cropId: cid, percentage: equalPct, isBlend: false }));
    console.debug(`[blend-expand] ${blend.name || blendId}: crop_percentages prázdne, fallback rovné ${equalPct.toFixed(1)}% × ${blend.crop_ids.length}`);
  }

  console.debug(
    `[blend-expand] ${blend.name || blendId} | depth=${depth} | totalGrams=${totalGrams.toFixed(1)}g | percentages.length=${percentages.length}`
  );

  const result: BlendLeafCrop[] = [];

  percentages.forEach(({ cropId, percentage, isBlend }) => {
    const componentGrams = totalGrams * (percentage / 100);

    if (isBlend) {
      // Sub-blend — rekurzia
      const subLeaves = expandBlendToLeafCrops(cropId, componentGrams, allBlendsMap, depth + 1);
      result.push(...subLeaves);
    } else {
      // Leaf plodina
      result.push({ cropId, grams: componentGrams });
    }
  });

  return result;
};

// ===================== MAIN COMPONENT =====================

const PlantingPlanPage = () => {
  const { isAdmin } = useAuth();
  const { getHarvestDateForDelivery } = useHarvestDays();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const planIdFromUrl = searchParams.get('planId');

  // Jednorázový cleanup flag — zmaž staré planned+auto S-tácky pri prvom načítaní stránky
  // (pred opravou Bug 4 sa autogeneroval S, teraz sa S vytvára len manuálne).
  const sCleanupDoneRef = useRef(false);

  // Flag pre autoSync — zabraňuje opakovanému spusteniu pri refresh-i stránky.
  // futureOrders.length sa môže nemeniť pri reload-e, takže useEffect dep [futureOrders.length]
  // nezachytí druhé spustenie. Tento ref zabezpečí že autoSync prebehne pri prvom načítaní
  // dát, nezávisle od počtu objednávok.
  const autoSyncRanRef = useRef(false);

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('planned');
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
  // today je useState (nie konštanta) — aktualizuje sa po polnoci automaticky.
  // Toto zabraňuje bugu kedy "Dnes sadíš" ukazuje včerajšie výsevy ak je stránka
  // otvorená cez polnoc bez refresh-u.
  const [today, setToday] = useState(() => new Date().toISOString().split('T')[0]);
  const defaultEndDate = addDays(new Date(), 60).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEndDate);

  // Sledovanie zmeny dátumu — kontrola každú minútu.
  // Keď sa zmení dátum (polnoc), React automaticky prepočíta todaysSowing
  // a všetky závislosti cez useMemo deps.
  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = new Date().toISOString().split('T')[0];
      if (currentDate !== today) {
        console.info(`[today] Dátum sa zmenil ${today} → ${currentDate} (polnoc)`);
        setToday(currentDate);
      }
    }, 60 * 1000); // každú minútu
    return () => clearInterval(interval);
  }, [today]);

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
        .select('id, name, days_to_harvest, days_to_germination, days_in_darkness, days_on_light, tray_configs, color, category, reserved_percentage, stacking_height')
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
          id, order_number, customer_name, customer_id, delivery_date, status,
          customers:customer_id ( id, customer_type ),
          order_items (
            crop_id, blend_id, quantity, packaging_size,
            crops:crop_id ( id, name, days_to_harvest, days_to_germination, days_in_darkness, days_on_light, tray_configs, reserved_percentage, color, category )
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
            crops:crop_id ( id, name, days_to_harvest, days_to_germination, days_in_darkness, days_on_light )
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

      // Jednorázový cleanup (raz za session) — zmaž auto-generované planned plány s tray_size='S'.
      // Pred opravou Bug 4 sa S auto-navrhovalo; teraz sa S vytvára len manuálne.
      // Manuálne (is_manual=true) plány sú chránené.
      if (!sCleanupDoneRef.current) {
        sCleanupDoneRef.current = true;
        try {
          const { error: cleanupError, count } = await supabase
            .from('planting_plans')
            .delete({ count: 'exact' })
            .eq('tray_size', 'S')
            .eq('is_manual', false)
            .eq('status', 'planned');
          if (cleanupError) {
            console.warn('[S-cleanup] failed:', cleanupError);
          } else if (count && count > 0) {
            console.info(`[S-cleanup] removed ${count} legacy auto-generated S-tray planned plans`);
          }
        } catch (cleanupErr) {
          console.warn('[S-cleanup] exception:', cleanupErr);
        }
      }

      const { data: plansData, error } = await supabase
        .from('planting_plans')
        .select(`
          *,
          crops:crop_id(id, name, color, days_to_harvest, days_to_germination, days_in_darkness, days_on_light, tray_configs, stacking_height)
        `)
        .gte('expected_harvest_date', startDate)
        .lte('expected_harvest_date', endDate)
        .order('sow_date');

      if (error) throw error;

      const plansWithConfig = (plansData || []).map((plan) => {
        let trayConfig: TrayConfig | null = null;
        if (plan.crops?.tray_configs) {
          // Normalizuj kľúče: DB ich má lowercase ("m"/"l"/"xl") ale plan.tray_size je uppercase.
          const rawConfigs = plan.crops.tray_configs;
          const configs: Record<string, any> = {};
          Object.keys(rawConfigs).forEach(k => { configs[k.toUpperCase()] = rawConfigs[k]; });
          if (configs[plan.tray_size]) {
            const sizeConfig = configs[plan.tray_size];
            trayConfig = {
              seed_density_grams: sizeConfig.seed_density_grams ?? sizeConfig.seed_density ?? 0,
              yield_grams: sizeConfig.yield_grams ?? sizeConfig.expected_yield ?? 0,
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
      // Merge tácky rovnakej veľkosti BEZ ohľadu na is_manual.
      // Predtým bol filter `t.is_manual === (plan.is_manual === true)` ktorý spôsoboval
      // zdvojené "1 × M" v UI keď bol jeden plán auto a druhý manuálny.
      // Pre vizuálne odlíšenie sa is_manual=true propaguje do mergeného záznamu (badge sa zobrazí).
      const existingTray = group.trays.find(t => t.size === plan.tray_size);
      if (existingTray) {
        existingTray.count += plan.tray_count;
        existingTray.total_seeds = (existingTray.total_seeds || 0) + plan.total_seed_grams;
        // Ak je hociktorý zo zlúčených manuálny, výsledná tácka je tiež označená ako manuálna
        if (plan.is_manual === true) existingTray.is_manual = true;
      } else {
        group.trays.push({
          size: plan.tray_size,
          count: plan.tray_count,
          seeds_per_tray: plan.seed_amount_grams,
          total_seeds: plan.total_seed_grams,
          plan_id: plan.id,
          is_manual: plan.is_manual === true,
        });
      }
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

    const allResults = Array.from(grouped.values());

    // OPRAVA 6: Skryť completed/harvested výsevy staršie ako 30 dní.
    // Filter, NIE mazanie z DB. Čistí UI od starých záznamov.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffStr = thirtyDaysAgo.toISOString().split('T')[0];

    const result = allResults.filter(g => {
      if (g.status === 'completed' || g.status === 'harvested') {
        return g.sow_date >= cutoffStr;
      }
      return true;
    });

    const hiddenCount = allResults.length - result.length;
    if (hiddenCount > 0) {
      console.debug(`[groupedPlans] skryté ${hiddenCount} starých dokončených/harvested výsevov (sow_date < ${cutoffStr})`);
    }

    // Diagnostické logy — pre každý grouped plan vypíš plan.trays.
    // Pomôže lokalizovať zdroj zdvojených tácok ak by problém pretrvával.
    if (result.length > 0) {
      console.debug('[groupedPlans] count=' + result.length + ' merged groups (zobrazených)');
      result.forEach(g => {
        const traysDump = g.trays.map(t => `${t.count}×${t.size}${t.is_manual ? '(M)' : ''}`).join('+');
        console.debug(
          `[groupedPlans] ${g.crops?.name || g.crop_id} | sow=${g.sow_date} | status=${g.status} | trays=[${traysDump}] | totalSeeds=${g.total_seed_grams}g`
        );
      });
    }

    return result;
  }, [plans, today]);

  const filteredPlans = useMemo(() => {
    if (statusFilter === 'all') return groupedPlans;
    if (statusFilter === 'completed') {
      // Záložka "Dokončené" zahŕňa aj harvested výsevy
      return groupedPlans.filter(p => p.status === 'completed' || p.status === 'harvested');
    }
    return groupedPlans.filter(p => p.status === statusFilter);
  }, [groupedPlans, statusFilter]);

  const statusCounts = useMemo(() => ({
    all: groupedPlans.length,
    planned: groupedPlans.filter(p => p.status === 'planned').length,
    in_progress: groupedPlans.filter(p => p.status === 'in_progress').length,
    completed: groupedPlans.filter(p => p.status === 'completed' || p.status === 'harvested').length,
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
    // Zobrazíme len plány so status='planned' — keď user označí výsev ako
    // posadený (in_progress) alebo dokončený (completed), widget ho skryje.
    // 'cancelled' je tiež vynechané. Žiadne ďalšie statusy by sa nemali objaviť
    // pred zberom, ale pre istotu filtrujeme striktne na 'planned'.
    const todayPlans = groupedPlans.filter(p =>
      p.sow_date === today && p.status === 'planned'
    );
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

  // True ak na dnes existujú výsevy, ALE všetky sú už posadené (in_progress / completed / harvested).
  // Používa sa pre rozlíšenie "Dnes nič" vs "Dnes všetko hotové ✓".
  const todaysAllDone = useMemo(() => {
    if (todaysSowing.length > 0) return false; // ešte sú nejaké planned
    return groupedPlans.some(p =>
      p.sow_date === today &&
      (p.status === 'in_progress' || p.status === 'completed' || p.status === 'harvested')
    );
  }, [groupedPlans, today, todaysSowing.length]);

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
      const stackingHeight = p.crops?.stacking_height ?? 4;
      const darkEnd = addDays(sow, darkDays);
      const harvest = addDays(sow, totalDays);
      if (date >= sow && date < darkEnd) {
        // Klíčenie — tácky sú stohnuté, takže pozícií zaberú menej
        darkUsed += calcPositionsForGermination(p.trays, stackingHeight);
      } else if (date >= darkEnd && date <= harvest) {
        // Svetlo — štandardné pozície
        lightUsed += calcPositions(p.trays);
      }
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

  // Core syncing logika — používa sa manuálnou aj automatickou cestou.
  // Vracia počet vytvorených výsevov (re-vytvorenie cez delete-and-insert
  // mechanizmus v createPlantingTasksForGroup; manuálne výsevy sú chránené).
  // Parametre:
  //   - dateFrom/dateTo: rozsah delivery_date pre filter objednávok
  //   - silent: true = žiadne toast hlášky, len console.warn pri chybách
  const syncPlansFromOrders = useCallback(async (
    dateFrom: string,
    dateTo: string,
    silent: boolean = false
  ): Promise<number> => {
    console.info(`[syncPlansFromOrders] START dateFrom=${dateFrom} dateTo=${dateTo} silent=${silent}`);
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, delivery_date, status,
          order_items (
            crop_id, blend_id, quantity, packaging_size,
            crops:crop_id ( id, name, days_to_harvest, tray_configs, reserved_percentage )
          )
        `)
        .gte('delivery_date', dateFrom)
        .lte('delivery_date', dateTo)
        .in('status', ['growing', 'packed', 'on_the_way', 'pending', 'pending_approval', 'confirmed', 'cakajuca', 'potvrdena', 'pripravena']);

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) {
        console.info(`[syncPlansFromOrders] Žiadne objednávky v rozsahu ${dateFrom} až ${dateTo}`);
        return 0;
      }
      console.info(`[syncPlansFromOrders] Načítaných ${orders.length} objednávok`);

      // Expand blends — fetchni všetky blend_ids použité v objednávkach a ich plodiny.
      // Mixy nemajú crop_id na order_items úrovni, ale blend_id, ktorý ukazuje
      // na blends tabuľku obsahujúcu crop_ids[] a crop_percentages jsonb.
      const blendIds = Array.from(new Set(
        orders.flatMap((o: any) =>
          (o.order_items || [])
            .filter((i: any) => i.blend_id)
            .map((i: any) => i.blend_id as string)
        )
      ));

      // allBlendsMap obsahuje VŠETKY blendy z DB (nielen tie z order_items),
      // pretože sub-blendy môžu byť hocijaký iný blend z DB.
      const allBlendsMap: Record<string, any> = {};
      const blendCropsMap: Record<string, any> = {};

      if (blendIds.length > 0) {
        // Fetch VŠETKY blends naraz — aby sme vedeli rekurzívne expandovať sub-blendy.
        // Aj keď objednávka odkazuje len na X blendov, sub-blendy môžu byť mimo X.
        const { data: allBlends, error: blendsError } = await supabase
          .from('blends')
          .select('id, name, crop_ids, crop_percentages');
        if (blendsError) throw blendsError;
        (allBlends || []).forEach((b: any) => { allBlendsMap[b.id] = b; });
        console.debug(`[syncPlansFromOrders] Načítaných ${(allBlends || []).length} blendov v DB (priame z objednávok: ${blendIds.length})`);

        // Zozbieraj VŠETKY leaf cropId z direct + rekurzívnych expanzií.
        // Použijeme dummy gramáž 1g — zaujímajú nás len cropIds, nie konkrétne hodnoty.
        const leafCropIds = new Set<string>();
        blendIds.forEach(bid => {
          const leaves = expandBlendToLeafCrops(bid, 1, allBlendsMap, 0);
          leaves.forEach(l => leafCropIds.add(l.cropId));
        });

        if (leafCropIds.size > 0) {
          const { data: blendCrops, error: blendCropsError } = await supabase
            .from('products')
            .select('id, name, days_to_harvest, tray_configs, reserved_percentage')
            .in('id', Array.from(leafCropIds));
          if (blendCropsError) throw blendCropsError;
          (blendCrops || []).forEach((c: any) => { blendCropsMap[c.id] = c; });
          console.debug(`[syncPlansFromOrders] Načítaných ${(blendCrops || []).length} leaf plodín pre mixy (vrátane sub-blendov)`);
        }
      }

      const grouped = groupOrdersByCropAndHarvestDate(orders, allBlendsMap, blendCropsMap);
      if (grouped.length === 0) return 0;

      console.info(`[syncPlansFromOrders] Po grupovaní: ${grouped.length} skupín (crop × harvest_date) na spracovanie`);

      let createdCount = 0;
      for (const g of grouped) {
        // Diagnostické logovanie — pomáha overiť že totalRequired sa správne sčítava
        // pre každú plodinu + harvest_date kombináciu. Tichý log, len pre dev/diagnose.
        const reservePct = g.crop.reserved_percentage ?? 5;
        const withReserveDbg = g.totalRequired * (1 + reservePct / 100);
        console.debug(
          `[autoSync] ${g.crop.name || g.crop.id} | harvest=${g.harvestDate} | required=${g.totalRequired.toFixed(1)}g | +rezerva ${reservePct}%=${withReserveDbg.toFixed(1)}g | orders=${g.orderIds.length}`
        );
        const created = await createPlantingTasksForGroup(g);
        createdCount += created;
      }
      console.info(`[syncPlansFromOrders] DONE — vytvorených ${createdCount} výsevov`);
      return createdCount;
    } catch (err) {
      if (silent) {
        console.warn('syncPlansFromOrders failed:', err);
        return 0;
      }
      throw err;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tichá automatická synchronizácia — beží pri načítaní stránky.
  // Pozerá sa od dneška -7 dní (buffer pre nedávno vytvorené plány)
  // do konca aktuálneho dátumového rozsahu (endDate stránky).
  const autoSyncPlantingPlans = useCallback(async () => {
    try {
      const today = new Date();
      const bufferDate = addDays(today, -7).toISOString().split('T')[0];
      // Použijeme endDate stránky ako horný limit, aby sme nepokrývali celú DB
      const created = await syncPlansFromOrders(bufferDate, endDate, true);
      if (created > 0) {
        // Tichý refresh — bez celostranového loading skeleton.
        // fetchPlans() spôsobí setLoading(true), preto refresh robíme inline.
        try {
          const { data: refreshedPlans, error: refreshError } = await supabase
            .from('planting_plans')
            .select(`
              *,
              crops:crop_id(id, name, color, days_to_harvest, days_to_germination, days_in_darkness, days_on_light, tray_configs, stacking_height)
            `)
            .gte('expected_harvest_date', startDate)
            .lte('expected_harvest_date', endDate)
            .order('sow_date');

          if (!refreshError && refreshedPlans) {
            const plansWithConfig = refreshedPlans.map((plan: any) => {
              let trayConfig: TrayConfig | null = null;
              if (plan.crops?.tray_configs) {
                // Normalizuj kľúče lowercase → uppercase
                const rawConfigs = plan.crops.tray_configs;
                const configs: Record<string, any> = {};
                Object.keys(rawConfigs).forEach(k => { configs[k.toUpperCase()] = rawConfigs[k]; });
                if (configs[plan.tray_size]) {
                  const sizeConfig = configs[plan.tray_size];
                  trayConfig = {
                    seed_density_grams: sizeConfig.seed_density_grams ?? sizeConfig.seed_density ?? 0,
                    yield_grams: sizeConfig.yield_grams ?? sizeConfig.expected_yield ?? 0,
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
            console.info(`[autoSync] Silent refresh — načítaných ${plansWithConfig.length} plánov`);
            setPlans(plansWithConfig);
          }
        } catch (refreshErr) {
          console.warn('autoSyncPlantingPlans refresh failed:', refreshErr);
        }
      }
    } catch (err) {
      console.warn('autoSyncPlantingPlans failed:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncPlansFromOrders, startDate, endDate]);

  // Manuálne generovanie — ZACHOVANÉ ale UI tlačidlo bolo odstránené.
  // Zostáva ako internal API pre prípadné použitie.
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const createdCount = await syncPlansFromOrders(startDate, endDate, false);

      if (createdCount === 0) {
        toast({
          title: 'Žiadne nové výsevy',
          description: 'V danom období nie sú žiadne objednávky alebo všetky výsevy už existujú.',
        });
        return;
      }

      const created1Word = createdCount === 1 ? 'výsev' : (createdCount >= 2 && createdCount <= 4 ? 'výsevy' : 'výsevov');
      const created2Word = createdCount === 1 ? 'Vytvorený' : (createdCount >= 2 && createdCount <= 4 ? 'Vytvorené' : 'Vytvorených');
      toast({
        title: 'Plán vygenerovaný',
        description: `${created2Word} ${createdCount} ${created1Word}.`,
      });
      await Promise.all([fetchPlans(), fetchFutureOrders()]);
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


  function groupOrdersByCropAndHarvestDate(
    orders: any[],
    blendsMap: Record<string, any> = {},
    blendCropsMap: Record<string, any> = {}
  ) {
    const groups = new Map<string, {
      crop: any;
      harvestDate: string;
      totalRequired: number;
      orderIds: string[];
    }>();

    orders.forEach(order => {
      const harvestDate = getHarvestDateForDelivery(order.delivery_date);
      order.order_items?.forEach((item: any) => {
        // Vetva 1: priama plodina (crop_id != null)
        if (item.crop_id && item.crops) {
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
          return;
        }

        // Vetva 2: mix (blend_id != null) — REKURZÍVNA expanzia na leaf plodiny.
        // Mix môže obsahovať sub-blendy (cp.isBlend === true) — tie sa expandujú znova.
        // Max depth = 5 (chránime proti cirkulárnym referenciám).
        if (item.blend_id && blendsMap[item.blend_id]) {
          const blend = blendsMap[item.blend_id];
          const totalGrams = parseFloat(
            item.packaging_size?.replace(/[^0-9.]/g, '') || '0'
          ) * (item.quantity || 0);

          if (totalGrams <= 0) return;

          console.debug(
            `[blend-expand] ROOT ${blend.name || item.blend_id} | order=${order.id?.slice(0, 8)} | totalGrams=${totalGrams.toFixed(1)}g`
          );

          // Rekurzívna expanzia na leaf-plodiny
          const leaves = expandBlendToLeafCrops(item.blend_id, totalGrams, blendsMap, 0);

          leaves.forEach(({ cropId, grams }) => {
            const crop = blendCropsMap[cropId];
            if (!crop) {
              console.warn(`[blend-expand] Leaf plodina ${cropId} nie je v blendCropsMap — preskakujem`);
              return;
            }

            const key = `${cropId}_${harvestDate}`;
            if (!groups.has(key)) {
              groups.set(key, {
                crop,
                harvestDate,
                totalRequired: 0,
                orderIds: [],
              });
            }
            const g = groups.get(key)!;
            g.totalRequired += grams;
            if (!g.orderIds.includes(order.id)) g.orderIds.push(order.id);

            console.debug(`[blend-expand] LEAF + ${crop.name || cropId}: ${grams.toFixed(1)}g → groupTotal=${g.totalRequired.toFixed(1)}g`);
          });
        }
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

    // ?? namiesto || — 0% rezerva má byť rešpektovaná, nie nahradená 5%.
    const reservePercent = crop.reserved_percentage ?? 5;
    const reserve = reservePercent / 100;
    const withReserve = totalRequired * (1 + reserve);

    console.info(
      `[createPlanningTasks] ${crop?.name || crop.id} | harvest=${harvestDate} | totalRequired=${totalRequired.toFixed(1)}g | rezerva=${reservePercent}% | withReserve=${withReserve.toFixed(1)}g`
    );

    // Vymaž VŠETKY auto-generované planned plány pre túto kombináciu (crop × harvest_date).
    // Pôvodne sme mali aj .not('source_orders', 'is', null) — to ale vylúčilo legacy záznamy
    // s source_orders=NULL, čo viedlo k duplicitám pri každom autoSync-u.
    // Teraz mažeme všetky is_manual=false + status=planned bez ohľadu na source_orders.
    const { error: deleteError, count: deletedCount } = await supabase
      .from('planting_plans')
      .delete({ count: 'exact' })
      .eq('crop_id', crop.id)
      .eq('expected_harvest_date', harvestDate)
      .eq('is_manual', false)
      .eq('status', 'planned');

    if (deleteError) {
      console.error('[createPlanningTasks] Chyba pri mazaní:', deleteError);
    } else if (deletedCount && deletedCount > 0) {
      console.info(`[createPlanningTasks] Zmazaných ${deletedCount} starých auto-plánov pre ${crop?.name}`);
    }

    // BUG fix: ak pre túto crop+harvest kombináciu už existuje plán so statusom
    // in_progress alebo completed, NEVYTVÁRAJ nový planned plán. Inak by autoSync
    // donekonečna vyrábal "Dnes sadíš" záznam aj po kliknutí "Hotovo".
    // Manuálne plány majú vlastný DELETE filter (is_manual=false vyššie ich nezmaže).
    const { data: existingActive, error: checkError } = await supabase
      .from('planting_plans')
      .select('id, status, is_manual')
      .eq('crop_id', crop.id)
      .eq('expected_harvest_date', harvestDate)
      .in('status', ['in_progress', 'completed']);

    if (checkError) {
      console.warn('[createPlanningTasks] Check existing failed:', checkError);
    } else if (existingActive && existingActive.length > 0) {
      console.info(
        `[createPlanningTasks] ${crop?.name || crop.id} — preskakujem (${existingActive.length} aktívnych plánov in_progress/completed pre tento harvest)`
      );
      return 0;
    }

    // Pozn.: extra S delete bol odstránený — hlavný DELETE vyššie už pokrýva všetky veľkosti tácok
    // pre auto-generated planned plány. S-cleanup pri štarte stránky (sCleanupDoneRef) rieši
    // legacy záznamy z celej DB.

    const trayConfig = optimizeTrayConfiguration(crop, withReserve);

    if (trayConfig.length === 0) {
      console.warn(`[createPlanningTasks] ${crop?.name || crop.id} — optimizeTrayConfiguration vrátil prázdne pole! Žiadny plán nebude vytvorený.`);
      return 0;
    }

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
      else console.error(`[createPlanningTasks] Chyba pri vytváraní plánu ${tray.size}:`, insertError);
    }
    console.info(`[createPlanningTasks] ${crop?.name || crop.id} — vytvorených ${created}/${trayConfig.length} plánov: ${trayConfig.map(t => `${t.count}×${t.size}`).join('+')}`);
    return created;
  }

  function optimizeTrayConfiguration(crop: any, requiredYield: number) {
    const trayConfigs = crop.tray_configs || {};

    // KRITICKÉ: tray_configs kľúče v DB sú lowercase ("m","l","xl") — normalizuj na uppercase.
    // Bez tejto normalizácie by tc.M bolo undefined a algoritmus by vrátil prázdne pole.
    const tc: Record<string, any> = {};
    Object.keys(trayConfigs).forEach(k => { tc[k.toUpperCase()] = trayConfigs[k]; });

    // DEBUG: vypíš RAW + normalizovaný objekt aby sme videli čo prišlo z DB
    console.debug(`[optimizeTray] ${crop.name} | RAW tray_configs:`, trayConfigs);
    console.debug(`[optimizeTray] ${crop.name} | normalized keys: [${Object.keys(tc).join(', ')}]`);

    // Veľkosť S sa NIKDY nenavrhuje automaticky — len manuálne zadanie.
    const sizesAsc = [
      { name: 'M',  seeds: tc.M?.seed_density_grams  ?? tc.M?.seed_density  ?? 0, yield: tc.M?.yield_grams  ?? tc.M?.expected_yield  ?? 0 },
      { name: 'L',  seeds: tc.L?.seed_density_grams  ?? tc.L?.seed_density  ?? 0, yield: tc.L?.yield_grams  ?? tc.L?.expected_yield  ?? 0 },
      { name: 'XL', seeds: tc.XL?.seed_density_grams ?? tc.XL?.seed_density ?? 0, yield: tc.XL?.yield_grams ?? tc.XL?.expected_yield ?? 0 },
    ].filter(s => s.seeds > 0 && s.yield > 0);

    console.debug(`[optimizeTray] ${crop.name} | required=${requiredYield.toFixed(1)}g | sizes=`, sizesAsc.map(s => `${s.name}(yield=${s.yield}, seeds=${s.seeds})`).join(', ') || 'ŽIADNE');

    if (sizesAsc.length === 0) {
      console.warn(`[optimizeTray] ${crop.name} — žiadne tácky M/L/XL nakonfigurované v tray_configs! Skontroluj DB.`);
      return [];
    }

    const result: Array<{ size: string; count: number; seedsPerTray: number; yieldPerTray: number }> = [];

    // Prípad 1: požadované množstvo sa zmestí do jednej tácky — nájdi NAJMENŠIU vhodnú
    const smallestFit = sizesAsc.find(s => s.yield >= requiredYield);
    if (smallestFit) {
      result.push({
        size: smallestFit.name,
        count: 1,
        seedsPerTray: smallestFit.seeds,
        yieldPerTray: smallestFit.yield,
      });
      console.debug(`[optimizeTray] ${crop.name} | smallestFit=${smallestFit.name} (yield=${smallestFit.yield}g ≥ required=${requiredYield.toFixed(1)}g) → result=1×${smallestFit.name}`);
      return result;
    }

    // Prípad 2: požadované množstvo presahuje aj najväčšiu (XL) tácku.
    // Stratégia: čo najviac XL tácok, zvyšok pokry najmenšou vhodnou táckou (alebo XL ak nič menšie nestačí).
    const xl = sizesAsc[sizesAsc.length - 1]; // najväčšia
    const xlCount = Math.floor(requiredYield / xl.yield);
    let remaining = requiredYield - xlCount * xl.yield;

    if (xlCount > 0) {
      result.push({
        size: xl.name,
        count: xlCount,
        seedsPerTray: xl.seeds,
        yieldPerTray: xl.yield,
      });
    }

    if (remaining > 0) {
      // Pre zvyšok znova preferuj najmenšiu vhodnú tácku
      const remainderFit = sizesAsc.find(s => s.yield >= remaining);
      if (remainderFit) {
        // Ak je to rovnaká veľkosť ako už pridaná (XL), zlúč to do jedného záznamu
        const existing = result.find(r => r.size === remainderFit.name);
        if (existing) {
          existing.count += 1;
        } else {
          result.push({
            size: remainderFit.name,
            count: 1,
            seedsPerTray: remainderFit.seeds,
            yieldPerTray: remainderFit.yield,
          });
        }
      } else {
        // Zvyšok je väčší ako akákoľvek dostupná tácka — pridaj ďalšiu XL (fallback)
        const existing = result.find(r => r.size === xl.name);
        if (existing) {
          existing.count += 1;
        } else {
          result.push({
            size: xl.name,
            count: 1,
            seedsPerTray: xl.seeds,
            yieldPerTray: xl.yield,
          });
        }
      }
    }

    console.debug(`[optimizeTray] ${crop.name} | Case 2 (required ${requiredYield.toFixed(1)}g > max ${xl.yield}g) → result=${result.map(r => `${r.count}×${r.size}`).join('+')}`);
    return result;
  }

  const handleMarkComplete = async (planId: string, cropId?: string, sowDate?: string) => {
    // "Hotovo" = posadené → status in_progress. Žiadny yield dialog.
    try {
      if (cropId && sowDate) {
        const { error } = await supabase
          .from('planting_plans')
          .update({ status: 'in_progress' })
          .eq('crop_id', cropId)
          .eq('sow_date', sowDate)
          .eq('status', 'planned');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('planting_plans')
          .update({ status: 'in_progress' })
          .eq('id', planId);
        if (error) throw error;
      }
      toast({ title: 'Posadené', description: 'Výsev bol označený ako prebieha.' });
      setIsDetailDialogOpen(false);
      await fetchPlans();
    } catch (error) {
      console.error('Error marking in_progress:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa označiť výsev.', variant: 'destructive' });
    }
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
    // ÚLOHA 4A: Paralelné fetche namiesto sekvenčného - rýchlejšie načítanie.
    // Všetky fetche sú nezávislé (čítajú rôzne tabuľky), takže Promise.all je bezpečný.
    Promise.all([
      fetchPlans(),
      fetchCrops(),
      fetchShelves(),
      fetchHarvestDays(),
      fetchFutureOrders(),
    ]).catch(err => {
      console.error('[initial-fetch] Chyba pri paralelnom načítavaní:', err);
    });
  }, [fetchPlans, fetchCrops, fetchShelves, fetchHarvestDays, fetchFutureOrders]);

  // Automatická synchronizácia plánov sadenia s objednávkami — beží ticho na pozadí.
  // Spúšťa sa raz po prvom načítaní dát (plans + futureOrders). Použijeme ref aby sa nespúšťal
  // opakovane pri každom re-rendere.
  useEffect(() => {
    // Čakáme kým sa načítajú aj plány aj objednávky
    if (loading) return;
    if (autoSyncRanRef.current) return;

    autoSyncRanRef.current = true;
    console.info('[autoSync] Spúšťam automatickú synchronizáciu plánov...');
    autoSyncPlantingPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, futureOrders.length]);

  // Predikcia — lazy load len keď user otvorí tab
  useEffect(() => {
    if ((activeTab === 'prediction' || activeTab === 'analysis') && historicalOrders.length === 0 && !loadingPrediction) {
      setLoadingPrediction(true);
      fetchHistoricalOrders().finally(() => setLoadingPrediction(false));
    }
  }, [activeTab, historicalOrders.length, loadingPrediction, fetchHistoricalOrders]);

  // Query param ?planId= — automaticky otvor detail dialog pre konkrétny plán.
  // Volá sa zo stránky Dnešné úlohy cez navigate('/planting-plan?planId={id}').
  // planId v URL je individuálne planting_plans.id; nájdeme zodpovedajúci grouped plán
  // (lebo openDetailDialog pracuje s GroupedPlantingPlan).
  useEffect(() => {
    if (!planIdFromUrl) return;
    if (plans.length === 0) return; // čakáme na načítanie plánov
    if (isDetailDialogOpen) return; // už otvorený, nedupli

    const individualPlan = plans.find(p => p.id === planIdFromUrl);
    if (!individualPlan) {
      // Plán neexistuje (možno mimo dátumového rozsahu) — odstráň query param ticho
      const params = new URLSearchParams(searchParams);
      params.delete('planId');
      setSearchParams(params, { replace: true });
      return;
    }

    // Nájdi grouped plán s rovnakým crop_id + sow_date
    const groupedPlan = groupedPlans.find(
      gp => gp.crop_id === individualPlan.crop_id && gp.sow_date === individualPlan.sow_date
    );
    if (groupedPlan) {
      openDetailDialog(groupedPlan);
      // Odstráň query param po otvorení (aby pri reload-i sa znova neotvoril nečakane)
      const params = new URLSearchParams(searchParams);
      params.delete('planId');
      setSearchParams(params, { replace: true });
    }
  }, [planIdFromUrl, plans, groupedPlans, isDetailDialogOpen, searchParams, setSearchParams]);

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
      case 'in_progress': return 'Rastie';
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
    { value: 'planned', label: 'Naplánované', count: statusCounts.planned },
    { value: 'in_progress', label: 'Rastie', count: statusCounts.in_progress },
    { value: 'completed', label: 'Dokončené', count: statusCounts.completed },
    { value: 'all', label: 'Všetky', count: statusCounts.all },
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

          {/* SEKCIA — DNES SADIŠ */}
          <TodaysSowingSection
            items={todaysSowing}
            onItemClick={(item) => {
              const plan = groupedPlans.find(p => p.crop_id === item.cropId && p.sow_date === today);
              if (plan) openDetailDialog(plan);
            }}
            onMarkDone={(item) => {
              handleMarkComplete(item.planIds[0] || '', item.cropId, today);
            }}
            onEdit={(item) => {
              const plan = groupedPlans.find(p => p.crop_id === item.cropId && p.sow_date === today);
              if (plan) openEditDialog(plan);
            }}
            onAddTray={(item) => {
              const plan = groupedPlans.find(p => p.crop_id === item.cropId && p.sow_date === today);
              if (plan) setAddTrayDialog({ open: true, plan });
            }}
            onDelete={(item) => {
              if (item.planIds[0]) setDeleteId(item.planIds[0]);
            }}
            formatDate={formatDate}
            formatGrams={formatGrams}
            isAdmin={isAdmin}
            isLoading={loading}
            allDone={todaysAllDone}
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

                {/* View mode switcher */}
                <div className="border-b border-[#e2e8f0] px-2 md:px-4 bg-white">
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {[
                      { value: 'cards', label: 'Karty', icon: LayoutGrid },
                      { value: 'list', label: 'Zoznam', icon: List, hideMobile: true },
                      { value: 'week', label: 'Týždeň', icon: CalendarDays },
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
                  ) : viewMode === 'week' ? (
                    <WeekTimelineView
                      today={today}
                      plans={groupedPlans}
                      isAdmin={isAdmin}
                      onOpenDetail={openDetailDialog}
                      onMarkComplete={handleMarkComplete}
                      onEdit={openEditDialog}
                      onDelete={(id) => setDeleteId(id)}
                      onAddTray={(plan) => setAddTrayDialog({ open: true, plan })}
                      formatDate={formatDate}
                      formatGrams={formatGrams}
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
                    <SelectContent className="z-[200]">
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
                {(() => {
                  const n = groupedEditDialog.plan?.trays?.length || 0;
                  const word = n === 1 ? 'tácku' : (n >= 2 && n <= 4 ? 'tácky' : 'tácok');
                  return `Tento výsev má ${n} ${word}. Vyberte ktorú chcete upraviť:`;
                })()}
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
                      <p className="font-bold text-[#0f172a] flex items-center gap-2">
                        {tray.count} × {tray.size}
                        {tray.size === 'S' && tray.is_manual && (
                          <span className="inline-flex items-center h-4 px-1 rounded text-[9px] font-bold bg-[#fef3c7] text-[#92400e]">
                            S-tácka (manuálna)
                          </span>
                        )}
                      </p>
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
                        if (checked === true) {
                          // Predvyplniť prvú plodinu z aktuálne vybranej
                          setMixCrops([
                            { cropId: selectedCropId || '', percentage: 50 },
                            { cropId: '', percentage: 50 },
                          ]);
                        } else {
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
                      <SelectContent className="z-[200]">
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
                            <SelectContent className="z-[200]">
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
                      <SelectContent className="z-[200]">
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

// --- Sekcia: Dnes sadiš ---
interface TodaysSowingSectionProps {
  items: TodaysSowingItem[];
  onItemClick: (item: TodaysSowingItem) => void;
  onMarkDone: (item: TodaysSowingItem) => void;
  onEdit: (item: TodaysSowingItem) => void;
  onAddTray: (item: TodaysSowingItem) => void;
  onDelete: (item: TodaysSowingItem) => void;
  formatDate: (d: string) => string;
  formatGrams: (g: number) => number;
  isAdmin: boolean;
  isLoading?: boolean;
  // Ak true, znamená že na dnes existujú výsevy ale všetky sú už posadené/dokončené.
  allDone?: boolean;
}

const TodaysSowingSection = ({ items, onItemClick, onMarkDone, onEdit, onAddTray, onDelete, formatDate, formatGrams, isAdmin, isLoading, allDone }: TodaysSowingSectionProps) => {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // ÚLOHA 4C: Loading skeleton — zobrazí sa kým sa nenačítajú dáta.
  // Predtým UI vyzeralo zamrznuté lebo komponent jednoducho nezobrazil nič.
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
        <div className="bg-[#f0fdf4] border-b border-[#bbf7d0] px-4 py-3 flex items-center gap-2">
          <Sprout className="h-4 w-4 text-[#16a34a] flex-shrink-0" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-[#e2e8f0] p-3">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    // Variant A: existujú dnešné výsevy ale všetky sú už posadené/dokončené → zelený "hotovo"
    if (allDone) {
      return (
        <div className="bg-[#f0fdf4] rounded-xl border border-[#bbf7d0] shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-5 w-5 text-[#16a34a]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0f172a]">Na dnes sú všetky výsevy posadené ✓</h3>
            <p className="text-xs text-[#475569]">Pokračuj v ďalších úlohách.</p>
          </div>
        </div>
      );
    }
    // Variant B: vôbec žiadne výsevy na dnes → neutrálne sivé
    return (
      <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
          <CalendarDays className="h-5 w-5 text-[#94a3b8]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#0f172a]">Dnes nie sú naplánované žiadne výsevy</h3>
          <p className="text-xs text-[#475569]">Užite si voľnejší deň.</p>
        </div>
      </div>
    );
  }

  const totalTrays = items.reduce((sum, i) => sum + i.trays.reduce((s, t) => s + t.count, 0), 0);
  const totalGrams = items.reduce((sum, i) => sum + i.totalGrams, 0);

  return (
    <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#f0fdf4] border-b border-[#bbf7d0] px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sprout className="h-4 w-4 text-[#16a34a] flex-shrink-0" />
          <h3 className="text-sm font-bold text-[#0f172a]">Dnes sadíš</h3>
          <span className="text-xs text-[#475569] font-semibold">
            {items.length} {items.length === 1 ? 'plodina' : (items.length >= 2 && items.length <= 4 ? 'plodiny' : 'plodín')} • {totalTrays} {totalTrays === 1 ? 'tácka' : (totalTrays >= 2 && totalTrays <= 4 ? 'tácky' : 'tácok')} • {formatGrams(totalGrams)}g
          </span>
        </div>
        {/* View switcher */}
        <div className="flex items-center rounded-lg border border-[#e2e8f0] overflow-hidden bg-white">
          <button
            onClick={() => setViewMode('cards')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-colors',
              viewMode === 'cards' ? 'bg-[#16a34a] text-white' : 'text-[#475569] hover:text-[#0f172a]'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Karty</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-colors border-l border-[#e2e8f0]',
              viewMode === 'list' ? 'bg-[#16a34a] text-white' : 'text-[#475569] hover:text-[#0f172a]'
            )}
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Zoznam</span>
          </button>
        </div>
      </div>

      {/* Cards view */}
      {viewMode === 'cards' && (
        <div className="p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={cn(
                'bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all',
                item.isManual ? 'border-[#fcd34d] hover:border-[#f59e0b]' : 'border-[#cbd5e1] hover:border-[#bbf7d0]'
              )}
              onClick={() => onItemClick(item)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{ backgroundColor: `${item.cropColor}15`, borderColor: `${item.cropColor}30` }}
                >
                  <Sprout className="h-5 w-5" style={{ color: item.cropColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-[#0f172a] truncate">{item.cropName}</h3>
                    {item.isManual && <Pencil className="h-3 w-3 text-[#f59e0b] flex-shrink-0" />}
                  </div>
                </div>
              </div>

              {/* Tácky — každá na vlastnom riadku s gramážou vpravo */}
              <div className="space-y-1 mb-3">
                {sortTrayCombinations(item.trays).map((t, tIdx) => (
                  <div key={tIdx} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0f172a]">{t.count} × {t.size}</span>
                    <span className="text-[#475569]">{formatGrams(t.seeds_per_tray)}g/tácka</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-[#475569]">Zber:</span>
                <span className="font-semibold text-[#0f172a]">{item.harvestDate ? formatDate(item.harvestDate) : '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-[#475569]">Semená:</span>
                <span className="font-bold text-[#16a34a]">{formatGrams(item.totalGrams)}g</span>
              </div>
              <div className="flex items-center gap-1 pt-3 border-t border-[#e2e8f0]" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onMarkDone(item)}
                  disabled={!isAdmin}
                  className="flex-1 h-9 rounded-md border-2 border-[#16a34a] text-[#16a34a] hover:bg-[#f0fdf4] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Circle className="h-3.5 w-3.5" />
                  Hotovo
                </button>
                <button
                  onClick={() => onAddTray(item)}
                  disabled={!isAdmin}
                  title="Pridať tácku"
                  className="h-9 w-9 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] disabled:opacity-50 flex items-center justify-center transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onEdit(item)}
                  disabled={!isAdmin}
                  className="h-9 w-9 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] disabled:opacity-50 flex items-center justify-center transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(item)}
                  disabled={!isAdmin}
                  className="h-9 w-9 rounded-md border border-[#e2e8f0] text-[#dc2626] hover:border-[#fecaca] hover:bg-[#fef2f2] disabled:opacity-50 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="divide-y divide-[#e2e8f0]">
          {items.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onItemClick(item)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f8fafc] transition-colors',
                item.isManual && 'border-l-4 border-l-[#f59e0b]'
              )}
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{ backgroundColor: `${item.cropColor}15`, borderColor: `${item.cropColor}30` }}
              >
                <Sprout className="h-5 w-5" style={{ color: item.cropColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-bold text-sm text-[#0f172a] truncate">{item.cropName}</span>
                  {item.isManual && <Pencil className="h-3 w-3 text-[#f59e0b] flex-shrink-0" />}
                </div>
                <div className="space-y-0.5">
                  {sortTrayCombinations(item.trays).map((t, tIdx) => (
                    <div key={tIdx} className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[#0f172a]">{t.count} × {t.size}</span>
                      <span className="text-[#475569]">· {formatGrams(t.seeds_per_tray)}g/tácka</span>
                    </div>
                  ))}
                  {item.harvestDate && (
                    <p className="text-[11px] text-[#475569]">zber {formatDate(item.harvestDate)}</p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0 mr-3">
                <p className="text-xs font-bold text-[#16a34a]">{formatGrams(item.totalGrams)}g</p>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onMarkDone(item)}
                  disabled={!isAdmin}
                  className="h-9 px-3 rounded-md border-2 border-[#16a34a] text-[#16a34a] hover:bg-[#f0fdf4] text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Circle className="h-3.5 w-3.5" />
                  Hotovo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
            {lateOrders.length} {lateOrders.length === 1 ? 'objednávku' : (lateOrders.length >= 2 && lateOrders.length <= 4 ? 'objednávky' : 'objednávok')} nestihneš vypestovať
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


// ===================== WEEK TIMELINE VIEW =====================

interface WeekTimelineViewProps {
  today: string;
  plans: GroupedPlantingPlan[];
  isAdmin: boolean;
  onOpenDetail: (plan: GroupedPlantingPlan) => void;
  onMarkComplete: (planId: string, cropId?: string, sowDate?: string) => void;
  onEdit: (plan: GroupedPlantingPlan) => void;
  onDelete: (id: string) => void;
  onAddTray: (plan: GroupedPlantingPlan) => void;
  formatDate: (d: string) => string;
  formatGrams: (n: number) => string;
}

const SK_DAYS_SHORT = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
const SK_MONTHS_GEN = [
  'januára', 'februára', 'marca', 'apríla', 'mája', 'júna',
  'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'
];

// Vráti dátum pondelka týždňa pre daný dátum (ISO týždeň — pondelok ako prvý deň)
const getMonday = (d: Date): Date => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  // getDay: 0=Ne, 1=Po, ..., 6=So → posun na pondelok
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const formatWeekRange = (monday: Date): string => {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const sameYear = monday.getFullYear() === sunday.getFullYear();
  if (sameMonth && sameYear) {
    return `${monday.getDate()}. – ${sunday.getDate()}. ${SK_MONTHS_GEN[monday.getMonth()]} ${monday.getFullYear()}`;
  }
  if (sameYear) {
    return `${monday.getDate()}. ${SK_MONTHS_GEN[monday.getMonth()]} – ${sunday.getDate()}. ${SK_MONTHS_GEN[sunday.getMonth()]} ${monday.getFullYear()}`;
  }
  return `${monday.getDate()}. ${SK_MONTHS_GEN[monday.getMonth()]} ${monday.getFullYear()} – ${sunday.getDate()}. ${SK_MONTHS_GEN[sunday.getMonth()]} ${sunday.getFullYear()}`;
};

const WeekTimelineView = ({
  today,
  plans, isAdmin, onOpenDetail, onMarkComplete, onEdit, onDelete, onAddTray, formatDate, formatGrams,
}: WeekTimelineViewProps) => {
  const [weekOffset, setWeekOffset] = useState(0);

  // Pondelok aktuálneho zobrazeného týždňa
  const monday = useMemo(() => {
    const today = new Date();
    const m = getMonday(today);
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  }, [weekOffset]);

  const todayStr = today; // z parent prop — aktualizuje sa po polnoci

  // 7 dní týždňa (Po–Ne) ako ISO dátum stringy
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().split('T')[0];
    });
  }, [monday]);

  // Skupiny plánov po dňoch sow_date
  // Filtrujeme: len planned + in_progress (nie completed)
  const plansByDay = useMemo(() => {
    const acc: Record<string, GroupedPlantingPlan[]> = {};
    weekDays.forEach(d => { acc[d] = []; });
    plans.forEach(p => {
      if (p.status === 'completed' || p.status === 'cancelled') return;
      if (acc[p.sow_date]) {
        acc[p.sow_date].push(p);
      }
    });
    return acc;
  }, [plans, weekDays]);

  // Súhrn za týždeň
  const weekSummary = useMemo(() => {
    let totalPlans = 0;
    let totalGrams = 0;
    const harvestDates = new Set<string>();
    weekDays.forEach(d => {
      plansByDay[d].forEach(p => {
        totalPlans++;
        totalGrams += p.total_seed_grams || 0;
        if (p.expected_harvest_date) harvestDates.add(p.expected_harvest_date);
      });
    });
    // Najbližší zber z týchto plánov
    const sortedHarvest = Array.from(harvestDates).sort();
    const nextHarvest = sortedHarvest[0];
    return { totalPlans, totalGrams, nextHarvest };
  }, [plansByDay, weekDays]);

  // Dni s výsevmi vs. prázdne
  const daysWithPlans = weekDays.filter(d => plansByDay[d].length > 0);
  const emptyDays = weekDays.filter(d => plansByDay[d].length === 0);

  // Dnešok zostatok
  const todayRemaining = useMemo(() => {
    const todayPlans = plansByDay[todayStr] || [];
    return todayPlans.filter(p => p.status === 'planned').length;
  }, [plansByDay, todayStr]);

  const formatNextHarvest = (dateStr: string | undefined): string => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.getDate()}. ${SK_MONTHS_GEN[d.getMonth()]}`;
  };

  return (
    <div className="space-y-3">
      {/* Navigácia */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-lg border border-[#e2e8f0] px-3 py-2">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="h-9 px-3 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Predchádzajúci
        </button>
        <div className="flex flex-col items-center min-w-0">
          <span className="text-sm font-bold text-[#0f172a] truncate">{formatWeekRange(monday)}</span>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-[11px] text-[#16a34a] hover:underline"
            >
              Späť na tento týždeň
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="h-9 px-3 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          Nasledujúci
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Summary bar */}
      <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-3 py-2.5">
        <p className="text-xs text-[#0f172a]">
          <span className="font-bold">Tento týždeň</span>
          {' · '}
          <span className="font-bold text-[#16a34a]">{weekSummary.totalPlans}</span> výsevov
          {' · '}
          <span className="font-bold text-[#16a34a]">{formatGrams(weekSummary.totalGrams)}g</span> semien
          {weekSummary.nextHarvest && (
            <>{' · '}Zber: <span className="font-bold text-[#16a34a]">{formatNextHarvest(weekSummary.nextHarvest)}</span></>
          )}
        </p>
      </div>

      {/* Timeline */}
      {daysWithPlans.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[#f1f5f9] flex items-center justify-center mb-3">
            <CalendarDays className="h-6 w-6 text-[#94a3b8]" />
          </div>
          <h3 className="text-sm font-bold text-[#0f172a] mb-1">Žiadne výsevy v tomto týždni</h3>
          <p className="text-xs text-[#475569]">Skús iný týždeň alebo pridaj nový výsev.</p>
        </div>
      ) : (
        <div className="relative pl-8">
          {/* Vertikálna čiara */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[#e2e8f0]" />

          <div className="space-y-4">
            {daysWithPlans.map(dayStr => {
              const dayPlans = plansByDay[dayStr];
              const date = new Date(dayStr);
              const isToday = dayStr === todayStr;
              const dayName = SK_DAYS_SHORT[date.getDay()];
              const totalDayGrams = dayPlans.reduce((sum, p) => sum + (p.total_seed_grams || 0), 0);

              return (
                <div key={dayStr} className="relative">
                  {/* Bodka na osi */}
                  <div
                    className={cn(
                      'absolute -left-[26px] top-1 w-4 h-4 rounded-full border-2 z-10',
                      isToday
                        ? 'bg-[#16a34a] border-[#16a34a] ring-4 ring-[#bbf7d0]'
                        : 'bg-white border-[#cbd5e1]'
                    )}
                  />

                  {/* Hlavička dňa */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={cn(
                      'text-xs font-bold uppercase tracking-wide',
                      isToday ? 'text-[#16a34a]' : 'text-[#475569]'
                    )}>
                      {dayName}
                    </span>
                    <span className={cn(
                      'text-lg font-bold',
                      isToday ? 'text-[#16a34a]' : 'text-[#0f172a]'
                    )}>
                      {date.getDate()}.
                    </span>
                    {totalDayGrams > 0 && (
                      <span className="text-[11px] text-[#475569]">
                        {formatGrams(totalDayGrams)}g semien
                      </span>
                    )}
                    {isToday && (
                      <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#16a34a] text-white text-[10px] font-bold">
                        DNES
                      </span>
                    )}
                  </div>

                  {/* Crop pills pre tento deň */}
                  <div className="space-y-2">
                    {dayPlans.map(plan => {
                      const cropColor = plan.crops?.color || '#16a34a';
                      const isCompleted = plan.status === 'completed';
                      const isInProgress = plan.status === 'in_progress';
                      const planGrams = plan.total_seed_grams || 0;

                      return (
                        <div
                          key={plan.id}
                          onClick={() => onOpenDetail(plan)}
                          className={cn(
                            'bg-white rounded-lg border shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all flex',
                            isToday ? 'border-[#bbf7d0]' : 'border-[#e2e8f0] hover:border-[#bbf7d0]',
                            plan.is_manual && 'ring-1 ring-[#fcd34d]'
                          )}
                        >
                          {/* Farebný pruh vľavo */}
                          <div
                            className="w-1 flex-shrink-0"
                            style={{ backgroundColor: cropColor }}
                          />

                          <div className="flex-1 min-w-0 p-3 flex items-center gap-3">
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Sprout className="h-3.5 w-3.5 flex-shrink-0" style={{ color: cropColor }} />
                                <span className="text-sm font-bold text-[#0f172a] truncate">
                                  {plan.crops?.name || 'Neznáma'}
                                </span>
                                {plan.is_manual && <Pencil className="h-3 w-3 text-[#f59e0b] flex-shrink-0" />}
                                {isInProgress && (
                                  <span className="inline-flex items-center h-4 px-1 rounded text-[9px] font-bold bg-[#dcfce7] text-[#166534]">
                                    RASTIE
                                  </span>
                                )}
                              </div>

                              {/* Tray chips */}
                              <div className="flex flex-wrap gap-1.5">
                                {sortTrayCombinations(plan.trays).map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center h-6 px-2 rounded-full bg-[#f8fafc] border border-[#e2e8f0] text-[11px]"
                                  >
                                    <span className="font-bold text-[#0f172a]">{t.count} × {t.size}</span>
                                    <span className="text-[#475569] ml-1.5">· {formatGrams(t.seeds_per_tray)}g</span>
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Pravý súhrn + akcie */}
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <span className="text-sm font-bold text-[#16a34a] whitespace-nowrap">
                                {formatGrams(planGrams)}g
                              </span>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => onMarkComplete(plan.id, plan.crop_id, plan.sow_date)}
                                  disabled={!isAdmin || isCompleted}
                                  title={isInProgress ? 'Posadené' : 'Hotovo'}
                                  className={cn(
                                    'min-h-[32px] h-8 px-3 rounded-full border-2 flex items-center justify-center gap-1 text-[11px] font-semibold transition-colors disabled:opacity-50',
                                    isInProgress
                                      ? 'border-[#16a34a] bg-[#dcfce7] text-[#166534]'
                                      : 'border-[#16a34a] bg-white text-[#16a34a] hover:bg-[#f0fdf4]'
                                  )}
                                >
                                  {isInProgress ? <CheckCircle className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                                  {isInProgress ? 'Rastie' : 'Hotovo'}
                                </button>
                                <button
                                  onClick={() => onAddTray(plan)}
                                  disabled={!isAdmin}
                                  title="Pridať tácku"
                                  className="h-7 w-7 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] disabled:opacity-50 flex items-center justify-center transition-colors"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => onEdit(plan)}
                                  disabled={!isAdmin}
                                  title="Upraviť"
                                  className="h-7 w-7 rounded-md border border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] disabled:opacity-50 flex items-center justify-center transition-colors"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => onDelete(plan.id)}
                                  disabled={!isAdmin}
                                  title="Zmazať"
                                  className="h-7 w-7 rounded-md border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2] disabled:opacity-50 flex items-center justify-center transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Súhrnný riadok prázdnych dní */}
            {emptyDays.length > 0 && (
              <div className="relative">
                <div className="absolute -left-[24px] top-1 w-2.5 h-2.5 rounded-full bg-[#cbd5e1]" />
                <div className="text-xs text-[#94a3b8] italic pt-0.5">
                  {emptyDays.map(d => SK_DAYS_SHORT[new Date(d).getDay()]).join(', ')} — žiadne výsevy
                </div>
              </div>
            )}
          </div>
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
                  <span className="truncate font-bold text-[#0f172a]">
                    {sortTrayCombinations(plan.trays).map(t => `${t.count} × ${t.size}`).join(', ')}
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
                    <span className={cn('font-bold flex items-center gap-1.5', tray.is_manual ? 'text-[#d97706]' : 'text-[#0f172a]')}>
                      {tray.is_manual && '✎ '}{tray.count} × {tray.size}
                      {tray.size === 'S' && tray.is_manual && (
                        <span className="inline-flex items-center h-4 px-1 rounded text-[9px] font-bold bg-[#fef3c7] text-[#92400e]">
                          S-tácka (manuálna)
                        </span>
                      )}
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
                    'flex-1 h-9 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50',
                    plan.status === 'completed'
                      ? 'bg-[#16a34a] hover:bg-[#15803d] text-white'
                      : plan.status === 'in_progress'
                      ? 'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] hover:bg-[#bbf7d0]'
                      : 'border-2 border-[#16a34a] text-[#16a34a] hover:bg-[#f0fdf4]'
                  )}
                >
                  {plan.status === 'completed'
                    ? <CheckCircle className="h-3.5 w-3.5" />
                    : plan.status === 'in_progress'
                    ? <CheckCircle className="h-3.5 w-3.5" />
                    : <Circle className="h-3.5 w-3.5" />
                  }
                  <span>{plan.status === 'completed' ? 'Hotové' : plan.status === 'in_progress' ? 'Rastie' : 'Hotovo'}</span>
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
                      <span key={idx} className="text-[#0f172a] font-bold text-xs">{tray.count} × {tray.size}</span>
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
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() =>
                        plan.status === 'completed'
                          ? onMarkPlanned(plan.id, plan.crop_id, plan.sow_date)
                          : onMarkComplete(plan.id, plan.crop_id, plan.sow_date)
                      }
                      disabled={!isAdmin}
                      className={cn(
                        'min-h-[36px] h-9 px-4 rounded-full border-2 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
                        plan.status === 'completed'
                          ? 'border-[#16a34a] bg-[#16a34a] text-white hover:bg-[#15803d]'
                          : plan.status === 'in_progress'
                          ? 'border-[#16a34a] bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]'
                          : 'border-[#16a34a] bg-white text-[#16a34a] hover:bg-[#f0fdf4]'
                      )}
                    >
                      {plan.status === 'completed'
                        ? <CheckCircle className="h-3.5 w-3.5" />
                        : plan.status === 'in_progress'
                        ? <CheckCircle className="h-3.5 w-3.5" />
                        : <Circle className="h-3.5 w-3.5" />
                      }
                      <span>{plan.status === 'completed' ? 'Hotové' : plan.status === 'in_progress' ? 'Rastie' : 'Hotovo'}</span>
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
          <span className="font-bold text-[#0f172a]">{dayPlans.length}</span> {dayPlans.length === 1 ? 'deň' : (dayPlans.length >= 2 && dayPlans.length <= 4 ? 'dni' : 'dní')} v pláne
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
                          {sortTrayCombinations(item.trays).map(t => `${t.count} × ${t.size}`).join(', ')}
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
                    <span className="text-[10px] text-[#475569] w-12">Klíčenie:</span>
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
            <p className="text-xs font-bold text-[#0f172a]">Riziko: nestihneš zber</p>
            <p className="text-xs text-[#475569]">
              Do zberu zostáva {daysUntilHarvest} {daysUntilHarvest === 1 ? 'deň' : (daysUntilHarvest >= 2 && daysUntilHarvest <= 4 ? 'dni' : 'dní')}, ale plodina potrebuje {daysToHarvest} {daysToHarvest === 1 ? 'deň' : (daysToHarvest >= 2 && daysToHarvest <= 4 ? 'dni' : 'dní')}.
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
          <p className="text-sm font-bold text-[#0f172a]">{daysToHarvest} {daysToHarvest === 1 ? 'deň' : (daysToHarvest >= 2 && daysToHarvest <= 4 ? 'dni' : 'dní')}</p>
        </div>
        <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">Klíčenie / Tma / Svetlo</p>
          <p className="text-sm font-bold text-[#0f172a]">
            {plan.crops?.days_to_germination ?? 0}d / {plan.crops?.days_in_darkness ?? 0}d / {plan.crops?.days_on_light ?? 0}d
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

      {/* Source orders — záložky podľa customer_type + klik = link na /orders */}
      {sourceOrderDetails.length > 0 && (
        <SourceOrdersSection
          orders={sourceOrderDetails}
          cropId={plan.crop_id}
          formatDate={formatDate}
        />
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

// ===================== SOURCE ORDERS SECTION =====================

interface SourceOrdersSectionProps {
  orders: OrderForPlanning[];
  cropId: string;
  formatDate: (d: string) => string;
}

type CustomerTypeFilter = 'all' | 'home' | 'gastro' | 'wholesale';

const CUSTOMER_TYPE_TABS: Array<{ id: CustomerTypeFilter; label: string }> = [
  { id: 'all', label: 'Všetky' },
  { id: 'home', label: 'Domáci' },
  { id: 'gastro', label: 'Gastro' },
  { id: 'wholesale', label: 'VO' },
];

// Zistí gramáž objednávky pre konkrétnu plodinu. Sčíta:
// 1) Priame položky s crop_id === cropId
// 2) Položky s blend_id — REKURZÍVNA expanzia na leaf plodiny cez expandBlendToLeafCrops.
//    Podporuje sub-blendy (isBlend === true) do max depth 5.
const calcOrderGramsForCrop = (
  order: OrderForPlanning,
  cropId: string,
  blendsMap: Record<string, any> = {}
): number => {
  return (order.order_items || []).reduce((sum: number, it: any) => {
    const itemGrams = parseFloat((it.packaging_size || '').replace(/[^0-9.]/g, '') || '0') * (it.quantity || 0);

    // Priama plodina
    if (it.crop_id === cropId) {
      return sum + itemGrams;
    }

    // Mix — rekurzívna expanzia a započítanie všetkých výskytov danej plodiny
    if (it.blend_id && blendsMap[it.blend_id] && itemGrams > 0) {
      const leaves = expandBlendToLeafCrops(it.blend_id, itemGrams, blendsMap, 0);
      const cropGrams = leaves
        .filter(l => l.cropId === cropId)
        .reduce((s, l) => s + l.grams, 0);
      return sum + cropGrams;
    }

    return sum;
  }, 0);
};

// Mapuje customer_type string z DB na 1 z 3 kategórií.
// Podporuje rôzne varianty (case-insensitive, anglické aj slovenské skratky).
const normalizeCustomerType = (raw: string | null | undefined): 'home' | 'gastro' | 'wholesale' => {
  if (!raw) return 'home';
  const t = raw.toLowerCase().trim();
  if (t === 'gastro' || t === 'restaurant' || t === 'reštaurácia') return 'gastro';
  if (t === 'wholesale' || t === 'vo' || t === 'veľkoodber' || t === 'velkoodber' || t === 'b2b') return 'wholesale';
  return 'home';
};

const SourceOrdersSection = ({ orders, cropId, formatDate }: SourceOrdersSectionProps) => {
  const [activeTab, setActiveTab] = useState<CustomerTypeFilter>('all');
  // Order detail dialog state — interný v sekcii, otvára sa pri kliknutí na riadok
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  // Blends map — fetchneme VŠETKY blendy z DB (nielen priame z order_items),
  // pretože sub-blendy môžu byť hocijaký iný blend. Bez nich by sa rekurzia
  // v calcOrderGramsForCrop / expandBlendToLeafCrops nepodarila.
  const [blendsMap, setBlendsMap] = useState<Record<string, any>>({});

  useEffect(() => {
    // Optimalizácia: ak žiadna objednávka neobsahuje blend_id, ani nefetchujeme.
    const hasAnyBlend = orders.some(o =>
      (o.order_items || []).some((it: any) => it.blend_id)
    );
    if (!hasAnyBlend) {
      setBlendsMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      // Fetch VŠETKY blends — pre prípad sub-blend referencií.
      const { data, error } = await supabase
        .from('blends')
        .select('id, name, crop_ids, crop_percentages');
      if (cancelled) return;
      if (error) {
        console.warn('[SourceOrdersSection] blends fetch failed:', error);
        return;
      }
      const map: Record<string, any> = {};
      (data || []).forEach((b: any) => { map[b.id] = b; });
      setBlendsMap(map);
    })();
    return () => { cancelled = true; };
  }, [orders]);

  // Klasifikuj objednávky podľa customer_type
  const classified = useMemo(() => {
    const home: OrderForPlanning[] = [];
    const gastro: OrderForPlanning[] = [];
    const wholesale: OrderForPlanning[] = [];
    orders.forEach(o => {
      const type = normalizeCustomerType(o.customers?.customer_type);
      if (type === 'home') home.push(o);
      else if (type === 'gastro') gastro.push(o);
      else wholesale.push(o);
    });
    return { home, gastro, wholesale };
  }, [orders]);

  // Súhrn gramov podľa typu — pre danú plodinu (cropId), vrátane podielu z mixov
  const totals = useMemo(() => {
    const sumGrams = (list: OrderForPlanning[]) =>
      list.reduce((acc, o) => acc + calcOrderGramsForCrop(o, cropId, blendsMap), 0);
    return {
      home: Math.round(sumGrams(classified.home)),
      gastro: Math.round(sumGrams(classified.gastro)),
      wholesale: Math.round(sumGrams(classified.wholesale)),
      all: Math.round(sumGrams(orders)),
    };
  }, [classified, orders, cropId, blendsMap]);

  // Filtrovaný zoznam podľa aktívnej záložky
  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    return classified[activeTab];
  }, [activeTab, classified, orders]);

  // Počty pre badge v záložkách
  const counts: Record<CustomerTypeFilter, number> = {
    all: orders.length,
    home: classified.home.length,
    gastro: classified.gastro.length,
    wholesale: classified.wholesale.length,
  };

  const handleOrderClick = (orderId: string) => {
    setOpenOrderId(orderId);
  };

  return (
    <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
      <h3 className="text-xs font-bold text-[#0f172a] mb-2 flex items-center gap-1.5">
        <Package className="h-3.5 w-3.5 text-[#16a34a]" />
        Zdroj objednávok ({orders.length})
      </h3>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-2 border-b border-[#e2e8f0] overflow-x-auto">
        {CUSTOMER_TYPE_TABS.map(tab => {
          const active = activeTab === tab.id;
          const c = counts[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold border-b-2 transition-colors whitespace-nowrap',
                active
                  ? 'border-[#16a34a] text-[#16a34a]'
                  : 'border-transparent text-[#475569] hover:text-[#0f172a]'
              )}
            >
              {tab.label}
              <span className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                active ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-[#f1f5f9] text-[#475569]'
              )}>
                {c}
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary by type — vždy viditeľný */}
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        <div className="bg-[#f8fafc] rounded-md border border-[#e2e8f0] p-1.5 text-center">
          <p className="text-[9px] text-[#475569] uppercase tracking-wide font-semibold">Spolu</p>
          <p className="text-xs font-bold text-[#0f172a]">{totals.all}g</p>
        </div>
        <div className="bg-[#f8fafc] rounded-md border border-[#e2e8f0] p-1.5 text-center">
          <p className="text-[9px] text-[#475569] uppercase tracking-wide font-semibold">Domáci</p>
          <p className="text-xs font-bold text-[#0f172a]">{totals.home}g</p>
        </div>
        <div className="bg-[#f8fafc] rounded-md border border-[#e2e8f0] p-1.5 text-center">
          <p className="text-[9px] text-[#475569] uppercase tracking-wide font-semibold">Gastro</p>
          <p className="text-xs font-bold text-[#0f172a]">{totals.gastro}g</p>
        </div>
        <div className="bg-[#f8fafc] rounded-md border border-[#e2e8f0] p-1.5 text-center">
          <p className="text-[9px] text-[#475569] uppercase tracking-wide font-semibold">VO</p>
          <p className="text-xs font-bold text-[#0f172a]">{totals.wholesale}g</p>
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-1.5">
        {filteredOrders.length === 0 ? (
          <p className="text-xs text-[#475569] text-center py-3">Žiadne objednávky v tejto kategórii.</p>
        ) : (
          filteredOrders.map((order, idx) => {
            const grams = calcOrderGramsForCrop(order, cropId, blendsMap);
            const hasMix = (order.order_items || []).some((it: any) => it.blend_id);
            return (
              <button
                key={order.id || idx}
                onClick={() => handleOrderClick(order.id)}
                className="w-full flex items-center justify-between text-xs border-b border-[#e2e8f0] last:border-0 pb-1.5 last:pb-0 hover:bg-[#f8fafc] rounded-md px-1.5 -mx-1.5 py-1 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-mono font-bold text-[#16a34a] flex-shrink-0">
                    {formatOrderNumber(order.order_number)}
                  </span>
                  <span className="text-[#0f172a] font-semibold truncate">{order.customer_name || 'Neznámy'}</span>
                  {hasMix && (
                    <span className="inline-flex items-center h-4 px-1 rounded text-[9px] font-bold bg-[#fef3c7] text-[#92400e] flex-shrink-0">
                      +MIX
                    </span>
                  )}
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-1.5">
                  <span className="text-[#475569]">{formatDate(order.delivery_date)}</span>
                  {grams > 0 && <span className="text-[#0f172a] font-bold">{Math.round(grams)}g</span>}
                  <ChevronRight className="h-3.5 w-3.5 text-[#94a3b8]" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Order detail dialog — interný v sekcii */}
      <OrderDetailDialog
        orderId={openOrderId}
        onClose={() => setOpenOrderId(null)}
        formatDate={formatDate}
      />
    </div>
  );
};

// ===================== ORDER DETAIL DIALOG =====================

interface OrderDetailDialogProps {
  orderId: string | null;
  onClose: () => void;
  formatDate: (d: string) => string;
}

interface OrderDetailData {
  id: string;
  order_number: number;
  customer_name: string | null;
  customer_id: string | null;
  delivery_date: string;
  status: string;
  delivery_form?: string | null;
  notes?: string | null;
  customers?: { id: string; customer_type: string | null } | null;
  order_items: Array<{
    id: string;
    crop_id: string | null;
    blend_id: string | null;
    quantity: number;
    packaging_size: string | null;
    crops?: { id: string; name: string; color: string | null } | null;
    blends?: { id: string; name: string } | null;
  }>;
}

const ORDER_STATUS_LABELS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Čaká na potvrdenie', bg: '#fef3c7', fg: '#92400e' },
  pending_approval: { label: 'Čaká na potvrdenie', bg: '#fef3c7', fg: '#92400e' },
  cakajuca: { label: 'Čaká na potvrdenie', bg: '#fef3c7', fg: '#92400e' },
  confirmed: { label: 'Potvrdená', bg: '#dbeafe', fg: '#1e40af' },
  potvrdena: { label: 'Potvrdená', bg: '#dbeafe', fg: '#1e40af' },
  growing: { label: 'Pestuje sa', bg: '#dcfce7', fg: '#166534' },
  packed: { label: 'Zabalená', bg: '#dcfce7', fg: '#166534' },
  pripravena: { label: 'Pripravená', bg: '#dcfce7', fg: '#166534' },
  on_the_way: { label: 'Na ceste', bg: '#dbeafe', fg: '#1e40af' },
  delivered: { label: 'Doručená', bg: '#d1fae5', fg: '#064e3b' },
  cancelled: { label: 'Zrušená', bg: '#fee2e2', fg: '#991b1b' },
};

const OrderDetailDialog = ({ orderId, onClose, formatDate }: OrderDetailDialogProps) => {
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select(`
            id, order_number, customer_name, customer_id, delivery_date, status, delivery_form, notes,
            customers:customer_id ( id, customer_type ),
            order_items (
              id, crop_id, blend_id, quantity, packaging_size,
              crops:crop_id ( id, name, color ),
              blends:blend_id ( id, name )
            )
          `)
          .eq('id', orderId)
          .single();

        if (cancelled) return;
        if (fetchError) throw fetchError;
        setOrder(data as unknown as OrderDetailData);
      } catch (err: any) {
        if (cancelled) return;
        console.error('Order fetch error:', err);
        setError(err?.message || 'Nepodarilo sa načítať objednávku.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [orderId]);

  const isOpen = orderId !== null;

  // Sumár — celková gramáž
  const totalGrams = useMemo(() => {
    if (!order) return 0;
    return order.order_items.reduce((sum, it) => {
      const g = parseFloat((it.packaging_size || '').replace(/[^0-9.]/g, '') || '0');
      return sum + g * (it.quantity || 0);
    }, 0);
  }, [order]);

  const statusStyle = order ? (ORDER_STATUS_LABELS[order.status] || { label: order.status, bg: '#f1f5f9', fg: '#475569' }) : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#0f172a] flex items-center gap-2">
            <Package className="h-5 w-5 text-[#16a34a]" />
            {order ? (
              <>
                <span className="font-mono">{formatOrderNumber(order.order_number)}</span>
                <span className="text-sm font-normal text-[#475569]">— {order.customer_name || 'Neznámy'}</span>
              </>
            ) : (
              'Detail objednávky'
            )}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-8 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#16a34a]" />
            <p className="text-xs text-[#475569]">Načítavam objednávku...</p>
          </div>
        )}

        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-[#dc2626] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#0f172a]">{error}</p>
          </div>
        )}

        {!loading && !error && order && (
          <div className="space-y-3">
            {/* Stav + dátum doručenia */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-1">Stav</p>
                {statusStyle && (
                  <span
                    className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: statusStyle.bg, color: statusStyle.fg }}
                  >
                    {statusStyle.label}
                  </span>
                )}
              </div>
              <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-1">Doručenie</p>
                <p className="text-sm font-bold text-[#0f172a]">{formatDate(order.delivery_date)}</p>
              </div>
            </div>

            {/* Forma doručenia + zákazník typ */}
            {(order.delivery_form || order.customers?.customer_type) && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {order.delivery_form && (
                  <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#dbeafe] text-[#1e40af] font-bold">
                    {order.delivery_form === 'cut' ? 'Zrezaná' : (order.delivery_form === 'live' ? 'Živá' : order.delivery_form)}
                  </span>
                )}
                {order.customers?.customer_type && (
                  <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#ede9fe] text-[#7c3aed] font-bold">
                    {normalizeCustomerType(order.customers.customer_type) === 'home' ? 'Domáci'
                      : normalizeCustomerType(order.customers.customer_type) === 'gastro' ? 'Gastro' : 'VO'}
                  </span>
                )}
              </div>
            )}

            {/* Položky objednávky */}
            <div>
              <h3 className="text-xs font-bold text-[#0f172a] mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-[#16a34a]" />
                  Položky ({order.order_items.length})
                </span>
                <span className="text-[10px] text-[#475569] font-semibold">
                  Spolu: <span className="text-[#0f172a] font-bold">{Math.round(totalGrams)}g</span>
                </span>
              </h3>
              <div className="space-y-1.5">
                {order.order_items.map(item => {
                  const gPerPack = parseFloat((item.packaging_size || '').replace(/[^0-9.]/g, '') || '0');
                  const totalG = gPerPack * (item.quantity || 0);
                  const name = item.crops?.name || item.blends?.name || 'Neznámy';
                  const isBlend = !!item.blend_id;
                  const color = item.crops?.color || '#16a34a';
                  return (
                    <div key={item.id} className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-2 flex items-center gap-2">
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center border"
                        style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}
                      >
                        {isBlend ? (
                          <Layers className="h-3.5 w-3.5" style={{ color }} />
                        ) : (
                          <Sprout className="h-3.5 w-3.5" style={{ color }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[#0f172a] truncate">{name}</span>
                          {isBlend && (
                            <span className="inline-flex items-center h-4 px-1 rounded text-[9px] font-bold bg-[#fef3c7] text-[#92400e] flex-shrink-0">
                              MIX
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#475569]">
                          {item.quantity}× {item.packaging_size || '?'}
                          {totalG > 0 && <span className="text-[#0f172a] font-bold ml-1.5">= {Math.round(totalG)}g</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Poznámka */}
            {order.notes && (
              <div className="bg-[#fffbeb] border border-[#fde68a] rounded-lg p-2.5">
                <h4 className="text-[10px] font-bold text-[#0f172a] mb-1 flex items-center gap-1">
                  <StickyNote className="h-3 w-3 text-[#d97706]" />
                  Poznámka
                </h4>
                <p className="text-xs text-[#475569] whitespace-pre-wrap">
                  {order.notes?.split('\n').filter((line: string) => !line.trim().startsWith('freq:')).join('\n')}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors"
          >
            Zavrieť
          </button>
          {order && (
            <button
              type="button"
              onClick={() => navigate(`/orders?orderId=${order.id}`)}
              className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Otvoriť v Objednávkach
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlantingPlanPage;
