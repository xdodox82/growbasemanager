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
  Info,
  Beaker,
  RotateCcw,
  Sparkles,
  Package,
  Layers,
  TreePine,
  Flower2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, parseISO } from 'date-fns';
import { sk } from 'date-fns/locale';

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
        .gte('sow_date', startDate)
        .lte('sow_date', endDate)
        .order('sow_date');

      if (error) throw error;

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

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const formattedStartDate = startDate;
      const formattedEndDate = endDate;

      console.log('Calling RPC with:', {
        p_start_date: formattedStartDate,
        p_end_date: formattedEndDate
      });

      const { data, error } = await supabase.rpc('generate_planting_plan', {
        p_start_date: formattedStartDate,
        p_end_date: formattedEndDate,
      });

      console.log('RPC response:', { data, error });

      if (error) {
        console.error('RPC error details:', error);
        toast({
          title: 'Chyba',
          description: error.message || 'Nepodarilo sa vygenerovať plán',
          variant: 'destructive',
        });
        return;
      }

      const results = data as GeneratePlanResult[];
      const newPlansCount = results?.filter(r => r.created_new).length || 0;

      toast({
        title: 'Plán vygenerovaný',
        description: `Vytvorených ${newPlansCount} nových plánov sadenia, celkom ${results?.length || 0} plánov.`,
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

  const handleMarkComplete = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('planting_plans')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (error) throw error;

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

  const handleMarkPlanned = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('planting_plans')
        .update({
          status: 'planned',
          completed_at: null
        })
        .eq('id', planId);

      if (error) throw error;

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

  const openDetailDialog = (plan: PlantingPlan) => {
    setSelectedPlan(plan);
    setIsDetailDialogOpen(true);
  };

  const openEditDialog = (plan: PlantingPlan) => {
    setEditingPlan(plan);

    // Handle mixed planting
    if ((plan as any).is_mixed && (plan as any).mix_configuration) {
      setIsMixedPlanting(true);
      try {
        const mixConfig = JSON.parse((plan as any).mix_configuration);
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

      const crop = crops.find(c => c.id === plan.crop_id);
      setSelectedCategory(crop?.category || 'all');
      setSelectedCropId(plan.crop_id);

      if (crop?.tray_configs) {
        const dbDensity = crop.tray_configs[plan.tray_size]?.seed_density_grams ||
                          crop.tray_configs[plan.tray_size]?.seed_density || 0;

        if (plan.seed_amount_grams !== dbDensity) {
          setUseCustomDensity(true);
          setCustomSeedDensity(plan.seed_amount_grams);
        } else {
          setUseCustomDensity(false);
          setCustomSeedDensity(0);
        }
      }
    }

    setSowDate(plan.sow_date);
    setSelectedTraySize(plan.tray_size);
    setTrayCount(plan.tray_count);
    setIsTest((plan as any).is_test || false);
    setNotes((plan as any).notes || '');

    setIsDetailDialogOpen(false);
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
    if (statusFilter === 'all') return plans;
    return plans.filter(plan => plan.status === statusFilter);
  }, [plans, statusFilter]);

  const plansByDate = useMemo(() => {
    const grouped: Record<string, PlantingPlan[]> = {};
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

  const getHarvestDate = (plan: PlantingPlan) => {
    try {
      const sowDate = parseISO(plan.sow_date);
      const daysToHarvest = plan.crops?.days_to_harvest || 10;
      return addDays(sowDate, daysToHarvest);
    } catch {
      return new Date();
    }
  };

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
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded flex items-center justify-center"
                          style={{
                            backgroundColor: `${plan.crops?.color || '#22c55e'}20`,
                            color: plan.crops?.color || '#22c55e'
                          }}
                        >
                          <Leaf className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {(plan as any).is_mixed ? (
                              <div className="flex items-center gap-1">
                                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs">
                                  <Layers className="h-3 w-3 mr-1" />
                                  KOMBINOVANÝ VÝSEV
                                </Badge>
                              </div>
                            ) : (
                              <h3 className="font-semibold">{plan.crops?.name || 'Neznáma plodina'}</h3>
                            )}
                            {(plan as any).is_test && (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                🧪 TEST
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(plan.sow_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {plan.status === 'completed' ? (
                          <Badge className="bg-green-500 text-white hover:bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Hotovo
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkComplete(plan.id)}
                            disabled={!isAdmin}
                            className="h-8"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Hotovo
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
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
                      <p className="text-sm">
                        {plan.tray_count}× {plan.tray_size}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(plan as any).is_mixed ? (
                          <>Mix: {formatGrams(plan.total_seed_grams || 0)}g celkom</>
                        ) : (
                          <>{formatGrams(plan.tray_config?.seed_density_grams || plan.seed_amount_grams || 0)}g/tácka • {formatGrams(plan.total_seed_grams || (plan.tray_count * (plan.tray_config?.seed_density_grams || 0)))}g celkom</>
                        )}
                      </p>
                    </div>

                    {(plan as any).notes && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        📝 {(plan as any).notes}
                      </p>
                    )}

                    <div className="mt-3 flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {plan.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleMarkPlanned(plan.id)}
                          disabled={!isAdmin}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Vrátiť späť
                        </Button>
                      )}
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
                  </Card>
                ))}
              </div>
            ) : viewMode === 'list' ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plodina</TableHead>
                      <TableHead>Dátum výsevu</TableHead>
                      <TableHead>Dátum zberu</TableHead>
                      <TableHead>Tácky</TableHead>
                      <TableHead>Semená</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Akcie</TableHead>
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
                        <TableCell>
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
                        <TableCell>{formatDate(plan.sow_date)}</TableCell>
                        <TableCell>{formatDate(getHarvestDate(plan).toISOString())}</TableCell>
                        <TableCell>{plan.tray_count}× {plan.tray_size}</TableCell>
                        <TableCell>{formatGrams(plan.total_seed_grams || (plan.tray_count * (plan.tray_config?.seed_density_grams || 0)))}g</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {plan.status === 'completed' ? (
                              <Badge className="bg-green-500 text-white hover:bg-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Hotovo
                              </Badge>
                            ) : (
                              <Badge variant="outline">Plánované</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                              <Leaf
                                className="h-4 w-4 flex-shrink-0"
                                style={{ color: plan.crops?.color || '#22c55e' }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {plan.crops?.name || 'Neznáma plodina'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {plan.tray_count}× {plan.tray_size}
                                </p>
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

              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold mb-2">💡 Kombinácia tácok</h4>
                <div className="space-y-1">
                  <p className="font-medium">
                    {selectedPlan.tray_count}× {selectedPlan.tray_size}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Hustota: {formatGrams(selectedPlan.tray_config?.seed_density_grams || selectedPlan.seed_amount_grams || 0)}g/tácka
                  </p>
                  {(selectedPlan.tray_config?.yield_grams || 0) > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Očakávaný výnos: {formatGrams(selectedPlan.tray_config?.yield_grams)}g/tácka
                    </p>
                  )}

                  {(selectedPlan as any).is_mixed && (selectedPlan as any).mix_configuration ? (
                    <div className="space-y-2 mt-3">
                      <Label className="text-xs font-medium text-gray-700">Rozpad semien:</Label>
                      {(() => {
                        try {
                          const mixConfig = JSON.parse((selectedPlan as any).mix_configuration);
                          return mixConfig.map((mix: any, idx: number) => {
                            const crop = crops.find(c => c.id === mix.crop_id);
                            if (!crop?.tray_configs?.[selectedPlan.tray_size]) return null;

                            const fullDensity = crop.tray_configs[selectedPlan.tray_size].seed_density_grams || 0;
                            const mixDensity = fullDensity * (mix.percentage / 100);

                            return (
                              <div key={idx} className="flex justify-between text-sm py-1 border-b">
                                <span className="text-gray-700">
                                  • {mix.crop_name} ({mix.percentage}%)
                                </span>
                                <span className="font-medium text-gray-900">
                                  {mixDensity.toFixed(1)}g
                                </span>
                              </div>
                            );
                          });
                        } catch (e) {
                          return null;
                        }
                      })()}

                      <div className="flex justify-between font-semibold text-sm pt-1 border-t">
                        <span>Celkom:</span>
                        <span className="text-green-600">
                          {formatGrams(selectedPlan.seed_amount_grams || 0)}g / tácka
                        </span>
                      </div>

                      {selectedPlan.tray_count > 1 && (
                        <div className="text-xs text-gray-500">
                          Celková potreba: {formatGrams((selectedPlan.seed_amount_grams || 0) * selectedPlan.tray_count)}g
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="font-medium text-primary">
                      Celkom semien: {formatGrams(selectedPlan.total_seed_grams || (selectedPlan.tray_count * (selectedPlan.tray_config?.seed_density_grams || 0)))}g
                    </p>
                  )}
                </div>
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
                    Objednávky
                  </h4>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Pre tento výsev zatiaľ nie je dostupný detail objednávok.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                  Zavrieť
                </Button>
                {selectedPlan.status === 'planned' ? (
                  isAdmin && (
                    <Button onClick={() => handleMarkComplete(selectedPlan.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Označiť hotovo
                    </Button>
                  )
                ) : (
                  isAdmin && (
                    <Button variant="outline" onClick={() => handleMarkPlanned(selectedPlan.id)}>
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
                    ? (mixCrops.length === 0 || mixCrops.some(mc => !mc.cropId))
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
