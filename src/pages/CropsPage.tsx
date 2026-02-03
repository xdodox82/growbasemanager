import { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { useCrops, DbCrop } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableHeader } from '@/components/ui/table';
import { MobileTableRow, MobileTableCell, MobileTableHead, ExpandedDetail } from '@/components/ui/mobile-table';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
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
import { Leaf, Plus, Pencil, Trash2, Clock, Droplets, Loader2, Sun, Moon, Scissors, Sprout, Weight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CROP_COLORS = [
  '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', 
  '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4'
];

const CROP_CATEGORIES = {
  microgreens: 'Mikrozelenina',
  microherbs: 'Mikrobylinky',
  edible_flowers: 'Jedlé kvety',
} as const;

const GERMINATION_TYPES = {
  warm: 'V teple',
  cold: 'V chlade',
} as const;

const CropsPage = () => {
  const { data: crops, loading, add, update, remove, refetch } = useCrops();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<DbCrop | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCropDetail, setSelectedCropDetail] = useState<DbCrop | null>(null);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filteredCrops = crops.filter(crop => {
    if (categoryFilter === 'all') return true;
    return crop.category === categoryFilter;
  });
  
  const [formData, setFormData] = useState({
    name: '',
    variety: '',
    category: 'microgreens' as string,
    days_to_harvest: 8,
    days_to_germination: 3,
    germination_type: 'warm' as string,
    needs_weight: true,
    days_in_darkness: 2,
    days_on_light: 5,
    seed_density: 30,
    seed_soaking: false,
    soaking: false,
    soaking_duration_hours: 0,
    expected_yield: 200,
    can_be_cut: true,
    can_be_live: false,
    color: CROP_COLORS[0],
    notes: '',
    safety_buffer_percent: 5,
    default_substrate_type: 'mixed' as string,
    default_substrate_note: '',
    tray_configs: {
      XL: { seed_density: 100, expected_yield: 80 },
      L: { seed_density: 80, expected_yield: 65 },
      M: { seed_density: 60, expected_yield: 48 },
      S: { seed_density: 40, expected_yield: 32 }
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      variety: '',
      category: 'microgreens',
      days_to_harvest: 8,
      days_to_germination: 3,
      germination_type: 'warm',
      needs_weight: true,
      days_in_darkness: 2,
      days_on_light: 5,
      seed_density: 30,
      seed_soaking: false,
      soaking: false,
      soaking_duration_hours: 0,
      expected_yield: 200,
      can_be_cut: true,
      can_be_live: false,
      color: CROP_COLORS[0],
      notes: '',
      safety_buffer_percent: 5,
      default_substrate_type: 'mixed',
      default_substrate_note: '',
      tray_configs: {
        XL: { seed_density: 100, expected_yield: 80 },
        L: { seed_density: 80, expected_yield: 65 },
        M: { seed_density: 60, expected_yield: 48 },
        S: { seed_density: 40, expected_yield: 32 }
      }
    });
    setEditingCrop(null);
  };

  const openEditDialog = (crop: DbCrop) => {
    setEditingCrop(crop);
    const trayConfigs = (crop as any).tray_configs || {
      XL: { seed_density: crop.seed_density || 100, expected_yield: crop.expected_yield || 80 },
      L: { seed_density: (crop.seed_density || 100) * 0.8, expected_yield: (crop.expected_yield || 80) * 0.8 },
      M: { seed_density: (crop.seed_density || 100) * 0.6, expected_yield: (crop.expected_yield || 80) * 0.6 },
      S: { seed_density: (crop.seed_density || 100) * 0.4, expected_yield: (crop.expected_yield || 80) * 0.4 }
    };
    const soaking = (crop as any).soaking || crop.seed_soaking || false;
    setFormData({
      name: crop.name,
      variety: crop.variety || '',
      category: crop.category || 'microgreens',
      days_to_harvest: crop.days_to_harvest,
      days_to_germination: crop.days_to_germination || 2,
      germination_type: crop.germination_type || 'warm',
      needs_weight: crop.needs_weight || false,
      days_in_darkness: crop.days_in_darkness || 2,
      days_on_light: crop.days_on_light || 5,
      seed_density: crop.seed_density || 30,
      seed_soaking: crop.seed_soaking || false,
      soaking: soaking,
      soaking_duration_hours: (crop as any).soaking_duration_hours || '',
      expected_yield: crop.expected_yield || 200,
      can_be_cut: crop.can_be_cut !== false,
      can_be_live: crop.can_be_live || false,
      color: crop.color || CROP_COLORS[0],
      notes: crop.notes || '',
      safety_buffer_percent: (crop as any).safety_buffer_percent || 5,
      default_substrate_type: (crop as any).default_substrate_type || 'mixed',
      default_substrate_note: (crop as any).default_substrate_note || '',
      tray_configs: trayConfigs
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Chyba',
        description: 'Zadajte názov plodiny',
        variant: 'destructive',
      });
      return;
    }

    if (formData.soaking && (!formData.soaking_duration_hours || formData.soaking_duration_hours <= 0)) {
      toast({
        title: 'Chyba',
        description: 'Ak vyžaduje namáčanie, zadajte dobu namáčania (hodiny)',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const dataToSave = {
      ...formData,
      seed_soaking: formData.soaking,
      soaking_duration_hours: formData.soaking ? formData.soaking_duration_hours : 0
    };

    if (editingCrop) {
      const { error } = await update(editingCrop.id, dataToSave);
      if (!error) {
        toast({
          title: 'Plodina aktualizovaná',
          description: `${formData.name} bola úspešne upravená.`,
        });
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await add(dataToSave);
      if (!error) {
        toast({
          title: 'Plodina pridaná',
          description: `${formData.name} bola pridaná do katalógu.`,
        });
        setIsDialogOpen(false);
        resetForm();
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      const crop = crops.find(c => c.id === deleteId);
      const { error } = await remove(deleteId);
      if (!error) {
        toast({
          title: 'Plodina odstránená',
          description: `${crop?.name} bola odstránená z katalógu.`,
        });
      }
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <PageHeader title="Plodiny" description="Spravujte katalóg plodín" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-24 mt-3" />
              <Skeleton className="h-3 w-16 mt-2" />
            </Card>
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader 
        title="Plodiny" 
        description="Spravujte katalóg vašich mikrozelenín"
      >
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať plodinu
            </Button>
          </DialogTrigger>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Všetky kategórie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky kategórie</SelectItem>
            <SelectItem value="microgreens">🌱 Mikrozelenina</SelectItem>
            <SelectItem value="microherbs">🌿 Mikrobylinky</SelectItem>
            <SelectItem value="edible_flowers">🌸 Jedlé kvety</SelectItem>
          </SelectContent>
        </Select>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingCrop ? 'Upraviť plodinu' : 'Nová plodina'}
                </DialogTitle>
                <DialogDescription>
                  Zadajte parametre pestovania pre túto plodinu.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Názov *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="napr. Brokolica"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="variety">Odroda</Label>
                    <Input
                      id="variety"
                      value={formData.variety}
                      onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                      placeholder="napr. Calabrese"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Kategória</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="microgreens">🌱 Mikrozelenina</SelectItem>
                      <SelectItem value="microherbs">🌿 Mikrobylinky</SelectItem>
                      <SelectItem value="edible_flowers">🌸 Jedlé kvety</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="germination">Dni klíčenia</Label>
                    <Input
                      id="germination"
                      type="number"
                      min="0"
                      value={formData.days_to_germination || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setFormData(prev => ({ 
                          ...prev, 
                          days_to_germination: value,
                          days_to_harvest: value + prev.days_in_darkness + prev.days_on_light
                        }));
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="darkness">Dni v tme</Label>
                    <Input
                      id="darkness"
                      type="number"
                      min="0"
                      value={formData.days_in_darkness || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setFormData(prev => ({ 
                          ...prev, 
                          days_in_darkness: value,
                          days_to_harvest: prev.days_to_germination + value + prev.days_on_light
                        }));
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="light">Dni na svetle</Label>
                    <Input
                      id="light"
                      type="number"
                      min="0"
                      value={formData.days_on_light || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setFormData(prev => ({ 
                          ...prev, 
                          days_on_light: value,
                          days_to_harvest: prev.days_to_germination + prev.days_in_darkness + value
                        }));
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="harvest">Celkom do zberu</Label>
                    <Input
                      id="harvest"
                      type="number"
                      min="0"
                      value={formData.days_to_harvest || ''}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Typ klíčenia</Label>
                    <Select 
                      value={formData.germination_type} 
                      onValueChange={(value) => setFormData({ ...formData, germination_type: value })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warm">V teple</SelectItem>
                        <SelectItem value="cold">V chlade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Zaťaženie</Label>
                    <Select 
                      value={formData.needs_weight ? 'yes' : 'no'} 
                      onValueChange={(value) => setFormData({ ...formData, needs_weight: value === 'yes' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Áno</SelectItem>
                        <SelectItem value="no">Nie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Konfigurácia veľkostí tácok</h4>
                  </div>
                  <div className="grid gap-3">
                    {(['XL', 'L', 'M', 'S'] as const).map((size) => (
                      <div key={size} className="grid grid-cols-[60px_1fr_1fr] gap-3 items-center">
                        <Label className="font-semibold">{size}</Label>
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">Hustota (g)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={formData.tray_configs[size].seed_density || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              tray_configs: {
                                ...formData.tray_configs,
                                [size]: {
                                  ...formData.tray_configs[size],
                                  seed_density: e.target.value === '' ? 0 : parseFloat(e.target.value)
                                }
                              }
                            })}
                            className="h-8"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">Výnos (g)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={formData.tray_configs[size].expected_yield || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              tray_configs: {
                                ...formData.tray_configs,
                                [size]: {
                                  ...formData.tray_configs[size],
                                  expected_yield: e.target.value === '' ? 0 : parseFloat(e.target.value)
                                }
                              }
                            })}
                            className="h-8"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t">
                    <div className="grid gap-2">
                      <Label htmlFor="safetyBuffer">Predvolená rezerva (%)</Label>
                      <Input
                        id="safetyBuffer"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.safety_buffer_percent || ''}
                        onChange={(e) => setFormData({ ...formData, safety_buffer_percent: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Namáčanie</Label>
                      <Select
                        value={formData.soaking ? 'yes' : 'no'}
                        onValueChange={(value) => {
                          const soakingValue = value === 'yes';
                          setFormData({
                            ...formData,
                            soaking: soakingValue,
                            seed_soaking: soakingValue,
                            soaking_duration_hours: soakingValue ? (formData.soaking_duration_hours || '') : 0
                          });
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">Nie</SelectItem>
                          <SelectItem value="yes">Áno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Rezaná forma</Label>
                      <Select
                        value={formData.can_be_cut ? 'yes' : 'no'}
                        onValueChange={(value) => setFormData({ ...formData, can_be_cut: value === 'yes' })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Áno</SelectItem>
                          <SelectItem value="no">Nie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Živá forma</Label>
                      <Select
                        value={formData.can_be_live ? 'yes' : 'no'}
                        onValueChange={(value) => setFormData({ ...formData, can_be_live: value === 'yes' })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Áno</SelectItem>
                          <SelectItem value="no">Nie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.soaking && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="soaking-duration">Doba namáčania (hodiny) *</Label>
                        <Input
                          id="soaking-duration"
                          type="text"
                          inputMode="decimal"
                          value={formData.soaking_duration_hours?.toString().replace('.', ',') || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(',', '.');
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setFormData({
                                ...formData,
                                soaking_duration_hours: value === '' ? '' : value
                              });
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.replace(',', '.');
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue)) {
                              setFormData({
                                ...formData,
                                soaking_duration_hours: numValue
                              });
                            }
                          }}
                          placeholder="napr. 12 alebo 0,5"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Farba</Label>
                  <div className="flex gap-2 flex-wrap">
                    {CROP_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-8 w-8 rounded-full transition-all ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="substrate-type">Predvolený substrát</Label>
                    <Select
                      value={formData.default_substrate_type}
                      onValueChange={(value) => setFormData({ ...formData, default_substrate_type: value })}
                    >
                      <SelectTrigger id="substrate-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="peat">Rašelina</SelectItem>
                        <SelectItem value="coco">Kokos</SelectItem>
                        <SelectItem value="mixed">Miešaný (Rašelina/Kokos)</SelectItem>
                        <SelectItem value="other">Iný</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.default_substrate_type === 'other' && (
                    <div className="grid gap-2">
                      <Label htmlFor="substrate-note">Poznámka k substrátu</Label>
                      <Input
                        id="substrate-note"
                        value={formData.default_substrate_note}
                        onChange={(e) => setFormData({ ...formData, default_substrate_note: e.target.value })}
                        placeholder="Napríklad: 70% rašelina, 30% perlít"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Poznámky</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ďalšie informácie o plodine..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Zrušiť
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCrop ? 'Uložiť zmeny' : 'Pridať plodinu'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {crops.length === 0 ? (
        <EmptyState
          icon={<Leaf className="h-8 w-8" />}
          title="Žiadne plodiny"
          description="Začnite pridaním vašej prvej plodiny."
          action={
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať plodinu
            </Button>
          }
        />
      ) : filteredCrops.length === 0 ? (
        <EmptyState
          icon={<Leaf className="h-8 w-8" />}
          title="Žiadne výsledky"
          description="Skúste zmeniť filter kategórie."
        />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCrops.map((crop) => (
            <Card
              key={crop.id}
              className="p-4 transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer"
              onClick={() => {
                setSelectedCropDetail(crop);
                setDetailModalOpen(true);
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${crop.color}20`, color: crop.color || '#22c55e' }}
                  >
                    <Leaf className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{crop.name}</h3>
                    {crop.variety && (
                      <p className="text-xs text-muted-foreground">{crop.variety}</p>
                    )}
                    {crop.category && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {CROP_CATEGORIES[crop.category as keyof typeof CROP_CATEGORIES] || crop.category}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(crop)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteId(crop.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{crop.days_to_harvest} dní</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Droplets className="h-4 w-4" />
                  <span>{(crop as any).tray_configs?.XL?.seed_density || crop.seed_density} g/tác</span>
                </div>
                {((crop as any).tray_configs?.XL?.expected_yield || crop.expected_yield) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Scissors className="h-4 w-4" />
                    <span>{(crop as any).tray_configs?.XL?.expected_yield || crop.expected_yield} g výnos</span>
                  </div>
                )}
                {crop.germination_type && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {crop.germination_type === 'warm' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span>{GERMINATION_TYPES[crop.germination_type as keyof typeof GERMINATION_TYPES]}</span>
                  </div>
                )}
                {crop.needs_weight && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Weight className="h-4 w-4" />
                    <span>Zaťaženie</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {crop.seed_soaking && (
                  <Badge variant="outline" className="text-xs">Namáčanie</Badge>
                )}
                {crop.can_be_cut && (
                  <Badge variant="outline" className="text-xs">Rezaná</Badge>
                )}
                {crop.can_be_live && (
                  <Badge variant="outline" className="text-xs">Živá</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <MobileTableRow>
                    <MobileTableHead>Názov</MobileTableHead>
                    <MobileTableHead>Kategória</MobileTableHead>
                    <MobileTableHead hideOnMobile>Dni do zberu</MobileTableHead>
                    <MobileTableHead hideOnMobile>Hustota</MobileTableHead>
                    <MobileTableHead hideOnMobile>Výnos</MobileTableHead>
                    <MobileTableHead hideOnMobile>Zaťaženie</MobileTableHead>
                    <MobileTableHead className="w-24">Akcie</MobileTableHead>
                    {isMobile && <MobileTableHead className="w-10"></MobileTableHead>}
                  </MobileTableRow>
                </TableHeader>
                <TableBody>
                  {filteredCrops.map((crop) => (
                    <MobileTableRow
                      key={crop.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openEditDialog(crop)}
                      expandedContent={
                        <>
                          <ExpandedDetail label="Dni do zberu" value={`${crop.days_to_harvest} dní`} />
                          <ExpandedDetail label="Hustota" value={`${(crop as any).tray_configs?.XL?.seed_density || crop.seed_density} g/tác`} />
                          <ExpandedDetail label="Výnos" value={(crop as any).tray_configs?.XL?.expected_yield || crop.expected_yield ? `${(crop as any).tray_configs?.XL?.expected_yield || crop.expected_yield} g` : '-'} />
                          <ExpandedDetail label="Zaťaženie" value={crop.needs_weight ? 'Áno' : 'Nie'} />
                          <ExpandedDetail label="Namáčanie" value={crop.seed_soaking ? 'Áno' : 'Nie'} />
                          <ExpandedDetail label="Rezaná forma" value={crop.can_be_cut ? 'Áno' : 'Nie'} />
                          <ExpandedDetail label="Živá forma" value={crop.can_be_live ? 'Áno' : 'Nie'} />
                        </>
                      }
                    >
                      <MobileTableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-6 w-6 rounded flex items-center justify-center"
                            style={{ backgroundColor: `${crop.color}20`, color: crop.color || '#22c55e' }}
                          >
                            <Leaf className="h-3 w-3" />
                          </div>
                          <div>
                            <p className="font-medium">{crop.name}</p>
                            {crop.variety && <p className="text-xs text-muted-foreground">{crop.variety}</p>}
                          </div>
                        </div>
                      </MobileTableCell>
                      <MobileTableCell>
                        <Badge variant="secondary" className="text-xs">
                          {CROP_CATEGORIES[crop.category as keyof typeof CROP_CATEGORIES] || crop.category}
                        </Badge>
                      </MobileTableCell>
                      <MobileTableCell hideOnMobile>{crop.days_to_harvest} dní</MobileTableCell>
                      <MobileTableCell hideOnMobile>{(crop as any).tray_configs?.XL?.seed_density || crop.seed_density} g/tác</MobileTableCell>
                      <MobileTableCell hideOnMobile>{(crop as any).tray_configs?.XL?.expected_yield || crop.expected_yield || '-'} g</MobileTableCell>
                      <MobileTableCell hideOnMobile>
                        {crop.needs_weight ? (
                          <div className="flex items-center gap-1 text-primary">
                            <Weight className="h-4 w-4" />
                            <span>Áno</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Nie</span>
                        )}
                      </MobileTableCell>
                      <MobileTableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(crop)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(crop.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </MobileTableCell>
                    </MobileTableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </PullToRefresh>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť plodinu?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Plodina bude permanentne odstránená z katalógu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Odstrániť
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Detail plodiny</DialogTitle>
          </DialogHeader>
          {selectedCropDetail && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div
                  className="h-16 w-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${selectedCropDetail.color}20`, color: selectedCropDetail.color || '#22c55e' }}
                >
                  <Leaf className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{selectedCropDetail.name}</h3>
                  {selectedCropDetail.variety && (
                    <p className="text-sm text-muted-foreground">{selectedCropDetail.variety}</p>
                  )}
                  {selectedCropDetail.category && (
                    <Badge variant="secondary" className="mt-1">
                      {CROP_CATEGORIES[selectedCropDetail.category as keyof typeof CROP_CATEGORIES] || selectedCropDetail.category}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Dni do zberu</div>
                  <div className="font-medium">{selectedCropDetail.days_to_harvest} dní</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Dni klíčenia</div>
                  <div className="font-medium">{selectedCropDetail.days_to_germination} dní</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Typ klíčenia</div>
                  <div className="font-medium">
                    {GERMINATION_TYPES[selectedCropDetail.germination_type as keyof typeof GERMINATION_TYPES] || selectedCropDetail.germination_type}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Hustota osiva</div>
                  <div className="font-medium">{(selectedCropDetail as any).tray_configs?.XL?.seed_density || selectedCropDetail.seed_density} g/tác</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Očakávaný výnos</div>
                  <div className="font-medium">{(selectedCropDetail as any).tray_configs?.XL?.expected_yield || selectedCropDetail.expected_yield || '-'} g</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Dni v tme</div>
                  <div className="font-medium">{selectedCropDetail.days_in_darkness} dní</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Dni na svetle</div>
                  <div className="font-medium">{selectedCropDetail.days_on_light} dní</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Namáčanie osiva</div>
                  <div className="font-medium">
                    {((selectedCropDetail as any).soaking || selectedCropDetail.seed_soaking) ? (
                      <div className="flex items-center gap-2">
                        <span>Áno</span>
                        {(selectedCropDetail as any).soaking_duration_hours > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {(selectedCropDetail as any).soaking_duration_hours}h
                          </Badge>
                        )}
                      </div>
                    ) : (
                      'Nie'
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Zaťaženie</div>
                  <div className="font-medium">{selectedCropDetail.needs_weight ? 'Áno' : 'Nie'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Rezaná forma</div>
                  <div className="font-medium">{selectedCropDetail.can_be_cut ? 'Áno' : 'Nie'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Živá forma</div>
                  <div className="font-medium">{selectedCropDetail.can_be_live ? 'Áno' : 'Nie'}</div>
                </div>
              </div>

              {selectedCropDetail.notes && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Poznámky</div>
                  <div className="text-sm whitespace-pre-wrap">{selectedCropDetail.notes}</div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDetailModalOpen(false)}
                >
                  Zavrieť
                </Button>
                <Button
                  onClick={() => {
                    setDetailModalOpen(false);
                    openEditDialog(selectedCropDetail);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Upraviť
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default CropsPage;
