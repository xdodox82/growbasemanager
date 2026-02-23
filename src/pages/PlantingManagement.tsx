import { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { usePlantingPlans, useOrders, useCrops, useCustomers, useBlends, useSeeds, useSuppliers, useOrderItems, DbPlantingPlan, CropComponent } from '@/hooks/useSupabaseData';
import { useInventoryConsumption } from '@/hooks/useInventoryConsumption';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Plus, Pencil, Trash2, Leaf, CheckCircle2, Check, ChevronLeft, ChevronRight, TrendingUp, Layers, Undo2 } from 'lucide-react';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isSameDay, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { sk } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  planned: 'Naplánované',
  ready_to_sow: 'Pripravené na siatie',
  sown: 'Zasiate',
  growing: 'Rastie',
  harvested: 'Zozbierané',
};

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-muted text-muted-foreground border-muted',
  ready_to_sow: 'bg-amber-100 text-amber-900 border-amber-300',
  sown: 'bg-info/20 text-info border-info/30',
  growing: 'bg-success/20 text-success border-success/30',
  harvested: 'bg-primary/20 text-primary border-primary/30',
};

interface CropComponentForm {
  cropId: string;
  percentage: number;
  seedId: string;
}

const PlantingManagement = () => {
  const { data: plantingPlansRaw, add: addPlantingPlan, update: updatePlantingPlan, remove: deletePlantingPlan } = usePlantingPlans();
  const { data: ordersRaw } = useOrders();
  const { data: cropsRaw } = useCrops();
  const { data: customersRaw } = useCustomers();
  const { data: blendsRaw } = useBlends();
  const { data: seedsRaw, update: updateSeed } = useSeeds();
  const { data: suppliersRaw } = useSuppliers();
  const { consumeSeeds } = useInventoryConsumption();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DbPlantingPlan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [editableGrammages, setEditableGrammages] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    orderId: '',
    cropId: '',
    seedId: '',
    trays: 1,
    traySize: 'XL',
    isTestBatch: false,
    countAsProduction: false,
    safetyBuffer: 5,
    sowDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'planned',
    notes: '',
    isCombined: false,
    soakingHoursBefore: 12,
  });

  const [cropComponents, setCropComponents] = useState<CropComponentForm[]>([
    { cropId: '', percentage: 50, seedId: '' },
    { cropId: '', percentage: 50, seedId: '' },
  ]);

  const plantingPlans = Array.isArray(plantingPlansRaw) ? plantingPlansRaw : [];
  const orders = Array.isArray(ordersRaw) ? ordersRaw : [];
  const crops = Array.isArray(cropsRaw) ? cropsRaw : [];
  const customers = Array.isArray(customersRaw) ? customersRaw : [];
  const blends = Array.isArray(blendsRaw) ? blendsRaw : [];
  const seeds = Array.isArray(seedsRaw) ? seedsRaw : [];
  const suppliers = Array.isArray(suppliersRaw) ? suppliersRaw : [];

  const getCropName = useCallback((cropId: string | null | undefined) => {
    if (!cropId || !Array.isArray(cropsRaw)) return 'Neznáma plodina';
    return cropsRaw.find(c => c?.id === cropId)?.name || 'Neznáma plodina';
  }, [cropsRaw]);

  const getCropColor = useCallback((cropId: string | null | undefined) => {
    if (!cropId || !Array.isArray(cropsRaw)) return '#888888';
    return cropsRaw.find(c => c?.id === cropId)?.color || '#888888';
  }, [cropsRaw]);

  const getCrop = useCallback((cropId: string | null | undefined) => {
    if (!cropId || !Array.isArray(cropsRaw)) return null;
    return cropsRaw.find(c => c?.id === cropId) || null;
  }, [cropsRaw]);

  const getCropGrammagePerTray = useCallback((cropId: string | null | undefined, traySize: string = 'XL') => {
    if (!cropId || !cropsRaw) return 0;
    const crop = cropsRaw.find(c => c.id === cropId);
    if (!crop || !crop.tray_configs) return 0;
    const config = (crop.tray_configs as any)[traySize];
    return config?.seed_density || 0;
  }, [cropsRaw]);

  const calculateHarvestDate = useCallback((sowDate: string, cropId: string | null) => {
    const crop = getCrop(cropId);
    if (!crop) return null;
    return addDays(new Date(sowDate), crop.days_to_harvest);
  }, [getCrop]);

  const plansForSelectedDate = useMemo(() => {
    if (!Array.isArray(plantingPlans)) return [];
    return plantingPlans.filter(p => {
      if (!p?.sow_date) return false;
      try {
        return isSameDay(startOfDay(new Date(p.sow_date)), startOfDay(selectedDate));
      } catch (e) {
        return false;
      }
    });
  }, [plantingPlans, selectedDate]);

  const sownTodayPlans = useMemo(() => {
    const today = startOfDay(new Date());
    return plantingPlans.filter(p => {
      if (p?.status !== 'sown') return false;
      const sowDate = p?.sow_date ? startOfDay(new Date(p.sow_date)) : null;
      return sowDate && isSameDay(sowDate, today);
    });
  }, [plantingPlans]);

  const statsForSelectedDate = useMemo(() => {
    const totalTrays = plansForSelectedDate.reduce((sum, p) => sum + (p?.tray_count || 0), 0);
    const readyTrays = plansForSelectedDate.filter(p => p?.status === 'ready_to_sow' || p?.status === 'planned').reduce((sum, p) => sum + (p?.tray_count || 0), 0);
    const cropBreakdown = plansForSelectedDate.reduce((acc, plan) => {
      const cropName = getCropName(plan?.crop_id);
      if (!acc[cropName]) {
        acc[cropName] = 0;
      }
      acc[cropName] += plan?.tray_count || 0;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTrays,
      readyTrays,
      cropBreakdown,
    };
  }, [plansForSelectedDate, getCropName]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const datesWithSowings = useMemo(() => {
    if (!Array.isArray(plantingPlans)) return [];
    return plantingPlans
      .filter(p => p?.sow_date)
      .map(p => new Date(p.sow_date!))
      .filter(d => isSameMonth(d, currentMonth));
  }, [plantingPlans, currentMonth]);

  if (!cropsRaw || !plantingPlansRaw) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-lg">Načítavam dáta...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const resetForm = () => {
    setFormData({
      orderId: '',
      cropId: '',
      seedId: '',
      trays: 1,
      traySize: 'XL',
      isTestBatch: false,
      countAsProduction: false,
      safetyBuffer: 5,
      sowDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'planned',
      notes: '',
      isCombined: false,
      soakingHoursBefore: 12,
    });
    setCropComponents([
      { cropId: '', percentage: 50, seedId: '' },
      { cropId: '', percentage: 50, seedId: '' },
    ]);
    setEditingPlan(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.isCombined) {
      const validComponents = cropComponents.filter(c => c.cropId);
      if (validComponents.length < 2) {
        toast({
          title: 'Chyba',
          description: 'Pre kombinovaný výsev vyberte aspoň 2 plodiny',
          variant: 'destructive',
        });
        return;
      }
      const totalPercentage = validComponents.reduce((sum, c) => sum + c.percentage, 0);
      if (totalPercentage !== 100) {
        toast({
          title: 'Chyba',
          description: `Súčet percent musí byť 100% (aktuálne: ${totalPercentage}%)`,
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (!formData.cropId) {
        toast({
          title: 'Chyba',
          description: 'Vyberte plodinu',
          variant: 'destructive',
        });
        return;
      }
    }

    const mainCropId = formData.isCombined ? cropComponents[0]?.cropId : formData.cropId;
    const harvestDate = calculateHarvestDate(formData.sowDate, mainCropId);
    if (!harvestDate) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa vypočítať dátum zberu',
        variant: 'destructive',
      });
      return;
    }

    const planData = {
      order_id: formData.orderId || null,
      crop_id: formData.isCombined ? cropComponents[0]?.cropId || null : formData.cropId,
      tray_count: formData.trays,
      tray_size: formData.traySize,
      is_test_batch: formData.isTestBatch,
      count_as_production: formData.isTestBatch ? formData.countAsProduction : true,
      sow_date: formData.sowDate,
      expected_harvest_date: format(harvestDate, 'yyyy-MM-dd'),
      actual_harvest_date: null,
      status: formData.status,
      notes: formData.notes || null,
      seed_id: formData.isCombined ? null : (formData.seedId || null),
      is_combined: formData.isCombined,
      crop_components: formData.isCombined
        ? cropComponents.filter(c => c.cropId).map(c => ({
            crop_id: c.cropId,
            percentage: c.percentage,
            seed_id: c.seedId || null,
          }))
        : null,
      soaking_hours_before_sowing: formData.soakingHoursBefore,
    };

    if (editingPlan) {
      const { error } = await updatePlantingPlan(editingPlan.id, planData);
      if (!error) {
        toast({
          title: 'Plán aktualizovaný',
          description: 'Plán sadenia bol upravený.',
        });
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await addPlantingPlan(planData);
      if (!error) {
        toast({
          title: 'Plán vytvorený',
          description: 'Nový plán sadenia bol pridaný.',
        });
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      const { error } = await deletePlantingPlan(deleteId);
      if (!error) {
        toast({
          title: 'Plán odstránený',
          description: 'Plán sadenia bol odstránený.',
        });
      }
      setDeleteId(null);
    }
  };

  const markAsSown = async (planId: string) => {
    try {
      const plan = plantingPlans.find(p => p?.id === planId);
      if (!plan) return;

      if (plan?.crop_id) {
        const traySize = (plan as any)?.tray_size || 'XL';
        const grammagePerTray = getCropGrammagePerTray(plan?.crop_id, traySize);
        const calculatedGrammage = grammagePerTray * (plan?.tray_count || 1);
        const actualGrammage = editableGrammages[planId] ?? calculatedGrammage;

        if (actualGrammage > 0) {
          const seedToUse = plan?.seed_id;

          if (seedToUse) {
            const seed = seeds?.find(s => s?.id === seedToUse);
            if (seed && seed.id) {
              let newQuantity: number;
              if (seed.unit === 'kg') {
                newQuantity = (seed.quantity || 0) - (actualGrammage / 1000);
              } else {
                newQuantity = (seed.quantity || 0) - actualGrammage;
              }

              await updateSeed(seed.id, { quantity: Math.max(0, newQuantity) } as any);

              const cropName = getCropName(plan?.crop_id);
              toast({
                title: 'Semená spotrebované',
                description: `Odpočítané ${actualGrammage.toFixed(1)}g semien ${cropName}.`,
              });
            }
          } else {
            await consumeSeeds(plan?.crop_id, plan?.tray_count || 1);
          }
        }
      }

      const { error } = await updatePlantingPlan(planId, { status: 'sown' } as any);
      if (!error) {
        toast({
          title: 'Hotovo',
          description: 'Plán bol označený ako zasiatý.',
        });
        setEditableGrammages({ ...editableGrammages, [planId]: undefined as any });
      }
    } catch (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa označiť plán ako zasiatý.',
        variant: 'destructive',
      });
    }
  };

  const undoSowing = async (planId: string) => {
    try {
      const plan = plantingPlans.find(p => p?.id === planId);
      if (!plan) return;

      if (plan?.crop_id && plan?.seed_id) {
        const traySize = (plan as any)?.tray_size || 'XL';
        const grammagePerTray = getCropGrammagePerTray(plan?.crop_id, traySize);
        const totalGrammage = grammagePerTray * (plan?.tray_count || 1);

        if (totalGrammage > 0) {
          const seed = seeds?.find(s => s?.id === plan?.seed_id);
          if (seed && seed.id) {
            let newQuantity: number;
            if (seed.unit === 'kg') {
              newQuantity = (seed.quantity || 0) + (totalGrammage / 1000);
            } else {
              newQuantity = (seed.quantity || 0) + totalGrammage;
            }

            await updateSeed(seed.id, { quantity: newQuantity } as any);

            const cropName = getCropName(plan?.crop_id);
            toast({
              title: 'Semená vrátené',
              description: `Pripočítané ${totalGrammage.toFixed(0)}g semien ${cropName} späť na sklad.`,
            });
          }
        }
      }

      const { error } = await updatePlantingPlan(planId, { status: 'ready_to_sow' } as any);
      if (!error) {
        toast({
          title: 'Vrátené',
          description: 'Plán bol vrátený medzi aktívne úlohy.',
        });
      }
    } catch (error) {
      console.error('Error in undoSowing:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa vrátiť plán.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (plan: DbPlantingPlan) => {
    setEditingPlan(plan);
    setFormData({
      orderId: plan?.order_id || '',
      cropId: plan?.crop_id || '',
      seedId: plan?.seed_id || '',
      trays: plan?.tray_count || 1,
      traySize: (plan as any)?.tray_size || 'XL',
      isTestBatch: plan?.is_test_batch || false,
      countAsProduction: plan?.count_as_production || false,
      safetyBuffer: 5,
      sowDate: plan?.sow_date || format(new Date(), 'yyyy-MM-dd'),
      status: plan?.status || 'planned',
      notes: plan?.notes || '',
      isCombined: plan?.is_combined || false,
      soakingHoursBefore: (plan as any)?.soaking_hours_before_sowing || 12,
    });
    setIsDialogOpen(true);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const selectDate = (date: Date) => {
    setSelectedDate(date);
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Plán sadenia"
        description="Plánujte výsev a zber mikrozeleniny"
      />

      <div className="w-full px-4">
        <Card className="w-full p-3 mb-8 relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="sm" onClick={goToPreviousMonth} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-semibold flex-1 text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: sk })}
            </h3>
            <Button variant="ghost" size="sm" onClick={goToNextMonth} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="ml-auto gap-2 whitespace-nowrap text-sm">
                  <Plus className="h-4 w-4" />
                  Nový výsev
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <ErrorBoundary fallbackMessage="Chyba pri načítaní formulára">
                <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingPlan ? 'Upraviť plán' : 'Nový plán sadenia'}
                  </DialogTitle>
                  <DialogDescription>
                    Naplánujte výsev mikrozeleniny.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label>Kombinovaný výsev</Label>
                        <p className="text-xs text-muted-foreground">Viac plodín na jednom táci</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.isCombined}
                      onCheckedChange={(checked) => setFormData({ ...formData, isCombined: checked })}
                    />
                  </div>

                  {!formData.isCombined && (
                    <div className="grid gap-2">
                      <Label htmlFor="cropId">Plodina</Label>
                      <Select value={formData.cropId} onValueChange={(value) => setFormData({ ...formData, cropId: value })}>
                        <SelectTrigger id="cropId">
                          <SelectValue placeholder="Vyberte plodinu" />
                        </SelectTrigger>
                        <SelectContent>
                          {crops.map((crop) => (
                            <SelectItem key={crop?.id} value={crop?.id || ''}>
                              {crop?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.isCombined && (
                    <div className="space-y-3">
                      <Label>Plodiny v kombinácii</Label>
                      {cropComponents.map((component, index) => (
                        <div key={index} className="flex gap-2">
                          <Select
                            value={component.cropId}
                            onValueChange={(value) => {
                              const newComponents = [...cropComponents];
                              newComponents[index].cropId = value;
                              setCropComponents(newComponents);
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Plodina" />
                            </SelectTrigger>
                            <SelectContent>
                              {crops.map((crop) => (
                                <SelectItem key={crop?.id} value={crop?.id || ''}>
                                  {crop?.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={component.percentage}
                            onChange={(e) => {
                              const newComponents = [...cropComponents];
                              newComponents[index].percentage = parseInt(e.target.value) || 0;
                              setCropComponents(newComponents);
                            }}
                            className="w-20"
                            min="0"
                            max="100"
                          />
                          <span className="flex items-center">%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="trays">Počet tácok</Label>
                      <Input
                        id="trays"
                        type="number"
                        min="1"
                        value={formData.trays}
                        onChange={(e) => setFormData({ ...formData, trays: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="traySize">Veľkosť tácu</Label>
                      <Select value={formData.traySize} onValueChange={(value) => setFormData({ ...formData, traySize: value })}>
                        <SelectTrigger id="traySize">
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
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sowDate">Dátum výsevu</Label>
                    <Input
                      id="sowDate"
                      type="date"
                      value={formData.sowDate}
                      onChange={(e) => setFormData({ ...formData, sowDate: e.target.value })}
                    />
                  </div>

                  {formData.cropId && (
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">Predpokladaný zber:</span>
                      </div>
                      <p className="mt-1 text-lg font-semibold">
                        {format(calculateHarvestDate(formData.sowDate, formData.cropId) || new Date(), 'd. MMMM yyyy', { locale: sk })}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="notes">Poznámky</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Voliteľné poznámky"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Zrušiť
                  </Button>
                  <Button type="submit">
                    {editingPlan ? 'Uložiť zmeny' : 'Vytvoriť plán'}
                  </Button>
                </DialogFooter>
              </form>
              </ErrorBoundary>
            </DialogContent>
          </Dialog>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            {monthDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const hasSowing = datesWithSowings.some(d => isSameDay(d, day));
              return (
                <Button
                  key={day.toISOString()}
                  variant={isSelected ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-12 min-w-[50px] flex flex-col items-center justify-center relative text-xs ${
                    hasSowing && !isSelected ? 'border-2 border-primary' : ''
                  }`}
                  onClick={() => selectDate(day)}
                >
                  <span className="text-[10px] text-muted-foreground">
                    {format(day, 'EEE', { locale: sk })}
                  </span>
                  <span className="text-sm font-bold">
                    {format(day, 'd')}
                  </span>
                  {hasSowing && (
                    <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                  )}
                </Button>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8 mb-6">
          <div className="space-y-3 lg:col-span-7">
            <h2 className="text-base font-bold">Úlohy - {format(selectedDate, 'd. MMMM yyyy', { locale: sk })}</h2>

            {plansForSelectedDate.filter(p => p?.status !== 'sown').map((plan) => {
              if (!plan || !plan.id) return null;
              const traySize = (plan as any)?.tray_size || 'XL';
              const cropGrammage = getCropGrammagePerTray(plan?.crop_id, traySize);
              const totalGrammage = cropGrammage * (plan?.tray_count || 1);

              return (
                <Card key={plan.id} className="p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-0.5">{getCropName(plan?.crop_id) || 'Neznáma plodina'}</h3>
                      <p className="text-sm text-muted-foreground">
                        Počet tácok: <span className="font-semibold">{plan?.tray_count || 0} × {traySize}</span>
                      </p>
                      <Badge className={`mt-1.5 text-xs ${STATUS_COLORS[plan?.status || 'planned']}`}>
                        {STATUS_LABELS[plan?.status || 'planned']}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(plan)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteId(plan.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center mt-3">
                    <div className="flex-1">
                      <Label className="text-sm mb-1 block">Gramáž</Label>
                      <Input
                        type="number"
                        value={editableGrammages[plan.id] ?? totalGrammage}
                        onChange={(e) => setEditableGrammages({...editableGrammages, [plan.id]: e.target.valueAsNumber})}
                        placeholder="Gramáž"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {traySize}: {getCropGrammagePerTray(plan?.crop_id, traySize)}g/tácka
                      </p>
                    </div>
                    <div className="pt-5">
                      <Button onClick={() => markAsSown(plan.id)} variant="default">
                        HOTOVO
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {plansForSelectedDate.length === 0 && (
              <EmptyState
                icon={<Leaf className="h-8 w-8" />}
                title="Žiadne plány"
                description="Pre tento dátum nie sú žiadne plány sadenia."
                action={
                  <Button onClick={() => {
                    setFormData({ ...formData, sowDate: format(selectedDate, 'yyyy-MM-dd') });
                    setIsDialogOpen(true);
                  }} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Pridať plán
                  </Button>
                }
              />
            )}

            {(() => {
              const sownToday = plansForSelectedDate.filter(p => p?.status === 'sown');
              if (sownToday.length === 0) return null;

              return (
                <>
                  <h2 className="text-base font-bold mt-6">Dnes vysadené</h2>
                  {sownToday.map((plan) => {
                    if (!plan || !plan.id) return null;
                    const traySize = (plan as any)?.tray_size || 'XL';
                    const cropGrammage = getCropGrammagePerTray(plan?.crop_id, traySize);
                    const totalGrammage = cropGrammage * (plan?.tray_count || 1);

                    return (
                      <Card key={plan.id} className="p-4 shadow-sm bg-green-50 border-green-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-green-900">{getCropName(plan?.crop_id) || 'Neznáma plodina'}</h3>
                            <p className="text-sm text-green-700">
                              Počet tácok: <span className="font-semibold">{plan?.tray_count || 0}</span>
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              Použité semená: {totalGrammage}g
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => undoSowing(plan.id)}
                            className="bg-white hover:bg-red-50 border-red-300 text-red-700"
                          >
                            <Undo2 className="h-4 w-4 mr-1" />
                            UNDO
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </>
              );
            })()}
          </div>

          <div className="space-y-3 lg:col-span-5">
            <h2 className="text-base font-bold">Štatistiky</h2>

            <Card className="p-4 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Celkový počet tácok</p>
                  <p className="text-3xl font-bold text-blue-900">{statsForSelectedDate.totalTrays}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-blue-600" />
              </div>
            </Card>

            <Card className="p-4 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pripravené na siatie</p>
                  <p className="text-3xl font-bold text-amber-900">{statsForSelectedDate.readyTrays}</p>
                </div>
                <Leaf className="h-10 w-10 text-amber-600" />
              </div>
            </Card>

            <Card className="p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-2">Rozdelenie plodín</h3>
              <div className="space-y-1.5">
                {Object.entries(statsForSelectedDate.cropBreakdown).map(([cropName, count]) => (
                  <div key={cropName} className="flex items-center justify-between">
                    <span className="text-sm">{cropName}</span>
                    <Badge variant="outline" className="text-xs">{count} tácok</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {sownTodayPlans.length > 0 && (
          <div className="w-full px-4 mb-6">
            <h2 className="text-base font-bold mb-3">Dnes vysadené</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sownTodayPlans.map((plan) => {
                if (!plan || !plan.id) return null;
                return (
                  <Card key={plan.id} className="p-3 shadow-sm border-green-200 bg-green-50/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-bold mb-0.5 text-green-900">{getCropName(plan?.crop_id) || 'Neznáma plodina'}</h3>
                        <p className="text-sm text-muted-foreground">
                          Počet tácok: <span className="font-semibold">{plan?.tray_count || 0}</span>
                        </p>
                        <Badge className="mt-1.5 text-xs bg-green-600 text-white">Zasiate</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => undoSowing(plan.id)}
                        title="Vrátiť späť"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť plán?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia sa nedá vrátiť späť. Plán sadenia bude natrvalo odstránený.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Odstrániť</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default PlantingManagement;
