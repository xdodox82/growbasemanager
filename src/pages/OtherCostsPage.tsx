import { useState, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Edit, Trash2, Receipt, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

type OtherCost = {
  id: string;
  date: string;
  category: string;
  description: string;
  price: number;
  notes: string | null;
  created_at: string;
};

function OtherCostsPage() {
  const { toast } = useToast();
  const [costs, setCosts] = useState<OtherCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCost, setEditingCost] = useState<OtherCost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('other_costs')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      setCosts(data || []);
    }
    setIsLoading(false);
  }, [toast]);

  usePullToRefresh(fetchData);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setDate(new Date());
    setCategory('');
    setDescription('');
    setPrice('');
    setNotes('');
    setEditingCost(null);
  };

  const handleSubmit = async () => {
    if (!date || !category || !description || !price) {
      toast({ title: 'Chyba', description: 'Vyplňte všetky povinné polia', variant: 'destructive' });
      return;
    }

    const priceNum = parseFloat(price);

    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: 'Chyba', description: 'Zadajte platnú cenu', variant: 'destructive' });
      return;
    }

    const costData = {
      date: format(date, 'yyyy-MM-dd'),
      category,
      description,
      price: priceNum,
      notes: notes || null,
    };

    if (editingCost) {
      const { error } = await supabase
        .from('other_costs')
        .update(costData)
        .eq('id', editingCost.id);

      if (error) {
        toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Úspech', description: 'Záznam aktualizovaný' });
        resetForm();
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('other_costs')
        .insert([costData]);

      if (error) {
        toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Úspech', description: 'Záznam pridaný' });
        resetForm();
        fetchData();
      }
    }
  };

  const handleEdit = (cost: OtherCost) => {
    setEditingCost(cost);
    setDate(new Date(cost.date));
    setCategory(cost.category);
    setDescription(cost.description);
    setPrice(cost.price.toString());
    setNotes(cost.notes || '');
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('other_costs')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Úspech', description: 'Záznam vymazaný' });
      setDeleteId(null);
      fetchData();
    }
  };

  const totalCost = costs.reduce((sum, cost) => sum + cost.price, 0);
  const categories = [...new Set(costs.map(c => c.category))];
  const costsByCategory = categories.map(cat => ({
    category: cat,
    total: costs.filter(c => c.category === cat).reduce((sum, c) => sum + c.price, 0)
  }));

  return (
    <MainLayout>
      <PageHeader
        title="Ostatné réžie"
        description="Evidencia ostatných nákladov a režijných výdavkov"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-4">
          <Card className="p-4 max-w-[500px]">
            <h3 className="text-base font-semibold mb-3">{editingCost ? 'Upraviť náklad' : 'Pridať nový náklad'}</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Dátum *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full h-10 justify-start text-left font-normal text-sm", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'dd.MM.yyyy', { locale: sk }) : "Vyberte dátum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} locale={sk} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-sm">Kategória *</Label>
                <Input
                  id="category"
                  className="h-10 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="napr. Nájom, Poistenie"
                  list="categories"
                />
                <datalist id="categories">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm">Popis *</Label>
                <Input
                  id="description"
                  className="h-10 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Stručný popis nákladu"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-sm">Cena (€) *</Label>
                <Input
                  id="price"
                  className="h-10 text-sm"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="napr. 150.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm">Poznámky</Label>
                <Textarea
                  id="notes"
                  className="text-sm"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Doplňujúce informácie"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} className="flex-1 h-10 text-sm">{editingCost ? 'Uložiť' : 'ULOŽIŤ'}</Button>
                {editingCost && <Button variant="outline" className="h-10 text-sm" onClick={resetForm}>Zrušiť</Button>}
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8">
          <div className="space-y-3 mb-6">
            <h3 className="text-base font-semibold">Prehľad</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Celkové náklady</p>
                    <p className="text-2xl font-bold text-blue-900">{totalCost.toFixed(2)} €</p>
                  </div>
                  <Receipt className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              {costsByCategory.slice(0, 2).map(({ category, total }) => (
                <Card key={category} className="p-4 bg-gradient-to-br from-green-50 to-green-100">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{category}</p>
                    <p className="text-2xl font-bold text-green-900">{total.toFixed(2)} €</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <h3 className="text-base font-semibold mb-3">História záznamov</h3>
          {isLoading ? (
            <Card className="p-4"><p className="text-center text-sm">Načítavam...</p></Card>
          ) : costs.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-8 w-8" />}
              title="Žiadne záznamy"
              description="Pridajte prvý záznam ostatných nákladov"
            />
          ) : (
            <Card className="overflow-x-auto">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Dátum</TableHead>
                <TableHead className="text-sm">Kategória</TableHead>
                <TableHead className="text-sm">Popis</TableHead>
                <TableHead className="text-right text-sm">Cena</TableHead>
                <TableHead className="text-sm">Akcie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell className="text-sm">{format(new Date(cost.date), 'dd.MM.yyyy', { locale: sk })}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{cost.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{cost.description}</div>
                      {cost.notes && <div className="text-xs text-muted-foreground">{cost.notes}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold">{cost.price.toFixed(2)} €</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(cost)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(cost.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vymazať záznam?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nenávratná. Záznam bude trvalo odstránený.
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

export default function OtherCostsPageWithErrorBoundary() {
  return (
    <ErrorBoundary fullScreen fallbackMessage="Chyba pri načítavaní ostatných nákladov">
      <OtherCostsPage />
    </ErrorBoundary>
  );
}
