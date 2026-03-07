import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { useSuppliers, DbSupplier } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
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
import { Building2, Plus, Pencil, Trash2, Mail, Phone, MapPin, Navigation, Loader as Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const SUPPLIER_TYPES: Record<string, string> = {
  seeds: 'Semená',
  packaging: 'Obaly',
  substrate: 'Substrát',
  other: 'Ostatné',
};

const SuppliersPage = () => {
  const { data: suppliers, loading, add, update, remove } = useSuppliers();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<DbSupplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Force grid view on mobile
  const effectiveViewMode = isMobile ? 'grid' : viewMode;
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<DbSupplier | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [navApp, setNavApp] = useState<'waze' | 'maps'>('waze');

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    supplier_type: '' as '' | 'seeds' | 'packaging' | 'substrate' | 'other',
    ico: '',
    ic_dph: '',
    dic: '',
    email: '',
    phone: '',
    address: '',
    bank_account: '',
    notes: '',
    contact_name: '',
  });

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || s.supplier_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      company_name: '',
      supplier_type: '',
      ico: '',
      ic_dph: '',
      dic: '',
      email: '',
      phone: '',
      address: '',
      bank_account: '',
      notes: '',
      contact_name: '',
    });
    setEditingSupplier(null);
  };

  const openEditDialog = (supplier: DbSupplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      company_name: supplier.company_name || '',
      supplier_type: (supplier.supplier_type as 'seeds' | 'packaging' | 'substrate' | 'other') || '',
      ico: supplier.ico || '',
      ic_dph: supplier.ic_dph || '',
      dic: supplier.dic || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      bank_account: supplier.bank_account || '',
      notes: supplier.notes || '',
      contact_name: supplier.contact_name || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Chyba',
        description: 'Zadajte meno/názov dodávateľa',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const submitData = {
      name: formData.name,
      company_name: formData.company_name || null,
      supplier_type: formData.supplier_type || null,
      ico: formData.ico || null,
      ic_dph: formData.ic_dph || null,
      dic: formData.dic || null,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      bank_account: formData.bank_account || null,
      notes: formData.notes || null,
      contact_name: formData.contact_name || null,
    };

    if (editingSupplier) {
      const { error } = await update(editingSupplier.id, submitData);
      if (!error) {
        toast({
          title: 'Dodávateľ aktualizovaný',
          description: `${formData.name} bol úspešne upravený.`,
        });
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await add(submitData);
      if (!error) {
        toast({
          title: 'Dodávateľ pridaný',
          description: `${formData.name} bol pridaný do databázy.`,
        });
        setIsDialogOpen(false);
        resetForm();
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      const supplier = suppliers.find(s => s.id === deleteId);
      const { error } = await remove(deleteId);
      if (!error) {
        toast({
          title: 'Dodávateľ odstránený',
          description: `${supplier?.company_name} bol odstránený z databázy.`,
        });
      }
      setDeleteId(null);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleNavigate = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.open(`https://waze.com/ul?q=${encodedAddress}&navigate=yes`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  };

  const toggleCardExpansion = (supplierId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId);
      } else {
        newSet.add(supplierId);
      }
      return newSet;
    });
  };

  const handleNavToggle = () => {
    setNavApp(prev => prev === 'waze' ? 'maps' : 'waze');
  };

  const openNavigation = (address: string) => {
    const encoded = encodeURIComponent(address);
    const url = navApp === 'waze'
      ? `https://waze.com/ul?q=${encoded}`
      : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <MainLayout>
        <PageHeader title="Dodávatelia" description="Spravujte vašich dodávateľov" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-4 w-32 mt-3" />
              <Skeleton className="h-3 w-24 mt-2" />
            </Card>
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader 
        title="Dodávatelia" 
        description="Spravujte vašich dodávateľov"
      >
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať dodávateľa
            </Button>
          </DialogTrigger>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} className="hidden md:flex" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Všetky typy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky typy</SelectItem>
            <SelectItem value="seeds">Semená</SelectItem>
            <SelectItem value="packaging">Obaly</SelectItem>
            <SelectItem value="substrate">Substrát</SelectItem>
            <SelectItem value="other">Ostatné</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Hľadať dodávateľa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64"
        />
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingSupplier ? 'Upraviť dodávateľa' : 'Nový dodávateľ'}
                </DialogTitle>
                <DialogDescription>
                  Zadajte údaje o dodávateľovi.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Obchodný názov</Label>
                    <Input
                      id="companyName"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="napr. Semená s.r.o."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Meno / Kontaktná osoba *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="napr. Ján Novák"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Druh dodávateľa</Label>
                  <Select 
                    value={formData.supplier_type || 'none'} 
                    onValueChange={(value) => setFormData({ ...formData, supplier_type: value === 'none' ? '' : value as 'seeds' | 'packaging' | 'substrate' | 'other' })}
                  >
                    <SelectTrigger><SelectValue placeholder="Vyberte druh" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nevybraný</SelectItem>
                      <SelectItem value="seeds">Semená</SelectItem>
                      <SelectItem value="packaging">Obaly</SelectItem>
                      <SelectItem value="substrate">Substrát</SelectItem>
                      <SelectItem value="other">Ostatné</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ico">IČO</Label>
                    <Input
                      id="ico"
                      value={formData.ico}
                      onChange={(e) => setFormData({ ...formData, ico: e.target.value })}
                      placeholder="12345678"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dic">DIČ</Label>
                    <Input
                      id="dic"
                      value={formData.dic}
                      onChange={(e) => setFormData({ ...formData, dic: e.target.value })}
                      placeholder="2012345678"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="icDph">IČ DPH</Label>
                    <Input
                      id="icDph"
                      value={formData.ic_dph}
                      onChange={(e) => setFormData({ ...formData, ic_dph: e.target.value })}
                      placeholder="SK2012345678"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="info@example.sk"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefón</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+421 900 123 456"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address">Adresa</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ulica, Mesto, PSČ"
                    rows={2}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="bankAccount">Bankový účet</Label>
                  <Input
                    id="bankAccount"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    placeholder="SK12 3456 7890 1234 5678 9012"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Poznámky</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Dodacie podmienky, kontaktné hodiny..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Zrušiť
                </Button>
                <Button type="submit">
                  {editingSupplier ? 'Uložiť zmeny' : 'Pridať dodávateľa'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="Žiadni dodávatelia"
          description="Začnite pridaním vášho prvého dodávateľa."
          action={
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať dodávateľa
            </Button>
          }
        />
      ) : filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="Žiadne výsledky"
          description="Skúste zmeniť vyhľadávacie kritériá."
        />
      ) : effectiveViewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((supplier) => {
            const isExpanded = expandedCards.has(supplier.id);

            return (
              <Card
                key={supplier.id}
                className="p-5 transition-all hover:shadow-lg cursor-pointer"
                onClick={() => {
                  if (window.innerWidth >= 768) {
                    setSelectedSupplierDetail(supplier);
                    setDetailModalOpen(true);
                  } else {
                    toggleCardExpansion(supplier.id);
                  }
                }}
              >
                {/* COLLAPSED VIEW - vždy viditeľné */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-warning/10 text-warning flex-shrink-0">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-lg truncate">{supplier.company_name || supplier.name}</h3>
                      {supplier.company_name && supplier.name && (
                        <p className="text-sm text-muted-foreground truncate">{supplier.name}</p>
                      )}
                      {supplier.supplier_type && (
                        <Badge variant="outline" className="mt-1">{SUPPLIER_TYPES[supplier.supplier_type]}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Desktop: Edit/Delete ikony */}
                  <div className="hidden md:flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(supplier)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(supplier.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {/* Mobile: Expand/Collapse ikona */}
                  <div className="md:hidden flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                </div>

                {/* Telefón - vždy viditeľný */}
                {supplier.phone && (
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span>{supplier.phone}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary/80 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleCall(supplier.phone!); }}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Email - vždy viditeľný */}
                {supplier.email && (
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary/80 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleEmail(supplier.email!); }}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* EXPANDED VIEW - Mobile only */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-3 animate-in slide-in-from-top duration-200 md:hidden">

                    {/* Adresa + Navigácia */}
                    {supplier.address && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Adresa</div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                            <span className="text-sm">{supplier.address}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-xs text-muted-foreground mr-1">
                              {navApp === 'waze' ? 'Waze' : 'Maps'}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                openNavigation(supplier.address!);
                              }}
                              onTouchStart={(e) => {
                                e.stopPropagation();
                                const startX = e.touches[0].clientX;
                                const handleTouchMove = (moveEvent: TouchEvent) => {
                                  const deltaX = moveEvent.touches[0].clientX - startX;
                                  if (Math.abs(deltaX) > 30) {
                                    handleNavToggle();
                                    document.removeEventListener('touchmove', handleTouchMove);
                                  }
                                };
                                document.addEventListener('touchmove', handleTouchMove);
                                document.addEventListener('touchend', () => {
                                  document.removeEventListener('touchmove', handleTouchMove);
                                }, { once: true });
                              }}
                            >
                              <Navigation className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* IČO/DIČ/IČ DPH */}
                    {(supplier.ico || supplier.dic || supplier.ic_dph) && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {supplier.ico && (
                          <div>
                            <div className="text-xs text-gray-500">IČO</div>
                            <div className="font-medium">{supplier.ico}</div>
                          </div>
                        )}
                        {supplier.dic && (
                          <div>
                            <div className="text-xs text-gray-500">DIČ</div>
                            <div className="font-medium">{supplier.dic}</div>
                          </div>
                        )}
                        {supplier.ic_dph && (
                          <div className="col-span-2">
                            <div className="text-xs text-gray-500">IČ DPH</div>
                            <div className="font-medium">{supplier.ic_dph}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bankový účet */}
                    {supplier.bank_account && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Bankový účet</div>
                        <div className="text-sm font-mono bg-gray-50 p-2 rounded">{supplier.bank_account}</div>
                      </div>
                    )}

                    {/* Poznámky */}
                    {supplier.notes && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Poznámky</div>
                        <div className="text-sm bg-gray-50 p-2 rounded">{supplier.notes}</div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSupplierDetail(supplier);
                          setDetailModalOpen(true);
                        }}
                        className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        Detail
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(supplier);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(supplier.id);
                          }}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma</TableHead>
                  <TableHead className="hidden sm:table-cell">Kontaktná osoba</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Telefón</TableHead>
                  <TableHead className="hidden xl:table-cell">Adresa</TableHead>
                  <TableHead className="w-24">Akcie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => openEditDialog(supplier)}
                  >
                    <TableCell className="font-medium">{supplier.company_name || supplier.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{supplier.company_name && supplier.name ? supplier.name : '-'}</TableCell>
                    <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                      {supplier.email ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate max-w-[150px]">{supplier.email}</span>
                          <a
                            href={`mailto:${supplier.email}`}
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                      {supplier.phone ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{supplier.phone}</span>
                          <a
                            href={`tel:${supplier.phone}`}
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell" onClick={(e) => e.stopPropagation()}>
                      {supplier.address ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate max-w-[200px]">{supplier.address}</span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(supplier.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={(e) => e.stopPropagation()}
                            title="Otvoriť v Google Maps"
                          >
                            <MapPin className="h-4 w-4" />
                          </a>
                          <a
                            href={`https://waze.com/ul?q=${encodeURIComponent(supplier.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={(e) => e.stopPropagation()}
                            title="Otvoriť vo Waze"
                          >
                            <Navigation className="h-4 w-4" />
                          </a>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(supplier)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(supplier.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť dodávateľa?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Dodávateľ bude permanentne odstránený z databázy.
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

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Detail dodávateľa</DialogTitle>
          </DialogHeader>
          {selectedSupplierDetail && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl flex items-center justify-center bg-warning/10 text-warning">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{selectedSupplierDetail.company_name || selectedSupplierDetail.name}</h3>
                  {selectedSupplierDetail.company_name && selectedSupplierDetail.name && (
                    <p className="text-sm text-muted-foreground">{selectedSupplierDetail.name}</p>
                  )}
                  {selectedSupplierDetail.supplier_type && (
                    <Badge variant="outline" className="mt-1">
                      {SUPPLIER_TYPES[selectedSupplierDetail.supplier_type]}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedSupplierDetail.contact_name && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Kontaktná osoba</div>
                    <div className="font-medium">{selectedSupplierDetail.contact_name}</div>
                  </div>
                )}
                {selectedSupplierDetail.ico && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">IČO</div>
                    <div className="font-medium">{selectedSupplierDetail.ico}</div>
                  </div>
                )}
                {selectedSupplierDetail.dic && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">DIČ</div>
                    <div className="font-medium">{selectedSupplierDetail.dic}</div>
                  </div>
                )}
                {selectedSupplierDetail.ic_dph && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">IČ DPH</div>
                    <div className="font-medium">{selectedSupplierDetail.ic_dph}</div>
                  </div>
                )}
                {selectedSupplierDetail.email && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${selectedSupplierDetail.email}`} className="hover:text-primary">
                        {selectedSupplierDetail.email}
                      </a>
                    </div>
                  </div>
                )}
                {selectedSupplierDetail.phone && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Telefón</div>
                    <div className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedSupplierDetail.phone}`} className="hover:text-primary">
                        {selectedSupplierDetail.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {selectedSupplierDetail.address && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Adresa
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{selectedSupplierDetail.address}</div>
                </div>
              )}

              {selectedSupplierDetail.bank_account && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Bankové spojenie</div>
                  <div className="text-sm font-mono">{selectedSupplierDetail.bank_account}</div>
                </div>
              )}

              {selectedSupplierDetail.notes && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Poznámky</div>
                  <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-md">{selectedSupplierDetail.notes}</div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDetailModalOpen(false)}
                >
                  Zavrieť
                </Button>
                <Button
                  onClick={() => {
                    setDetailModalOpen(false);
                    openEditDialog(selectedSupplierDetail);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Upraviť
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default SuppliersPage;
