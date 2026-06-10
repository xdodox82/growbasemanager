import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { formatKg, formatEur, formatNumber } from '@/utils/formatters';
import {
  useSeeds,
  usePackagings,
  useSubstrates,
  useLabels,
  useSuppliers,
  useCrops,
  DbSeed,
  DbPackaging,
  DbSubstrate,
  DbLabel,
} from '@/hooks/useSupabaseData';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Archive,
  Sprout,
  Package,
  Layers,
  Tag,
  ShoppingBag,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  Upload,
  X,
  ExternalLink,
  Undo2,
  CheckCircle2,
  Loader2,
  Leaf,
  Flower2,
  TreePine,
  StickyNote,
  Wheat,
  ChevronDown,
  ChevronRight,
  PackagePlus,
  ClipboardCheck,
  History,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ===================== TYPES =====================

type InventoryTab = 'seeds' | 'packaging' | 'substrate' | 'labels' | 'consumables';

interface ConsumableItem {
  id: string;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  min_quantity: number | null;
  unit_cost?: number | null;
  price_includes_vat?: boolean | null;
  vat_rate?: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type SeedCategoryFilter = 'all' | 'microgreens' | 'microherbs' | 'edible_flowers';
type ArchiveFilter = 'current' | 'archived';

// ===================== CONSTANTS =====================

const TAB_CONFIG: Record<InventoryTab, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  seeds: { label: 'Osivo', icon: Sprout },
  packaging: { label: 'Obaly', icon: Package },
  substrate: { label: 'Substrát', icon: Layers },
  labels: { label: 'Etikety', icon: Tag },
  consumables: { label: 'Spotrebný materiál', icon: ShoppingBag },
};

const TAB_ORDER: InventoryTab[] = ['seeds', 'packaging', 'substrate', 'labels', 'consumables'];

const PACKAGING_KINDS = ['Pre zrezanú mikrozeleninu', 'Pre živú mikrozeleninu'] as const;
const PACKAGING_MATERIALS = ['rPET', 'PET', 'EKO', 'Papier', 'Iný'] as const;
const PACKAGING_SIZES = ['250ml', '500ml', '750ml', '1000ml', '1200ml'] as const;

const SUBSTRATE_TYPES: Record<string, string> = {
  coconut: 'Kokos',
  peat: 'Rašelina',
  other: 'Iné',
};

const LABEL_TYPES: Record<string, string> = {
  standard: 'Štandardná',
  premium: 'Prémiová',
  eco: 'Ekologická',
  custom: 'Vlastná',
};

const SEED_CATEGORY_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  microgreens: { label: 'Mikrozelenina', icon: Sprout },
  microherbs: { label: 'Mikrobylinky', icon: TreePine },
  edible_flowers: { label: 'Jedlé kvety', icon: Flower2 },
};

// ===================== HELPERS =====================

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try { return format(parseISO(dateStr), 'd.M.yyyy', { locale: sk }); } catch { return dateStr; }
};

// Expirácia osiva sa zobrazuje len ako mesiac/rok (napr. "1/2027").
// V DB je uložená ako prvý deň daného mesiaca (YYYY-MM-01).
const formatExpiryMonthYear = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = parseISO(dateStr);
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const isLowStock = (quantity: number | null | undefined, minStock: number | null | undefined): boolean => {
  if (quantity == null || minStock == null) return false;
  return quantity < minStock;
};

// ===================== MAIN COMPONENT =====================

const InventoryPage = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab from URL query param
  const tabParam = searchParams.get('tab');
  const initialTab: InventoryTab = (tabParam && TAB_ORDER.includes(tabParam as InventoryTab))
    ? (tabParam as InventoryTab)
    : 'seeds';
  const [activeTab, setActiveTab] = useState<InventoryTab>(initialTab);

  // Synchronizuj activeTab → URL query param
  const handleTabChange = useCallback((tab: InventoryTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    if (tab === 'seeds') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // Shared data
  const { data: suppliers } = useSuppliers();

  const getSupplierName = useCallback((supplierId: string | null | undefined): string => {
    if (!supplierId) return '-';
    const s = suppliers.find(sup => sup.id === supplierId);
    return s?.name || '-';
  }, [suppliers]);

  // ===================== RENDER =====================

  return (
    <MainLayout hideMobileHeader>
      <div className="min-h-screen bg-[#f8fafc] pb-20 md:pb-6">
        {/* HEADER */}
        <InventoryHeader activeTab={activeTab} onAction={() => {
          // Tlačidlo "+ Pridať" — vyvoláme custom event ktorý zachytí aktívna tab
          window.dispatchEvent(new CustomEvent('inventory-add'));
        }} />

        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">
          {/* TAB SWITCHER */}
          <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden mb-4">
            <div className="border-b border-[#e2e8f0] px-2 md:px-4 overflow-x-auto">
              <div className="flex items-center gap-1">
                {TAB_ORDER.map(tab => {
                  const config = TAB_CONFIG[tab];
                  const Icon = config.icon;
                  const active = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={cn(
                        'flex items-center gap-2 px-3 md:px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                        active
                          ? 'border-[#16a34a] text-[#16a34a]'
                          : 'border-transparent text-[#475569] hover:text-[#0f172a]'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TAB CONTENT */}
          {activeTab === 'seeds' && (
            <SeedsTab isAdmin={isAdmin} isMobile={isMobile} toast={toast} getSupplierName={getSupplierName} />
          )}
          {activeTab === 'packaging' && (
            <PackagingTab isAdmin={isAdmin} isMobile={isMobile} toast={toast} getSupplierName={getSupplierName} />
          )}
          {activeTab === 'substrate' && (
            <SubstrateTab isAdmin={isAdmin} isMobile={isMobile} toast={toast} getSupplierName={getSupplierName} />
          )}
          {activeTab === 'labels' && (
            <LabelsTab isAdmin={isAdmin} isMobile={isMobile} toast={toast} getSupplierName={getSupplierName} />
          )}
          {activeTab === 'consumables' && (
            <ConsumablesTab isAdmin={isAdmin} isMobile={isMobile} toast={toast} />
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default InventoryPage;

// ===================== HEADER =====================

interface InventoryHeaderProps {
  activeTab: InventoryTab;
  onAction: () => void;
}

const InventoryHeader = ({ activeTab, onAction }: InventoryHeaderProps) => {
  const actionLabels: Record<InventoryTab, string> = {
    seeds: 'Pridať osivo',
    packaging: 'Pridať obal',
    substrate: 'Pridať substrát',
    labels: 'Pridať etiketu',
    consumables: 'Pridať položku',
  };

  return (
    <div className="bg-white border-b border-[#e2e8f0] px-4 md:px-6 py-4">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
            <Archive className="h-5 w-5 text-[#16a34a]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-[#0f172a] truncate">Sklad</h1>
            <p className="text-xs md:text-sm text-[#475569] truncate">Správa zásob a materiálu</p>
          </div>
        </div>
        <button
          onClick={onAction}
          className="flex-shrink-0 h-9 px-3 md:px-4 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{actionLabels[activeTab]}</span>
        </button>
      </div>
    </div>
  );
};

// ===================== SHARED COMPONENTS =====================

// Banner pre nízke zásoby (zobrazí sa hore v každej tabe ak je čo)
interface LowStockBannerProps {
  count: number;
  label: string;
}

const LowStockBanner = ({ count, label }: LowStockBannerProps) => {
  if (count === 0) return null;
  return (
    <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl shadow-sm p-3 mb-4 flex items-center gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#fee2e2] flex items-center justify-center">
        <AlertTriangle className="h-4 w-4 text-[#dc2626]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#0f172a]">
          {count} {count === 1 ? `${label.toLowerCase()} má` : (count >= 2 && count <= 4 ? `${label.toLowerCase()} majú` : `${label.toLowerCase()} má`)} nízke zásoby
        </p>
        <p className="text-xs text-[#475569]">Skontroluj a doobjednaj.</p>
      </div>
    </div>
  );
};

// Skeleton loading state
const TabSkeleton = () => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-4">
        <Skeleton className="h-6 w-40 mb-3" />
        <Skeleton className="h-20 w-full" />
      </div>
    ))}
  </div>
);

// Empty state
interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onAdd?: () => void;
  addLabel?: string;
}

const EmptyTabState = ({ icon: Icon, title, description, onAdd, addLabel }: EmptyStateProps) => (
  <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-12 flex flex-col items-center justify-center text-center">
    <div className="w-14 h-14 rounded-xl bg-[#f1f5f9] flex items-center justify-center mb-3">
      <Icon className="h-7 w-7 text-[#94a3b8]" />
    </div>
    <h3 className="text-base font-bold text-[#0f172a] mb-1">{title}</h3>
    <p className="text-sm text-[#475569] max-w-sm mb-4">{description}</p>
    {onAdd && addLabel && (
      <button
        onClick={onAdd}
        className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-semibold flex items-center gap-2 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </button>
    )}
  </div>
);

// ===================== SEEDS TAB =====================

interface TabProps {
  isAdmin: boolean;
  isMobile: boolean;
  toast: any;
  getSupplierName: (id: string | null | undefined) => string;
}

const SeedsTab = ({ isAdmin, isMobile, toast, getSupplierName }: TabProps) => {
  const { data: seeds, add: addSeed, update: updateSeed, remove: deleteSeed, refetch } = useSeeds();
  const { data: crops } = useCrops();

  // UI state
  const [categoryFilter, setCategoryFilter] = useState<SeedCategoryFilter>('all');
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>('current');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeed, setEditingSeed] = useState<DbSeed | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveDialogId, setArchiveDialogId] = useState<string | null>(null);
  const [selectedSeed, setSelectedSeed] = useState<DbSeed | null>(null);
  // Šarže — zoskupené po plodine. Klikom na kartu sa rozbalí zoznam šarží.
  // Set obsahuje cropId-čka ktoré sú rozbalené.
  const [expandedCropIds, setExpandedCropIds] = useState<Set<string>>(new Set());

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<'microgreens' | 'microherbs' | 'edible_flowers'>('microgreens');
  const [cropId, setCropId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState<'kg' | 'g'>('kg');
  const [supplierId, setSupplierId] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [consumptionStartDate, setConsumptionStartDate] = useState<string>('');
  const [consumptionEndDate, setConsumptionEndDate] = useState<string>('');
  const [stockingDate, setStockingDate] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [minStock, setMinStock] = useState('');
  const [unitPricePerKg, setUnitPricePerKg] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Naskladniť / Inventúra / História (osivo) ---
  const sToday = () => new Date().toISOString().split('T')[0];
  const fmtSeed = (val: number, unit?: string | null) =>
    (unit === 'kg' ? formatKg(val) : `${formatNumber(val)} ${unit || ''}`).trim();

  const [receiptFor, setReceiptFor] = useState<DbSeed | null>(null);
  const [rcvQty, setRcvQty] = useState('');
  const [rcvDate, setRcvDate] = useState(sToday());
  const [rcvPrice, setRcvPrice] = useState('');
  const [rcvNotes, setRcvNotes] = useState('');
  const [rcvSaving, setRcvSaving] = useState(false);

  const [stocktakeFor, setStocktakeFor] = useState<DbSeed | null>(null);
  const [counted, setCounted] = useState('');
  const [stkDate, setStkDate] = useState(sToday());
  const [stkNotes, setStkNotes] = useState('');
  const [stkSaving, setStkSaving] = useState(false);

  const [historyFor, setHistoryFor] = useState<DbSeed | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const openReceipt = (s: DbSeed) => {
    setReceiptFor(s); setRcvQty(''); setRcvDate(sToday()); setRcvPrice(''); setRcvNotes('');
  };
  const handleReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFor) return;
    const qty = parseFloat(rcvQty);
    if (!rcvQty || isNaN(qty) || qty <= 0) {
      toast({ title: 'Chyba', description: 'Zadaj kladné množstvo.', variant: 'destructive' });
      return;
    }
    setRcvSaving(true);
    try {
      const { error } = await supabase.rpc('add_seed_receipt', {
        p_seed_id: receiptFor.id,
        p_quantity: qty,
        p_occurred_on: rcvDate || sToday(),
        p_unit_price: rcvPrice ? parseFloat(rcvPrice) : null,
        p_supplier_id: receiptFor.supplier_id || null,
        p_batch: (receiptFor as any).lot_number || null,
        p_notes: rcvNotes || null,
      });
      if (error) throw error;
      await refetch();
      toast({ title: 'Naskladnené', description: `Pridané ${fmtSeed(qty, receiptFor.unit)}.` });
      setReceiptFor(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Naskladnenie sa nepodarilo.', variant: 'destructive' });
    } finally {
      setRcvSaving(false);
    }
  };

  const openStocktake = (s: DbSeed) => {
    setStocktakeFor(s); setCounted(''); setStkDate(sToday()); setStkNotes('');
  };
  const handleStocktake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stocktakeFor) return;
    const cnt = parseFloat(counted);
    if (counted === '' || isNaN(cnt) || cnt < 0) {
      toast({ title: 'Chyba', description: 'Zadaj napočítaný stav (0 alebo viac).', variant: 'destructive' });
      return;
    }
    setStkSaving(true);
    try {
      const { error } = await supabase.rpc('set_seed_stocktake', {
        p_seed_id: stocktakeFor.id,
        p_counted: cnt,
        p_occurred_on: stkDate || sToday(),
        p_notes: stkNotes || null,
      });
      if (error) throw error;
      await refetch();
      toast({ title: 'Inventúra uložená', description: 'Stav bol upravený podľa napočítaného.' });
      setStocktakeFor(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Inventúra sa nepodarila.', variant: 'destructive' });
    } finally {
      setStkSaving(false);
    }
  };

  const openHistory = async (s: DbSeed) => {
    setHistoryFor(s); setLoadingHistory(true); setMovements([]);
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('item_kind', 'seed')
        .eq('item_id', s.id)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setMovements(data || []);
    } catch (err: any) {
      toast({ title: 'Chyba', description: 'Nepodarilo sa načítať históriu.', variant: 'destructive' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const SEED_MOVEMENT_LABELS: Record<string, string> = {
    receipt: 'Naskladnenie', consumption: 'Spotreba', adjustment: 'Inventúra',
  };
  const seedStkUnit = stocktakeFor?.unit || 'kg';
  const seedCountedDiff = stocktakeFor && counted !== '' && !isNaN(parseFloat(counted))
    ? parseFloat(counted) - (stocktakeFor.quantity || 0)
    : null;
  const seedHistUnit = historyFor?.unit || 'kg';

  // Naskladniť NOVÚ šaržu existujúceho druhu — otvorí "Pridať osivo" predvyplnené plodinou
  const openAddForCrop = (cropObj: any, sample?: DbSeed) => {
    resetForm();
    if (cropObj?.category && ['microgreens', 'microherbs', 'edible_flowers'].includes(cropObj.category)) {
      setSelectedCategory(cropObj.category);
    }
    setCropId(cropObj?.id || '');
    if (sample) {
      setQuantityUnit((sample.unit as 'kg' | 'g') || 'kg');
      setSupplierId(sample.supplier_id || '');
      setUnitPricePerKg((sample as any).unit_price_per_kg?.toString() || '');
      setPriceIncludesVat((sample as any).price_includes_vat ?? true);
      setVatRate((sample as any).vat_rate?.toString() || '20');
      setMinStock((sample as any).min_stock?.toString() || '');
    }
    setIsDialogOpen(true);
  };

  // Listen for header "+" button event
  useEffect(() => {
    const handler = () => openAddDialog();
    window.addEventListener('inventory-add', handler);
    return () => window.removeEventListener('inventory-add', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: suppliersList } = useSuppliers();

  const resetForm = () => {
    setEditingSeed(null);
    setSelectedCategory('microgreens');
    setCropId('');
    setQuantity('');
    setQuantityUnit('kg');
    setSupplierId('');
    setLotNumber('');
    setPurchaseDate('');
    setExpiryDate('');
    setConsumptionStartDate('');
    setConsumptionEndDate('');
    setStockingDate('');
    setNotes('');
    setMinStock('');
    setUnitPricePerKg('');
    setPriceIncludesVat(true);
    setVatRate('20');
    setCertificateFile(null);
    setCertificateUrl(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (seed: DbSeed) => {
    setEditingSeed(seed);
    const crop = crops.find(c => c.id === seed.crop_id);
    setSelectedCategory((crop?.category as any) || 'microgreens');
    setCropId(seed.crop_id || '');
    setQuantity(seed.quantity?.toString() || '');
    setQuantityUnit((seed.unit as 'kg' | 'g') || 'kg');
    setSupplierId(seed.supplier_id || '');
    setLotNumber((seed as any).lot_number || '');
    setPurchaseDate((seed as any).purchase_date || '');
    // Expirácia: DB ukladá YYYY-MM-DD, ale UI input type="month" pracuje s YYYY-MM
    setExpiryDate(((seed as any).expiry_date || '').substring(0, 7));
    setConsumptionStartDate((seed as any).consumption_start_date || '');
    setConsumptionEndDate((seed as any).consumption_end_date || '');
    setStockingDate((seed as any).stocking_date || '');
    setNotes(seed.notes || '');
    setMinStock((seed as any).min_stock?.toString() || '');
    setUnitPricePerKg((seed as any).unit_price_per_kg?.toString() || '');
    setPriceIncludesVat((seed as any).price_includes_vat ?? true);
    setVatRate((seed as any).vat_rate?.toString() || '20');
    setCertificateUrl((seed as any).certificate_url || null);
    setCertificateFile(null);
    setIsDialogOpen(true);
  };

  // Filtering
  const filteredSeeds = useMemo(() => {
    return seeds.filter(s => {
      const isArchived = (s as any).archived === true;
      if (archiveFilter === 'current' && isArchived) return false;
      if (archiveFilter === 'archived' && !isArchived) return false;

      if (categoryFilter !== 'all') {
        const crop = crops.find(c => c.id === s.crop_id);
        if (crop?.category !== categoryFilter) return false;
      }
      if (cropFilter !== 'all' && s.crop_id !== cropFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const crop = crops.find(c => c.id === s.crop_id);
        const matchCrop = crop?.name?.toLowerCase().includes(q);
        const matchLot = (s as any).lot_number?.toLowerCase().includes(q);
        const matchNotes = s.notes?.toLowerCase().includes(q);
        if (!matchCrop && !matchLot && !matchNotes) return false;
      }
      return true;
    });
  }, [seeds, crops, archiveFilter, categoryFilter, cropFilter, searchQuery]);

  // Súhrn po plodinách
  const seedTotalsByCrop = useMemo(() => {
    const acc: Record<string, { cropId: string; cropName: string; cropColor: string; category: string; totalKg: number; totalG: number }> = {};
    filteredSeeds.forEach(s => {
      const cId = s.crop_id || 'unknown';
      const crop = crops.find(c => c.id === cId);
      if (!acc[cId]) {
        acc[cId] = {
          cropId: cId,
          cropName: crop?.name || 'Neznáma',
          cropColor: crop?.color || '#16a34a',
          category: crop?.category || 'microgreens',
          totalKg: 0,
          totalG: 0,
        };
      }
      if (s.unit === 'kg') {
        acc[cId].totalKg += s.quantity || 0;
      } else {
        acc[cId].totalG += s.quantity || 0;
      }
    });
    return Object.values(acc).sort((a, b) => (b.totalKg + b.totalG / 1000) - (a.totalKg + a.totalG / 1000));
  }, [filteredSeeds, crops]);

  // Low stock count
  const lowStockSeeds = useMemo(() =>
    filteredSeeds.filter(s => isLowStock(s.quantity, (s as any).min_stock)),
    [filteredSeeds]
  );

  // Available crops in current category filter
  const availableCrops = useMemo(() => {
    if (categoryFilter === 'all') return crops;
    return crops.filter(c => c.category === categoryFilter);
  }, [crops, categoryFilter]);

  // Upload certificate
  const uploadCertificate = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop();
      const filename = `cert-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('seed-certificates')
        .upload(filename, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('seed-certificates').getPublicUrl(filename);
      return data?.publicUrl || null;
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ title: 'Chyba pri uploade', description: err.message || 'Skús to znova.', variant: 'destructive' });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropId) {
      toast({ title: 'Chyba', description: 'Vyber plodinu.', variant: 'destructive' });
      return;
    }
    if (!quantity || isNaN(parseFloat(quantity))) {
      toast({ title: 'Chyba', description: 'Zadaj platné množstvo.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    let finalCertUrl = certificateUrl;
    if (certificateFile) {
      finalCertUrl = await uploadCertificate(certificateFile);
      if (!finalCertUrl && certificateFile) {
        setSaving(false);
        return;
      }
    }

    const seedData: any = {
      crop_id: cropId,
      quantity: parseFloat(quantity),
      unit: quantityUnit,
      supplier_id: supplierId || null,
      lot_number: lotNumber || null,
      purchase_date: purchaseDate || null,
      // Expirácia: UI je YYYY-MM (mesiac picker), DB ukladá ako prvý deň daného mesiaca
      expiry_date: expiryDate ? `${expiryDate}-01` : null,
      consumption_start_date: consumptionStartDate || null,
      consumption_end_date: consumptionEndDate || null,
      stocking_date: stockingDate || null,
      notes: notes || null,
      certificate_url: finalCertUrl,
      min_stock: minStock ? parseFloat(minStock) : null,
      unit_price_per_kg: unitPricePerKg ? parseFloat(unitPricePerKg) : 0,
      price_includes_vat: priceIncludesVat,
      vat_rate: vatRate ? parseFloat(vatRate) : 20,
    };

    try {
      if (editingSeed) {
        const { error } = await updateSeed(editingSeed.id, seedData);
        if (error) throw error;
        toast({ title: 'Aktualizované', description: 'Osivo bolo aktualizované.' });
      } else {
        const { error } = await addSeed(seedData);
        if (error) throw error;
        toast({ title: 'Pridané', description: 'Osivo bolo pridané do skladu.' });
      }
      setIsDialogOpen(false);
      resetForm();
      await refetch();
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa uložiť.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const { error } = await updateSeed(id, { archived: true } as any);
      if (error) throw error;
      toast({ title: 'Archivované', description: 'Osivo bolo presunuté do archívu.' });
      setArchiveDialogId(null);
      await refetch();
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa archivovať.', variant: 'destructive' });
    }
  };

  const handleUnarchive = async (id: string) => {
    try {
      const { error } = await updateSeed(id, { archived: false } as any);
      if (error) throw error;
      toast({ title: 'Obnovené', description: 'Osivo bolo obnovené.' });
      await refetch();
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa obnoviť.', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await deleteSeed(id);
      if (error) throw error;
      toast({ title: 'Zmazané', description: 'Osivo bolo natrvalo zmazané.' });
      setDeleteId(null);
      await refetch();
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa zmazať.', variant: 'destructive' });
    }
  };

  return (
    <>
      {/* Low stock banner */}
      <LowStockBanner count={lowStockSeeds.length} label="položka osiva" />

      {/* Filters & summary */}
      <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-3 md:p-4 mb-4 space-y-3">
        {/* Archive switcher */}
        <div className="flex items-center gap-2">
          {(['current', 'archived'] as ArchiveFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setArchiveFilter(f)}
              className={cn(
                'h-8 px-3 rounded-full text-xs font-semibold border transition-colors',
                archiveFilter === f
                  ? 'bg-[#16a34a] border-[#16a34a] text-white'
                  : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a]'
              )}
            >
              {f === 'current' ? 'Aktuálne zásoby' : 'Archív'}
            </button>
          ))}
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setCategoryFilter('all'); setCropFilter('all'); }}
            className={cn(
              'h-8 px-3 rounded-full text-xs font-semibold border transition-colors',
              categoryFilter === 'all'
                ? 'bg-[#0f172a] border-[#0f172a] text-white'
                : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1] hover:text-[#0f172a]'
            )}
          >
            Všetky kategórie
          </button>
          {Object.entries(SEED_CATEGORY_LABELS).map(([key, cat]) => {
            const CatIcon = cat.icon;
            const active = categoryFilter === key;
            return (
              <button
                key={key}
                onClick={() => { setCategoryFilter(key as SeedCategoryFilter); setCropFilter('all'); }}
                className={cn(
                  'h-8 px-3 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5',
                  active
                    ? 'bg-[#16a34a] border-[#16a34a] text-white'
                    : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a]'
                )}
              >
                <CatIcon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Crop filter + search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select value={cropFilter} onValueChange={setCropFilter}>
            <SelectTrigger className="h-9 text-sm border-[#e2e8f0]">
              <SelectValue placeholder="Filtruj podľa plodiny" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všetky plodiny</SelectItem>
              {availableCrops.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94a3b8]" />
            <Input
              type="text"
              placeholder="Hľadať plodinu, šaržu, poznámku..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-sm border-[#e2e8f0]"
            />
          </div>
        </div>
      </div>

      {/* Summary by crop */}
      {seedTotalsByCrop.length > 0 && (
        <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-3 md:p-4 mb-4">
          <h3 className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
            <Wheat className="h-4 w-4 text-[#16a34a]" />
            Súhrn zásob po plodinách
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {seedTotalsByCrop.map(t => (
              <div key={t.cropId} className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-2.5 flex items-center gap-2">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border"
                  style={{ backgroundColor: `${t.cropColor}15`, borderColor: `${t.cropColor}30` }}
                >
                  <Sprout className="h-3.5 w-3.5" style={{ color: t.cropColor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0f172a] truncate">{t.cropName}</p>
                  <p className="text-[11px] text-[#475569]">
                    {t.totalKg > 0 && <span className="font-bold text-[#0f172a]">{formatKg(t.totalKg)}</span>}
                    {t.totalKg > 0 && t.totalG > 0 && ' + '}
                    {t.totalG > 0 && <span className="font-bold text-[#0f172a]">{formatNumber(Math.round(t.totalG))} g</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seeds grid */}
      {filteredSeeds.length === 0 ? (
        <EmptyTabState
          icon={Sprout}
          title={archiveFilter === 'archived' ? 'Žiadne archivované osivo' : 'Žiadne osivo v sklade'}
          description={archiveFilter === 'archived' ? 'Archivované položky sa zobrazia tu po archivácii.' : 'Pridaj prvé osivo do skladu.'}
          onAdd={archiveFilter === 'current' && isAdmin ? openAddDialog : undefined}
          addLabel="Pridať osivo"
        />
      ) : (
        <div className="space-y-3">
          {/* Zoskupenie šarží podľa plodiny — 1 karta per plodina, klikom rozbalíme šarže. */}
          {(() => {
            // Zoskup podľa crop_id, zachovaj zoradenie z filteredSeeds
            const groups = new Map<string, DbSeed[]>();
            filteredSeeds.forEach(s => {
              const k = s.crop_id || '__unknown__';
              if (!groups.has(k)) groups.set(k, []);
              groups.get(k)!.push(s);
            });

            return Array.from(groups.entries()).map(([cropKey, seedsInGroup]) => {
              const firstSeed = seedsInGroup[0];
              const crop = crops.find(c => c.id === firstSeed.crop_id);
              const cropColor = crop?.color || '#16a34a';
              const isExpanded = expandedCropIds.has(cropKey);

              // Súčet množstva v rovnakej jednotke — ak sú miešané (kg + g), prevedieme na g
              const allKg = seedsInGroup.every(s => s.unit === 'kg');
              const allG = seedsInGroup.every(s => s.unit === 'g');
              let totalLabel: string;
              if (allKg) {
                const total = seedsInGroup.reduce((sum, s) => sum + (s.quantity || 0), 0);
                totalLabel = formatKg(total);
              } else if (allG) {
                const total = seedsInGroup.reduce((sum, s) => sum + (s.quantity || 0), 0);
                totalLabel = `${formatNumber(Math.round(total))} g`;
              } else {
                // Miešané jednotky — preveď všetko na g
                const totalG = seedsInGroup.reduce((sum, s) => {
                  return sum + (s.quantity || 0) * (s.unit === 'kg' ? 1000 : 1);
                }, 0);
                totalLabel = totalG >= 1000 ? formatKg(totalG / 1000) : `${formatNumber(Math.round(totalG))} g`;
              }

              // Min stock súčet (rovnakou logikou)
              const minTotalKg = seedsInGroup.reduce((sum, s) => {
                const min = (s as any).min_stock;
                if (min == null) return sum;
                return sum + min * (s.unit === 'kg' ? 1 : 0.001);
              }, 0);
              const currentKg = seedsInGroup.reduce((sum, s) => sum + (s.quantity || 0) * (s.unit === 'kg' ? 1 : 0.001), 0);
              const low = minTotalKg > 0 && currentKg < minTotalKg;
              const anyArchived = seedsInGroup.every(s => (s as any).archived === true);

              return (
                <div
                  key={cropKey}
                  className={cn(
                    'bg-white rounded-xl border shadow-sm overflow-hidden transition-all',
                    low ? 'border-[#fecaca]' : 'border-[#cbd5e1] hover:border-[#bbf7d0]',
                    anyArchived && 'opacity-70'
                  )}
                >
                  {/* Header — toggle + akcie */}
                  <div className="w-full p-4 flex items-center gap-3">
                    <button
                      onClick={() => {
                        setExpandedCropIds(prev => {
                          const next = new Set(prev);
                          if (next.has(cropKey)) next.delete(cropKey); else next.add(cropKey);
                          return next;
                        });
                      }}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                    >
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border"
                        style={{ backgroundColor: `${cropColor}15`, borderColor: `${cropColor}30` }}
                      >
                        <Sprout className="h-5 w-5" style={{ color: cropColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#0f172a] truncate">{crop?.name || 'Neznáma'}</h3>
                          {low && (
                            <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#fef2f2] text-[#dc2626] text-[10px] font-bold flex-shrink-0">
                              NÍZKE ZÁSOBY
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="text-[#475569]">Spolu: <span className="font-bold text-[#16a34a]">{totalLabel}</span></span>
                          <span className="text-[#475569]">·</span>
                          <span className="text-[#475569]">
                            <span className="font-semibold text-[#0f172a]">{seedsInGroup.length}</span>{' '}
                            {seedsInGroup.length === 1 ? 'šarža' : seedsInGroup.length >= 2 && seedsInGroup.length <= 4 ? 'šarže' : 'šarží'}
                          </span>
                        </div>
                      </div>
                    </button>
                    {isAdmin && !anyArchived && (
                      <button
                        onClick={() => openAddForCrop(crop, seedsInGroup[0])}
                        title="Naskladniť novú šaržu"
                        className="flex-shrink-0 h-9 px-3 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <PackagePlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Naskladniť</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setExpandedCropIds(prev => {
                          const next = new Set(prev);
                          if (next.has(cropKey)) next.delete(cropKey); else next.add(cropKey);
                          return next;
                        });
                      }}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#94a3b8] hover:text-[#475569] transition-colors"
                      aria-label={isExpanded ? 'Zbaliť' : 'Rozbaliť'}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Šarže — rozbalený zoznam */}
                  {isExpanded && (
                    <div className="border-t border-[#e2e8f0] divide-y divide-[#e2e8f0]">
                      {seedsInGroup.map(seed => {
                        const isArchived = (seed as any).archived === true;
                        const lotNum = (seed as any).lot_number;
                        const expiry = (seed as any).expiry_date;
                        const certUrl = (seed as any).certificate_url;
                        return (
                          <div
                            key={seed.id}
                            onClick={() => setSelectedSeed(seed)}
                            className={cn(
                              'px-4 py-3 hover:bg-[#f8fafc] transition-colors cursor-pointer',
                              isArchived && 'opacity-70'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0 space-y-1">
                                {/* Riadok 1: množstvo + šarža */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-base font-bold text-[#16a34a]">
                                    {seed.unit === 'kg' ? formatKg(seed.quantity) : `${formatNumber(seed.quantity)} ${seed.unit}`}
                                  </span>
                                  {lotNum && (
                                    <span className="inline-flex items-center h-6 px-2 rounded-full bg-[#f1f5f9] font-mono text-xs text-[#475569]">
                                      Šarža: {lotNum}
                                    </span>
                                  )}
                                  {isArchived && (
                                    <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#f1f5f9] text-[#94a3b8] text-[10px] font-bold">
                                      ARCHIVOVANÉ
                                    </span>
                                  )}
                                </div>
                                {/* Riadok 2: dátumy */}
                                <div className="flex items-center gap-3 flex-wrap text-sm text-[#475569]">
                                  {(seed as any).purchase_date && (
                                    <span>Nákup: <span className="text-[#0f172a] font-semibold">{formatDate((seed as any).purchase_date)}</span></span>
                                  )}
                                  {(seed as any).consumption_start_date && (
                                    <span>Začiatok: <span className="text-[#0f172a] font-semibold">{formatDate((seed as any).consumption_start_date)}</span></span>
                                  )}
                                  {expiry && (
                                    <span>Expirácia: <span className="text-[#0f172a] font-semibold">{formatExpiryMonthYear(expiry)}</span></span>
                                  )}
                                </div>
                                {certUrl && (
                                  <a
                                    href={certUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-[11px] text-[#16a34a] hover:underline"
                                  >
                                    <FileText className="h-3 w-3" />
                                    Certifikát
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </div>

                              {/* Actions per šarža */}
                              <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                {isAdmin && !isArchived && (
                                  <button
                                    onClick={() => openStocktake(seed)}
                                    title="Inventúra"
                                    className="w-8 h-8 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#2563eb] hover:text-[#2563eb] transition-colors"
                                  >
                                    <ClipboardCheck className="h-4 w-4" />
                                  </button>
                                )}
                                {isAdmin && !isArchived && (
                                  <button
                                    onClick={() => openEditDialog(seed)}
                                    title="Upraviť"
                                    className="w-8 h-8 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                )}
                                {isAdmin && !isArchived && (
                                  <button
                                    onClick={() => setArchiveDialogId(seed.id)}
                                    title="Archivovať"
                                    className="w-8 h-8 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                                  >
                                    <Archive className="h-4 w-4" />
                                  </button>
                                )}
                                {isAdmin && isArchived && (
                                  <button
                                    onClick={() => handleUnarchive(seed.id)}
                                    title="Obnoviť"
                                    className="w-7 h-7 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                                  >
                                    <Undo2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {isAdmin && isArchived && (
                                  <button
                                    onClick={() => setDeleteId(seed.id)}
                                    title="Zmazať natrvalo"
                                    className="w-7 h-7 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">{editingSeed ? 'Upraviť osivo' : 'Pridať nové osivo'}</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {editingSeed ? 'Uprav údaje o osive.' : 'Vyplň základné údaje o nákupe osiva.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Kategória */}
            <div>
              <Label className="text-sm font-semibold text-[#374151]">Kategória *</Label>
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                {Object.entries(SEED_CATEGORY_LABELS).map(([key, cat]) => {
                  const CatIcon = cat.icon;
                  const active = selectedCategory === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setSelectedCategory(key as any); setCropId(''); }}
                      className={cn(
                        'h-9 rounded-md text-[11px] font-semibold flex flex-col items-center justify-center gap-0.5 border transition-colors',
                        active
                          ? 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]'
                          : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0]'
                      )}
                    >
                      <CatIcon className="h-3.5 w-3.5" />
                      <span className="leading-none">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Plodina */}
            <div>
              <Label htmlFor="seed-crop" className="text-sm font-semibold text-[#374151]">Plodina *</Label>
              <Select value={cropId} onValueChange={setCropId}>
                <SelectTrigger id="seed-crop" className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]">
                  <SelectValue placeholder="Vyber plodinu" />
                </SelectTrigger>
                <SelectContent>
                  {crops.filter(c => c.category === selectedCategory).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Množstvo + jednotka */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label htmlFor="seed-qty" className="text-sm font-semibold text-[#374151]">Množstvo *</Label>
                <Input
                  id="seed-qty"
                  type="number"
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Jednotka</Label>
                <Select value={quantityUnit} onValueChange={(v) => setQuantityUnit(v as 'kg' | 'g')}>
                  <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Min limit + cena */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Min. limit ({quantityUnit})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Cena/kg (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPricePerKg}
                  onChange={(e) => setUnitPricePerKg(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            {/* VAT */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer mt-5">
                <input
                  type="checkbox"
                  checked={priceIncludesVat}
                  onChange={(e) => setPriceIncludesVat(e.target.checked)}
                  className="h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-[#0f172a]">Cena s DPH</span>
              </label>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">DPH (%)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            {/* Dodávateľ + šarža */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Dodávateľ</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue placeholder="Vyber dodávateľa" /></SelectTrigger>
                  <SelectContent>
                    {suppliersList.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Číslo šarže</Label>
                <Input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            {/* Dátumy */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Expirácia (mesiac/rok)</Label>
                <Input
                  type="month"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Dátum naskladnenia</Label>
                <Input
                  type="date"
                  value={stockingDate}
                  onChange={(e) => setStockingDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            {/* Dátumy spotreby */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Začiatok spotreby</Label>
                <Input
                  type="date"
                  value={consumptionStartDate}
                  onChange={(e) => setConsumptionStartDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Koniec spotreby</Label>
                <Input
                  type="date"
                  value={consumptionEndDate}
                  onChange={(e) => setConsumptionEndDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            {/* Certifikát */}
            <div>
              <Label className="text-sm font-semibold text-[#374151]">Certifikát (voliteľné)</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-3 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:border-[#bbf7d0] hover:text-[#16a34a] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Nahrať
                </button>
                {certificateFile && (
                  <span className="text-xs text-[#0f172a] truncate flex-1">{certificateFile.name}</span>
                )}
                {!certificateFile && certificateUrl && (
                  <a href={certificateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#16a34a] hover:underline truncate flex-1">
                    Existujúci certifikát
                  </a>
                )}
                {(certificateFile || certificateUrl) && (
                  <button
                    type="button"
                    onClick={() => { setCertificateFile(null); setCertificateUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="h-7 w-7 rounded-md border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:text-[#dc2626]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Poznámka */}
            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2 flex-row justify-end">
              <button
                type="button"
                onClick={() => { setIsDialogOpen(false); resetForm(); }}
                disabled={saving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={saving || !cropId || !quantity}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingSeed ? 'Uložiť' : 'Pridať'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive confirm */}
      <AlertDialog open={archiveDialogId !== null} onOpenChange={(open) => { if (!open) setArchiveDialogId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivovať osivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Osivo bude presunuté do archívu. Môžeš ho obnoviť kedykoľvek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveDialogId && handleArchive(archiveDialogId)}
              className="bg-[#16a34a] text-white hover:bg-[#15803d]"
            >
              Archivovať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Natrvalo zmazať osivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Záznam bude úplne odstránený z databázy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              Zmazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail dialog — zobrazí všetky polia osiva pri kliknutí na šaržu */}
      <Dialog open={selectedSeed !== null} onOpenChange={(open) => { if (!open) setSelectedSeed(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedSeed && (() => {
            const crop = crops.find(c => c.id === selectedSeed.crop_id);
            const cropColor = crop?.color || '#16a34a';
            const isArchived = (selectedSeed as any).archived === true;
            const lotNum = (selectedSeed as any).lot_number;
            const expiry = (selectedSeed as any).expiry_date;
            const certUrl = (selectedSeed as any).certificate_url;
            const pricePerKg = (selectedSeed as any).unit_price_per_kg;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={{ backgroundColor: `${cropColor}15`, borderColor: `${cropColor}30` }}
                    >
                      <Sprout className="h-5 w-5" style={{ color: cropColor }} />
                    </div>
                    <div>
                      <DialogTitle className="text-base font-bold text-[#0f172a]">{crop?.name || 'Neznáma'}</DialogTitle>
                      <p className="text-xs text-[#475569]">Detail šarže</p>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-3 pt-2">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg">
                      <span className="text-[#475569] font-semibold">Množstvo:</span>
                      <span className="font-bold text-[#16a34a] text-base">
                        {selectedSeed.unit === 'kg' ? formatKg(selectedSeed.quantity) : `${formatNumber(selectedSeed.quantity)} ${selectedSeed.unit}`}
                      </span>
                    </div>
                    {(selectedSeed as any).min_stock != null && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#475569]">Minimálny limit:</span>
                        <span className="text-[#0f172a] font-semibold">
                          {selectedSeed.unit === 'kg' ? formatKg((selectedSeed as any).min_stock) : `${formatNumber((selectedSeed as any).min_stock)} ${selectedSeed.unit}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#e2e8f0] pt-3 space-y-1.5 text-xs">
                    {lotNum && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#475569]">Číslo šarže:</span>
                        <span className="font-mono text-[#0f172a]">{lotNum}</span>
                      </div>
                    )}
                    {(selectedSeed as any).purchase_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#475569]">Dátum nákupu:</span>
                        <span className="text-[#0f172a]">{formatDate((selectedSeed as any).purchase_date)}</span>
                      </div>
                    )}
                    {expiry && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#475569]">Expirácia:</span>
                        <span className="text-[#0f172a] font-semibold">{formatExpiryMonthYear(expiry)}</span>
                      </div>
                    )}
                    {(selectedSeed as any).consumption_start_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#475569]">Začiatok spotreby:</span>
                        <span className="text-[#0f172a]">{formatDate((selectedSeed as any).consumption_start_date)}</span>
                      </div>
                    )}
                    {(selectedSeed as any).consumption_end_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#475569]">Koniec spotreby:</span>
                        <span className="text-[#0f172a]">{formatDate((selectedSeed as any).consumption_end_date)}</span>
                      </div>
                    )}
                  </div>

                  {(selectedSeed.supplier_id || pricePerKg > 0) && (
                    <div className="border-t border-[#e2e8f0] pt-3 space-y-1.5 text-xs">
                      {selectedSeed.supplier_id && (
                        <div className="flex items-center justify-between">
                          <span className="text-[#475569]">Dodávateľ:</span>
                          <span className="text-[#0f172a] font-semibold">{getSupplierName(selectedSeed.supplier_id)}</span>
                        </div>
                      )}
                      {pricePerKg > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[#475569]">Cena za kg:</span>
                          <span className="text-[#0f172a] font-semibold">{formatEur(pricePerKg)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {certUrl && (
                    <div className="border-t border-[#e2e8f0] pt-3">
                      <a
                        href={certUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#16a34a] hover:underline font-semibold"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Otvoriť certifikát
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {selectedSeed.notes && (
                    <div className="border-t border-[#e2e8f0] pt-3">
                      <p className="text-[10px] uppercase tracking-wide font-bold text-[#475569] mb-1">Poznámka</p>
                      <p className="text-xs text-[#0f172a] whitespace-pre-wrap">{selectedSeed.notes}</p>
                    </div>
                  )}

                  {isAdmin && !isArchived && (
                    <div className="border-t border-[#e2e8f0] pt-3 space-y-2">
                      <button
                        onClick={() => { openReceipt(selectedSeed); setSelectedSeed(null); }}
                        className="w-full h-9 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <PackagePlus className="h-4 w-4" />
                        Naskladniť
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { openStocktake(selectedSeed); setSelectedSeed(null); }}
                          className="flex-1 h-9 rounded-lg border border-[#cbd5e1] text-[#2563eb] hover:bg-[#eff6ff] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                          Inventúra
                        </button>
                        <button
                          onClick={() => { openHistory(selectedSeed); setSelectedSeed(null); }}
                          className="flex-1 h-9 rounded-lg border border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <History className="h-4 w-4" />
                          História
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedSeed(null);
                            openEditDialog(selectedSeed);
                          }}
                          className="flex-1 h-9 px-3 rounded-lg border border-[#e2e8f0] text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Upraviť
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSeed(null);
                            setArchiveDialogId(selectedSeed.id);
                          }}
                          className="flex-1 h-9 px-3 rounded-lg border border-[#e2e8f0] text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          Archivovať
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ===== Naskladniť (osivo) ===== */}
      <Dialog open={receiptFor !== null} onOpenChange={(open) => { if (!open) setReceiptFor(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">Naskladniť osivo</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {receiptFor ? (crops.find(c => c.id === receiptFor.crop_id)?.name || 'Osivo') : ''}
              {receiptFor && (receiptFor as any).lot_number ? ` · šarža ${(receiptFor as any).lot_number}` : ''}
              {receiptFor ? ` — aktuálne ${fmtSeed(receiptFor.quantity, receiptFor.unit)}` : ''}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceipt} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Množstvo ({receiptFor?.unit || 'kg'}) *</Label>
                <Input
                  type="number" min="0" step="0.001" autoFocus
                  value={rcvQty}
                  onChange={(e) => setRcvQty(e.target.value)}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Dátum</Label>
                <Input
                  type="date"
                  value={rcvDate}
                  onChange={(e) => setRcvDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Cena/kg (€)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={rcvPrice}
                onChange={(e) => setRcvPrice(e.target.value)}
                placeholder="voliteľné"
                className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={rcvNotes}
                onChange={(e) => setRcvNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => setReceiptFor(null)}
                disabled={rcvSaving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={rcvSaving || !rcvQty}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {rcvSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <PackagePlus className="h-4 w-4" /> Naskladniť
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Inventúra (osivo) ===== */}
      <Dialog open={stocktakeFor !== null} onOpenChange={(open) => { if (!open) setStocktakeFor(null); }}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">Inventúra</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {stocktakeFor ? (crops.find(c => c.id === stocktakeFor.crop_id)?.name || 'Osivo') : ''}
              {stocktakeFor && (stocktakeFor as any).lot_number ? ` · šarža ${(stocktakeFor as any).lot_number}` : ''}
              {stocktakeFor ? ` — systém eviduje ${fmtSeed(stocktakeFor.quantity, stocktakeFor.unit)}` : ''}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStocktake} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Napočítaný stav ({seedStkUnit}) *</Label>
                <Input
                  type="number" min="0" step="0.001" autoFocus
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Dátum</Label>
                <Input
                  type="date"
                  value={stkDate}
                  onChange={(e) => setStkDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            {seedCountedDiff !== null && seedCountedDiff !== 0 && (
              <div className={cn(
                'text-xs font-semibold rounded-lg px-3 py-2 border',
                seedCountedDiff > 0 ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]' : 'bg-[#fef2f2] border-[#fecaca] text-[#dc2626]'
              )}>
                Rozdiel oproti systému: {seedCountedDiff > 0 ? '+' : ''}{formatNumber(seedCountedDiff, 3)} {seedStkUnit}
              </div>
            )}

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={stkNotes}
                onChange={(e) => setStkNotes(e.target.value)}
                rows={2}
                placeholder="napr. dôvod rozdielu"
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => setStocktakeFor(null)}
                disabled={stkSaving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={stkSaving || counted === ''}
                className="h-9 px-4 rounded-md bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {stkSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <ClipboardCheck className="h-4 w-4" /> Uložiť inventúru
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== História pohybov (osivo) ===== */}
      <Dialog open={historyFor !== null} onOpenChange={(open) => { if (!open) { setHistoryFor(null); setMovements([]); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">História pohybov</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {historyFor ? (crops.find(c => c.id === historyFor.crop_id)?.name || 'Osivo') : ''}
              {historyFor && (historyFor as any).lot_number ? ` · šarža ${(historyFor as any).lot_number}` : ''}
              {historyFor ? ` — aktuálne ${fmtSeed(historyFor.quantity, historyFor.unit)}` : ''}
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="py-8 text-center text-sm text-[#64748b]">Načítavam…</div>
          ) : movements.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#64748b]">Zatiaľ žiadne pohyby.</div>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold',
                        m.movement_type === 'receipt' ? 'bg-[#dcfce7] text-[#166534]'
                          : m.movement_type === 'consumption' ? 'bg-[#fef2f2] text-[#dc2626]'
                          : 'bg-[#dbeafe] text-[#1e40af]'
                      )}>
                        {SEED_MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      </span>
                      <span className="text-[11px] text-[#64748b]">{formatDate(m.occurred_on)}</span>
                    </div>
                    {m.notes && <p className="text-[11px] text-[#475569] mt-0.5 truncate">{m.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={cn('text-sm font-bold', m.quantity_delta >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]')}>
                      {m.quantity_delta > 0 ? '+' : ''}{formatNumber(m.quantity_delta, 3)} {seedHistUnit}
                    </div>
                    {m.balance_after != null && (
                      <div className="text-[10px] text-[#64748b]">stav: {formatNumber(m.balance_after, 3)} {seedHistUnit}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => { setHistoryFor(null); setMovements([]); }}
              className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors"
            >
              Zavrieť
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};


// ===================== PACKAGING TAB =====================

const PackagingTab = ({ isAdmin, isMobile, toast, getSupplierName }: TabProps) => {
  const { data: packagings, add, update, remove, refetch } = usePackagings();
  const { data: suppliersList } = useSuppliers();

  const today = () => new Date().toISOString().split('T')[0];

  // --- Definícia typu (Pridať/Upraviť) — BEZ množstva, množstvo sa rieši cez Naskladniť/Inventúru ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState<DbPackaging | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<string>('');
  const [packagingType, setPackagingType] = useState<string>('');
  const [size, setSize] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [minStock, setMinStock] = useState('');
  const [pricePerPiece, setPricePerPiece] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [notes, setNotes] = useState('');

  // --- Naskladniť (várka) ---
  const [receiptFor, setReceiptFor] = useState<DbPackaging | null>(null);
  const [rcvQty, setRcvQty] = useState('');
  const [rcvDate, setRcvDate] = useState(today());
  const [rcvPrice, setRcvPrice] = useState('');
  const [rcvSupplier, setRcvSupplier] = useState('');
  const [rcvBatch, setRcvBatch] = useState('');
  const [rcvNotes, setRcvNotes] = useState('');
  const [rcvSaving, setRcvSaving] = useState(false);

  // --- Inventúra ---
  const [stocktakeFor, setStocktakeFor] = useState<DbPackaging | null>(null);
  const [counted, setCounted] = useState('');
  const [stkDate, setStkDate] = useState(today());
  const [stkNotes, setStkNotes] = useState('');
  const [stkSaving, setStkSaving] = useState(false);

  // --- História pohybov ---
  const [historyFor, setHistoryFor] = useState<DbPackaging | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Listen for header "+" event
  useEffect(() => {
    const handler = () => openAddDialog();
    window.addEventListener('inventory-add', handler);
    return () => window.removeEventListener('inventory-add', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingPackaging(null);
    setType('');
    setPackagingType('');
    setSize('');
    setSupplierId('');
    setMinStock('');
    setPricePerPiece('');
    setPriceIncludesVat(true);
    setVatRate('20');
    setNotes('');
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (p: DbPackaging) => {
    setEditingPackaging(p);
    setType(p.type || '');
    setPackagingType((p as any).packaging_type || '');
    setSize(p.size || '');
    setSupplierId(p.supplier_id || '');
    setMinStock((p as any).min_stock?.toString() || '');
    setPricePerPiece((p as any).price_per_piece?.toString() || '');
    setPriceIncludesVat((p as any).price_includes_vat ?? true);
    setVatRate((p as any).vat_rate?.toString() || '20');
    setNotes(p.notes || '');
    setIsDialogOpen(true);
  };

  // Názov typu sa neukladá ručne — odvodíme ho z veľkosti + materiálu (napr. "750ml rPET")
  const buildName = () =>
    [size, packagingType].map(s => (s || '').trim()).filter(Boolean).join(' ') || 'Obal';

  // Sort by size
  const sortedPackagings = useMemo(() => {
    return [...packagings].sort((a, b) => {
      const aIdx = PACKAGING_SIZES.indexOf((a.size || '') as any);
      const bIdx = PACKAGING_SIZES.indexOf((b.size || '') as any);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [packagings]);

  // Summary by volume
  const volumeSummary = useMemo(() => {
    const acc: Record<string, number> = {};
    PACKAGING_SIZES.forEach(s => { acc[s] = 0; });
    packagings.forEach(p => {
      if (p.size && PACKAGING_SIZES.includes(p.size as any)) {
        acc[p.size] = (acc[p.size] || 0) + (p.quantity || 0);
      }
    });
    return acc;
  }, [packagings]);

  const lowStockItems = useMemo(() =>
    packagings.filter(p => isLowStock(p.quantity, (p as any).min_stock)),
    [packagings]
  );

  // Uloženie DEFINÍCIE typu — množstvo sa tu NEMENÍ (rieši Naskladniť/Inventúra)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!size) {
      toast({ title: 'Chyba', description: 'Vyber veľkosť obalu.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const data: any = {
      name: buildName(),
      type: type || null,
      packaging_type: packagingType || null,
      size: size || null,
      supplier_id: supplierId || null,
      notes: notes || null,
      min_stock: minStock ? parseInt(minStock) : null,
      price_per_piece: pricePerPiece ? parseFloat(pricePerPiece) : 0,
      price_includes_vat: priceIncludesVat,
      vat_rate: vatRate ? parseFloat(vatRate) : 20,
    };

    try {
      if (editingPackaging) {
        // EDIT = len definícia, množstvo necháme nedotknuté
        const { error } = await update(editingPackaging.id, data);
        if (error) throw error;
        toast({ title: 'Aktualizované', description: 'Typ obalu bol upravený.' });
      } else {
        // NOVÝ typ začína na 0 ks — sklad sa dopĺňa cez „Naskladniť"
        const { error } = await add({ ...data, quantity: 0 });
        if (error) throw error;
        toast({ title: 'Pridané', description: 'Nový typ obalu vytvorený. Sklad doplň cez „Naskladniť".' });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa uložiť.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await remove(id);
      if (error) throw error;
      toast({ title: 'Zmazané', description: 'Typ obalu bol odstránený.' });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa zmazať.', variant: 'destructive' });
    }
  };

  // --- Naskladniť ---
  const openReceipt = (p: DbPackaging) => {
    setReceiptFor(p);
    setRcvQty('');
    setRcvDate(today());
    setRcvPrice('');
    setRcvSupplier(p.supplier_id || '');
    setRcvBatch('');
    setRcvNotes('');
  };

  const handleReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFor) return;
    const qty = parseInt(rcvQty);
    if (!rcvQty || isNaN(qty) || qty <= 0) {
      toast({ title: 'Chyba', description: 'Zadaj kladný počet kusov.', variant: 'destructive' });
      return;
    }
    setRcvSaving(true);
    try {
      const { error } = await supabase.rpc('add_packaging_receipt', {
        p_packaging_id: receiptFor.id,
        p_quantity: qty,
        p_occurred_on: rcvDate || today(),
        p_unit_price: rcvPrice ? parseFloat(rcvPrice) : null,
        p_supplier_id: rcvSupplier || null,
        p_batch: rcvBatch || null,
        p_notes: rcvNotes || null,
      });
      if (error) throw error;
      await refetch();
      toast({ title: 'Naskladnené', description: `Pridaných ${qty} ks.` });
      setReceiptFor(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Naskladnenie sa nepodarilo.', variant: 'destructive' });
    } finally {
      setRcvSaving(false);
    }
  };

  // --- Inventúra ---
  const openStocktake = (p: DbPackaging) => {
    setStocktakeFor(p);
    setCounted('');
    setStkDate(today());
    setStkNotes('');
  };

  const handleStocktake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stocktakeFor) return;
    const cnt = parseInt(counted);
    if (counted === '' || isNaN(cnt) || cnt < 0) {
      toast({ title: 'Chyba', description: 'Zadaj napočítaný stav (0 alebo viac).', variant: 'destructive' });
      return;
    }
    setStkSaving(true);
    try {
      const { error } = await supabase.rpc('set_packaging_stocktake', {
        p_packaging_id: stocktakeFor.id,
        p_counted: cnt,
        p_occurred_on: stkDate || today(),
        p_notes: stkNotes || null,
      });
      if (error) throw error;
      await refetch();
      toast({ title: 'Inventúra uložená', description: 'Stav bol upravený podľa napočítaného.' });
      setStocktakeFor(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Inventúra sa nepodarila.', variant: 'destructive' });
    } finally {
      setStkSaving(false);
    }
  };

  // --- História pohybov ---
  const openHistory = async (p: DbPackaging) => {
    setHistoryFor(p);
    setLoadingHistory(true);
    setMovements([]);
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('item_kind', 'packaging')
        .eq('item_id', p.id)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setMovements(data || []);
    } catch (err: any) {
      toast({ title: 'Chyba', description: 'Nepodarilo sa načítať históriu.', variant: 'destructive' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const MOVEMENT_LABELS: Record<string, string> = {
    receipt: 'Naskladnenie',
    consumption: 'Spotreba',
    adjustment: 'Inventúra',
  };

  const countedDiff = stocktakeFor && counted !== '' && !isNaN(parseInt(counted))
    ? parseInt(counted) - (stocktakeFor.quantity || 0)
    : null;

  return (
    <>
      <LowStockBanner count={lowStockItems.length} label="obal" />

      {/* Volume summary */}
      <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-3 md:p-4 mb-4">
        <h3 className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-[#16a34a]" />
          Súhrn zásob podľa objemu
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {PACKAGING_SIZES.map(s => (
            <div key={s} className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">{s}</p>
              <p className="text-base font-bold text-[#0f172a]">
                {formatNumber(volumeSummary[s])} <span className="text-xs font-normal text-[#475569]">ks</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Packagings grid */}
      {sortedPackagings.length === 0 ? (
        <EmptyTabState
          icon={Package}
          title="Žiadne typy obalov"
          description="Vytvor prvý typ obalu. Sklad doplníš cez Naskladniť."
          onAdd={isAdmin ? openAddDialog : undefined}
          addLabel="Pridať typ obalu"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedPackagings.map(p => {
            const low = isLowStock(p.quantity, (p as any).min_stock);
            const pricePerPiece = (p as any).price_per_piece;
            return (
              <div
                key={p.id}
                className={cn(
                  'bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md',
                  low ? 'border-[#fecaca]' : 'border-[#cbd5e1] hover:border-[#bbf7d0]'
                )}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[#f0fdf4] border border-[#bbf7d0]">
                    <Package className="h-5 w-5 text-[#16a34a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[#0f172a] truncate">{p.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.size && (
                        <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#dbeafe] text-[#1e40af] text-[10px] font-bold">
                          {p.size}
                        </span>
                      )}
                      {low && (
                        <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#fef2f2] text-[#dc2626] text-[10px] font-bold">
                          NÍZKE ZÁSOBY
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#475569]">Na sklade:</span>
                    <span className="font-bold text-[#16a34a]">{formatNumber(p.quantity)} ks</span>
                  </div>
                  {(p as any).min_stock && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Min. limit:</span>
                      <span className="text-[#0f172a]">{formatNumber((p as any).min_stock)} ks</span>
                    </div>
                  )}
                  {p.type && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Forma:</span>
                      <span className="text-[#0f172a] truncate ml-2">{p.type}</span>
                    </div>
                  )}
                  {(p as any).packaging_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Materiál:</span>
                      <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#dcfce7] text-[#166534] text-[10px] font-bold">
                        {(p as any).packaging_type}
                      </span>
                    </div>
                  )}
                  {pricePerPiece > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Cena/ks:</span>
                      <span className="text-[#0f172a]">{formatEur(pricePerPiece)}</span>
                    </div>
                  )}
                  {p.supplier_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Dodávateľ:</span>
                      <span className="text-[#0f172a] truncate ml-2">{getSupplierName(p.supplier_id)}</span>
                    </div>
                  )}
                </div>

                {p.notes && (
                  <div className="flex items-start gap-1.5 mt-2 text-xs text-[#475569]">
                    <StickyNote className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{p.notes}</span>
                  </div>
                )}

                <div className="pt-3 mt-3 border-t border-[#e2e8f0] space-y-2">
                  {isAdmin && (
                    <button
                      onClick={() => openReceipt(p)}
                      className="w-full h-9 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <PackagePlus className="h-4 w-4" /> Naskladniť
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => openStocktake(p)}
                        className="flex-1 h-9 rounded-lg border border-[#cbd5e1] text-[#2563eb] hover:bg-[#eff6ff] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ClipboardCheck className="h-4 w-4" /> Inventúra
                      </button>
                    )}
                    <button
                      onClick={() => openHistory(p)}
                      className="flex-1 h-9 rounded-lg border border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <History className="h-4 w-4" /> História
                    </button>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditDialog(p)}
                        className="flex-1 h-9 rounded-lg border border-[#e2e8f0] text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Upraviť
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="flex-1 h-9 rounded-lg border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Zmazať
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Definícia typu (Add/Edit) — bez množstva a názvu ===== */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">{editingPackaging ? 'Upraviť typ obalu' : 'Nový typ obalu'}</DialogTitle>
            <DialogDescription className="text-[#475569]">
              Definuj typ obalu. Množstvo na sklade sa nemení tu — rieši ho „Naskladniť" a „Inventúra".
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Forma</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue placeholder="Vyber formu" /></SelectTrigger>
                  <SelectContent>
                    {PACKAGING_KINDS.map(k => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Veľkosť (objem) *</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue placeholder="Vyber veľkosť" /></SelectTrigger>
                  <SelectContent>
                    {PACKAGING_SIZES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Typ obalu (materiál)</Label>
              <Select value={packagingType} onValueChange={setPackagingType}>
                <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue placeholder="Vyber materiál" /></SelectTrigger>
                <SelectContent>
                  {PACKAGING_MATERIALS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Min. limit (ks)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="napr. 150"
                className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Cena/ks (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricePerPiece}
                  onChange={(e) => setPricePerPiece(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">DPH (%)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={priceIncludesVat}
                onChange={(e) => setPriceIncludesVat(e.target.checked)}
                className="h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-[#0f172a]">Cena s DPH</span>
            </label>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Dodávateľ</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue placeholder="Vyber dodávateľa" /></SelectTrigger>
                <SelectContent>
                  {suppliersList.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => { setIsDialogOpen(false); resetForm(); }}
                disabled={saving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={saving || !size}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingPackaging ? 'Uložiť' : 'Vytvoriť typ'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Naskladniť ===== */}
      <Dialog open={receiptFor !== null} onOpenChange={(open) => { if (!open) setReceiptFor(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">Naskladniť obal</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {receiptFor?.name}{receiptFor?.size ? ` · ${receiptFor.size}` : ''} — aktuálne na sklade {formatNumber(receiptFor?.quantity || 0)} ks
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceipt} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Počet (ks) *</Label>
                <Input
                  type="number" min="1" step="1" autoFocus
                  value={rcvQty}
                  onChange={(e) => setRcvQty(e.target.value)}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Dátum</Label>
                <Input
                  type="date"
                  value={rcvDate}
                  onChange={(e) => setRcvDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Cena/ks (€)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={rcvPrice}
                  onChange={(e) => setRcvPrice(e.target.value)}
                  placeholder="voliteľné"
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Šarža</Label>
                <Input
                  type="text"
                  value={rcvBatch}
                  onChange={(e) => setRcvBatch(e.target.value)}
                  placeholder="voliteľné"
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Dodávateľ</Label>
              <Select value={rcvSupplier} onValueChange={setRcvSupplier}>
                <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue placeholder="Vyber dodávateľa" /></SelectTrigger>
                <SelectContent>
                  {suppliersList.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={rcvNotes}
                onChange={(e) => setRcvNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => setReceiptFor(null)}
                disabled={rcvSaving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={rcvSaving || !rcvQty}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {rcvSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <PackagePlus className="h-4 w-4" /> Naskladniť
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Inventúra ===== */}
      <Dialog open={stocktakeFor !== null} onOpenChange={(open) => { if (!open) setStocktakeFor(null); }}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">Inventúra</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {stocktakeFor?.name}{stocktakeFor?.size ? ` · ${stocktakeFor.size}` : ''} — systém eviduje {formatNumber(stocktakeFor?.quantity || 0)} ks
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStocktake} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Napočítaný stav (ks) *</Label>
                <Input
                  type="number" min="0" step="1" autoFocus
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Dátum</Label>
                <Input
                  type="date"
                  value={stkDate}
                  onChange={(e) => setStkDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            {countedDiff !== null && countedDiff !== 0 && (
              <div className={cn(
                'text-xs font-semibold rounded-lg px-3 py-2 border',
                countedDiff > 0 ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]' : 'bg-[#fef2f2] border-[#fecaca] text-[#dc2626]'
              )}>
                Rozdiel oproti systému: {countedDiff > 0 ? '+' : ''}{formatNumber(countedDiff)} ks
              </div>
            )}

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={stkNotes}
                onChange={(e) => setStkNotes(e.target.value)}
                rows={2}
                placeholder="napr. dôvod rozdielu"
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => setStocktakeFor(null)}
                disabled={stkSaving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={stkSaving || counted === ''}
                className="h-9 px-4 rounded-md bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {stkSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <ClipboardCheck className="h-4 w-4" /> Uložiť inventúru
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== História pohybov ===== */}
      <Dialog open={historyFor !== null} onOpenChange={(open) => { if (!open) { setHistoryFor(null); setMovements([]); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">História pohybov</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {historyFor?.name}{historyFor?.size ? ` · ${historyFor.size}` : ''} — aktuálne {formatNumber(historyFor?.quantity || 0)} ks
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="py-8 text-center text-sm text-[#64748b]">Načítavam…</div>
          ) : movements.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#64748b]">Zatiaľ žiadne pohyby.</div>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold',
                        m.movement_type === 'receipt' ? 'bg-[#dcfce7] text-[#166534]'
                          : m.movement_type === 'consumption' ? 'bg-[#fef2f2] text-[#dc2626]'
                          : 'bg-[#dbeafe] text-[#1e40af]'
                      )}>
                        {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      </span>
                      <span className="text-[11px] text-[#64748b]">{formatDate(m.occurred_on)}</span>
                    </div>
                    {m.notes && <p className="text-[11px] text-[#475569] mt-0.5 truncate">{m.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={cn('text-sm font-bold', m.quantity_delta >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]')}>
                      {m.quantity_delta > 0 ? '+' : ''}{formatNumber(m.quantity_delta)} ks
                    </div>
                    {m.balance_after != null && (
                      <div className="text-[10px] text-[#64748b]">stav: {formatNumber(m.balance_after)} ks</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => { setHistoryFor(null); setMovements([]); }}
              className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors"
            >
              Zavrieť
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať typ obalu?</AlertDialogTitle>
            <AlertDialogDescription>
              Zmaže sa definícia typu aj jeho stav. Ak je typ priradený k plodinám v konfigurácii obalov, priradenie sa zobrazí ako „nenastavené". Táto akcia je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              Zmazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};


// ===================== SUBSTRATE TAB =====================

const SubstrateTab = ({ isAdmin, isMobile, toast, getSupplierName }: TabProps) => {
  const { data: substrates, add, update, remove, refetch } = useSubstrates();
  const { data: suppliersList } = useSuppliers();

  const today = () => new Date().toISOString().split('T')[0];
  const fmtAmt = (val: number, unit?: string | null) =>
    (unit === 'kg' ? formatKg(val) : `${formatNumber(val, 1)} ${unit || ''}`).trim();

  // --- Definícia typu (Pridať/Upraviť) — bez množstva ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubstrate, setEditingSubstrate] = useState<DbSubstrate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<string>('coconut');
  const [customType, setCustomType] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantityUnit, setQuantityUnit] = useState<'l' | 'kg'>('kg');
  const [unitCost, setUnitCost] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [notes, setNotes] = useState('');
  const [minStock, setMinStock] = useState('');

  // --- Naskladniť ---
  const [receiptFor, setReceiptFor] = useState<DbSubstrate | null>(null);
  const [rcvQty, setRcvQty] = useState('');
  const [rcvDate, setRcvDate] = useState(today());
  const [rcvPrice, setRcvPrice] = useState('');
  const [rcvSupplier, setRcvSupplier] = useState('');
  const [rcvBatch, setRcvBatch] = useState('');
  const [rcvNotes, setRcvNotes] = useState('');
  const [rcvSaving, setRcvSaving] = useState(false);

  // --- Inventúra ---
  const [stocktakeFor, setStocktakeFor] = useState<DbSubstrate | null>(null);
  const [counted, setCounted] = useState('');
  const [stkDate, setStkDate] = useState(today());
  const [stkNotes, setStkNotes] = useState('');
  const [stkSaving, setStkSaving] = useState(false);

  // --- História ---
  const [historyFor, setHistoryFor] = useState<DbSubstrate | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const handler = () => openAddDialog();
    window.addEventListener('inventory-add', handler);
    return () => window.removeEventListener('inventory-add', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingSubstrate(null);
    setType('coconut');
    setCustomType('');
    setSupplierId('');
    setQuantityUnit('kg');
    setUnitCost('');
    setPriceIncludesVat(true);
    setVatRate('20');
    setNotes('');
    setMinStock('');
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (s: DbSubstrate) => {
    setEditingSubstrate(s);
    setType(s.type || 'coconut');
    setCustomType((s as any).custom_type || '');
    setSupplierId(s.supplier_id || '');
    setQuantityUnit((s.unit as 'l' | 'kg') || 'kg');
    setUnitCost((s as any).unit_cost?.toString() || '');
    setPriceIncludesVat((s as any).price_includes_vat ?? true);
    setVatRate((s as any).vat_rate?.toString() || '20');
    setNotes(s.notes || '');
    setMinStock((s as any).min_stock?.toString() || '');
    setIsDialogOpen(true);
  };

  const liveStock = (s: DbSubstrate) => {
    const cs = (s as any).current_stock;
    return (cs != null && cs !== '') ? parseFloat(cs) : (s.quantity || 0);
  };

  // Totals by type+unit
  const totals = useMemo(() => {
    const acc: Record<string, { type: string; unit: string; total: number }> = {};
    substrates.forEach(s => {
      const key = `${s.type || 'other'}-${s.unit || 'kg'}`;
      if (!acc[key]) acc[key] = { type: s.type || 'other', unit: s.unit || 'kg', total: 0 };
      acc[key].total += liveStock(s);
    });
    return Object.values(acc);
  }, [substrates]);

  const lowStockItems = useMemo(() =>
    substrates.filter(s => isLowStock(liveStock(s), (s as any).min_stock)),
    [substrates]
  );

  // Uloženie DEFINÍCIE typu — stav (current_stock) sa tu NEMENÍ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) {
      toast({ title: 'Chyba', description: 'Vyber typ substrátu.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const typeName = SUBSTRATE_TYPES[type] || type;
    const data: any = {
      name: typeName,
      type: type || null,
      custom_type: customType || null,
      supplier_id: supplierId || null,
      unit: quantityUnit,
      notes: notes || null,
      min_stock: minStock ? parseFloat(minStock) : null,
      unit_cost: unitCost ? parseFloat(unitCost) : 0,
      price_includes_vat: priceIncludesVat,
      vat_rate: vatRate ? parseFloat(vatRate) : 20,
    };

    try {
      if (editingSubstrate) {
        // EDIT = len definícia, stav necháme nedotknutý
        const { error } = await update(editingSubstrate.id, data);
        if (error) throw error;
        toast({ title: 'Aktualizované', description: 'Typ substrátu bol upravený.' });
      } else {
        // NOVÝ typ začína na 0 — sklad sa dopĺňa cez „Naskladniť"
        const { error } = await add({ ...data, quantity: 0, current_stock: 0 });
        if (error) throw error;
        toast({ title: 'Pridané', description: 'Nový typ substrátu vytvorený. Sklad doplň cez „Naskladniť".' });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa uložiť.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await remove(id);
      if (error) throw error;
      toast({ title: 'Zmazané', description: 'Typ substrátu bol odstránený.' });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa zmazať.', variant: 'destructive' });
    }
  };

  // --- Naskladniť ---
  const openReceipt = (s: DbSubstrate) => {
    setReceiptFor(s);
    setRcvQty('');
    setRcvDate(today());
    setRcvPrice('');
    setRcvSupplier(s.supplier_id || '');
    setRcvBatch('');
    setRcvNotes('');
  };

  const handleReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFor) return;
    const qty = parseFloat(rcvQty);
    if (!rcvQty || isNaN(qty) || qty <= 0) {
      toast({ title: 'Chyba', description: 'Zadaj kladné množstvo.', variant: 'destructive' });
      return;
    }
    setRcvSaving(true);
    try {
      const { error } = await supabase.rpc('add_substrate_receipt', {
        p_substrate_id: receiptFor.id,
        p_quantity: qty,
        p_occurred_on: rcvDate || today(),
        p_unit_price: rcvPrice ? parseFloat(rcvPrice) : null,
        p_supplier_id: rcvSupplier || null,
        p_batch: rcvBatch || null,
        p_notes: rcvNotes || null,
      });
      if (error) throw error;
      await refetch();
      toast({ title: 'Naskladnené', description: `Pridané ${fmtAmt(qty, receiptFor.unit)}.` });
      setReceiptFor(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Naskladnenie sa nepodarilo.', variant: 'destructive' });
    } finally {
      setRcvSaving(false);
    }
  };

  // --- Inventúra ---
  const openStocktake = (s: DbSubstrate) => {
    setStocktakeFor(s);
    setCounted('');
    setStkDate(today());
    setStkNotes('');
  };

  const handleStocktake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stocktakeFor) return;
    const cnt = parseFloat(counted);
    if (counted === '' || isNaN(cnt) || cnt < 0) {
      toast({ title: 'Chyba', description: 'Zadaj napočítaný stav (0 alebo viac).', variant: 'destructive' });
      return;
    }
    setStkSaving(true);
    try {
      const { error } = await supabase.rpc('set_substrate_stocktake', {
        p_substrate_id: stocktakeFor.id,
        p_counted: cnt,
        p_occurred_on: stkDate || today(),
        p_notes: stkNotes || null,
      });
      if (error) throw error;
      await refetch();
      toast({ title: 'Inventúra uložená', description: 'Stav bol upravený podľa napočítaného.' });
      setStocktakeFor(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Inventúra sa nepodarila.', variant: 'destructive' });
    } finally {
      setStkSaving(false);
    }
  };

  // --- História ---
  const openHistory = async (s: DbSubstrate) => {
    setHistoryFor(s);
    setLoadingHistory(true);
    setMovements([]);
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('item_kind', 'substrate')
        .eq('item_id', s.id)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setMovements(data || []);
    } catch (err: any) {
      toast({ title: 'Chyba', description: 'Nepodarilo sa načítať históriu.', variant: 'destructive' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const MOVEMENT_LABELS: Record<string, string> = {
    receipt: 'Naskladnenie',
    consumption: 'Spotreba',
    adjustment: 'Inventúra',
  };

  const stkUnit = stocktakeFor?.unit || 'kg';
  const countedDiff = stocktakeFor && counted !== '' && !isNaN(parseFloat(counted))
    ? parseFloat(counted) - liveStock(stocktakeFor)
    : null;
  const histUnit = historyFor?.unit || 'kg';

  return (
    <>
      <LowStockBanner count={lowStockItems.length} label="substrát" />

      {/* Total summary */}
      {totals.length > 0 && (
        <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-3 md:p-4 mb-4">
          <h3 className="text-sm font-bold text-[#0f172a] mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#16a34a]" />
            Súhrn celkových zásob
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {totals.map((t, i) => (
              <div key={i} className="bg-[#f8fafc] rounded-lg border border-[#e2e8f0] p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold mb-0.5">
                  {SUBSTRATE_TYPES[t.type] || t.type}
                </p>
                <p className="text-base font-bold text-[#0f172a]">
                  {t.unit === 'kg' ? formatKg(t.total) : <>{formatNumber(t.total, 1)} <span className="text-xs font-normal text-[#475569]">{t.unit}</span></>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Substrates grid */}
      {substrates.length === 0 ? (
        <EmptyTabState
          icon={Layers}
          title="Žiadny typ substrátu"
          description="Vytvor prvý typ substrátu. Sklad doplníš cez Naskladniť."
          onAdd={isAdmin ? openAddDialog : undefined}
          addLabel="Pridať typ substrátu"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {substrates.map(s => {
            const stock = liveStock(s);
            const low = isLowStock(stock, (s as any).min_stock);
            const unitCostVal = (s as any).unit_cost;
            return (
              <div
                key={s.id}
                className={cn(
                  'bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md',
                  low ? 'border-[#fecaca]' : 'border-[#cbd5e1] hover:border-[#bbf7d0]'
                )}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[#fef3c7] border border-[#fde68a]">
                    <Layers className="h-5 w-5 text-[#d97706]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[#0f172a] truncate">
                      {SUBSTRATE_TYPES[s.type || ''] || s.name}
                    </h3>
                    {low && (
                      <span className="inline-flex items-center h-5 px-1.5 mt-1 rounded-full bg-[#fef2f2] text-[#dc2626] text-[10px] font-bold">
                        NÍZKE ZÁSOBY
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#475569]">Na sklade:</span>
                    <span className="font-bold text-[#16a34a]">
                      {s.unit === 'kg' ? formatKg(stock) : `${formatNumber(stock, 1)} ${s.unit}`}
                    </span>
                  </div>
                  {(s as any).min_stock && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Min. limit:</span>
                      <span className="text-[#0f172a]">
                        {s.unit === 'kg' ? formatKg((s as any).min_stock) : `${formatNumber((s as any).min_stock, 1)} ${s.unit}`}
                      </span>
                    </div>
                  )}
                  {(s as any).custom_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Variant:</span>
                      <span className="text-[#0f172a] truncate ml-2">{(s as any).custom_type}</span>
                    </div>
                  )}
                  {unitCostVal > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Cena/{s.unit}:</span>
                      <span className="text-[#0f172a]">{formatEur(unitCostVal)}</span>
                    </div>
                  )}
                  {s.supplier_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Dodávateľ:</span>
                      <span className="text-[#0f172a] truncate ml-2">{getSupplierName(s.supplier_id)}</span>
                    </div>
                  )}
                </div>

                {s.notes && (
                  <div className="flex items-start gap-1.5 mt-2 text-xs text-[#475569]">
                    <StickyNote className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{s.notes}</span>
                  </div>
                )}

                <div className="pt-3 mt-3 border-t border-[#e2e8f0] space-y-2">
                  {isAdmin && (
                    <button
                      onClick={() => openReceipt(s)}
                      className="w-full h-9 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <PackagePlus className="h-4 w-4" /> Naskladniť
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => openStocktake(s)}
                        className="flex-1 h-9 rounded-lg border border-[#cbd5e1] text-[#2563eb] hover:bg-[#eff6ff] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ClipboardCheck className="h-4 w-4" /> Inventúra
                      </button>
                    )}
                    <button
                      onClick={() => openHistory(s)}
                      className="flex-1 h-9 rounded-lg border border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <History className="h-4 w-4" /> História
                    </button>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditDialog(s)}
                        className="flex-1 h-9 rounded-lg border border-[#e2e8f0] text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Upraviť
                      </button>
                      <button
                        onClick={() => setDeleteId(s.id)}
                        className="flex-1 h-9 rounded-lg border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Zmazať
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Definícia typu (Add/Edit) — bez množstva ===== */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">{editingSubstrate ? 'Upraviť typ substrátu' : 'Nový typ substrátu'}</DialogTitle>
            <DialogDescription className="text-[#475569]">
              Definuj typ substrátu. Množstvo na sklade sa nemení tu — rieši ho „Naskladniť" a „Inventúra".
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="text-sm font-semibold text-[#374151]">Typ *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SUBSTRATE_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Konkrétny variant / značka</Label>
              <Input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="napr. Klasmann TS3"
                className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Jednotka</Label>
                <Select value={quantityUnit} onValueChange={(v) => setQuantityUnit(v as 'l' | 'kg')}>
                  <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="l">l</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Min. limit ({quantityUnit})</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Cena/{quantityUnit} (€)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">DPH (%)</Label>
                <Input
                  type="number" step="1" min="0" max="100"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={priceIncludesVat}
                onChange={(e) => setPriceIncludesVat(e.target.checked)}
                className="h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-[#0f172a]">Cena s DPH</span>
            </label>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Dodávateľ</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue placeholder="Vyber dodávateľa" /></SelectTrigger>
                <SelectContent>
                  {suppliersList.map(sup => (
                    <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => { setIsDialogOpen(false); resetForm(); }}
                disabled={saving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={saving || !type}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingSubstrate ? 'Uložiť' : 'Vytvoriť typ'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Naskladniť ===== */}
      <Dialog open={receiptFor !== null} onOpenChange={(open) => { if (!open) setReceiptFor(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">Naskladniť substrát</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {receiptFor ? (SUBSTRATE_TYPES[receiptFor.type || ''] || receiptFor.name) : ''} — aktuálne na sklade {receiptFor ? fmtAmt(liveStock(receiptFor), receiptFor.unit) : ''}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceipt} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Množstvo ({receiptFor?.unit || 'kg'}) *</Label>
                <Input
                  type="number" min="0" step="0.01" autoFocus
                  value={rcvQty}
                  onChange={(e) => setRcvQty(e.target.value)}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Dátum</Label>
                <Input
                  type="date"
                  value={rcvDate}
                  onChange={(e) => setRcvDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Cena/{receiptFor?.unit || 'kg'} (€)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={rcvPrice}
                  onChange={(e) => setRcvPrice(e.target.value)}
                  placeholder="voliteľné"
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Šarža</Label>
                <Input
                  type="text"
                  value={rcvBatch}
                  onChange={(e) => setRcvBatch(e.target.value)}
                  placeholder="voliteľné"
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Dodávateľ</Label>
              <Select value={rcvSupplier} onValueChange={setRcvSupplier}>
                <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue placeholder="Vyber dodávateľa" /></SelectTrigger>
                <SelectContent>
                  {suppliersList.map(sup => (
                    <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={rcvNotes}
                onChange={(e) => setRcvNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => setReceiptFor(null)}
                disabled={rcvSaving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={rcvSaving || !rcvQty}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {rcvSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <PackagePlus className="h-4 w-4" /> Naskladniť
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Inventúra ===== */}
      <Dialog open={stocktakeFor !== null} onOpenChange={(open) => { if (!open) setStocktakeFor(null); }}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">Inventúra</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {stocktakeFor ? (SUBSTRATE_TYPES[stocktakeFor.type || ''] || stocktakeFor.name) : ''} — systém eviduje {stocktakeFor ? fmtAmt(liveStock(stocktakeFor), stocktakeFor.unit) : ''}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStocktake} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Napočítaný stav ({stkUnit}) *</Label>
                <Input
                  type="number" min="0" step="0.01" autoFocus
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Dátum</Label>
                <Input
                  type="date"
                  value={stkDate}
                  onChange={(e) => setStkDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            {countedDiff !== null && countedDiff !== 0 && (
              <div className={cn(
                'text-xs font-semibold rounded-lg px-3 py-2 border',
                countedDiff > 0 ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]' : 'bg-[#fef2f2] border-[#fecaca] text-[#dc2626]'
              )}>
                Rozdiel oproti systému: {countedDiff > 0 ? '+' : ''}{formatNumber(countedDiff, 2)} {stkUnit}
              </div>
            )}

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={stkNotes}
                onChange={(e) => setStkNotes(e.target.value)}
                rows={2}
                placeholder="napr. dôvod rozdielu"
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => setStocktakeFor(null)}
                disabled={stkSaving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={stkSaving || counted === ''}
                className="h-9 px-4 rounded-md bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {stkSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <ClipboardCheck className="h-4 w-4" /> Uložiť inventúru
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== História pohybov ===== */}
      <Dialog open={historyFor !== null} onOpenChange={(open) => { if (!open) { setHistoryFor(null); setMovements([]); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">História pohybov</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {historyFor ? (SUBSTRATE_TYPES[historyFor.type || ''] || historyFor.name) : ''} — aktuálne {historyFor ? fmtAmt(liveStock(historyFor), historyFor.unit) : ''}
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="py-8 text-center text-sm text-[#64748b]">Načítavam…</div>
          ) : movements.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#64748b]">Zatiaľ žiadne pohyby.</div>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold',
                        m.movement_type === 'receipt' ? 'bg-[#dcfce7] text-[#166534]'
                          : m.movement_type === 'consumption' ? 'bg-[#fef2f2] text-[#dc2626]'
                          : 'bg-[#dbeafe] text-[#1e40af]'
                      )}>
                        {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      </span>
                      <span className="text-[11px] text-[#64748b]">{formatDate(m.occurred_on)}</span>
                    </div>
                    {m.notes && <p className="text-[11px] text-[#475569] mt-0.5 truncate">{m.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={cn('text-sm font-bold', m.quantity_delta >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]')}>
                      {m.quantity_delta > 0 ? '+' : ''}{formatNumber(m.quantity_delta, 2)} {histUnit}
                    </div>
                    {m.balance_after != null && (
                      <div className="text-[10px] text-[#64748b]">stav: {formatNumber(m.balance_after, 2)} {histUnit}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => { setHistoryFor(null); setMovements([]); }}
              className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors"
            >
              Zavrieť
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať typ substrátu?</AlertDialogTitle>
            <AlertDialogDescription>Zmaže sa definícia typu aj jeho stav. Táto akcia je nevratná.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              Zmazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};


// ===================== LABELS TAB =====================

const LabelsTab = ({ isAdmin, isMobile, toast, getSupplierName }: TabProps) => {
  const { data: labels, add, update, remove, refetch } = useLabels();
  const { data: suppliersList } = useSuppliers();

  const today = () => new Date().toISOString().split('T')[0];

  // --- Definícia typu (Pridať/Upraviť) — BEZ množstva, množstvo sa rieši cez Naskladniť/Inventúru ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<DbLabel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('standard');
  const [size, setSize] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [minStock, setMinStock] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [notes, setNotes] = useState('');

  // --- Naskladniť (várka) ---
  const [receiptFor, setReceiptFor] = useState<DbLabel | null>(null);
  const [rcvQty, setRcvQty] = useState('');
  const [rcvDate, setRcvDate] = useState(today());
  const [rcvPrice, setRcvPrice] = useState('');
  const [rcvSupplier, setRcvSupplier] = useState('');
  const [rcvBatch, setRcvBatch] = useState('');
  const [rcvNotes, setRcvNotes] = useState('');
  const [rcvSaving, setRcvSaving] = useState(false);

  // --- Inventúra ---
  const [stocktakeFor, setStocktakeFor] = useState<DbLabel | null>(null);
  const [counted, setCounted] = useState('');
  const [stkDate, setStkDate] = useState(today());
  const [stkNotes, setStkNotes] = useState('');
  const [stkSaving, setStkSaving] = useState(false);

  // --- História pohybov ---
  const [historyFor, setHistoryFor] = useState<DbLabel | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Listen for header "+" event
  useEffect(() => {
    const handler = () => openAddDialog();
    window.addEventListener('inventory-add', handler);
    return () => window.removeEventListener('inventory-add', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingLabel(null);
    setName('');
    setType('standard');
    setSize('');
    setSupplierId('');
    setMinStock('');
    setUnitCost('');
    setPriceIncludesVat(true);
    setVatRate('20');
    setNotes('');
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (l: DbLabel) => {
    setEditingLabel(l);
    setName(l.name || '');
    setType(l.type || 'standard');
    setSize(l.size || '');
    setSupplierId(l.supplier_id || '');
    setMinStock((l as any).min_stock?.toString() || '');
    setUnitCost((l as any).unit_cost?.toString() || '');
    setPriceIncludesVat((l as any).price_includes_vat ?? true);
    setVatRate((l as any).vat_rate?.toString() || '20');
    setNotes(l.notes || '');
    setIsDialogOpen(true);
  };

  const lowStockItems = useMemo(() =>
    labels.filter(l => isLowStock(l.quantity, (l as any).min_stock)),
    [labels]
  );

  // Uloženie DEFINÍCIE typu — množstvo sa tu NEMENÍ (rieši Naskladniť/Inventúra)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Chyba', description: 'Zadaj názov etikety.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const data: any = {
      name: name.trim(),
      type: type || 'standard',
      size: size || null,
      supplier_id: supplierId || null,
      notes: notes || null,
      min_stock: minStock ? parseInt(minStock) : null,
      unit_cost: unitCost ? parseFloat(unitCost) : 0,
      price_includes_vat: priceIncludesVat,
      vat_rate: vatRate ? parseFloat(vatRate) : 20,
    };

    try {
      if (editingLabel) {
        // EDIT = len definícia, množstvo necháme nedotknuté
        const { error } = await update(editingLabel.id, data);
        if (error) throw error;
        toast({ title: 'Aktualizované', description: 'Typ etikety bol upravený.' });
      } else {
        // NOVÝ typ začína na 0 ks — sklad sa dopĺňa cez „Naskladniť"
        const { error } = await add({ ...data, quantity: 0 });
        if (error) throw error;
        toast({ title: 'Pridané', description: 'Nový typ etikety vytvorený. Sklad doplň cez „Naskladniť".' });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa uložiť.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await remove(id);
      if (error) throw error;
      toast({ title: 'Zmazané', description: 'Typ etikety bol odstránený.' });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa zmazať.', variant: 'destructive' });
    }
  };

  // --- Naskladniť ---
  const openReceipt = (l: DbLabel) => {
    setReceiptFor(l);
    setRcvQty('');
    setRcvDate(today());
    setRcvPrice('');
    setRcvSupplier(l.supplier_id || '');
    setRcvBatch('');
    setRcvNotes('');
  };

  const handleReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFor) return;
    const qty = parseInt(rcvQty);
    if (!rcvQty || isNaN(qty) || qty <= 0) {
      toast({ title: 'Chyba', description: 'Zadaj kladný počet kusov.', variant: 'destructive' });
      return;
    }
    setRcvSaving(true);
    try {
      const { error } = await supabase.rpc('add_label_receipt', {
        p_label_id: receiptFor.id,
        p_quantity: qty,
        p_occurred_on: rcvDate || today(),
        p_unit_price: rcvPrice ? parseFloat(rcvPrice) : null,
        p_supplier_id: rcvSupplier || null,
        p_batch: rcvBatch || null,
        p_notes: rcvNotes || null,
      });
      if (error) throw error;
      await refetch();
      toast({ title: 'Naskladnené', description: `Pridaných ${qty} ks.` });
      setReceiptFor(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Naskladnenie sa nepodarilo.', variant: 'destructive' });
    } finally {
      setRcvSaving(false);
    }
  };

  // --- Inventúra ---
  const openStocktake = (l: DbLabel) => {
    setStocktakeFor(l);
    setCounted('');
    setStkDate(today());
    setStkNotes('');
  };

  const handleStocktake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stocktakeFor) return;
    const cnt = parseInt(counted);
    if (counted === '' || isNaN(cnt) || cnt < 0) {
      toast({ title: 'Chyba', description: 'Zadaj napočítaný stav (0 alebo viac).', variant: 'destructive' });
      return;
    }
    setStkSaving(true);
    try {
      const { error } = await supabase.rpc('set_label_stocktake', {
        p_label_id: stocktakeFor.id,
        p_counted: cnt,
        p_occurred_on: stkDate || today(),
        p_notes: stkNotes || null,
      });
      if (error) throw error;
      await refetch();
      toast({ title: 'Inventúra uložená', description: 'Stav bol upravený podľa napočítaného.' });
      setStocktakeFor(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Inventúra sa nepodarila.', variant: 'destructive' });
    } finally {
      setStkSaving(false);
    }
  };

  // --- História pohybov ---
  const openHistory = async (l: DbLabel) => {
    setHistoryFor(l);
    setLoadingHistory(true);
    setMovements([]);
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('item_kind', 'label')
        .eq('item_id', l.id)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setMovements(data || []);
    } catch (err: any) {
      toast({ title: 'Chyba', description: 'Nepodarilo sa načítať históriu.', variant: 'destructive' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const MOVEMENT_LABELS: Record<string, string> = {
    receipt: 'Naskladnenie',
    consumption: 'Spotreba',
    adjustment: 'Inventúra',
  };

  const countedDiff = stocktakeFor && counted !== '' && !isNaN(parseInt(counted))
    ? parseInt(counted) - (stocktakeFor.quantity || 0)
    : null;

  return (
    <>
      <LowStockBanner count={lowStockItems.length} label="etiketa" />

      {labels.length === 0 ? (
        <EmptyTabState
          icon={Tag}
          title="Žiadne typy etikiet"
          description="Vytvor prvý typ etikety. Sklad doplníš cez Naskladniť."
          onAdd={isAdmin ? openAddDialog : undefined}
          addLabel="Pridať typ etikety"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {labels.map(l => {
            const low = isLowStock(l.quantity, (l as any).min_stock);
            const unitCostVal = (l as any).unit_cost;
            return (
              <div
                key={l.id}
                className={cn(
                  'bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md',
                  low ? 'border-[#fecaca]' : 'border-[#cbd5e1] hover:border-[#bbf7d0]'
                )}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-[#ede9fe] border border-[#ddd6fe]">
                    <Tag className="h-5 w-5 text-[#7c3aed]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[#0f172a] truncate">{l.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {l.type && LABEL_TYPES[l.type] && (
                        <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#ede9fe] text-[#7c3aed] text-[10px] font-bold">
                          {LABEL_TYPES[l.type]}
                        </span>
                      )}
                      {low && (
                        <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#fef2f2] text-[#dc2626] text-[10px] font-bold">
                          NÍZKE ZÁSOBY
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#475569]">Na sklade:</span>
                    <span className="font-bold text-[#16a34a]">{formatNumber(l.quantity)} ks</span>
                  </div>
                  {(l as any).min_stock && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Min. limit:</span>
                      <span className="text-[#0f172a]">{formatNumber((l as any).min_stock)} ks</span>
                    </div>
                  )}
                  {l.size && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Veľkosť:</span>
                      <span className="text-[#0f172a] truncate ml-2">{l.size}</span>
                    </div>
                  )}
                  {unitCostVal > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Cena/ks:</span>
                      <span className="text-[#0f172a]">{formatEur(unitCostVal)}</span>
                    </div>
                  )}
                  {l.supplier_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Dodávateľ:</span>
                      <span className="text-[#0f172a] truncate ml-2">{getSupplierName(l.supplier_id)}</span>
                    </div>
                  )}
                </div>

                {l.notes && (
                  <div className="flex items-start gap-1.5 mt-2 text-xs text-[#475569]">
                    <StickyNote className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{l.notes}</span>
                  </div>
                )}

                <div className="pt-3 mt-3 border-t border-[#e2e8f0] space-y-2">
                  {isAdmin && (
                    <button
                      onClick={() => openReceipt(l)}
                      className="w-full h-9 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <PackagePlus className="h-4 w-4" /> Naskladniť
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => openStocktake(l)}
                        className="flex-1 h-9 rounded-lg border border-[#cbd5e1] text-[#2563eb] hover:bg-[#eff6ff] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ClipboardCheck className="h-4 w-4" /> Inventúra
                      </button>
                    )}
                    <button
                      onClick={() => openHistory(l)}
                      className="flex-1 h-9 rounded-lg border border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <History className="h-4 w-4" /> História
                    </button>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditDialog(l)}
                        className="flex-1 h-9 rounded-lg border border-[#e2e8f0] text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Upraviť
                      </button>
                      <button
                        onClick={() => setDeleteId(l.id)}
                        className="flex-1 h-9 rounded-lg border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Zmazať
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Definícia typu (Add/Edit) — bez množstva ===== */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">{editingLabel ? 'Upraviť typ etikety' : 'Nový typ etikety'}</DialogTitle>
            <DialogDescription className="text-[#475569]">
              Definuj typ etikety. Množstvo na sklade sa nemení tu — rieši ho „Naskladniť" a „Inventúra".
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="text-sm font-semibold text-[#374151]">Názov *</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="napr. Etiketa Reďkovka červená"
                className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Typ</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LABEL_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Veľkosť</Label>
                <Input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="napr. 50×30mm"
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Min. limit (ks)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="napr. 200"
                className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Cena/ks (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">DPH (%)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={priceIncludesVat}
                onChange={(e) => setPriceIncludesVat(e.target.checked)}
                className="h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-[#0f172a]">Cena s DPH</span>
            </label>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Dodávateľ</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue placeholder="Vyber dodávateľa" /></SelectTrigger>
                <SelectContent>
                  {suppliersList.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => { setIsDialogOpen(false); resetForm(); }}
                disabled={saving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingLabel ? 'Uložiť' : 'Vytvoriť typ'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Naskladniť ===== */}
      <Dialog open={receiptFor !== null} onOpenChange={(open) => { if (!open) setReceiptFor(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">Naskladniť etikety</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {receiptFor?.name} — aktuálne na sklade {formatNumber(receiptFor?.quantity || 0)} ks
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceipt} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Počet (ks) *</Label>
                <Input
                  type="number" min="1" step="1" autoFocus
                  value={rcvQty}
                  onChange={(e) => setRcvQty(e.target.value)}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Dátum</Label>
                <Input
                  type="date"
                  value={rcvDate}
                  onChange={(e) => setRcvDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Cena/ks (€)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={rcvPrice}
                  onChange={(e) => setRcvPrice(e.target.value)}
                  placeholder="voliteľné"
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Šarža</Label>
                <Input
                  type="text"
                  value={rcvBatch}
                  onChange={(e) => setRcvBatch(e.target.value)}
                  placeholder="voliteľné"
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Dodávateľ</Label>
              <Select value={rcvSupplier} onValueChange={setRcvSupplier}>
                <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue placeholder="Vyber dodávateľa" /></SelectTrigger>
                <SelectContent>
                  {suppliersList.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={rcvNotes}
                onChange={(e) => setRcvNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => setReceiptFor(null)}
                disabled={rcvSaving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={rcvSaving || !rcvQty}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {rcvSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <PackagePlus className="h-4 w-4" /> Naskladniť
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Inventúra ===== */}
      <Dialog open={stocktakeFor !== null} onOpenChange={(open) => { if (!open) setStocktakeFor(null); }}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">Inventúra</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {stocktakeFor?.name} — systém eviduje {formatNumber(stocktakeFor?.quantity || 0)} ks
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStocktake} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Napočítaný stav (ks) *</Label>
                <Input
                  type="number" min="0" step="1" autoFocus
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Dátum</Label>
                <Input
                  type="date"
                  value={stkDate}
                  onChange={(e) => setStkDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            {countedDiff !== null && countedDiff !== 0 && (
              <div className={cn(
                'text-xs font-semibold rounded-lg px-3 py-2 border',
                countedDiff > 0 ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]' : 'bg-[#fef2f2] border-[#fecaca] text-[#dc2626]'
              )}>
                Rozdiel oproti systému: {countedDiff > 0 ? '+' : ''}{formatNumber(countedDiff)} ks
              </div>
            )}

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={stkNotes}
                onChange={(e) => setStkNotes(e.target.value)}
                rows={2}
                placeholder="napr. dôvod rozdielu"
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => setStocktakeFor(null)}
                disabled={stkSaving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={stkSaving || counted === ''}
                className="h-9 px-4 rounded-md bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {stkSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <ClipboardCheck className="h-4 w-4" /> Uložiť inventúru
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== História pohybov ===== */}
      <Dialog open={historyFor !== null} onOpenChange={(open) => { if (!open) { setHistoryFor(null); setMovements([]); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">História pohybov</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {historyFor?.name} — aktuálne {formatNumber(historyFor?.quantity || 0)} ks
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="py-8 text-center text-sm text-[#64748b]">Načítavam…</div>
          ) : movements.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#64748b]">Zatiaľ žiadne pohyby.</div>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold',
                        m.movement_type === 'receipt' ? 'bg-[#dcfce7] text-[#166534]'
                          : m.movement_type === 'consumption' ? 'bg-[#fef2f2] text-[#dc2626]'
                          : 'bg-[#dbeafe] text-[#1e40af]'
                      )}>
                        {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      </span>
                      <span className="text-[11px] text-[#64748b]">{formatDate(m.occurred_on)}</span>
                    </div>
                    {m.notes && <p className="text-[11px] text-[#475569] mt-0.5 truncate">{m.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={cn('text-sm font-bold', m.quantity_delta >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]')}>
                      {m.quantity_delta > 0 ? '+' : ''}{formatNumber(m.quantity_delta)} ks
                    </div>
                    {m.balance_after != null && (
                      <div className="text-[10px] text-[#64748b]">stav: {formatNumber(m.balance_after)} ks</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => { setHistoryFor(null); setMovements([]); }}
              className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors"
            >
              Zavrieť
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať typ etikety?</AlertDialogTitle>
            <AlertDialogDescription>
              Zmaže sa definícia typu aj jeho stav a história pohybov. Táto akcia je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              Zmazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};


// ===================== CONSUMABLES TAB =====================

interface ConsumablesTabProps {
  isAdmin: boolean;
  isMobile: boolean;
  toast: any;
}

const ConsumablesTab = ({ isAdmin, isMobile, toast }: ConsumablesTabProps) => {
  const { data: suppliersList } = useSuppliers();
  const getSupplierName = (id: string | null | undefined) =>
    suppliersList.find(s => s.id === id)?.name || '';

  const [items, setItems] = useState<ConsumableItem[]>([]);
  const [loading, setLoading] = useState(true);

  const today = () => new Date().toISOString().split('T')[0];
  const fmtAmt = (val: number, unit?: string | null) =>
    (unit === 'kg' ? formatKg(val) : `${formatNumber(val)} ${unit || ''}`).trim();

  // --- Definícia položky (Pridať/Upraviť) — BEZ množstva ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsumableItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [notes, setNotes] = useState('');

  // --- Naskladniť ---
  const [receiptFor, setReceiptFor] = useState<ConsumableItem | null>(null);
  const [rcvQty, setRcvQty] = useState('');
  const [rcvDate, setRcvDate] = useState(today());
  const [rcvPrice, setRcvPrice] = useState('');
  const [rcvSupplier, setRcvSupplier] = useState('');
  const [rcvBatch, setRcvBatch] = useState('');
  const [rcvNotes, setRcvNotes] = useState('');
  const [rcvSaving, setRcvSaving] = useState(false);

  // --- Inventúra ---
  const [stocktakeFor, setStocktakeFor] = useState<ConsumableItem | null>(null);
  const [counted, setCounted] = useState('');
  const [stkDate, setStkDate] = useState(today());
  const [stkNotes, setStkNotes] = useState('');
  const [stkSaving, setStkSaving] = useState(false);

  // --- História ---
  const [historyFor, setHistoryFor] = useState<ConsumableItem | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('consumable_inventory')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      setItems((data as ConsumableItem[]) || []);
    } catch (err: any) {
      console.error('Fetch consumables error:', err);
      toast({ title: 'Chyba', description: 'Nepodarilo sa načítať položky.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = () => openAddDialog();
    window.addEventListener('inventory-add', handler);
    return () => window.removeEventListener('inventory-add', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingItem(null);
    setCategory('');
    setName('');
    setUnit('');
    setMinQuantity('');
    setUnitCost('');
    setPriceIncludesVat(true);
    setVatRate('20');
    setNotes('');
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: ConsumableItem) => {
    setEditingItem(item);
    setCategory(item.category);
    setName(item.name);
    setUnit(item.unit);
    setMinQuantity(item.min_quantity?.toString() || '');
    setUnitCost((item as any).unit_cost?.toString() || '');
    setPriceIncludesVat((item as any).price_includes_vat ?? true);
    setVatRate((item as any).vat_rate?.toString() || '20');
    setNotes(item.notes || '');
    setIsDialogOpen(true);
  };

  const categories = useMemo(() => [...new Set(items.map(i => i.category))], [items]);

  const itemsByCategory = useMemo(() =>
    categories.map(cat => ({
      category: cat,
      items: items.filter(i => i.category === cat),
    })),
    [items, categories]
  );

  const lowStockItems = useMemo(() =>
    items.filter(i => i.min_quantity != null && i.quantity <= i.min_quantity),
    [items]
  );

  // Uloženie DEFINÍCIE položky — množstvo sa tu NEMENÍ (rieši Naskladniť/Inventúra)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !name.trim() || !unit.trim()) {
      toast({ title: 'Chyba', description: 'Vyplň kategóriu, názov a jednotku.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const itemData: any = {
      category: category.trim(),
      name: name.trim(),
      unit: unit.trim(),
      min_quantity: minQuantity ? parseFloat(minQuantity) : null,
      unit_cost: unitCost ? parseFloat(unitCost) : 0,
      price_includes_vat: priceIncludesVat,
      vat_rate: vatRate ? parseFloat(vatRate) : 20,
      notes: notes || null,
    };

    try {
      if (editingItem) {
        // EDIT = len definícia, stav (quantity) necháme nedotknutý
        const { error } = await supabase
          .from('consumable_inventory')
          .update(itemData)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: 'Aktualizované', description: 'Položka bola upravená.' });
      } else {
        // NOVÁ položka začína na 0 — sklad sa dopĺňa cez „Naskladniť"
        const { error } = await supabase
          .from('consumable_inventory')
          .insert([{ ...itemData, quantity: 0 }]);
        if (error) throw error;
        toast({ title: 'Pridané', description: 'Nová položka vytvorená. Sklad doplň cez „Naskladniť".' });
      }
      setIsDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa uložiť.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('consumable_inventory').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Zmazané', description: 'Položka bola odstránená.' });
      setDeleteId(null);
      await fetchData();
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa zmazať.', variant: 'destructive' });
    }
  };

  // --- Naskladniť ---
  const openReceipt = (item: ConsumableItem) => {
    setReceiptFor(item);
    setRcvQty('');
    setRcvDate(today());
    setRcvPrice('');
    setRcvSupplier('');
    setRcvBatch('');
    setRcvNotes('');
  };

  const handleReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFor) return;
    const qty = parseFloat(rcvQty);
    if (!rcvQty || isNaN(qty) || qty <= 0) {
      toast({ title: 'Chyba', description: 'Zadaj kladné množstvo.', variant: 'destructive' });
      return;
    }
    setRcvSaving(true);
    try {
      const { error } = await supabase.rpc('add_consumable_receipt', {
        p_consumable_id: receiptFor.id,
        p_quantity: qty,
        p_occurred_on: rcvDate || today(),
        p_unit_price: rcvPrice ? parseFloat(rcvPrice) : null,
        p_supplier_id: rcvSupplier || null,
        p_batch: rcvBatch || null,
        p_notes: rcvNotes || null,
      });
      if (error) throw error;
      await fetchData();
      toast({ title: 'Naskladnené', description: `Pridané ${fmtAmt(qty, receiptFor.unit)}.` });
      setReceiptFor(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Naskladnenie sa nepodarilo.', variant: 'destructive' });
    } finally {
      setRcvSaving(false);
    }
  };

  // --- Inventúra ---
  const openStocktake = (item: ConsumableItem) => {
    setStocktakeFor(item);
    setCounted('');
    setStkDate(today());
    setStkNotes('');
  };

  const handleStocktake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stocktakeFor) return;
    const cnt = parseFloat(counted);
    if (counted === '' || isNaN(cnt) || cnt < 0) {
      toast({ title: 'Chyba', description: 'Zadaj napočítaný stav (0 alebo viac).', variant: 'destructive' });
      return;
    }
    setStkSaving(true);
    try {
      const { error } = await supabase.rpc('set_consumable_stocktake', {
        p_consumable_id: stocktakeFor.id,
        p_counted: cnt,
        p_occurred_on: stkDate || today(),
        p_notes: stkNotes || null,
      });
      if (error) throw error;
      await fetchData();
      toast({ title: 'Inventúra uložená', description: 'Stav bol upravený podľa napočítaného.' });
      setStocktakeFor(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Inventúra sa nepodarila.', variant: 'destructive' });
    } finally {
      setStkSaving(false);
    }
  };

  // --- História ---
  const openHistory = async (item: ConsumableItem) => {
    setHistoryFor(item);
    setLoadingHistory(true);
    setMovements([]);
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('item_kind', 'consumable')
        .eq('item_id', item.id)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setMovements(data || []);
    } catch (err: any) {
      toast({ title: 'Chyba', description: 'Nepodarilo sa načítať históriu.', variant: 'destructive' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const MOVEMENT_LABELS: Record<string, string> = {
    receipt: 'Naskladnenie',
    consumption: 'Spotreba',
    adjustment: 'Inventúra',
  };

  const countedDiff = stocktakeFor && counted !== '' && !isNaN(parseFloat(counted))
    ? parseFloat(counted) - (stocktakeFor.quantity || 0)
    : null;

  if (loading) return <TabSkeleton />;

  return (
    <>
      <LowStockBanner count={lowStockItems.length} label="položka" />

      {items.length === 0 ? (
        <EmptyTabState
          icon={ShoppingBag}
          title="Žiadny spotrebný materiál"
          description="Vytvor prvú položku. Sklad doplníš cez Naskladniť."
          onAdd={isAdmin ? openAddDialog : undefined}
          addLabel="Pridať položku"
        />
      ) : (
        <div className="space-y-4">
          {itemsByCategory.map(group => (
            <div key={group.category} className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc] flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#16a34a]" />
                <h3 className="text-sm font-bold text-[#0f172a]">{group.category}</h3>
                <span className="text-xs text-[#475569] ml-auto">{group.items.length}</span>
              </div>
              <div className="divide-y divide-[#e2e8f0]">
                {group.items.map(item => {
                  const low = item.min_quantity != null && item.quantity <= item.min_quantity;
                  const unitCostVal = (item as any).unit_cost;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'px-4 py-3 transition-colors',
                        low && 'bg-[#fef2f2]'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[#0f172a]">{item.name}</span>
                            {low && (
                              <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#fef2f2] text-[#dc2626] text-[10px] font-bold border border-[#fecaca]">
                                NÍZKE ZÁSOBY
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#475569] mt-0.5">
                            <span className="font-bold text-[#16a34a]">{fmtAmt(item.quantity, item.unit)}</span>
                            {item.min_quantity != null && (
                              <> • min. {fmtAmt(item.min_quantity, item.unit)}</>
                            )}
                            {unitCostVal > 0 && <> • {formatEur(unitCostVal)}/{item.unit}</>}
                          </p>
                          {item.notes && (
                            <div className="flex items-start gap-1.5 mt-1 text-xs text-[#475569]">
                              <StickyNote className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{item.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {isAdmin && (
                          <button
                            onClick={() => openReceipt(item)}
                            className="h-9 px-3 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <PackagePlus className="h-4 w-4" /> Naskladniť
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => openStocktake(item)}
                            className="h-9 px-3 rounded-lg border border-[#cbd5e1] text-[#2563eb] hover:bg-[#eff6ff] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <ClipboardCheck className="h-4 w-4" /> Inventúra
                          </button>
                        )}
                        <button
                          onClick={() => openHistory(item)}
                          className="h-9 px-3 rounded-lg border border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <History className="h-4 w-4" /> História
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditDialog(item)}
                              title="Upraviť"
                              className="h-9 w-9 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors ml-auto"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteId(item.id)}
                              title="Zmazať"
                              className="h-9 w-9 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== Definícia položky (Add/Edit) — bez množstva ===== */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">{editingItem ? 'Upraviť položku' : 'Nová položka'}</DialogTitle>
            <DialogDescription className="text-[#475569]">
              Definuj položku. Množstvo na sklade sa nemení tu — rieši ho „Naskladniť" a „Inventúra".
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="text-sm font-semibold text-[#374151]">Kategória *</Label>
              <Input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="napr. Čistiace prostriedky"
                list="consumable-categories"
                required
                className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
              <datalist id="consumable-categories">
                {categories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Názov *</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="napr. Dezinfekčný prostriedok"
                className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Jednotka *</Label>
                <Input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="ks, l, kg..."
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Min. množstvo</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Cena/jednotka (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">DPH (%)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={priceIncludesVat}
                onChange={(e) => setPriceIncludesVat(e.target.checked)}
                className="h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-[#0f172a]">Cena s DPH</span>
            </label>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => { setIsDialogOpen(false); resetForm(); }}
                disabled={saving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={saving || !category.trim() || !name.trim() || !unit.trim()}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingItem ? 'Uložiť' : 'Vytvoriť položku'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Naskladniť ===== */}
      <Dialog open={receiptFor !== null} onOpenChange={(open) => { if (!open) setReceiptFor(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">Naskladniť položku</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {receiptFor?.name} — aktuálne na sklade {fmtAmt(receiptFor?.quantity || 0, receiptFor?.unit)}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceipt} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Množstvo ({receiptFor?.unit || 'ks'}) *</Label>
                <Input
                  type="number" min="0" step="0.01" autoFocus
                  value={rcvQty}
                  onChange={(e) => setRcvQty(e.target.value)}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Dátum</Label>
                <Input
                  type="date"
                  value={rcvDate}
                  onChange={(e) => setRcvDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Cena/jednotka (€)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={rcvPrice}
                  onChange={(e) => setRcvPrice(e.target.value)}
                  placeholder="voliteľné"
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Šarža</Label>
                <Input
                  type="text"
                  value={rcvBatch}
                  onChange={(e) => setRcvBatch(e.target.value)}
                  placeholder="voliteľné"
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Dodávateľ</Label>
              <Select value={rcvSupplier} onValueChange={setRcvSupplier}>
                <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue placeholder="Vyber dodávateľa" /></SelectTrigger>
                <SelectContent>
                  {suppliersList.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={rcvNotes}
                onChange={(e) => setRcvNotes(e.target.value)}
                rows={2}
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => setReceiptFor(null)}
                disabled={rcvSaving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={rcvSaving || !rcvQty}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {rcvSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <PackagePlus className="h-4 w-4" /> Naskladniť
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Inventúra ===== */}
      <Dialog open={stocktakeFor !== null} onOpenChange={(open) => { if (!open) setStocktakeFor(null); }}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">Inventúra</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {stocktakeFor?.name} — systém eviduje {fmtAmt(stocktakeFor?.quantity || 0, stocktakeFor?.unit)}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStocktake} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Napočítaný stav ({stocktakeFor?.unit || 'ks'}) *</Label>
                <Input
                  type="number" min="0" step="0.01" autoFocus
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Dátum</Label>
                <Input
                  type="date"
                  value={stkDate}
                  onChange={(e) => setStkDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            {countedDiff !== null && countedDiff !== 0 && (
              <div className={cn(
                'text-xs font-semibold rounded-lg px-3 py-2 border',
                countedDiff > 0 ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]' : 'bg-[#fef2f2] border-[#fecaca] text-[#dc2626]'
              )}>
                Rozdiel oproti systému: {countedDiff > 0 ? '+' : ''}{fmtAmt(countedDiff, stocktakeFor?.unit)}
              </div>
            )}

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Poznámka</Label>
              <Textarea
                value={stkNotes}
                onChange={(e) => setStkNotes(e.target.value)}
                rows={2}
                placeholder="napr. dôvod rozdielu"
                className="resize-none text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <button
                type="button"
                onClick={() => setStocktakeFor(null)}
                disabled={stkSaving}
                className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={stkSaving || counted === ''}
                className="h-9 px-4 rounded-md bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {stkSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                <ClipboardCheck className="h-4 w-4" /> Uložiť inventúru
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== História pohybov ===== */}
      <Dialog open={historyFor !== null} onOpenChange={(open) => { if (!open) { setHistoryFor(null); setMovements([]); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">História pohybov</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {historyFor?.name} — aktuálne {fmtAmt(historyFor?.quantity || 0, historyFor?.unit)}
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="py-8 text-center text-sm text-[#64748b]">Načítavam…</div>
          ) : movements.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#64748b]">Zatiaľ žiadne pohyby.</div>
          ) : (
            <div className="space-y-2">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold',
                        m.movement_type === 'receipt' ? 'bg-[#dcfce7] text-[#166534]'
                          : m.movement_type === 'consumption' ? 'bg-[#fef2f2] text-[#dc2626]'
                          : 'bg-[#dbeafe] text-[#1e40af]'
                      )}>
                        {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      </span>
                      <span className="text-[11px] text-[#64748b]">{formatDate(m.occurred_on)}</span>
                    </div>
                    {m.notes && <p className="text-[11px] text-[#475569] mt-0.5 truncate">{m.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={cn('text-sm font-bold', m.quantity_delta >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]')}>
                      {m.quantity_delta > 0 ? '+' : ''}{fmtAmt(m.quantity_delta, historyFor?.unit)}
                    </div>
                    {m.balance_after != null && (
                      <div className="text-[10px] text-[#64748b]">stav: {fmtAmt(m.balance_after, historyFor?.unit)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => { setHistoryFor(null); setMovements([]); }}
              className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors"
            >
              Zavrieť
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať položku?</AlertDialogTitle>
            <AlertDialogDescription>
              Zmaže sa definícia položky aj jej stav a história pohybov. Táto akcia je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-[#dc2626] text-white hover:bg-[#b91c1c]"
            >
              Zmazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
