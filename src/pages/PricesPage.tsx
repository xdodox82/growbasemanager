import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { useCrops, useBlends } from '@/hooks/useSupabaseData';
import { usePrices, useVatSettings, DbPrice } from '@/hooks/usePrices';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Euro, Plus, Pencil, Trash2, Percent, Leaf, Blend, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const PACKAGING_SIZES = ['25g', '50g', '60g', '70g', '100g', '120g', '150g'];

const CUSTOMER_TYPES = [
  { value: 'all', label: 'Všetci zákazníci' },
  { value: 'home', label: 'Domáci' },
  { value: 'gastro', label: 'Gastro' },
  { value: 'wholesale', label: 'Veľkoobchod' },
];

const CATEGORY_ORDER = { microgreens: 0, microherbs: 1, edible_flowers: 2 };

interface PriceEntry {
  packagingSize: string;
  price: string;
  customerType: string;
}

interface GroupedPrice {
  itemId: string;
  itemName: string;
  isCrop: boolean;
  prices: DbPrice[];
}

const PricesPage = () => {
  const { data: crops, loading: cropsLoading } = useCrops();
  const { data: blends, loading: blendsLoading } = useBlends();
  const { data: prices, loading: pricesLoading, add: addPrice, addMany: addManyPrices, update: updatePrice, remove: deletePrice } = usePrices();
  const { data: vatSettings, loading: vatLoading, update: updateVatSettings, vatRate, isVatEnabled, calculateWithVat } = useVatSettings();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const isLoading = cropsLoading || blendsLoading || pricesLoading || vatLoading;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<DbPrice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('crops');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'microgreens' | 'microherbs' | 'edible_flowers'>('all');
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [customerTypeFilterView, setCustomerTypeFilterView] = useState<string>('all');
  
  // Multi-price form state
  const [formData, setFormData] = useState({
    cropId: '',
    blendId: '',
  });
  const [priceEntries, setPriceEntries] = useState<PriceEntry[]>([
    { packagingSize: '50g', price: '', customerType: 'home' }
  ]);

  const getCropName = (cropId: string | null) => {
    if (!cropId || !crops || crops.length === 0) return 'Neznáma plodina';
    return crops.find(c => c.id === cropId)?.name || 'Neznáma plodina';
  };

  const getBlendName = (blendId: string | null) => {
    if (!blendId || !blends || blends.length === 0) return 'Neznáma zmes';
    return blends.find(b => b.id === blendId)?.name || 'Neznáma zmes';
  };

  const getCustomerTypeLabel = (type: string) => {
    return CUSTOMER_TYPES.find(t => t.value === type)?.label || 'Všetci';
  };

  const sortedCrops = useMemo(() => {
    if (!crops || crops.length === 0) return [];
    return [...crops].sort((a, b) => {
      const orderA = CATEGORY_ORDER[a.category as keyof typeof CATEGORY_ORDER] ?? 99;
      const orderB = CATEGORY_ORDER[b.category as keyof typeof CATEGORY_ORDER] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, 'sk');
    });
  }, [crops]);

  const filteredCropsByCategory = useMemo(() => {
    if (categoryFilter === 'all') return sortedCrops;
    return sortedCrops.filter(crop => crop.category === categoryFilter);
  }, [sortedCrops, categoryFilter]);

  const cropPrices = useMemo(() => {
    if (!prices || prices.length === 0) return [];
    return prices.filter(p => p.crop_id !== null);
  }, [prices]);

  const blendPrices = useMemo(() => {
    if (!prices || prices.length === 0) return [];
    return prices.filter(p => p.blend_id !== null);
  }, [prices]);

  const filteredCropPrices = useMemo(() => {
    let result = cropPrices;

    // Crop filter
    if (cropFilter !== 'all') {
      result = result.filter(p => p.crop_id === cropFilter);
    } else if (categoryFilter !== 'all') {
      // Ak nie je vybraná konkrétna plodina, filtruj podľa kategórie
      const crop = crops.find(c => c.id === p.crop_id);
      result = result.filter(p => {
        const crop = crops.find(c => c.id === p.crop_id);
        return crop && crop.category === categoryFilter;
      });
    }

    // Customer filter
    if (customerTypeFilterView !== 'all') {
      result = result.filter(p => p.customer_type === customerTypeFilterView);
    }

    return result;
  }, [cropPrices, cropFilter, customerTypeFilterView, categoryFilter, crops]);

  const filteredBlendPrices = useMemo(() => {
    let result = blendPrices;
    if (customerTypeFilterView !== 'all') {
      result = result.filter(p => p.customer_type === customerTypeFilterView);
    }
    return result;
  }, [blendPrices, customerTypeFilterView]);

  // Group prices by crop/blend for cleaner display
  const groupedCropPrices = useMemo(() => {
    const groups: GroupedPrice[] = [];
    const processed = new Set<string>();

    filteredCropPrices.forEach(price => {
      const cropId = price.crop_id!;
      if (!processed.has(cropId)) {
        processed.add(cropId);
        const cropPricesForItem = filteredCropPrices.filter(p => p.crop_id === cropId);
        groups.push({
          itemId: cropId,
          itemName: getCropName(cropId),
          isCrop: true,
          prices: cropPricesForItem,
        });
      }
    });

    return groups.sort((a, b) => a.itemName.localeCompare(b.itemName, 'sk'));
  }, [filteredCropPrices]);

  const groupedBlendPrices = useMemo(() => {
    const groups: GroupedPrice[] = [];
    const processed = new Set<string>();

    filteredBlendPrices.forEach(price => {
      const blendId = price.blend_id!;
      if (!processed.has(blendId)) {
        processed.add(blendId);
        const blendPricesForItem = filteredBlendPrices.filter(p => p.blend_id === blendId);
        groups.push({
          itemId: blendId,
          itemName: getBlendName(blendId),
          isCrop: false,
          prices: blendPricesForItem,
        });
      }
    });

    return groups.sort((a, b) => a.itemName.localeCompare(b.itemName, 'sk'));
  }, [filteredBlendPrices]);

  const resetForm = () => {
    setFormData({
      cropId: '',
      blendId: '',
    });
    setPriceEntries([{ packagingSize: '50g', price: '', customerType: 'home' }]);
    setEditingPrice(null);
  };

  const openEditDialog = (cropId: string | null, blendId: string | null, existingPrices: DbPrice[]) => {
    setEditingPrice(null);
    setFormData({
      cropId: cropId || '',
      blendId: blendId || '',
    });

    if (existingPrices.length > 0) {
      setPriceEntries(existingPrices.map(p => ({
        packagingSize: p.packaging_size,
        price: p.unit_price.toString(),
        customerType: p.customer_type,
      })));
    } else {
      setPriceEntries([{ packagingSize: '50g', price: '', customerType: 'home' }]);
    }

    setIsDialogOpen(true);
  };

  const addPriceEntry = () => {
    setPriceEntries([...priceEntries, { packagingSize: '50g', price: '', customerType: 'home' }]);
  };

  const removePriceEntry = (index: number) => {
    if (priceEntries.length > 1) {
      setPriceEntries(priceEntries.filter((_, i) => i !== index));
    }
  };

  const updatePriceEntry = (index: number, field: keyof PriceEntry, value: string) => {
    setPriceEntries(priceEntries.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isCropPrice = activeTab === 'crops';

    if (isCropPrice && !formData.cropId) {
      toast({ title: 'Chyba', description: 'Vyberte plodinu', variant: 'destructive' });
      return;
    }

    if (!isCropPrice && !formData.blendId) {
      toast({ title: 'Chyba', description: 'Vyberte zmes', variant: 'destructive' });
      return;
    }

    const validEntries = priceEntries.filter(e => e.price && parseFloat(e.price) >= 0);

    if (validEntries.length === 0) {
      toast({ title: 'Chyba', description: 'Zadajte aspoň jednu cenu', variant: 'destructive' });
      return;
    }

    const itemId = isCropPrice ? formData.cropId : formData.blendId;
    const existingPrices = prices.filter(p =>
      isCropPrice ? p.crop_id === itemId : p.blend_id === itemId
    );

    for (const existingPrice of existingPrices) {
      await deletePrice(existingPrice.id);
    }

    const pricesToAdd = validEntries.map(entry => ({
      crop_id: isCropPrice ? formData.cropId : null,
      blend_id: !isCropPrice ? formData.blendId : null,
      packaging_size: entry.packagingSize,
      unit_price: parseFloat(entry.price),
      customer_type: entry.customerType,
    }));

    const success = await addManyPrices(pricesToAdd);

    if (success) {
      toast({
        title: 'Ceny uložené',
        description: `Uložených ${validEntries.length} cien`
      });
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const itemPrices = prices.filter(p =>
      activeTab === 'crops' ? p.crop_id === deleteId : p.blend_id === deleteId
    );

    for (const price of itemPrices) {
      await deletePrice(price.id);
    }

    toast({
      title: 'Ceny odstránené',
      description: `Odstránených ${itemPrices.length} cien`
    });
    setDeleteId(null);
  };

  const handleVatToggle = async (enabled: boolean) => {
    await updateVatSettings({ is_enabled: enabled });
  };

  const handleVatRateChange = async (rate: string) => {
    const rateNum = parseFloat(rate);
    if (!isNaN(rateNum) && rateNum >= 0 && rateNum <= 100) {
      await updateVatSettings({ vat_rate: rateNum });
    }
  };

  // Mobile grouped price card component
  const GroupedPriceCard = ({ group }: { group: GroupedPrice }) => (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="font-medium">{group.itemName}</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openEditDialog(
            group.isCrop ? group.itemId : null,
            group.isCrop ? null : group.itemId,
            group.prices
          )}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Upraviť
        </Button>
      </div>
      <div className="space-y-2">
        {group.prices.map(price => (
          <div key={price.id} className="flex items-center justify-between text-sm border-l-2 border-primary/20 pl-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{price.packaging_size}</Badge>
              <Badge variant="secondary" className="text-xs">{getCustomerTypeLabel(price.customer_type)}</Badge>
            </div>
            <span className="font-mono font-medium">{price.unit_price.toFixed(2)} €</span>
          </div>
        ))}
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Načítavam...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          title="Ceny"
          description="Nastavte ceny pre plodiny a zmesi podľa typu zákazníka"
        />

        {/* VAT Settings Card */}
        <Card className="p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Percent className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm md:text-base">Nastavenia DPH</h3>
                <p className="text-xs md:text-sm text-muted-foreground truncate">
                  {isVatEnabled 
                    ? `DPH ${vatRate}% je zapnuté` 
                    : 'DPH je vypnuté'}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 sm:justify-end">
              <div className="flex items-center gap-2">
                <Label htmlFor="vat-rate" className="text-sm whitespace-nowrap">Sadzba:</Label>
                <Input
                  id="vat-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={vatRate}
                  onChange={(e) => handleVatRateChange(e.target.value)}
                  className="w-20"
                  disabled={!isVatEnabled}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="vat-enabled"
                  checked={isVatEnabled}
                  onCheckedChange={handleVatToggle}
                />
                <Label htmlFor="vat-enabled" className="text-sm">
                  {isVatEnabled ? 'Zapnuté' : 'Vypnuté'}
                </Label>
              </div>
            </div>
          </div>
        </Card>

        {/* Prices Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col gap-3 md:gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="crops" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
                  <Leaf className="h-4 w-4" />
                  <span className="hidden xs:inline">Plodiny</span>
                  <span className="xs:hidden">Plod.</span>
                  ({cropPrices.length})
                </TabsTrigger>
                <TabsTrigger value="blends" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
                  <Blend className="h-4 w-4" />
                  <span className="hidden xs:inline">Zmesi</span>
                  <span className="xs:hidden">Zmes.</span>
                  ({blendPrices.length})
                </TabsTrigger>
              </TabsList>
              <Button 
                onClick={() => { resetForm(); setIsDialogOpen(true); }}
                className="w-full sm:w-auto"
                size={isMobile ? "default" : "default"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Pridať ceny
              </Button>
            </div>

            {/* Filters */}
            {activeTab === 'crops' ? (
              <div className="flex flex-col md:flex-row gap-4">
                {/* 1. KATEGÓRIA PLODINY - DROPDOWN */}
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Kategória plodiny</label>
                  <Select
                    value={categoryFilter}
                    onValueChange={(value: any) => {
                      setCategoryFilter(value);
                      setCropFilter('all');
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Všetky kategórie" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={5}
                      className="max-h-[300px]"
                    >
                      <SelectItem value="all">📋 Všetky kategórie</SelectItem>
                      <SelectItem value="microgreens">🌿 Mikrozelenina</SelectItem>
                      <SelectItem value="microherbs">🌱 Mikrobylinky</SelectItem>
                      <SelectItem value="edible_flowers">🌸 Jedlé kvety</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. PLODINA - DROPDOWN */}
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Plodina</label>
                  <Select value={cropFilter} onValueChange={setCropFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Všetky plodiny" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={5}
                      className="max-h-[300px]"
                    >
                      <SelectItem value="all">Všetky plodiny</SelectItem>
                      {filteredCropsByCategory.map(crop => (
                        <SelectItem key={crop.id} value={crop.id}>
                          {crop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. ZÁKAZNÍK - DROPDOWN */}
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Zákazník</label>
                  <Select value={customerTypeFilterView} onValueChange={setCustomerTypeFilterView}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Všetci zákazníci" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={5}
                      className="max-h-[300px]"
                    >
                      {CUSTOMER_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Select value={customerTypeFilterView} onValueChange={setCustomerTypeFilterView}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter podľa typu zákazníka" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    sideOffset={5}
                    className="max-h-[300px]"
                  >
                    {CUSTOMER_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <TabsContent value="crops">
            {groupedCropPrices.length === 0 ? (
              <EmptyState
                icon={<Euro className="h-12 w-12" />}
                title="Žiadne ceny"
                description="Zatiaľ nemáte nastavené žiadne ceny pre plodiny"
              />
            ) : isMobile ? (
              <div className="grid gap-3">
                {groupedCropPrices.map(group => (
                  <GroupedPriceCard key={group.itemId} group={group} />
                ))}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plodina</TableHead>
                      <TableHead>Počet cien</TableHead>
                      <TableHead className="text-right">Akcie</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedCropPrices.map(group => (
                      <TableRow key={group.itemId}>
                        <TableCell className="font-medium">
                          {group.itemName}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {group.prices.map((price, idx) => (
                              <span key={idx} className="text-xs text-muted-foreground">
                                {price.packaging_size} ({getCustomerTypeLabel(price.customer_type)}: {price.unit_price.toFixed(2)} €)
                                {idx < group.prices.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(group.itemId, null, group.prices)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(group.itemId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="blends">
            {groupedBlendPrices.length === 0 ? (
              <EmptyState
                icon={<Euro className="h-12 w-12" />}
                title="Žiadne ceny"
                description="Zatiaľ nemáte nastavené žiadne ceny pre zmesi"
              />
            ) : isMobile ? (
              <div className="grid gap-3">
                {groupedBlendPrices.map(group => (
                  <GroupedPriceCard key={group.itemId} group={group} />
                ))}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zmes</TableHead>
                      <TableHead>Počet cien</TableHead>
                      <TableHead className="text-right">Akcie</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedBlendPrices.map(group => (
                      <TableRow key={group.itemId}>
                        <TableCell className="font-medium">
                          {group.itemName}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {group.prices.map((price, idx) => (
                              <span key={idx} className="text-xs text-muted-foreground">
                                {price.packaging_size} ({getCustomerTypeLabel(price.customer_type)}: {price.unit_price.toFixed(2)} €)
                                {idx < group.prices.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(null, group.itemId, group.prices)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(group.itemId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formData.cropId || formData.blendId ? 'Upraviť ceny' : 'Pridať ceny'}
            </DialogTitle>
            <DialogDescription>
              Nastavte ceny pre rôzne balenia a typy zákazníkov
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'crops' ? (
              <div className="space-y-2">
                <Label>Plodina</Label>
                <Select
                  value={formData.cropId}
                  onValueChange={(value) => setFormData({ ...formData, cropId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte plodinu" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedCrops.map(crop => (
                      <SelectItem key={crop.id} value={crop.id}>
                        {crop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Zmes</Label>
                <Select
                  value={formData.blendId}
                  onValueChange={(value) => setFormData({ ...formData, blendId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte zmes" />
                  </SelectTrigger>
                  <SelectContent>
                    {blends.map(blend => (
                      <SelectItem key={blend.id} value={blend.id}>
                        {blend.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Ceny podľa balenia a typu zákazníka</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPriceEntry}>
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Pridať</span>
                  <span className="sm:hidden">+</span>
                </Button>
              </div>

              <div className="space-y-3">
                {priceEntries.map((entry, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[100px_1fr_130px_auto] gap-2 items-center border rounded-lg p-2">
                    <Select
                      value={entry.packagingSize}
                      onValueChange={(value) => updatePriceEntry(index, 'packagingSize', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PACKAGING_SIZES.map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={entry.price}
                        onChange={(e) => {
                          let value = e.target.value;
                          value = value.replace(',', '.');
                          value = value.replace(/[^0-9.]/g, '');
                          const parts = value.split('.');
                          if (parts.length > 2) {
                            value = parts[0] + '.' + parts.slice(1).join('');
                          }
                          updatePriceEntry(index, 'price', value);
                        }}
                        placeholder="0.00"
                        className="pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                    </div>

                    <Select
                      value={entry.customerType}
                      onValueChange={(value) => updatePriceEntry(index, 'customerType', value)}
                    >
                      <SelectTrigger className="w-full col-span-2 sm:col-span-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CUSTOMER_TYPES.filter(t => t.value !== 'all').map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {priceEntries.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removePriceEntry(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              {isVatEnabled && priceEntries.some(e => e.price) && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <p className="font-medium mb-1">S DPH ({vatRate}%):</p>
                  {priceEntries.filter(e => e.price).map((entry, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{entry.packagingSize}</span>
                      <span className="font-mono font-semibold text-primary">
                        {calculateWithVat(parseFloat(entry.price) || 0).toFixed(2)} €
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                Zrušiť
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                Uložiť ceny
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť všetky ceny?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Všetky ceny pre túto položku budú natrvalo odstránené.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto bg-destructive text-destructive-foreground">
              Odstrániť všetky ceny
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default PricesPage;
