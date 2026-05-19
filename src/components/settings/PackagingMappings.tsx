import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePackagingMappings } from '@/hooks/usePackagingMappings';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Link2,
  Pencil,
  Loader2,
  CheckCircle2,
  Circle,
  Sprout,
  Layers,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===================== TYPES =====================

type ItemType = 'crop' | 'blend';

interface MappingDetail {
  weight_g: number;
  volume: string;
  sku?: string;
}

interface CropOrBlendItem {
  id: string;
  name: string;
  type: ItemType;
  mappings?: MappingDetail[];
}

interface Packaging {
  id: string;
  name: string;
  type: string;
  size: string;
}

type TypeFilter = 'all' | 'crop' | 'blend' | 'configured' | 'unconfigured';

const STANDARD_WEIGHTS = [25, 50, 60, 70, 100, 120, 150];

// ===================== SKU GENERATION (zachované z pôvodnej verzie) =====================

const generatePackagingSKU = async (
  cropId: string | null,
  blendId: string | null,
  weightG: number
): Promise<string | null> => {
  try {
    let skuPrefix: string | null = null;
    let categoryCode: string | null = null;

    if (cropId) {
      const { data: product } = await supabase
        .from('products')
        .select('sku_prefix, category')
        .eq('id', cropId)
        .single();

      if (!product?.sku_prefix) return null;

      skuPrefix = product.sku_prefix;
      categoryCode =
        product.category === 'microgreens' ? 'MZ'
        : product.category === 'microherbs' ? 'MB'
        : product.category === 'edible_flowers' ? 'JK'
        : 'XX';
    } else if (blendId) {
      const { data: blend } = await supabase
        .from('blends')
        .select('sku_prefix')
        .eq('id', blendId)
        .single();

      if (!blend?.sku_prefix) return null;

      skuPrefix = blend.sku_prefix;
      categoryCode = 'MX';
    }

    if (!skuPrefix || !categoryCode) return null;
    return `${categoryCode}-${skuPrefix}-${weightG}`;
  } catch (error) {
    console.error('Error generating SKU:', error);
    return null;
  }
};

// ===================== MAIN COMPONENT =====================

export const PackagingMappings = () => {
  const { toast } = useToast();
  // Ponechávame hook import — zatiaľ nepoužívame jeho metódy
  // (komponent rieši DB priamo aby zachoval crop/blend rozdelenie),
  // ale ostáva ako budúci abstrakcia pre prípadný refactor.
  usePackagingMappings();

  const [items, setItems] = useState<CropOrBlendItem[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CropOrBlendItem | null>(null);
  const [packagingIdMappings, setPackagingIdMappings] = useState<Record<number, string>>({});
  const [enabledWeights, setEnabledWeights] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  // ===================== FETCH =====================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [cropsRes, blendsRes, packagingsRes] = await Promise.all([
        supabase.from('products').select('id, name').order('name'),
        supabase.from('blends').select('id, name').order('name'),
        supabase.from('packagings').select('id, name, type, size').order('name'),
      ]);

      const allItems: CropOrBlendItem[] = [];

      // Crops with mappings
      if (cropsRes.data) {
        const cropsWithMappings = await Promise.all(
          cropsRes.data.map(async (crop) => {
            const { data: mappings } = await supabase
              .from('packaging_mappings')
              .select('weight_g, packaging_id, sku, packagings(id, name, size)')
              .eq('crop_id', crop.id);

            const formatted: MappingDetail[] = (mappings || []).map((m: any) => ({
              weight_g: m.weight_g,
              volume: m.packagings?.size || '',
              sku: m.sku || '',
            }));
            return {
              ...crop,
              type: 'crop' as const,
              mappings: formatted,
            };
          })
        );
        allItems.push(...cropsWithMappings);
      }

      // Blends with mappings
      if (blendsRes.data) {
        const blendsWithMappings = await Promise.all(
          blendsRes.data.map(async (blend) => {
            const { data: mappings } = await supabase
              .from('packaging_mappings')
              .select('weight_g, packaging_id, sku, packagings(id, name, size)')
              .eq('blend_id', blend.id);

            const formatted: MappingDetail[] = (mappings || []).map((m: any) => ({
              weight_g: m.weight_g,
              volume: m.packagings?.size || '',
              sku: m.sku || '',
            }));
            return {
              ...blend,
              type: 'blend' as const,
              mappings: formatted,
            };
          })
        );
        allItems.push(...blendsWithMappings);
      }

      setItems(allItems.sort((a, b) => a.name.localeCompare(b.name)));

      if (packagingsRes.data) {
        setPackagings(packagingsRes.data);
      }
    } catch (error) {
      console.error('Error loading packaging mappings:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať dáta.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===================== DERIVED =====================

  // Filter + search
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (typeFilter === 'crop' && item.type !== 'crop') return false;
      if (typeFilter === 'blend' && item.type !== 'blend') return false;
      const hasAnyMapping = (item.mappings?.length || 0) > 0;
      if (typeFilter === 'configured' && !hasAnyMapping) return false;
      if (typeFilter === 'unconfigured' && hasAnyMapping) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, typeFilter, searchQuery]);

  // Súhrny
  const summary = useMemo(() => {
    const total = items.length;
    const configured = items.filter(i => (i.mappings?.length || 0) > 0).length;
    const cropsCount = items.filter(i => i.type === 'crop').length;
    const blendsCount = items.filter(i => i.type === 'blend').length;
    return { total, configured, unconfigured: total - configured, cropsCount, blendsCount };
  }, [items]);

  // Sorted packagings (numerically podľa size)
  const sortedPackagings = useMemo(() => {
    return [...packagings].sort((a, b) => {
      const aNum = parseInt(a.size || '0', 10);
      const bNum = parseInt(b.size || '0', 10);
      return aNum - bNum;
    });
  }, [packagings]);

  // ===================== HANDLERS =====================

  const openEditDialog = async (item: CropOrBlendItem) => {
    setEditingItem(item);

    // Načítaj aktuálne mappings pre tento item
    const query = supabase
      .from('packaging_mappings')
      .select('weight_g, packaging_id');

    if (item.type === 'crop') {
      query.eq('crop_id', item.id);
    } else {
      query.eq('blend_id', item.id);
    }

    const { data: mappings } = await query;

    const idMap: Record<number, string> = {};
    const enabledMap: Record<number, boolean> = {};

    (mappings || []).forEach((m: any) => {
      if (m?.packaging_id && m?.weight_g) {
        idMap[m.weight_g] = m.packaging_id;
        enabledMap[m.weight_g] = true;
      }
    });

    setPackagingIdMappings(idMap);
    setEnabledWeights(enabledMap);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setPackagingIdMappings({});
    setEnabledWeights({});
  };

  const handleWeightToggle = (weight: number, checked: boolean) => {
    setEnabledWeights(prev => ({ ...prev, [weight]: checked }));
    if (!checked) {
      setPackagingIdMappings(prev => {
        const next = { ...prev };
        delete next[weight];
        return next;
      });
    }
  };

  const handlePackagingChange = (weight: number, packagingId: string) => {
    if (packagingId === 'none') {
      setPackagingIdMappings(prev => {
        const next = { ...prev };
        delete next[weight];
        return next;
      });
    } else {
      setPackagingIdMappings(prev => ({ ...prev, [weight]: packagingId }));
    }
  };

  const handleSaveConfiguration = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      // Vymaž existujúce mappings pre tento item
      const deleteQuery = supabase.from('packaging_mappings').delete();
      if (editingItem.type === 'crop') {
        deleteQuery.eq('crop_id', editingItem.id);
      } else {
        deleteQuery.eq('blend_id', editingItem.id);
      }
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      // Vygeneruj nové mappings s SKU
      const mappingsToInsert = await Promise.all(
        Object.entries(packagingIdMappings)
          .filter(([weight, packagingId]) =>
            enabledWeights[parseInt(weight, 10)] && packagingId && packagingId !== ''
          )
          .map(async ([weight, packagingId]) => {
            const sku = await generatePackagingSKU(
              editingItem.type === 'crop' ? editingItem.id : null,
              editingItem.type === 'blend' ? editingItem.id : null,
              parseInt(weight, 10)
            );
            const baseMapping = {
              weight_g: parseInt(weight, 10),
              packaging_id: packagingId,
              sku: sku,
            };
            if (editingItem.type === 'crop') {
              return { ...baseMapping, crop_id: editingItem.id, blend_id: null };
            } else {
              return { ...baseMapping, blend_id: editingItem.id, crop_id: null };
            }
          })
      );

      if (mappingsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('packaging_mappings')
          .insert(mappingsToInsert);
        if (insertError) throw insertError;
      }

      toast({
        title: 'Uložené',
        description: `Konfigurácia pre ${editingItem.name} bola uložená.`,
      });

      await loadData();
      closeDialog();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Chyba pri ukladaní',
        description: error.message || 'Skús to znova.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ===================== RENDER =====================

  const isEmpty = !loading && (items.length === 0 || packagings.length === 0);

  return (
    <>
      <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc] flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
            <Link2 className="h-4 w-4 text-[#16a34a]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-[#0f172a]">Priradenie obalov</h2>
            <p className="text-[11px] text-[#475569]">Predvolený obal pre kombináciu plodiny/mixu a hmotnosti</p>
          </div>
        </div>

        {/* Summary */}
        {!loading && items.length > 0 && (
          <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-white rounded-lg border border-[#e2e8f0] p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">Spolu</p>
                <p className="text-base font-bold text-[#0f172a]">{summary.total}</p>
              </div>
              <div className="bg-white rounded-lg border border-[#e2e8f0] p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">Nastavené</p>
                <p className="text-base font-bold text-[#16a34a]">{summary.configured}</p>
              </div>
              <div className="bg-white rounded-lg border border-[#e2e8f0] p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">Plodiny</p>
                <p className="text-base font-bold text-[#0f172a]">{summary.cropsCount}</p>
              </div>
              <div className="bg-white rounded-lg border border-[#e2e8f0] p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">Mixy</p>
                <p className="text-base font-bold text-[#0f172a]">{summary.blendsCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {!loading && items.length > 0 && (
          <div className="px-4 py-3 border-b border-[#e2e8f0] space-y-2">
            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-2">
              {([
                { id: 'all', label: 'Všetky' },
                { id: 'crop', label: 'Plodiny' },
                { id: 'blend', label: 'Mixy' },
                { id: 'configured', label: 'Nastavené' },
                { id: 'unconfigured', label: 'Nenastavené' },
              ] as { id: TypeFilter; label: string }[]).map(f => {
                const active = typeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setTypeFilter(f.id)}
                    className={cn(
                      'h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors',
                      active
                        ? 'bg-[#16a34a] border-[#16a34a] text-white'
                        : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a]'
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="Hľadať plodinu alebo mix..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-md border border-[#e2e8f0] text-sm text-[#0f172a] bg-white focus:outline-none focus:border-[#16a34a]"
              />
            </div>
          </div>
        )}

        {/* List */}
        <div className="divide-y divide-[#e2e8f0]">
          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </>
          ) : isEmpty ? (
            <div className="px-4 py-10 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-[#f1f5f9] flex items-center justify-center mb-2">
                <Link2 className="h-6 w-6 text-[#94a3b8]" />
              </div>
              <h3 className="text-sm font-bold text-[#0f172a] mb-1">
                {items.length === 0 ? 'Žiadne plodiny ani mixy' : 'Žiadne obaly'}
              </h3>
              <p className="text-xs text-[#475569] max-w-sm">
                {items.length === 0
                  ? 'Najprv vytvor plodiny v sekcii Plodiny.'
                  : 'Najprv vytvor obaly v Sklade → Obaly.'}
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-10 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-[#475569]">Žiadne výsledky pre tento filter.</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const isBlend = item.type === 'blend';
              const hasMappings = (item.mappings?.length || 0) > 0;
              return (
                <div key={item.id} className="px-4 py-3 flex items-start gap-3 hover:bg-[#f8fafc] transition-colors">
                  {/* Type icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border',
                      isBlend
                        ? 'bg-[#ede9fe] border-[#ddd6fe]'
                        : 'bg-[#f0fdf4] border-[#bbf7d0]'
                    )}
                  >
                    {isBlend ? (
                      <Layers className="h-4 w-4 text-[#7c3aed]" />
                    ) : (
                      <Sprout className="h-4 w-4 text-[#16a34a]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#0f172a]">{item.name}</span>
                      <span
                        className={cn(
                          'inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold',
                          isBlend
                            ? 'bg-[#ede9fe] text-[#7c3aed]'
                            : 'bg-[#f0fdf4] text-[#16a34a]'
                        )}
                      >
                        {isBlend ? 'Mix' : 'Plodina'}
                      </span>
                      {hasMappings ? (
                        <span className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold bg-[#dcfce7] text-[#166534]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          NASTAVENÉ
                        </span>
                      ) : (
                        <span className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold bg-[#f1f5f9] text-[#94a3b8]">
                          <Circle className="h-3 w-3 mr-1" />
                          NENASTAVENÉ
                        </span>
                      )}
                    </div>

                    {/* Mapping chips */}
                    {hasMappings ? (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(item.mappings || [])
                          .sort((a, b) => a.weight_g - b.weight_g)
                          .map((m, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center h-5 px-1.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[10px] text-[#0f172a]"
                              title={m.sku ? `SKU: ${m.sku}` : undefined}
                            >
                              <span className="font-bold text-[#16a34a]">{m.weight_g}g</span>
                              <span className="text-[#475569] mx-1">→</span>
                              <span className="font-semibold">{m.volume || '?'}</span>
                              {m.sku && <span className="text-[#94a3b8] ml-1">· {m.sku}</span>}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#94a3b8] mt-1">Žiadne nastavenie</p>
                    )}
                  </div>

                  {/* Edit action */}
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => openEditDialog(item)}
                      title="Upraviť priradenie"
                      className="w-7 h-7 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ===================== EDIT DIALOG ===================== */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => { if (!open && !saving) closeDialog(); }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a] flex items-center gap-2">
              <Link2 className="h-5 w-5 text-[#16a34a]" />
              Priradenie obalov: {editingItem?.name}
            </DialogTitle>
            <DialogDescription className="text-[#475569]">
              Zapni prepínač pre hmotnosti ktoré chceš používať a vyber priradený obal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {STANDARD_WEIGHTS.map(weight => {
                const enabled = !!enabledWeights[weight];
                const selectedId = packagingIdMappings[weight] || '';
                return (
                  <div
                    key={weight}
                    className={cn(
                      'rounded-lg border p-2.5 transition-colors',
                      enabled
                        ? 'bg-[#f0fdf4] border-[#bbf7d0]'
                        : 'bg-white border-[#e2e8f0]'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {/* Custom toggle */}
                      <button
                        type="button"
                        onClick={() => handleWeightToggle(weight, !enabled)}
                        className={cn(
                          'relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer border-2 flex-shrink-0',
                          enabled
                            ? 'bg-[#16a34a] border-[#16a34a]'
                            : 'bg-[#e2e8f0] border-[#e2e8f0]'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform',
                            enabled ? 'translate-x-5' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                      <span
                        className={cn(
                          'font-bold text-sm',
                          enabled ? 'text-[#16a34a]' : 'text-[#94a3b8]'
                        )}
                      >
                        {weight}g
                      </span>
                    </div>
                    <Select
                      disabled={!enabled}
                      value={selectedId || 'none'}
                      onValueChange={(v) => handlePackagingChange(weight, v)}
                    >
                      <SelectTrigger className="h-8 text-xs border-[#e2e8f0]">
                        <SelectValue placeholder="Vyber obal..." />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        <SelectItem value="none">-</SelectItem>
                        {sortedPackagings.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.size || p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            {/* Live preview */}
            {Object.entries(packagingIdMappings).filter(([, id]) => id && id !== '').length > 0 && (
              <div className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-3">
                <Label className="text-xs font-semibold text-[#475569] mb-2 block">Náhľad konfigurácie</Label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(packagingIdMappings)
                    .filter(([, packagingId]) => packagingId && packagingId !== '')
                    .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                    .map(([weight, packagingId]) => {
                      const packaging = packagings.find(p => p.id === packagingId);
                      return (
                        <span
                          key={weight}
                          className="inline-flex items-center px-2 py-1 rounded-md bg-[#f0fdf4] border border-[#bbf7d0] text-xs"
                        >
                          <span className="font-bold text-[#16a34a]">{weight}g</span>
                          <span className="text-[#475569] mx-1">→</span>
                          <span className="font-semibold text-[#0f172a]">{packaging?.size || packaging?.name || '?'}</span>
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <button
              type="button"
              onClick={closeDialog}
              disabled={saving}
              className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Zrušiť
            </button>
            <button
              type="button"
              onClick={handleSaveConfiguration}
              disabled={saving}
              className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Ukladám...' : 'Uložiť konfiguráciu'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PackagingMappings;
