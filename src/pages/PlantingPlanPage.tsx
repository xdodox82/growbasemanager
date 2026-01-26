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
  Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, parseISO } from 'date-fns';
import { sk } from 'date-fns/locale';
import { TestPlantingDialog } from '@/components/planting/TestPlantingDialog';

interface Crop {
  id: string;
  name: string;
  color: string;
  days_to_harvest: number;
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

interface TestPlanting {
  id: string;
  crop_id: string;
  test_type: string;
  batch_number?: string;
  sow_date: string;
  harvest_date: string;
  tray_size: 'XL' | 'L' | 'M' | 'S';
  tray_count: number;
  seed_amount_grams: number;
  total_seed_grams: number;
  notes?: string;
  status: string;
  completed_at?: string;
  crops?: Crop;
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
  const [testPlantings, setTestPlantings] = useState<TestPlanting[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlantingPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlantingPlan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState('production');
  const [newPlantingDialog, setNewPlantingDialog] = useState(false);
  const [newTestDialog, setNewTestDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCropId, setSelectedCropId] = useState('');
  const [sowDate, setSowDate] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [selectedTraySize, setSelectedTraySize] = useState<'XL' | 'L' | 'M' | 'S'>('XL');
  const [trayCount, setTrayCount] = useState(0);
  const [useCustomDensity, setUseCustomDensity] = useState(false);
  const [customSeedDensity, setCustomSeedDensity] = useState(0);
  const [crops, setCrops] = useState<Crop[]>([]);

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

  const seedDensity = useCustomDensity ? customSeedDensity : dbSeedDensity;
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

  const fetchTestPlantings = useCallback(async () => {
    try {
      const { data: testsData, error } = await supabase
        .from('test_plantings')
        .select(`
          *,
          crops:crop_id(id, name, color, days_to_harvest, tray_configs)
        `)
        .gte('sow_date', startDate)
        .lte('sow_date', endDate)
        .order('sow_date');

      if (error) {
        console.error('Test plantings error:', error);
        setTestPlantings([]);
        return;
      }
      setTestPlantings(testsData || []);
    } catch (error) {
      console.error('Error fetching test plantings:', error);
      setTestPlantings([]);
    }
  }, [startDate, endDate]);

  const handleRefresh = useCallback(async () => {
    await fetchPlans();
    await fetchTestPlantings();
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

    const crop = crops.find(c => c.id === plan.crop_id);
    setSelectedCategory(crop?.category || 'all');
    setSelectedCropId(plan.crop_id);
    setSowDate(plan.sow_date);
    setSelectedTraySize(plan.tray_size);
    setTrayCount(plan.tray_count);


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

    setIsDetailDialogOpen(false);
    setNewPlantingDialog(true);
  };


  const handleCreatePlanting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const isEdit = !!editingPlan;

    console.log(isEdit ? '=== UPDATING PLANTING ===' : '=== CREATING PLANTING ===');
    console.log('Selected Crop ID:', selectedCropId);
    console.log('Sow Date:', sowDate);
    console.log('Tray Size:', selectedTraySize);
    console.log('Tray Count:', trayCount);
    console.log('Seed Density:', seedDensity);
    try {
      const dataToSave = {
        crop_id: selectedCropId,
        sow_date: sowDate,
        tray_size: selectedTraySize,
        tray_count: trayCount,
        seed_amount_grams: seedDensity,
        total_seed_grams: totalSeedGrams,
        status: 'planned'
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
    fetchTestPlantings();
    fetchCrops();
  }, [fetchPlans, fetchTestPlantings, fetchCrops]);

  useEffect(() => {
    if (sowDate && selectedCrop?.days_to_harvest) {
      const sow = new Date(sowDate);
      sow.setDate(sow.getDate() + selectedCrop.days_to_harvest);
      setHarvestDate(format(sow, 'yyyy-MM-dd'));
    }
  }, [sowDate, selectedCrop]);

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
                      disabled={true}
                      className="w-full"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Vygenerovať plán
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      (Funkcia sa pripravuje)
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="production">📦 Produkcia</TabsTrigger>
                <TabsTrigger value="tests">🧪 Testy</TabsTrigger>
              </TabsList>

              <TabsContent value="production" className="space-y-6">
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
                      plan.status === 'completed' ? 'bg-green-50 border-green-200' : ''
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
                          <h3 className="font-semibold">{plan.crops?.name || 'Neznáma plodina'}</h3>
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
                      <p className="text-sm">
                        {plan.tray_count}× {plan.tray_size}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatGrams(plan.tray_config?.seed_density_grams || plan.seed_amount_grams || 0)}g/tácka • {formatGrams(plan.total_seed_grams || (plan.tray_count * (plan.tray_config?.seed_density_grams || 0)))}g celkom
                      </p>
                    </div>

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
                          plan.status === 'completed' ? 'bg-green-50' : ''
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
                            <span className="font-medium">{plan.crops?.name || 'Neznáma'}</span>
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
          </TabsContent>

          <TabsContent value="tests" className="space-y-6">
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
              </div>

              {isAdmin && (
                <Button onClick={() => setNewTestDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nový test
                </Button>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-32" />
                  </Card>
                ))}
              </div>
            ) : testPlantings.length === 0 ? (
              <EmptyState
                icon={<Beaker className="h-8 w-8" />}
                title="Žiadne testy"
                description="Zatiaľ nemáte žiadne testové výsevy. Vytvorte prvý test kliknutím na tlačidlo Nový test."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testPlantings.map(test => (
                  <Card
                    key={test.id}
                    className="p-4 bg-yellow-50 border-yellow-200 hover:border-yellow-300 cursor-pointer transition-colors"
                    onClick={() => {}}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-8 w-8 rounded flex items-center justify-center"
                          style={{
                            backgroundColor: `${test.crops?.color || '#eab308'}20`,
                            color: test.crops?.color || '#eab308'
                          }}
                        >
                          <Beaker className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{test.crops?.name || 'Neznáma plodina'}</h3>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(test.sow_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {test.status === 'completed' ? (
                          <Badge className="bg-green-500 text-white hover:bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Hotovo
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
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
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-600 text-white text-xs">
                          🧪 {test.test_type.toUpperCase()}
                        </Badge>
                        {test.batch_number && (
                          <Badge variant="outline" className="text-xs">
                            Šarža: {test.batch_number}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm">
                        <span className="font-medium">{test.tray_count}× {test.tray_size}</span> tácky
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(test.total_seed_grams * 10) / 10}g semien
                      </p>
                      {test.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {test.notes}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
          </div>
        </div>
      </PullToRefresh>

      <TestPlantingDialog
        open={newTestDialog}
        onOpenChange={setNewTestDialog}
        onSuccess={() => {
          fetchTestPlantings();
        }}
      />

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
                  <Leaf className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedPlan.crops?.name || 'Neznáma plodina'}</h3>
                  {selectedPlan.status === 'completed' && (
                    <Badge className="mt-1 bg-green-500 text-white hover:bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Hotové
                    </Badge>
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
                  <p className="font-medium text-primary">
                    Celkom semien: {formatGrams(selectedPlan.total_seed_grams || (selectedPlan.tray_count * (selectedPlan.tray_config?.seed_density_grams || 0)))}g
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Objednávky
                  </h4>
                  <Badge variant="secondary">0 obj.</Badge>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Pre tento výsev zatiaľ nie je dostupný detail objednávok.</p>
                  <p className="text-xs mt-1">
                    (Funkcia sa pripravuje - prepojenie s objednávkami)
                  </p>
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Upraviť výsev' : 'Nový výsev'}</DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Upravte existujúci plán sadenia.' : 'Vytvorte nový plán sadenia - štandardná produkcia alebo test osiva.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePlanting}>
            <div className="space-y-3">

              <div className="grid gap-2">
                <Label className="text-xs font-medium">Kategória plodiny</Label>
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 h-9">
                    <TabsTrigger value="all" className="text-xs">Všetko</TabsTrigger>
                    <TabsTrigger value="microgreens" className="text-xs">Mikrozelenina</TabsTrigger>
                    <TabsTrigger value="microherbs" className="text-xs">Mikrobylinky</TabsTrigger>
                    <TabsTrigger value="edible_flowers" className="text-xs">Jedlé kvety</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="crop" className="text-xs font-medium">Plodina *</Label>
                <Select value={selectedCropId} onValueChange={handleCropSelect}>
                  <SelectTrigger id="crop" className="h-9">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="traySize" className="text-xs font-medium">Veľkosť tácky *</Label>
                  <Select value={selectedTraySize} onValueChange={(val) => setSelectedTraySize(val as 'XL' | 'L' | 'M' | 'S')}>
                    <SelectTrigger id="traySize" className="h-9">
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

                <div className="grid gap-2">
                  <Label htmlFor="trayCount" className="text-xs font-medium">Počet táciek *</Label>
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
                    className="h-9"
                  />
                </div>
              </div>

              <div className="border rounded-lg p-2 bg-muted/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="seedDensity" className="text-xs font-medium">Hustota semien</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="customDensity"
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
                    <Label htmlFor="customDensity" className="cursor-pointer font-normal text-xs">
                      Vlastná hustota
                    </Label>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    id="seedDensity"
                    type="number"
                    min="0"
                    step="0.1"
                    value={useCustomDensity ? (customSeedDensity === 0 ? '' : customSeedDensity) : dbSeedDensity}
                    onChange={(e) => {
                      if (useCustomDensity) {
                        setCustomSeedDensity(e.target.value === '' ? 0 : parseFloat(e.target.value));
                      }
                    }}
                    disabled={!useCustomDensity}
                    className="flex-1 h-9"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">g/tácka</span>
                  {dbSeedDensity > 0 && (
                    <Badge variant="outline" className="whitespace-nowrap text-xs">
                      {formatGrams(dbSeedDensity)}g
                    </Badge>
                  )}
                </div>

                {useCustomDensity && dbSeedDensity !== customSeedDensity && dbSeedDensity > 0 && customSeedDensity > 0 && (
                  <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs text-amber-900 dark:text-amber-200">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <p>Upravené z {formatGrams(dbSeedDensity)}g na {formatGrams(customSeedDensity)}g/tácka</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1.5 border-t">
                  <span className="text-xs text-muted-foreground">Celkom:</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatGrams(totalSeedGrams)}g
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="sowDate" className="text-xs font-medium">Dátum výsevu *</Label>
                  <Input
                    id="sowDate"
                    type="date"
                    value={sowDate}
                    onChange={(e) => setSowDate(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="harvestDate" className="text-xs font-medium">Dátum zberu</Label>
                  <Input
                    id="harvestDate"
                    type="date"
                    value={harvestDate}
                    disabled
                    className="bg-muted h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Automaticky: {selectedCrop?.days_to_harvest || 0} dní od výsevu
                  </p>
                </div>
              </div>

            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setNewPlantingDialog(false)} className="h-9">
                Zrušiť
              </Button>
              <Button type="submit" disabled={saving || !selectedCropId || !sowDate || trayCount === 0} className="h-9">
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
