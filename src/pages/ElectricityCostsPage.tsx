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
import { Edit, Trash2, Zap } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

type ElectricityCost = {
  id: string;
  month: string;
  meter_start: number;
  meter_end: number;
  total_consumption: number;
  price_per_kwh: number | null;
  total_price: number | null;
  notes: string | null;
  price_includes_vat?: boolean;
  vat_rate?: number;
  created_at: string;
};

function ElectricityCostsPage() {
  const { toast } = useToast();
  const [costs, setCosts] = useState<ElectricityCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCost, setEditingCost] = useState<ElectricityCost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [month, setMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM'));
  const [meterStart, setMeterStart] = useState('');
  const [meterEnd, setMeterEnd] = useState('');
  const [pricePerKwh, setPricePerKwh] = useState('');
  const [notes, setNotes] = useState('');
  const [priceIncludesVAT, setPriceIncludesVAT] = useState(() => {
    const saved = localStorage.getItem('electricity_costs_price_includes_vat');
    return saved === 'true';
  });
  const [vatRate, setVATRate] = useState(() => {
    const saved = localStorage.getItem('electricity_costs_vat_rate');
    return saved || '20';
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('electricity_costs')
      .select('*')
      .order('month', { ascending: false });

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
    setMonth(format(startOfMonth(new Date()), 'yyyy-MM'));
    setMeterStart('');
    setMeterEnd('');
    setPricePerKwh('');
    setNotes('');
    setEditingCost(null);
    // Don't reset VAT settings - they persist
  };

  const handleSubmit = async () => {
    if (!month || !meterStart || !meterEnd) {
      toast({ title: 'Chyba', description: 'Vyplňte všetky povinné polia', variant: 'destructive' });
      return;
    }

    const consumption = parseFloat(meterEnd) - parseFloat(meterStart);
    if (consumption < 0) {
      toast({ title: 'Chyba', description: 'Konečný stav musí byť väčší ako počiatočný', variant: 'destructive' });
      return;
    }

    // Save VAT settings to localStorage
    localStorage.setItem('electricity_costs_price_includes_vat', priceIncludesVAT.toString());
    localStorage.setItem('electricity_costs_vat_rate', vatRate);

    const formData = {
      month: `${month}-01`,
      meter_start: parseFloat(meterStart),
      meter_end: parseFloat(meterEnd),
      total_consumption: consumption,
      price_per_kwh: pricePerKwh ? parseFloat(pricePerKwh) : null,
      total_price: pricePerKwh ? consumption * parseFloat(pricePerKwh) : null,
      notes: notes || null,
      price_includes_vat: priceIncludesVAT,
      vat_rate: parseFloat(vatRate),
    };

    if (editingCost) {
      const { error } = await supabase
        .from('electricity_costs')
        .update(formData)
        .eq('id', editingCost.id);

      if (!error) {
        toast({ title: 'Úspech', description: 'Záznam aktualizovaný' });
        fetchData();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('electricity_costs')
        .insert([formData]);

      if (!error) {
        toast({ title: 'Úspech', description: 'Záznam pridaný' });
        fetchData();
        resetForm();
      }
    }
  };

  const handleEdit = (cost: ElectricityCost) => {
    setEditingCost(cost);
    setMonth(format(new Date(cost.month), 'yyyy-MM'));
    setMeterStart(cost.meter_start.toString());
    setMeterEnd(cost.meter_end.toString());
    setPricePerKwh(cost.price_per_kwh?.toString() || '');
    setNotes(cost.notes || '');
    // Load VAT settings from record (if they exist)
    if (cost.price_includes_vat !== undefined) {
      setPriceIncludesVAT(cost.price_includes_vat);
    }
    if (cost.vat_rate !== undefined) {
      setVATRate(cost.vat_rate.toString());
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from('electricity_costs')
      .delete()
      .eq('id', deleteId);

    if (!error) {
      toast({ title: 'Úspech', description: 'Záznam odstránený' });
      fetchData();
    }
    setDeleteId(null);
  };

  const totalConsumption = costs.reduce((sum, cost) => sum + cost.total_consumption, 0);
  const totalSpent = costs.reduce((sum, cost) => sum + (cost.total_price || 0), 0);

  return (
    <MainLayout>
      <PageHeader
        title="Elektrina"
        description="Evidencia spotreby elektriny"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-4">
          <Card className="p-4 max-w-[500px]">
            <h3 className="text-base font-semibold mb-3">{editingCost ? 'Upraviť záznam' : 'Pridať nový záznam'}</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Mesiac *</Label>
                <Input className="h-10 text-sm" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Počiatočný stav *</Label>
                  <Input className="h-10 text-sm" type="number" step="0.1" value={meterStart} onChange={(e) => setMeterStart(e.target.value)} placeholder="0.0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Konečný stav *</Label>
                  <Input className="h-10 text-sm" type="number" step="0.1" value={meterEnd} onChange={(e) => setMeterEnd(e.target.value)} placeholder="0.0" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Celková spotreba (kWh)</Label>
                <Input className="h-10 text-sm" disabled value={meterStart && meterEnd ? (parseFloat(meterEnd) - parseFloat(meterStart)).toFixed(1) : '0.0'} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Cena za kWh</Label>
                <Input className="h-10 text-sm" type="number" step="0.0001" value={pricePerKwh} onChange={(e) => setPricePerKwh(e.target.value)} placeholder="0.0000" />
                {pricePerKwh && meterStart && meterEnd && (
                  <p className="text-xs text-muted-foreground">
                    Celková cena: {((parseFloat(meterEnd) - parseFloat(meterStart)) * parseFloat(pricePerKwh)).toFixed(2)} €
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
                    id="price-includes-vat-electricity_costs"
                    checked={priceIncludesVAT}
                    onChange={(e) => {
                      setPriceIncludesVAT(e.target.checked);
                      localStorage.setItem('electricity_costs_price_includes_vat', e.target.checked.toString());
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="price-includes-vat-electricity_costs" className="text-sm font-medium cursor-pointer">
                    Cena je s DPH
                  </Label>
                </div>
                {priceIncludesVAT && (
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
                        localStorage.setItem('electricity_costs_vat_rate', e.target.value);
                      }}
                      className="h-10 text-sm"
                      placeholder="20"
                    />
                  </div>
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Celková spotreba</p>
                    <p className="text-2xl font-bold text-blue-900">{totalConsumption.toFixed(1)} kWh</p>
                  </div>
                  <Zap className="h-8 w-8 text-blue-600" />
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Celkové náklady</p>
                  <p className="text-2xl font-bold text-green-900">{totalSpent.toFixed(2)} €</p>
                </div>
              </Card>
            </div>
          </div>

          <h3 className="text-base font-semibold mb-3">História záznamov</h3>
          {isLoading ? (
            <Card className="p-4"><p className="text-center text-sm">Načítavam...</p></Card>
          ) : costs.length === 0 ? (
            <EmptyState
              icon={<Zap className="h-8 w-8" />}
              title="Žiadne záznamy"
              description="Zatiaľ nemáte žiadne záznamy o spotrebe elektriny"
            />
          ) : (
            <Card className="overflow-x-auto">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">Mesiac</TableHead>
                <TableHead className="text-right text-sm">Počiatočný stav</TableHead>
                <TableHead className="text-right text-sm">Konečný stav</TableHead>
                <TableHead className="text-right text-sm">Spotreba</TableHead>
                <TableHead className="text-right text-sm">Cena/kWh</TableHead>
                <TableHead className="text-right text-sm">Celkom</TableHead>
                <TableHead className="text-right text-sm">Akcie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell className="text-sm">{format(new Date(cost.month), 'MMMM yyyy', { locale: sk })}</TableCell>
                  <TableCell className="text-right text-sm">{cost.meter_start.toFixed(1)} kWh</TableCell>
                  <TableCell className="text-right text-sm">{cost.meter_end.toFixed(1)} kWh</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{cost.total_consumption.toFixed(1)} kWh</TableCell>
                  <TableCell className="text-right text-sm">{cost.price_per_kwh ? `${cost.price_per_kwh.toFixed(4)} €` : '-'}</TableCell>
                  <TableCell className="text-right text-sm font-bold">{cost.total_price ? `${cost.total_price.toFixed(2)} €` : '-'}</TableCell>
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

export default function ElectricityCostsPageWithErrorBoundary() {
  return (
    <ErrorBoundary fullScreen fallbackMessage="Chyba pri načítavaní nákladov na elektrinu">
      <ElectricityCostsPage />
    </ErrorBoundary>
  );
}
