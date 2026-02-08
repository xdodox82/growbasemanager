import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { useLabels, useSuppliers, DbLabel } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
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
import { Tag, Plus, Pencil, Trash2, Package, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

const LABEL_TYPES = {
  standard: 'Štandardná',
  premium: 'Prémiová',
  eco: 'Ekologická',
  custom: 'Vlastná',
} as const;

export default function LabelsPage() {
  const { data: labels, loading, add, update, remove } = useLabels();
  const { data: suppliers } = useSuppliers();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<DbLabel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedLabel, setSelectedLabel] = useState<DbLabel | null>(null);

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

  const resetForm = () => {
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
    setEditingLabel(null);
  };

  const openEditDialog = (label: DbLabel) => {
    setEditingLabel(label);
    setFormData({
      name: label.name,
      type: label.type || 'standard',
      size: label.size || '',
      quantity: label.quantity,
      minStock: (label as any).min_stock?.toString() || '',
      supplierId: label.supplier_id || '',
      unitCost: (label as any).unit_cost?.toString() || '',
      priceIncludesVat: (label as any).price_includes_vat ?? true,
      vatRate: (label as any).vat_rate?.toString() || '20',
      notes: label.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Chyba',
        description: 'Zadajte názov etikety',
        variant: 'destructive',
      });
      return;
    }

    const labelData = {
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

    if (editingLabel) {
      const { error } = await update(editingLabel.id, labelData);
      if (!error) {
        toast({
          title: 'Etiketa aktualizovaná',
          description: `${formData.name} bola úspešne upravená.`,
        });
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await add(labelData);
      if (!error) {
        toast({
          title: 'Etiketa pridaná',
          description: `${formData.name} bola pridaná do skladu.`,
        });
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      const label = labels.find(l => l.id === deleteId);
      const { error } = await remove(deleteId);
      if (!error) {
        toast({
          title: 'Etiketa odstránená',
          description: `${label?.name} bola odstránená zo skladu.`,
        });
      }
      setDeleteId(null);
    }
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return '-';
    return suppliers.find(s => s.id === supplierId)?.name || '-';
  };

  const renderGridView = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {labels.map((label) => (
        <Card key={label.id} className="p-4 transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer" onClick={() => setSelectedLabel(label)}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{label.name}</h3>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {LABEL_TYPES[label.type as keyof typeof LABEL_TYPES] || label.type}
                </Badge>
              </div>
            </div>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(label)}>
                <Pencil className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(label.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Množstvo:</span>
              <span className="font-semibold">{label.quantity} ks</span>
            </div>
            {label.size && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Veľkosť:</span>
                <span>{label.size}</span>
              </div>
            )}
            {label.supplier_id && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dodávateľ:</span>
                <span>{getSupplierName(label.supplier_id)}</span>
              </div>
            )}
          </div>

          {label.notes && (
            <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3">
              {label.notes}
            </p>
          )}
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Názov</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="hidden sm:table-cell">Veľkosť</TableHead>
              <TableHead>Množstvo</TableHead>
              <TableHead className="hidden md:table-cell">Dodávateľ</TableHead>
              <TableHead className="w-24">Akcie</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {labels.map((label) => (
              <TableRow
                key={label.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => openEditDialog(label)}
              >
                <TableCell className="font-medium">{label.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {LABEL_TYPES[label.type as keyof typeof LABEL_TYPES] || label.type}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{label.size || '-'}</TableCell>
                <TableCell>{label.quantity} ks</TableCell>
                <TableCell className="hidden md:table-cell">{getSupplierName(label.supplier_id)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(label)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(label.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  return (
    <MainLayout>
      <PageHeader 
        title="Etikety" 
        description="Spravujte sklad etikiet"
      >
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať etiketu
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingLabel ? 'Upraviť etiketu' : 'Nová etiketa'}
                </DialogTitle>
                <DialogDescription>
                  Zadajte údaje o etikete.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Typ</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Štandardná</SelectItem>
                        <SelectItem value="premium">Prémiová</SelectItem>
                        <SelectItem value="eco">Ekologická</SelectItem>
                        <SelectItem value="custom">Vlastná</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="size">Veľkosť</Label>
                    <Input
                      id="size"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      placeholder="napr. 50x30mm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Množstvo (ks)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Dodávateľ</Label>
                    <Select 
                      value={formData.supplierId || "none"} 
                      onValueChange={(value) => setFormData({ ...formData, supplierId: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte dodávateľa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Žiadny</SelectItem>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.company_name || supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="unitCost">Cena za 1 ks (€)</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nákupná cena za 1 kus
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="price-includes-vat-label"
                        checked={formData.priceIncludesVat}
                        onCheckedChange={(checked) => setFormData({ ...formData, priceIncludesVat: checked === true })}
                      />
                      <Label htmlFor="price-includes-vat-label" className="cursor-pointer">
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
                      value={formData.vatRate}
                      onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })}
                      placeholder="20"
                    />
                    <p className="text-xs text-muted-foreground">
                      Výška DPH v percentách
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="minStock">Minimálny limit (ks)</Label>
                    <Input
                      id="minStock"
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      placeholder="Automatický limit"
                    />
                    <p className="text-xs text-muted-foreground">
                      Upozornenie pri poklese pod túto hodnotu
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Poznámky</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Ďalšie informácie..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Zrušiť
                </Button>
                <Button type="submit">
                  {editingLabel ? 'Uložiť zmeny' : 'Pridať etiketu'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </PageHeader>

      {labels.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-8 w-8" />}
          title="Žiadne etikety"
          description="Začnite pridaním vašej prvej etikety."
          action={
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať etiketu
            </Button>
          }
        />
      ) : viewMode === 'grid' ? renderGridView() : renderListView()}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť etiketu?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Etiketa bude permanentne odstránená.
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

      {/* Detail dialóg */}
      {selectedLabel && (
        <Dialog open={!!selectedLabel} onOpenChange={() => setSelectedLabel(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detail etikety</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Názov</p>
                <p className="font-medium text-lg">{selectedLabel.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Typ</p>
                  <p className="font-medium">{LABEL_TYPES[selectedLabel.type as keyof typeof LABEL_TYPES] || selectedLabel.type}</p>
                </div>

                {selectedLabel.size && (
                  <div>
                    <p className="text-sm text-muted-foreground">Veľkosť</p>
                    <p className="font-medium">{selectedLabel.size}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Množstvo</p>
                  <p className="font-medium">{selectedLabel.quantity} ks</p>
                </div>

                {selectedLabel.min_stock && (
                  <div>
                    <p className="text-sm text-muted-foreground">Min. stav</p>
                    <p className="font-medium">{selectedLabel.min_stock} ks</p>
                  </div>
                )}

                {selectedLabel.supplier_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">Dodávateľ</p>
                    <p className="font-medium">{getSupplierName(selectedLabel.supplier_id)}</p>
                  </div>
                )}

                {selectedLabel.unit_cost && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cena za kus</p>
                    <p className="font-medium">{selectedLabel.unit_cost}€</p>
                  </div>
                )}
              </div>

              {selectedLabel.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Poznámky</p>
                  <p className="text-sm">{selectedLabel.notes}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedLabel(null);
                  openEditDialog(selectedLabel);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Upraviť
              </Button>
              <Button variant="outline" onClick={() => setSelectedLabel(null)}>
                Zavrieť
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
}
