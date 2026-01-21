import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { useSubstrates, useSuppliers, DbSubstrate } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Layers, CalendarIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const SUBSTRATE_TYPES = {
  coconut: 'Kokos',
  peat: 'Rašelina',
  other: 'Iné',
};

export default function SubstratePage() {
  const { data: substrates, add: addSubstrate, update: updateSubstrate, remove: deleteSubstrate } = useSubstrates();
  const { data: suppliers } = useSuppliers();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubstrate, setEditingSubstrate] = useState<DbSubstrate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('coconut');
  const [customType, setCustomType] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [stockDate, setStockDate] = useState<Date | undefined>(undefined);
  const [quantity, setQuantity] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [quantityUnit, setQuantityUnit] = useState<'l' | 'kg'>('kg');
  const [unitCost, setUnitCost] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName('');
    setType('coconut');
    setCustomType('');
    setSupplierId('');
    setSupplier('');
    setStockDate(undefined);
    setQuantity('');
    setCurrentStock('');
    setQuantityUnit('kg');
    setUnitCost('');
    setPriceIncludesVat(true);
    setVatRate('20');
    setNotes('');
    setEditingSubstrate(null);
  };

  const handleSubmit = async () => {
    if (!type || !quantity) {
      toast({
        title: 'Chyba',
        description: 'Vyplňte druh substrátu a množstvo',
        variant: 'destructive',
      });
      return;
    }

    const typeName = SUBSTRATE_TYPES[type as keyof typeof SUBSTRATE_TYPES] || type;
    const substrateData = {
      name: typeName,
      type: type || null,
      custom_type: customType || null,
      supplier_id: supplierId || null,
      supplier: supplier || null,
      stock_date: stockDate ? format(stockDate, 'yyyy-MM-dd') : null,
      quantity: parseFloat(quantity),
      current_stock: currentStock ? parseFloat(currentStock) : parseFloat(quantity),
      unit: quantityUnit,
      notes: notes || null,
      min_stock: null,
      unit_cost: unitCost ? parseFloat(unitCost) : 0,
      price_includes_vat: priceIncludesVat,
      vat_rate: vatRate ? parseFloat(vatRate) : 20,
    };

    if (editingSubstrate) {
      const { error } = await updateSubstrate(editingSubstrate.id, substrateData);
      if (!error) {
        toast({ title: 'Substrát aktualizovaný', description: 'Záznám bol úspešne upravený' });
        resetForm();
        setIsDialogOpen(false);
      }
    } else {
      const { error } = await addSubstrate(substrateData);
      if (!error) {
        toast({ title: 'Substrát pridaný', description: 'Nový záznám bol úspešne pridaný' });
        resetForm();
        setIsDialogOpen(false);
      }
    }
  };

  const handleEdit = (substrate: DbSubstrate) => {
    setEditingSubstrate(substrate);
    setName(substrate.name);
    setType(substrate.type || 'coconut');
    setCustomType((substrate as any).custom_type || '');
    setSupplierId(substrate.supplier_id || '');
    setSupplier((substrate as any).supplier || '');
    setStockDate((substrate as any).stock_date ? new Date((substrate as any).stock_date) : undefined);
    setQuantity(substrate.quantity.toString());
    setCurrentStock((substrate as any).current_stock?.toString() || substrate.quantity.toString());
    setQuantityUnit((substrate.unit as 'l' | 'kg') || 'kg');
    setUnitCost((substrate as any).unit_cost?.toString() || '');
    setPriceIncludesVat((substrate as any).price_includes_vat ?? true);
    setVatRate((substrate as any).vat_rate?.toString() || '20');
    setNotes(substrate.notes || '');
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      const { error } = await deleteSubstrate(deleteId);
      if (!error) {
        toast({ title: 'Substrát vymazaný', description: 'Záznám bol úspešne odstránený' });
      }
      setDeleteId(null);
    }
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return '-';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || '-';
  };

  const getTypeName = (type: string | null) => {
    if (!type) return '-';
    return SUBSTRATE_TYPES[type as keyof typeof SUBSTRATE_TYPES] || type;
  };

  // Calculate totals by type and unit
  const totals = substrates.reduce((acc, s) => {
    const key = `${s.type || 'other'}-${s.unit || 'kg'}`;
    if (!acc[key]) {
      acc[key] = { type: s.type || 'other', unit: s.unit || 'kg', total: 0 };
    }
    acc[key].total += s.quantity;
    return acc;
  }, {} as Record<string, { type: string; unit: string; total: number }>);

  const renderGridView = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {substrates.map((substrate) => (
        <Card key={substrate.id} className="p-4 transition-all hover:border-primary/50 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{substrate.name}</h3>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {getTypeName(substrate.type)}
                </Badge>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(substrate)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(substrate.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Množstvo:</span>
              <span className="font-semibold">{substrate.quantity} {substrate.unit}</span>
            </div>
            {substrate.supplier_id && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dodávateľ:</span>
                <span>{getSupplierName(substrate.supplier_id)}</span>
              </div>
            )}
          </div>

          {substrate.notes && (
            <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3 truncate">
              {substrate.notes}
            </p>
          )}
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Názov</TableHead>
            <TableHead>Druh</TableHead>
            <TableHead className="hidden sm:table-cell">Dodávateľ</TableHead>
            <TableHead>Množstvo</TableHead>
            <TableHead className="hidden md:table-cell">Poznámky</TableHead>
            <TableHead className="text-right">Akcie</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {substrates.map((substrate) => (
            <TableRow
              key={substrate.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleEdit(substrate)}
            >
              <TableCell className="font-medium">{substrate.name}</TableCell>
              <TableCell>{getTypeName(substrate.type)}</TableCell>
              <TableCell className="hidden sm:table-cell">{getSupplierName(substrate.supplier_id)}</TableCell>
              <TableCell>{substrate.quantity} {substrate.unit}</TableCell>
              <TableCell className="hidden md:table-cell max-w-[200px] truncate">{substrate.notes || '-'}</TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(substrate)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(substrate.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <MainLayout>
      <PageHeader title="Substrát" description="Správa zásob substrátu">
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať substrát
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingSubstrate ? 'Upraviť záznám' : 'Pridať nový substrát'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Druh substrátu *</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte druh" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="peat">Rašelina</SelectItem>
                      <SelectItem value="coconut">Kokos</SelectItem>
                      <SelectItem value="other">Iné</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {type === 'other' && (
                  <div className="space-y-2">
                    <Label>Vlastný typ</Label>
                    <Input
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      placeholder="Napríklad: Perlít"
                    />
                  </div>
                )}
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
                        <SelectItem key={s.id} value={s.id}>{s.company_name || s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dodávateľ (text)</Label>
                  <Input
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Názov dodávateľa"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dátum naskladnenia</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !stockDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {stockDate ? format(stockDate, 'PPP', { locale: sk }) : 'Vyberte dátum'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover" align="start">
                    <Calendar
                      mode="single"
                      selected={stockDate}
                      onSelect={setStockDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Množstvo *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Zadajte množstvo"
                    />
                    <Select value={quantityUnit} onValueChange={(v) => setQuantityUnit(v as 'l' | 'kg')}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="l">l</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Aktuálny stav ({quantityUnit})</Label>
                  <Input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    placeholder="Automaticky rovnaký ako množstvo"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ponechajte prázdne pre automatické nastavenie
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cena za jednotku (€/{quantityUnit})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Nákupná cena za {quantityUnit === 'kg' ? 'kilogram' : 'liter'}
                </p>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Zrušiť
              </Button>
              <Button onClick={handleSubmit}>
                {editingSubstrate ? 'Uložiť zmeny' : 'Pridať'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </PageHeader>

      {/* Summary cards */}
      {substrates.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.values(totals).map((t, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">{SUBSTRATE_TYPES[t.type as keyof typeof SUBSTRATE_TYPES] || t.type}</div>
              <div className="text-2xl font-bold text-foreground">{Math.round(t.total)} {t.unit}</div>
            </div>
          ))}
        </div>
      )}

      {substrates.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title="Žiadny substrát"
          description="Začnite pridaním prvého záznamu o substráte"
          action={
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať substrát
            </Button>
          }
        />
      ) : viewMode === 'grid' ? renderGridView() : renderListView()}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť substrát?</AlertDialogTitle>
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
    </MainLayout>
  );
}