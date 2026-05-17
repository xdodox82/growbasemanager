import { useState, useCallback } from 'react';
type ViewMode = 'grid' | 'list';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCrops, DbCrop } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableHeader } from '@/components/ui/table';
import { MobileTableRow, MobileTableCell, MobileTableHead, ExpandedDetail } from '@/components/ui/mobile-table';
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
import { Leaf, Plus, Pencil, Trash2, Clock, Droplets, Loader as Loader2, Sun, Moon, Scissors, Sprout, Weight, Flower, ChevronDown, ChevronUp } from 'lucide-react';
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

  // Force grid view on mobile
  const effectiveViewMode = isMobile ? 'grid' : viewMode;
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCropDetail, setSelectedCropDetail] = useState<DbCrop | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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
    sku_prefix: '',
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
      sku_prefix: (crop as any).sku_prefix || '',
      days_to_harvest: crop.days_to_harvest,
      days_to_germination: crop.days_to_germination || 2,
      germination_type: crop.germination_type || 'warm',
      needs_weight: crop.needs_weight || false,
      days_in_darkness: crop.days_in_darkness || 2,
      days_on_light: crop.days_on_light || 5,
      stacking_height: (crop as any).stacking_height || 4,
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
      soaking_duration_hours: formData.soaking ? formData.soaking_duration_hours : 0,
      stacking_height: (formData as any).stacking_height || 4
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
      <MainLayout hideMobileHeader>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
            <Leaf className="h-5 w-5 text-[#16a34a]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0f172a]">Plodiny</h1>
            <p className="text-xs text-[#64748b]">Načítavam...</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-[#cbd5e1] p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-24 mt-3" />
              <Skeleton className="h-3 w-16 mt-2" />
            </div>
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout hideMobileHeader>
      {/* GrowBase Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
            <Leaf className="h-5 w-5 text-[#16a34a]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0f172a]">Plodiny</h1>
            <p className="text-xs text-[#64748b]">{filteredCrops.length} plodín</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="hidden md:flex gap-0.5">
            <button onClick={() => setViewMode('grid')}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc]'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="7" height="7" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" strokeWidth="2"/></svg>
            </button>
            <button onClick={() => setViewMode('list')}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc]'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><line x1="3" y1="6" x2="21" y2="6" strokeWidth="2"/><line x1="3" y1="12" x2="21" y2="12" strokeWidth="2"/><line x1="3" y1="18" x2="21" y2="18" strokeWidth="2"/></svg>
            </button>
          </div>
          <button onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors">
            <Plus className="h-4 w-4" /> Pridať plodinu
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'all', label: 'Všetky', icon: null },
          { value: 'microgreens', label: 'Mikrozelenina', icon: Leaf },
          { value: 'microherbs', label: 'Mikrobylinky', icon: Sprout },
          { value: 'edible_flowers', label: 'Jedlé kvety', icon: Flower },
        ].map(cat => {
          const Icon = cat.icon;
          return (
            <button key={cat.value} onClick={() => setCategoryFilter(cat.value)}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border text-xs font-semibold transition-colors ${
                categoryFilter === cat.value
                  ? 'bg-[#0f172a] border-[#0f172a] text-white'
                  : 'bg-white border-[#cbd5e1] text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a]'
              }`}>
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
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
                    <SelectContent position="popper" sideOffset={5} className="max-h-[300px]">
                      <SelectItem value="microgreens">
                        <Leaf className="h-4 w-4 text-green-600 mr-2 inline" />Mikrozelenina
                      </SelectItem>
                      <SelectItem value="microherbs">
                        <Sprout className="h-4 w-4 text-green-600 mr-2 inline" />Mikrobylinky
                      </SelectItem>
                      <SelectItem value="edible_flowers">
                        <Flower className="h-4 w-4 text-green-600 mr-2 inline" />Jedlé kvety
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sku_prefix">SKU prefix (katalógové číslo)</Label>
                  <Input
                    id="sku_prefix"
                    value={formData.sku_prefix || ''}
                    onChange={(e) => setFormData({ ...formData, sku_prefix: e.target.value.toUpperCase() })}
                    placeholder="napr. BRC, HAF, MIZC"
                    maxLength={10}
                    className="uppercase font-mono"
                  />
                  <p className="text-xs text-[#475569]">
                    3-4 znaky pre jednoznačnú identifikáciu. Použije sa v e-shope.
                  </p>
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
                  <div className="grid gap-2">
                    <Label>Stohovanie pri klíčení (tácky na seba)</Label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={(formData as any).stacking_height || 4}
                      onChange={e => setFormData({ ...formData, stacking_height: parseInt(e.target.value) || 4 } as any)}
                      className="h-9 rounded-lg border border-[#e2e8f0] px-3 text-sm text-[#0f172a] focus:outline-none focus:border-[#16a34a]"
                    />
                    <p className="text-xs text-[#475569]">Koľko tácok sa stohuje na seba počas klíčenia (default: 4)</p>
                  </div>
                </div>

                <div className="border border-[#cbd5e1] rounded-xl p-4 space-y-3 bg-[#f8fafc]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Konfigurácia veľkostí tácok</h4>
                  </div>
                  <div className="grid gap-3">
                    {(['XL', 'L', 'M', 'S'] as const).map((size) => (
                      <div key={size} className="grid grid-cols-[60px_1fr_1fr] gap-3 items-center">
                        <Label className="font-semibold">{size}</Label>
                        <div className="grid gap-1">
                          <Label className="text-xs text-[#475569]">Hustota (g)</Label>
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
                          <Label className="text-xs text-[#475569]">Výnos (g)</Label>
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
                <button type="button" onClick={() => setIsDialogOpen(false)}
                  className="h-9 px-4 rounded-xl border border-[#cbd5e1] bg-white text-sm font-medium text-[#475569] hover:bg-[#f8fafc]">
                  Zrušiť
                </button>
                <button type="submit" disabled={saving}
                  className="h-9 px-5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCrop ? 'Uložiť zmeny' : 'Pridať plodinu'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      {crops.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#cbd5e1] py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center mb-4">
            <Leaf className="h-7 w-7 text-[#16a34a]" />
          </div>
          <h3 className="text-base font-bold text-[#0f172a] mb-1">Žiadne plodiny</h3>
          <p className="text-sm text-[#475569] mb-4">Začnite pridaním vašej prvej plodiny.</p>
          <button onClick={() => setIsDialogOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors">
            <Plus className="h-4 w-4" /> Pridať plodinu
          </button>
        </div>
      ) : filteredCrops.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#cbd5e1] py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f1f5f9] border border-[#cbd5e1] flex items-center justify-center mb-4">
            <Leaf className="h-7 w-7 text-[#94a3b8]" />
          </div>
          <h3 className="text-base font-bold text-[#0f172a] mb-1">Žiadne výsledky</h3>
          <p className="text-sm text-[#475569]">Skúste zmeniť filter kategórie.</p>
        </div>
      ) : effectiveViewMode === 'grid' && !isMobile ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCrops.map((crop) => (
            <div
              key={crop.id}
              className="bg-white rounded-xl border border-[#cbd5e1] p-4 transition-all hover:border-[#16a34a] hover:shadow-md cursor-pointer"
              onClick={() => { setSelectedCropDetail(crop); setDetailModalOpen(true); }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${crop.color}20`, color: crop.color || '#22c55e' }}>
                    <Leaf className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0f172a]">{crop.name}</h3>
                    {crop.variety && <p className="text-xs text-[#475569]">{crop.variety}</p>}
                    {crop.category && (
                      <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md border border-[#cbd5e1] text-[#475569] text-[10px] font-semibold bg-[#f8fafc]">
                        {CROP_CATEGORIES[crop.category as keyof typeof CROP_CATEGORIES] || crop.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEditDialog(crop)}
                    className="w-7 h-7 rounded-lg border border-[#cbd5e1] bg-white flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {isAdmin && (
                    <button onClick={() => setDeleteId(crop.id)}
                      className="w-7 h-7 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-[#475569]">
                  <Clock className="h-4 w-4" />
                  <span>{crop.days_to_harvest} dní</span>
                </div>
                <div className="flex items-center gap-2 text-[#475569]">
                  <Droplets className="h-4 w-4" />
                  <span>{(crop as any).tray_configs?.XL?.seed_density || crop.seed_density} g/tác</span>
                </div>
                {((crop as any).tray_configs?.XL?.expected_yield || crop.expected_yield) && (
                  <div className="flex items-center gap-2 text-[#475569]">
                    <Scissors className="h-4 w-4" />
                    <span>{(crop as any).tray_configs?.XL?.expected_yield || crop.expected_yield} g výnos</span>
                  </div>
                )}
                {crop.germination_type && (
                  <div className="flex items-center gap-2 text-[#475569]">
                    {crop.germination_type === 'warm' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span>{GERMINATION_TYPES[crop.germination_type as keyof typeof GERMINATION_TYPES]}</span>
                  </div>
                )}
                {crop.needs_weight && (
                  <div className="flex items-center gap-2 text-[#475569]">
                    <Weight className="h-4 w-4" />
                    <span>Zaťaženie</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {crop.seed_soaking && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-[#cbd5e1] text-[#475569] text-[10px] font-semibold bg-[#f8fafc]">Namáčanie</span>
                )}
                {crop.can_be_cut && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-[#cbd5e1] text-[#475569] text-[10px] font-semibold bg-[#f8fafc]">Rezaná</span>
                )}
                {crop.can_be_live && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-[#cbd5e1] text-[#475569] text-[10px] font-semibold bg-[#f8fafc]">Živá</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : effectiveViewMode === 'grid' && isMobile ? (
        <div className="grid gap-4">
          {filteredCrops.map((crop) => {
            const isExpanded = expandedCards.has(crop.id);

            const toggleExpand = () => {
              const newExpanded = new Set(expandedCards);
              if (isExpanded) {
                newExpanded.delete(crop.id);
              } else {
                newExpanded.add(crop.id);
              }
              setExpandedCards(newExpanded);
            };

            return (
              <div
                key={crop.id}
                className="bg-white rounded-xl border border-[#cbd5e1] overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={toggleExpand}
              >
                {/* HEADER - ALWAYS VISIBLE */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${crop.color}20`, color: crop.color || '#22c55e' }}
                      >
                        <Leaf className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{crop.name}</h3>
                        {crop.variety && (
                          <p className="text-xs text-[#475569] truncate">{crop.variety}</p>
                        )}
                        <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md border border-[#cbd5e1] text-[#475569] text-[10px] font-semibold bg-[#f8fafc]">
                          {CROP_CATEGORIES[crop.category as keyof typeof CROP_CATEGORIES] || crop.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-[#475569]" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-[#475569]" />
                      )}
                    </div>
                  </div>

                  {/* QUICK INFO - ALWAYS VISIBLE */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-[#475569]">
                      <Clock className="h-4 w-4" />
                      <span>{crop.days_to_harvest} dní</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#475569]">
                      <Droplets className="h-4 w-4" />
                      <span>{(crop as any).tray_configs?.XL?.seed_density || crop.seed_density} g/tác</span>
                    </div>
                  </div>
                </div>

                {/* EXPANDED CONTENT - VŠETKY POLIA */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t bg-gray-50/50 space-y-3">
                    {/* ČASOVÉ ÚDAJE */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-[#475569] mb-1">Dni klíčenia</div>
                        <div className="text-sm font-medium flex items-center gap-1">
                          <Sprout className="h-3 w-3" />
                          {crop.days_to_germination} dní
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#475569] mb-1">Typ klíčenia</div>
                        <div className="text-sm font-medium flex items-center gap-1">
                          {crop.germination_type === 'warm' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                          {GERMINATION_TYPES[crop.germination_type as keyof typeof GERMINATION_TYPES] || crop.germination_type}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#475569] mb-1">Dni v tme</div>
                        <div className="text-sm font-medium">{crop.days_in_darkness} dní</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#475569] mb-1">Dni na svetle</div>
                        <div className="text-sm font-medium">{crop.days_on_light} dní</div>
                      </div>
                    </div>

                    {/* PRODUKČNÉ ÚDAJE */}
                    <div className="pt-2 border-t">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-[#475569] mb-1">Výnos</div>
                          <div className="text-sm font-medium flex items-center gap-1">
                            <Scissors className="h-3 w-3" />
                            {(crop as any).tray_configs?.XL?.expected_yield || crop.expected_yield || '-'} g
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#475569] mb-1">Zaťaženie</div>
                          <div className="text-sm font-medium flex items-center gap-1">
                            <Weight className="h-3 w-3" />
                            {crop.needs_weight ? 'Áno' : 'Nie'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* VLASTNOSTI */}
                    <div className="pt-2 border-t">
                      <div className="text-xs text-[#475569] mb-2">Vlastnosti</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Namáčanie osiva</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#0f172a]">
                              {((crop as any).soaking || crop.seed_soaking) ? 'Áno' : 'Nie'}
                            </span>
                            {(crop as any).soaking_duration_hours > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-[#cbd5e1] text-[#475569] text-[10px] font-semibold bg-[#f8fafc]">
                                {(crop as any).soaking_duration_hours}h
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Rezaná forma</span>
                          <span className="font-bold text-[#0f172a]">{crop.can_be_cut ? 'Áno' : 'Nie'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Živá forma</span>
                          <span className="font-bold text-[#0f172a]">{crop.can_be_live ? 'Áno' : 'Nie'}</span>
                        </div>
                      </div>
                    </div>

                    {/* POZNÁMKY */}
                    {crop.notes && (
                      <div className="pt-2 border-t">
                        <div className="text-xs text-[#475569] mb-1">Poznámky</div>
                        <div className="text-sm whitespace-pre-wrap">{crop.notes}</div>
                      </div>
                    )}

                    {/* AKCIE */}
                    <div className="pt-3 border-t flex gap-2">
                      <button type="button"
                        className="flex-1 h-8 rounded-lg border border-[#cbd5e1] bg-white text-xs font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
                        onClick={(e) => { e.stopPropagation(); setSelectedCropDetail(crop); setDetailModalOpen(true); }}>
                        Detail
                      </button>
                      <button type="button"
                        className="flex-1 h-8 rounded-lg border border-[#cbd5e1] bg-white text-xs font-medium text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] flex items-center justify-center gap-1 transition-colors"
                        onClick={(e) => { e.stopPropagation(); openEditDialog(crop); }}>
                        <Pencil className="h-3 w-3" />Upraviť
                      </button>
                      {isAdmin && (
                        <button type="button"
                          className="h-8 px-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] text-xs font-medium text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(crop.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="hidden md:block bg-white rounded-xl border border-[#cbd5e1] overflow-hidden">
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
                            <p className="font-bold text-[#0f172a]">{crop.name}</p>
                            {crop.variety && <p className="text-xs text-[#475569]">{crop.variety}</p>}
                          </div>
                        </div>
                      </MobileTableCell>
                      <MobileTableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-[#cbd5e1] text-[#475569] text-[10px] font-semibold bg-[#f8fafc]">
                          {CROP_CATEGORIES[crop.category as keyof typeof CROP_CATEGORIES] || crop.category}
                        </span>
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
                          <span className="text-[#475569]">Nie</span>
                        )}
                      </MobileTableCell>
                      <MobileTableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => openEditDialog(crop)} className="w-7 h-7 rounded-lg border border-[#cbd5e1] bg-white flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          {isAdmin && (
                            <button onClick={() => setDeleteId(crop.id)} className="w-7 h-7 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition-colors">
                              <Trash2 className="h-4 w-4 text-[#dc2626]" />
                            </button>
                          )}
                        </div>
                      </MobileTableCell>
                    </MobileTableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-[#dc2626]-foreground hover:bg-destructive/90">
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
                    <p className="text-sm text-[#475569]">{selectedCropDetail.variety}</p>
                  )}
                  {selectedCropDetail.category && (
                    <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md border border-[#cbd5e1] text-[#475569] text-[10px] font-semibold bg-[#f8fafc]">
                      {CROP_CATEGORIES[selectedCropDetail.category as keyof typeof CROP_CATEGORIES] || selectedCropDetail.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Dni do zberu</div>
                  <div className="font-bold text-[#0f172a]">{selectedCropDetail.days_to_harvest} dní</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Dni klíčenia</div>
                  <div className="font-bold text-[#0f172a]">{selectedCropDetail.days_to_germination} dní</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Typ klíčenia</div>
                  <div className="font-bold text-[#0f172a]">
                    {GERMINATION_TYPES[selectedCropDetail.germination_type as keyof typeof GERMINATION_TYPES] || selectedCropDetail.germination_type}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Hustota osiva</div>
                  <div className="font-bold text-[#0f172a]">{(selectedCropDetail as any).tray_configs?.XL?.seed_density || selectedCropDetail.seed_density} g/tácku</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Očakávaný výnos</div>
                  <div className="font-bold text-[#0f172a]">{(selectedCropDetail as any).tray_configs?.XL?.expected_yield || selectedCropDetail.expected_yield || '-'} g</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Dni v tme</div>
                  <div className="font-bold text-[#0f172a]">{selectedCropDetail.days_in_darkness} dní</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Dni na svetle</div>
                  <div className="font-bold text-[#0f172a]">{selectedCropDetail.days_on_light} dní</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Namáčanie osiva</div>
                  <div className="font-bold text-[#0f172a]">
                    {((selectedCropDetail as any).soaking || selectedCropDetail.seed_soaking) ? (
                      <div className="flex items-center gap-2">
                        <span>Áno</span>
                        {(selectedCropDetail as any).soaking_duration_hours > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-[#cbd5e1] text-[#475569] text-[10px] font-semibold bg-[#f8fafc]">
                            {(selectedCropDetail as any).soaking_duration_hours}h
                          </span>
                        )}
                      </div>
                    ) : (
                      'Nie'
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Zaťaženie</div>
                  <div className="font-bold text-[#0f172a]">{selectedCropDetail.needs_weight ? 'Áno' : 'Nie'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Stohovanie pri klíčení</div>
                  <div className="font-bold text-[#0f172a]">
                    {(() => {
                      const n = (selectedCropDetail as any).stacking_height || 4;
                      return `${n} ${n === 1 ? 'tácka' : n < 5 ? 'tácky' : 'tácok'} na seba`;
                    })()}
                  </div>
                </div>
                {(selectedCropDetail as any).blackout_days > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm text-[#475569]">Blackout</div>
                    <div className="font-bold text-[#0f172a]">
                      {(() => {
                        const n = (selectedCropDetail as any).blackout_days;
                        return `${n} ${n === 1 ? 'deň' : n < 5 ? 'dni' : 'dní'}`;
                      })()}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Rezaná forma</div>
                  <div className="font-bold text-[#0f172a]">{selectedCropDetail.can_be_cut ? 'Áno' : 'Nie'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Živá forma</div>
                  <div className="font-bold text-[#0f172a]">{selectedCropDetail.can_be_live ? 'Áno' : 'Nie'}</div>
                </div>
                {(selectedCropDetail as any).sku_prefix && (
                  <div className="space-y-1">
                    <div className="text-sm text-[#475569]">SKU prefix</div>
                    <div className="font-bold text-[#0f172a]">{(selectedCropDetail as any).sku_prefix}</div>
                  </div>
                )}
                {(selectedCropDetail as any).default_substrate && (
                  <div className="space-y-1">
                    <div className="text-sm text-[#475569]">Predvolený substrát</div>
                    <div className="font-bold text-[#0f172a]">{(selectedCropDetail as any).default_substrate}</div>
                  </div>
                )}
              </div>

              {/* Konfigurácia tácok */}
              {(selectedCropDetail as any).tray_configs && Object.keys((selectedCropDetail as any).tray_configs).length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-[#475569] uppercase tracking-wide">Konfigurácia tácok</div>
                  <div className="bg-[#f8fafc] rounded-xl border border-[#cbd5e1] overflow-hidden">
                    <div className="grid grid-cols-3 bg-[#f1f5f9] border-b border-[#e2e8f0] px-4 py-2">
                      <div className="text-[11px] font-bold text-[#475569] uppercase">Veľkosť</div>
                      <div className="text-[11px] font-bold text-[#475569] uppercase">Hustota (g)</div>
                      <div className="text-[11px] font-bold text-[#475569] uppercase">Výnos (g)</div>
                    </div>
                    {(['XL', 'L', 'M', 'S'] as const).map(size => {
                      const config = (selectedCropDetail as any).tray_configs?.[size];
                      if (!config) return null;
                      return (
                        <div key={size} className="grid grid-cols-3 px-4 py-2 border-b border-[#f1f5f9] last:border-0">
                          <div className="text-sm font-bold text-[#0f172a]">{size}</div>
                          <div className="text-sm text-[#475569]">{config.seed_density || config.seed_density_grams || '-'} g</div>
                          <div className="text-sm text-[#475569]">{config.expected_yield || config.yield_grams || '-'} g</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedCropDetail.notes && (
                <div className="space-y-1">
                  <div className="text-sm text-[#475569]">Poznámky</div>
                  <div className="text-sm whitespace-pre-wrap">{selectedCropDetail.notes}</div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <button onClick={() => setDetailModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-[#cbd5e1] bg-white text-sm font-medium text-[#475569] hover:bg-[#f8fafc]">
                  Zavrieť
                </button>
                <button onClick={() => { setDetailModalOpen(false); openEditDialog(selectedCropDetail); }}
                  className="h-9 px-5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] flex items-center gap-2">
                  <Pencil className="h-4 w-4" />Upraviť
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default CropsPage;
