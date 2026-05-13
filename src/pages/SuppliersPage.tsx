import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSuppliers, DbSupplier } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Building2, Plus, Pencil, Trash2, Mail, Phone, MapPin, Navigation, Loader as Loader2, ChevronDown, Grid3x3, List, Search, Package, Leaf, FlaskConical, MoveHorizontal as MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const SUPPLIER_TYPES: Record<string, string> = {
  seeds: 'Semená',
  packaging: 'Obaly',
  substrate: 'Substrát',
  other: 'Ostatné',
};

const typeInfo = (t: string | null | undefined) => {
  if (t === 'seeds')     return { label: 'Semená',   bg: 'bg-[#f0fdf4]', border: 'border-[#16a34a]', text: 'text-[#16a34a]', Icon: Leaf };
  if (t === 'packaging') return { label: 'Obaly',    bg: 'bg-[#eff6ff]', border: 'border-[#2563eb]', text: 'text-[#2563eb]', Icon: Package };
  if (t === 'substrate') return { label: 'Substrát', bg: 'bg-[#fdf4ff]', border: 'border-[#a855f7]', text: 'text-[#7c3aed]', Icon: FlaskConical };
  if (t === 'other')     return { label: 'Ostatné',  bg: 'bg-[#f8fafc]', border: 'border-[#94a3b8]', text: 'text-[#64748b]', Icon: MoreHorizontal };
  return null;
};

const SuppliersPage = () => {
  const { data: suppliers, loading, add, update, remove } = useSuppliers();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<DbSupplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSupplier, setDetailSupplier] = useState<DbSupplier | null>(null);
  const effectiveViewMode = isMobile ? 'grid' : viewMode;

  const emptyForm = {
    name: '', company_name: '',
    supplier_type: '' as '' | 'seeds' | 'packaging' | 'substrate' | 'other',
    ico: '', ic_dph: '', dic: '', email: '', phone: '',
    address: '', bank_account: '', notes: '', contact_name: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const resetForm = () => { setFormData(emptyForm); setEditingSupplier(null); };

  const openEdit = (s: DbSupplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name, company_name: s.company_name || '',
      supplier_type: (s.supplier_type as any) || '',
      ico: s.ico || '', ic_dph: s.ic_dph || '', dic: s.dic || '',
      email: s.email || '', phone: s.phone || '',
      address: s.address || '', bank_account: s.bank_account || '',
      notes: s.notes || '', contact_name: s.contact_name || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast({ title: 'Chyba', description: 'Zadajte názov dodávateľa', variant: 'destructive' }); return; }
    setSaving(true);
    const data = {
      name: formData.name, company_name: formData.company_name || null,
      supplier_type: formData.supplier_type || null,
      ico: formData.ico || null, ic_dph: formData.ic_dph || null, dic: formData.dic || null,
      email: formData.email || null, phone: formData.phone || null,
      address: formData.address || null, bank_account: formData.bank_account || null,
      notes: formData.notes || null, contact_name: formData.contact_name || null,
    };
    if (editingSupplier) {
      const { error } = await update(editingSupplier.id, data);
      if (!error) { toast({ title: 'Dodávateľ aktualizovaný' }); setIsDialogOpen(false); resetForm(); }
    } else {
      const { error } = await add(data);
      if (!error) { toast({ title: 'Dodávateľ pridaný' }); setIsDialogOpen(false); resetForm(); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const s = suppliers.find(x => x.id === deleteId);
    const { error } = await remove(deleteId);
    if (!error) toast({ title: 'Dodávateľ odstránený', description: s?.name + ' bol odstránený.' });
    setDeleteId(null);
  };

  const filteredSuppliers = suppliers.filter(s => {
    const q = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const t = typeFilter === 'all' || s.supplier_type === typeFilter;
    return q && t;
  });

  const activeFilters = [typeFilter !== 'all', !!searchQuery].filter(Boolean).length;

  const inp = (label: string, id: string, value: string, onChange: (v: string) => void, opts: { placeholder?: string; type?: string } = {}) => (
    <div>
      <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">{label}</label>
      <Input id={id} type={opts.type || 'text'} value={value} onChange={e => onChange(e.target.value)}
        placeholder={opts.placeholder || ''} className="h-9 border-[#e2e8f0] text-[13px] bg-white" />
    </div>
  );

  if (loading) return (
    <MainLayout hideMobileHeader>
      <div className="p-6 space-y-4">
        <div className="h-14 bg-white rounded-xl border border-[#e2e8f0] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    </MainLayout>
  );

  const typeButtons = [
    ['seeds','Semená',Leaf,'#16a34a','#f0fdf4'],
    ['packaging','Obaly',Package,'#2563eb','#eff6ff'],
    ['substrate','Substrát',FlaskConical,'#7c3aed','#fdf4ff'],
    ['other','Ostatné',MoreHorizontal,'#64748b','#f8fafc'],
  ] as const;

  return (
    <MainLayout hideMobileHeader>
      <div className="p-6 space-y-4">

        <div className="bg-white rounded-xl border border-[#e2e8f0] px-4 py-3 flex items-center gap-2">
          <span className="text-xl font-bold text-[#0f172a] mr-auto">Dodávatelia</span>
          <div className="hidden md:flex items-center gap-0.5">
            <button onClick={() => setViewMode('grid')} className={"w-9 h-9 flex items-center justify-center rounded-lg transition-colors " + (viewMode === 'grid' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc]')}><Grid3x3 className="w-5 h-5" /></button>
            <button onClick={() => setViewMode('list')} className={"w-9 h-9 flex items-center justify-center rounded-lg transition-colors " + (viewMode === 'list' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc]')}><List className="w-5 h-5" /></button>
          </div>
          <div className="w-px h-5 bg-[#e2e8f0]" />
          <button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="flex items-center gap-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors">
            <Plus className="w-5 h-5" />Pridať dodávateľa
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] px-4">
          <div className="flex items-center gap-2 py-2.5 cursor-pointer select-none" onClick={() => setFiltersCollapsed(v => !v)}>
            <ChevronDown className={"w-3.5 h-3.5 text-[#94a3b8] transition-transform duration-200 " + (filtersCollapsed ? '-rotate-90' : '')} />
            <span className="text-[12px] font-semibold text-[#374151] uppercase tracking-wider">Filtre</span>
            {filtersCollapsed && activeFilters > 0 && <span className="ml-1 bg-[#16a34a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{activeFilters}</span>}
            {!filtersCollapsed && <span className="ml-auto text-[11px] text-[#94a3b8]">{filteredSuppliers.length} dodávateľov</span>}
          </div>
          {!filtersCollapsed && (
            <div className="border-t border-[#f1f5f9]">
              <div className="flex items-center gap-2 flex-wrap py-2.5">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[85px] shrink-0">Typ</span>
                {(['all', 'seeds', 'packaging', 'substrate', 'other'] as const).map(t => {
                  const active = typeFilter === t;
                  const ti = typeInfo(t);
                  return (
                    <button key={t} onClick={() => setTypeFilter(t)}
                      className={"inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border-[1.5px] text-[12px] font-medium cursor-pointer transition-colors " + (active ? (ti ? ti.bg + ' ' + ti.border + ' ' + ti.text : 'bg-[#16a34a] border-[#16a34a] text-white') : 'border-[#e2e8f0] text-[#374151] bg-white hover:border-[#bbf7d0] hover:text-[#16a34a] hover:bg-[#f0fdf4]')}>
                      {ti && <ti.Icon className="w-3.5 h-3.5" />}
                      {t === 'all' ? 'Všetci' : ti?.label}
                    </button>
                  );
                })}
                <div className="relative ml-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Hľadať dodávateľa..."
                    className="h-8 pl-8 pr-3 border-[1.5px] border-[#e2e8f0] rounded-md text-[12px] bg-white outline-none focus:border-[#16a34a] w-[200px] transition-colors" />
                </div>
              </div>
            </div>
          )}
        </div>

        {suppliers.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
            <Building2 className="h-10 w-10 text-[#cbd5e1] mx-auto mb-3" />
            <div className="text-[15px] font-semibold text-[#0f172a] mb-1">Žiadni dodávatelia</div>
            <div className="text-[13px] text-[#94a3b8] mb-4">Začnite pridaním vášho prvého dodávateľa.</div>
            <button onClick={() => setIsDialogOpen(true)} className="inline-flex items-center gap-2 bg-[#16a34a] text-white rounded-lg px-4 py-2 text-sm font-semibold"><Plus className="w-4 h-4" />Pridať dodávateľa</button>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
            <Search className="h-10 w-10 text-[#cbd5e1] mx-auto mb-3" />
            <div className="text-[15px] font-semibold text-[#0f172a] mb-1">Žiadne výsledky</div>
            <div className="text-[13px] text-[#94a3b8]">Skúste zmeniť filtre.</div>
          </div>
        ) : effectiveViewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSuppliers.map(s => {
              const ti = typeInfo(s.supplier_type);
              return (
                <div key={s.id} className="bg-white rounded-xl border-[1.5px] border-[#e2e8f0] hover:shadow-md hover:border-[#cbd5e1] transition-all cursor-pointer overflow-hidden"
                  onClick={() => { setDetailSupplier(s); setDetailOpen(true); }}>
                  <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={"w-10 h-10 rounded-full flex items-center justify-center shrink-0 " + (ti ? ti.bg : 'bg-[#f8fafc]')}>
                        {ti ? <ti.Icon className={"h-5 w-5 " + ti.text} /> : <Building2 className="h-5 w-5 text-[#94a3b8]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[14px] text-[#0f172a] truncate">{s.company_name || s.name}</div>
                        {s.contact_name && <div className="text-[11px] text-[#94a3b8] truncate">{s.contact_name}</div>}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {ti && <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold " + ti.bg + ' ' + ti.border + ' ' + ti.text}><ti.Icon className="w-2.5 h-2.5" />{ti.label}</span>}
                          {s.ico && <span className="text-[10px] text-[#94a3b8]">IČO: {s.ico}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#94a3b8] hover:bg-[#f0fdf4] hover:text-[#16a34a] transition-colors" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></button>
                      {isAdmin && <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#94a3b8] hover:bg-[#fef2f2] hover:text-[#dc2626] transition-colors" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </div>
                  <div className="px-4 pb-3 space-y-1.5">
                    {s.phone && (
                      <div className="flex items-center justify-between text-[12px] text-[#374151]">
                        <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" />{s.phone}</div>
                        <a href={"tel:" + s.phone} onClick={e => e.stopPropagation()} className="w-6 h-6 rounded-md flex items-center justify-center text-[#16a34a] hover:bg-[#f0fdf4] transition-colors"><Phone className="h-3 w-3" /></a>
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center justify-between text-[12px] text-[#374151]">
                        <div className="flex items-center gap-1.5 min-w-0"><Mail className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" /><span className="truncate">{s.email}</span></div>
                        <a href={"mailto:" + s.email} onClick={e => e.stopPropagation()} className="w-6 h-6 rounded-md flex items-center justify-center text-[#16a34a] hover:bg-[#f0fdf4] transition-colors shrink-0"><Mail className="h-3 w-3" /></a>
                      </div>
                    )}
                    {s.address && <div className="flex items-center gap-1.5 text-[12px] text-[#374151]"><MapPin className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" /><span className="truncate">{s.address}</span></div>}
                  </div>
                  {s.notes && <div className="border-t border-[#f1f5f9] px-4 py-2.5"><p className="text-[11px] text-[#94a3b8] truncate">{s.notes}</p></div>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wider">Dodávateľ</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wider">Kontakt</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wider">Adresa</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wider">IČO</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wider">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filteredSuppliers.map(s => {
                  const ti = typeInfo(s.supplier_type);
                  return (
                    <tr key={s.id} className="hover:bg-[#f8fafc] cursor-pointer transition-colors" onClick={() => { setDetailSupplier(s); setDetailOpen(true); }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={"w-8 h-8 rounded-full flex items-center justify-center shrink-0 " + (ti ? ti.bg : 'bg-[#f8fafc]')}>
                            {ti ? <ti.Icon className={"h-4 w-4 " + ti.text} /> : <Building2 className="h-4 w-4 text-[#94a3b8]" />}
                          </div>
                          <div>
                            <div className="font-semibold text-[13px] text-[#0f172a]">{s.company_name || s.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {ti && <span className={"inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium " + ti.bg + ' border ' + ti.border + ' ' + ti.text}><ti.Icon className="w-2.5 h-2.5" />{ti.label}</span>}
                              {s.contact_name && <span className="text-[10px] text-[#94a3b8]">{s.contact_name}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="space-y-1">
                          {s.phone && <a href={"tel:" + s.phone} className="flex items-center gap-1.5 text-[12px] text-[#374151] hover:text-[#16a34a] transition-colors"><Phone className="h-3 w-3 shrink-0" />{s.phone}</a>}
                          {s.email && <a href={"mailto:" + s.email} className="flex items-center gap-1.5 text-[12px] text-[#374151] hover:text-[#16a34a] transition-colors"><Mail className="h-3 w-3 shrink-0" /><span className="truncate max-w-[160px]">{s.email}</span></a>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#374151]">{s.address || <span className="text-[#cbd5e1]">—</span>}</td>
                      <td className="px-4 py-3 text-[12px] text-[#374151]">{s.ico || <span className="text-[#cbd5e1]">—</span>}</td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-0.5 justify-end">
                          <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#94a3b8] hover:bg-[#f0fdf4] hover:text-[#16a34a] transition-colors" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></button>
                          {isAdmin && <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#94a3b8] hover:bg-[#fef2f2] hover:text-[#dc2626] transition-colors" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3.5 w-3.5" /></button>}
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

      <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto" onInteractOutside={e => e.preventDefault()}>
          <form onSubmit={handleSubmit}>
            <DialogHeader className="pb-4">
              <DialogTitle className="text-[16px] font-bold text-[#0f172a]">{editingSupplier ? 'Upraviť dodávateľa' : 'Nový dodávateľ'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-2 block">Typ dodávateľa</label>
                <div className="grid grid-cols-4 gap-2">
                  {typeButtons.map(([t,l,Icon,color,bg]) => (
                    <button key={t} type="button" onClick={() => setFormData({...formData, supplier_type: t})}
                      className={"h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all " + (formData.supplier_type === t ? 'border-current' : 'border-[#e2e8f0] hover:border-[#cbd5e1]')}
                      style={formData.supplier_type === t ? {borderColor: color, backgroundColor: bg} : {}}>
                      <Icon className="h-4 w-4" style={{color: formData.supplier_type === t ? color : '#94a3b8'}} />
                      <span className="text-[11px] font-semibold" style={{color: formData.supplier_type === t ? color : '#64748b'}}>{l}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {inp('Obchodný názov', 'company_name', formData.company_name, v => setFormData({...formData, company_name: v}), {placeholder: 'napr. Agro s.r.o.'})}
                {inp('Kontaktná osoba', 'contact_name', formData.contact_name, v => setFormData({...formData, contact_name: v}), {placeholder: 'Ján Novák'})}
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">Názov *</label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Krátky názov" className="h-9 border-[#e2e8f0] text-[13px] bg-white" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {inp('IČO', 'ico', formData.ico, v => setFormData({...formData, ico: v}), {placeholder: '12345678'})}
                {inp('DIČ', 'dic', formData.dic, v => setFormData({...formData, dic: v}), {placeholder: '2012345678'})}
                {inp('IČ DPH', 'ic_dph', formData.ic_dph, v => setFormData({...formData, ic_dph: v}), {placeholder: 'SK20123...'})}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {inp('Email', 'email', formData.email, v => setFormData({...formData, email: v}), {placeholder: 'info@firma.sk', type: 'email'})}
                {inp('Telefón', 'phone', formData.phone, v => setFormData({...formData, phone: v}), {placeholder: '+421 900 123 456'})}
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">Adresa</label>
                <Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Ulica, Mesto, PSČ" rows={2} className="border-[#e2e8f0] text-[13px] resize-none" />
              </div>
              {inp('Bankový účet', 'bank_account', formData.bank_account, v => setFormData({...formData, bank_account: v}), {placeholder: 'SK12 3456 7890...'})}
              <div>
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider mb-1.5 block">Poznámky</label>
                <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Interné poznámky..." rows={2} className="border-[#e2e8f0] text-[13px] resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-5 border-t border-[#f1f5f9] mt-5">
              <button type="button" onClick={() => { setIsDialogOpen(false); resetForm(); }} className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-[13px] font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">Zrušiť</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-[13px] font-semibold transition-colors disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingSupplier ? 'Uložiť zmeny' : 'Pridať dodávateľa'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailSupplier && (() => {
            const s = detailSupplier;
            const ti = typeInfo(s.supplier_type);
            return (
              <>
                <DialogHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={"w-12 h-12 rounded-xl flex items-center justify-center " + (ti ? ti.bg : 'bg-[#f8fafc]')}>
                      {ti ? <ti.Icon className={"h-6 w-6 " + ti.text} /> : <Building2 className="h-6 w-6 text-[#94a3b8]" />}
                    </div>
                    <div>
                      <DialogTitle className="text-[16px] font-bold text-[#0f172a]">{s.company_name || s.name}</DialogTitle>
                      {s.contact_name && <div className="text-[12px] text-[#94a3b8]">{s.contact_name}</div>}
                      {ti && <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold mt-1 " + ti.bg + ' ' + ti.border + ' ' + ti.text}><ti.Icon className="w-2.5 h-2.5" />{ti.label}</span>}
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-px bg-[#f1f5f9] border border-[#f1f5f9] rounded-xl overflow-hidden">
                    {s.phone && <div className="bg-white px-4 py-3"><div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">Telefón</div><a href={"tel:" + s.phone} className="text-[13px] font-semibold text-[#16a34a] flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{s.phone}</a></div>}
                    {s.email && <div className="bg-white px-4 py-3"><div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">Email</div><a href={"mailto:" + s.email} className="text-[13px] font-semibold text-[#16a34a] flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{s.email}</span></a></div>}
                    {s.ico && <div className="bg-white px-4 py-3"><div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">IČO</div><div className="text-[13px] font-bold text-[#0f172a]">{s.ico}</div></div>}
                    {s.dic && <div className="bg-white px-4 py-3"><div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">DIČ</div><div className="text-[13px] font-bold text-[#0f172a]">{s.dic}</div></div>}
                    {s.ic_dph && <div className="bg-white px-4 py-3 col-span-2"><div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">IČ DPH</div><div className="text-[13px] font-bold text-[#0f172a]">{s.ic_dph}</div></div>}
                    {s.bank_account && <div className="bg-white px-4 py-3 col-span-2"><div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mb-1">Bankový účet</div><div className="text-[13px] font-bold text-[#0f172a]">{s.bank_account}</div></div>}
                  </div>
                  {s.address && (
                    <div className="flex items-start justify-between gap-3 px-4 py-3 bg-white border border-[#cbd5e1] rounded-xl">
                      <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-[#94a3b8] mt-0.5 shrink-0" /><span className="text-[13px] text-[#475569]">{s.address}</span></div>
                      <a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s.address)} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-1 text-[12px] text-[#16a34a] font-medium hover:underline"><Navigation className="h-3.5 w-3.5" />Navigovať</a>
                    </div>
                  )}
                  {s.notes && (
                    <div className="px-4 py-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl">
                      <div className="text-[10px] font-semibold text-[#1e40af] uppercase tracking-wider mb-1">Poznámky</div>
                      <div className="text-[13px] text-[#1d4ed8] whitespace-pre-wrap">{s.notes}</div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-[#f1f5f9] mt-4">
                  <button onClick={() => setDetailOpen(false)} className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-[13px] font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">Zavrieť</button>
                  <button onClick={() => { setDetailOpen(false); openEdit(s); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-[13px] font-semibold transition-colors"><Pencil className="h-4 w-4" />Upraviť</button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť dodávateľa?</AlertDialogTitle>
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
};

export default SuppliersPage;
