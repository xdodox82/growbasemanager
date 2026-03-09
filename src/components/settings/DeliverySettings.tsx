import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Truck, Pencil, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCustomers } from '@/hooks/useSupabaseData';

type DeliveryRoute = {
  id: string;
  name: string;
  delivery_fee_home: number;
  delivery_fee_gastro: number;
  delivery_fee_wholesale: number;
  home_min_free_delivery: number;
  gastro_min_free_delivery: number;
  wholesale_min_free_delivery: number;
};

export function DeliverySettings() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRoute, setEditingRoute] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<DeliveryRoute>>({});
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const { data: customers, update: updateCustomer } = useCustomers();
  const [isCustomersDialogOpen, setIsCustomersDialogOpen] = useState(false);
  const [managingRouteId, setManagingRouteId] = useState<string | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_routes')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error loading delivery routes:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať rozvozové trasy',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (route: DeliveryRoute) => {
    setEditingRoute(route.id);
    setEditValues({
      name: route.name,
      delivery_fee_home: String(route.delivery_fee_home || ''),
      delivery_fee_gastro: String(route.delivery_fee_gastro || ''),
      delivery_fee_wholesale: String(route.delivery_fee_wholesale || ''),
      home_min_free_delivery: String(route.home_min_free_delivery || ''),
      gastro_min_free_delivery: String(route.gastro_min_free_delivery || ''),
      wholesale_min_free_delivery: String(route.wholesale_min_free_delivery || ''),
    });
  };

  const handleSave = async (routeId: string) => {
    try {
      const numericValues = {
        name: editValues.name,
        delivery_fee_home: parseFloat(String(editValues.delivery_fee_home).replace(',', '.')) || 0,
        delivery_fee_gastro: parseFloat(String(editValues.delivery_fee_gastro).replace(',', '.')) || 0,
        delivery_fee_wholesale: parseFloat(String(editValues.delivery_fee_wholesale).replace(',', '.')) || 0,
        home_min_free_delivery: parseFloat(String(editValues.home_min_free_delivery).replace(',', '.')) || 0,
        gastro_min_free_delivery: parseFloat(String(editValues.gastro_min_free_delivery).replace(',', '.')) || 0,
        wholesale_min_free_delivery: parseFloat(String(editValues.wholesale_min_free_delivery).replace(',', '.')) || 0,
      };

      const { error } = await supabase
        .from('delivery_routes')
        .update(numericValues)
        .eq('id', routeId);

      if (error) throw error;

      toast({
        title: 'Uložené',
        description: 'Nastavenia trasy boli úspešne uložené',
      });

      setEditingRoute(null);
      loadRoutes();
    } catch (error) {
      console.error('Error saving route settings:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa uložiť nastavenia trasy',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setEditingRoute(null);
    setEditValues({});
    setIsCreatingNew(false);
  };

  const handleAddRoute = async () => {
    setIsCreatingNew(true);
    setEditingRoute('new');
    setEditValues({
      name: '',
      delivery_fee_home: '',
      delivery_fee_gastro: '',
      delivery_fee_wholesale: '',
      home_min_free_delivery: '',
      gastro_min_free_delivery: '',
      wholesale_min_free_delivery: '',
    });
  };

  const handleSaveNewRoute = async () => {
    if (!editValues.name || editValues.name.trim() === '') {
      toast({
        title: 'Chyba',
        description: 'Zadajte názov trasy',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('delivery_routes')
        .insert({
          name: editValues.name.trim(),
          delivery_fee_home: parseFloat(String(editValues.delivery_fee_home).replace(',', '.')) || 0,
          delivery_fee_gastro: parseFloat(String(editValues.delivery_fee_gastro).replace(',', '.')) || 0,
          delivery_fee_wholesale: parseFloat(String(editValues.delivery_fee_wholesale).replace(',', '.')) || 0,
          home_min_free_delivery: parseFloat(String(editValues.home_min_free_delivery).replace(',', '.')) || 0,
          gastro_min_free_delivery: parseFloat(String(editValues.gastro_min_free_delivery).replace(',', '.')) || 0,
          wholesale_min_free_delivery: parseFloat(String(editValues.wholesale_min_free_delivery).replace(',', '.')) || 0,
        });

      if (error) throw error;

      toast({
        title: 'Úspech',
        description: 'Nová trasa bola vytvorená',
      });

      setIsCreatingNew(false);
      setEditingRoute(null);
      setEditValues({});
      loadRoutes();
    } catch (error) {
      console.error('Error adding delivery route:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa vytvoriť novú trasu',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    try {
      const { error } = await supabase
        .from('delivery_routes')
        .delete()
        .eq('id', routeId);

      if (error) throw error;

      toast({
        title: 'Úspech',
        description: 'Trasa bola odstránená',
      });

      loadRoutes();
    } catch (error) {
      console.error('Error deleting delivery route:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa odstrániť trasu',
        variant: 'destructive',
      });
    }
  };

  const getCustomersForRoute = (routeId: string) => {
    return customers.filter(c => c.delivery_route_id === routeId);
  };

  const openCustomersDialog = (routeId: string) => {
    setManagingRouteId(routeId);
    const assignedCustomers = customers.filter(c => c.delivery_route_id === routeId);
    setSelectedCustomerIds(new Set(assignedCustomers.map(c => c.id)));
    setCustomerTypeFilter('all');
    setIsCustomersDialogOpen(true);
  };

  const handleSaveCustomers = async () => {
    if (!managingRouteId) return;
    const currentlyAssigned = customers.filter(c => c.delivery_route_id === managingRouteId);
    const toUnassign = currentlyAssigned.filter(c => !selectedCustomerIds.has(c.id));
    const toAssign = Array.from(selectedCustomerIds).filter(
      id => !currentlyAssigned.some(c => c.id === id)
    );
    await Promise.all([
      ...toUnassign.map(c => updateCustomer(c.id, { delivery_route_id: null })),
      ...toAssign.map(id => updateCustomer(id, { delivery_route_id: managingRouteId })),
    ]);
    toast({ title: 'Zákazníci uložení', description: `${selectedCustomerIds.size} zákazníkov priradených k trase.` });
    setIsCustomersDialogOpen(false);
    setManagingRouteId(null);
    setSelectedCustomerIds(new Set());
  };

  const toggleCustomerSelection = (customerId: string) => {
    const newSet = new Set(selectedCustomerIds);
    if (newSet.has(customerId)) { newSet.delete(customerId); } else { newSet.add(customerId); }
    setSelectedCustomerIds(newSet);
  };

  const currentRoute = managingRouteId ? routes.find(r => r.id === managingRouteId) : null;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Rozvozové trasy</h2>
            <p className="text-sm text-muted-foreground">Načítavam...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Rozvozové trasy</h2>
            <p className="text-sm text-muted-foreground">
              Nastavte ceny dopravy a limity pre bezplatnú dopravu pre každú trasu
            </p>
          </div>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={handleAddRoute}
          disabled={isCreatingNew}
        >
          + Pridať novú trasu
        </Button>
      </div>

      <div className="space-y-6">
        {isCreatingNew && editingRoute === 'new' && (
          <div className="border rounded-lg p-4 space-y-4 bg-blue-50/50 border-blue-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm mb-2 block">Názov trasy</Label>
                <Input
                  type="text"
                  value={editValues.name || ''}
                  onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                  className="max-w-xs"
                  placeholder="Zadajte názov trasy"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Badge variant="outline" className="mb-2">Domáci zákazníci</Badge>
                  <Label>Poplatok za dopravu (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={editValues.delivery_fee_home}
                    onChange={(e) => {
                      let value = e.target.value;
                      value = value.replace(/[^0-9.,]/g, '');
                      value = value.replace('.', ',');
                      const parts = value.split(',');
                      if (parts.length > 2) {
                        value = parts[0] + ',' + parts.slice(1).join('');
                      }
                      setEditValues({ ...editValues, delivery_fee_home: value });
                    }}
                  />
                  <Label>Min. objednávka pre dopravu zdarma (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={editValues.home_min_free_delivery}
                    onChange={(e) => {
                      let value = e.target.value;
                      value = value.replace(/[^0-9.,]/g, '');
                      value = value.replace('.', ',');
                      const parts = value.split(',');
                      if (parts.length > 2) {
                        value = parts[0] + ',' + parts.slice(1).join('');
                      }
                      setEditValues({ ...editValues, home_min_free_delivery: value });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Badge variant="outline" className="mb-2">Gastro zákazníci</Badge>
                  <Label>Poplatok za dopravu (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={editValues.delivery_fee_gastro}
                    onChange={(e) => {
                      let value = e.target.value;
                      value = value.replace(/[^0-9.,]/g, '');
                      value = value.replace('.', ',');
                      const parts = value.split(',');
                      if (parts.length > 2) {
                        value = parts[0] + ',' + parts.slice(1).join('');
                      }
                      setEditValues({ ...editValues, delivery_fee_gastro: value });
                    }}
                  />
                  <Label>Min. objednávka pre dopravu zdarma (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={editValues.gastro_min_free_delivery}
                    onChange={(e) => {
                      let value = e.target.value;
                      value = value.replace(/[^0-9.,]/g, '');
                      value = value.replace('.', ',');
                      const parts = value.split(',');
                      if (parts.length > 2) {
                        value = parts[0] + ',' + parts.slice(1).join('');
                      }
                      setEditValues({ ...editValues, gastro_min_free_delivery: value });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Badge variant="outline" className="mb-2">Veľkoobchodní zákazníci</Badge>
                  <Label>Poplatok za dopravu (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={editValues.delivery_fee_wholesale}
                    onChange={(e) => {
                      let value = e.target.value;
                      value = value.replace(/[^0-9.,]/g, '');
                      value = value.replace('.', ',');
                      const parts = value.split(',');
                      if (parts.length > 2) {
                        value = parts[0] + ',' + parts.slice(1).join('');
                      }
                      setEditValues({ ...editValues, delivery_fee_wholesale: value });
                    }}
                  />
                  <Label>Min. objednávka pre dopravu zdarma (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={editValues.wholesale_min_free_delivery}
                    onChange={(e) => {
                      let value = e.target.value;
                      value = value.replace(/[^0-9.,]/g, '');
                      value = value.replace('.', ',');
                      const parts = value.split(',');
                      if (parts.length > 2) {
                        value = parts[0] + ',' + parts.slice(1).join('');
                      }
                      setEditValues({ ...editValues, wholesale_min_free_delivery: value });
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveNewRoute}>Uložiť</Button>
                <Button variant="outline" onClick={handleCancel}>Zrušiť</Button>
              </div>
            </div>
          </div>
        )}

        {routes.map((route) => (
          <div key={route.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{route.name}</h3>
              {editingRoute !== route.id && !isCreatingNew && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(route)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Upraviť
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRoute(route.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Odstrániť
                  </Button>
                </div>
              )}
            </div>

            {editingRoute === route.id ? (
              <div className="space-y-4">
                <div className="space-y-2 mb-4">
                  <Label>Názov trasy</Label>
                  <Input
                    type="text"
                    value={editValues.name || ''}
                    onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                    placeholder="Zadajte názov trasy"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Badge variant="outline" className="mb-2">Domáci zákazníci</Badge>
                    <Label>Poplatok za dopravu (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={editValues.delivery_fee_home}
                      onChange={(e) => {
                        let value = e.target.value;
                        value = value.replace(/[^0-9.,]/g, '');
                        value = value.replace('.', ',');
                        const parts = value.split(',');
                        if (parts.length > 2) {
                          value = parts[0] + ',' + parts.slice(1).join('');
                        }
                        setEditValues({ ...editValues, delivery_fee_home: value });
                      }}
                    />
                    <Label>Min. objednávka pre dopravu zdarma (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={editValues.home_min_free_delivery}
                      onChange={(e) => {
                        let value = e.target.value;
                        value = value.replace(/[^0-9.,]/g, '');
                        value = value.replace('.', ',');
                        const parts = value.split(',');
                        if (parts.length > 2) {
                          value = parts[0] + ',' + parts.slice(1).join('');
                        }
                        setEditValues({ ...editValues, home_min_free_delivery: value });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Badge variant="outline" className="mb-2">Gastro zákazníci</Badge>
                    <Label>Poplatok za dopravu (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={editValues.delivery_fee_gastro}
                      onChange={(e) => {
                        let value = e.target.value;
                        value = value.replace(/[^0-9.,]/g, '');
                        value = value.replace('.', ',');
                        const parts = value.split(',');
                        if (parts.length > 2) {
                          value = parts[0] + ',' + parts.slice(1).join('');
                        }
                        setEditValues({ ...editValues, delivery_fee_gastro: value });
                      }}
                    />
                    <Label>Min. objednávka pre dopravu zdarma (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={editValues.gastro_min_free_delivery}
                      onChange={(e) => {
                        let value = e.target.value;
                        value = value.replace(/[^0-9.,]/g, '');
                        value = value.replace('.', ',');
                        const parts = value.split(',');
                        if (parts.length > 2) {
                          value = parts[0] + ',' + parts.slice(1).join('');
                        }
                        setEditValues({ ...editValues, gastro_min_free_delivery: value });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Badge variant="outline" className="mb-2">Veľkoobchodní zákazníci</Badge>
                    <Label>Poplatok za dopravu (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={editValues.delivery_fee_wholesale}
                      onChange={(e) => {
                        let value = e.target.value;
                        value = value.replace(/[^0-9.,]/g, '');
                        value = value.replace('.', ',');
                        const parts = value.split(',');
                        if (parts.length > 2) {
                          value = parts[0] + ',' + parts.slice(1).join('');
                        }
                        setEditValues({ ...editValues, delivery_fee_wholesale: value });
                      }}
                    />
                    <Label>Min. objednávka pre dopravu zdarma (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={editValues.wholesale_min_free_delivery}
                      onChange={(e) => {
                        let value = e.target.value;
                        value = value.replace(/[^0-9.,]/g, '');
                        value = value.replace('.', ',');
                        const parts = value.split(',');
                        if (parts.length > 2) {
                          value = parts[0] + ',' + parts.slice(1).join('');
                        }
                        setEditValues({ ...editValues, wholesale_min_free_delivery: value });
                      }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleSave(route.id)}>
                    Uložiť
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Zrušiť
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Badge variant="outline" className="mb-2">Domáci</Badge>
                    <p className="text-muted-foreground">Poplatok: {Number(route.delivery_fee_home).toFixed(2).replace('.', ',')}€</p>
                    <p className="text-muted-foreground">Min. zdarma: {Number(route.home_min_free_delivery).toFixed(2).replace('.', ',')}€</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Gastro</Badge>
                    <p className="text-muted-foreground">Poplatok: {Number(route.delivery_fee_gastro).toFixed(2).replace('.', ',')}€</p>
                    <p className="text-muted-foreground">Min. zdarma: {Number(route.gastro_min_free_delivery).toFixed(2).replace('.', ',')}€</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">Veľkoobchod</Badge>
                    <p className="text-muted-foreground">Poplatok: {Number(route.delivery_fee_wholesale).toFixed(2).replace('.', ',')}€</p>
                    <p className="text-muted-foreground">Min. zdarma: {Number(route.wholesale_min_free_delivery).toFixed(2).replace('.', ',')}€</p>
                  </div>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{getCustomersForRoute(route.id).length} zákazníkov</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCustomersDialog(route.id)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Spravovať zákazníkov
                    </Button>
                  </div>
                  {getCustomersForRoute(route.id).length > 0 && (
                    <div className="space-y-1">
                      {/* Domáci */}
                      {getCustomersForRoute(route.id).filter(c => c.customer_type === 'home').length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-xs font-medium text-blue-600 w-16 shrink-0">Domáci:</span>
                          {getCustomersForRoute(route.id)
                            .filter(c => c.customer_type === 'home')
                            .map(c => (
                              <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                {c.company_name || c.name}
                              </span>
                            ))}
                        </div>
                      )}
                      {/* Gastro */}
                      {getCustomersForRoute(route.id).filter(c => c.customer_type === 'gastro').length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-xs font-medium text-orange-600 w-16 shrink-0">Gastro:</span>
                          {getCustomersForRoute(route.id)
                            .filter(c => c.customer_type === 'gastro')
                            .map(c => (
                              <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                                {c.company_name || c.name}
                              </span>
                            ))}
                        </div>
                      )}
                      {/* Veľkoobchod */}
                      {getCustomersForRoute(route.id).filter(c => c.customer_type === 'wholesale').length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-xs font-medium text-purple-600 w-16 shrink-0">VO:</span>
                          {getCustomersForRoute(route.id)
                            .filter(c => c.customer_type === 'wholesale')
                            .map(c => (
                              <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                {c.company_name || c.name}
                              </span>
                            ))}
                        </div>
                      )}
                      {/* Bez typu */}
                      {getCustomersForRoute(route.id).filter(c => !c.customer_type).length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-xs font-medium text-gray-500 w-16 shrink-0">Ostatní:</span>
                          {getCustomersForRoute(route.id)
                            .filter(c => !c.customer_type)
                            .map(c => (
                              <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                {c.company_name || c.name}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {routes.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            Žiadne rozvozové trasy. Vytvorte trasu v sekcii Rozvozové trasy.
          </p>
        )}
      </div>

      <Dialog open={isCustomersDialogOpen} onOpenChange={setIsCustomersDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zákazníci trasy — {currentRoute?.name}</DialogTitle>
            <DialogDescription>Vyberte zákazníkov priradených do tejto trasy</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex gap-2 mb-4">
              {['all','home','gastro','wholesale'].map(type => (
                <Button
                  key={type}
                  variant={customerTypeFilter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCustomerTypeFilter(type)}
                >
                  {type === 'all' ? 'Všetci' : type === 'home' ? 'Domáci' : type === 'gastro' ? 'Gastro' : 'VO'}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              {customers
                .filter(c => customerTypeFilter === 'all' || c.customer_type === customerTypeFilter)
                .map(customer => {
                  const isSelected = selectedCustomerIds.has(customer.id);
                  const otherRoute = customer.delivery_route_id && customer.delivery_route_id !== managingRouteId
                    ? routes.find(r => r.id === customer.delivery_route_id)
                    : null;
                  return (
                    <div
                      key={customer.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${isSelected ? 'bg-primary/5 border-primary' : ''}`}
                      onClick={() => toggleCustomerSelection(customer.id)}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleCustomerSelection(customer.id)} />
                      <div className="flex-1">
                        <p className="font-medium">{customer.company_name || customer.name}</p>
                        {customer.address && <p className="text-sm text-muted-foreground">{customer.address}</p>}
                        {otherRoute && <Badge variant="outline" className="mt-1 text-xs">Aktuálne: {otherRoute.name}</Badge>}
                      </div>
                      <Badge variant={customer.customer_type === 'home' ? 'default' : 'secondary'}>
                        {customer.customer_type === 'home' ? 'Domáci' : customer.customer_type === 'gastro' ? 'Gastro' : 'VO'}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomersDialogOpen(false)}>Zrušiť</Button>
            <Button onClick={handleSaveCustomers}>Uložiť ({selectedCustomerIds.size} vybraných)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
