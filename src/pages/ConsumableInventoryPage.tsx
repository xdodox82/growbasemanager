import { useState, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
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
      />

      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">{editingItem ? 'Upraviť položku' : 'Pridať novú položku'}</h3>
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
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1">{editingItem ? 'Uložiť zmeny' : 'ULOŽIŤ POLOŽKU'}</Button>
            {editingItem && <Button variant="outline" onClick={resetForm}>Zrušiť úpravu</Button>}
          </div>
        </div>
      </Card>

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
                    <TableHead className="text-right">Množstvo</TableHead>
                    <TableHead className="text-right">Min. množstvo</TableHead>
                    <TableHead className="w-[100px]">Akcie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryItems.map((item) => {
                    const isLowStock = item.min_quantity !== null && item.quantity <= item.min_quantity;
                    return (
                      <TableRow
                        key={item.id}
                        className={`cursor-pointer hover:bg-gray-50 ${isLowStock ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}`}
                        onClick={() => handleEdit(item)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isLowStock && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.notes && <div className="text-sm text-muted-foreground">{item.notes}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.min_quantity ? `${item.min_quantity} ${item.unit}` : '-'}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteId(item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vymazať položku?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nenávratná. Položka bude trvalo odstránená.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Vymazať</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
