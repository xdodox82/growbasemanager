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

interface Crop {
  id: string;
  name: string;
  color: string;
  days_to_harvest: number;
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlantingPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlantingPlan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newPlantingDialog, setNewPlantingDialog] = useState(false);
  const [plantingType, setPlantingType] = useState('production');
  const [selectedCropId, setSelectedCropId] = useState('');
  const [sowDate, setSowDate] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [trayConfig, setTrayConfig] = useState({ XL: 0, L: 0, M: 0, S: 0 });
  const [seedBatch, setSeedBatch] = useState('');
  const [includeInStats, setIncludeInStats] = useState(true);
  const [testNotes, setTestNotes] = useState('');
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

  const traySizes = ['XL', 'L', 'M', 'S'];

  const getTrayDensity = (size: string) => {
    if (!selectedCrop?.tray_configs) return 0;
    const config = selectedCrop.tray_configs[size];
    return config?.seed_density_grams || config?.seed_density || 0;
  };

  const calculateTotalSeeds = () => {
    let total = 0;
    for (const [size, count] of Object.entries(trayConfig)) {
      total += count * getTrayDensity(size);
    }
    return formatGrams(total);
  };

  const resetForm = () => {
    setPlantingType('production');
    setSelectedCropId('');
    setSowDate('');
    setHarvestDate('');
    setTrayConfig({ XL: 0, L: 0, M: 0, S: 0 });
    setSeedBatch('');
    setIncludeInStats(true);
    setTestNotes('');
  };

  const [editFormData, setEditFormData] = useState({
    tray_count: 0,
    tray_size: 'XL' as 'XL' | 'L' | 'M' | 'S',
  });

  const fetchCrops = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, days_to_harvest, tray_configs, color')
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
    setEditFormData({
      tray_count: plan.tray_count,
      tray_size: plan.tray_size,
    });
    setIsDetailDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPlan) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('planting_plans')
        .update({
          tray_count: editFormData.tray_count,
          tray_size: editFormData.tray_size,
        })
        .eq('id', editingPlan.id);

      if (error) throw error;

      toast({
        title: 'Uložené',
        description: 'Plán sadenia bol aktualizovaný.',
      });

      setIsEditDialogOpen(false);
      setEditingPlan(null);
      await fetchPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa aktualizovať plán.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePlanting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      for (const [size, count] of Object.entries(trayConfig)) {
        if (count > 0) {
          const density = getTrayDensity(size);

          const { error } = await supabase
            .from('planting_plans')
            .insert({
              crop_id: selectedCropId,
              sow_date: sowDate,
              tray_size: size,
              tray_count: count,
              seed_amount_grams: density,
              total_seed_grams: count * density,
              status: 'planned',
              is_test: plantingType === 'test',
              seed_batch: plantingType === 'test' ? seedBatch : null,
              include_in_stats: plantingType === 'test' ? includeInStats : true,
              test_notes: plantingType === 'test' ? testNotes : null
            });

          if (error) {
            toast({
              title: 'Chyba',
              description: error.message,
              variant: 'destructive'
            });
            setSaving(false);
            return;
          }
        }
      }

      toast({
        title: plantingType === 'test' ? 'Test vytvorený' : 'Výsev vytvorený',
        description: 'Plán sadenia bol úspešne vytvorený.'
      });

      setNewPlantingDialog(false);
      resetForm();
      await fetchPlans();
    } catch (error) {
      console.error('Error creating planting:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa vytvoriť výsev.',
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
    if (selectedCrop && sowDate) {
      const sowDateObj = parseISO(sowDate);
      const harvestDateObj = addDays(sowDateObj, selectedCrop.days_to_harvest || 10);
      setHarvestDate(harvestDateObj.toISOString().split('T')[0]);
    }
  }, [selectedCrop, sowDate]);

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
                      {plan.status === 'completed' && (
                        <Badge className="bg-green-500 text-white hover:bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Hotovo
                        </Badge>
                      )}
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
                      {plan.status === 'planned' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleMarkComplete(plan.id)}
                          disabled={!isAdmin}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Hotovo
                        </Button>
                      ) : (
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
                        className="cursor-pointer hover:bg-muted/50"
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
                          {plan.status === 'completed' ? (
                            <Badge className="bg-green-500 text-white hover:bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Hotovo
                            </Badge>
                          ) : (
                            <Badge variant="outline">Plánované</Badge>
                          )}
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
                            className="flex items-center justify-between p-2 bg-muted/30 rounded hover:bg-muted/50 cursor-pointer transition-colors"
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upraviť plán sadenia</DialogTitle>
            <DialogDescription>
              {editingPlan?.crops?.name || 'Upraviť plán sadenia'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-tray-count">Počet tácok</Label>
              <Input
                id="edit-tray-count"
                type="number"
                min="1"
                value={editFormData.tray_count}
                onChange={(e) => setEditFormData({
                  ...editFormData,
                  tray_count: parseInt(e.target.value) || 0
                })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-tray-size">Veľkosť tácky</Label>
              <Select
                value={editFormData.tray_size}
                onValueChange={(value: 'XL' | 'L' | 'M' | 'S') => setEditFormData({
                  ...editFormData,
                  tray_size: value
                })}
              >
                <SelectTrigger id="edit-tray-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(TRAY_SIZES).map(size => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={saving}
            >
              Zrušiť
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ukladám...
                </>
              ) : (
                'Uložiť'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newPlantingDialog} onOpenChange={setNewPlantingDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nový výsev</DialogTitle>
            <DialogDescription>
              Vytvorte nový plán sadenia - štandardná produkcia alebo test osiva.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePlanting}>
            <div className="space-y-4">

              <div className="grid gap-2">
                <Label>Typ výsevu *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="plantingType"
                      value="production"
                      checked={plantingType === 'production'}
                      onChange={(e) => setPlantingType(e.target.value)}
                      className="h-4 w-4"
                    />
                    <span>📦 Štandardná produkcia</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="plantingType"
                      value="test"
                      checked={plantingType === 'test'}
                      onChange={(e) => setPlantingType(e.target.value)}
                      className="h-4 w-4"
                    />
                    <span>🧪 Test osiva</span>
                  </label>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="crop">Plodina *</Label>
                <Select value={selectedCropId} onValueChange={setSelectedCropId}>
                  <SelectTrigger id="crop">
                    <SelectValue placeholder="Vyberte plodinu" />
                  </SelectTrigger>
                  <SelectContent>
                    {crops.map(crop => (
                      <SelectItem key={crop.id} value={crop.id}>
                        {crop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sowDate">Dátum výsevu *</Label>
                  <Input
                    id="sowDate"
                    type="date"
                    value={sowDate}
                    onChange={(e) => setSowDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="harvestDate">Dátum zberu</Label>
                  <Input
                    id="harvestDate"
                    type="date"
                    value={harvestDate}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Automaticky: {selectedCrop?.days_to_harvest || 0} dní od výsevu
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold mb-3">Kombinácia tácok</h4>
                <div className="space-y-3">
                  {traySizes.map((size) => (
                    <div key={size} className="grid grid-cols-[60px_1fr_1fr] gap-3 items-center">
                      <Label className="font-semibold">{size}</Label>
                      <div className="grid gap-1">
                        <Label className="text-xs text-muted-foreground">Počet tácok</Label>
                        <Input
                          type="number"
                          min="0"
                          value={trayConfig[size as keyof typeof trayConfig] || 0}
                          onChange={(e) => setTrayConfig({
                            ...trayConfig,
                            [size]: parseInt(e.target.value) || 0
                          })}
                          className="h-8"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatGrams(getTrayDensity(size))}g/tácka
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="font-medium text-primary">
                    Celkom semien: {calculateTotalSeeds()}g
                  </p>
                </div>
              </div>

              {plantingType === 'test' && (
                <div className="border-l-4 border-amber-400 pl-4 py-3 bg-amber-50/50 rounded-r space-y-3">
                  <h4 className="font-semibold text-amber-900 flex items-center gap-2">
                    <Beaker className="h-4 w-4" />
                    Testovací výsev
                  </h4>

                  <div className="grid gap-2">
                    <Label htmlFor="seedBatch">Sárža semien</Label>
                    <Input
                      id="seedBatch"
                      value={seedBatch}
                      onChange={(e) => setSeedBatch(e.target.value)}
                      placeholder="napr. 2024-11-A"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="includeStats"
                      checked={includeInStats}
                      onChange={(e) => setIncludeInStats(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="includeStats" className="cursor-pointer">
                      Započítať výnos do štatistík
                    </Label>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="testNotes">Poznámka</Label>
                    <Textarea
                      id="testNotes"
                      value={testNotes}
                      onChange={(e) => setTestNotes(e.target.value)}
                      placeholder="Dôvod testu, očakávania..."
                      rows={2}
                    />
                  </div>

                  <div className="flex items-start gap-2 p-2 bg-amber-100 rounded text-sm text-amber-900">
                    <Beaker className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>Semená sa NEODPOČÍTAJÚ zo skladu pri testovacom výseve.</p>
                  </div>
                </div>
              )}

            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setNewPlantingDialog(false)}>
                Zrušiť
              </Button>
              <Button type="submit" disabled={saving || !selectedCropId || !sowDate}>
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
