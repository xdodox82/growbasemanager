import { useState, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { useCustomers, useDeliveryRoutes, useOrders, DbCustomer } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableHeader } from '@/components/ui/table';
import { MobileTableRow, MobileTableCell, MobileTableHead, ExpandedDetail } from '@/components/ui/mobile-table';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useIsMobile } from '@/hooks/use-mobile';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Users, Plus, Pencil, Trash2, Mail, Phone, MapPin, Navigation, Loader as Loader2, Route, Download, ShoppingCart, Package, Search, Home, Utensils, Store, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CustomerTypeFilter } from '@/components/filters/CustomerTypeFilter';

const FILTER_STORAGE_KEY = 'customers_default_filters';

const CustomersPage = () => {
  const { data: customers, loading, add, update, remove, refetch } = useCustomers();
  const { data: deliveryRoutes } = useDeliveryRoutes();
  const { data: orders } = useOrders();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<DbCustomer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<DbCustomer | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [navApp, setNavApp] = useState<'waze' | 'maps'>('waze');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.viewMode || 'grid';
    }
    return 'grid';
  });

  // Force grid view on mobile
  const effectiveViewMode = isMobile ? 'grid' : viewMode;
  const [typeFilter, setTypeFilter] = useState<string>(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.typeFilter || 'all';
    }
    return 'all';
  });
  const [routeFilter, setRouteFilter] = useState<string>(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.routeFilter || 'all';
    }
    return 'all';
  });
  
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const CUSTOMER_TYPES: Record<string, string> = {
    home: 'Domáci zákazník',
    gastro: 'Gastro',
    wholesale: 'Veľkoobchod',
  };
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    delivery_notes: '',
    delivery_route_id: '' as string | null,
    customer_type: '' as string | null,
    payment_method: 'cash' as 'cash' | 'card' | 'invoice',
    free_delivery: false,
    default_packaging_type: 'rPET' as string,
    // Business fields for gastro/wholesale
    company_name: '',
    contact_name: '',
    ico: '',
    dic: '',
    ic_dph: '',
    bank_account: '',
  });

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || c.customer_type === typeFilter;
    const matchesRoute = routeFilter === 'all' || c.delivery_route_id === routeFilter;
    return matchesSearch && matchesType && matchesRoute;
  });

  // Customer statistics - order count and total volume per customer
  const customerStats = useMemo(() => {
    const stats: Record<string, { orderCount: number; totalVolume: number }> = {};
    
    orders.forEach(order => {
      if (!order.customer_id) return;
      
      if (!stats[order.customer_id]) {
        stats[order.customer_id] = { orderCount: 0, totalVolume: 0 };
      }
      stats[order.customer_id].orderCount += 1;
      stats[order.customer_id].totalVolume += order.quantity || 0;
    });
    
    return stats;
  }, [orders]);

  const getRouteName = (routeId: string | null) => {
    if (!routeId) return null;
    return deliveryRoutes.find(r => r.id === routeId)?.name || null;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      delivery_notes: '',
      delivery_route_id: null,
      customer_type: null,
      payment_method: 'cash',
      free_delivery: false,
      default_packaging_type: 'rPET',
      company_name: '',
      contact_name: '',
      ico: '',
      dic: '',
      ic_dph: '',
      bank_account: '',
    });
    setEditingCustomer(null);
  };

  const openEditDialog = (customer: DbCustomer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      delivery_notes: customer.delivery_notes || '',
      delivery_route_id: customer.delivery_route_id || null,
      customer_type: (customer as any).customer_type || null,
      payment_method: (customer as any).payment_method || 'cash',
      free_delivery: (customer as any).free_delivery || false,
      default_packaging_type: (customer as any).default_packaging_type || 'rPET',
      company_name: (customer as any).company_name || '',
      contact_name: (customer as any).contact_name || '',
      ico: (customer as any).ico || '',
      dic: (customer as any).dic || '',
      ic_dph: (customer as any).ic_dph || '',
      bank_account: (customer as any).bank_account || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Chyba',
        description: 'Zadajte meno zákazníka',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const customerData = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      delivery_notes: formData.delivery_notes || null,
      delivery_route_id: formData.delivery_route_id || null,
      delivery_day_ids: editingCustomer?.delivery_day_ids || [],
      customer_type: formData.customer_type || null,
      payment_method: formData.payment_method,
      free_delivery: formData.free_delivery,
      default_packaging_type: formData.default_packaging_type || 'rPET',
      company_name: formData.company_name || null,
      contact_name: formData.contact_name || null,
      ico: formData.ico || null,
      dic: formData.dic || null,
      ic_dph: formData.ic_dph || null,
      bank_account: formData.bank_account || null,
    };

    if (editingCustomer) {
      const { error } = await update(editingCustomer.id, customerData);
      if (!error) {
        toast({
          title: 'Zákazník aktualizovaný',
          description: `${formData.name} bol úspešne upravený.`,
        });
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await add(customerData);
      if (!error) {
        toast({
          title: 'Zákazník pridaný',
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
      const customer = customers.find(c => c.id === deleteId);
      const { error } = await remove(deleteId);
      if (!error) {
        toast({
          title: 'Zákazník odstránený',
          description: `${customer?.name} bol odstránený z databázy.`,
        });
      }
      setDeleteId(null);
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
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

  const toggleCardExpansion = (customerId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
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
        <PageHeader title="Zákazníci" description="Spravujte vašich odberateľov" />
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
        title="Zákazníci" 
        description="Spravujte vašich odberateľov"
      >
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať zákazníka
            </Button>
          </DialogTrigger>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} className="hidden md:flex" />
        <CustomerTypeFilter
          value={typeFilter}
          onChange={setTypeFilter}
          showLabel={false}
        />
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hľadať zákazníka..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={routeFilter} onValueChange={setRouteFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Rozvozová trasa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky trasy</SelectItem>
            {deliveryRoutes.map(route => (
              <SelectItem key={route.id} value={route.id}>
                {route.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? 'Upraviť zákazníka' : 'Nový zákazník'}
                </DialogTitle>
                <DialogDescription>
                  Zadajte kontaktné údaje zákazníka.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {/* Customer Type - FIRST */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Typ zákazníka *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, customer_type: 'home' })}
                      className={`h-16 p-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                        formData.customer_type === 'home'
                          ? 'border-[#10b981] bg-green-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Home className={`h-5 w-5 mb-1 ${
                        formData.customer_type === 'home' ? 'text-[#10b981]' : 'text-gray-400'
                      }`} />
                      <div className="text-xs font-medium">Domáci</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, customer_type: 'gastro' })}
                      className={`h-16 p-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                        formData.customer_type === 'gastro'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Utensils className={`h-5 w-5 mb-1 ${
                        formData.customer_type === 'gastro' ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                      <div className="text-xs font-medium">Gastro</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, customer_type: 'wholesale' })}
                      className={`h-16 p-2 rounded-lg border-2 transition-all flex flex-col items-center justify-center ${
                        formData.customer_type === 'wholesale'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Store className={`h-5 w-5 mb-1 ${
                        formData.customer_type === 'wholesale' ? 'text-orange-500' : 'text-gray-400'
                      }`} />
                      <div className="text-xs font-medium">VO</div>
                    </button>
                  </div>
                </div>

                {/* Home customer - simple form */}
                {(formData.customer_type === 'home' || !formData.customer_type) && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="name">Meno *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="napr. Ján Novák"
                        className="h-10 border-slate-200"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="info@example.sk"
                        className="h-10 border-slate-200"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="phone">Telefón</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+421 900 123 456"
                        className="h-10 border-slate-200"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="address">Adresa</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Hlavná 15, 811 01 Bratislava"
                        rows={2}
                      />
                    </div>

                    {/* Rozvozová trasa + Settings Section */}
                    <div className="space-y-3 bg-slate-50 p-3 rounded-lg">
                      {/* Riadok 1: Rozvozová trasa | Doprava zdarma */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label>Rozvozová trasa</Label>
                          <Select
                            value={formData.delivery_route_id || 'none'}
                            onValueChange={(value) => setFormData({ ...formData, delivery_route_id: value === 'none' ? null : value })}
                          >
                            <SelectTrigger className="h-10 border-slate-200 bg-white">
                              <SelectValue placeholder="Vyberte trasu" />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-[9999]">
                              <SelectItem value="none">Žiadna trasa</SelectItem>
                              {deliveryRoutes.map(route => (
                                <SelectItem key={route.id} value={route.id}>
                                  {route.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label className="text-sm">Vždy doprava zdarma</Label>
                          <div className="flex items-center h-10">
                            <Switch
                              id="free-delivery"
                              checked={formData.free_delivery}
                              onCheckedChange={(checked) => setFormData({ ...formData, free_delivery: checked })}
                            />
                            <Label htmlFor="free-delivery" className="text-sm cursor-pointer ml-2">Áno</Label>
                          </div>
                        </div>
                      </div>

                      {/* Riadok 2: Spôsob platby | Predvolený typ obalu */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label className="text-sm">Spôsob platby</Label>
                          <Select
                            value={formData.payment_method}
                            onValueChange={(value: 'cash' | 'card' | 'invoice') => setFormData({ ...formData, payment_method: value })}
                          >
                            <SelectTrigger className="h-9 border-slate-200 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-[9999]">
                              <SelectItem value="cash">Hotovosť</SelectItem>
                              <SelectItem value="card">Platba kartou</SelectItem>
                              <SelectItem value="invoice">Faktúra</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor="default-packaging-type" className="text-sm">Predvolený typ obalu</Label>
                          <Select
                            value={formData.default_packaging_type}
                            onValueChange={(value) => setFormData({ ...formData, default_packaging_type: value })}
                          >
                            <SelectTrigger className="h-9 border-slate-200 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-[9999]">
                              <SelectItem value="rPET">rPET</SelectItem>
                              <SelectItem value="PET">PET</SelectItem>
                              <SelectItem value="EKO">EKO</SelectItem>
                              <SelectItem value="Vratný obal">Vratný obal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="notes">Poznámky k dodaniu</Label>
                      <Textarea
                        id="notes"
                        value={formData.delivery_notes}
                        onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                        placeholder="Špeciálne požiadavky, dodacie inštrukcie..."
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {/* Gastro / Wholesale - business form like suppliers */}
                {(formData.customer_type === 'gastro' || formData.customer_type === 'wholesale') && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="companyName">Obchodný názov</Label>
                        <Input
                          id="companyName"
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="napr. Reštaurácia s.r.o."
                          className="h-10 border-slate-200"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="name">Kontaktná osoba *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="napr. Ján Novák"
                          className="h-10 border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="ico">IČO</Label>
                        <Input
                          id="ico"
                          value={formData.ico}
                          onChange={(e) => setFormData({ ...formData, ico: e.target.value })}
                          placeholder="12345678"
                          className="h-10 border-slate-200"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="dic">DIČ</Label>
                        <Input
                          id="dic"
                          value={formData.dic}
                          onChange={(e) => setFormData({ ...formData, dic: e.target.value })}
                          placeholder="2012345678"
                          className="h-10 border-slate-200"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="icDph">IČ DPH</Label>
                        <Input
                          id="icDph"
                          value={formData.ic_dph}
                          onChange={(e) => setFormData({ ...formData, ic_dph: e.target.value })}
                          placeholder="SK2012345678"
                          className="h-10 border-slate-200"
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
                          className="h-10 border-slate-200"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Telefón</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+421 900 123 456"
                          className="h-10 border-slate-200"
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

                    {/* Rozvozová trasa + Settings Section */}
                    <div className="space-y-3 bg-slate-50 p-3 rounded-lg">
                      {/* Riadok 1: Rozvozová trasa | Doprava zdarma */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label>Rozvozová trasa</Label>
                          <Select
                            value={formData.delivery_route_id || 'none'}
                            onValueChange={(value) => setFormData({ ...formData, delivery_route_id: value === 'none' ? null : value })}
                          >
                            <SelectTrigger className="h-10 border-slate-200 bg-white">
                              <SelectValue placeholder="Vyberte trasu" />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-[9999]">
                              <SelectItem value="none">Žiadna trasa</SelectItem>
                              {deliveryRoutes.map(route => (
                                <SelectItem key={route.id} value={route.id}>
                                  {route.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label className="text-sm">Vždy doprava zdarma</Label>
                          <div className="flex items-center h-10">
                            <Switch
                              id="free-delivery-gastro"
                              checked={formData.free_delivery}
                              onCheckedChange={(checked) => setFormData({ ...formData, free_delivery: checked })}
                            />
                            <Label htmlFor="free-delivery-gastro" className="text-sm cursor-pointer ml-2">Áno</Label>
                          </div>
                        </div>
                      </div>

                      {/* Riadok 2: Spôsob platby | Predvolený typ obalu */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label className="text-sm">Spôsob platby</Label>
                          <Select
                            value={formData.payment_method}
                            onValueChange={(value: 'cash' | 'card' | 'invoice') => setFormData({ ...formData, payment_method: value })}
                          >
                            <SelectTrigger className="h-9 border-slate-200 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-[9999]">
                              <SelectItem value="cash">Hotovosť</SelectItem>
                              <SelectItem value="card">Platba kartou</SelectItem>
                              <SelectItem value="invoice">Faktúra</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor="default-packaging-type-gastro" className="text-sm">Predvolený typ obalu</Label>
                          <Select
                            value={formData.default_packaging_type}
                            onValueChange={(value) => setFormData({ ...formData, default_packaging_type: value })}
                          >
                            <SelectTrigger className="h-9 border-slate-200 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-[9999]">
                              <SelectItem value="rPET">rPET</SelectItem>
                              <SelectItem value="PET">PET</SelectItem>
                              <SelectItem value="EKO">EKO</SelectItem>
                              <SelectItem value="Vratný obal">Vratný obal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="notes">Poznámky k dodaniu</Label>
                      <Textarea
                        id="notes"
                        value={formData.delivery_notes}
                        onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                        placeholder="Dodacie podmienky, kontaktné hodiny..."
                        rows={2}
                      />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Zrušiť
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCustomer ? 'Uložiť zmeny' : 'Pridať zákazníka'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Žiadni zákazníci"
          description="Začnite pridaním vášho prvého zákazníka."
          action={
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať zákazníka
            </Button>
          }
        />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Žiadne výsledky"
          description="Skúste zmeniť vyhľadávacie kritériá."
        />
      ) : effectiveViewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => {
            const isExpanded = expandedCards.has(customer.id);
            const stats = customerStats[customer.id] || { orderCount: 0, totalVolume: 0 };
            const displayName = (customer.customer_type === 'gastro' || customer.customer_type === 'wholesale') && customer.company_name
              ? customer.company_name
              : customer.name;

            return (
              <Card
                key={customer.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  if (window.innerWidth >= 768) {
                    setSelectedCustomerDetail(customer);
                    setDetailModalOpen(true);
                  } else {
                    toggleCardExpansion(customer.id);
                  }
                }}
              >
                <div className="p-4">
                  <div className="space-y-3">

                    {/* ===== COLLAPSED VIEW - Always visible ===== */}

                    {/* Header: Meno + Expand Icon */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-gray-900">
                          {displayName || 'Bez mena'}
                        </h3>
                        {customer.contact_name && customer.company_name && (
                          <p className="text-sm text-gray-600">
                            {customer.contact_name}
                          </p>
                        )}
                      </div>
                      {/* Expand/Collapse Icon */}
                      <div className="flex-shrink-0 p-2 md:hidden">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      {/* Desktop - Action buttons */}
                      <div className="hidden md:flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(customer)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(customer.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Typ zákazníka + IČO */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {customer.customer_type && (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          customer.customer_type === 'home' ? 'bg-blue-100 text-blue-800' :
                          customer.customer_type === 'gastro' ? 'bg-orange-100 text-orange-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {customer.customer_type === 'home' && <><Home className="h-3 w-3 mr-1" /> Domáci</>}
                          {customer.customer_type === 'gastro' && <><Utensils className="h-3 w-3 mr-1" /> Gastro</>}
                          {customer.customer_type === 'wholesale' && <><Store className="h-3 w-3 mr-1" /> Veľkoobchod</>}
                        </span>
                      )}
                      {customer.ico && (
                        <span className="text-xs text-gray-500">IČO: {customer.ico}</span>
                      )}
                      {getRouteName(customer.delivery_route_id) && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Route className="h-3 w-3" />
                          {getRouteName(customer.delivery_route_id)}
                        </Badge>
                      )}
                    </div>

                    {/* Email */}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}

                    {/* Telefón */}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    )}

                    {/* Objednávky */}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <ShoppingCart className="h-4 w-4" />
                      <span>{stats.orderCount} obj.</span>
                    </div>

                    {/* ===== EXPANDED VIEW - Mobile only ===== */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-3 animate-in slide-in-from-top duration-200 md:hidden">

                        {/* Detaily Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm">

                          {/* Adresa */}
                          {customer.address && (
                            <div className="col-span-2">
                              <label className="text-gray-500 text-xs">Adresa</label>
                              <p className="font-medium text-gray-900">
                                {customer.address}
                              </p>
                            </div>
                          )}

                          {/* DIČ */}
                          {customer.dic && (
                            <div>
                              <label className="text-gray-500 text-xs">DIČ</label>
                              <p className="font-medium text-gray-900">{customer.dic}</p>
                            </div>
                          )}

                          {/* IČ DPH */}
                          {customer.ic_dph && (
                            <div>
                              <label className="text-gray-500 text-xs">IČ DPH</label>
                              <p className="font-medium text-gray-900">{customer.ic_dph}</p>
                            </div>
                          )}

                          {/* Spôsob platby */}
                          {customer.payment_method && (
                            <div className="col-span-2">
                              <label className="text-gray-500 text-xs">Spôsob platby</label>
                              <p className="font-medium text-gray-900">
                                {customer.payment_method === 'cash' ? 'Hotovosť' :
                                 customer.payment_method === 'card' ? 'Karta' :
                                 customer.payment_method === 'invoice' ? 'Faktúra' :
                                 customer.payment_method}
                              </p>
                            </div>
                          )}

                          {/* Predvolený obal */}
                          {customer.default_packaging_type && (
                            <div className="col-span-2">
                              <label className="text-gray-500 text-xs">Predvolený obal</label>
                              <p className="font-medium text-gray-900">{customer.default_packaging_type}</p>
                            </div>
                          )}

                          {/* Doprava zdarma */}
                          {customer.free_delivery !== undefined && (
                            <div>
                              <label className="text-gray-500 text-xs">Doprava zdarma</label>
                              <p className="font-medium text-gray-900">{customer.free_delivery ? 'Áno' : 'Nie'}</p>
                            </div>
                          )}

                          {/* Bankové spojenie */}
                          {customer.bank_account && (
                            <div className="col-span-2">
                              <label className="text-gray-500 text-xs">Bankové spojenie</label>
                              <p className="font-medium text-gray-900">{customer.bank_account}</p>
                            </div>
                          )}

                          {/* Poznámky */}
                          {customer.delivery_notes && (
                            <div className="col-span-2">
                              <label className="text-gray-500 text-xs">Poznámky k dodaniu</label>
                              <p className="font-medium text-gray-900 whitespace-pre-wrap">{customer.delivery_notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons - EXPANDED ONLY */}
                        <div className="flex gap-2 pt-2 border-t">

                          {/* Telefón */}
                          {customer.phone && (
                            <a
                              href={`tel:${customer.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <Phone className="h-5 w-5" />
                            </a>
                          )}

                          {/* Email */}
                          {customer.email && (
                            <a
                              href={`mailto:${customer.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Mail className="h-5 w-5" />
                            </a>
                          )}

                          {/* Navigácia - s SWIPE toggle Waze/Maps */}
                          {customer.address && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openNavigation(customer.address!);
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
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Navigation className="h-5 w-5" />
                            </button>
                          )}

                          {/* Detail */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomerDetail(customer);
                              setDetailModalOpen(true);
                            }}
                            className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Detail
                          </button>

                          {/* Edit */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(customer);
                            }}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>

                          {/* Delete - admin only */}
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(customer.id);
                              }}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <MobileTableRow>
                    <MobileTableHead>Názov</MobileTableHead>
                    <MobileTableHead hideOnMobile>IČO</MobileTableHead>
                    <MobileTableHead hideOnMobile>Typ</MobileTableHead>
                    <MobileTableHead hideOnMobile>Email</MobileTableHead>
                    <MobileTableHead hideOnMobile>Telefón</MobileTableHead>
                    <MobileTableHead hideOnMobile>Adresa</MobileTableHead>
                    <MobileTableHead hideOnMobile>Trasa</MobileTableHead>
                    <MobileTableHead hideOnMobile>Objednávky</MobileTableHead>
                    <MobileTableHead className="w-24">Akcie</MobileTableHead>
                    {isMobile && <MobileTableHead className="w-10"></MobileTableHead>}
                  </MobileTableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <MobileTableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openEditDialog(customer)}
                      expandedContent={
                        <>
                          <ExpandedDetail label="Typ" value={customer.customer_type ? CUSTOMER_TYPES[customer.customer_type] : '-'} />
                          <ExpandedDetail label="IČO" value={customer.ico || '-'} />
                          <ExpandedDetail label="Objednávky" value={customerStats[customer.id]?.orderCount || 0} />
                          <ExpandedDetail label="Trasa" value={getRouteName(customer.delivery_route_id) || '-'} />
                          {customer.phone && (
                            <div className="pt-2">
                              <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => handleCall(customer.phone!)}>
                                <Phone className="h-4 w-4" /> Zavolať
                              </Button>
                            </div>
                          )}
                          {customer.address && (
                            <div className="pt-2">
                              <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => handleNavigate(customer.address!)}>
                                <Navigation className="h-4 w-4" /> Navigovať
                              </Button>
                            </div>
                          )}
                        </>
                      }
                    >
                      <MobileTableCell>
                        <div>
                          <span className="font-medium">
                            {(customer.customer_type === 'gastro' || customer.customer_type === 'wholesale') && customer.company_name 
                              ? customer.company_name 
                              : customer.name}
                          </span>
                          {(customer.customer_type === 'gastro' || customer.customer_type === 'wholesale') && customer.company_name && (
                            <p className="text-xs text-muted-foreground">{customer.contact_name || customer.name}</p>
                          )}
                        </div>
                      </MobileTableCell>
                      <MobileTableCell hideOnMobile>
                        {customer.ico || '-'}
                      </MobileTableCell>
                      <MobileTableCell hideOnMobile>
                        {customer.customer_type ? (
                          <Badge variant="outline" className="text-xs">
                            {CUSTOMER_TYPES[customer.customer_type] || customer.customer_type}
                          </Badge>
                        ) : '-'}
                      </MobileTableCell>
                      <MobileTableCell hideOnMobile onClick={(e) => e.stopPropagation()}>
                        {customer.email ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate max-w-[150px]">{customer.email}</span>
                            <a
                              href={`mailto:${customer.email}`}
                              className="text-emerald-600 hover:text-emerald-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Mail className="h-4 w-4" />
                            </a>
                          </div>
                        ) : '-'}
                      </MobileTableCell>
                      <MobileTableCell hideOnMobile onClick={(e) => e.stopPropagation()}>
                        {customer.phone ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{customer.phone}</span>
                            <a
                              href={`tel:${customer.phone}`}
                              className="text-emerald-600 hover:text-emerald-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          </div>
                        ) : '-'}
                      </MobileTableCell>
                      <MobileTableCell hideOnMobile onClick={(e) => e.stopPropagation()}>
                        {customer.address ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate max-w-[200px]">{customer.address}</span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                              onClick={(e) => e.stopPropagation()}
                              title="Otvoriť v Google Maps"
                            >
                              <MapPin className="h-4 w-4" />
                            </a>
                            <a
                              href={`https://waze.com/ul?q=${encodeURIComponent(customer.address)}`}
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
                      </MobileTableCell>
                      <MobileTableCell hideOnMobile>
                        {getRouteName(customer.delivery_route_id) || '-'}
                      </MobileTableCell>
                      <MobileTableCell hideOnMobile>
                        {customerStats[customer.id]?.orderCount || 0}
                      </MobileTableCell>
                      <MobileTableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(customer)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(customer.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </MobileTableCell>
                    </MobileTableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </PullToRefresh>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť zákazníka?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Zákazník bude permanentne odstránený z databázy.
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
            <DialogTitle className="text-xl font-bold">Detail zákazníka</DialogTitle>
          </DialogHeader>
          {selectedCustomerDetail && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl flex items-center justify-center bg-info/10 text-info">
                  <Users className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">
                    {(selectedCustomerDetail.customer_type === 'gastro' || selectedCustomerDetail.customer_type === 'wholesale') && selectedCustomerDetail.company_name
                      ? selectedCustomerDetail.company_name
                      : selectedCustomerDetail.name}
                  </h3>
                  {(selectedCustomerDetail.customer_type === 'gastro' || selectedCustomerDetail.customer_type === 'wholesale') && selectedCustomerDetail.company_name && (
                    <p className="text-sm text-muted-foreground">{selectedCustomerDetail.contact_name || selectedCustomerDetail.name}</p>
                  )}
                  {selectedCustomerDetail.customer_type && (
                    <Badge variant="secondary" className="mt-1">
                      {CUSTOMER_TYPES[selectedCustomerDetail.customer_type]}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedCustomerDetail.ico && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">IČO</div>
                    <div className="font-medium">{selectedCustomerDetail.ico}</div>
                  </div>
                )}
                {selectedCustomerDetail.dic && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">DIČ</div>
                    <div className="font-medium">{selectedCustomerDetail.dic}</div>
                  </div>
                )}
                {selectedCustomerDetail.ic_dph && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">IČ DPH</div>
                    <div className="font-medium">{selectedCustomerDetail.ic_dph}</div>
                  </div>
                )}
                {selectedCustomerDetail.email && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{selectedCustomerDetail.email}</div>
                  </div>
                )}
                {selectedCustomerDetail.phone && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Telefón</div>
                    <div className="font-medium">{selectedCustomerDetail.phone}</div>
                  </div>
                )}
                {selectedCustomerDetail.payment_method && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Spôsob platby</div>
                    <div className="font-medium">
                      {selectedCustomerDetail.payment_method === 'cash' && 'Hotovosť'}
                      {selectedCustomerDetail.payment_method === 'card' && 'Platba kartou'}
                      {selectedCustomerDetail.payment_method === 'invoice' && 'Faktúra'}
                    </div>
                  </div>
                )}
                {selectedCustomerDetail.delivery_route_id && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Rozvozová trasa</div>
                    <div className="font-medium">{getRouteName(selectedCustomerDetail.delivery_route_id)}</div>
                  </div>
                )}
                {selectedCustomerDetail.free_delivery !== undefined && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Doprava zdarma</div>
                    <div className="font-medium">{selectedCustomerDetail.free_delivery ? 'Áno' : 'Nie'}</div>
                  </div>
                )}
              </div>

              {selectedCustomerDetail.address && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Adresa</div>
                  <div className="text-sm whitespace-pre-wrap">{selectedCustomerDetail.address}</div>
                </div>
              )}

              {selectedCustomerDetail.delivery_notes && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Poznámky k dodaniu</div>
                  <div className="text-sm whitespace-pre-wrap">{selectedCustomerDetail.delivery_notes}</div>
                </div>
              )}

              {selectedCustomerDetail.bank_account && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Bankové spojenie</div>
                  <div className="text-sm">{selectedCustomerDetail.bank_account}</div>
                </div>
              )}

              <div className="space-y-1 pt-2 border-t">
                <div className="text-sm text-muted-foreground">Štatistiky</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Celkový počet objednávok: <span className="font-semibold">{customerStats[selectedCustomerDetail.id]?.orderCount || 0}</span></div>
                  <div>Celková suma: <span className="font-semibold">{(customerStats[selectedCustomerDetail.id]?.totalSpent || 0).toFixed(2)} €</span></div>
                </div>
              </div>

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
                    openEditDialog(selectedCustomerDetail);
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

export default CustomersPage;
