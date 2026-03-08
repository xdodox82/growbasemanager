import { useState, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Package, AlertTriangle, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Checkbox } from '@/components/ui/checkbox';

type ConsumableItem = {
  id: string;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  min_quantity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export default function ConsumableInventoryPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ConsumableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ConsumableItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ConsumableItem | null>(null);

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
    setIsLoading(true);
    const { data, error } = await supabase
      .from('consumable_inventory')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      setItems(data || []);
    }
    setIsLoading(false);
  }, [toast]);

  usePullToRefresh(fetchData);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setCategory('');
    setName('');
    setQuantity('');
    setUnit('');
    setMinQuantity('');
    setUnitCost('');
    setPriceIncludesVat(true);
    setVatRate('20');
    setNotes('');
    setEditingItem(null);
  };

  const handleOpenDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!category || !name || !quantity || !unit) {
      toast({ title: 'Chyba', description: 'Vyplňte všetky povinné polia', variant: 'destructive' });
      return;
    }

    const quantityNum = parseFloat(quantity);
    const minQuantityNum = minQuantity ? parseFloat(minQuantity) : null;

    if (isNaN(quantityNum) || quantityNum < 0) {
      toast({ title: 'Chyba', description: 'Zadajte platné množstvo', variant: 'destructive' });
      return;
    }

    const itemData = {
      category,
      name,
      quantity: quantityNum,
      unit,
      min_quantity: minQuantityNum,
      unit_cost: unitCost ? parseFloat(unitCost) : 0,
      price_includes_vat: priceIncludesVat,
      vat_rate: vatRate ? parseFloat(vatRate) : 20,
      notes: notes || null,
    };

    if (editingItem) {
      const { error } = await supabase
        .from('consumable_inventory')
        .update(itemData)
        .eq('id', editingItem.id);

      if (error) {
        toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Úspech', description: 'Položka aktualizovaná' });
        setShowDialog(false);
        resetForm();
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('consumable_inventory')
        .insert([itemData]);

      if (error) {
        toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Úspech', description: 'Položka pridaná' });
        setShowDialog(false);
        resetForm();
        fetchData();
      }
    }
  };

  const handleEdit = (item: ConsumableItem) => {
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
    setShowDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('consumable_inventory')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Úspech', description: 'Položka vymazaná' });
      setDeleteId(null);
      fetchData();
    }
  };

  const categories = [...new Set(items.map(i => i.category))];
  const lowStockItems = items.filter(item =>
    item.min_quantity !== null && item.quantity <= item.min_quantity
  );

  const itemsByCategory = categories.map(cat => ({
    category: cat,
    items: items.filter(i => i.category === cat)
  }));

  return (
    <MainLayout>
      <PageHeader
        title="Spotrebný materiál"
        description="Evidencia spotrebného materiálu a pomôcok"
        action={
          <Button onClick={handleOpenDialog} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Pridať položku
          </Button>
        }
      />

      {lowStockItems.length > 0 && (
        <Card className="p-4 mb-6 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Nízky stav zásob</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                {lowStockItems.length} {lowStockItems.length === 1 ? 'položka má' : 'položky majú'} nízky stav zásob
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {lowStockItems.map(item => (
                  <Badge key={item.id} variant="outline" className="border-yellow-400 text-yellow-800 dark:text-yellow-200">
                    {item.name} ({item.quantity} {item.unit})
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8"><p className="text-center">Načítavam...</p></Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="Žiadne položky"
          description="Pridajte prvú položku spotrebného materiálu"
          action={
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Pridať prvú položku
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {itemsByCategory.map(({ category, items: categoryItems }) => (
            <Card key={category}>
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">{category}</h3>
                <p className="text-sm text-muted-foreground">{categoryItems.length} položiek</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Názov</TableHead>
                    <TableHead>Množstvo</TableHead>
                    <TableHead>Min. množstvo</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead className="text-right">Akcie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryItems.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                      console.log('🔍 Opening detail for consumable item:', item);
                      setSelectedItem(item);
                    }}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell>
                        {item.min_quantity ? `${item.min_quantity} ${item.unit}` : '-'}
                      </TableCell>
                      <TableCell>
                        {item.min_quantity && item.quantity <= item.min_quantity ? (
                          <Badge variant="destructive">Nízky stav</Badge>
                        ) : (
                          <Badge variant="outline">V poriadku</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(item.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog na pridanie/editáciu */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Upraviť položku' : 'Pridať novú položku'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Kategória *</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="napr. Čistiace prostriedky, Rukavice"
                list="categories"
              />
              <datalist id="categories">
                {categories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Názov *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="napr. Dezinfekcia, Jednorázové rukavice"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Množstvo *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="napr. 50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Jednotka *</Label>
                <Input
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="ks, kg, l, balenie"
                  list="units"
                />
                <datalist id="units">
                  <option value="ks" />
                  <option value="kg" />
                  <option value="l" />
                  <option value="balenie" />
                  <option value="škatuľa" />
                </datalist>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minQuantity">Min. množstvo (upozornenie)</Label>
              <Input
                id="minQuantity"
                type="number"
                step="0.01"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                placeholder="napr. 10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCost">Cena za jednotku (€)</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Nákupná cena za 1 {unit || 'jednotku'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="price-includes-vat-consumable"
                    checked={priceIncludesVat}
                    onCheckedChange={(checked) => setPriceIncludesVat(checked === true)}
                  />
                  <Label htmlFor="price-includes-vat-consumable" className="cursor-pointer">
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
              <Label htmlFor="notes">Poznámky</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Doplňujúce informácie"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Zrušiť
            </Button>
            <Button onClick={handleSubmit}>
              {editingItem ? 'Uložiť zmeny' : 'Pridať položku'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog na potvrdenie vymazania */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Naozaj chcete vymazať túto položku?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia sa nedá vrátiť späť. Položka bude natrvalo odstránená.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Vymazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DETAIL DIALÓG - VLASTNÉ RIEŠENIE BEZ SHADCN */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold">Detail položky</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Názov */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Názov</p>
                <p className="font-bold text-xl text-blue-900">
                  {selectedItem?.name || 'Bez názvu'}
                </p>
              </div>

              {/* Grid s detailmi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kategória */}
                {selectedItem?.category && (
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <p className="text-xs text-gray-500 uppercase mb-1">Kategória</p>
                    <p className="font-medium">{selectedItem.category}</p>
                  </div>
                )}

                {/* Množstvo */}
                {(selectedItem?.quantity !== null && selectedItem?.quantity !== undefined) && (
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <p className="text-xs text-gray-500 uppercase mb-1">Množstvo</p>
                    <p className="font-medium">{selectedItem.quantity} {selectedItem?.unit || 'ks'}</p>
                  </div>
                )}

                {/* Min. množstvo */}
                {selectedItem?.min_quantity && (
                  <div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
                    <p className="text-xs text-amber-700 uppercase mb-1">Min. množstvo</p>
                    <p className="font-medium text-amber-900">{selectedItem.min_quantity} {selectedItem?.unit || 'ks'}</p>
                  </div>
                )}

                {/* Cena */}
                {(selectedItem as any)?.unit_cost && (
                  <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                    <p className="text-xs text-green-700 uppercase mb-1">Cena za jednotku</p>
                    <p className="font-medium text-green-900">{(selectedItem as any).unit_cost}€</p>
                  </div>
                )}
              </div>

              {/* Stav */}
              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase mb-1">Stav</p>
                <div className="mt-1">
                  {selectedItem?.min_quantity && selectedItem?.quantity !== undefined && selectedItem.quantity <= selectedItem.min_quantity ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      Nízky stav
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      V poriadku
                    </span>
                  )}
                </div>
              </div>

              {/* Poznámky */}
              {selectedItem?.notes && (
                <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                  <p className="text-xs text-blue-700 uppercase mb-1">Poznámky</p>
                  <p className="text-sm text-gray-700">{selectedItem.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3 rounded-b-lg">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
              >
                Zavrieť
              </button>
              <button
                onClick={() => {
                  const itemToEdit = selectedItem;
                  setSelectedItem(null);
                  setTimeout(() => handleEdit(itemToEdit), 100);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Upraviť
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
