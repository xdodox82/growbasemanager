// IMPORTANT: Use 'House' not 'Home' - Home is Chrome browser icon, House is home icon
import { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCustomers, useDeliveryRoutes, useOrders, DbCustomer } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Users, Plus, Pencil, Trash2, Mail, Phone, MapPin, Navigation, Loader as Loader2, ShoppingCart, House, Utensils, Store, ChevronDown, Grid3x3, List, Search, Route, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const FILTER_STORAGE_KEY = 'customers_default_filters';

// ─── helpers ─────────────────────────────────────────────────────────────────
const typeChip = (type: string | null | undefined) => {
  if (type === 'home')      return { label: 'Domáci',  bg: 'bg-[#f0fdf4]', border: 'border-[#16a34a]', text: 'text-[#16a34a]', Icon: House };
  if (type === 'gastro')    return { label: 'Gastro',  bg: 'bg-[#eff6ff]', border: 'border-[#2563eb]', text: 'text-[#2563eb]', Icon: Utensils };
  if (type === 'wholesale') return { label: 'VO',      bg: 'bg-[#fff7ed]', border: 'border-[#d97706]', text: 'text-[#d97706]', Icon: Store };
  return null;
};

const paymentLabel = (m: string) =>
  m === 'invoice' ? 'Faktúra' : m === 'card' ? 'Karta' : 'Hotovosť';

const displayName = (c: DbCustomer) =>
  (c.customer_type === 'gastro' || c.customer_type === 'wholesale') && (c as any).company_name
    ? (c as any).company_name
    : c.name;

// ─── component ───────────────────────────────────────────────────────────────
const CustomersPage = () => {
  const { data: customers, loading, add, update, remove, refetch } = useCustomers();
  const { data: deliveryRoutes } = useDeliveryRoutes();
  const { data: orders } = useOrders();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try { return JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) || '{}').viewMode || 'grid'; } catch { return 'grid'; }
  });
  const [typeFilter, setTypeFilter] = useState<string>(() => {
    try { return JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) || '{}').typeFilter || 'all'; } catch { return 'all'; }
  });
  const [routeFilter, setRouteFilter] = useState<string>(() => {
    try { return JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) || '{}').routeFilter || 'all'; } catch { return 'all'; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<DbCustomer | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<DbCustomer | null>(null);
  const [customerCredits, setCustomerCredits] = useState<Record<string, { credit: number; wallet_enabled: boolean }>>({});

  const effectiveViewMode = isMobile ? 'grid' : viewMode;

  // Form state
  const emptyForm = {
    name: '', email: '', phone: '', address: '', delivery_notes: '',
    delivery_route_id: null as string | null, customer_type: null as string | null,
    payment_method: 'cash' as 'cash' | 'card' | 'invoice',
    free_delivery: false, uses_returnable_containers: false,
    default_packaging_type: 'rPET',
    company_name: '', contact_name: '', ico: '', dic: '', ic_dph: '', bank_account: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  const resetForm = () => { setFormData(emptyForm); setEditingCustomer(null); };

  const openEdit = (customer: DbCustomer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name, email: customer.email || '', phone: customer.phone || '',
      address: customer.address || '', delivery_notes: customer.delivery_notes || '',
      delivery_route_id: customer.delivery_route_id || null,
      customer_type: (customer as any).customer_type || null,
      payment_method: (customer as any).payment_method || 'cash',
      free_delivery: (customer as any).free_delivery || false,
      uses_returnable_containers: (customer as any).uses_returnable_containers || false,
      default_packaging_type: (customer as any).default_packaging_type || 'rPET',
      company_name: (customer as any).company_name || '',
      contact_name: (customer as any).contact_name || '',
      ico: (customer as any).ico || '', dic: (customer as any).dic || '',
      ic_dph: (customer as any).ic_dph || '', bank_account: (customer as any).bank_account || '',
    });
    setIsDialogOpen(true);
  };

  const openDetail = useCallback(async (customer: DbCustomer) => {
    setDetailCustomer(customer);
    setDetailOpen(true);
    const { data } = await supabase.from('customers').select('credit, wallet_enabled').eq('id', customer.id).maybeSingle();
    if (data) setCustomerCredits(prev => ({ ...prev, [customer.id]: { credit: data.credit || 0, wallet_enabled: data.wallet_enabled || false } }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast({ title: 'Chyba', description: 'Zadajte meno zákazníka', variant: 'destructive' }); return; }
    setSaving(true);
    const data = {
      name: formData.name, email: formData.email || null, phone: formData.phone || null,
      address: formData.address || null, delivery_notes: formData.delivery_notes || null,
      delivery_route_id: formData.delivery_route_id || null,
      delivery_day_ids: editingCustomer?.delivery_day_ids || [],
      customer_type: formData.customer_type || null,
      payment_method: formData.payment_method,
      free_delivery: formData.free_delivery,
      uses_returnable_containers: formData.uses_returnable_containers,
      default_packaging_type: formData.default_packaging_type || 'rPET',
      company_name: formData.company_name || null, contact_name: formData.contact_name || null,
      ico: formData.ico || null, dic: formData.dic || null,
      ic_dph: formData.ic_dph || null, bank_account: formData.bank_account || null,
    };
    if (editingCustomer) {
      const { error } = await update(editingCustomer.id, data);
      if (!error) { toast({ title: 'Zákazník aktualizovaný' }); setIsDialogOpen(false); resetForm(); }
    } else {
      const { error } = await add(data);
      if (!error) { toast({ title: 'Zákazník pridaný' }); setIsDialogOpen(false); resetForm(); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const customer = customers.find(c => c.id === deleteId);
    const { error } = await remove(deleteId);
    if (!error) toast({ title: 'Zákazník odstránený', description: `${customer?.name} bol odstránený.` });
    setDeleteId(null);
  };

  // Stats
  const customerStats = useMemo(() => {
    const s: Record<string, number> = {};
    orders.forEach(o => { if (o.customer_id) s[o.customer_id] = (s[o.customer_id] || 0) + 1; });
    return s;
  }, [orders]);

  const getRouteName = (id: string | null) => deliveryRoutes.find(r => r.id === id)?.name || null;

  // Filtered list
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => {
        const t = typeFilter === 'all' || c.customer_type === typeFilter;
        const r = routeFilter === 'all' || c.delivery_route_id === routeFilter;
        const q = !searchQuery || displayName(c).toLowerCase().includes(searchQuery.toLowerCase()) || c.email?.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone?.includes(searchQuery);
        return t && r && q;
      })
      .sort((a, b) => {
        const ln = (c: DbCustomer) => { const parts = displayName(c).trim().split(' '); return parts[parts.length - 1].toLowerCase(); };
        return ln(a).localeCompare(ln(b), 'sk');
      });
  }, [customers, typeFilter, routeFilter, searchQuery]);

  // Active filter count
  const activeFilters = [typeFilter !== 'all', routeFilter !== 'all', !!searchQuery].filter(Boolean).length;

  // Input helper
  const inp = (label: string, id: string, value: string, onChange: (v: string) => void, opts: { placeholder?: string; type?: string; required?: boolean } = {}) => (
    <div>
      <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">{label}{opts.required && ' *'}</label>
      <Input id={id} type={opts.type || 'text'} value={value} onChange={e => onChange(e.target.value)}
        placeholder={opts.placeholder || ''} className="h-9 border-[#e2e8f0] text-[13px] bg-white" />
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <MainLayout hideMobileHeader>
      <div className="p-6 space-y-4">
        <div className="h-10 bg-white rounded-xl border border-[#e2e8f0] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout hideMobileHeader>
      <div className="p-6 space-y-4">

        {/* ── TOPBAR ── */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] px-4 py-3 flex items-center gap-2 mb-4">
          <span className="text-xl font-bold text-[#0f172a] mr-auto">Zákazníci</span>

          {/* View toggle */}
          <div className="hidden md:flex items-center gap-0.5">
            <button onClick={() => setViewMode('grid')} title="Karty"
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc]'}`}>
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button onClick={() => setViewMode('list')} title="Zoznam"
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc]'}`}>
              <List className="w-5 h-5" />
            </button>
          </div>

          <div className="w-px h-5 bg-[#e2e8f0]" />

          <button onClick={() => { setEditingCustomer(null); resetForm(); setIsDialogOpen(true); }}
            className="flex items-center gap-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors">
            <Plus className="w-5 h-5" />
            Pridať zákazníka
          </button>
        </div>

        {/* ── FILTER BAR ── */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] px-4 mb-4">
          {/* Header */}
          <div className="flex items-center gap-2 py-2.5 cursor-pointer select-none" onClick={() => setFiltersCollapsed(v => !v)}>
            <ChevronDown className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform duration-200 ${filtersCollapsed ? '-rotate-90' : ''}`} />
            <span className="text-[12px] font-semibold text-[#374151] uppercase tracking-wider">Filtre</span>
            {filtersCollapsed && activeFilters > 0 && (
              <span className="ml-1 bg-[#16a34a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{activeFilters}</span>
            )}
            {!filtersCollapsed && (
              <span className="ml-auto text-[11px] text-[#94a3b8]">{filteredCustomers.length} zákazníkov</span>
            )}
          </div>

          {!filtersCollapsed && (
            <div className="border-t border-[#f1f5f9]">
              {/* Riadok 1: Typ zákazníka + hľadanie */}
              <div className="flex items-center gap-2 flex-wrap py-2.5">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[85px] shrink-0">Zákazník</span>
                {['all', 'home', 'gastro', 'wholesale'].map(t => {
                  const active = typeFilter === t;
                  const chip = typeChip(t);
                  return (
                    <button key={t} onClick={() => setTypeFilter(t)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border-[1.5px] text-[12px] font-medium cursor-pointer transition-colors ${
                        active ? (chip ? `${chip.bg} ${chip.border} ${chip.text}` : 'bg-[#16a34a] border-[#16a34a] text-white') : 'border-[#e2e8f0] text-[#374151] bg-white hover:border-[#bbf7d0] hover:text-[#16a34a] hover:bg-[#f0fdf4]'
                      }`}>
                      {chip && <chip.Icon className="w-3.5 h-3.5" />}
                      {t === 'all' ? 'Všetci' : chip?.label}
                    </button>
                  );
                })}
                {/* Search */}
                <div className="relative ml-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
                  <input
                    type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Hľadať zákazníka..."
                    className="h-8 pl-8 pr-3 border-[1.5px] border-[#e2e8f0] rounded-md text-[12px] bg-white outline-none focus:border-[#16a34a] w-[200px] transition-colors"
                  />
                </div>
              </div>

              <div className="border-t border-[#f8fafc]" />

              {/* Riadok 2: Trasa */}
              <div className="flex items-center gap-2 flex-wrap py-2.5">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[85px] shrink-0">Trasa</span>
                <button onClick={() => setRouteFilter('all')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border-[1.5px] text-[12px] font-medium cursor-pointer transition-colors ${routeFilter === 'all' ? 'bg-[#16a34a] border-[#16a34a] text-white' : 'border-[#e2e8f0] text-[#374151] bg-white hover:border-[#bbf7d0] hover:text-[#16a34a] hover:bg-[#f0fdf4]'}`}>
                  Všetky
                </button>
                {deliveryRoutes.map(r => (
                  <button key={r.id} onClick={() => setRouteFilter(r.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border-[1.5px] text-[12px] font-medium cursor-pointer transition-colors ${routeFilter === r.id ? 'bg-[#16a34a] border-[#16a34a] text-white' : 'border-[#e2e8f0] text-[#374151] bg-white hover:border-[#bbf7d0] hover:text-[#16a34a] hover:bg-[#f0fdf4]'}`}>
                    <Route className="w-3 h-3" />{r.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── CONTENT ── */}
        {customers.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
            <Users className="h-10 w-10 text-[#cbd5e1] mx-auto mb-3" />
            <div className="text-[15px] font-semibold text-[#0f172a] mb-1">Žiadni zákazníci</div>
            <div className="text-[13px] text-[#94a3b8] mb-4">Začnite pridaním vášho prvého zákazníka.</div>
            <button onClick={() => setIsDialogOpen(true)}
              className="inline-flex items-center gap-2 bg-[#16a34a] text-white rounded-lg px-4 py-2 text-sm font-semibold">
              <Plus className="w-4 h-4" />Pridať zákazníka
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
            <Search className="h-10 w-10 text-[#cbd5e1] mx-auto mb-3" />
            <div className="text-[15px] font-semibold text-[#0f172a] mb-1">Žiadne výsledky</div>
            <div className="text-[13px] text-[#94a3b8]">Skúste zmeniť filtre alebo vyhľadávanie.</div>
          </div>
        ) : effectiveViewMode === 'grid' ? (

          /* ── GRID VIEW ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCustomers.map(customer => {
              const tc = typeChip(customer.customer_type);
              const dn = displayName(customer);
              const stats = customerStats[customer.id] || 0;
              const routeName = getRouteName(customer.delivery_route_id);
              return (
                <div key={customer.id}
                  className="bg-white rounded-xl border-[1.5px] border-[#e2e8f0] hover:shadow-md hover:border-[#cbd5e1] transition-all cursor-pointer overflow-hidden"
                  onClick={() => openDetail(customer)}
                >
                  {/* Header */}
                  <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        customer.customer_type === 'home' ? 'bg-[#f0fdf4]' :
                        customer.customer_type === 'gastro' ? 'bg-[#eff6ff]' :
                        customer.customer_type === 'wholesale' ? 'bg-[#fff7ed]' : 'bg-[#f8fafc]'
                      }`}>
                        {tc ? <tc.Icon className={`h-5 w-5 ${tc.text}`} /> : <Users className="h-5 w-5 text-[#94a3b8]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[14px] text-[#0f172a] truncate">{dn || 'Bez mena'}</div>
                        {(customer.customer_type === 'gastro' || customer.customer_type === 'wholesale') && (customer as any).company_name && customer.name !== (customer as any).company_name && (
                          <div className="text-[11px] text-[#94a3b8] truncate">{customer.name}</div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {tc && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${tc.bg} ${tc.border} ${tc.text}`}>
                              <tc.Icon className="w-2.5 h-2.5" />{tc.label}
                            </span>
                          )}
                          {(customer as any).ico && (
                            <span className="text-[10px] text-[#94a3b8]">IČO: {(customer as any).ico}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#94a3b8] hover:bg-[#f0fdf4] hover:text-[#16a34a] transition-colors" onClick={() => openEdit(customer)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {isAdmin && (
                        <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#94a3b8] hover:bg-[#fef2f2] hover:text-[#dc2626] transition-colors" onClick={() => setDeleteId(customer.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="px-4 pb-3 space-y-1.5">
                    {customer.phone && (
                      <div className="flex items-center justify-between text-[12px] text-[#374151]">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                        <a href={`tel:${customer.phone}`} onClick={e => e.stopPropagation()}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[#16a34a] hover:bg-[#f0fdf4] transition-colors">
                          <Phone className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center justify-between text-[12px] text-[#374151]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Mail className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                        <a href={`mailto:${customer.email}`} onClick={e => e.stopPropagation()}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-[#16a34a] hover:bg-[#f0fdf4] transition-colors shrink-0">
                          <Mail className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {routeName && (
                      <div className="flex items-center gap-1.5 text-[12px] text-[#374151]">
                        <Route className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" />
                        <span>{routeName}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-[#f1f5f9] px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[12px] text-[#475569]">
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>{stats} obj.</span>
                    </div>
                    <div className="flex gap-3 text-[11px] text-[#94a3b8]">
                      {(customer as any).free_delivery && <span className="text-[#16a34a] font-medium">Doprava zdarma</span>}
                      {(customer as any).uses_returnable_containers && <span className="flex items-center gap-0.5"><Package className="h-3 w-3" />Vratné obaly</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* ── LIST VIEW ── */
          <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wider">Zákazník</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wider">Kontakt</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wider">Trasa</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wider">Platba</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-[#475569] uppercase tracking-wider">Obj.</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wider">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filteredCustomers.map(customer => {
                  const tc = typeChip(customer.customer_type);
                  const dn = displayName(customer);
                  return (
                    <tr key={customer.id} className="hover:bg-[#f8fafc] cursor-pointer transition-colors" onClick={() => openDetail(customer)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            customer.customer_type === 'home' ? 'bg-[#f0fdf4]' :
                            customer.customer_type === 'gastro' ? 'bg-[#eff6ff]' :
                            customer.customer_type === 'wholesale' ? 'bg-[#fff7ed]' : 'bg-[#f8fafc]'
                          }`}>
                            {tc ? <tc.Icon className={`h-4 w-4 ${tc.text}`} /> : <Users className="h-4 w-4 text-[#94a3b8]" />}
                          </div>
                          <div>
                            <div className="font-semibold text-[13px] text-[#0f172a]">{dn}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {tc && (
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium ${tc.bg} border ${tc.border} ${tc.text}`}>
                                  <tc.Icon className="w-2.5 h-2.5" />{tc.label}
                                </span>
                              )}
                              {(customer as any).ico && <span className="text-[10px] text-[#94a3b8]">IČO: {(customer as any).ico}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="space-y-1">
                          {customer.phone && (
                            <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-[12px] text-[#374151] hover:text-[#16a34a] transition-colors">
                              <Phone className="h-3 w-3 shrink-0" />{customer.phone}
                            </a>
                          )}
                          {customer.email && (
                            <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-[12px] text-[#374151] hover:text-[#16a34a] transition-colors">
                              <Mail className="h-3 w-3 shrink-0" /><span className="truncate max-w-[160px]">{customer.email}</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#374151]">{getRouteName(customer.delivery_route_id) || <span className="text-[#cbd5e1]">—</span>}</td>
                      <td className="px-4 py-3 text-[12px] text-[#374151]">{paymentLabel((customer as any).payment_method || 'cash')}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[13px] font-bold text-[#0f172a]">{customerStats[customer.id] || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-0.5 justify-end">
                          <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#94a3b8] hover:bg-[#f0fdf4] hover:text-[#16a34a] transition-colors" onClick={() => openEdit(customer)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {isAdmin && (
                            <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#94a3b8] hover:bg-[#fef2f2] hover:text-[#dc2626] transition-colors" onClick={() => setDeleteId(customer.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ── ADD/EDIT DIALOG ── */}
      <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }} >
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto" onInteractOutside={e => e.preventDefault()}>
          <form onSubmit={handleSubmit}>
            <DialogHeader className="pb-4">
              <DialogTitle className="text-[16px] font-bold text-[#0f172a]">
                {editingCustomer ? 'Upraviť zákazníka' : 'Nový zákazník'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Typ zákazníka */}
              <div>
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-2 block">Typ zákazníka *</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['home', 'Domáci', House, '#16a34a', '#f0fdf4'], ['gastro', 'Gastro', Utensils, '#2563eb', '#eff6ff'], ['wholesale', 'VO', Store, '#d97706', '#fff7ed']] as const).map(([t, l, Icon, color, bg]) => (
                    <button key={t} type="button" onClick={() => setFormData({ ...formData, customer_type: t })}
                      className={`h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${formData.customer_type === t ? 'border-current' : 'border-[#e2e8f0] hover:border-[#cbd5e1]'}`}
                      style={formData.customer_type === t ? { borderColor: color, backgroundColor: bg } : {}}>
                      <Icon className="h-5 w-5" style={{ color: formData.customer_type === t ? color : '#94a3b8' }} />
                      <span className="text-[12px] font-semibold" style={{ color: formData.customer_type === t ? color : '#64748b' }}>{l}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gastro/VO extra fields */}
              {(formData.customer_type === 'gastro' || formData.customer_type === 'wholesale') && (
                <div className="grid grid-cols-2 gap-3">
                  {inp('Obchodný názov', 'company_name', formData.company_name, v => setFormData({ ...formData, company_name: v }), { placeholder: 'napr. Reštaurácia s.r.o.' })}
                  {inp('Kontaktná osoba *', 'name', formData.name, v => setFormData({ ...formData, name: v }), { placeholder: 'Ján Novák', required: true })}
                </div>
              )}

              {/* Home name */}
              {(formData.customer_type === 'home' || !formData.customer_type) && (
                inp('Meno *', 'name', formData.name, v => setFormData({ ...formData, name: v }), { placeholder: 'napr. Ján Novák', required: true })
              )}

              {/* IČO/DIČ pre gastro/VO */}
              {(formData.customer_type === 'gastro' || formData.customer_type === 'wholesale') && (
                <div className="grid grid-cols-3 gap-3">
                  {inp('IČO', 'ico', formData.ico, v => setFormData({ ...formData, ico: v }), { placeholder: '12345678' })}
                  {inp('DIČ', 'dic', formData.dic, v => setFormData({ ...formData, dic: v }), { placeholder: '2012345678' })}
                  {inp('IČ DPH', 'ic_dph', formData.ic_dph, v => setFormData({ ...formData, ic_dph: v }), { placeholder: 'SK20123...' })}
                </div>
              )}

              {/* Kontakt */}
              <div className="grid grid-cols-2 gap-3">
                {inp('Email', 'email', formData.email, v => setFormData({ ...formData, email: v }), { placeholder: 'info@example.sk', type: 'email' })}
                {inp('Telefón', 'phone', formData.phone, v => setFormData({ ...formData, phone: v }), { placeholder: '+421 900 123 456' })}
              </div>

              {/* Adresa */}
              <div>
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">Adresa</label>
                <Textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ulica, Mesto, PSČ" rows={2} className="border-[#e2e8f0] text-[13px] resize-none" />
              </div>

              {/* Bankový účet pre gastro/VO */}
              {(formData.customer_type === 'gastro' || formData.customer_type === 'wholesale') && (
                inp('Bankový účet', 'bank_account', formData.bank_account, v => setFormData({ ...formData, bank_account: v }), { placeholder: 'SK12 3456 7890...' })
              )}

              {/* Nastavenia */}
              <div className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] p-4 space-y-3">
                <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">Nastavenia doručenia</div>

                {/* Trasa */}
                <div>
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">Rozvozová trasa</label>
                  <Select value={formData.delivery_route_id || 'none'} onValueChange={v => setFormData({ ...formData, delivery_route_id: v === 'none' ? null : v })}>
                    <SelectTrigger className="h-9 border-[#e2e8f0] bg-white text-[13px]"><SelectValue placeholder="Vyberte trasu" /></SelectTrigger>
                    <SelectContent className="bg-white z-[9999]">
                      <SelectItem value="none">Žiadna trasa</SelectItem>
                      {deliveryRoutes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Platba */}
                  <div>
                    <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">Spôsob platby</label>
                    <Select value={formData.payment_method} onValueChange={(v: 'cash'|'card'|'invoice') => setFormData({ ...formData, payment_method: v })}>
                      <SelectTrigger className="h-9 border-[#e2e8f0] bg-white text-[13px]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white z-[9999]">
                        <SelectItem value="cash">Hotovosť</SelectItem>
                        <SelectItem value="card">Karta</SelectItem>
                        <SelectItem value="invoice">Faktúra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Obal */}
                  <div>
                    <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">Predvolený obal</label>
                    <Select value={formData.default_packaging_type} onValueChange={v => setFormData({ ...formData, default_packaging_type: v })}>
                      <SelectTrigger className="h-9 border-[#e2e8f0] bg-white text-[13px]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white z-[9999]">
                        <SelectItem value="rPET">rPET</SelectItem>
                        <SelectItem value="PET">PET</SelectItem>
                        <SelectItem value="EKO">EKO</SelectItem>
                        <SelectItem value="Vratný obal">Vratný obal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Switche */}
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch id="free_delivery" checked={formData.free_delivery} onCheckedChange={v => setFormData({ ...formData, free_delivery: v })} />
                    <Label htmlFor="free_delivery" className="text-[13px] cursor-pointer">Doprava zdarma</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="returnable" checked={formData.uses_returnable_containers} onCheckedChange={v => setFormData({ ...formData, uses_returnable_containers: v })} />
                    <Label htmlFor="returnable" className="text-[13px] cursor-pointer">Vratné obaly</Label>
                  </div>
                </div>
              </div>

              {/* Poznámky */}
              <div>
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">Poznámky k dodaniu</label>
                <Textarea value={formData.delivery_notes} onChange={e => setFormData({ ...formData, delivery_notes: e.target.value })}
                  placeholder="Špeciálne požiadavky, dodacie inštrukcie..." rows={2} className="border-[#e2e8f0] text-[13px] resize-none" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-5 border-t border-[#f1f5f9] mt-5">
              <button type="button" onClick={() => { setIsDialogOpen(false); resetForm(); }}
                className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-[13px] font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">
                Zrušiť
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-[13px] font-semibold transition-colors disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingCustomer ? 'Uložiť zmeny' : 'Pridať zákazníka'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DETAIL DIALOG ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailCustomer && (() => {
            const c = detailCustomer;
            const tc = typeChip(c.customer_type);
            const dn = displayName(c);
            const wallet = customerCredits[c.id];
            return (
              <>
                <DialogHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tc ? tc.bg : 'bg-[#f8fafc]'}`}>
                      {tc ? <tc.Icon className={`h-6 w-6 ${tc.text}`} /> : <Users className="h-6 w-6 text-[#94a3b8]" />}
                    </div>
                    <div>
                      <DialogTitle className="text-[16px] font-bold text-[#0f172a]">{dn}</DialogTitle>
                      {(c.customer_type === 'gastro' || c.customer_type === 'wholesale') && (c as any).company_name && c.name !== (c as any).company_name && (
                        <div className="text-[12px] text-[#94a3b8]">{c.name}</div>
                      )}
                      {tc && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold mt-1 ${tc.bg} ${tc.border} ${tc.text}`}>
                          <tc.Icon className="w-2.5 h-2.5" />{tc.label}
                        </span>
                      )}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-px bg-[#f1f5f9] border border-[#f1f5f9] rounded-xl overflow-hidden">
                    {c.phone && (
                      <div className="bg-white px-4 py-3">
                        <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">Telefón</div>
                        <a href={`tel:${c.phone}`} className="text-[13px] font-semibold text-[#16a34a] flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />{c.phone}
                        </a>
                      </div>
                    )}
                    {c.email && (
                      <div className="bg-white px-4 py-3">
                        <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">Email</div>
                        <a href={`mailto:${c.email}`} className="text-[13px] font-semibold text-[#16a34a] flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{c.email}</span>
                        </a>
                      </div>
                    )}
                    {getRouteName(c.delivery_route_id) && (
                      <div className="bg-white px-4 py-3">
                        <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">Trasa</div>
                        <div className="text-[13px] font-bold text-[#0f172a] flex items-center gap-1.5">
                          <Route className="h-3.5 w-3.5 text-[#94a3b8]" />{getRouteName(c.delivery_route_id)}
                        </div>
                      </div>
                    )}
                    <div className="bg-white px-4 py-3">
                      <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">Platba</div>
                      <div className="text-[13px] font-bold text-[#0f172a]">{paymentLabel((c as any).payment_method || 'cash')}</div>
                    </div>
                    <div className="bg-white px-4 py-3">
                      <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">Objednávky</div>
                      <div className="text-[13px] font-bold text-[#0f172a] flex items-center gap-1.5">
                        <ShoppingCart className="h-3.5 w-3.5 text-[#94a3b8]" />{customerStats[c.id] || 0} obj.
                      </div>
                    </div>
                    {(c as any).ico && (
                      <div className="bg-white px-4 py-3">
                        <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">IČO</div>
                        <div className="text-[13px] font-bold text-[#0f172a]">{(c as any).ico}</div>
                      </div>
                    )}
                  </div>

                  {/* Adresa */}
                  {c.address && (
                    <div className="flex items-start justify-between gap-3 px-4 py-3 bg-white border border-[#cbd5e1] rounded-xl">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-[#94a3b8] mt-0.5 shrink-0" />
                        <span className="text-[13px] text-[#475569]">{c.address}</span>
                      </div>
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1 text-[12px] text-[#16a34a] font-medium hover:underline">
                        <Navigation className="h-3.5 w-3.5" />Navigovať
                      </a>
                    </div>
                  )}

                  {/* Pugilar wallet */}
                  {wallet?.wallet_enabled && (
                    <div className="px-4 py-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #3B6D11, #639922)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-white/80 text-[12px]">Pugilar kredit</span>
                        <span className="text-white text-[18px] font-bold">{(wallet.credit || 0).toFixed(2).replace('.', ',')} €</span>
                      </div>
                    </div>
                  )}

                  {/* Poznámky */}
                  {c.delivery_notes && (
                    <div className="px-4 py-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl">
                      <div className="text-[10px] font-semibold text-[#1e40af] uppercase tracking-wider mb-1">Poznámky k dodaniu</div>
                      <div className="text-[13px] text-[#1d4ed8] whitespace-pre-wrap">{c.delivery_notes}</div>
                    </div>
                  )}

                  {/* Flags */}
                  {((c as any).free_delivery || (c as any).uses_returnable_containers) && (
                    <div className="flex gap-2 flex-wrap">
                      {(c as any).free_delivery && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] text-[12px] font-medium">
                          Doprava zdarma
                        </span>
                      )}
                      {(c as any).uses_returnable_containers && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] text-[12px] font-medium">
                          <Package className="h-3.5 w-3.5" />Vratné obaly
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[#f1f5f9] mt-4">
                  <button onClick={() => setDetailOpen(false)}
                    className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-[13px] font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">
                    Zavrieť
                  </button>
                  <button onClick={() => { setDetailOpen(false); openEdit(c); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-[13px] font-semibold transition-colors">
                    <Pencil className="h-4 w-4" />Upraviť
                  </button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť zákazníka?</AlertDialogTitle>
            <AlertDialogDescription>Táto akcia je nevratná. Zákazník bude permanentne odstránený z databázy.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Odstrániť</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default CustomersPage;
