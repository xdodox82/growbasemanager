import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Plus, Pencil, Trash2, MapPin, Users } from 'lucide-react';
import { useDeliveryRoutes, useCustomers } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

const FREE_DELIVERY_THRESHOLD_KEY = 'free_delivery_threshold';

export function RouteManagement() {
  const { data: routes, add: addRoute, update: updateRoute, remove: deleteRoute } = useDeliveryRoutes();
  const { data: customers, update: updateCustomer } = useCustomers();
  const { toast } = useToast();

  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [isCustomersDialogOpen, setIsCustomersDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [managingRouteId, setManagingRouteId] = useState<string | null>(null);
  const [deleteRouteId, setDeleteRouteId] = useState<string | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  const [routeFormData, setRouteFormData] = useState({
    name: '',
    delivery_fee_home: '',
    delivery_fee_gastro: '',
    delivery_fee_wholesale: '',
  });

  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<string>(
    localStorage.getItem(FREE_DELIVERY_THRESHOLD_KEY) || '20'
  );

  const handleThresholdChange = (value: string) => {
    setFreeDeliveryThreshold(value);
    localStorage.setItem(FREE_DELIVERY_THRESHOLD_KEY, value);
    toast({
      title: 'Nastavenie uložené',
      description: `Limit pre dopravu zdarma nastavený na ${value} €`,
    });
  };

  const getCustomersForRoute = (routeId: string) => {
    return customers.filter(c => c.delivery_route_id === routeId);
  };

  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!routeFormData.name.trim()) {
      toast({
        title: 'Chyba',
        description: 'Názov trasy je povinný',
        variant: 'destructive',
      });
      return;
    }

    const deliveryFeeHome = routeFormData.delivery_fee_home ? parseFloat(routeFormData.delivery_fee_home) : 0;
    const deliveryFeeGastro = routeFormData.delivery_fee_gastro ? parseFloat(routeFormData.delivery_fee_gastro) : 0;
    const deliveryFeeWholesale = routeFormData.delivery_fee_wholesale ? parseFloat(routeFormData.delivery_fee_wholesale) : 0;

    const routeData = {
      name: routeFormData.name,
      delivery_fee: deliveryFeeHome,
      delivery_fee_home: deliveryFeeHome,
      delivery_fee_gastro: deliveryFeeGastro,
      delivery_fee_wholesale: deliveryFeeWholesale,
      customer_ids: editingRoute?.customer_ids || [],
    };

    if (editingRoute) {
      const { error } = await updateRoute(editingRoute.id, routeData);
      if (!error) {
        toast({
          title: 'Trasa aktualizovaná',
          description: `${routeFormData.name} bola úspešne upravená.`,
        });
        setIsRouteDialogOpen(false);
        resetRouteForm();
      }
    } else {
      const { error } = await addRoute(routeData);
      if (!error) {
        toast({
          title: 'Trasa vytvorená',
          description: `${routeFormData.name} bola pridaná.`,
        });
        setIsRouteDialogOpen(false);
        resetRouteForm();
      }
    }
  };

  const resetRouteForm = () => {
    setRouteFormData({
      name: '',
      delivery_fee_home: '',
      delivery_fee_gastro: '',
      delivery_fee_wholesale: '',
    });
    setEditingRoute(null);
  };

  const openEditRouteDialog = (route: any) => {
    setEditingRoute(route);
    setRouteFormData({
      name: route.name,
      delivery_fee_home: route.delivery_fee_home?.toString() || route.delivery_fee?.toString() || '',
      delivery_fee_gastro: route.delivery_fee_gastro?.toString() || route.delivery_fee?.toString() || '',
      delivery_fee_wholesale: route.delivery_fee_wholesale?.toString() || route.delivery_fee?.toString() || '',
    });
    setIsRouteDialogOpen(true);
  };

  const openCustomersDialog = (routeId: string) => {
    setManagingRouteId(routeId);
    const assignedCustomers = customers.filter(c => c.delivery_route_id === routeId);
    setSelectedCustomerIds(new Set(assignedCustomers.map(c => c.id)));
    setIsCustomersDialogOpen(true);
  };

  const handleSaveCustomers = async () => {
    if (!managingRouteId) return;

    const currentlyAssigned = customers.filter(c => c.delivery_route_id === managingRouteId);
    const toUnassign = currentlyAssigned.filter(c => !selectedCustomerIds.has(c.id));
    const toAssign = Array.from(selectedCustomerIds).filter(
      id => !currentlyAssigned.some(c => c.id === id)
    );

    const promises = [
      ...toUnassign.map(c => updateCustomer(c.id, { delivery_route_id: null })),
      ...toAssign.map(id => updateCustomer(id, { delivery_route_id: managingRouteId })),
    ];

    await Promise.all(promises);

    toast({
      title: 'Zákazníci aktualizovaní',
      description: `${selectedCustomerIds.size} zákazníkov priradených k trase.`,
    });

    setIsCustomersDialogOpen(false);
    setManagingRouteId(null);
    setSelectedCustomerIds(new Set());
  };

  const handleDeleteRoute = async () => {
    if (!deleteRouteId) return;

    const customersToUnassign = customers.filter(c => c.delivery_route_id === deleteRouteId);
    await Promise.all(
      customersToUnassign.map(c => updateCustomer(c.id, { delivery_route_id: null }))
    );

    const { error } = await deleteRoute(deleteRouteId);
    if (!error) {
      toast({
        title: 'Trasa odstránená',
        description: 'Trasa bola úspešne vymazaná a zákazníci boli odpojení.',
      });
    }
    setDeleteRouteId(null);
  };

  const toggleCustomerSelection = (customerId: string) => {
    const newSet = new Set(selectedCustomerIds);
    if (newSet.has(customerId)) {
      newSet.delete(customerId);
    } else {
      newSet.add(customerId);
    }
    setSelectedCustomerIds(newSet);
  };

  const currentRoute = managingRouteId ? routes.find(r => r.id === managingRouteId) : null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Rozvozové trasy</h3>
        </div>
        <Button onClick={() => setIsRouteDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Pridať trasu
        </Button>
      </div>

      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="freeDeliveryThreshold" className="text-sm font-semibold mb-1 block">
              Doprava zdarma od sumy (€)
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Ak objednávka presiahne túto sumu, dopravný poplatok sa neúčtuje
            </p>
            <div className="flex items-center gap-2 max-w-xs">
              <Input
                id="freeDeliveryThreshold"
                type="number"
                step="0.01"
                value={freeDeliveryThreshold}
                onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                onBlur={(e) => handleThresholdChange(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">€</span>
            </div>
          </div>
        </div>
      </div>


      {routes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Žiadne trasy</p>
          <p className="text-sm">Vytvorte prvú rozvozovú trasu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => {
            const customersCount = getCustomersForRoute(route.id).length;

            return (
              <div key={route.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold text-lg">{route.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Users className="h-4 w-4" />
                        <span>{customersCount} zákazníkov</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCustomersDialog(route.id)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Spravovať zákazníkov
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => openEditRouteDialog(route)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setDeleteRouteId(route.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {customersCount > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                    {getCustomersForRoute(route.id).map((customer) => (
                      <Badge key={customer.id} variant="secondary" className="text-xs">
                        {customer.company_name || customer.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isRouteDialogOpen} onOpenChange={(open) => {
        setIsRouteDialogOpen(open);
        if (!open) resetRouteForm();
      }}>
        <DialogContent>
          <form onSubmit={handleRouteSubmit}>
            <DialogHeader>
              <DialogTitle>{editingRoute ? 'Upraviť trasu' : 'Nová trasa'}</DialogTitle>
              <DialogDescription>
                {editingRoute ? 'Upravte názov rozvozovej trasy' : 'Vytvorte novú rozvozovú trasu (napr. "Smer Poprad")'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="routeName">Názov trasy *</Label>
                <Input
                  id="routeName"
                  value={routeFormData.name}
                  onChange={(e) => setRouteFormData({ ...routeFormData, name: e.target.value })}
                  placeholder="napr. Smer Poprad, Smer Košice..."
                />
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Poplatky za dopravu (€)</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Definujte cenu dopravy pre jednotlivé typy zákazníkov
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="deliveryFeeHome" className="text-xs">Domáci</Label>
                    <Input
                      id="deliveryFeeHome"
                      type="number"
                      step="0.01"
                      value={routeFormData.delivery_fee_home}
                      onChange={(e) => setRouteFormData({ ...routeFormData, delivery_fee_home: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deliveryFeeGastro" className="text-xs">Gastro</Label>
                    <Input
                      id="deliveryFeeGastro"
                      type="number"
                      step="0.01"
                      value={routeFormData.delivery_fee_gastro}
                      onChange={(e) => setRouteFormData({ ...routeFormData, delivery_fee_gastro: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deliveryFeeWholesale" className="text-xs">Veľkoobchod</Label>
                    <Input
                      id="deliveryFeeWholesale"
                      type="number"
                      step="0.01"
                      value={routeFormData.delivery_fee_wholesale}
                      onChange={(e) => setRouteFormData({ ...routeFormData, delivery_fee_wholesale: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Poplatky sa automaticky pripočítajú podľa typu zákazníka (ak nie je splnená podmienka dopravy zdarma)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsRouteDialogOpen(false);
                resetRouteForm();
              }}>
                Zrušiť
              </Button>
              <Button type="submit">
                {editingRoute ? 'Uložiť' : 'Vytvoriť'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomersDialogOpen} onOpenChange={setIsCustomersDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Spravovať zákazníkov - {currentRoute?.name}</DialogTitle>
            <DialogDescription>
              Vyberte zákazníkov, ktorí patria do tejto trasy
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {customers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Žiadni zákazníci v systéme
                </p>
              ) : (
                customers.map((customer) => {
                  const isSelected = selectedCustomerIds.has(customer.id);
                  const currentRouteId = customer.delivery_route_id;
                  const isInAnotherRoute = currentRouteId && currentRouteId !== managingRouteId;
                  const otherRoute = isInAnotherRoute ? routes.find(r => r.id === currentRouteId) : null;

                  return (
                    <div
                      key={customer.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary/5 border-primary' : ''
                      }`}
                      onClick={() => toggleCustomerSelection(customer.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleCustomerSelection(customer.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{customer.company_name || customer.name}</p>
                        {customer.address && (
                          <p className="text-sm text-muted-foreground">{customer.address}</p>
                        )}
                        {isInAnotherRoute && otherRoute && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Aktuálne: {otherRoute.name}
                          </Badge>
                        )}
                      </div>
                      <Badge variant={customer.customer_type === 'home' ? 'default' : customer.customer_type === 'gastro' ? 'secondary' : 'outline'}>
                        {customer.customer_type === 'home' ? 'Domáci' : customer.customer_type === 'gastro' ? 'Gastro' : 'VO'}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCustomersDialogOpen(false)}>
              Zrušiť
            </Button>
            <Button onClick={handleSaveCustomers}>
              Uložiť ({selectedCustomerIds.size} vybraných)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRouteId} onOpenChange={() => setDeleteRouteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vymazať trasu?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Zákazníci priradení k tejto trase budú odpojení.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoute} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Vymazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
