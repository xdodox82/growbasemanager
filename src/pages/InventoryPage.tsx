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
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [minStock, setMinStock] = useState('');
  const [unitPricePerKg, setUnitPricePerKg] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setBatchNumber('');
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
    setBatchNumber((seed as any).batch_number || '');
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
      batch_number: batchNumber || null,
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
                  {/* Header — klikateľný */}
                  <button
                    onClick={() => {
                      setExpandedCropIds(prev => {
                        const next = new Set(prev);
                        if (next.has(cropKey)) next.delete(cropKey); else next.add(cropKey);
                        return next;
                      });
                    }}
                    className="w-full p-4 flex items-center gap-3 hover:bg-[#f8fafc] transition-colors text-left"
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
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-[#94a3b8] flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-[#94a3b8] flex-shrink-0" />}
                  </button>

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
                                    onClick={() => openEditDialog(seed)}
                                    title="Upraviť"
                                    className="w-7 h-7 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {isAdmin && !isArchived && (
                                  <button
                                    onClick={() => setArchiveDialogId(seed.id)}
                                    title="Archivovať"
                                    className="w-7 h-7 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                                  >
                                    <Archive className="h-3.5 w-3.5" />
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
                <Label className="text-sm font-semibold text-[#374151]">Dátum nákupu</Label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Expirácia (mesiac/rok)</Label>
                <Input
                  type="month"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
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
            <div>
              <Label className="text-sm font-semibold text-[#374151]">Dátum naskladnenia</Label>
              <Input
                type="date"
                value={stockingDate}
                onChange={(e) => setStockingDate(e.target.value)}
                className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-[#374151]">Číslo šarže</Label>
              <Input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="napr. LOT-2026-001"
                className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
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
                disabled={saving || !cropId || !quantity}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
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
                    <div className="border-t border-[#e2e8f0] pt-3 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedSeed(null);
                          openEditDialog(selectedSeed);
                        }}
                        className="flex-1 h-9 px-3 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Upraviť
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSeed(null);
                          setArchiveDialogId(selectedSeed.id);
                        }}
                        className="h-9 px-3 rounded-lg border border-[#e2e8f0] text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archivovať
                      </button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};


// ===================== PACKAGING TAB =====================

const PackagingTab = ({ isAdmin, isMobile, toast, getSupplierName }: TabProps) => {
  const { data: packagings, add, update, remove } = usePackagings();
  const { data: suppliersList } = useSuppliers();

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState<DbPackaging | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('');
  // Nový pole — materiál obalu (rPET, PET, EKO, Papier, Iný).
  // Vyžaduje DB migráciu: ALTER TABLE packagings ADD COLUMN packaging_type text;
  const [packagingType, setPackagingType] = useState<string>('');
  const [size, setSize] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minStock, setMinStock] = useState('');
  const [pricePerPiece, setPricePerPiece] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [notes, setNotes] = useState('');

  // Listen for header "+" event
  useEffect(() => {
    const handler = () => openAddDialog();
    window.addEventListener('inventory-add', handler);
    return () => window.removeEventListener('inventory-add', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingPackaging(null);
    setName('');
    setType('');
    setPackagingType('');
    setSize('');
    setSupplierId('');
    setQuantity('');
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
    setName(p.name || '');
    setType(p.type || '');
    setPackagingType((p as any).packaging_type || '');
    setSize(p.size || '');
    setSupplierId(p.supplier_id || '');
    setQuantity(p.quantity?.toString() || '');
    setMinStock((p as any).min_stock?.toString() || '');
    setPricePerPiece((p as any).price_per_piece?.toString() || '');
    setPriceIncludesVat((p as any).price_includes_vat ?? true);
    setVatRate((p as any).vat_rate?.toString() || '20');
    setNotes(p.notes || '');
    setIsDialogOpen(true);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Chyba', description: 'Zadaj názov obalu.', variant: 'destructive' });
      return;
    }
    if (!quantity || isNaN(parseInt(quantity))) {
      toast({ title: 'Chyba', description: 'Zadaj platné množstvo.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const data: any = {
      name: name.trim(),
      type: type || null,
      packaging_type: packagingType || null,
      size: size || null,
      supplier_id: supplierId || null,
      quantity: parseInt(quantity),
      notes: notes || null,
      min_stock: minStock ? parseInt(minStock) : null,
      price_per_piece: pricePerPiece ? parseFloat(pricePerPiece) : 0,
      price_includes_vat: priceIncludesVat,
      vat_rate: vatRate ? parseFloat(vatRate) : 20,
    };

    try {
      if (editingPackaging) {
        const { error } = await update(editingPackaging.id, data);
        if (error) throw error;
        toast({ title: 'Aktualizované', description: 'Obal bol aktualizovaný.' });
      } else {
        const { error } = await add(data);
        if (error) throw error;
        toast({ title: 'Pridané', description: 'Obal bol pridaný do skladu.' });
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
      toast({ title: 'Zmazané', description: 'Obal bol odstránený.' });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa zmazať.', variant: 'destructive' });
    }
  };

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
          title="Žiadne obaly v sklade"
          description="Pridaj prvý obal do skladu."
          onAdd={isAdmin ? openAddDialog : undefined}
          addLabel="Pridať obal"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    <span className="text-[#475569]">Množstvo:</span>
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

                {isAdmin && (
                  <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[#e2e8f0]">
                    <button
                      onClick={() => openEditDialog(p)}
                      title="Upraviť"
                      className="w-7 h-7 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      title="Zmazať"
                      className="w-7 h-7 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">{editingPackaging ? 'Upraviť obal' : 'Pridať nový obal'}</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {editingPackaging ? 'Uprav údaje o obale.' : 'Vyplň údaje o obale.'}
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
                placeholder="napr. Krabička 500ml EKO"
                className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

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
                <Label className="text-sm font-semibold text-[#374151]">Veľkosť</Label>
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Množstvo (ks) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Min. limit (ks)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
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
                disabled={saving || !name.trim() || !quantity}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingPackaging ? 'Uložiť' : 'Pridať'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať obal?</AlertDialogTitle>
            <AlertDialogDescription>Táto akcia je nevratná.</AlertDialogDescription>
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
  const { data: substrates, add, update, remove } = useSubstrates();
  const { data: suppliersList } = useSuppliers();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubstrate, setEditingSubstrate] = useState<DbSubstrate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [type, setType] = useState<string>('coconut');
  const [customType, setCustomType] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [stockDate, setStockDate] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [quantityUnit, setQuantityUnit] = useState<'l' | 'kg'>('kg');
  const [unitCost, setUnitCost] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [notes, setNotes] = useState('');
  const [minStock, setMinStock] = useState('');

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
    setStockDate('');
    setQuantity('');
    setCurrentStock('');
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
    setStockDate((s as any).stock_date || '');
    setQuantity(s.quantity?.toString() || '');
    setCurrentStock((s as any).current_stock?.toString() || '');
    setQuantityUnit((s.unit as 'l' | 'kg') || 'kg');
    setUnitCost((s as any).unit_cost?.toString() || '');
    setPriceIncludesVat((s as any).price_includes_vat ?? true);
    setVatRate((s as any).vat_rate?.toString() || '20');
    setNotes(s.notes || '');
    setMinStock((s as any).min_stock?.toString() || '');
    setIsDialogOpen(true);
  };

  // Totals by type+unit
  const totals = useMemo(() => {
    const acc: Record<string, { type: string; unit: string; total: number }> = {};
    substrates.forEach(s => {
      const key = `${s.type || 'other'}-${s.unit || 'kg'}`;
      if (!acc[key]) {
        acc[key] = { type: s.type || 'other', unit: s.unit || 'kg', total: 0 };
      }
      // Use current_stock if available, else quantity
      const cs = (s as any).current_stock;
      acc[key].total += (cs != null && cs !== '') ? parseFloat(cs) : (s.quantity || 0);
    });
    return Object.values(acc);
  }, [substrates]);

  const lowStockItems = useMemo(() =>
    substrates.filter(s => {
      const cs = (s as any).current_stock;
      const stock = (cs != null && cs !== '') ? parseFloat(cs) : (s.quantity || 0);
      return isLowStock(stock, (s as any).min_stock);
    }),
    [substrates]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !quantity) {
      toast({ title: 'Chyba', description: 'Vyplň typ a množstvo.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const typeName = SUBSTRATE_TYPES[type] || type;
    const data: any = {
      name: typeName,
      type: type || null,
      custom_type: customType || null,
      supplier_id: supplierId || null,
      stock_date: stockDate || null,
      quantity: parseFloat(quantity),
      current_stock: currentStock ? parseFloat(currentStock) : parseFloat(quantity),
      unit: quantityUnit,
      notes: notes || null,
      min_stock: minStock ? parseFloat(minStock) : null,
      unit_cost: unitCost ? parseFloat(unitCost) : 0,
      price_includes_vat: priceIncludesVat,
      vat_rate: vatRate ? parseFloat(vatRate) : 20,
    };

    try {
      if (editingSubstrate) {
        const { error } = await update(editingSubstrate.id, data);
        if (error) throw error;
        toast({ title: 'Aktualizované', description: 'Substrát bol aktualizovaný.' });
      } else {
        const { error } = await add(data);
        if (error) throw error;
        toast({ title: 'Pridané', description: 'Substrát bol pridaný.' });
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
      toast({ title: 'Zmazané', description: 'Substrát bol odstránený.' });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa zmazať.', variant: 'destructive' });
    }
  };

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
          title="Žiadny substrát v sklade"
          description="Pridaj prvý substrát do skladu."
          onAdd={isAdmin ? openAddDialog : undefined}
          addLabel="Pridať substrát"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {substrates.map(s => {
            const cs = (s as any).current_stock;
            const stock = (cs != null && cs !== '') ? parseFloat(cs) : (s.quantity || 0);
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
                    <span className="text-[#475569]">Aktuálne:</span>
                    <span className="font-bold text-[#16a34a]">
                      {s.unit === 'kg' ? formatKg(stock) : `${formatNumber(stock, 1)} ${s.unit}`}
                    </span>
                  </div>
                  {s.quantity != null && cs != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Pôvodne:</span>
                      <span className="text-[#0f172a]">
                        {s.unit === 'kg' ? formatKg(s.quantity) : `${formatNumber(s.quantity)} ${s.unit}`}
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

                {isAdmin && (
                  <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[#e2e8f0]">
                    <button
                      onClick={() => openEditDialog(s)}
                      title="Upraviť"
                      className="w-7 h-7 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(s.id)}
                      title="Zmazať"
                      className="w-7 h-7 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">{editingSubstrate ? 'Upraviť substrát' : 'Pridať nový substrát'}</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {editingSubstrate ? 'Uprav údaje o substráte.' : 'Vyplň údaje o substráte.'}
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

            {(type === 'other' || type === 'coconut' || type === 'peat') && (
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
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-sm font-semibold text-[#374151]">Množstvo (pôvodne) *</Label>
                <Input
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
                <Select value={quantityUnit} onValueChange={(v) => setQuantityUnit(v as 'l' | 'kg')}>
                  <SelectTrigger className="h-10 text-sm mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="l">l</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Aktuálny stav ({quantityUnit})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  placeholder="Default = množstvo"
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
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
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Cena/{quantityUnit} (€)</Label>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                <Label className="text-sm font-semibold text-[#374151]">Dátum naskladnenia</Label>
                <Input
                  type="date"
                  value={stockDate}
                  onChange={(e) => setStockDate(e.target.value)}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
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
                disabled={saving || !quantity}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingSubstrate ? 'Uložiť' : 'Pridať'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať substrát?</AlertDialogTitle>
            <AlertDialogDescription>Táto akcia je nevratná.</AlertDialogDescription>
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
  const { data: labels, add, update, remove } = useLabels();
  const { data: suppliersList } = useSuppliers();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<DbLabel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'standard',
    size: '',
    quantity: 0,
    minStock: '',
    supplierId: '',
    unitCost: '',
    priceIncludesVat: true,
    vatRate: '20',
    notes: '',
  });

  useEffect(() => {
    const handler = () => openAddDialog();
    window.addEventListener('inventory-add', handler);
    return () => window.removeEventListener('inventory-add', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingLabel(null);
    setFormData({
      name: '',
      type: 'standard',
      size: '',
      quantity: 0,
      minStock: '',
      supplierId: '',
      unitCost: '',
      priceIncludesVat: true,
      vatRate: '20',
      notes: '',
    });
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (l: DbLabel) => {
    setEditingLabel(l);
    setFormData({
      name: l.name,
      type: l.type || 'standard',
      size: l.size || '',
      quantity: l.quantity || 0,
      minStock: (l as any).min_stock?.toString() || '',
      supplierId: l.supplier_id || '',
      unitCost: (l as any).unit_cost?.toString() || '',
      priceIncludesVat: (l as any).price_includes_vat ?? true,
      vatRate: (l as any).vat_rate?.toString() || '20',
      notes: l.notes || '',
    });
    setIsDialogOpen(true);
  };

  const lowStockItems = useMemo(() =>
    labels.filter(l => isLowStock(l.quantity, (l as any).min_stock)),
    [labels]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: 'Chyba', description: 'Zadaj názov etikety.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const data: any = {
      name: formData.name,
      type: formData.type,
      size: formData.size || null,
      quantity: formData.quantity,
      supplier_id: formData.supplierId || null,
      notes: formData.notes || null,
      min_stock: formData.minStock ? parseInt(formData.minStock) : null,
      unit_cost: formData.unitCost ? parseFloat(formData.unitCost) : 0,
      price_includes_vat: formData.priceIncludesVat,
      vat_rate: formData.vatRate ? parseFloat(formData.vatRate) : 20,
    };

    try {
      if (editingLabel) {
        const { error } = await update(editingLabel.id, data);
        if (error) throw error;
        toast({ title: 'Aktualizované', description: `${formData.name} bola upravená.` });
      } else {
        const { error } = await add(data);
        if (error) throw error;
        toast({ title: 'Pridané', description: `${formData.name} bola pridaná do skladu.` });
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
      toast({ title: 'Zmazané', description: 'Etiketa bola odstránená.' });
      setDeleteId(null);
    } catch (err: any) {
      toast({ title: 'Chyba', description: err.message || 'Nepodarilo sa zmazať.', variant: 'destructive' });
    }
  };

  return (
    <>
      <LowStockBanner count={lowStockItems.length} label="etiketa" />

      {labels.length === 0 ? (
        <EmptyTabState
          icon={Tag}
          title="Žiadne etikety v sklade"
          description="Pridaj prvú etiketu do skladu."
          onAdd={isAdmin ? openAddDialog : undefined}
          addLabel="Pridať etiketu"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {labels.map(l => {
            const low = isLowStock(l.quantity, (l as any).min_stock);
            const unitCost = (l as any).unit_cost;
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
                    <span className="text-[#475569]">Množstvo:</span>
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
                      <span className="text-[#0f172a]">{l.size}</span>
                    </div>
                  )}
                  {unitCost > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#475569]">Cena/ks:</span>
                      <span className="text-[#0f172a]">{formatEur(unitCost)}</span>
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

                {isAdmin && (
                  <div className="flex items-center gap-2 pt-3 mt-3 border-t border-[#e2e8f0]">
                    <button
                      onClick={() => openEditDialog(l)}
                      title="Upraviť"
                      className="w-7 h-7 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(l.id)}
                      title="Zmazať"
                      className="w-7 h-7 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">{editingLabel ? 'Upraviť etiketu' : 'Pridať novú etiketu'}</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {editingLabel ? 'Uprav údaje o etikete.' : 'Vyplň údaje o etikete.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="text-sm font-semibold text-[#374151]">Názov *</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="napr. Etiketa Reďkovka červená"
                className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Typ</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
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
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="napr. 50×30mm"
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Množstvo (ks) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.quantity === 0 ? '' : formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  required
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Min. limit (ks)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-sm font-semibold text-[#374151]">Cena/ks (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitCost}
                  onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
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
                  value={formData.vatRate}
                  onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })}
                  className="text-sm h-10 mt-1.5 bg-white border border-[#cbd5e1] focus:border-[#16a34a] focus:ring-1 focus:ring-[#16a34a]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.priceIncludesVat}
                onChange={(e) => setFormData({ ...formData, priceIncludesVat: e.target.checked })}
                className="h-4 w-4 rounded border-[#cbd5e1] text-[#16a34a] focus:ring-[#16a34a] focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-[#0f172a]">Cena s DPH</span>
            </label>

            <div>
              <Label className="text-sm font-semibold text-[#374151]">Dodávateľ</Label>
              <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
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
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                disabled={saving || !formData.name.trim()}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingLabel ? 'Uložiť' : 'Pridať'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať etiketu?</AlertDialogTitle>
            <AlertDialogDescription>Táto akcia je nevratná.</AlertDialogDescription>
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
  const [items, setItems] = useState<ConsumableItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsumableItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [notes, setNotes] = useState('');

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
    setQuantity('');
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
    setQuantity(item.quantity.toString());
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !name || !quantity || !unit) {
      toast({ title: 'Chyba', description: 'Vyplň všetky povinné polia.', variant: 'destructive' });
      return;
    }
    const qNum = parseFloat(quantity);
    if (isNaN(qNum) || qNum < 0) {
      toast({ title: 'Chyba', description: 'Zadaj platné množstvo.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const itemData: any = {
      category,
      name,
      quantity: qNum,
      unit,
      min_quantity: minQuantity ? parseFloat(minQuantity) : null,
      unit_cost: unitCost ? parseFloat(unitCost) : 0,
      price_includes_vat: priceIncludesVat,
      vat_rate: vatRate ? parseFloat(vatRate) : 20,
      notes: notes || null,
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('consumable_inventory')
          .update(itemData)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: 'Aktualizované', description: 'Položka bola upravená.' });
      } else {
        const { error } = await supabase
          .from('consumable_inventory')
          .insert([itemData]);
        if (error) throw error;
        toast({ title: 'Pridané', description: 'Položka bola pridaná.' });
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

  if (loading) return <TabSkeleton />;

  return (
    <>
      <LowStockBanner count={lowStockItems.length} label="položka" />

      {items.length === 0 ? (
        <EmptyTabState
          icon={ShoppingBag}
          title="Žiadny spotrebný materiál"
          description="Pridaj prvú položku spotrebného materiálu."
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
                        'px-4 py-3 flex items-start gap-3 transition-colors',
                        low && 'bg-[#fef2f2]'
                      )}
                    >
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
                          {item.unit === 'kg' ? (
                            <span className="font-bold text-[#16a34a]">{formatKg(item.quantity)}</span>
                          ) : (
                            <><span className="font-bold text-[#16a34a]">{formatNumber(item.quantity)}</span> {item.unit}</>
                          )}
                          {item.min_quantity != null && (
                            <> • min. {item.unit === 'kg' ? formatKg(item.min_quantity) : `${formatNumber(item.min_quantity)} ${item.unit}`}</>
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
                      {isAdmin && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => openEditDialog(item)}
                            title="Upraviť"
                            className="w-7 h-7 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            title="Zmazať"
                            className="w-7 h-7 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-[#0f172a]">{editingItem ? 'Upraviť položku' : 'Pridať novú položku'}</DialogTitle>
            <DialogDescription className="text-[#475569]">
              {editingItem ? 'Uprav údaje o položke.' : 'Vyplň údaje o spotrebnom materiáli.'}
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

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-sm font-semibold text-[#374151]">Množstvo *</Label>
                <Input
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
                disabled={saving || !category || !name || !quantity || !unit}
                className="h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingItem ? 'Uložiť' : 'Pridať'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať položku?</AlertDialogTitle>
            <AlertDialogDescription>Táto akcia je nevratná.</AlertDialogDescription>
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
