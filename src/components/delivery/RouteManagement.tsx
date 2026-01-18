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
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');

  const [routeFormData, setRouteFormData] = useState({
    name: '',
  });

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

    const routeData = {
      name: routeFormData.name,
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
    });
    setEditingRoute(null);
  };

  const openEditRouteDialog = (route: any) => {
    setEditingRoute(route);
    setRouteFormData({
      name: route.name,
    });
    setIsRouteDialogOpen(true);
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
        <p className="text-sm text-muted-foreground">Trasy sa spravujú v Nastaveniach</p>
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
                      <div key={customer.id} className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {customer.company_name || customer.name}
                        </Badge>
                        <Badge
                          variant={customer.customer_type === 'home' ? 'default' : customer.customer_type === 'gastro' ? 'outline' : 'outline'}
                          className="text-xs"
                        >
                          {customer.customer_type === 'home' ? 'D' : customer.customer_type === 'gastro' ? 'G' : 'VO'}
                        </Badge>
                      </div>
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
                <p className="text-xs text-muted-foreground mt-2">
                  Poplatky za dopravu sa nastavujú globálne v Nastaveniach a automaticky sa pripočítavajú podľa typu zákazníka
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
            <div className="flex gap-2 mb-4">
              <Button
                variant={customerTypeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCustomerTypeFilter('all')}
              >
                Všetci
              </Button>
              <Button
                variant={customerTypeFilter === 'home' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCustomerTypeFilter('home')}
              >
                Domáci
              </Button>
              <Button
                variant={customerTypeFilter === 'gastro' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCustomerTypeFilter('gastro')}
              >
                Gastro
              </Button>
              <Button
                variant={customerTypeFilter === 'wholesale' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCustomerTypeFilter('wholesale')}
              >
                VO
              </Button>
            </div>
            <div className="space-y-2">
              {customers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Žiadni zákazníci v systéme
                </p>
              ) : (
                customers
                  .filter(customer => customerTypeFilter === 'all' || customer.customer_type === customerTypeFilter)
                  .map((customer) => {
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
