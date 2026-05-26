import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCrops, useBlends } from '@/hooks/useSupabaseData';
import { usePrices, DbPrice } from '@/hooks/usePrices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Euro, Plus, Pencil, Trash2, Leaf, Sprout, Flower, X, House, Utensils, Store, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatEur } from '@/utils/formatters';

const PACKAGING_SIZES = ['25g', '50g', '60g', '70g', '100g', '120g', '150g'];

const CUSTOMER_TYPES = [
  { value: 'home',      label: 'Domáci',      icon: House,    active: 'bg-[#f0fdf4] border-[#16a34a] text-[#166534]',   badge: 'bg-[#16a34a] text-white',        row: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]' },
  { value: 'gastro',    label: 'Gastro',       icon: Utensils, active: 'bg-[#eff6ff] border-[#2563eb] text-[#1e40af]',   badge: 'bg-[#2563eb] text-white',        row: 'bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af]' },
  { value: 'wholesale', label: 'VO',           icon: Store,    active: 'bg-[#fff7ed] border-[#d97706] text-[#92400e]',   badge: 'bg-[#d97706] text-white',        row: 'bg-[#fff7ed] border-[#fed7aa] text-[#92400e]' },
];

const CATEGORY_OPTIONS = [
  { value: 'all',            label: 'Všetky',       icon: null },
  { value: 'microgreens',    label: 'Mikrozelenina', icon: Leaf },
  { value: 'microherbs',     label: 'Mikrobylinky',  icon: Sprout },
  { value: 'edible_flowers', label: 'Jedlé kvety',   icon: Flower },
];

interface PricesByCustomer { [customerType: string]: { packagingSize: string; price: string }[] }

const PricesPage = () => {
  const { data: crops, loading: cropsLoading } = useCrops();
  const { data: blends, loading: blendsLoading } = useBlends();
  const { data: prices, loading: pricesLoading, addMany: addManyPrices, remove: deletePrice } = usePrices();
  const { toast } = useToast();

  const isLoading = cropsLoading || blendsLoading || pricesLoading;

  // Main tab: plodiny / mixy
  const [mainTab, setMainTab] = useState<'crops' | 'blends'>('crops');
  // Customer tab in list view
  const [listCustomerTab, setListCustomerTab] = useState('home');
  // Category filter
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogItem, setDialogItem] = useState<{ id: string; name: string; isCrop: boolean } | null>(null);
  const [dialogCustomerTab, setDialogCustomerTab] = useState('home');
  const [pricesByCustomer, setPricesByCustomer] = useState<PricesByCustomer>({});
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getCropName = (id: string) => crops?.find(c => c.id === id)?.name || '';
  const getBlendName = (id: string) => blends?.find(b => b.id === id)?.name || '';

  const sortedCrops = useMemo(() => {
    if (!crops) return [];
    const order: Record<string, number> = { microgreens: 0, microherbs: 1, edible_flowers: 2 };
    return [...crops].sort((a, b) => {
      const catDiff = (order[(a as any).category] ?? 3) - (order[(b as any).category] ?? 3);
      return catDiff !== 0 ? catDiff : a.name.localeCompare(b.name, 'sk');
    });
  }, [crops]);

  const filteredCrops = useMemo(() => {
    if (categoryFilter === 'all') return sortedCrops;
    return sortedCrops.filter(c => (c as any).category === categoryFilter);
  }, [sortedCrops, categoryFilter]);

  // Get unique item IDs that have prices for current customer tab
  const itemsWithPrices = useMemo(() => {
    const isCrop = mainTab === 'crops';
    const items = isCrop ? filteredCrops : (blends || []);
    return items.map(item => {
      const itemPrices = prices?.filter(p =>
        (isCrop ? p.crop_id === item.id : p.blend_id === item.id) &&
        p.customer_type === listCustomerTab
      ) || [];
      return { id: item.id, name: isCrop ? item.name : item.name, isCrop, prices: itemPrices };
    });
  }, [mainTab, filteredCrops, blends, prices, listCustomerTab]);

  // Count per customer type
  const countPerCustomer = useMemo(() => {
    const isCrop = mainTab === 'crops';
    const items = isCrop ? (crops || []) : (blends || []);
    return CUSTOMER_TYPES.reduce((acc, ct) => {
      acc[ct.value] = items.filter(item =>
        prices?.some(p => (isCrop ? p.crop_id === item.id : p.blend_id === item.id) && p.customer_type === ct.value)
      ).length;
      return acc;
    }, {} as Record<string, number>);
  }, [mainTab, crops, blends, prices]);

  const openDialog = (id: string, name: string, isCrop: boolean) => {
    setDialogItem({ id, name, isCrop });
    setDialogCustomerTab('home');
    // Load existing prices grouped by customer
    const existing = prices?.filter(p => isCrop ? p.crop_id === id : p.blend_id === id) || [];
    const grouped: PricesByCustomer = {};
    CUSTOMER_TYPES.forEach(ct => {
      grouped[ct.value] = existing
        .filter(p => p.customer_type === ct.value)
        .map(p => ({ packagingSize: p.packaging_size, price: p.unit_price.toString().replace('.', ',') }));
      if (grouped[ct.value].length === 0) {
        grouped[ct.value] = [{ packagingSize: '50g', price: '' }];
      }
    });
    setPricesByCustomer(grouped);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setDialogItem(null);
    setDialogCustomerTab('home');
    const empty: PricesByCustomer = {};
    CUSTOMER_TYPES.forEach(ct => { empty[ct.value] = [{ packagingSize: '50g', price: '' }]; });
    setPricesByCustomer(empty);
    setIsDialogOpen(true);
  };

  const updateEntry = (customerType: string, index: number, field: 'packagingSize' | 'price', value: string) => {
    setPricesByCustomer(prev => ({
      ...prev,
      [customerType]: prev[customerType].map((e, i) => i === index ? { ...e, [field]: value } : e)
    }));
  };

  const addEntry = (customerType: string) => {
    setPricesByCustomer(prev => ({
      ...prev,
      [customerType]: [...prev[customerType], { packagingSize: '50g', price: '' }]
    }));
  };

  const removeEntry = (customerType: string, index: number) => {
    setPricesByCustomer(prev => ({
      ...prev,
      [customerType]: prev[customerType].filter((_, i) => i !== index)
    }));
  };

  const [newItemId, setNewItemId] = useState('');

  const handleSave = async () => {
    const itemId = dialogItem?.id || newItemId;
    const isCrop = dialogItem ? dialogItem.isCrop : mainTab === 'crops';

    if (!itemId) {
      toast({ title: 'Chyba', description: 'Vyberte plodinu alebo mix', variant: 'destructive' });
      return;
    }

    setSaving(true);

    // Delete existing
    const existing = prices?.filter(p => isCrop ? p.crop_id === itemId : p.blend_id === itemId) || [];
    for (const p of existing) await deletePrice(p.id);

    // Build new price list
    const toAdd: any[] = [];
    CUSTOMER_TYPES.forEach(ct => {
      const entries = pricesByCustomer[ct.value] || [];
      entries.forEach(e => {
        // normalize comma to dot for parsing
        const normalized = e.price.replace(',', '.');
        if (normalized && parseFloat(normalized) > 0) {
          toAdd.push({
            crop_id: isCrop ? itemId : null,
            blend_id: !isCrop ? itemId : null,
            packaging_size: e.packagingSize,
            unit_price: parseFloat(normalized),
            customer_type: ct.value,
          });
        }
      });
    });

    if (toAdd.length === 0) {
      toast({ title: 'Chyba', description: 'Zadajte aspoň jednu cenu', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const success = await addManyPrices(toAdd);
    setSaving(false);
    if (success) {
      toast({ title: 'Ceny uložené', description: `Uložených ${toAdd.length} cien` });
      setIsDialogOpen(false);
      setNewItemId('');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const toDelete = prices?.filter(p => mainTab === 'crops' ? p.crop_id === deleteId : p.blend_id === deleteId) || [];
    for (const p of toDelete) await deletePrice(p.id);
    setDeleteId(null);
    toast({ title: 'Ceny zmazané' });
  };

  const cropCount = useMemo(() => {
    const ids = new Set(prices?.filter(p => p.crop_id).map(p => p.crop_id));
    return ids.size;
  }, [prices]);

  const blendCount = useMemo(() => {
    const ids = new Set(prices?.filter(p => p.blend_id).map(p => p.blend_id));
    return ids.size;
  }, [prices]);

  const currentCt = CUSTOMER_TYPES.find(ct => ct.value === listCustomerTab)!;
  const dialogCt = CUSTOMER_TYPES.find(ct => ct.value === dialogCustomerTab)!;

  return (
    <MainLayout hideMobileHeader>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pr-24 md:pr-28">
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
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Pridať ceny</span><span className="sm:hidden">Pridať</span>
        </button>
      </div>

      {/* Main tabs — štýl ako Rozvoz/Dlhová peňaženka */}
      <div className="flex border-b border-[#e2e8f0] mb-4">
        {([
          { id: 'crops', label: 'Plodiny', icon: Leaf, count: cropCount },
          { id: 'blends', label: 'Mixy', icon: Sprout, count: blendCount },
        ] as const).map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => { setMainTab(tab.id); setCategoryFilter('all'); }}
              className={`flex items-center gap-2 px-5 h-10 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                mainTab === tab.id
                  ? 'border-[#16a34a] text-[#16a34a]'
                  : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
              }`}>
              <Icon className="h-4 w-4" />
              {tab.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                mainTab === tab.id ? 'bg-[#16a34a] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
              }`}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Customer type tabs */}
      <div className="flex gap-1 bg-[#f1f5f9] p-1 rounded-xl border border-[#cbd5e1] mb-3">
        {CUSTOMER_TYPES.map(ct => {
          const Icon = ct.icon;
          const active = listCustomerTab === ct.value;
          const cnt = countPerCustomer[ct.value] || 0;
          return (
            <button key={ct.value} onClick={() => setListCustomerTab(ct.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold transition-all ${
                active ? ct.active + ' border' : 'text-[#64748b] hover:text-[#0f172a]'
              }`}>
              <Icon className="h-3.5 w-3.5" />
              {ct.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? ct.badge : 'bg-[#e2e8f0] text-[#64748b]'}`}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Category chips — len pre plodiny */}
      {mainTab === 'crops' && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {CATEGORY_OPTIONS.map(cat => {
            const Icon = cat.icon;
            return (
              <button key={cat.value} onClick={() => setCategoryFilter(cat.value)}
                className={`inline-flex items-center gap-1 px-3 h-7 rounded-lg border text-xs font-semibold transition-colors ${
                  categoryFilter === cat.value
                    ? 'bg-[#0f172a] border-[#0f172a] text-white'
                    : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
                }`}>
                {Icon && <Icon className="h-3 w-3" />}
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Price list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#16a34a]" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
          {/* Table header — len desktop */}
          <div className="hidden md:grid grid-cols-[220px_1fr_72px] bg-[#f8fafc] border-b border-[#e2e8f0]">
            <div className="px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">
              {mainTab === 'crops' ? 'Plodina' : 'Mix'}
            </div>
            <div className="px-4 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">
              Ceny — {currentCt.label}
            </div>
            <div />
          </div>

          {itemsWithPrices.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-[#f1f5f9] border border-[#cbd5e1] flex items-center justify-center mb-3">
                <Euro className="h-6 w-6 text-[#94a3b8]" />
              </div>
              <p className="text-sm text-[#64748b]">Žiadne ceny</p>
            </div>
          ) : (
            <div className="divide-y divide-[#e2e8f0]">
              {itemsWithPrices.map(item => (
                <div
                  key={item.id}
                  className="flex flex-col md:grid md:grid-cols-[220px_1fr_72px] md:items-center hover:bg-[#f8fafc] transition-colors group"
                >
                  {/* Názov */}
                  <div className="px-4 pt-3 md:py-3">
                    <div className="text-sm font-semibold text-[#0f172a]">{item.name}</div>
                  </div>

                  {/* Ceny */}
                  <div className="px-4 py-2 md:py-3">
                    {item.prices.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.prices
                          .sort((a, b) => a.packaging_size.localeCompare(b.packaging_size, undefined, { numeric: true }))
                          .map((price, idx) => (
                            <div
                              key={idx}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap ${currentCt.row}`}
                            >
                              <span className="font-bold">{price.packaging_size}</span>
                              <span className="opacity-50">·</span>
                              <span className="font-semibold">{formatEur(price.unit_price)}</span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[#94a3b8] italic">Bez ceny pre {currentCt.label}</span>
                    )}
                  </div>

                  {/* Akcie — na mobile vždy viditeľné, na desktope hover-only */}
                  <div className="flex items-center justify-end gap-1.5 px-4 pb-3 md:px-3 md:pb-0 md:py-3 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
                    <button
                      onClick={() => openDialog(item.id, item.name, item.isCrop)}
                      className="w-8 h-8 md:w-7 md:h-7 rounded-lg border border-[#cbd5e1] bg-white flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                      aria-label="Upraviť ceny"
                    >
                      <Pencil className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    </button>
                    {item.prices.length > 0 && (
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="w-8 h-8 md:w-7 md:h-7 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                        aria-label="Zmazať ceny"
                      >
                        <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={v => { setIsDialogOpen(v); if (!v) setNewItemId(''); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Euro className="h-5 w-5 text-[#16a34a]" />
              {dialogItem ? dialogItem.name : 'Pridať ceny'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Item select — len pri novom */}
            {!dialogItem && (
              <div>
                <div className="text-xs font-bold text-[#475569] uppercase tracking-wide mb-1.5">
                  {mainTab === 'crops' ? 'Plodina' : 'Mix'} *
                </div>
                <Select value={newItemId} onValueChange={setNewItemId}>
                  <SelectTrigger className="h-9 border-[#e2e8f0] text-sm">
                    <SelectValue placeholder={mainTab === 'crops' ? 'Vyberte plodinu' : 'Vyberte mix'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[260px]">
                    {(mainTab === 'crops' ? sortedCrops : (blends || [])).map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Customer tabs in dialog */}
            <div className="flex gap-1 bg-[#f1f5f9] p-1 rounded-xl border border-[#cbd5e1]">
              {CUSTOMER_TYPES.map(ct => {
                const Icon = ct.icon;
                const active = dialogCustomerTab === ct.value;
                const hasEntries = (pricesByCustomer[ct.value] || []).some(e => e.price);
                return (
                  <button key={ct.value} onClick={() => setDialogCustomerTab(ct.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold transition-all relative ${
                      active ? ct.active + ' border' : 'text-[#64748b] hover:text-[#0f172a]'
                    }`}>
                    <Icon className="h-3.5 w-3.5" />
                    {ct.label}
                    {hasEntries && !active && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Price entries for current customer tab */}
            <div>
              <div className="text-xs font-bold text-[#475569] uppercase tracking-wide mb-2">
                Ceny pre {dialogCt.label}
              </div>

              <div className="space-y-2">
                {(pricesByCustomer[dialogCustomerTab] || []).map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-xl border bg-[#f8fafc] border-[#e2e8f0]">
                    <Select value={entry.packagingSize}
                      onValueChange={v => updateEntry(dialogCustomerTab, idx, 'packagingSize', v)}>
                      <SelectTrigger className="h-8 w-[78px] text-xs border-[#e2e8f0] shrink-0 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PACKAGING_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text" inputMode="decimal" value={entry.price}
                        onChange={e => {
                          // Povoľ čiarku aj bodku počas písania, normalizujeme až pri uložení
                          let v = e.target.value.replace(/[^0-9.,]/g, '');
                          // Len jeden oddeľovač
                          const sepCount = (v.match(/[.,]/g) || []).length;
                          if (sepCount > 1) {
                            const firstSep = v.search(/[.,]/);
                            v = v.slice(0, firstSep + 1) + v.slice(firstSep + 1).replace(/[.,]/g, '');
                          }
                          updateEntry(dialogCustomerTab, idx, 'price', v);
                        }}
                        placeholder="0,00"
                        className="w-full h-8 rounded-lg border border-[#cbd5e1] bg-white text-sm px-3 pr-8 text-[#0f172a] focus:outline-none focus:border-[#16a34a]"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#94a3b8] pointer-events-none">€</span>
                    </div>

                    {(pricesByCustomer[dialogCustomerTab] || []).length > 1 && (
                      <button onClick={() => removeEntry(dialogCustomerTab, idx)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-[#dc2626] transition-colors shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={() => addEntry(dialogCustomerTab)}
                className="mt-2 flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-[#e2e8f0] bg-transparent text-xs font-medium text-[#64748b] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors w-full justify-center">
                <Plus className="h-3.5 w-3.5" /> Pridať gramáž
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#f1f5f9]">
            <button onClick={() => { setIsDialogOpen(false); setNewItemId(''); }}
              className="h-9 px-4 rounded-xl border border-[#cbd5e1] bg-white text-sm font-medium text-[#475569] hover:bg-[#f8fafc]">
              Zrušiť
            </button>
            <button onClick={handleSave} disabled={saving}
              className="h-9 px-5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Uložiť všetky ceny
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať všetky ceny?</AlertDialogTitle>
            <AlertDialogDescription>
              Zmažú sa všetky ceny pre túto položku naprieč všetkými typmi zákazníkov. Akcia je nevratná.
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
