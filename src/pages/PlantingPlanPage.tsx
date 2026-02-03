import { useState, useCallback, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useIsMobile } from '@/hooks/use-mobile';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Lightbulb
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

interface GeneratePlanResult {
  plan_id: string;
  crop_name: string;
  sow_date: string;
  delivery_date: string;
  tray_size: string;
  tray_count: number;
  seed_amount_grams: number;
  total_seed_grams: number;
  created_new: boolean;
}

const TRAY_SIZES = {
  XL: 'XL',
  L: 'L',
  M: 'M',
  S: 'S',
} as const;

type ViewMode = 'cards' | 'list' | 'calendar';

const PlantingPlanPage = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [plans, setPlans] = useState<PlantingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [statusFilter, setStatusFilter] = useState('all');
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
    { cropId: '', percentage: 50 }
  ]);
  const [isTest, setIsTest] = useState(false);
  const [notes, setNotes] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const defaultEndDate = addDays(new Date(), 14).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const formatGrams = (grams: number) => {
    return Math.round(grams * 10) / 10;
  };

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
      { cropId: '', percentage: 50 }
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

      console.log('🔍 RAW data z DB:', plansData?.length, 'záznamov');
      console.log('🔍 Unique plodiny:', [...new Set(plansData?.map(p => p.crops?.name))]);
      console.log('🔍 Detail všetkých plodín:', plansData?.map(p => ({
        crop: p.crops?.name,
        date: p.sow_date,
        size: p.tray_size
      })));

      const plansWithConfig = (plansData || []).map((plan) => {
        let trayConfig = null;

        console.log(`RAW tray_configs for ${plan.crops?.name}:`, plan.crops?.tray_configs);

        if (plan.crops?.tray_configs) {
          const configs = plan.crops.tray_configs;
          const traySize = plan.tray_size;

          console.log(`Looking for size: ${traySize}`);
          console.log(`Config for ${traySize}:`, configs[traySize]);

          if (configs[traySize]) {
            const sizeConfig = configs[traySize];

            trayConfig = {
              seed_density_grams:
                sizeConfig.seed_density_grams ||
                sizeConfig.seed_density ||
                0,
              yield_grams:
                sizeConfig.yield_grams ||
                sizeConfig.expected_yield ||
                0
            };
          }
        }

        console.log(`FINAL Config for ${plan.crops?.name} ${plan.tray_size}:`, trayConfig);

        return {
          ...plan,
          tray_config: trayConfig || {
            seed_density_grams: plan.seed_amount_grams || 0,
            yield_grams: 0
          }
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

  const handleRefresh = useCallback(async () => {
    await fetchPlans();
  }, [fetchPlans]);

  // Group planting plans by crop_id + sow_date for UI display
  const groupedPlans = useMemo(() => {
    console.log('🔍 PRED grouping:', plans.length, 'plánov');

    const grouped = new Map<string, GroupedPlantingPlan>();

    plans.forEach(plan => {
      const key = `${plan.crop_id}_${plan.sow_date}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: plan.id, // Use first plan's ID as primary
          crop_id: plan.crop_id,
          sow_date: plan.sow_date,
          status: plan.status,
          completed_at: plan.completed_at,
          crops: plan.crops,
          trays: [],
          source_orders: plan.source_orders,
          total_seed_grams: 0
        });
      }

      const group = grouped.get(key)!;
      group.trays.push({
        size: plan.tray_size,
        count: plan.tray_count,
        seeds_per_tray: plan.seed_amount_grams,
        total_seeds: plan.total_seed_grams
      });
      group.total_seed_grams += plan.total_seed_grams;

      // Merge source_orders if multiple plans have them
      if (plan.source_orders && plan.source_orders.length > 0) {
        const existingOrders = group.source_orders || [];
        group.source_orders = [...new Set([...existingOrders, ...plan.source_orders])];
      }
    });

    const result = Array.from(grouped.values());

    console.log('🔍 PO grouping:', result.length, 'skupín');
    console.log('🔍 Grouped plodiny:', result.map(g => ({
      crop: g.crops?.name,
      date: g.sow_date,
      trays: g.trays?.length
    })));

    return result;
  }, [plans]);

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const formattedStartDate = startDate;
      const formattedEndDate = endDate;

      console.log('🔍 Filter statusov:', ['cakajuca', 'potvrdena', 'pripravena']);
      console.log('🔍 Obdobie:', formattedStartDate, 'až', formattedEndDate);

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
        .in('status', ['cakajuca', 'potvrdena', 'pripravena']);

      console.log('📦 Načítané objednávky:', orders?.length);
      console.log('📦 Statusy objednávok:', orders?.map(o => ({
        id: o.id,
        status: o.status,
        date: o.delivery_date,
        items: o.order_items?.length
      })));

      if (ordersError) {
        console.error('Orders fetch error:', ordersError);
        throw ordersError;
      }

      if (!orders || orders.length === 0) {
        toast({
          title: 'Žiadne objednávky',
          description: 'V danom období neboli nájdené žiadne aktívne objednávky (čakajúca/potvrdená/pripravená).',
        });
        return;
      }

      const grouped = groupOrdersByCropAndHarvestDate(orders);
      console.log('📦 Zoskupené skupiny:', grouped.length);
      console.log('📦 Detail skupín:', grouped.map(g => ({
        crop: g.crop.name,
        harvestDate: g.harvestDate,
        totalRequired: g.totalRequired,
        orderIds: g.orderIds
      })));

      if (grouped.length === 0) {
        toast({
          title: 'Žiadne položky',
          description: 'Objednávky neobsahujú žiadne plodiny na sadenie.',
        });
        return;
      }

      let createdCount = 0;

      for (const group of grouped) {
        console.log(`🌱 Spracovávam skupinu: ${group.crop.name}, zber ${group.harvestDate}, potreba ${group.totalRequired}g, objednávky: ${group.orderIds.join(', ')}`);
        const created = await createPlantingTasksForGroup(group);
        console.log(`✅ Vytvorené: ${created}`);
        createdCount += created;
      }

      console.log(`🎉 Celkom vytvorených: ${createdCount}`);

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
      order.order_items?.forEach((item: any) => {
        if (!item.crop_id || !item.crops) return;

        const key = `${item.crop_id}_${order.delivery_date}`;

        if (!groups.has(key)) {
          groups.set(key, {
            crop: item.crops,
            harvestDate: order.delivery_date,
            totalRequired: 0,
            orderIds: [],
          });
        }

        const group = groups.get(key)!;
        const grams = parseFloat(item.packaging_size?.replace(/[^0-9.]/g, '') || '0');
        group.totalRequired += grams * (item.quantity || 0);

        // Add order ID if not already in the list
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

    // Vypočítaj dátum sadenia
    const plantingDate = new Date(harvestDate);
    plantingDate.setDate(plantingDate.getDate() - (crop.days_to_harvest || 10));
    const plantingDateStr = plantingDate.toISOString().split('T')[0];

    // Pridaj rezervu
    const reservePercent = crop.reserved_percentage || 5;
    const reserve = reservePercent / 100;
    const withReserve = totalRequired * (1 + reserve);

    console.log(`📊 Požiadavka: ${totalRequired}g + rezerva ${reservePercent}% = ${Math.round(withReserve)}g`);

    // 1. VYMAŽ existujúce AUTO-GENEROVANÉ plány pre túto kombináciu
    const { error: deleteError } = await supabase
      .from('planting_plans')
      .delete()
      .eq('crop_id', crop.id)
      .eq('expected_harvest_date', harvestDate)
      .not('source_orders', 'is', null);

    if (deleteError) {
      console.error('Chyba pri mazaní:', deleteError);
    } else {
      console.log(`🗑️ Vymazané existujúce plány pre ${crop.name}, zberu: ${harvestDate}`);
    }

    // 2. Optimalizuj tácky
    const trayConfig = optimizeTrayConfiguration(crop, withReserve);

    console.log(`🎯 Optimalizácia tácok:`, trayConfig);

    // 3. VYTVOR nové plány (INSERT, nie UPDATE)
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
        notes: `Auto z objednávok (${Math.round(totalRequired)}g požadovaných, výnos ${Math.round(tray.yieldPerTray * tray.count)}g)`
      });

      if (!insertError) {
        created++;
        console.log(`➕ Vytvorený: ${tray.count}×${tray.size}`);
      } else {
        console.error(`❌ Chyba pri vytváraní plánu ${tray.size}:`, insertError);
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
        yield: trayConfigs.XL?.yield_grams || trayConfigs.XL?.expected_yield || 0
      },
      {
        name: 'L',
        seeds: trayConfigs.L?.seed_density_grams || trayConfigs.L?.seed_density || 0,
        yield: trayConfigs.L?.yield_grams || trayConfigs.L?.expected_yield || 0
      },
      {
        name: 'M',
        seeds: trayConfigs.M?.seed_density_grams || trayConfigs.M?.seed_density || 0,
        yield: trayConfigs.M?.yield_grams || trayConfigs.M?.expected_yield || 0
      },
      {
        name: 'S',
        seeds: trayConfigs.S?.seed_density_grams || trayConfigs.S?.seed_density || 0,
        yield: trayConfigs.S?.yield_grams || trayConfigs.S?.expected_yield || 0
      }
    ].filter(s => s.seeds > 0 && s.yield > 0);

    if (sizes.length === 0) {
      console.warn('⚠️ Žiadne dostupné veľkosti tácok!');
      return [];
    }

    console.log(`✅ Dostupné veľkosti:`, sizes);

    const result: Array<{ size: string; count: number; seedsPerTray: number; yieldPerTray: number }> = [];
    let remaining = requiredYield;

    // 1. Ak potreba je menšia ako XL, použi jednu tácku čo to najlepšie pokryje
    if (remaining <= sizes[0].yield) {
      // Nájdi najmenšiu tácku ktorá pokryje celú potrebu
      const perfectSize = sizes.find(s => s.yield >= remaining);

      if (perfectSize) {
        result.push({
          size: perfectSize.name,
          count: 1,
          seedsPerTray: perfectSize.seeds,
          yieldPerTray: perfectSize.yield
        });
        console.log(`  📦 1× ${perfectSize.name} (${perfectSize.yield}g pokryje ${Math.round(remaining)}g)`);
        return result;
      }
    }

    // 2. Ak potreba je väčšia ako XL, najprv maximálny počet XL tácok
    const xlSize = sizes.find(s => s.name === 'XL');
    if (xlSize && xlSize.yield > 0) {
      const xlCount = Math.floor(remaining / xlSize.yield);
      if (xlCount > 0) {
        result.push({
          size: 'XL',
          count: xlCount,
          seedsPerTray: xlSize.seeds,
          yieldPerTray: xlSize.yield
        });
        remaining -= xlCount * xlSize.yield;
        console.log(`  📦 ${xlCount}× XL (${xlSize.yield}g každá, zostáva ${Math.round(remaining)}g)`);
      }
    }

    // 3. Zvyšok pokryť najväčšou možnou táckou
    if (remaining > 0) {
      const otherSizes = sizes.filter(s => s.name !== 'XL');

      // Nájdi najväčšiu tácku ktorá pokryje zvyšok alebo je najbližšia
      let selectedSize = null;

      for (const size of otherSizes) {
        if (size.yield >= remaining) {
          selectedSize = size;
          break; // Prvá (najväčšia) ktorá to pokryje
        }
      }

      // Ak žiadna nepokryje zvyšok, použi najväčšiu dostupnú (NIE najmenšiu!)
      if (!selectedSize && otherSizes.length > 0) {
        selectedSize = otherSizes[0]; // Prvá = najväčšia (L)
      }

      if (selectedSize) {
        result.push({
          size: selectedSize.name,
          count: 1,
          seedsPerTray: selectedSize.seeds,
          yieldPerTray: selectedSize.yield
        });
        console.log(`  📦 1× ${selectedSize.name} (${selectedSize.yield}g)`);
      }
    }

    console.log(`📊 Výsledná konfigurácia:`, result);

    return result;
  }

  const handleMarkComplete = async (planId: string, cropId?: string, sowDate?: string) => {
    try {
      // If cropId and sowDate provided, update all plans for this group
      // Otherwise just update the single plan (backward compatibility)
      if (cropId && sowDate) {
        const { error } = await supabase
          .from('planting_plans')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('crop_id', cropId)
          .eq('sow_date', sowDate);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('planting_plans')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', planId);

        if (error) throw error;
      }

      toast({
        title: 'Výsev dokončený',
        description: 'Plán bol označený ako hotový.'
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
      // If cropId and sowDate provided, update all plans for this group
      // Otherwise just update the single plan (backward compatibility)
      if (cropId && sowDate) {
        const { error } = await supabase
          .from('planting_plans')
          .update({
            status: 'planned',
            completed_at: null
          })
          .eq('crop_id', cropId)
          .eq('sow_date', sowDate);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('planting_plans')
          .update({
            status: 'planned',
            completed_at: null
          })
          .eq('id', planId);

        if (error) throw error;
      }

      toast({
        title: 'Plán obnovený',
        description: 'Plán bol vrátený do plánovaných.'
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
    console.log('=== OPENING DETAIL DIALOG ===');
    console.log('Plan data:', plan);

    setSelectedPlan(plan as any);
    setIsDetailDialogOpen(true);
  };

  const openEditDialog = async (plan: PlantingPlan | GroupedPlantingPlan) => {
    // Detekuj či je zoskupený plán s viacerými táckami
    const isGrouped = (plan as GroupedPlantingPlan).trays && (plan as GroupedPlantingPlan).trays.length > 1;

    if (isGrouped) {
      // Zobraz GroupedPlantingEditDialog pre výber tácky
      setGroupedEditDialog({
        open: true,
        plan: plan as GroupedPlantingPlan
      });
      setIsDetailDialogOpen(false);
      return;
    }

    // Pre jednoduchú tácku alebo jednotlivý plán
    let actualPlan: PlantingPlan;

    if ((plan as GroupedPlantingPlan).trays) {
      // Fetch single plan from DB
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

    // Handle mixed planting
    if ((actualPlan as any).is_mixed && (actualPlan as any).mix_configuration) {
      setIsMixedPlanting(true);
      try {
        const mixConfig = JSON.parse((actualPlan as any).mix_configuration);
        setMixCrops(mixConfig.map((item: any) => ({
          cropId: item.crop_id,
          percentage: item.percentage
        })));
        // Get category from first crop in mix
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

  const handleEditSpecificTray = async (plan: GroupedPlantingPlan, trayIndex: number) => {
    // Načítaj konkrétnu tácku z DB
    const tray = plan.trays[trayIndex];

    const { data: dbPlan, error } = await supabase
      .from('planting_plans')
      .select('*')
      .eq('crop_id', plan.crop_id)
      .eq('sow_date', plan.sow_date)
      .eq('tray_size', tray.size)
      .maybeSingle();

    if (error || !dbPlan) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať plán na úpravu.',
        variant: 'destructive',
      });
      return;
    }

    // Zavri grouped dialog
    setGroupedEditDialog({ open: false, plan: null });

    // Otvor normálny edit dialog s načítanými dátami
    setEditingPlan(dbPlan as PlantingPlan);

    // Handle mixed planting
    if ((dbPlan as any).is_mixed && (dbPlan as any).mix_configuration) {
      setIsMixedPlanting(true);
      try {
        const mixConfig = JSON.parse((dbPlan as any).mix_configuration);
        setMixCrops(mixConfig.map((item: any) => ({
          cropId: item.crop_id,
          percentage: item.percentage
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

    // Validácia pre kombinovaný výsev
    if (isMixedPlanting) {
      const total = mixCrops.reduce((sum, c) => sum + c.percentage, 0);
      if (total !== 100) {
        toast({
          title: 'Chyba validácie',
          description: 'Súčet percent musí byť presne 100%',
          variant: 'destructive'
        });
        setSaving(false);
        return;
      }
      if (mixCrops.some(c => !c.cropId)) {
        toast({
          title: 'Chyba validácie',
          description: 'Vyberte všetky plodiny',
          variant: 'destructive'
        });
        setSaving(false);
        return;
      }
    }

    console.log(isEdit ? '=== UPDATING PLANTING ===' : '=== CREATING PLANTING ===');
    console.log('Selected Crop ID:', selectedCropId);
    console.log('Sow Date:', sowDate);
    console.log('Tray Size:', selectedTraySize);
    console.log('Tray Count:', trayCount);
    console.log('Seed Density:', seedDensity);
    console.log('Is Mixed:', isMixedPlanting);

    console.log('=== UKLADANIE VÝSEVU ===');
    console.log('isMixedPlanting:', isMixedPlanting);
    console.log('mixedSeedDensity:', mixedSeedDensity);
    console.log('useCustomDensity:', useCustomDensity);
    console.log('customSeedDensity:', customSeedDensity);
    console.log('dbSeedDensity:', dbSeedDensity);
    console.log('Final seedDensity:', seedDensity);
    console.log('Total seed grams (seedDensity × trayCount):', totalSeedGrams);

    try {
      // NOTE: Test functionality temporarily removed due to Supabase PostgREST cache bug
      // Bug report filed: GitHub issue & Supabase support ticket
      // Will be re-enabled after cache issue is resolved

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
          percentage: mc.percentage
        }))) : null,
        is_test: isTest,
        notes: notes.trim() || null
      };

      console.log('=== UKLADÁM DO DB ===');
      console.log('Ukladám seed_amount_grams:', dataToSave.seed_amount_grams);
      console.log('Ukladám total_seed_grams:', dataToSave.total_seed_grams);
      console.log(isEdit ? 'Updating data:' : 'Inserting data:', JSON.stringify(dataToSave, null, 2));

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
        console.error('=== SUPABASE ERROR ===');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Full error:', JSON.stringify(error, null, 2));

        toast({
          title: 'Chyba pri ukladaní',
          description: error.message || 'Neznáma chyba',
          variant: 'destructive'
        });
        setSaving(false);
        return;
      }

      console.log(isEdit ? 'Update successful' : 'Insert successful');

      toast({
        title: isEdit ? 'Uložené' : 'Výsev vytvorený',
        description: isEdit ? 'Plán sadenia bol aktualizovaný.' : 'Plán sadenia bol úspešne vytvorený.'
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
        variant: 'destructive'
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
    console.log('🔍 PRED filter (statusFilter=' + statusFilter + '):', groupedPlans.length, 'plánov');
    if (statusFilter === 'all') return groupedPlans;
    const filtered = groupedPlans.filter(plan => plan.status === statusFilter);
    console.log('🔍 PO filter:', filtered.length, 'plánov');
    return filtered;
  }, [groupedPlans, statusFilter]);

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

  const sortedDates = useMemo(() => {
    return Object.keys(plansByDate).sort();
  }, [plansByDate]);

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
    } catch (e) {
      return dateStr;
    }
  };

  const getHarvestDate = (plan: PlantingPlan | GroupedPlantingPlan) => {
    try {
      const sowDate = parseISO(plan.sow_date);
      const daysToHarvest = plan.crops?.days_to_harvest || 10;
      return addDays(sowDate, daysToHarvest);
    } catch {
      return new Date();
    }
  };

  console.log('🎨 RENDERUJEM:', filteredPlans.length, 'plánov');
  console.log('🎨 Dátumy v plansByDate:', Object.keys(plansByDate));

  return (
    <MainLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-background">
          <PageHeader
            title="Plán sadenia"
            description="Generovanie a správa plánu sadenia podľa objednávok"
          />

          <div className="container mx-auto px-4 py-6 space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-primary" />
                  Generovať plán sadenia
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-date">Dátum od</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="end-date">Dátum do</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="w-full"
                    >
                      {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {!generating && <Sparkles className="mr-2 h-4 w-4" />}
                      Vygenerovať plán
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Vytvorí výsevy z potvrdených objednávok
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Karty
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4 mr-2" />
                  Zoznam
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Kalendár
                </Button>
              </div>

              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všetky</SelectItem>
                    <SelectItem value="planned">Plánované</SelectItem>
                    <SelectItem value="completed">Hotové</SelectItem>
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <Button onClick={() => setNewPlantingDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nový výsev
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-6 w-40 mb-3" />
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredPlans.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-8 w-8" />}
                title="Žiadne plány sadenia"
                description="Vygenerujte plán sadenia pre vybrané obdobie."
              />
            ) : viewMode === 'cards' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredPlans.map(plan => (
                  <Card
                    key={plan.id}
                    className={`p-4 hover:border-primary/50 cursor-pointer transition-colors ${
                      plan.status === 'completed' ? 'bg-green-50 border-green-200' :
                      (plan as any).is_test ? 'bg-yellow-50 border-yellow-200' : ''
                    }`}
                    onClick={() => openDetailDialog(plan)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {(plan as any).is_mixed ? (
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs h-8 px-3 flex items-center">
                            <Layers className="h-3 w-3 mr-1" />
                            KOMBINOVANÝ VÝSEV
                          </Badge>
                        ) : null}

                        {(plan as any).is_test && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs h-8 px-3 flex items-center">
                            🧪 TEST
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant={plan.status === 'completed' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleMarkComplete(plan.id, plan.crop_id, plan.sow_date)}
                          disabled={!isAdmin}
                          className={cn(
                            "h-8 px-3 text-xs gap-1.5 rounded-full",
                            plan.status === 'completed'
                              ? "bg-green-600 hover:bg-green-700 text-white border-0"
                              : "border-gray-300 hover:bg-gray-50 text-gray-700"
                          )}
                        >
                          {plan.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                          <span>Hotovo</span>
                        </Button>

                        {plan.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkPlanned(plan.id, plan.crop_id, plan.sow_date)}
                            disabled={!isAdmin}
                            className="h-8 px-3 text-xs text-gray-600 hover:text-gray-900"
                          >
                            Vrátiť späť
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-green-100">
                        {(plan as any).is_mixed ? (
                          <Layers className="h-5 w-5 text-green-600" />
                        ) : (
                          <Sprout className="h-5 w-5 text-green-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="mb-2">
                          {!(plan as any).is_mixed && (
                            <h3 className="font-semibold text-base">{plan.crops?.name || 'Neznáma plodina'}</h3>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDate(plan.sow_date)}
                          </p>
                        </div>

                        <div className="space-y-1">
                          {(plan as any).is_mixed && (plan as any).mix_configuration ? (
                            <div className="text-xs space-y-1">
                              {(() => {
                                try {
                                  const mixConfig = JSON.parse((plan as any).mix_configuration);
                                  return mixConfig.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-1">
                                      <span className="font-medium">{item.crop_name}</span>
                                      <span className="text-muted-foreground">{item.percentage}%</span>
                                    </div>
                                  ));
                                } catch (e) {
                                  return <span className="text-muted-foreground">Chyba načítania mixu</span>;
                                }
                              })()}
                            </div>
                          ) : null}
                          <div className="space-y-1">
                            {plan.trays.map((tray, idx) => (
                              <p key={idx} className="text-sm">
                                {tray.count} × {tray.size}
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({formatGrams(tray.seeds_per_tray)}g/tácka)
                                </span>
                              </p>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Celkom: {formatGrams(plan.total_seed_grams || 0)}g
                          </p>
                        </div>

                        {(plan as any).notes && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            📝 {(plan as any).notes}
                          </p>
                        )}

                        <div className="mt-3 flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(plan)}
                            disabled={!isAdmin}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setDeleteId(plan.id)}
                            disabled={!isAdmin}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : viewMode === 'list' ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left align-middle py-3">Plodina</TableHead>
                      <TableHead className="text-center align-middle py-3">Dátum výsevu</TableHead>
                      <TableHead className="text-center align-middle py-3">Dátum zberu</TableHead>
                      <TableHead className="text-center align-middle py-3">Tácky</TableHead>
                      <TableHead className="text-center align-middle py-3">Semená</TableHead>
                      <TableHead className="text-center align-middle py-3">Status</TableHead>
                      <TableHead className="text-center align-middle py-3">Akcie</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map(plan => (
                      <TableRow
                        key={plan.id}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          plan.status === 'completed' ? 'bg-green-50' :
                          (plan as any).is_test ? 'bg-yellow-50' : ''
                        }`}
                        onClick={() => openDetailDialog(plan)}
                      >
                        <TableCell className="text-left align-middle py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: `${plan.crops?.color || '#22c55e'}20`,
                                color: plan.crops?.color || '#22c55e'
                              }}
                            >
                              <Leaf className="h-3 w-3" />
                            </div>
                            {(plan as any).is_mixed ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs">
                                    <Layers className="h-3 w-3 mr-1" />
                                    KOMBINOVANÝ VÝSEV
                                  </Badge>
                                  {(plan as any).is_test && (
                                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                      🧪 TEST
                                    </Badge>
                                  )}
                                </div>
                                {(() => {
                                  try {
                                    const mixConfig = JSON.parse((plan as any).mix_configuration || '[]');
                                    return (
                                      <span className="text-xs text-muted-foreground">
                                        {mixConfig.map((item: any) => `${item.crop_name} ${item.percentage}%`).join(' + ')}
                                      </span>
                                    );
                                  } catch (e) {
                                    return null;
                                  }
                                })()}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{plan.crops?.name || 'Neznáma'}</span>
                                {(plan as any).is_test && (
                                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                    🧪 TEST
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle py-3">{formatDate(plan.sow_date)}</TableCell>
                        <TableCell className="text-center align-middle py-3">{formatDate(getHarvestDate(plan).toISOString())}</TableCell>
                        <TableCell className="text-center align-middle py-3">
                          {plan.trays ? (
                            <div className="flex flex-col gap-1">
                              {plan.trays.map((tray, idx) => (
                                <span key={idx} className="text-sm">
                                  {tray.count}×{tray.size}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span>{(plan as any).tray_count}×{(plan as any).tray_size}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center align-middle py-3">
                          {plan.trays ? (
                            <div className="flex flex-col gap-1">
                              {plan.trays.map((tray, idx) => (
                                <span key={idx} className="text-xs text-gray-600">
                                  {formatGrams(tray.seeds_per_tray)}g/tácka
                                </span>
                              ))}
                              <span className="font-medium text-sm border-t pt-1 mt-1">
                                Σ {formatGrams(plan.trays.reduce((sum, t) => sum + t.total_seeds, 0))}g
                              </span>
                            </div>
                          ) : (
                            <span>{formatGrams((plan as any).total_seed_grams || 0)}g</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center align-middle py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center">
                            <Button
                              variant={plan.status === 'completed' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => plan.status === 'completed' ? handleMarkPlanned(plan.id, plan.crop_id, plan.sow_date) : handleMarkComplete(plan.id, plan.crop_id, plan.sow_date)}
                              disabled={!isAdmin}
                              className={cn(
                                "h-8 px-3 text-xs gap-1.5 rounded-full",
                                plan.status === 'completed'
                                  ? "bg-green-600 hover:bg-green-700 text-white border-0"
                                  : "border-gray-300 hover:bg-gray-50 text-gray-700"
                              )}
                            >
                              {plan.status === 'completed' ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                              <span>Hotovo</span>
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openDetailDialog(plan)}
                            >
                              <Info className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(plan)}
                              disabled={!isAdmin}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setDeleteId(plan.id)}
                              disabled={!isAdmin}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedDates.map(date => {
                  const plansForDate = plansByDate[date];
                  return (
                    <Card key={date} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">
                            {formatDate(date)}
                          </h3>
                        </div>
                        <Badge variant="secondary">
                          {plansForDate.length}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {plansForDate.map(plan => (
                          <div
                            key={plan.id}
                            className={`flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors ${
                              plan.status === 'completed' ? 'bg-green-50' : 'bg-muted/30'
                            }`}
                            onClick={() => openDetailDialog(plan)}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {(plan as any).is_mixed ? (
                                <Layers className="h-4 w-4 flex-shrink-0 text-green-600" />
                              ) : (
                                <Leaf
                                  className="h-4 w-4 flex-shrink-0"
                                  style={{ color: plan.crops?.color || '#22c55e' }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                {(plan as any).is_mixed ? (
                                  <>
                                    <p className="font-medium truncate">Kombinovaný výsev</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {(() => {
                                        try {
                                          const mixConfig = JSON.parse((plan as any).mix_configuration);
                                          return mixConfig.map((m: any) => `${m.crop_name} ${m.percentage}%`).join(' + ');
                                        } catch {
                                          return plan.tray_count + ' × ' + plan.tray_size;
                                        }
                                      })()}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="font-medium truncate">
                                      {plan.crops?.name || 'Neznáma plodina'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {plan.trays ? (
                                        plan.trays.map((t, i) => `${t.count}×${t.size}`).join(', ')
                                      ) : (
                                        `${(plan as any).tray_count}×${(plan as any).tray_size}`
                                      )}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                            {plan.status === 'completed' && (
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </div>
      </PullToRefresh>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail plánu sadenia</DialogTitle>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: `${selectedPlan.crops?.color || '#22c55e'}20`,
                    color: selectedPlan.crops?.color || '#22c55e'
                  }}
                >
                  {(selectedPlan as any).is_mixed ? (
                    <Layers className="h-6 w-6" />
                  ) : (
                    <Leaf className="h-6 w-6" />
                  )}
                </div>
                <div>
                  {(selectedPlan as any).is_mixed && (selectedPlan as any).mix_configuration ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">Kombinovaný výsev</h3>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                          <Layers className="h-3 w-3 mr-1" />
                          KOMBINOVANÝ VÝSEV
                        </Badge>
                        {selectedPlan.status === 'completed' && (
                          <Badge className="bg-green-500 text-white hover:bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Hotové
                          </Badge>
                        )}
                        {(selectedPlan as any).is_test && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            🧪 TEST
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 mt-2">
                        {(() => {
                          try {
                            const mixConfig = JSON.parse((selectedPlan as any).mix_configuration);
                            return mixConfig.map((mix: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center py-1 border-b text-sm">
                                <span className="font-medium">{mix.crop_name}</span>
                                <Badge variant="outline">{mix.percentage}%</Badge>
                              </div>
                            ));
                          } catch (e) {
                            return <span className="text-muted-foreground">Chyba načítania mixu</span>;
                          }
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xl font-bold">{selectedPlan.crops?.name || 'Neznáma plodina'}</h3>
                      <div className="flex gap-2 mt-1">
                        {selectedPlan.status === 'completed' && (
                          <Badge className="bg-green-500 text-white hover:bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Hotové
                          </Badge>
                        )}
                        {(selectedPlan as any).is_test && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            🧪 TEST
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dátum výsevu</p>
                  <p className="font-medium">{formatDate(selectedPlan.sow_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dátum zberu</p>
                  <p className="font-medium">
                    {formatDate(getHarvestDate(selectedPlan).toISOString())}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dni do zberu</p>
                  <p className="font-medium">{selectedPlan.crops?.days_to_harvest || 10} dní</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {selectedPlan.status === 'completed' ? 'Hotovo' : 'Plánované'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-4 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <h4 className="font-semibold text-sm">Kombinácia tácok</h4>
                </div>

                {(selectedPlan as GroupedPlantingPlan).trays ? (
                  <div className="space-y-2">
                    {(selectedPlan as GroupedPlantingPlan).trays.map((tray, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm py-1">
                        <span className="font-medium">
                          {tray.count} × {tray.size}
                        </span>
                        <span className="text-xs text-gray-600">
                          {formatGrams(tray.seeds_per_tray)}g/tácka • {formatGrams(tray.total_seeds)}g celkom
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <p className="text-sm font-semibold">
                        Celkom semien: {formatGrams(selectedPlan.total_seed_grams || 0)}g
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">
                      {(selectedPlan as PlantingPlan).tray_count} × {(selectedPlan as PlantingPlan).tray_size}
                    </p>

                    <p className="text-xs text-gray-600">
                      Hustota: {(selectedPlan as PlantingPlan).seed_amount_grams || 0}g/tácka
                    </p>
                  </>
                )}

                {(selectedPlan as any).is_mixed && (selectedPlan as any).mix_configuration && (
                  <div className="mt-3 pt-3 border-t">
                    <Label className="text-xs font-medium text-gray-700 mb-2 block">
                      Rozpad semien:
                    </Label>

                    <div className="space-y-1">
                      {(() => {
                        try {
                          const mixConfig = JSON.parse((selectedPlan as any).mix_configuration);
                          const totalDensity = selectedPlan.seed_amount_grams;

                          console.log('=== ROZPAD SEMIEN DEBUG ===');
                          console.log('seed_amount_grams z DB:', selectedPlan.seed_amount_grams);
                          console.log('Mix config:', mixConfig);

                          const prepoctaneHodnoty = mixConfig.map((m: any) => {
                            const gramov = (totalDensity * m.percentage / 100).toFixed(1);
                            return `${m.crop_name}: ${gramov}g`;
                          });
                          console.log('Prepočítané hodnoty:', prepoctaneHodnoty);

                          return mixConfig.map((mix: any, idx: number) => {
                            const mixDensity = totalDensity * (mix.percentage / 100);

                            return (
                              <div key={idx} className="flex justify-between text-xs py-1">
                                <span className="text-gray-600">
                                  • {mix.crop_name} ({mix.percentage}%)
                                </span>
                                <span className="font-medium text-gray-900">
                                  {mixDensity.toFixed(1)}g
                                </span>
                              </div>
                            );
                          });
                        } catch (error) {
                          console.error('Error parsing mix_configuration:', error);
                          return null;
                        }
                      })()}
                    </div>

                    <div className="mt-2 pt-2 border-t flex justify-between text-sm font-semibold">
                      <span>Celkom semien:</span>
                      <span className="text-green-600">
                        {selectedPlan.seed_amount_grams?.toFixed(1)}g
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {(selectedPlan as any).notes && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-semibold mb-2">📝 Poznámka</h4>
                  <p className="text-sm text-gray-700">
                    {(selectedPlan as any).notes}
                  </p>
                </div>
              )}

              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Zdroj objednávok
                  </h4>
                </div>

                <div className="text-sm">
                  {selectedPlan.source_orders && selectedPlan.source_orders.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground mb-2">
                        Tento výsev bol vygenerovaný z {selectedPlan.source_orders.length} objednávok:
                      </p>
                      <div className="space-y-1">
                        {selectedPlan.source_orders.map((orderId, idx) => (
                          <div key={idx} className="flex items-center gap-2 py-1 px-2 bg-white rounded border text-xs">
                            <Package className="h-3 w-3 text-blue-500" />
                            <code className="font-mono">{orderId.substring(0, 8)}...</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Manuálne vytvorený výsev (nie z objednávok)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                  Zavrieť
                </Button>
                {selectedPlan.status === 'planned' ? (
                  isAdmin && (
                    <Button onClick={() => handleMarkComplete(selectedPlan.id, selectedPlan.crop_id, selectedPlan.sow_date)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Označiť hotovo
                    </Button>
                  )
                ) : (
                  isAdmin && (
                    <Button variant="outline" onClick={() => handleMarkPlanned(selectedPlan.id, selectedPlan.crop_id, selectedPlan.sow_date)}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Vrátiť späť
                    </Button>
                  )
                )}
                {isAdmin && (
                  <Button variant="outline" onClick={() => openEditDialog(selectedPlan)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Upraviť
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Grouped Planting Edit Dialog - Choose which tray to edit */}
      <Dialog open={groupedEditDialog.open} onOpenChange={(open) => {
        if (!open) {
          setGroupedEditDialog({ open: false, plan: null });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upraviť výsev - {groupedEditDialog.plan?.crops?.name}</DialogTitle>
            <DialogDescription>
              Tento výsev má {groupedEditDialog.plan?.trays?.length} tácok. Vyberte ktorú chcete upraviť:
            </DialogDescription>
          </DialogHeader>

          {groupedEditDialog.plan && (
            <div className="space-y-3">
              {groupedEditDialog.plan.trays.map((tray, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-4 flex items-center justify-between hover:border-primary transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-lg">
                      {tray.count}×{tray.size}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tray.seeds_per_tray}g/tácka • {tray.total_seeds}g celkom
                    </p>
                  </div>
                  <Button
                    onClick={() => handleEditSpecificTray(groupedEditDialog.plan!, idx)}
                    size="sm"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Upraviť
                  </Button>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGroupedEditDialog({ open: false, plan: null })}
            >
              Zrušiť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newPlantingDialog} onOpenChange={(open) => {
        setNewPlantingDialog(open);
        if (!open) {
          setEditingPlan(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-3">
          <DialogHeader>
            <DialogTitle className="text-base">{editingPlan ? 'Upraviť výsev' : 'Nový výsev'}</DialogTitle>
            <DialogDescription className="text-xs">
              {editingPlan ? 'Upravte existujúci plán sadenia.' : 'Vytvorte nový plán sadenia - štandardná produkcia alebo kombinovaný výsev.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePlanting}>
            <div className="space-y-2">

              <div className="grid gap-1.5">
                <Label className="text-xs font-medium text-gray-600">Kategória plodiny</Label>
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-gradient-to-br from-gray-50 to-gray-100">
                    <TabsTrigger
                      value="all"
                      className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      <Leaf className="h-3 w-3 mr-1" />
                      Všetko
                    </TabsTrigger>
                    <TabsTrigger
                      value="microgreens"
                      className="text-xs data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:shadow-sm"
                    >
                      <Sprout className="h-3 w-3 mr-1" />
                      Mikrozelenina
                    </TabsTrigger>
                    <TabsTrigger
                      value="microherbs"
                      className="text-xs data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
                    >
                      <TreePine className="h-3 w-3 mr-1" />
                      Mikrobylinky
                    </TabsTrigger>
                    <TabsTrigger
                      value="edible_flowers"
                      className="text-xs data-[state=active]:bg-pink-50 data-[state=active]:text-pink-700 data-[state=active]:shadow-sm"
                    >
                      <Flower2 className="h-3 w-3 mr-1" />
                      Jedlé kvety
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-lg border p-3 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-green-600" />
                    <div>
                      <Label className="text-xs font-medium">Kombinovaný výsev</Label>
                      <p className="text-xs text-gray-500">Viac plodín na tácke</p>
                    </div>
                  </div>
                  <Switch
                    checked={isMixedPlanting}
                    onCheckedChange={(checked) => {
                      setIsMixedPlanting(checked === true);
                      if (checked === false) {
                        setMixCrops([
                          { cropId: '', percentage: 50 },
                          { cropId: '', percentage: 50 }
                        ]);
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3 bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
                  <div className="flex items-center gap-2">
                    <Beaker className="h-4 w-4 text-amber-600" />
                    <div>
                      <Label className="text-xs font-medium">Testovací výsev</Label>
                      <p className="text-xs text-gray-500">Test osiva/substrátu</p>
                    </div>
                  </div>
                  <Switch
                    checked={isTest}
                    onCheckedChange={setIsTest}
                  />
                </div>
              </div>

              {!isMixedPlanting ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="crop" className="text-xs font-medium text-gray-600">Plodina *</Label>
                  <Select value={selectedCropId} onValueChange={handleCropSelect}>
                    <SelectTrigger id="crop" className="h-9 text-sm">
                      <SelectValue placeholder="Vyberte plodinu" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCrops.map(crop => (
                        <SelectItem key={crop.id} value={crop.id}>
                          {crop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-gray-700">Plodiny a percentá *</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setMixCrops([...mixCrops, { cropId: '', percentage: 0 }])}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Pridať
                    </Button>
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
                          <SelectTrigger className="h-9 text-sm flex-1">
                            <SelectValue placeholder="Plodina" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCrops.map(crop => (
                              <SelectItem key={crop.id} value={crop.id}>
                                {crop.name}
                              </SelectItem>
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
                            className="h-9 text-sm w-16"
                          />
                          <span className="text-sm text-gray-600">%</span>
                        </div>

                        {mixCrops.length > 2 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-destructive"
                            onClick={() => {
                              setMixCrops(mixCrops.filter((_, i) => i !== index));
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className={`text-sm font-medium ${
                    mixCrops.reduce((sum, c) => sum + c.percentage, 0) === 100
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    Súčet: {mixCrops.reduce((sum, c) => sum + c.percentage, 0)}%
                    {mixCrops.reduce((sum, c) => sum + c.percentage, 0) === 100 && ' ✓'}
                  </div>
                  {(() => {
                    const maxGrowthDays = mixCrops.reduce((max, mc) => {
                      if (!mc.cropId) return max;
                      const crop = crops.find(c => c.id === mc.cropId);
                      const growthDays = crop?.growth_days || crop?.days_to_harvest || 0;
                      return Math.max(max, growthDays);
                    }, 0);

                    if (maxGrowthDays > 0) {
                      return (
                        <p className="text-xs text-gray-500 mt-1">
                          Dátum zberu: {maxGrowthDays} dní (najdlhšia plodina)
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="traySize" className="text-xs font-medium text-gray-600">Veľkosť tácky *</Label>
                  <Select value={selectedTraySize} onValueChange={(val) => setSelectedTraySize(val as 'XL' | 'L' | 'M' | 'S')}>
                    <SelectTrigger id="traySize" className="h-9 text-sm">
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

                <div className="grid gap-1.5">
                  <Label htmlFor="trayCount" className="text-xs font-medium text-gray-600">Počet táciek *</Label>
                  <Input
                    id="trayCount"
                    type="number"
                    min="0"
                    step="1"
                    value={trayCount === 0 ? '' : trayCount}
                    onChange={(e) => setTrayCount(e.target.value === '' ? 0 : parseInt(e.target.value))}
                    onBlur={(e) => {
                      if (e.target.value === '') setTrayCount(0);
                    }}
                    placeholder="0"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {!isMixedPlanting && (
                <div className="space-y-3 rounded-lg border border-gray-200 p-3 bg-gradient-to-br from-gray-50 to-white">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-gray-700">Hustota semien</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={useCustomDensity}
                        onCheckedChange={(checked) => {
                          setUseCustomDensity(checked === true);
                          if (checked === false) {
                            setCustomSeedDensity(0);
                          } else {
                            setCustomSeedDensity(dbSeedDensity);
                          }
                        }}
                        id="custom-density"
                      />
                      <Label htmlFor="custom-density" className="text-xs text-gray-600 cursor-pointer">
                        Vlastná hustota
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
                        className="text-sm"
                        placeholder="0"
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">g/tácka</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      Automaticky: <span className="font-semibold text-gray-900">{formatGrams(seedDensity)}g/tácka</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600">Celkom pre všetky tácky:</span>
                      <span className="font-bold text-green-600 text-sm">{formatGrams(totalSeedGrams)}g</span>
                    </div>
                  </div>
                </div>
              )}

              {isMixedPlanting && (
                <div className="space-y-2 rounded-lg border p-3 bg-gray-50">
                  <Label className="text-xs font-medium">Celková hustota semien (mix)</Label>
                  <div className="space-y-1 text-xs">
                    {mixCrops.map((mc, idx) => {
                      if (!mc.cropId) return null;
                      const crop = crops.find(c => c.id === mc.cropId);
                      if (!crop?.tray_configs?.[selectedTraySize]) return null;

                      const fullDensity = crop.tray_configs[selectedTraySize].seed_density_grams || crop.tray_configs[selectedTraySize].seed_density || 0;
                      const mixDensity = fullDensity * (mc.percentage / 100);

                      return (
                        <div key={idx} className="flex justify-between text-gray-700">
                          <span>• {crop.name} ({mc.percentage}%)</span>
                          <span className="font-medium">{mixDensity.toFixed(1)}g</span>
                        </div>
                      );
                    })}
                    <div className="border-t pt-1 mt-1 flex justify-between font-medium">
                      <span>Celkom:</span>
                      <span>{mixedSeedDensity.toFixed(1)}g / tácka</span>
                    </div>
                    <div className="flex justify-between text-gray-600 text-xs pt-1 border-t">
                      <span>Celková potreba semien:</span>
                      <span className="font-medium">{formatGrams(totalSeedGrams)}g</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="sow-date" className="text-xs font-medium">
                    Dátum výsevu *
                  </Label>
                  <Input
                    id="sow-date"
                    type="date"
                    value={sowDate}
                    onChange={(e) => setSowDate(e.target.value)}
                    required
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="harvest-date" className="text-xs font-medium">
                    Dátum zberu
                  </Label>
                  <Input
                    id="harvest-date"
                    type="date"
                    value={harvestDate}
                    disabled
                    className="text-sm bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    Automaticky: {selectedCrop?.days_to_harvest || 0} dní od výsevu
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-medium">
                  Poznámka <span className="text-gray-400">(voliteľné)</span>
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Napr: šarža semien, poznámky k testu, informácie o substrát..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>

            </div>

            <DialogFooter className="mt-3">
              <Button type="button" variant="outline" onClick={() => setNewPlantingDialog(false)} className="h-9 text-sm">
                Zrušiť
              </Button>
              <Button
                type="submit"
                disabled={
                  saving ||
                  (isMixedPlanting
                    ? (mixCrops.length === 0 ||
                       mixCrops.some(mc => !mc.cropId) ||
                       mixCrops.reduce((sum, mc) => sum + mc.percentage, 0) !== 100)
                    : !selectedCropId
                  ) ||
                  !selectedTraySize ||
                  trayCount === 0 ||
                  !sowDate ||
                  !harvestDate
                }
                className="h-9 text-sm"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vytvoriť výsev
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Vymazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default PlantingPlanPage;
