import { useState, useRef, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Table, TableBody, TableHeader } from '@/components/ui/table';
import { MobileTableRow, MobileTableCell, MobileTableHead, ExpandedDetail } from '@/components/ui/mobile-table';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSeeds, useSuppliers, useCrops, DbSeed } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Wheat, CalendarIcon, FileText, Upload, X, ExternalLink, Archive, Undo2, Leaf, Sprout, Flower } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Extended seed type with new fields
type ExtendedSeed = DbSeed & {
  stocking_date?: string | null;
  consumption_start_date?: string | null;
  certificate_url?: string | null;
};

export default function SeedsPage() {
  const { data: seeds, add: addSeed, update: updateSeed, remove: deleteSeed, refetch } = useSeeds();
  const { data: crops } = useCrops();
  const { data: suppliers } = useSuppliers();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeed, setEditingSeed] = useState<DbSeed | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [archiveFilter, setArchiveFilter] = useState<'current' | 'archived'>('current');
  const [archiveDialogId, setArchiveDialogId] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Form states
  const [selectedCategory, setSelectedCategory] = useState<'microgreens' | 'microherbs' | 'edible_flowers'>('microgreens');
  const [cropId, setCropId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(undefined);
  const [stockingDate, setStockingDate] = useState<Date | undefined>(undefined);
  const [consumptionStartDate, setConsumptionStartDate] = useState<Date | undefined>(undefined);
  const [finishedDate, setFinishedDate] = useState<Date | undefined>(undefined);
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState<'kg' | 'g'>('kg');
  const [supplierId, setSupplierId] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [notes, setNotes] = useState('');
  const [minStock, setMinStock] = useState('');
  const [unitPricePerKg, setUnitPricePerKg] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Filter seeds by crop and archive status
  const filteredSeeds = seeds
    .filter(s => {
      const cropMatch = cropFilter === 'all' || s.crop_id === cropFilter;
      const archiveMatch = archiveFilter === 'current'
        ? !(s as any).finished_date
        : !!(s as any).finished_date;
      return cropMatch && archiveMatch;
    });

  // Calculate totals by crop type
  const seedTotalsByCrop = seeds.reduce((acc, seed) => {
    const cropId = seed.crop_id || 'unknown';
    const cropName = getCropName(cropId);
    if (!acc[cropId]) {
      acc[cropId] = { cropId, cropName, totalKg: 0, totalG: 0 };
    }
    if (seed.unit === 'kg') {
      acc[cropId].totalKg += seed.quantity;
    } else {
      acc[cropId].totalG += seed.quantity;
    }
    return acc;
  }, {} as Record<string, { cropId: string; cropName: string; totalKg: number; totalG: number }>);

  function getCropName(cropId: string | null): string {
    if (!cropId || cropId === 'unknown') return 'Neznámy';
    const crop = crops.find(c => c.id === cropId);
    return crop?.name || 'Neznámy';
  }

  const resetForm = () => {
    setSelectedCategory('microgreens');
    setCropId('');
    setPurchaseDate(undefined);
    setStockingDate(undefined);
    setConsumptionStartDate(undefined);
    setFinishedDate(undefined);
    setQuantity('');
    setQuantityUnit('kg');
    setSupplierId('');
    setLotNumber('');
    setExpiryDate(undefined);
    setExpiryMonth('');
    setExpiryYear('');
    setNotes('');
    setMinStock('');
    setUnitPricePerKg('');
    setPriceIncludesVat(true);
    setVatRate('20');
    setCertificateFile(null);
    setCertificateUrl(null);
    setEditingSeed(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Chyba',
          description: 'Povolený je len formát PDF',
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Chyba',
          description: 'Maximálna veľkosť súboru je 10MB',
          variant: 'destructive',
        });
        return;
      }
      setCertificateFile(file);
    }
  };

  const uploadCertificate = async (file: File): Promise<string | null> => {
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from('seed-certificates')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Chyba pri nahrávaní',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('seed-certificates')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!cropId || !quantity) {
      toast({
        title: 'Chyba',
        description: 'Vyplňte všetky povinné polia (druh a množstvo)',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    let uploadedCertificateUrl = certificateUrl;

    if (certificateFile) {
      uploadedCertificateUrl = await uploadCertificate(certificateFile);
      if (!uploadedCertificateUrl && certificateFile) {
        setIsUploading(false);
        return;
      }
    }

    // Create expiry date from month and year
    const expiryDateFormatted = expiryMonth && expiryYear
      ? `${expiryYear}-${expiryMonth}-01`
      : null;

    const formData = {
      crop_id: cropId,
      purchase_date: purchaseDate ? format(purchaseDate, 'yyyy-MM-dd') : null,
      stocking_date: stockingDate ? format(stockingDate, 'yyyy-MM-dd') : null,
      consumption_start_date: consumptionStartDate ? format(consumptionStartDate, 'yyyy-MM-dd') : null,
      finished_date: finishedDate ? format(finishedDate, 'yyyy-MM-dd') : null,
      quantity: parseFloat(quantity),
      unit: quantityUnit,
      supplier_id: supplierId || null,
      lot_number: lotNumber || null,
      expiry_date: expiryDateFormatted,
      notes: notes || null,
      certificate_url: uploadedCertificateUrl,
      min_stock: minStock ? parseFloat(minStock) : null,
      unit_price_per_kg: unitPricePerKg ? parseFloat(unitPricePerKg) : 0,
      price_includes_vat: priceIncludesVat,
      vat_rate: vatRate ? parseFloat(vatRate) : 20,
    };

    if (editingSeed) {
      const { error } = await updateSeed(editingSeed.id, formData as unknown as Partial<Omit<DbSeed, 'id' | 'created_at'>>);
      if (!error) {
        toast({ title: 'Semená aktualizované', description: 'Záznám bol úspešne upravený' });
        resetForm();
        setIsDialogOpen(false);
      }
    } else {
      const { error } = await addSeed(formData as unknown as Omit<DbSeed, 'id' | 'created_at'>);
      if (!error) {
        toast({ title: 'Semená pridané', description: 'Nový záznám bol úspešne pridaný' });
        resetForm();
        setIsDialogOpen(false);
      }
    }
    setIsUploading(false);
  };

  const handleEdit = (seed: DbSeed) => {
    const extSeed = seed as unknown as ExtendedSeed;
    setEditingSeed(seed);

    // Set category based on crop
    const crop = crops.find(c => c.id === seed.crop_id);
    if (crop && crop.category) {
      setSelectedCategory(crop.category as 'microgreens' | 'microherbs' | 'edible_flowers');
    }

    setCropId(seed.crop_id || '');
    setPurchaseDate(seed.purchase_date ? new Date(seed.purchase_date) : undefined);
    setStockingDate(extSeed.stocking_date ? new Date(extSeed.stocking_date) : undefined);
    setConsumptionStartDate(extSeed.consumption_start_date ? new Date(extSeed.consumption_start_date) : undefined);
    setFinishedDate((seed as any).finished_date ? new Date((seed as any).finished_date) : undefined);
    setQuantity(seed.quantity.toString());
    setQuantityUnit((seed.unit as 'kg' | 'g') || 'kg');
    setSupplierId(seed.supplier_id || '');
    setLotNumber(seed.lot_number || '');

    // Parse expiry date to month and year
    if (seed.expiry_date) {
      const expiryDateObj = new Date(seed.expiry_date);
      const month = (expiryDateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = expiryDateObj.getFullYear().toString();
      setExpiryMonth(month);
      setExpiryYear(year);
      setExpiryDate(expiryDateObj);
    } else {
      setExpiryMonth('');
      setExpiryYear('');
      setExpiryDate(undefined);
    }

    setNotes(seed.notes || '');
    setMinStock((seed as any).min_stock?.toString() || '');
    setUnitPricePerKg((seed as any).unit_price_per_kg?.toString() || '');
    setPriceIncludesVat((seed as any).price_includes_vat ?? true);
    setVatRate((seed as any).vat_rate?.toString() || '20');
    setCertificateUrl(extSeed.certificate_url || null);
    setCertificateFile(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      const { error } = await deleteSeed(deleteId);
      if (!error) {
        toast({ title: 'Semená vymazané', description: 'Záznám bol úspešne odstránený' });
      }
      setDeleteId(null);
    }
  };


  const handleArchiveSeed = async () => {
    if (!archiveDialogId) return;

    const { error } = await updateSeed(archiveDialogId, {
      finished_date: format(new Date(), 'yyyy-MM-dd')
    } as any);

    if (!error) {
      toast({
        title: 'Semená archivované',
        description: 'Položka bola presunutá do archívu'
      });
    }
    setArchiveDialogId(null);
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return '-';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.company_name || supplier?.name || '-';
  };

  const DatePickerField = ({ 
    label, 
    value, 
    onChange, 
    required = false 
  }: { 
    label: string; 
    value: Date | undefined; 
    onChange: (date: Date | undefined) => void;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <Label>{label} {required && '*'}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, 'PPP', { locale: sk }) : 'Vyberte dátum'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  const renderGridView = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredSeeds.map((seed) => {
        const extSeed = seed as unknown as ExtendedSeed;
        return (
          <Card key={seed.id} className="p-4 transition-all hover:border-primary/50 hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wheat className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{getCropName(seed.crop_id)}</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {seed.quantity} {seed.unit}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                {archiveFilter === 'current' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setArchiveDialogId(seed.id)}
                    title="Archivovať"
                  >
                    <Archive className="h-4 w-4 text-amber-600" />
                  </Button>
                )}
                {archiveFilter === 'archived' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={async () => {
                      const { error } = await updateSeed(seed.id, { finished_date: null });
                      if (!error) {
                        toast({ title: 'Úspech', description: 'Šarža vrátená do produkcie' });
                      }
                    }}
                    title="Vrátiť do produkcie"
                  >
                    <Undo2 className="h-4 w-4 text-green-600" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(seed)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(seed.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dodávateľ:</span>
                <span>{getSupplierName(seed.supplier_id)}</span>
              </div>
              {seed.lot_number && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Šarža:</span>
                  <span>{seed.lot_number}</span>
                </div>
              )}
              {extSeed.stocking_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Naskladnenie:</span>
                  <span>{format(new Date(extSeed.stocking_date), 'dd.MM.yyyy')}</span>
                </div>
              )}
              {extSeed.consumption_start_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Začiatok spotreby:</span>
                  <span>{format(new Date(extSeed.consumption_start_date), 'dd.MM.yyyy')}</span>
                </div>
              )}
              {seed.purchase_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Nákup:</span>
                  <span>{format(new Date(seed.purchase_date), 'dd.MM.yyyy')}</span>
                </div>
              )}
              {seed.expiry_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expirácia:</span>
                  <span>{format(new Date(seed.expiry_date), 'dd.MM.yyyy')}</span>
                </div>
              )}
              {extSeed.certificate_url && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Certifikát:</span>
                  <a 
                    href={extSeed.certificate_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    Zobraziť
                  </a>
                </div>
              )}
            </div>

            {seed.notes && (
              <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3 truncate">
                {seed.notes}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <MobileTableRow>
              <MobileTableHead>Druh</MobileTableHead>
              <MobileTableHead>Množstvo</MobileTableHead>
              <MobileTableHead hideOnMobile>Dodávateľ</MobileTableHead>
              <MobileTableHead hideOnMobile>Šarža</MobileTableHead>
              <MobileTableHead hideOnMobile>Naskladnenie</MobileTableHead>
              <MobileTableHead hideOnMobile>Expirácia</MobileTableHead>
              <MobileTableHead hideOnMobile>Certifikát</MobileTableHead>
              <MobileTableHead className="text-right">Akcie</MobileTableHead>
              {isMobile && <MobileTableHead className="w-10"></MobileTableHead>}
            </MobileTableRow>
          </TableHeader>
          <TableBody>
            {filteredSeeds.map((seed) => {
              const extSeed = seed as unknown as ExtendedSeed;
              return (
                <MobileTableRow
                  key={seed.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleEdit(seed)}
                  expandedContent={
                    <>
                      <ExpandedDetail label="Dodávateľ" value={getSupplierName(seed.supplier_id)} />
                      <ExpandedDetail label="Šarža" value={seed.lot_number || '-'} />
                      <ExpandedDetail label="Naskladnenie" value={extSeed.stocking_date ? format(new Date(extSeed.stocking_date), 'dd.MM.yyyy') : '-'} />
                      <ExpandedDetail label="Expirácia" value={seed.expiry_date ? format(new Date(seed.expiry_date), 'dd.MM.yyyy') : '-'} />
                      {extSeed.certificate_url && (
                        <div className="pt-2">
                          <a 
                            href={extSeed.certificate_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Zobraziť certifikát
                          </a>
                        </div>
                      )}
                    </>
                  }
                >
                  <MobileTableCell className="font-medium">{getCropName(seed.crop_id)}</MobileTableCell>
                  <MobileTableCell>{seed.quantity} {seed.unit}</MobileTableCell>
                  <MobileTableCell hideOnMobile>{getSupplierName(seed.supplier_id)}</MobileTableCell>
                  <MobileTableCell hideOnMobile>{seed.lot_number || '-'}</MobileTableCell>
                  <MobileTableCell hideOnMobile>
                    {extSeed.stocking_date ? format(new Date(extSeed.stocking_date), 'dd.MM.yyyy') : '-'}
                  </MobileTableCell>
                  <MobileTableCell hideOnMobile>
                    {seed.expiry_date ? format(new Date(seed.expiry_date), 'dd.MM.yyyy') : '-'}
                  </MobileTableCell>
                  <MobileTableCell hideOnMobile>
                    {extSeed.certificate_url ? (
                      <a 
                        href={extSeed.certificate_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        PDF
                      </a>
                    ) : '-'}
                  </MobileTableCell>
                  <MobileTableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      {archiveFilter === 'archived' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const { error } = await updateSeed(seed.id, { finished_date: null });
                            if (!error) {
                              toast({ title: 'Úspech', description: 'Šarža vrátená do produkcie' });
                            }
                          }}
                          title="Vrátiť do produkcie"
                        >
                          <Undo2 className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(seed)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(seed.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </MobileTableCell>
                </MobileTableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </PullToRefresh>
  );

  return (
    <MainLayout>
      <PageHeader title="Semená" description="Správa zásob semien mikrozeleniny">
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať semená
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSeed ? 'Upraviť záznám' : 'Pridať nové semená'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Category Selection */}
              <div className="space-y-2">
                <Label>Kategória *</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('microgreens')}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all",
                      selectedCategory === 'microgreens'
                        ? 'border-green-500 bg-green-50'
                        : 'border-border hover:border-green-300'
                    )}
                  >
                    <Leaf className="h-8 w-8 text-green-600 mb-2" />
                    <span className="text-sm font-medium">Mikrozelenina</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('microherbs')}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all",
                      selectedCategory === 'microherbs'
                        ? 'border-green-500 bg-green-50'
                        : 'border-border hover:border-green-300'
                    )}
                  >
                    <Sprout className="h-8 w-8 text-green-600 mb-2" />
                    <span className="text-sm font-medium">Mikrobylinky</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('edible_flowers')}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all",
                      selectedCategory === 'edible_flowers'
                        ? 'border-green-500 bg-green-50'
                        : 'border-border hover:border-green-300'
                    )}
                  >
                    <Flower className="h-8 w-8 text-green-600 mb-2" />
                    <span className="text-sm font-medium">Jedlé kvety</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Druh semien *</Label>
                  <Select value={cropId} onValueChange={setCropId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte druh" />
                    </SelectTrigger>
                    <SelectContent>
                      {crops
                        .filter(crop => crop.category === selectedCategory)
                        .map((crop) => (
                          <SelectItem key={crop.id} value={crop.id}>
                            {crop.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Množstvo *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Zadajte množstvo"
                    />
                    <Select value={quantityUnit} onValueChange={(v) => setQuantityUnit(v as 'kg' | 'g')}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dodávateľ</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte dodávateľa" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Číslo šarže</Label>
                  <Input
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Zadajte číslo šarže"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DatePickerField
                  label="Dátum naskladnenia"
                  value={stockingDate}
                  onChange={setStockingDate}
                />
                <DatePickerField
                  label="Začiatok spotreby"
                  value={consumptionStartDate}
                  onChange={setConsumptionStartDate}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DatePickerField
                  label="Dátum nákupu"
                  value={purchaseDate}
                  onChange={setPurchaseDate}
                />
                <div className="space-y-2">
                  <Label>Dátum expirácie</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={expiryMonth} onValueChange={setExpiryMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Mesiac" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-</SelectItem>
                        <SelectItem value="01">Január</SelectItem>
                        <SelectItem value="02">Február</SelectItem>
                        <SelectItem value="03">Marec</SelectItem>
                        <SelectItem value="04">Apríl</SelectItem>
                        <SelectItem value="05">Máj</SelectItem>
                        <SelectItem value="06">Jún</SelectItem>
                        <SelectItem value="07">Júl</SelectItem>
                        <SelectItem value="08">August</SelectItem>
                        <SelectItem value="09">September</SelectItem>
                        <SelectItem value="10">Október</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={expiryYear} onValueChange={setExpiryYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Rok" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-</SelectItem>
                        {(() => {
                          const currentYear = new Date().getFullYear();
                          const years = [];
                          for (let i = 0; i <= 10; i++) {
                            years.push(currentYear + i);
                          }
                          return years.map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  {expiryMonth && expiryYear && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Expirácia: {expiryMonth}/{expiryYear.substring(2)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <DatePickerField
                  label="Dátum ukončenia spotreby"
                  value={finishedDate}
                  onChange={setFinishedDate}
                />
                {finishedDate && (
                  <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                    ⚠️ Po uložení sa táto šarža presunie do archívu spotrebovaných semien.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>PDF Certifikát</Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {certificateFile ? 'Zmeniť súbor' : 'Nahrať PDF'}
                  </Button>
                  {certificateFile && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="truncate max-w-[150px]">{certificateFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setCertificateFile(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {!certificateFile && certificateUrl && (
                    <a 
                      href={certificateUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Aktuálny certifikát
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimálny limit ({quantityUnit})</Label>
                  <Input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    placeholder="Automatický limit"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upozornenie pri poklese pod túto hodnotu
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Cena za 1 kg (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={unitPricePerKg}
                    onChange={(e) => setUnitPricePerKg(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nákupná cena za kilogram
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="price-includes-vat"
                      checked={priceIncludesVat}
                      onCheckedChange={(checked) => setPriceIncludesVat(checked === true)}
                    />
                    <Label htmlFor="price-includes-vat" className="cursor-pointer">
                      Cena je s DPH
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ak je zaškrtnuté, cena obsahuje DPH
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Sadzba DPH (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    placeholder="20"
                  />
                  <p className="text-xs text-muted-foreground">
                    Výška DPH v percentách
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Poznámky</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Voliteľné poznámky"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Zrušiť
              </Button>
              <Button onClick={handleSubmit} disabled={isUploading}>
                {isUploading ? 'Nahrávam...' : editingSeed ? 'Uložiť zmeny' : 'Pridať'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        <Tabs value={archiveFilter} onValueChange={(v) => setArchiveFilter(v as 'current' | 'archived')}>
          <TabsList>
            <TabsTrigger value="current">Aktuálne zásoby</TabsTrigger>
            <TabsTrigger value="archived">Archív</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={cropFilter} onValueChange={setCropFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter podľa druhu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky druhy</SelectItem>
            {crops.map((crop) => (
              <SelectItem key={crop.id} value={crop.id}>{crop.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {seeds.length === 0 ? (
        <EmptyState
          icon={<Wheat className="h-12 w-12" />}
          title="Žiadne semená"
          description="Začnite pridaním prvého záznamu o seminách"
          action={
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať semená
            </Button>
          }
        />
      ) : viewMode === 'grid' ? renderGridView() : renderListView()}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť semená?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Záznám bude permanentne odstránený.
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

      <AlertDialog open={!!archiveDialogId} onOpenChange={() => setArchiveDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivovať semená?</AlertDialogTitle>
            <AlertDialogDescription>
              Položka bude označená ako spotrebovaná a presunutá do archívu. Dátum ukončenia spotreby bude nastavený na dnes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveSeed} className="bg-amber-600 hover:bg-amber-700">
              Archivovať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
