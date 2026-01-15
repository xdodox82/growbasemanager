import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { Checkbox } from '@/components/ui/checkbox';
import { usePackagings, useSuppliers, DbPackaging } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { PackagingMappings } from '@/components/PackagingMappings';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const PACKAGING_KINDS = ['Pre zrezanú mikrozeleninu', 'Pre živú mikrozeleninu'] as const;
const PACKAGING_MATERIALS = ['rPET', 'PET', 'EKO'] as const;
const PACKAGING_SIZES = ['250ml', '500ml', '750ml', '1000ml', '1200ml'] as const;

export default function PackagingPage() {
  const { data: packagings, add: addPackaging, update: updatePackaging, remove: deletePackaging } = usePackagings();
  const { data: suppliers } = useSuppliers();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState<DbPackaging | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('');
  const [size, setSize] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minStock, setMinStock] = useState('');
  const [pricePerPiece, setPricePerPiece] = useState('');
  const [priceIncludesVat, setPriceIncludesVat] = useState(true);
  const [vatRate, setVatRate] = useState('20');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName('');
    setType('');
    setSize('');
    setSupplierId('');
    setQuantity('');
    setMinStock('');
    setPricePerPiece('');
    setPriceIncludesVat(true);
    setVatRate('20');
    setNotes('');
    setEditingPackaging(null);
  };

  const handleSubmit = async () => {
    if (!name || !quantity) {
      toast({
        title: 'Chyba',
        description: 'Vyplňte všetky povinné polia',
        variant: 'destructive',
      });
      return;
    }

    const packagingData = {
      name,
      type: type || null,
      size: size || null,
      supplier_id: supplierId || null,
      quantity: parseInt(quantity),
      notes: notes || null,
      min_stock: minStock ? parseInt(minStock) : null,
      price_per_piece: pricePerPiece ? parseFloat(pricePerPiece) : 0,
      price_includes_vat: priceIncludesVat,
      vat_rate: vatRate ? parseFloat(vatRate) : 20,
    };

    if (editingPackaging) {
      const { error } = await updatePackaging(editingPackaging.id, packagingData);
      if (!error) {
        toast({ title: 'Obal aktualizovaný', description: 'Záznám bol úspešne upravený' });
        resetForm();
        setIsDialogOpen(false);
      }
    } else {
      const { error } = await addPackaging(packagingData);
      if (!error) {
        toast({ title: 'Obal pridaný', description: 'Nový záznám bol úspešne pridaný' });
        resetForm();
        setIsDialogOpen(false);
      }
    }
  };

  const handleEdit = (packaging: DbPackaging) => {
    setEditingPackaging(packaging);
    setName(packaging.name);
    setType(packaging.type || '');
    setSize(packaging.size || '');
    setSupplierId(packaging.supplier_id || '');
    setQuantity(packaging.quantity.toString());
    setMinStock((packaging as any).min_stock?.toString() || '');
    setPricePerPiece((packaging as any).price_per_piece?.toString() || '');
    setPriceIncludesVat((packaging as any).price_includes_vat ?? true);
    setVatRate((packaging as any).vat_rate?.toString() || '20');
    setNotes(packaging.notes || '');
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      const { error } = await deletePackaging(deleteId);
      if (!error) {
        toast({ title: 'Obal vymazaný', description: 'Záznám bol úspešne odstránený' });
      }
      setDeleteId(null);
    }
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return '-';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || '-';
  };

  // Calculate total quantity by size
  const totalsBySize = PACKAGING_SIZES.reduce((acc, s) => {
    acc[s] = packagings.filter(p => p.size === s).reduce((sum, p) => sum + p.quantity, 0);
    return acc;
  }, {} as Record<string, number>);

  const renderGridView = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {packagings.map((packaging) => (
        <Card key={packaging.id} className="p-4 transition-all hover:border-primary/50 hover:shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{packaging.name}</h3>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {packaging.type && (
                    <Badge variant="secondary" className="text-xs">
                      {packaging.type}
                    </Badge>
                  )}
                  {packaging.size && (
                    <Badge variant="outline" className="text-xs">
                      {packaging.size}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(packaging)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(packaging.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Počet:</span>
              <span className="font-semibold">{packaging.quantity} ks</span>
            </div>
            {packaging.supplier_id && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dodávateľ:</span>
                <span>{getSupplierName(packaging.supplier_id)}</span>
              </div>
            )}
          </div>

          {packaging.notes && (
            <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3 truncate">
              {packaging.notes}
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
            <TableHead>Druh obalu</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Veľkosť</TableHead>
            <TableHead className="hidden md:table-cell">Dodávateľ</TableHead>
            <TableHead>Počet</TableHead>
            <TableHead className="hidden lg:table-cell">Poznámky</TableHead>
            <TableHead className="text-right">Akcie</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {packagings.map((packaging) => (
            <TableRow key={packaging.id}>
              <TableCell className="font-medium">{packaging.name}</TableCell>
              <TableCell>{packaging.type || '-'}</TableCell>
              <TableCell>{packaging.size || '-'}</TableCell>
              <TableCell className="hidden md:table-cell">{getSupplierName(packaging.supplier_id)}</TableCell>
              <TableCell>{packaging.quantity} ks</TableCell>
              <TableCell className="hidden lg:table-cell max-w-[200px] truncate">{packaging.notes || '-'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(packaging)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(packaging.id)}>
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
      <PageHeader title="Obaly" description="Správa zásob obalov">
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať obaly
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPackaging ? 'Upraviť záznám' : 'Pridať nové obaly'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Druh obalu *</Label>
                <Select value={name} onValueChange={setName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte druh obalu" />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGING_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Typ obalu</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte typ" />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKAGING_MATERIALS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Veľkosť</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte veľkosť" />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKAGING_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        <SelectItem key={s.id} value={s.id}>{s.company_name || s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Počet kusov *</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Zadajte počet"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimálny limit (ks)</Label>
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
                  <Label>Cena za 1 kus (€)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={pricePerPiece}
                    onChange={(e) => setPricePerPiece(e.target.value)}
                    placeholder="0.000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nákupná cena za jeden obal
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="price-includes-vat-packaging"
                      checked={priceIncludesVat}
                      onCheckedChange={(checked) => setPriceIncludesVat(checked === true)}
                    />
                    <Label htmlFor="price-includes-vat-packaging" className="cursor-pointer">
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
              <Button onClick={handleSubmit}>
                {editingPackaging ? 'Uložiť zmeny' : 'Pridať'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Summary cards */}
      {packagings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {PACKAGING_SIZES.map((s) => (
            <div key={s} className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">{s}</div>
              <div className="text-2xl font-bold text-foreground">{totalsBySize[s]} ks</div>
            </div>
          ))}
        </div>
      )}

      {packagings.length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="Žiadne obaly"
          description="Začnite pridaním prvého záznamu o obaloch"
          action={
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať obaly
            </Button>
          }
        />
      ) : viewMode === 'grid' ? renderGridView() : renderListView()}

      <div className="mt-8">
        <ErrorBoundary fallbackMessage="Chyba pri načítaní priradení obalov">
          <PackagingMappings />
        </ErrorBoundary>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť obal?</AlertDialogTitle>
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