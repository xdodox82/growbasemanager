import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCrops, useBlends } from '@/hooks/useSupabaseData';
import { usePrices, useVatSettings, DbPrice } from '@/hooks/usePrices';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Euro, Plus, Pencil, Trash2, Leaf, Blend, X, Sprout, Flower, House, Utensils, Store, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PACKAGING_SIZES = ['25g', '50g', '60g', '70g', '100g', '120g', '150g'];

const CUSTOMER_TYPES = [
  { value: 'all',       label: 'Všetci',       color: 'bg-[#f1f5f9] border-[#e2e8f0] text-[#475569]' },
  { value: 'home',      label: 'Domáci',        color: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]' },
  { value: 'gastro',    label: 'Gastro',         color: 'bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af]' },
  { value: 'wholesale', label: 'Veľkoobchod',   color: 'bg-[#fff7ed] border-[#fed7aa] text-[#92400e]' },
  { value: 'vip',       label: 'VIP',            color: 'bg-[#fdf4ff] border-[#e9d5ff] text-[#6b21a8]' },
];

const CATEGORY_OPTIONS = [
  { value: 'all',           label: 'Všetky',        icon: null },
  { value: 'microgreens',   label: 'Mikrozelenina',  icon: Leaf },
  { value: 'microherbs',    label: 'Mikrobylinky',   icon: Sprout },
  { value: 'edible_flowers',label: 'Jedlé kvety',    icon: Flower },
];

interface PriceEntry { packagingSize: string; price: string; customerType: string; }
interface GroupedPrice { itemId: string; itemName: string; isCrop: boolean; prices: DbPrice[]; }

const CustomerBadge = ({ type }: { type: string }) => {
  const ct = CUSTOMER_TYPES.find(t => t.value === type);
  return ct ? (
    <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border ${ct.color}`}>{ct.label}</span>
  ) : null;
};

const PricesPage = () => {
  const { data: crops, loading: cropsLoading } = useCrops();
  const { data: blends, loading: blendsLoading } = useBlends();
  const { data: prices, loading: pricesLoading, add: addPrice, addMany: addManyPrices, update: updatePrice, remove: deletePrice } = usePrices();
  const { isVatEnabled, vatRate } = useVatSettings();
  const { toast } = useToast();

  const isLoading = cropsLoading || blendsLoading || pricesLoading;

  const [activeTab, setActiveTab] = useState<'crops' | 'blends'>('crops');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cropFilter, setCropFilter] = useState('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ cropId: '', blendId: '' });
  const [priceEntries, setPriceEntries] = useState<PriceEntry[]>([{ packagingSize: '50g', price: '', customerType: 'home' }]);

  const getCropName = (id: string) => crops?.find(c => c.id === id)?.name || 'Neznáma plodina';
  const getBlendName = (id: string) => blends?.find(b => b.id === id)?.name || 'Neznáma zmes';
  const calculateWithVat = (price: number) => price * (1 + vatRate / 100);

  const sortedCrops = useMemo(() => {
    if (!crops) return [];
    return [...crops].sort((a, b) => {
      const catOrder: Record<string,number> = { microgreens: 0, microherbs: 1, edible_flowers: 2 };
      const catDiff = (catOrder[(a as any).category] ?? 3) - (catOrder[(b as any).category] ?? 3);
      return catDiff !== 0 ? catDiff : a.name.localeCompare(b.name, 'sk');
    });
  }, [crops]);

  const filteredCropsByCategory = useMemo(() => {
    if (!sortedCrops) return [];
    if (categoryFilter === 'all') return sortedCrops;
    return sortedCrops.filter(c => (c as any).category === categoryFilter);
  }, [sortedCrops, categoryFilter]);

  const cropPrices = useMemo(() => prices?.filter(p => p.crop_id) || [], [prices]);
  const blendPrices = useMemo(() => prices?.filter(p => p.blend_id) || [], [prices]);

  const filteredCropPrices = useMemo(() => {
    let result = cropPrices;
    if (cropFilter !== 'all') result = result.filter(p => p.crop_id === cropFilter);
    else if (categoryFilter !== 'all') {
      const catCropIds = filteredCropsByCategory.map(c => c.id);
      result = result.filter(p => catCropIds.includes(p.crop_id!));
    }
    if (customerTypeFilter !== 'all') result = result.filter(p => p.customer_type === customerTypeFilter);
    return result;
  }, [cropPrices, cropFilter, customerTypeFilter, categoryFilter, filteredCropsByCategory]);

  const filteredBlendPrices = useMemo(() => {
    let result = blendPrices;
    if (customerTypeFilter !== 'all') result = result.filter(p => p.customer_type === customerTypeFilter);
    return result;
  }, [blendPrices, customerTypeFilter]);

  const groupedCropPrices = useMemo(() => {
    const groups: GroupedPrice[] = [];
    const processed = new Set<string>();
    filteredCropPrices.forEach(price => {
      const id = price.crop_id!;
      if (!processed.has(id)) {
        processed.add(id);
        groups.push({ itemId: id, itemName: getCropName(id), isCrop: true, prices: filteredCropPrices.filter(p => p.crop_id === id) });
      }
    });
    return groups.sort((a, b) => a.itemName.localeCompare(b.itemName, 'sk'));
  }, [filteredCropPrices, crops]);

  const groupedBlendPrices = useMemo(() => {
    const groups: GroupedPrice[] = [];
    const processed = new Set<string>();
    filteredBlendPrices.forEach(price => {
      const id = price.blend_id!;
      if (!processed.has(id)) {
        processed.add(id);
        groups.push({ itemId: id, itemName: getBlendName(id), isCrop: false, prices: filteredBlendPrices.filter(p => p.blend_id === id) });
      }
    });
    return groups.sort((a, b) => a.itemName.localeCompare(b.itemName, 'sk'));
  }, [filteredBlendPrices, blends]);

  const resetForm = () => {
    setFormData({ cropId: '', blendId: '' });
    setPriceEntries([{ packagingSize: '50g', price: '', customerType: 'home' }]);
  };

  const openEditDialog = (cropId: string | null, blendId: string | null, existingPrices: DbPrice[]) => {
    setFormData({ cropId: cropId || '', blendId: blendId || '' });
    setPriceEntries(existingPrices.length > 0
      ? existingPrices.map(p => ({ packagingSize: p.packaging_size, price: p.unit_price.toString(), customerType: p.customer_type }))
      : [{ packagingSize: '50g', price: '', customerType: 'home' }]
    );
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const isCrop = activeTab === 'crops';
    if (isCrop && !formData.cropId) { toast({ title: 'Chyba', description: 'Vyberte plodinu', variant: 'destructive' }); return; }
    if (!isCrop && !formData.blendId) { toast({ title: 'Chyba', description: 'Vyberte zmes', variant: 'destructive' }); return; }
    const validEntries = priceEntries.filter(e => e.price && parseFloat(e.price) >= 0);
    if (validEntries.length === 0) { toast({ title: 'Chyba', description: 'Zadajte aspoň jednu cenu', variant: 'destructive' }); return; }

    setSaving(true);
    const itemId = isCrop ? formData.cropId : formData.blendId;
    const existing = prices.filter(p => isCrop ? p.crop_id === itemId : p.blend_id === itemId);
    for (const p of existing) await deletePrice(p.id);

    const toAdd = validEntries.map(e => ({
      crop_id: isCrop ? formData.cropId : null,
      blend_id: !isCrop ? formData.blendId : null,
      packaging_size: e.packagingSize,
      unit_price: parseFloat(e.price),
      customer_type: e.customerType,
    }));

    const success = await addManyPrices(toAdd);
    setSaving(false);
    if (success) {
      toast({ title: 'Ceny uložené', description: `Uložených ${validEntries.length} cien` });
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const toDelete = prices.filter(p => activeTab === 'crops' ? p.crop_id === deleteId : p.blend_id === deleteId);
    for (const p of toDelete) await deletePrice(p.id);
    setDeleteId(null);
    toast({ title: 'Ceny zmazané' });
  };

  const updatePriceEntry = (index: number, field: keyof PriceEntry, value: string) => {
    setPriceEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const groups = activeTab === 'crops' ? groupedCropPrices : groupedBlendPrices;

  return (
    <MainLayout hideMobileHeader>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
            <Euro className="h-5 w-5 text-[#16a34a]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0f172a]">Ceny</h1>
            <p className="text-xs text-[#64748b]">{prices?.length || 0} cenových záznamov</p>
          </div>
        </div>
        <button onClick={openNewDialog}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors">
          <Plus className="h-4 w-4" /> Pridať ceny
        </button>
      </div>

      {/* Tabs + Filters card */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden mb-4">
        {/* Tab switcher */}
        <div className="flex border-b border-[#f1f5f9]">
          {([
            { id: 'crops', label: 'Plodiny', icon: Leaf, count: groupedCropPrices.length },
            { id: 'blends', label: 'Mixy', icon: Blend, count: groupedBlendPrices.length },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 h-11 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#16a34a] text-[#16a34a] bg-[#f0fdf4]'
                  : 'border-transparent text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc]'
              }`}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-[#16a34a] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="px-4 py-3 flex flex-wrap gap-2 items-center">
          {/* Customer type chips */}
          <div className="flex gap-1.5 flex-wrap">
            {CUSTOMER_TYPES.map(ct => (
              <button key={ct.value} onClick={() => setCustomerTypeFilter(ct.value)}
                className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-lg border text-[11px] font-semibold transition-colors ${
                  customerTypeFilter === ct.value ? ct.color : 'bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#cbd5e1]'
                }`}>
                {ct.label}
              </button>
            ))}
          </div>

          {activeTab === 'crops' && (
            <>
              <div className="w-px h-5 bg-[#e2e8f0]" />
              {/* Category chips */}
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORY_OPTIONS.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.value} onClick={() => { setCategoryFilter(cat.value); setCropFilter('all'); }}
                      className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-lg border text-[11px] font-semibold transition-colors ${
                        categoryFilter === cat.value
                          ? 'bg-[#0f172a] border-[#0f172a] text-white'
                          : 'bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#cbd5e1]'
                      }`}>
                      {Icon && <Icon className="h-3 w-3" />}
                      {cat.label}
                    </button>
                  );
                })}
              </div>
              {/* Crop filter */}
              <Select value={cropFilter} onValueChange={setCropFilter}>
                <SelectTrigger className="h-7 w-[160px] text-xs border-[#e2e8f0]">
                  <SelectValue placeholder="Všetky plodiny" />
                </SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  <SelectItem value="all">Všetky plodiny</SelectItem>
                  {filteredCropsByCategory.map(crop => (
                    <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      {/* Price list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#16a34a]" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e2e8f0] py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center mb-4">
            <Euro className="h-7 w-7 text-[#94a3b8]" />
          </div>
          <h3 className="text-base font-semibold text-[#0f172a] mb-1">Žiadne ceny</h3>
          <p className="text-sm text-[#64748b] mb-4">Zatiaľ nie sú nastavené žiadne ceny</p>
          <button onClick={openNewDialog}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors">
            <Plus className="h-4 w-4" /> Pridať ceny
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="divide-y divide-[#f1f5f9]">
            {groups.map(group => (
              <div key={group.itemId} className="flex items-center gap-4 px-5 py-3 hover:bg-[#f8fafc] transition-colors group">
                {/* Name */}
                <div className="w-44 shrink-0">
                  <div className="text-sm font-semibold text-[#0f172a]">{group.itemName}</div>
                  <div className="text-xs text-[#94a3b8]">
                    {group.prices.length} {group.prices.length === 1 ? 'cena' : group.prices.length < 5 ? 'ceny' : 'cien'}
                  </div>
                </div>

                {/* Price badges */}
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {group.prices
                    .sort((a, b) => a.packaging_size.localeCompare(b.packaging_size, undefined, { numeric: true }))
                    .map((price, idx) => {
                      const ct = CUSTOMER_TYPES.find(t => t.value === price.customer_type);
                      return (
                        <div key={idx} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${ct?.color || 'bg-[#f1f5f9] border-[#e2e8f0] text-[#475569]'}`}>
                          <span className="font-bold">{price.packaging_size}</span>
                          <span className="opacity-60">·</span>
                          <span className="font-semibold">{price.unit_price.toFixed(2)} €</span>
                          {isVatEnabled && (
                            <span className="opacity-60 text-[10px]">({calculateWithVat(price.unit_price).toFixed(2)} €)</span>
                          )}
                          <CustomerBadge type={price.customer_type} />
                        </div>
                      );
                    })}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => openEditDialog(group.isCrop ? group.itemId : null, group.isCrop ? null : group.itemId, group.prices)}
                    className="w-8 h-8 rounded-lg border border-[#e2e8f0] bg-white flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(group.itemId)}
                    className="w-8 h-8 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={v => { setIsDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-[#16a34a]" />
              {formData.cropId || formData.blendId ? 'Upraviť ceny' : 'Pridať ceny'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Tab select in dialog */}
            <div className="flex gap-2">
              {(['crops', 'blends'] as const).map(tab => (
                <button key={tab} onClick={() => { setActiveTab(tab); resetForm(); }}
                  className={`flex-1 h-9 rounded-lg border text-sm font-semibold transition-colors ${
                    activeTab === tab ? 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]' : 'bg-white border-[#e2e8f0] text-[#64748b]'
                  }`}>
                  {tab === 'crops' ? 'Plodina' : 'Mix'}
                </button>
              ))}
            </div>

            {/* Item select */}
            {activeTab === 'crops' ? (
              <div>
                <label className="text-xs font-semibold text-[#475569] mb-1.5 block">Plodina *</label>
                <Select value={formData.cropId} onValueChange={v => setFormData({ ...formData, cropId: v })}>
                  <SelectTrigger className="h-9 border-[#e2e8f0] text-sm">
                    <SelectValue placeholder="Vyberte plodinu" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[260px]">
                    {sortedCrops.map(crop => (
                      <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-[#475569] mb-1.5 block">Mix *</label>
                <Select value={formData.blendId} onValueChange={v => setFormData({ ...formData, blendId: v })}>
                  <SelectTrigger className="h-9 border-[#e2e8f0] text-sm">
                    <SelectValue placeholder="Vyberte mix" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[260px]">
                    {blends?.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Price entries */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[#475569]">Ceny podľa balenia a zákazníka</label>
                <button type="button" onClick={() => setPriceEntries(p => [...p, { packagingSize: '50g', price: '', customerType: 'home' }])}
                  className="flex items-center gap-1 h-7 px-2.5 rounded-lg border border-[#e2e8f0] bg-white text-xs font-medium text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors">
                  <Plus className="h-3 w-3" /> Pridať riadok
                </button>
              </div>

              <div className="space-y-2">
                {priceEntries.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 p-2.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
                    {/* Packaging size */}
                    <Select value={entry.packagingSize} onValueChange={v => updatePriceEntry(index, 'packagingSize', v)}>
                      <SelectTrigger className="h-8 w-[80px] text-xs border-[#e2e8f0] bg-white shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PACKAGING_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    {/* Price input */}
                    <div className="relative flex-1">
                      <Input type="text" inputMode="decimal" value={entry.price}
                        onChange={e => {
                          let v = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                          const parts = v.split('.');
                          if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
                          updatePriceEntry(index, 'price', v);
                        }}
                        placeholder="0.00"
                        className="h-8 pr-6 text-sm border-[#e2e8f0] bg-white" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#94a3b8]">€</span>
                    </div>

                    {/* Customer type */}
                    <Select value={entry.customerType} onValueChange={v => updatePriceEntry(index, 'customerType', v)}>
                      <SelectTrigger className="h-8 w-[110px] text-xs border-[#e2e8f0] bg-white shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CUSTOMER_TYPES.filter(t => t.value !== 'all').map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Remove */}
                    {priceEntries.length > 1 && (
                      <button type="button" onClick={() => setPriceEntries(p => p.filter((_, i) => i !== index))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-[#dc2626] transition-colors shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* VAT preview */}
              {isVatEnabled && priceEntries.some(e => e.price) && (
                <div className="mt-3 p-3 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]">
                  <div className="text-xs font-semibold text-[#166534] mb-2">S DPH ({vatRate}%)</div>
                  <div className="space-y-1">
                    {priceEntries.filter(e => e.price).map((entry, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-[#166534]">
                        <span>{entry.packagingSize} · {CUSTOMER_TYPES.find(t => t.value === entry.customerType)?.label}</span>
                        <span className="font-bold">{calculateWithVat(parseFloat(entry.price) || 0).toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <button onClick={() => { setIsDialogOpen(false); resetForm(); }}
              className="h-9 px-4 rounded-xl border border-[#e2e8f0] bg-white text-sm font-medium text-[#475569] hover:bg-[#f8fafc]">
              Zrušiť
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="h-9 px-5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Uložiť ceny
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať ceny?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia zmaže všetky ceny pre túto položku. Akcia je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[#dc2626] hover:bg-[#b91c1c] text-white">
              Zmazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default PricesPage;
