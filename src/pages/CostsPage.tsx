import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
  Fuel,
  Droplets,
  Zap,
  Droplet,
  Wrench,
  Receipt,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Euro,
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { sk } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ===================== TYPES =====================

type CostTab = 'fuel' | 'adblue' | 'electricity' | 'water' | 'car-service' | 'other';

const TAB_ORDER: CostTab[] = ['fuel', 'adblue', 'electricity', 'water', 'car-service', 'other'];

const TAB_CONFIG: Record<CostTab, { label: string; icon: any; table: string; priceField: 'total_price' | 'price'; dateField: 'date' | 'month' }> = {
  fuel:           { label: 'Pohonné hmoty', icon: Fuel,     table: 'fuel_costs',         priceField: 'total_price', dateField: 'date'  },
  adblue:         { label: 'AdBlue',        icon: Droplets, table: 'adblue_costs',       priceField: 'total_price', dateField: 'date'  },
  electricity:    { label: 'Elektrina',     icon: Zap,      table: 'electricity_costs',  priceField: 'total_price', dateField: 'month' },
  water:          { label: 'Voda',          icon: Droplet,  table: 'water_costs',        priceField: 'total_price', dateField: 'month' },
  'car-service':  { label: 'Servis auta',   icon: Wrench,   table: 'car_service_costs',  priceField: 'price',       dateField: 'date'  },
  other:          { label: 'Ostatné',       icon: Receipt,  table: 'other_costs',        priceField: 'price',       dateField: 'date'  },
};

// ===================== HELPERS =====================

const formatEur = (n: number): string =>
  n.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const SK_MONTHS_GEN = [
  'januára', 'februára', 'marca', 'apríla', 'mája', 'júna',
  'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra',
];

// Vráti začiatok a koniec aktuálneho mesiaca v ISO formáte
const getCurrentMonthRange = (): { start: string; end: string; label: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    start: toIso(start),
    end: toIso(end),
    label: `${SK_MONTHS_GEN[now.getMonth()]} ${now.getFullYear()}`,
  };
};

// ===================== VAT TOGGLE (shared) =====================

interface VATSectionProps {
  storageKey: string; // napr. 'fuel_costs'
  priceIncludesVAT: boolean;
  setPriceIncludesVAT: (v: boolean) => void;
  vatRate: string;
  setVATRate: (v: string) => void;
}

const VATSection = ({ storageKey, priceIncludesVAT, setPriceIncludesVAT, vatRate, setVATRate }: VATSectionProps) => {
  return (
    <div className="border-t border-[#e2e8f0] pt-3 space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const next = !priceIncludesVAT;
            setPriceIncludesVAT(next);
            localStorage.setItem(`${storageKey}_price_includes_vat`, String(next));
          }}
          className={cn(
            'relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer border-2',
            priceIncludesVAT ? 'bg-[#16a34a] border-[#16a34a]' : 'bg-[#e2e8f0] border-[#e2e8f0]'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform',
              priceIncludesVAT ? 'translate-x-5' : 'translate-x-0.5'
            )}
          />
        </button>
        <span className="text-sm font-semibold text-[#0f172a]">Cena je s DPH</span>
      </div>
      {priceIncludesVAT && (
        <div className="space-y-1">
          <Label className="text-xs text-[#475569]">Sadzba DPH (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={vatRate}
            onChange={(e) => {
              setVATRate(e.target.value);
              localStorage.setItem(`${storageKey}_vat_rate`, e.target.value);
            }}
            className="h-9 text-sm"
            placeholder="20"
          />
        </div>
      )}
    </div>
  );
};

// ===================== SHARED FORM CARD WRAPPER =====================

interface FormCardProps {
  title: string;
  editing: boolean;
  saving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

const FormCard = ({ title, editing, saving, onSubmit, onCancel, children }: FormCardProps) => (
  <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
    <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
      <h3 className="text-sm font-bold text-[#0f172a]">
        {editing ? 'Upraviť záznam' : title}
      </h3>
    </div>
    <div className="p-4 space-y-3">
      {children}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="flex-1 h-9 px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {editing ? 'Uložiť zmeny' : 'Pridať záznam'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-9 px-4 rounded-md border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc] text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Zrušiť
          </button>
        )}
      </div>
    </div>
  </div>
);

// ===================== LIST CARD WRAPPER =====================

interface ListCardProps {
  title: string;
  count: number;
  loading: boolean;
  empty: boolean;
  emptyText: string;
  EmptyIcon: any;
  children: React.ReactNode;
}

const ListCard = ({ title, count, loading, empty, emptyText, EmptyIcon, children }: ListCardProps) => (
  <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
    <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
      <h3 className="text-sm font-bold text-[#0f172a]">{title}</h3>
      {!loading && !empty && <span className="text-xs text-[#475569]">{count} záznamov</span>}
    </div>
    {loading ? (
      <div className="divide-y divide-[#e2e8f0]">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
        ))}
      </div>
    ) : empty ? (
      <div className="px-4 py-10 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-xl bg-[#f1f5f9] flex items-center justify-center mb-2">
          <EmptyIcon className="h-6 w-6 text-[#94a3b8]" />
        </div>
        <p className="text-sm font-bold text-[#0f172a] mb-1">Žiadne záznamy</p>
        <p className="text-xs text-[#475569]">{emptyText}</p>
      </div>
    ) : (
      children
    )}
  </div>
);

// ===================== ROW ACTIONS =====================

const RowActions = ({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) => (
  <div className="flex items-center gap-1.5 flex-shrink-0">
    <button
      onClick={onEdit}
      title="Upraviť"
      className="w-7 h-7 rounded-lg border border-[#e2e8f0] text-[#475569] hover:border-[#16a34a] hover:text-[#16a34a] flex items-center justify-center transition-colors"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
    <button
      onClick={onDelete}
      title="Zmazať"
      className="w-7 h-7 rounded-lg border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2] flex items-center justify-center transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  </div>
);

// ===================== TAB COMPONENTS =====================
// Každý tab je samostatný komponent — lazy render len aktívneho

// ----- 1. FUEL -----

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
  price_includes_vat?: boolean;
  vat_rate?: number;
};

const FuelTab = () => {
  const { toast } = useToast();
  const [costs, setCosts] = useState<FuelCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<FuelCost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [liters, setLiters] = useState('');
  const [fuelType, setFuelType] = useState<'benzin' | 'diesel'>('diesel');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [tripKm, setTripKm] = useState('');
  const [notes, setNotes] = useState('');
  const [priceIncludesVAT, setPriceIncludesVAT] = useState(() => localStorage.getItem('fuel_costs_price_includes_vat') === 'true');
  const [vatRate, setVATRate] = useState(() => localStorage.getItem('fuel_costs_vat_rate') || '20');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('fuel_costs').select('*').order('date', { ascending: false });
    if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    else setCosts((data || []) as FuelCost[]);
    setLoading(false);
  }, [toast]);

  usePullToRefresh(fetchData);
  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setLiters(''); setFuelType('diesel'); setPricePerLiter(''); setTripKm(''); setNotes('');
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!date || !liters || !pricePerLiter) {
      toast({ title: 'Chyba', description: 'Vyplň dátum, litre a cenu za liter.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const litersNum = parseFloat(liters);
    const priceNum = parseFloat(pricePerLiter);
    const totalPrice = litersNum * priceNum;
    const tripKmNum = tripKm ? parseFloat(tripKm) : null;
    const avgConsumption = tripKmNum && tripKmNum > 0 ? (litersNum / tripKmNum) * 100 : null;

    localStorage.setItem('fuel_costs_price_includes_vat', String(priceIncludesVAT));
    localStorage.setItem('fuel_costs_vat_rate', vatRate);

    const payload = {
      date,
      liters: litersNum,
      fuel_type: fuelType,
      price_per_liter: priceNum,
      total_price: totalPrice,
      trip_km: tripKmNum,
      avg_consumption: avgConsumption,
      notes: notes || null,
      price_includes_vat: priceIncludesVAT,
      vat_rate: parseFloat(vatRate),
    };

    if (editing) {
      const { error } = await supabase.from('fuel_costs').update(payload).eq('id', editing.id);
      if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Uložené' }); fetchData(); resetForm(); }
    } else {
      const { error } = await supabase.from('fuel_costs').insert([payload]);
      if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Pridané' }); fetchData(); resetForm(); }
    }
    setSaving(false);
  };

  const handleEdit = (c: FuelCost) => {
    setEditing(c);
    setDate(c.date.split('T')[0]);
    setLiters(c.liters.toString());
    setFuelType(c.fuel_type);
    setPricePerLiter(c.price_per_liter.toString());
    setTripKm(c.trip_km?.toString() || '');
    setNotes(c.notes || '');
    if (c.price_includes_vat !== undefined) setPriceIncludesVAT(c.price_includes_vat);
    if (c.vat_rate !== undefined) setVATRate(c.vat_rate.toString());
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('fuel_costs').delete().eq('id', deleteId);
    if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Zmazané' }); fetchData(); }
    setDeleteId(null);
  };

  const total = costs.reduce((s, c) => s + (c.total_price || 0), 0);
  const totalLiters = costs.reduce((s, c) => s + c.liters, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-1">
        <FormCard title="Pridať tankovanie" editing={!!editing} saving={saving} onSubmit={handleSubmit} onCancel={resetForm}>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Dátum *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Typ paliva *</Label>
            <div className="flex gap-1.5">
              {(['diesel', 'benzin'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFuelType(t)}
                  className={cn(
                    'flex-1 h-9 rounded-md text-sm font-semibold border transition-colors',
                    fuelType === t
                      ? 'bg-[#16a34a] border-[#16a34a] text-white'
                      : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0]'
                  )}
                >
                  {t === 'diesel' ? 'Diesel' : 'Benzín'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#475569]">Litre *</Label>
              <Input type="number" step="0.01" value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="0.00" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#475569]">Cena/L *</Label>
              <Input type="number" step="0.001" value={pricePerLiter} onChange={(e) => setPricePerLiter(e.target.value)} placeholder="0.000" className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Najazdené km</Label>
            <Input type="number" step="0.1" value={tripKm} onChange={(e) => setTripKm(e.target.value)} placeholder="napr. 350" className="h-9 text-sm" />
          </div>
          {liters && pricePerLiter && (
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-md px-3 py-2 text-sm">
              <span className="text-[#475569]">Celkom: </span>
              <span className="font-bold text-[#16a34a]">{formatEur(parseFloat(liters) * parseFloat(pricePerLiter))}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Poznámka</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Voliteľné" className="text-sm" />
          </div>
          <VATSection storageKey="fuel_costs" priceIncludesVAT={priceIncludesVAT} setPriceIncludesVAT={setPriceIncludesVAT} vatRate={vatRate} setVATRate={setVATRate} />
        </FormCard>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard label="Celkové náklady" value={formatEur(total)} color="green" Icon={Euro} />
          <SummaryCard label="Spolu natankované" value={`${totalLiters.toFixed(2)} L`} color="blue" Icon={Fuel} />
        </div>

        <ListCard title="História tankovaní" count={costs.length} loading={loading} empty={costs.length === 0} emptyText="Zatiaľ nemáš žiadne tankovanie." EmptyIcon={Fuel}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Dátum</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Typ</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Litre</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Cena/L</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Spolu</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {costs.map(c => (
                  <tr key={c.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-3 py-2 text-[#0f172a]">{format(new Date(c.date), 'd.M.yyyy')}</td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        'inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold',
                        c.fuel_type === 'diesel' ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-[#dbeafe] text-[#1e40af]'
                      )}>
                        {c.fuel_type === 'diesel' ? 'Diesel' : 'Benzín'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-[#0f172a]">{c.liters.toFixed(2)} L</td>
                    <td className="px-3 py-2 text-right text-[#475569]">{c.price_per_liter.toFixed(3)} €</td>
                    <td className="px-3 py-2 text-right font-bold text-[#0f172a]">{formatEur(c.total_price)}</td>
                    <td className="px-3 py-2 text-right">
                      <RowActions onEdit={() => handleEdit(c)} onDelete={() => setDeleteId(c.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListCard>
      </div>

      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
};

// ----- 2. ADBLUE -----

type AdblueCost = {
  id: string;
  date: string;
  liters: number;
  price_per_liter: number;
  total_price: number;
  notes: string | null;
  price_includes_vat?: boolean;
  vat_rate?: number;
};

const AdblueTab = () => {
  const { toast } = useToast();
  const [costs, setCosts] = useState<AdblueCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AdblueCost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [notes, setNotes] = useState('');
  const [priceIncludesVAT, setPriceIncludesVAT] = useState(() => localStorage.getItem('adblue_costs_price_includes_vat') === 'true');
  const [vatRate, setVATRate] = useState(() => localStorage.getItem('adblue_costs_vat_rate') || '20');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('adblue_costs').select('*').order('date', { ascending: false });
    if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    else setCosts((data || []) as AdblueCost[]);
    setLoading(false);
  }, [toast]);

  usePullToRefresh(fetchData);
  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setLiters(''); setPricePerLiter(''); setNotes('');
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!date || !liters || !pricePerLiter) {
      toast({ title: 'Chyba', description: 'Vyplň dátum, litre a cenu.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const totalPrice = parseFloat(liters) * parseFloat(pricePerLiter);
    localStorage.setItem('adblue_costs_price_includes_vat', String(priceIncludesVAT));
    localStorage.setItem('adblue_costs_vat_rate', vatRate);

    const payload = {
      date,
      liters: parseFloat(liters),
      price_per_liter: parseFloat(pricePerLiter),
      total_price: totalPrice,
      notes: notes || null,
      price_includes_vat: priceIncludesVAT,
      vat_rate: parseFloat(vatRate),
    };

    if (editing) {
      const { error } = await supabase.from('adblue_costs').update(payload).eq('id', editing.id);
      if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Uložené' }); fetchData(); resetForm(); }
    } else {
      const { error } = await supabase.from('adblue_costs').insert([payload]);
      if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Pridané' }); fetchData(); resetForm(); }
    }
    setSaving(false);
  };

  const handleEdit = (c: AdblueCost) => {
    setEditing(c);
    setDate(c.date.split('T')[0]);
    setLiters(c.liters.toString());
    setPricePerLiter(c.price_per_liter.toString());
    setNotes(c.notes || '');
    if (c.price_includes_vat !== undefined) setPriceIncludesVAT(c.price_includes_vat);
    if (c.vat_rate !== undefined) setVATRate(c.vat_rate.toString());
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('adblue_costs').delete().eq('id', deleteId);
    if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Zmazané' }); fetchData(); }
    setDeleteId(null);
  };

  const total = costs.reduce((s, c) => s + (c.total_price || 0), 0);
  const totalLiters = costs.reduce((s, c) => s + c.liters, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-1">
        <FormCard title="Pridať AdBlue" editing={!!editing} saving={saving} onSubmit={handleSubmit} onCancel={resetForm}>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Dátum *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#475569]">Litre *</Label>
              <Input type="number" step="0.01" value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="0.00" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#475569]">Cena/L *</Label>
              <Input type="number" step="0.001" value={pricePerLiter} onChange={(e) => setPricePerLiter(e.target.value)} placeholder="0.000" className="h-9 text-sm" />
            </div>
          </div>
          {liters && pricePerLiter && (
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-md px-3 py-2 text-sm">
              <span className="text-[#475569]">Celkom: </span>
              <span className="font-bold text-[#16a34a]">{formatEur(parseFloat(liters) * parseFloat(pricePerLiter))}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Poznámka</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Voliteľné" className="text-sm" />
          </div>
          <VATSection storageKey="adblue_costs" priceIncludesVAT={priceIncludesVAT} setPriceIncludesVAT={setPriceIncludesVAT} vatRate={vatRate} setVATRate={setVATRate} />
        </FormCard>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard label="Celkové náklady" value={formatEur(total)} color="green" Icon={Euro} />
          <SummaryCard label="Spolu litrov" value={`${totalLiters.toFixed(2)} L`} color="blue" Icon={Droplets} />
        </div>

        <ListCard title="História AdBlue" count={costs.length} loading={loading} empty={costs.length === 0} emptyText="Zatiaľ nemáš žiadny záznam o AdBlue." EmptyIcon={Droplets}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Dátum</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Litre</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Cena/L</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Spolu</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {costs.map(c => (
                  <tr key={c.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-3 py-2 text-[#0f172a]">{format(new Date(c.date), 'd.M.yyyy')}</td>
                    <td className="px-3 py-2 text-right text-[#0f172a]">{c.liters.toFixed(2)} L</td>
                    <td className="px-3 py-2 text-right text-[#475569]">{c.price_per_liter.toFixed(3)} €</td>
                    <td className="px-3 py-2 text-right font-bold text-[#0f172a]">{formatEur(c.total_price)}</td>
                    <td className="px-3 py-2 text-right">
                      <RowActions onEdit={() => handleEdit(c)} onDelete={() => setDeleteId(c.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListCard>
      </div>

      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
};

// ----- 3. ELECTRICITY -----

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
};

const ElectricityTab = () => {
  const { toast } = useToast();
  const [costs, setCosts] = useState<ElectricityCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ElectricityCost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [month, setMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM'));
  const [meterStart, setMeterStart] = useState('');
  const [meterEnd, setMeterEnd] = useState('');
  const [pricePerKwh, setPricePerKwh] = useState('');
  const [notes, setNotes] = useState('');
  const [priceIncludesVAT, setPriceIncludesVAT] = useState(() => localStorage.getItem('electricity_costs_price_includes_vat') === 'true');
  const [vatRate, setVATRate] = useState(() => localStorage.getItem('electricity_costs_vat_rate') || '20');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('electricity_costs').select('*').order('month', { ascending: false });
    if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    else setCosts((data || []) as ElectricityCost[]);
    setLoading(false);
  }, [toast]);

  usePullToRefresh(fetchData);
  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setMonth(format(startOfMonth(new Date()), 'yyyy-MM'));
    setMeterStart(''); setMeterEnd(''); setPricePerKwh(''); setNotes('');
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!month || !meterStart || !meterEnd) {
      toast({ title: 'Chyba', description: 'Vyplň mesiac a oba stavy merača.', variant: 'destructive' });
      return;
    }
    const consumption = parseFloat(meterEnd) - parseFloat(meterStart);
    if (consumption < 0) {
      toast({ title: 'Chyba', description: 'Konečný stav musí byť väčší ako počiatočný.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    localStorage.setItem('electricity_costs_price_includes_vat', String(priceIncludesVAT));
    localStorage.setItem('electricity_costs_vat_rate', vatRate);

    const payload = {
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

    if (editing) {
      const { error } = await supabase.from('electricity_costs').update(payload).eq('id', editing.id);
      if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Uložené' }); fetchData(); resetForm(); }
    } else {
      const { error } = await supabase.from('electricity_costs').insert([payload]);
      if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Pridané' }); fetchData(); resetForm(); }
    }
    setSaving(false);
  };

  const handleEdit = (c: ElectricityCost) => {
    setEditing(c);
    setMonth(format(new Date(c.month), 'yyyy-MM'));
    setMeterStart(c.meter_start.toString());
    setMeterEnd(c.meter_end.toString());
    setPricePerKwh(c.price_per_kwh?.toString() || '');
    setNotes(c.notes || '');
    if (c.price_includes_vat !== undefined) setPriceIncludesVAT(c.price_includes_vat);
    if (c.vat_rate !== undefined) setVATRate(c.vat_rate.toString());
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('electricity_costs').delete().eq('id', deleteId);
    if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Zmazané' }); fetchData(); }
    setDeleteId(null);
  };

  const totalConsumption = costs.reduce((s, c) => s + c.total_consumption, 0);
  const totalSpent = costs.reduce((s, c) => s + (c.total_price || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-1">
        <FormCard title="Pridať odpis elektriny" editing={!!editing} saving={saving} onSubmit={handleSubmit} onCancel={resetForm}>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Mesiac *</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#475569]">Stav OD *</Label>
              <Input type="number" step="0.01" value={meterStart} onChange={(e) => setMeterStart(e.target.value)} placeholder="0" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#475569]">Stav DO *</Label>
              <Input type="number" step="0.01" value={meterEnd} onChange={(e) => setMeterEnd(e.target.value)} placeholder="0" className="h-9 text-sm" />
            </div>
          </div>
          {meterStart && meterEnd && (
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-md px-3 py-2 text-sm">
              <span className="text-[#475569]">Spotreba: </span>
              <span className="font-bold text-[#16a34a]">{(parseFloat(meterEnd) - parseFloat(meterStart)).toFixed(2)} kWh</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Cena za kWh</Label>
            <Input type="number" step="0.0001" value={pricePerKwh} onChange={(e) => setPricePerKwh(e.target.value)} placeholder="0.0000" className="h-9 text-sm" />
          </div>
          {meterStart && meterEnd && pricePerKwh && (
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-md px-3 py-2 text-sm">
              <span className="text-[#475569]">Celkom: </span>
              <span className="font-bold text-[#16a34a]">{formatEur((parseFloat(meterEnd) - parseFloat(meterStart)) * parseFloat(pricePerKwh))}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Poznámka</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Voliteľné" className="text-sm" />
          </div>
          <VATSection storageKey="electricity_costs" priceIncludesVAT={priceIncludesVAT} setPriceIncludesVAT={setPriceIncludesVAT} vatRate={vatRate} setVATRate={setVATRate} />
        </FormCard>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard label="Celkové náklady" value={formatEur(totalSpent)} color="green" Icon={Euro} />
          <SummaryCard label="Spolu spotrebované" value={`${totalConsumption.toFixed(2)} kWh`} color="blue" Icon={Zap} />
        </div>

        <ListCard title="História odpisov" count={costs.length} loading={loading} empty={costs.length === 0} emptyText="Zatiaľ žiadne odpisy." EmptyIcon={Zap}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Mesiac</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Od</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Do</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Spotreba</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Spolu</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {costs.map(c => (
                  <tr key={c.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-3 py-2 text-[#0f172a]">{format(new Date(c.month), 'LLLL yyyy', { locale: sk })}</td>
                    <td className="px-3 py-2 text-right text-[#475569]">{c.meter_start.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right text-[#475569]">{c.meter_end.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-[#0f172a]">{c.total_consumption.toFixed(2)} kWh</td>
                    <td className="px-3 py-2 text-right font-bold text-[#0f172a]">{c.total_price ? formatEur(c.total_price) : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <RowActions onEdit={() => handleEdit(c)} onDelete={() => setDeleteId(c.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListCard>
      </div>

      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
};

// ----- 4. WATER -----

type WaterCost = {
  id: string;
  month: string;
  meter_start: number;
  meter_end: number;
  total_consumption: number;
  price_per_m3: number | null;
  total_price: number | null;
  notes: string | null;
  price_includes_vat?: boolean;
  vat_rate?: number;
};

const WaterTab = () => {
  const { toast } = useToast();
  const [costs, setCosts] = useState<WaterCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<WaterCost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [month, setMonth] = useState(format(startOfMonth(new Date()), 'yyyy-MM'));
  const [meterStart, setMeterStart] = useState('');
  const [meterEnd, setMeterEnd] = useState('');
  const [pricePerM3, setPricePerM3] = useState('');
  const [notes, setNotes] = useState('');
  const [priceIncludesVAT, setPriceIncludesVAT] = useState(() => localStorage.getItem('water_costs_price_includes_vat') === 'true');
  const [vatRate, setVATRate] = useState(() => localStorage.getItem('water_costs_vat_rate') || '20');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('water_costs').select('*').order('month', { ascending: false });
    if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    else setCosts((data || []) as WaterCost[]);
    setLoading(false);
  }, [toast]);

  usePullToRefresh(fetchData);
  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setMonth(format(startOfMonth(new Date()), 'yyyy-MM'));
    setMeterStart(''); setMeterEnd(''); setPricePerM3(''); setNotes('');
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!month || !meterStart || !meterEnd) {
      toast({ title: 'Chyba', description: 'Vyplň mesiac a oba stavy merača.', variant: 'destructive' });
      return;
    }
    const consumption = parseFloat(meterEnd) - parseFloat(meterStart);
    if (consumption < 0) {
      toast({ title: 'Chyba', description: 'Konečný stav musí byť väčší ako počiatočný.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    localStorage.setItem('water_costs_price_includes_vat', String(priceIncludesVAT));
    localStorage.setItem('water_costs_vat_rate', vatRate);

    const payload = {
      month: `${month}-01`,
      meter_start: parseFloat(meterStart),
      meter_end: parseFloat(meterEnd),
      total_consumption: consumption,
      price_per_m3: pricePerM3 ? parseFloat(pricePerM3) : null,
      total_price: pricePerM3 ? consumption * parseFloat(pricePerM3) : null,
      notes: notes || null,
      price_includes_vat: priceIncludesVAT,
      vat_rate: parseFloat(vatRate),
    };

    if (editing) {
      const { error } = await supabase.from('water_costs').update(payload).eq('id', editing.id);
      if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Uložené' }); fetchData(); resetForm(); }
    } else {
      const { error } = await supabase.from('water_costs').insert([payload]);
      if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Pridané' }); fetchData(); resetForm(); }
    }
    setSaving(false);
  };

  const handleEdit = (c: WaterCost) => {
    setEditing(c);
    setMonth(format(new Date(c.month), 'yyyy-MM'));
    setMeterStart(c.meter_start.toString());
    setMeterEnd(c.meter_end.toString());
    setPricePerM3(c.price_per_m3?.toString() || '');
    setNotes(c.notes || '');
    if (c.price_includes_vat !== undefined) setPriceIncludesVAT(c.price_includes_vat);
    if (c.vat_rate !== undefined) setVATRate(c.vat_rate.toString());
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('water_costs').delete().eq('id', deleteId);
    if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Zmazané' }); fetchData(); }
    setDeleteId(null);
  };

  const totalConsumption = costs.reduce((s, c) => s + c.total_consumption, 0);
  const totalSpent = costs.reduce((s, c) => s + (c.total_price || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-1">
        <FormCard title="Pridať odpis vody" editing={!!editing} saving={saving} onSubmit={handleSubmit} onCancel={resetForm}>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Mesiac *</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#475569]">Stav OD *</Label>
              <Input type="number" step="0.01" value={meterStart} onChange={(e) => setMeterStart(e.target.value)} placeholder="0" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#475569]">Stav DO *</Label>
              <Input type="number" step="0.01" value={meterEnd} onChange={(e) => setMeterEnd(e.target.value)} placeholder="0" className="h-9 text-sm" />
            </div>
          </div>
          {meterStart && meterEnd && (
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-md px-3 py-2 text-sm">
              <span className="text-[#475569]">Spotreba: </span>
              <span className="font-bold text-[#16a34a]">{(parseFloat(meterEnd) - parseFloat(meterStart)).toFixed(2)} m³</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Cena za m³</Label>
            <Input type="number" step="0.0001" value={pricePerM3} onChange={(e) => setPricePerM3(e.target.value)} placeholder="0.0000" className="h-9 text-sm" />
          </div>
          {meterStart && meterEnd && pricePerM3 && (
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-md px-3 py-2 text-sm">
              <span className="text-[#475569]">Celkom: </span>
              <span className="font-bold text-[#16a34a]">{formatEur((parseFloat(meterEnd) - parseFloat(meterStart)) * parseFloat(pricePerM3))}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Poznámka</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Voliteľné" className="text-sm" />
          </div>
          <VATSection storageKey="water_costs" priceIncludesVAT={priceIncludesVAT} setPriceIncludesVAT={setPriceIncludesVAT} vatRate={vatRate} setVATRate={setVATRate} />
        </FormCard>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard label="Celkové náklady" value={formatEur(totalSpent)} color="green" Icon={Euro} />
          <SummaryCard label="Spolu spotrebované" value={`${totalConsumption.toFixed(2)} m³`} color="blue" Icon={Droplet} />
        </div>

        <ListCard title="História odpisov vody" count={costs.length} loading={loading} empty={costs.length === 0} emptyText="Zatiaľ žiadne odpisy." EmptyIcon={Droplet}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Mesiac</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Od</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Do</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Spotreba</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Spolu</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {costs.map(c => (
                  <tr key={c.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-3 py-2 text-[#0f172a]">{format(new Date(c.month), 'LLLL yyyy', { locale: sk })}</td>
                    <td className="px-3 py-2 text-right text-[#475569]">{c.meter_start.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-[#475569]">{c.meter_end.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-[#0f172a]">{c.total_consumption.toFixed(2)} m³</td>
                    <td className="px-3 py-2 text-right font-bold text-[#0f172a]">{c.total_price ? formatEur(c.total_price) : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <RowActions onEdit={() => handleEdit(c)} onDelete={() => setDeleteId(c.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListCard>
      </div>

      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
};

// ----- 5. CAR SERVICE -----

type CarServiceCost = {
  id: string;
  date: string;
  description: string;
  km_state: number | null;
  price: number;
  notes: string | null;
  price_includes_vat?: boolean;
  vat_rate?: number;
};

const CarServiceTab = () => {
  const { toast } = useToast();
  const [costs, setCosts] = useState<CarServiceCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CarServiceCost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [kmState, setKmState] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [priceIncludesVAT, setPriceIncludesVAT] = useState(() => localStorage.getItem('car_service_costs_price_includes_vat') === 'true');
  const [vatRate, setVATRate] = useState(() => localStorage.getItem('car_service_costs_vat_rate') || '20');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('car_service_costs').select('*').order('date', { ascending: false });
    if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    else setCosts((data || []) as CarServiceCost[]);
    setLoading(false);
  }, [toast]);

  usePullToRefresh(fetchData);
  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setDescription(''); setKmState(''); setPrice(''); setNotes('');
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!date || !description || !price) {
      toast({ title: 'Chyba', description: 'Vyplň dátum, popis a cenu.', variant: 'destructive' });
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: 'Chyba', description: 'Zadaj platnú cenu.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    localStorage.setItem('car_service_costs_price_includes_vat', String(priceIncludesVAT));
    localStorage.setItem('car_service_costs_vat_rate', vatRate);

    const payload = {
      date,
      description,
      km_state: kmState ? parseFloat(kmState) : null,
      price: priceNum,
      notes: notes || null,
      price_includes_vat: priceIncludesVAT,
      vat_rate: parseFloat(vatRate),
    };

    if (editing) {
      const { error } = await supabase.from('car_service_costs').update(payload).eq('id', editing.id);
      if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Uložené' }); fetchData(); resetForm(); }
    } else {
      const { error } = await supabase.from('car_service_costs').insert([payload]);
      if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Pridané' }); fetchData(); resetForm(); }
    }
    setSaving(false);
  };

  const handleEdit = (c: CarServiceCost) => {
    setEditing(c);
    setDate(c.date.split('T')[0]);
    setDescription(c.description);
    setKmState(c.km_state?.toString() || '');
    setPrice(c.price.toString());
    setNotes(c.notes || '');
    if (c.price_includes_vat !== undefined) setPriceIncludesVAT(c.price_includes_vat);
    if (c.vat_rate !== undefined) setVATRate(c.vat_rate.toString());
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('car_service_costs').delete().eq('id', deleteId);
    if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Zmazané' }); fetchData(); }
    setDeleteId(null);
  };

  const totalCost = costs.reduce((s, c) => s + c.price, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-1">
        <FormCard title="Pridať servisný úkon" editing={!!editing} saving={saving} onSubmit={handleSubmit} onCancel={resetForm}>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Dátum *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Popis úkonu *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="napr. Výmena oleja" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Stav km</Label>
            <Input type="number" value={kmState} onChange={(e) => setKmState(e.target.value)} placeholder="napr. 125000" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Cena (€) *</Label>
            <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="napr. 85.50" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Poznámka</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Voliteľné" className="text-sm" />
          </div>
          <VATSection storageKey="car_service_costs" priceIncludesVAT={priceIncludesVAT} setPriceIncludesVAT={setPriceIncludesVAT} vatRate={vatRate} setVATRate={setVATRate} />
        </FormCard>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <div className="grid grid-cols-1 gap-2">
          <SummaryCard label="Celkové náklady na servis" value={formatEur(totalCost)} color="green" Icon={Wrench} />
        </div>

        <ListCard title="História servisných úkonov" count={costs.length} loading={loading} empty={costs.length === 0} emptyText="Zatiaľ žiadne servisné úkony." EmptyIcon={Wrench}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Dátum</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Úkon</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Km</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Cena</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {costs.map(c => (
                  <tr key={c.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-3 py-2 text-[#0f172a] whitespace-nowrap">{format(new Date(c.date), 'd.M.yyyy')}</td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-[#0f172a]">{c.description}</p>
                      {c.notes && <p className="text-[11px] text-[#475569]">{c.notes}</p>}
                    </td>
                    <td className="px-3 py-2 text-right text-[#475569]">{c.km_state ? c.km_state.toLocaleString('sk-SK') : '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#0f172a]">{formatEur(c.price)}</td>
                    <td className="px-3 py-2 text-right">
                      <RowActions onEdit={() => handleEdit(c)} onDelete={() => setDeleteId(c.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListCard>
      </div>

      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
};

// ----- 6. OTHER -----

type OtherCost = {
  id: string;
  date: string;
  category: string;
  description: string;
  price: number;
  notes: string | null;
  price_includes_vat?: boolean;
  vat_rate?: number;
};

const OtherTab = () => {
  const { toast } = useToast();
  const [costs, setCosts] = useState<OtherCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<OtherCost | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [priceIncludesVAT, setPriceIncludesVAT] = useState(() => localStorage.getItem('other_costs_price_includes_vat') === 'true');
  const [vatRate, setVATRate] = useState(() => localStorage.getItem('other_costs_vat_rate') || '20');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('other_costs').select('*').order('date', { ascending: false });
    if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    else setCosts((data || []) as OtherCost[]);
    setLoading(false);
  }, [toast]);

  usePullToRefresh(fetchData);
  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setCategory(''); setDescription(''); setPrice(''); setNotes('');
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!date || !category || !description || !price) {
      toast({ title: 'Chyba', description: 'Vyplň všetky povinné polia.', variant: 'destructive' });
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: 'Chyba', description: 'Zadaj platnú cenu.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    localStorage.setItem('other_costs_price_includes_vat', String(priceIncludesVAT));
    localStorage.setItem('other_costs_vat_rate', vatRate);

    const payload = {
      date,
      category,
      description,
      price: priceNum,
      notes: notes || null,
      price_includes_vat: priceIncludesVAT,
      vat_rate: parseFloat(vatRate),
    };

    if (editing) {
      const { error } = await supabase.from('other_costs').update(payload).eq('id', editing.id);
      if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Uložené' }); fetchData(); resetForm(); }
    } else {
      const { error } = await supabase.from('other_costs').insert([payload]);
      if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Pridané' }); fetchData(); resetForm(); }
    }
    setSaving(false);
  };

  const handleEdit = (c: OtherCost) => {
    setEditing(c);
    setDate(c.date.split('T')[0]);
    setCategory(c.category);
    setDescription(c.description);
    setPrice(c.price.toString());
    setNotes(c.notes || '');
    if (c.price_includes_vat !== undefined) setPriceIncludesVAT(c.price_includes_vat);
    if (c.vat_rate !== undefined) setVATRate(c.vat_rate.toString());
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('other_costs').delete().eq('id', deleteId);
    if (error) toast({ title: 'Chyba', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Zmazané' }); fetchData(); }
    setDeleteId(null);
  };

  const totalCost = costs.reduce((s, c) => s + c.price, 0);
  const uniqueCategories = Array.from(new Set(costs.map(c => c.category))).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-1">
        <FormCard title="Pridať ostatný náklad" editing={!!editing} saving={saving} onSubmit={handleSubmit} onCancel={resetForm}>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Dátum *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Kategória *</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="napr. Kancelária, Marketing..." className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Popis *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="napr. Tonery do tlačiarne" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Cena (€) *</Label>
            <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#475569]">Poznámka</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Voliteľné" className="text-sm" />
          </div>
          <VATSection storageKey="other_costs" priceIncludesVAT={priceIncludesVAT} setPriceIncludesVAT={setPriceIncludesVAT} vatRate={vatRate} setVATRate={setVATRate} />
        </FormCard>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard label="Celkové náklady" value={formatEur(totalCost)} color="green" Icon={Euro} />
          <SummaryCard label="Kategórií" value={String(uniqueCategories)} color="purple" Icon={Receipt} />
        </div>

        <ListCard title="História nákladov" count={costs.length} loading={loading} empty={costs.length === 0} emptyText="Zatiaľ žiadne náklady." EmptyIcon={Receipt}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Dátum</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Kategória</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wide">Popis</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Cena</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wide">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {costs.map(c => (
                  <tr key={c.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-3 py-2 text-[#0f172a] whitespace-nowrap">{format(new Date(c.date), 'd.M.yyyy')}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold bg-[#ede9fe] text-[#7c3aed]">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-[#0f172a]">{c.description}</p>
                      {c.notes && <p className="text-[11px] text-[#475569]">{c.notes}</p>}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-[#0f172a]">{formatEur(c.price)}</td>
                    <td className="px-3 py-2 text-right">
                      <RowActions onEdit={() => handleEdit(c)} onDelete={() => setDeleteId(c.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListCard>
      </div>

      <DeleteDialog open={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
};

// ===================== SHARED MINI COMPONENTS =====================

const SummaryCard = ({ label, value, color, Icon }: { label: string; value: string; color: 'green' | 'blue' | 'purple'; Icon: any }) => {
  const colorMap = {
    green: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
    blue: { bg: '#dbeafe', border: '#bfdbfe', text: '#2563eb' },
    purple: { bg: '#ede9fe', border: '#ddd6fe', text: '#7c3aed' },
  };
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm p-3 flex items-center gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border" style={{ backgroundColor: c.bg, borderColor: c.border }}>
        <Icon className="h-5 w-5" style={{ color: c.text }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-[#475569] font-semibold">{label}</p>
        <p className="text-lg font-bold text-[#0f172a] truncate">{value}</p>
      </div>
    </div>
  );
};

const DeleteDialog = ({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) => (
  <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
    <AlertDialogContent className="bg-white">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-[#0f172a]">Zmazať záznam?</AlertDialogTitle>
        <AlertDialogDescription className="text-[#475569]">Táto akcia je nevratná.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Zrušiť</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-[#dc2626] hover:bg-[#b91c1c]">Zmazať</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// ===================== MAIN COSTS PAGE =====================

const TAB_COMPONENTS: Record<CostTab, React.FC> = {
  fuel: FuelTab,
  adblue: AdblueTab,
  electricity: ElectricityTab,
  water: WaterTab,
  'car-service': CarServiceTab,
  other: OtherTab,
};

const CostsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: CostTab = TAB_ORDER.includes(tabParam as CostTab) ? (tabParam as CostTab) : 'fuel';

  // Month summary — sum naprieč všetkými 6 tabuľkami pre aktuálny mesiac
  const [monthlySummary, setMonthlySummary] = useState<Record<CostTab, number>>({
    fuel: 0, adblue: 0, electricity: 0, water: 0, 'car-service': 0, other: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  const monthRange = useMemo(() => getCurrentMonthRange(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSummaryLoading(true);
      const results: Partial<Record<CostTab, number>> = {};

      await Promise.all(TAB_ORDER.map(async (tab) => {
        const cfg = TAB_CONFIG[tab];
        try {
          const { data, error } = await supabase
            .from(cfg.table)
            .select(`${cfg.priceField}, ${cfg.dateField}`)
            .gte(cfg.dateField, monthRange.start)
            .lte(cfg.dateField, monthRange.end);
          if (error) {
            console.warn(`[CostsPage] Summary fetch failed for ${cfg.table}:`, error.message);
            results[tab] = 0;
            return;
          }
          const sum = (data || []).reduce((s: number, row: any) => s + (Number(row[cfg.priceField]) || 0), 0);
          results[tab] = sum;
        } catch (err) {
          console.warn(`[CostsPage] Summary exception for ${cfg.table}:`, err);
          results[tab] = 0;
        }
      }));

      if (cancelled) return;
      setMonthlySummary(results as Record<CostTab, number>);
      setSummaryLoading(false);
    })();
    return () => { cancelled = true; };
  }, [monthRange]);

  const totalMonth = useMemo(
    () => TAB_ORDER.reduce((s, t) => s + (monthlySummary[t] || 0), 0),
    [monthlySummary]
  );

  const handleTabClick = (tab: CostTab) => {
    setSearchParams({ tab });
  };

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <MainLayout hideMobileHeader>
      <div className="min-h-screen pb-20 md:pb-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center">
            <Receipt className="h-5 w-5 text-[#16a34a]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-[#0f172a]">Náklady</h1>
            <p className="text-xs md:text-sm text-[#475569]">Evidencia prevádzkových nákladov</p>
          </div>
        </div>

        {/* Monthly summary */}
        <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Euro className="h-4 w-4 text-[#16a34a] flex-shrink-0" />
              <h2 className="text-sm font-bold text-[#0f172a] truncate">
                Tento mesiac · {monthRange.label}
              </h2>
            </div>
            <div className="text-right flex-shrink-0">
              {summaryLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <p className="text-xl md:text-2xl font-bold text-[#16a34a]">{formatEur(totalMonth)}</p>
              )}
            </div>
          </div>
          {!summaryLoading && (
            <div className="px-4 py-3 flex flex-wrap gap-1.5">
              {TAB_ORDER.map(t => {
                const cfg = TAB_CONFIG[t];
                const value = monthlySummary[t] || 0;
                const Icon = cfg.icon;
                const isActive = activeTab === t;
                return (
                  <button
                    key={t}
                    onClick={() => handleTabClick(t)}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold border transition-colors',
                      isActive
                        ? 'bg-[#16a34a] border-[#16a34a] text-white'
                        : value > 0
                          ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#16a34a] hover:bg-[#dcfce7]'
                          : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#bbf7d0]'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {cfg.label}: {formatEur(value)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-[#cbd5e1] shadow-sm overflow-hidden">
          <div className="border-b border-[#e2e8f0] overflow-x-auto">
            <div className="flex">
              {TAB_ORDER.map(tab => {
                const cfg = TAB_CONFIG[tab];
                const Icon = cfg.icon;
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabClick(tab)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                      isActive
                        ? 'border-[#16a34a] text-[#16a34a] bg-[#f0fdf4]'
                        : 'border-transparent text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc]'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active tab content (lazy render — len aktívny tab) */}
          <div className="p-3 md:p-4">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CostsPage;
