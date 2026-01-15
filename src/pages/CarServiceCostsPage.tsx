import { useState, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Edit, Trash2, Wrench, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

type CarServiceCost = {
  id: string;
  date: string;
  description: string;
  km_state: number | null;
  price: number;
  notes: string | null;
  created_at: string;
};

function CarServiceCostsPage() {
  const { toast } = useToast();
  const [costs, setCosts] = useState<CarServiceCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCost, setEditingCost] = useState<CarServiceCost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState('');
  const [kmState, setKmState] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('car_service_costs')
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
    setDescription('');
    setKmState('');
    setPrice('');
    setNotes('');
    setEditingCost(null);
  };

  const handleSubmit = async () => {
    if (!date || !description || !price) {
      toast({ title: 'Chyba', description: 'Vyplňte všetky povinné polia', variant: 'destructive' });
      return;
    }

    const priceNum = parseFloat(price);
    const kmStateNum = kmState ? parseFloat(kmState) : null;

    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: 'Chyba', description: 'Zadajte platnú cenu', variant: 'destructive' });
      return;
    }

    const costData = {
      date: format(date, 'yyyy-MM-dd'),
      description,
      km_state: kmStateNum,
      price: priceNum,
      notes: notes || null,
    };

    if (editingCost) {
      const { error } = await supabase
        .from('car_service_costs')
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
        .from('car_service_costs')
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

  const handleEdit = (cost: CarServiceCost) => {
    setEditingCost(cost);
    setDate(new Date(cost.date));
    setDescription(cost.description);
    setKmState(cost.km_state?.toString() || '');
    setPrice(cost.price.toString());
    setNotes(cost.notes || '');
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('car_service_costs')
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

  return (
    <MainLayout>
      <PageHeader
        title="Servis auta"
        description="Evidencia servisných úkonov a nákladov"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-4">
          <Card className="p-4 max-w-[500px]">
            <h3 className="text-base font-semibold mb-3">{editingCost ? 'Upraviť záznam' : 'Pridať nový záznam'}</h3>
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
                <Label htmlFor="description" className="text-sm">Popis úkonu *</Label>
                <Input
                  id="description"
                  className="h-10 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="napr. Výmena oleja"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kmState" className="text-sm">Stav KM</Label>
                <Input
                  id="kmState"
                  className="h-10 text-sm"
                  type="number"
                  value={kmState}
                  onChange={(e) => setKmState(e.target.value)}
                  placeholder="napr. 125000"
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
                  placeholder="napr. 85.50"
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
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Celkové náklady na servis</p>
                  <p className="text-2xl font-bold text-blue-900">{totalCost.toFixed(2)} €</p>
                </div>
                <Wrench className="h-8 w-8 text-blue-600" />
              </div>
            </Card>
          </div>

          <h3 className="text-base font-semibold mb-3">História záznamov</h3>
          {isLoading ? (
            <Card className="p-4"><p className="text-center text-sm">Načítavam...</p></Card>
          ) : costs.length === 0 ? (
            <EmptyState
              icon={<Wrench className="h-8 w-8" />}
              title="Žiadne záznamy"
              description="Pridajte prvý záznam servisu auta"
            />
          ) : (
            <Card className="overflow-x-auto">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Dátum</TableHead>
                <TableHead className="text-sm">Popis úkonu</TableHead>
                <TableHead className="text-sm">Stav KM</TableHead>
                <TableHead className="text-right text-sm">Cena</TableHead>
                <TableHead className="text-sm">Akcie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell className="text-sm">{format(new Date(cost.date), 'dd.MM.yyyy', { locale: sk })}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{cost.description}</div>
                      {cost.notes && <div className="text-xs text-muted-foreground">{cost.notes}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{cost.km_state ? `${cost.km_state.toLocaleString()} km` : '-'}</TableCell>
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

export default function CarServiceCostsPageWithErrorBoundary() {
  return (
    <ErrorBoundary fullScreen fallbackMessage="Chyba pri načítavaní nákladov na servis vozidiel">
      <CarServiceCostsPage />
    </ErrorBoundary>
  );
}
