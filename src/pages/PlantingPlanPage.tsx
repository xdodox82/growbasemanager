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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, parseISO } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Crop {
  id: string;
  name: string;
  color: string;
  days_to_harvest: number;
  growth_days?: number;
  category?: string;
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
  tray_size: 'XL' | 'L' | 'M' | 'S';
  tray_count: number;
  seed_amount_grams: number;
  total_seed_grams: number;
  status: string;
  completed_at?: string;
  crops?: Crop;
  tray_config?: TrayConfig | null;
  source_orders?: string[] | null;
}

interface TrayDetail {
  size: 'XL' | 'L' | 'M' | 'S';
  count: number;
  seeds_per_tray: number;
  total_seeds: number;
}

interface GroupedPlantingPlan {
  id: string;
  crop_id: string;
  sow_date: string;
  status: string;
  completed_at?: string;
  crops?: Crop;
  trays: TrayDetail[];
  source_orders?: string[] | null;
  total_seed_grams: number;
}

const TRAY_SIZE_ORDER: Record<string, number> = {
  'XL': 1,
  'L': 2,
  'M': 3,
  'S': 4,
};

const sortTrayCombinations = (trays: TrayDetail[]): TrayDetail[] => {
  return [...trays].sort((a, b) => {
    const orderA = TRAY_SIZE_ORDER[a.size] || 999;
    const orderB = TRAY_SIZE_ORDER[b.size] || 999;
    return orderA - orderB;
  });
};

type ViewMode = 'cards' | 'list' | 'calendar';
type StatusFilter = 'all' | 'planned' | 'in_progress' | 'completed';

const PlantingPlanPage = () => {
  const { isAdmin } = useAuth();
  const { getHarvestDateForDelivery } = useHarvestDays();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [plans, setPlans] = useState<PlantingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlantingPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlantingPlan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [groupedEditDialog, setGroupedEditDialog] = useState<{
    open: boolean;
    plan: GroupedPlantingPlan | null;
  }>({ open: false, plan: null });

  const [newPlantingDialog, setNewPlantingDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCropId, setSelectedCropId] = useState('');
  const [sowDate, setSowDate] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [selectedTraySize, setSelectedTraySize] = useState<'XL' | 'L' | 'M' | 'S'>('XL');
  const [trayCount, setTrayCount] = useState(0);
  const [useCustomDensity, setUseCustomDensity] = useState(false);
  const [customSeedDensity, setCustomSeedDensity] = useState(0);
  const [crops, setCrops] = useState<Crop[]>([]);

  const [isMixedPlanting, setIsMixedPlanting] = useState(false);
  const [mixCrops, setMixCrops] = useState<{ cropId: string; percentage: number }[]>([
    { cropId: '', percentage: 50 },
    { cropId: '', percentage: 50 },
  ]);
  const [isTest, setIsTest] = useState(false);
  const [notes, setNotes] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const defaultEndDate = addDays(new Date(), 14).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const formatGrams = (grams: number) => Math.round(grams * 10) / 10;

  const selectedCrop = useMemo(() => {
    return crops.find(crop => crop.id === selectedCropId);
  }, [crops, selectedCropId]);

  const filteredCrops = useMemo(() => {
    if (selectedCategory === 'all') return crops;
    return crops.filter(crop => crop.category === selectedCategory);
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
      const mixDensity = fullDensity * (mc.percentage / 100);
      total += mixDensity;
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

  const fetchCrops = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, days_to_harvest, tray_configs, color, category')
        .order('name');

      if (error) throw error;
      setCrops(data || []);
    } catch (error) {
      console.error('Error fetching crops:', error);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const { data: plansData, error } = await supabase
        .from('planting_plans')
        .select(`
          *,
          crops:crop_id(id, name, color, days_to_harvest, tray_configs)
        `)
        .gte('expected_harvest_date', startDate)
        .lte('expected_harvest_date', endDate)
        .order('sow_date');

      if (error) throw error;

      const plansWithConfig = (plansData || []).map((plan) => {
        let trayConfig = null;

        if (plan.crops?.tray_configs) {
          const configs = plan.crops.tray_configs;
          const traySize = plan.tray_size;

          if (configs[traySize]) {
            const sizeConfig = configs[traySize];
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

  // Group planting plans by crop_id + sow_date for UI display
  const groupedPlans = useMemo(() => {
    const grouped = new Map<string, GroupedPlantingPlan>();

    plans.forEach(plan => {
      const key = `${plan.crop_id}_${plan.sow_date}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: plan.id,
          crop_id: plan.crop_id,
          sow_date: plan.sow_date,
          status: plan.status,
          completed_at: plan.completed_at,
          crops: plan.crops,
          trays: [],
          source_orders: plan.source_orders,
          total_seed_grams: 0,
        });
      }

      const group = grouped.get(key)!;
      group.trays.push({
        size: plan.tray_size,
        count: plan.tray_count,
        seeds_per_tray: plan.seed_amount_grams,
        total_seeds: plan.total_seed_grams,
      });
      group.total_seed_grams += plan.total_seed_grams;

      if (plan.source_orders && plan.source_orders.length > 0) {
        const existingOrders = group.source_orders || [];
        group.source_orders = [...new Set([...existingOrders, ...plan.source_orders])];
      }
    });

    return Array.from(grouped.values());
  }, [plans]);

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const formattedStartDate = startDate;
      const formattedEndDate = endDate;

      // Rozšírený zoznam statusov - zahrnuté všetky aktívne objednávky (anglické + SK legacy)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          delivery_date,
          status,
          order_items (
            id,
            crop_id,
            quantity,
            packaging_size,
            crops:crop_id (
              id,
              name,
              days_to_harvest,
              tray_configs,
              reserved_percentage
            )
          )
        `)
        .gte('delivery_date', formattedStartDate)
        .lte('delivery_date', formattedEndDate)
        .in('status', [
          'growing',
          'packed',
          'on_the_way',
          'pending',
          'pending_approval',
          'confirmed',
          'cakajuca',
          'potvrdena',
          'pripravena',
        ]);

      if (ordersError) {
        console.error('Orders fetch error:', ordersError);
        throw ordersError;
      }

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
      for (const group of grouped) {
        const created = await createPlantingTasksForGroup(group);
        createdCount += created;
      }

      toast({
        title: 'Plán vygenerovaný',
        description: `Vytvorených ${createdCount} výsevov.`,
      });

      await fetchPlans();
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
            harvestDate: harvestDate,
            totalRequired: 0,
            orderIds: [],
          });
        }

        const group = groups.get(key)!;
        const grams = parseFloat(item.packaging_size?.replace(/[^0-9.]/g, '') || '0');
        group.totalRequired += grams * (item.quantity || 0);

        if (!group.orderIds.includes(order.id)) {
          group.orderIds.push(order.id);
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

    const reservePercent = crop.reserved_percentage || 5;
    const reserve = reservePercent / 100;
    const withReserve = totalRequired * (1 + reserve);

    const { error: deleteError } = await supabase
      .from('planting_plans')
      .delete()
      .eq('crop_id', crop.id)
      .eq('expected_harvest_date', harvestDate)
      .not('source_orders', 'is', null);

    if (deleteError) {
      console.error('Chyba pri mazaní:', deleteError);
    }

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
        notes: `Auto z objednávok (${Math.round(totalRequired)}g požadovaných, výnos ${Math.round(tray.yieldPerTray * tray.count)}g)`,
      });

      if (!insertError) {
        created++;
      } else {
        console.error(`Chyba pri vytváraní plánu ${tray.size}:`, insertError);
      }
    }

    return created;
  }

  function optimizeTrayConfiguration(crop: any, requiredYield: number) {
    const trayConfigs = crop.tray_configs || {};

    const sizes = [
      {
        name: 'XL',
        seeds: trayConfigs.XL?.seed_density_grams || trayConfigs.XL?.seed_density || 0,
        yield: trayConfigs.XL?.yield_grams || trayConfigs.XL?.expected_yield || 0,
      },
      {
        name: 'L',
        seeds: trayConfigs.L?.seed_density_grams || trayConfigs.L?.seed_density || 0,
        yield: trayConfigs.L?.yield_grams || trayConfigs.L?.expected_yield || 0,
      },
      {
        name: 'M',
        seeds: trayConfigs.M?.seed_density_grams || trayConfigs.M?.seed_density || 0,
        yield: trayConfigs.M?.yield_grams || trayConfigs.M?.expected_yield || 0,
      },
      {
        name: 'S',
        seeds: trayConfigs.S?.seed_density_grams || trayConfigs.S?.seed_density || 0,
        yield: trayConfigs.S?.yield_grams || trayConfigs.S?.expected_yield || 0,
      },
    ].filter(s => s.seeds > 0 && s.yield > 0);

    if (sizes.length === 0) {
      console.warn('Žiadne dostupné veľkosti tácok!');
      return [];
    }

    const result: Array<{ size: string; count: number; seedsPerTray: number; yieldPerTray: number }> = [];
    let remaining = requiredYield;

    if (remaining <= sizes[0].yield) {
      const perfectSize = sizes.find(s => s.yield >= remaining);
      if (perfectSize) {
        result.push({
          size: perfectSize.name,
          count: 1,
          seedsPerTray: perfectSize.seeds,
          yieldPerTray: perfectSize.yield,
        });
        return result;
      }
    }

    const xlSize = sizes.find(s => s.name === 'XL');
    if (xlSize && xlSize.yield > 0) {
      const xlCount = Math.floor(remaining / xlSize.yield);
      if (xlCount > 0) {
        result.push({
          size: 'XL',
          count: xlCount,
          seedsPerTray: xlSize.seeds,
          yieldPerTray: xlSize.yield,
        });
        remaining -= xlCount * xlSize.yield;
      }
    }

    if (remaining > 0) {
      const otherSizes = sizes.filter(s => s.name !== 'XL');
      let selectedSize = null;

      for (const size of otherSizes) {
        if (size.yield >= remaining) {
          selectedSize = size;
          break;
        }
      }

      if (!selectedSize && otherSizes.length > 0) {
        selectedSize = otherSizes[0];
      }

      if (selectedSize) {
        result.push({
          size: selectedSize.name,
          count: 1,
          seedsPerTray: selectedSize.seeds,
          yieldPerTray: selectedSize.yield,
        });
      }
    }

    return result;
  }

  const handleMarkComplete = async (planId: string, cropId?: string, sowDate?: string) => {
    try {
      if (cropId && sowDate) {
        const { error } = await supabase
          .from('planting_plans')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('crop_id', cropId)
          .eq('sow_date', sowDate);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('planting_plans')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', planId);

        if (error) throw error;
      }

      toast({
        title: 'Výsev dokončený',
        description: 'Plán bol označený ako hotový.',
      });

      setIsDetailDialogOpen(false);
      await fetchPlans();
    } catch (error) {
      console.error('Error marking plan complete:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa označiť plán ako hotový.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkPlanned = async (planId: string, cropId?: string, sowDate?: string) => {
    try {
      if (cropId && sowDate) {
        const { error } = await supabase
          .from('planting_plans')
          .update({
            status: 'planned',
            completed_at: null,
          })
          .eq('crop_id', cropId)
          .eq('sow_date', sowDate);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('planting_plans')
          .update({
            status: 'planned',
            completed_at: null,
          })
          .eq('id', planId);

        if (error) throw error;
      }

      toast({
        title: 'Plán obnovený',
        description: 'Plán bol vrátený do plánovaných.',
      });

      setIsDetailDialogOpen(false);
      await fetchPlans();
    } catch (error) {
      console.error('Error marking plan as planned:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa vrátiť plán späť.',
        variant: 'destructive',
      });
    }
  };

  const openDetailDialog = (plan: GroupedPlantingPlan | PlantingPlan) => {
    setSelectedPlan(plan as any);
    setIsDetailDialogOpen(true);
  };

  const openEditDialog = async (plan: PlantingPlan | GroupedPlantingPlan) => {
    const isGrouped = (plan as GroupedPlantingPlan).trays && (plan as GroupedPlantingPlan).trays.length > 1;

    if (isGrouped) {
      setGroupedEditDialog({
        open: true,
        plan: plan as GroupedPlantingPlan,
      });
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
        toast({
          title: 'Chyba',
          description: 'Nepodarilo sa načítať plán na úpravu.',
          variant: 'destructive',
        });
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
        const mixConfig = JSON.parse((actualPlan as any).mix_configuration);
        setMixCrops(mixConfig.map((item: any) => ({
          cropId: item.crop_id,
          percentage: item.percentage,
        })));
        if (mixConfig.length > 0) {
          const firstCrop = crops.find((c: any) => c.id === mixConfig[0].crop_id);
          setSelectedCategory(firstCrop?.category || 'all');
        }
      } catch (e) {
        console.error('Error parsing mix configuration:', e);
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
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať plán na úpravu.',
        variant: 'destructive',
      });
      return;
    }

    setGroupedEditDialog({ open: false, plan: null });
    setEditingPlan(dbPlan as PlantingPlan);

    if ((dbPlan as any).is_mixed && (dbPlan as any).mix_configuration) {
      setIsMixedPlanting(true);
      try {
        const mixConfig = JSON.parse((dbPlan as any).mix_configuration);
        setMixCrops(mixConfig.map((item: any) => ({
          cropId: item.crop_id,
          percentage: item.percentage,
        })));
        if (mixConfig.length > 0) {
          const firstCrop = crops.find((c: any) => c.id === mixConfig[0].crop_id);
          setSelectedCategory(firstCrop?.category || 'all');
        }
      } catch (e) {
        console.error('Error parsing mix configuration:', e);
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
        toast({
          title: 'Chyba validácie',
          description: 'Súčet percent musí byť presne 100%',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }
      if (mixCrops.some(c => !c.cropId)) {
        toast({
          title: 'Chyba validácie',
          description: 'Vyberte všetky plodiny',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }
    }

    try {
      const dataToSave: any = {
        crop_id: isMixedPlanting ? null : selectedCropId,
        sow_date: sowDate,
        tray_size: selectedTraySize,
        tray_count: trayCount,
        seed_amount_grams: seedDensity,
        total_seed_grams: totalSeedGrams,
        status: 'planned',
        is_mixed: isMixedPlanting,
        mix_configuration: isMixedPlanting ? JSON.stringify(mixCrops.map(mc => ({
          crop_id: mc.cropId,
          crop_name: crops.find(c => c.id === mc.cropId)?.name,
          percentage: mc.percentage,
        }))) : null,
        is_test: isTest,
        notes: notes.trim() || null,
      };

      let error;
      if (isEdit) {
        const result = await supabase
          .from('planting_plans')
          .update(dataToSave)
          .eq('id', editingPlan.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('planting_plans')
          .insert(dataToSave);
        error = result.error;
      }

      if (error) {
        console.error('Supabase error:', error);
        toast({
          title: 'Chyba pri ukladaní',
          description: error.message || 'Neznáma chyba',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      toast({
        title: isEdit ? 'Uložené' : 'Výsev vytvorený',
        description: isEdit ? 'Plán sadenia bol aktualizovaný.' : 'Plán sadenia bol úspešne vytvorený.',
      });

      setNewPlantingDialog(false);
      setEditingPlan(null);
      resetForm();
      await fetchPlans();
    } catch (error) {
      console.error('Error saving planting:', error);
      toast({
        title: 'Chyba',
        description: isEdit ? 'Nepodarilo sa aktualizovať výsev.' : 'Nepodarilo sa vytvoriť výsev.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('planting_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Vymazané',
        description: 'Plán sadenia bol vymazaný.',
      });

      setDeleteId(null);
      await fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa vymazať plán.',
        variant: 'destructive',
      });
    }
  };

  const filteredPlans = useMemo(() => {
    if (statusFilter === 'all') return groupedPlans;
    return groupedPlans.filter(plan => plan.status === statusFilter);
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
      const date = plan.sow_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(plan);
    });
    return grouped;
  }, [filteredPlans]);

  const sortedDates = useMemo(() => Object.keys(plansByDate).sort(), [plansByDate]);

  useEffect(() => {
    fetchPlans();
    fetchCrops();
  }, [fetchPlans, fetchCrops]);

  useEffect(() => {
    if (!sowDate) {
      setHarvestDate('');
      return;
    }

    if (isMixedPlanting && mixCrops.length > 0) {
      const maxGrowthDays = mixCrops.reduce((max, mc) => {
        if (!mc.cropId) return max;
        const crop = crops.find(c => c.id === mc.cropId);
        const growthDays = crop?.growth_days || crop?.days_to_harvest || 0;
        return Math.max(max, growthDays);
      }, 0);

      if (maxGrowthDays > 0) {
        const harvest = addDays(new Date(sowDate), maxGrowthDays);
        setHarvestDate(format(harvest, 'yyyy-MM-dd'));
      } else {
        setHarvestDate('');
      }
    } else if (selectedCropId) {
      const crop = crops.find(c => c.id === selectedCropId);
      const growthDays = crop?.growth_days || crop?.days_to_harvest;
      if (growthDays) {
        const harvest = addDays(new Date(sowDate), growthDays);
        setHarvestDate(format(harvest, 'yyyy-MM-dd'));
      } else {
        setHarvestDate('');
      }
    }
  }, [sowDate, selectedCropId, isMixedPlanting, mixCrops, crops]);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd.M.yyyy', { locale: sk });
    } catch {
      return dateStr;
    }
  };

  const getHarvestDate = (plan: PlantingPlan | GroupedPlantingPlan) => {
    try {
      const sd = parseISO(plan.sow_date);
      const daysToHarvest = plan.crops?.days_to_harvest || 10;
      return addDays(sd, daysToHarvest);
    } catch {
      return new Date();
    }
  };

  // Status badge helpers — GrowBase štýl
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[#d1fae5] text-[#064e3b]';
      case 'in_progress':
        return 'bg-[#dcfce7] text-[#166534]';
      case 'cancelled':
        return 'bg-[#f8fafc] text-[#94a3b8]';
      case 'planned':
      default:
        return 'bg-[#fef3c7] text-[#92400e]';
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

  const filterChips: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'Všetky', count: statusCounts.all },
    { value: 'planned', label: 'Naplánované', count: statusCounts.planned },
    { value: 'in_progress', label: 'Prebieha', count: statusCounts.in_progress },
    { value: 'completed', label: 'Dokončené', count: statusCounts.completed },
  ];

  return (
    <MainLayout hideMobileHeader>
      <div className="min-h-screen bg-[#f8fafc] pb-20 md:pb-6">
        {/* GrowBase Header */}
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

        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
          {/* Generovanie plánu — karta */}
          <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-[#16a34a]" />
              <h2 className="text-sm font-bold text-[#0f172a]">Generovať plán z objednávok</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Dátum od</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-[#e2e8f0] text-sm text-[#0f172a] bg-white focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#bbf7d0]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Dátum do</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-[#e2e8f0] text-sm text-[#0f172a] bg-white focus:outline-none focus:border-[#16a34a] focus:ring-1 focus:ring-[#bbf7d0]"
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

          {/* Tab bar — Karty / Zoznam / Kalendár */}
          <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
            <div className="border-b border-[#e2e8f0] px-2 md:px-4">
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    'flex items-center gap-2 px-3 md:px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                    viewMode === 'cards'
                      ? 'border-[#16a34a] text-[#16a34a]'
                      : 'border-transparent text-[#475569] hover:text-[#0f172a]'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Karty
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex items-center gap-2 px-3 md:px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap hidden md:flex',
                    viewMode === 'list'
                      ? 'border-[#16a34a] text-[#16a34a]'
                      : 'border-transparent text-[#475569] hover:text-[#0f172a]'
                  )}
                >
                  <List className="h-4 w-4" />
                  Zoznam
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={cn(
                    'flex items-center gap-2 px-3 md:px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                    viewMode === 'calendar'
                      ? 'border-[#16a34a] text-[#16a34a]'
                      : 'border-transparent text-[#475569] hover:text-[#0f172a]'
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  Kalendár
                </button>
              </div>
            </div>

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
                        statusFilter === chip.value
                          ? 'bg-white/25 text-white'
                          : 'bg-[#f1f5f9] text-[#475569]'
                      )}
                    >
                      {chip.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Obsah — karty / zoznam / kalendár */}
            <div className="p-3 md:p-4">
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
                      <Skeleton className="h-6 w-40 mb-3" />
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
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
                    Vygenerujte plán sadenia pre vybrané obdobie alebo vytvorte nový výsev manuálne.
                  </p>
                </div>
              ) : viewMode === 'cards' ? (
                <PlanCardsView
                  plans={filteredPlans}
                  isAdmin={isAdmin}
                  isMobile={isMobile}
                  onOpenDetail={openDetailDialog}
                  onMarkComplete={handleMarkComplete}
                  onMarkPlanned={handleMarkPlanned}
                  onEdit={openEditDialog}
                  onDelete={(id) => setDeleteId(id)}
                  formatDate={formatDate}
                  formatGrams={formatGrams}
                  getStatusBadgeStyle={getStatusBadgeStyle}
                  getStatusLabel={getStatusLabel}
                />
              ) : viewMode === 'list' ? (
                <PlanListView
                  plans={filteredPlans}
                  isAdmin={isAdmin}
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
                />
              ) : (
                <PlanCalendarView
                  sortedDates={sortedDates}
                  plansByDate={plansByDate}
                  onOpenDetail={openDetailDialog}
                  formatDate={formatDate}
                />
              )}
            </div>
          </div>
        </div>

        {/* Detail dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="text-[#0f172a]">Detail plánu sadenia</DialogTitle>
            </DialogHeader>

            {selectedPlan && (
              <div className="space-y-4">
                {/* Hlavička detailu */}
                <div className="flex items-start gap-3 pb-4 border-b border-[#e2e8f0]">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 border"
                    style={{
                      backgroundColor: `${selectedPlan.crops?.color || '#16a34a'}15`,
                      borderColor: `${selectedPlan.crops?.color || '#16a34a'}30`,
                      color: selectedPlan.crops?.color || '#16a34a',
                    }}
                  >
                    {(selectedPlan as any).is_mixed ? <Layers className="h-6 w-6" /> : <Leaf className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {(selectedPlan as any).is_mixed && (selectedPlan as any).mix_configuration ? (
                      <>
                        <h3 className="text-lg font-bold text-[#0f172a]">Kombinovaný výsev</h3>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[#dcfce7] text-[#166534] text-[11px] font-semibold">
                            <Layers className="h-3 w-3" />
                            MIX
                          </span>
                          <span className={cn('inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold', getStatusBadgeStyle(selectedPlan.status))}>
                            {getStatusLabel(selectedPlan.status)}
                          </span>
                          {(selectedPlan as any).is_test && (
                            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[#fef3c7] text-[#92400e] text-[11px] font-semibold">
                              <FlaskConical className="h-3 w-3" />
                              TEST
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-bold text-[#0f172a]">{selectedPlan.crops?.name || 'Neznáma plodina'}</h3>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <span className={cn('inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold', getStatusBadgeStyle(selectedPlan.status))}>
                            {getStatusLabel(selectedPlan.status)}
                          </span>
                          {(selectedPlan as any).is_test && (
                            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-[#fef3c7] text-[#92400e] text-[11px] font-semibold">
                              <FlaskConical className="h-3 w-3" />
                              TEST
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Meta info — sadenie/zber/dni */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-3">
                    <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-1">Dátum výsevu</p>
                    <p className="text-sm font-bold text-[#0f172a]">{formatDate(selectedPlan.sow_date)}</p>
                  </div>
                  <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-3">
                    <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-1">Dátum zberu</p>
                    <p className="text-sm font-bold text-[#0f172a]">{formatDate(getHarvestDate(selectedPlan).toISOString())}</p>
                  </div>
                  <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-3">
                    <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-1">Dni do zberu</p>
                    <p className="text-sm font-bold text-[#0f172a]">{selectedPlan.crops?.days_to_harvest || 10} dní</p>
                  </div>
                  <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-3">
                    <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-1">Stav</p>
                    <p className="text-sm font-bold text-[#0f172a]">{getStatusLabel(selectedPlan.status)}</p>
                  </div>
                </div>

                {/* Mix konfigurácia */}
                {(selectedPlan as any).is_mixed && (selectedPlan as any).mix_configuration && (
                  <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-4 w-4 text-[#16a34a]" />
                      <h4 className="text-sm font-bold text-[#0f172a]">Zloženie mixu</h4>
                    </div>
                    <div className="space-y-1">
                      {(() => {
                        try {
                          const mixConfig = JSON.parse((selectedPlan as any).mix_configuration);
                          return mixConfig.map((mix: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center py-1.5 text-sm">
                              <span className="font-semibold text-[#0f172a]">{mix.crop_name}</span>
                              <span className="inline-flex items-center h-5 px-2 rounded-full bg-[#f1f5f9] text-[#475569] text-[11px] font-bold">
                                {mix.percentage}%
                              </span>
                            </div>
                          ));
                        } catch {
                          return <span className="text-sm text-[#475569]">Chyba načítania mixu</span>;
                        }
                      })()}
                    </div>
                  </div>
                )}

                {/* Kombinácia tácok */}
                <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-[#d97706]" />
                    <h4 className="text-sm font-bold text-[#0f172a]">Kombinácia tácok</h4>
                  </div>

                  {(selectedPlan as GroupedPlantingPlan).trays ? (
                    <div className="space-y-2">
                      {sortTrayCombinations((selectedPlan as GroupedPlantingPlan).trays).map((tray, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1.5 text-sm border-b border-[#e2e8f0] last:border-b-0">
                          <span className="font-bold text-[#0f172a]">{tray.count} × {tray.size}</span>
                          <span className="text-xs text-[#475569]">
                            {formatGrams(tray.seeds_per_tray)}g/tácka • {formatGrams(tray.total_seeds)}g celkom
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-[#cbd5e1] flex justify-between items-center">
                        <span className="text-sm font-bold text-[#0f172a]">Celkom semien:</span>
                        <span className="text-sm font-bold text-[#16a34a]">{formatGrams(selectedPlan.total_seed_grams || 0)}g</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-[#0f172a]">
                      <p className="font-semibold">{(selectedPlan as PlantingPlan).tray_count} × {(selectedPlan as PlantingPlan).tray_size}</p>
                      <p className="text-xs text-[#475569] mt-1">Hustota: {(selectedPlan as PlantingPlan).seed_amount_grams || 0}g/tácka</p>
                    </div>
                  )}

                  {(selectedPlan as any).is_mixed && (selectedPlan as any).mix_configuration && (
                    <div className="mt-3 pt-3 border-t border-[#cbd5e1]">
                      <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">Rozpad semien</p>
                      <div className="space-y-1">
                        {(() => {
                          try {
                            const mixConfig = JSON.parse((selectedPlan as any).mix_configuration);
                            const totalDensity = selectedPlan.seed_amount_grams;
                            return mixConfig.map((mix: any, idx: number) => {
                              const mixDensity = totalDensity * (mix.percentage / 100);
                              return (
                                <div key={idx} className="flex justify-between text-xs py-0.5">
                                  <span className="text-[#475569]">• {mix.crop_name} ({mix.percentage}%)</span>
                                  <span className="font-semibold text-[#0f172a]">{mixDensity.toFixed(1)}g</span>
                                </div>
                              );
                            });
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Poznámka */}
                {(selectedPlan as any).notes && (
                  <div className="bg-[#fffbeb] rounded-lg border border-[#fde68a] p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <StickyNote className="h-4 w-4 text-[#d97706]" />
                      <h4 className="text-sm font-bold text-[#0f172a]">Poznámka</h4>
                    </div>
                    <p className="text-sm text-[#475569]">{(selectedPlan as any).notes}</p>
                  </div>
                )}

                {/* Zdroj objednávok */}
                <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-[#475569]" />
                    <h4 className="text-sm font-bold text-[#0f172a]">Zdroj objednávok</h4>
                  </div>
                  {selectedPlan.source_orders && selectedPlan.source_orders.length > 0 ? (
                    <div>
                      <p className="text-xs text-[#475569] mb-2">
                        Vygenerované z {selectedPlan.source_orders.length} {selectedPlan.source_orders.length === 1 ? 'objednávky' : 'objednávok'}:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPlan.source_orders.map((orderId, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-[#f1f5f9] text-[11px] font-mono text-[#475569]"
                          >
                            <Package className="h-3 w-3" />
                            {orderId.substring(0, 8)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#475569]">Manuálne vytvorený výsev (nie z objednávok)</p>
                  )}
                </div>

                {/* Akcie */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#e2e8f0]">
                  <button
                    onClick={() => setIsDetailDialogOpen(false)}
                    className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors"
                  >
                    Zavrieť
                  </button>
                  {selectedPlan.status === 'planned' && isAdmin && (
                    <button
                      onClick={() => handleMarkComplete(selectedPlan.id, selectedPlan.crop_id, selectedPlan.sow_date)}
                      className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Označiť hotovo
                    </button>
                  )}
                  {selectedPlan.status === 'completed' && isAdmin && (
                    <button
                      onClick={() => handleMarkPlanned(selectedPlan.id, selectedPlan.crop_id, selectedPlan.sow_date)}
                      className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Vrátiť späť
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => openEditDialog(selectedPlan)}
                      className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                      Upraviť
                    </button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Grouped edit dialog — výber tácky */}
        <Dialog
          open={groupedEditDialog.open}
          onOpenChange={(open) => {
            if (!open) setGroupedEditDialog({ open: false, plan: null });
          }}
        >
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

        {/* Nový výsev / edit dialog */}
        <Dialog
          open={newPlantingDialog}
          onOpenChange={(open) => {
            setNewPlantingDialog(open);
            if (!open) {
              setEditingPlan(null);
              resetForm();
            }
          }}
        >
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
                {/* Kategória — chip buttons */}
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

                {/* Typ výsevu — Mix / Test */}
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

                {/* Plodina select / Mix */}
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

                    <div
                      className={cn(
                        'text-xs font-bold',
                        mixCrops.reduce((sum, c) => sum + c.percentage, 0) === 100 ? 'text-[#16a34a]' : 'text-[#dc2626]'
                      )}
                    >
                      Súčet: {mixCrops.reduce((sum, c) => sum + c.percentage, 0)}%
                      {mixCrops.reduce((sum, c) => sum + c.percentage, 0) === 100 && ' ✓'}
                    </div>
                  </div>
                )}

                {/* Tácka veľkosť + počet */}
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

                {/* Hustota semien */}
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
                            if (checked === false) {
                              setCustomSeedDensity(0);
                            } else {
                              setCustomSeedDensity(dbSeedDensity);
                            }
                          }}
                        />
                        <Label htmlFor="custom-density" className="text-[11px] text-[#475569] cursor-pointer">
                          Vlastná
                        </Label>
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

                {/* Dátumy */}
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

                {/* Poznámka */}
                <div>
                  <Label htmlFor="notes" className="text-xs font-semibold text-[#475569]">
                    Poznámka <span className="text-[#94a3b8] font-normal">(voliteľné)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Napr: šarža semien, poznámky k testu..."
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

        {/* Delete confirm */}
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

// ===== Sub-komponenty pre pohľady =====

interface ViewProps {
  plans: GroupedPlantingPlan[];
  isAdmin: boolean;
  onOpenDetail: (plan: GroupedPlantingPlan) => void;
  onMarkComplete: (planId: string, cropId?: string, sowDate?: string) => void;
  onMarkPlanned: (planId: string, cropId?: string, sowDate?: string) => void;
  onEdit: (plan: GroupedPlantingPlan) => void;
  onDelete: (id: string) => void;
  formatDate: (date: string) => string;
  formatGrams: (g: number) => number;
  getStatusBadgeStyle: (s: string) => string;
  getStatusLabel: (s: string) => string;
}

interface CardsViewProps extends ViewProps {
  isMobile: boolean;
}

const PlanCardsView = ({
  plans,
  isAdmin,
  isMobile,
  onOpenDetail,
  onMarkComplete,
  onMarkPlanned,
  onEdit,
  onDelete,
  formatDate,
  formatGrams,
  getStatusBadgeStyle,
  getStatusLabel,
}: CardsViewProps) => {
  return (
    <>
      {/* MOBILE — kompaktné riadkové karty */}
      <div className="md:hidden divide-y divide-[#e2e8f0]">
        {plans.map(plan => {
          const isMixed = (plan as any).is_mixed;
          const isTest = (plan as any).is_test;
          const cropColor = plan.crops?.color || '#16a34a';
          return (
            <div
              key={plan.id}
              onClick={() => onOpenDetail(plan)}
              className={cn(
                'flex items-center gap-3 py-3 px-1 cursor-pointer active:bg-[#f8fafc] transition-colors',
                plan.status === 'completed' && 'opacity-70'
              )}
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: `${cropColor}15`,
                  borderColor: `${cropColor}30`,
                }}
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
                  {isTest && (
                    <span className="inline-flex items-center h-4 px-1.5 rounded bg-[#fef3c7] text-[#92400e] text-[9px] font-bold">
                      TEST
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#475569]">
                  <span>{formatDate(plan.sow_date)}</span>
                  <span className="text-[#cbd5e1]">•</span>
                  <span className="truncate">
                    {sortTrayCombinations(plan.trays).map((t) => `${t.count}×${t.size}`).join(', ')}
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

      {/* DESKTOP — grid kariet */}
      <div className="hidden md:grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {plans.map(plan => {
          const isMixed = (plan as any).is_mixed;
          const isTest = (plan as any).is_test;
          const cropColor = plan.crops?.color || '#16a34a';
          return (
            <div
              key={plan.id}
              onClick={() => onOpenDetail(plan)}
              className={cn(
                'bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4 cursor-pointer hover:border-[#bbf7d0] hover:shadow-md transition-all',
                plan.status === 'completed' && 'bg-[#f8fafc]'
              )}
            >
              {/* Header — ikona + meno + badges */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{
                    backgroundColor: `${cropColor}15`,
                    borderColor: `${cropColor}30`,
                  }}
                >
                  {isMixed ? (
                    <Layers className="h-5 w-5" style={{ color: cropColor }} />
                  ) : (
                    <Sprout className="h-5 w-5" style={{ color: cropColor }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[#0f172a] truncate">
                    {isMixed ? 'Kombinovaný výsev' : (plan.crops?.name || 'Neznáma plodina')}
                  </h3>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className={cn('inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold', getStatusBadgeStyle(plan.status))}>
                      {getStatusLabel(plan.status).toUpperCase()}
                    </span>
                    {isTest && (
                      <span className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded-full bg-[#fef3c7] text-[#92400e] text-[10px] font-bold">
                        <FlaskConical className="h-2.5 w-2.5" />
                        TEST
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mix konfigurácia */}
              {isMixed && (plan as any).mix_configuration && (
                <div className="mb-3 pb-3 border-b border-[#e2e8f0] text-xs space-y-0.5">
                  {(() => {
                    try {
                      const mixConfig = JSON.parse((plan as any).mix_configuration);
                      return mixConfig.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span className="font-semibold text-[#0f172a] truncate">{item.crop_name}</span>
                          <span className="text-[#475569] flex-shrink-0 ml-1">{item.percentage}%</span>
                        </div>
                      ));
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              )}

              {/* Datum sadenia → zberu */}
              <div className="flex items-center gap-1.5 text-xs text-[#475569] mb-3">
                <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-semibold">{formatDate(plan.sow_date)}</span>
                <span className="text-[#94a3b8]">→</span>
                <span>{formatDate(addDays(parseISO(plan.sow_date), plan.crops?.days_to_harvest || 10).toISOString())}</span>
              </div>

              {/* Tácky */}
              <div className="space-y-1 mb-3">
                {sortTrayCombinations(plan.trays).map((tray, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0f172a]">{tray.count} × {tray.size}</span>
                    <span className="text-[#475569]">{formatGrams(tray.seeds_per_tray)}g/tácka</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 border-t border-[#e2e8f0]">
                  <span className="text-[#475569]">Celkom semien:</span>
                  <span className="font-bold text-[#16a34a]">{formatGrams(plan.total_seed_grams || 0)}g</span>
                </div>
              </div>

              {/* Poznámka */}
              {(plan as any).notes && (
                <div className="flex items-start gap-1.5 mb-3 text-xs text-[#475569]">
                  <StickyNote className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{(plan as any).notes}</span>
                </div>
              )}

              {/* Akcie */}
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

interface ListViewProps extends ViewProps {
  getHarvestDate: (plan: GroupedPlantingPlan) => Date;
}

const PlanListView = ({
  plans,
  isAdmin,
  onOpenDetail,
  onMarkComplete,
  onMarkPlanned,
  onEdit,
  onDelete,
  formatDate,
  formatGrams,
  getHarvestDate,
  getStatusBadgeStyle,
  getStatusLabel,
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
            return (
              <tr
                key={plan.id}
                onClick={() => onOpenDetail(plan)}
                className={cn(
                  'cursor-pointer hover:bg-[#f8fafc] transition-colors',
                  plan.status === 'completed' && 'bg-[#f8fafc]'
                )}
              >
                <td className="px-3 md:px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 border"
                      style={{
                        backgroundColor: `${cropColor}15`,
                        borderColor: `${cropColor}30`,
                      }}
                    >
                      {isMixed ? (
                        <Layers className="h-3.5 w-3.5" style={{ color: cropColor }} />
                      ) : (
                        <Leaf className="h-3.5 w-3.5" style={{ color: cropColor }} />
                      )}
                    </div>
                    {isMixed ? (
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#0f172a]">Kombinovaný</span>
                          {isTest && (
                            <span className="inline-flex items-center h-4 px-1.5 rounded bg-[#fef3c7] text-[#92400e] text-[9px] font-bold">TEST</span>
                          )}
                        </div>
                        {(() => {
                          try {
                            const mixConfig = JSON.parse((plan as any).mix_configuration || '[]');
                            return (
                              <span className="text-[11px] text-[#475569] truncate block">
                                {mixConfig.map((item: any) => `${item.crop_name} ${item.percentage}%`).join(' + ')}
                              </span>
                            );
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-[#0f172a] truncate">{plan.crops?.name || 'Neznáma'}</span>
                        {isTest && (
                          <span className="inline-flex items-center h-4 px-1.5 rounded bg-[#fef3c7] text-[#92400e] text-[9px] font-bold flex-shrink-0">TEST</span>
                        )}
                      </div>
                    )}
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

interface CalendarViewProps {
  sortedDates: string[];
  plansByDate: Record<string, GroupedPlantingPlan[]>;
  onOpenDetail: (plan: GroupedPlantingPlan) => void;
  formatDate: (date: string) => string;
}

const PlanCalendarView = ({ sortedDates, plansByDate, onOpenDetail, formatDate }: CalendarViewProps) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sortedDates.map(date => {
        const plansForDate = plansByDate[date];
        return (
          <div key={date} className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#16a34a]" />
                <h3 className="font-bold text-sm text-[#0f172a]">{formatDate(date)}</h3>
              </div>
              <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-2 rounded-full bg-[#f0fdf4] text-[#16a34a] text-[10px] font-bold">
                {plansForDate.length}
              </span>
            </div>

            <div className="space-y-1.5">
              {plansForDate.map(plan => {
                const isMixed = (plan as any).is_mixed;
                const cropColor = plan.crops?.color || '#16a34a';
                return (
                  <div
                    key={plan.id}
                    onClick={() => onOpenDetail(plan)}
                    className={cn(
                      'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-[#f8fafc] transition-colors',
                      plan.status === 'completed' && 'opacity-60'
                    )}
                  >
                    {isMixed ? (
                      <Layers className="h-3.5 w-3.5 flex-shrink-0" style={{ color: cropColor }} />
                    ) : (
                      <Leaf className="h-3.5 w-3.5 flex-shrink-0" style={{ color: cropColor }} />
                    )}
                    <div className="flex-1 min-w-0">
                      {isMixed ? (
                        <>
                          <p className="font-semibold text-xs text-[#0f172a] truncate">Kombinovaný</p>
                          <p className="text-[10px] text-[#475569] truncate">
                            {(() => {
                              try {
                                const mixConfig = JSON.parse((plan as any).mix_configuration);
                                return mixConfig.map((m: any) => `${m.crop_name} ${m.percentage}%`).join(' + ');
                              } catch {
                                return `${plan.trays.length} tácok`;
                              }
                            })()}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-xs text-[#0f172a] truncate">{plan.crops?.name || 'Neznáma'}</p>
                          <p className="text-[10px] text-[#475569]">
                            {sortTrayCombinations(plan.trays).map((t) => `${t.count}×${t.size}`).join(', ')}
                          </p>
                        </>
                      )}
                    </div>
                    {plan.status === 'completed' && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a] flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PlantingPlanPage;
