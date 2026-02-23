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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Edit, Trash2, Fuel, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

type FuelCost = {
  id: string;
  date: string;
  liters: number;
  fuel_type: 'benzin' | 'diesel';
  price_per_liter: number;
  total_price: number;
  trip_km: number | null;
  avg_consumption: number | null;
  notes: string | null;
  created_at: string;
  price_includes_vat?: boolean;
  vat_rate?: number;
};

function FuelCostsPage() {
  const { toast } = useToast();
  const [fuelCosts, setFuelCosts] = useState<FuelCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCost, setEditingCost] = useState<FuelCost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [liters, setLiters] = useState('');
  const [fuelType, setFuelType] = useState<'benzin' | 'diesel'>('diesel');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [tripKm, setTripKm] = useState('');
  const [notes, setNotes] = useState('');
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [priceIncludesVAT, setPriceIncludesVAT] = useState(() => {
    const saved = localStorage.getItem('fuel_costs_price_includes_vat');
    return saved === 'true';
  });
  const [vatRate, setVATRate] = useState(() => {
    const saved = localStorage.getItem('fuel_costs_vat_rate');
    return saved || '20';
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('fuel_costs')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    } else {
      setFuelCosts(data || []);
    }
    setIsLoading(false);
  }, [toast]);

  usePullToRefresh(fetchData);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setDate(new Date());
    setLiters('');
    setFuelType('diesel');
    setPricePerLiter('');
    setTripKm('');
    setNotes('');
    // Don't reset VAT settings - they persist
    setEditingCost(null);
  };

  const handleSubmit = async () => {
    if (!date || !liters || !pricePerLiter) {
      toast({ title: 'Chyba', description: 'Vyplňte všetky povinné polia', variant: 'destructive' });
      return;
    }

    const totalPrice = parseFloat(liters) * parseFloat(pricePerLiter);
    const consumption = tripKm && parseFloat(tripKm) > 0 ? (parseFloat(liters) / parseFloat(tripKm)) * 100 : null;

    // Save VAT settings to localStorage
    localStorage.setItem('fuel_costs_price_includes_vat', priceIncludesVAT.toString());
    localStorage.setItem('fuel_costs_vat_rate', vatRate);

    const formData = {
      date: format(date, 'yyyy-MM-dd'),
      liters: parseFloat(liters),
      fuel_type: fuelType,
      price_per_liter: parseFloat(pricePerLiter),
      total_price: totalPrice,
      trip_km: tripKm ? parseFloat(tripKm) : null,
      avg_consumption: consumption,
      notes: notes || null,
      price_includes_vat: priceIncludesVAT,
      vat_rate: parseFloat(vatRate),
    };

    if (editingCost) {
      const { error } = await supabase
        .from('fuel_costs')
        .update(formData)
        .eq('id', editingCost.id);

      if (!error) {
        toast({ title: 'Úspech', description: 'Záznam aktualizovaný' });
        fetchData();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('fuel_costs')
        .insert([formData]);

      if (!error) {
        toast({ title: 'Úspech', description: 'Záznam pridaný' });
        fetchData();
        resetForm();
      }
    }
  };

  const handleEdit = (cost: FuelCost) => {
    setEditingCost(cost);
    setDate(new Date(cost.date));
    setLiters(cost.liters.toString());
    setFuelType(cost.fuel_type);
    setPricePerLiter(cost.price_per_liter.toString());
    setTripKm(cost.trip_km?.toString() || '');
    setNotes(cost.notes || '');

    // Load VAT settings from record (if they exist)
    if (cost.price_includes_vat !== undefined) {
      setPriceIncludesVAT(cost.price_includes_vat);
    }
    if (cost.vat_rate !== undefined) {
      setVATRate(cost.vat_rate.toString());
    }

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('fuel_costs')
      .delete()
      .eq('id', deleteId);

    if (!error) {
      toast({ title: 'Úspech', description: 'Záznam odstránený' });
      fetchData();
    }
    setDeleteId(null);
  };

  const totalSpent = fuelCosts?.reduce((sum, cost) => sum + (cost?.total_price || 0), 0) || 0;
  const totalLiters = fuelCosts?.reduce((sum, cost) => sum + (cost?.liters || 0), 0) || 0;

  const consumptionEntries = fuelCosts?.filter(c => c?.avg_consumption && !isNaN(c.avg_consumption)) || [];
  const avgConsumption = consumptionEntries.length > 0
    ? consumptionEntries.reduce((sum, cost) => sum + (cost.avg_consumption || 0), 0) / consumptionEntries.length
    : 0;

  return (
    <MainLayout>
      <PageHeader
        title="Pohonné hmoty"
        description="Evidencia nákladov na pohonné hmoty"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-4">
          <Card className="p-4 max-w-[500px]">
            <h3 className="text-base font-semibold mb-3">{editingCost ? 'Upraviť záznam' : 'Pridať nový záznam'}</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Dátum *</Label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full h-10 justify-start text-left font-normal text-sm", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'd.M.yyyy', { locale: sk }) : 'Vyberte dátum'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(selectedDate) => {
                        setDate(selectedDate);
                        setDatePopoverOpen(false);
                      }}
                      locale={sk}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Počet litrov *</Label>
                  <Input className="h-10 text-sm" type="number" step="0.01" value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Druh paliva *</Label>
                  <Select value={fuelType} onValueChange={(v) => setFuelType(v as 'benzin' | 'diesel')}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="benzin">Benzín</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Cena za 1L *</Label>
                  <Input className="h-10 text-sm" type="number" step="0.001" value={pricePerLiter} onChange={(e) => setPricePerLiter(e.target.value)} placeholder="0.000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Celková cena</Label>
                  <Input className="h-10 text-sm" disabled value={liters && pricePerLiter ? (parseFloat(liters) * parseFloat(pricePerLiter)).toFixed(2) : '0.00'} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">TRIP (km)</Label>
                <Input className="h-10 text-sm" type="number" step="0.1" value={tripKm} onChange={(e) => setTripKm(e.target.value)} placeholder="0.0" />
                {tripKm && liters && parseFloat(tripKm) > 0 && parseFloat(liters) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Spotreba: {((parseFloat(liters) / parseFloat(tripKm)) * 100).toFixed(2)} L/100km
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Poznámky</Label>
                <Textarea className="text-sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Voliteľné" />
              </div>
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="price-includes-vat-fuel"
                    checked={priceIncludesVAT}
                    onChange={(e) => {
                      setPriceIncludesVAT(e.target.checked);
                      localStorage.setItem('fuel_costs_price_includes_vat', e.target.checked.toString());
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="price-includes-vat-fuel" className="text-sm font-medium cursor-pointer">
                    Cena je s DPH
                  </Label>
                </div>
                {priceIncludesVAT && (
                  <>
                    <p className="text-xs text-gray-500">
                      Ak je zaškrtnuté, cena obsahuje DPH
                    </p>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Sadzba DPH (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={vatRate}
                        onChange={(e) => {
                          setVATRate(e.target.value);
                          localStorage.setItem('fuel_costs_vat_rate', e.target.value);
                        }}
                        className="h-10 text-sm"
                        placeholder="20"
                      />
                      <p className="text-xs text-gray-500">
                        Výška DPH v percentách
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2 mt-4">
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
                    <p className="text-2xl font-bold text-blue-900">{totalSpent.toFixed(2)} €</p>
                  </div>
                  <Fuel className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Celkový počet litrov</p>
                  <p className="text-2xl font-bold text-green-900">{totalLiters.toFixed(2)} L</p>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Priemerná spotreba</p>
                  <p className="text-2xl font-bold text-amber-900">{avgConsumption ? avgConsumption.toFixed(2) : '-'} L/100km</p>
                </div>
              </Card>
            </div>
          </div>

          <h3 className="text-base font-semibold mb-3">História záznamov</h3>
          {isLoading ? (
            <Card className="p-4"><p className="text-center text-sm">Načítavam...</p></Card>
          ) : fuelCosts.length === 0 ? (
            <EmptyState
              icon={<Fuel className="h-8 w-8" />}
              title="Žiadne záznamy"
              description="Zatiaľ nemáte žiadne záznamy o pohonných hmotách"
            />
          ) : (
            <Card className="overflow-x-auto">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Dátum</TableHead>
                <TableHead className="text-sm">Druh</TableHead>
                <TableHead className="text-right text-sm">Litre</TableHead>
                <TableHead className="text-right text-sm">Cena/L</TableHead>
                <TableHead className="text-right text-sm">Celkom</TableHead>
                <TableHead className="text-right text-sm">TRIP</TableHead>
                <TableHead className="text-right text-sm">Spotreba</TableHead>
                <TableHead className="text-right text-sm">Akcie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuelCosts.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell className="text-sm">{format(new Date(cost.date), 'd.M.yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={cost.fuel_type === 'benzin' ? 'default' : 'secondary'} className="text-xs">
                      {cost.fuel_type === 'benzin' ? 'Benzín' : 'Diesel'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">{cost.liters.toFixed(2)} L</TableCell>
                  <TableCell className="text-right text-sm">{cost.price_per_liter.toFixed(3)} €</TableCell>
                  <TableCell className="text-right text-sm font-bold">{cost.total_price.toFixed(2)} €</TableCell>
                  <TableCell className="text-right text-sm">{cost.trip_km ? `${cost.trip_km.toFixed(1)} km` : '-'}</TableCell>
                  <TableCell className="text-right text-sm">{cost.avg_consumption ? `${cost.avg_consumption.toFixed(2)} L/100km` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cost)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(cost.id)}>
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
            <AlertDialogTitle>Odstrániť záznam?</AlertDialogTitle>
            <AlertDialogDescription>Táto akcia je nevratná.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Odstrániť</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

export default function FuelCostsPageWithErrorBoundary() {
  return (
    <ErrorBoundary fullScreen fallbackMessage="Chyba pri načítavaní nákladov na pohonné hmoty">
      <FuelCostsPage />
    </ErrorBoundary>
  );
}
