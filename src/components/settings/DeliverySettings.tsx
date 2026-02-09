import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Truck, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

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
    setEditValues(route);
  };

  const handleSave = async (routeId: string) => {
    try {
      const { error } = await supabase
        .from('delivery_routes')
        .update({
          name: editValues.name,
          delivery_fee_home: editValues.delivery_fee_home,
          delivery_fee_gastro: editValues.delivery_fee_gastro,
          delivery_fee_wholesale: editValues.delivery_fee_wholesale,
          home_min_free_delivery: editValues.home_min_free_delivery,
          gastro_min_free_delivery: editValues.gastro_min_free_delivery,
          wholesale_min_free_delivery: editValues.wholesale_min_free_delivery,
        })
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
      delivery_fee_home: 0,
      delivery_fee_gastro: 0,
      delivery_fee_wholesale: 0,
      home_min_free_delivery: 0,
      gastro_min_free_delivery: 0,
      wholesale_min_free_delivery: 0,
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
          delivery_fee_home: editValues.delivery_fee_home || 0,
          delivery_fee_gastro: editValues.delivery_fee_gastro || 0,
          delivery_fee_wholesale: editValues.delivery_fee_wholesale || 0,
          home_min_free_delivery: editValues.home_min_free_delivery || 0,
          gastro_min_free_delivery: editValues.gastro_min_free_delivery || 0,
          wholesale_min_free_delivery: editValues.wholesale_min_free_delivery || 0,
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

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Nastavenia dopravy podľa trás</h2>
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
            <h2 className="text-lg font-semibold">Nastavenia dopravy podľa trás</h2>
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
                    value={editValues.delivery_fee_home === 0 ? '' : String(editValues.delivery_fee_home).replace('.', ',')}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      const parts = value.split('.');
                      if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
                      setEditValues({ ...editValues, delivery_fee_home: value === '' ? 0 : parseFloat(value) || 0 });
                    }}
                  />
                  <Label>Min. objednávka pre dopravu zdarma (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={editValues.home_min_free_delivery === 0 ? '' : String(editValues.home_min_free_delivery).replace('.', ',')}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      const parts = value.split('.');
                      if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
                      setEditValues({ ...editValues, home_min_free_delivery: value === '' ? 0 : parseFloat(value) || 0 });
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
                    value={editValues.delivery_fee_gastro === 0 ? '' : String(editValues.delivery_fee_gastro).replace('.', ',')}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      const parts = value.split('.');
                      if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
                      setEditValues({ ...editValues, delivery_fee_gastro: value === '' ? 0 : parseFloat(value) || 0 });
                    }}
                  />
                  <Label>Min. objednávka pre dopravu zdarma (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={editValues.gastro_min_free_delivery === 0 ? '' : String(editValues.gastro_min_free_delivery).replace('.', ',')}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      const parts = value.split('.');
                      if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
                      setEditValues({ ...editValues, gastro_min_free_delivery: value === '' ? 0 : parseFloat(value) || 0 });
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
                    value={editValues.delivery_fee_wholesale === 0 ? '' : String(editValues.delivery_fee_wholesale).replace('.', ',')}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      const parts = value.split('.');
                      if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
                      setEditValues({ ...editValues, delivery_fee_wholesale: value === '' ? 0 : parseFloat(value) || 0 });
                    }}
                  />
                  <Label>Min. objednávka pre dopravu zdarma (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={editValues.wholesale_min_free_delivery === 0 ? '' : String(editValues.wholesale_min_free_delivery).replace('.', ',')}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                      const parts = value.split('.');
                      if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
                      setEditValues({ ...editValues, wholesale_min_free_delivery: value === '' ? 0 : parseFloat(value) || 0 });
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(route)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Upraviť
                </Button>
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
                      value={editValues.delivery_fee_home === 0 ? '' : String(editValues.delivery_fee_home).replace('.', ',')}
                      onChange={(e) => {
                        let value = e.target.value.replace(',', '.');
                        value = value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        if (parts.length > 2) {
                          value = parts[0] + '.' + parts.slice(1).join('');
                        }
                        setEditValues({ ...editValues, delivery_fee_home: value === '' ? 0 : parseFloat(value) || 0 });
                      }}
                    />
                    <Label>Min. objednávka pre dopravu zdarma (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={editValues.home_min_free_delivery === 0 ? '' : String(editValues.home_min_free_delivery).replace('.', ',')}
                      onChange={(e) => {
                        let value = e.target.value.replace(',', '.');
                        value = value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        if (parts.length > 2) {
                          value = parts[0] + '.' + parts.slice(1).join('');
                        }
                        setEditValues({ ...editValues, home_min_free_delivery: value === '' ? 0 : parseFloat(value) || 0 });
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
                      value={editValues.delivery_fee_gastro === 0 ? '' : String(editValues.delivery_fee_gastro).replace('.', ',')}
                      onChange={(e) => {
                        let value = e.target.value.replace(',', '.');
                        value = value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        if (parts.length > 2) {
                          value = parts[0] + '.' + parts.slice(1).join('');
                        }
                        setEditValues({ ...editValues, delivery_fee_gastro: value === '' ? 0 : parseFloat(value) || 0 });
                      }}
                    />
                    <Label>Min. objednávka pre dopravu zdarma (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={editValues.gastro_min_free_delivery === 0 ? '' : String(editValues.gastro_min_free_delivery).replace('.', ',')}
                      onChange={(e) => {
                        let value = e.target.value.replace(',', '.');
                        value = value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        if (parts.length > 2) {
                          value = parts[0] + '.' + parts.slice(1).join('');
                        }
                        setEditValues({ ...editValues, gastro_min_free_delivery: value === '' ? 0 : parseFloat(value) || 0 });
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
                      value={editValues.delivery_fee_wholesale === 0 ? '' : String(editValues.delivery_fee_wholesale).replace('.', ',')}
                      onChange={(e) => {
                        let value = e.target.value.replace(',', '.');
                        value = value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        if (parts.length > 2) {
                          value = parts[0] + '.' + parts.slice(1).join('');
                        }
                        setEditValues({ ...editValues, delivery_fee_wholesale: value === '' ? 0 : parseFloat(value) || 0 });
                      }}
                    />
                    <Label>Min. objednávka pre dopravu zdarma (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={editValues.wholesale_min_free_delivery === 0 ? '' : String(editValues.wholesale_min_free_delivery).replace('.', ',')}
                      onChange={(e) => {
                        let value = e.target.value.replace(',', '.');
                        value = value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        if (parts.length > 2) {
                          value = parts[0] + '.' + parts.slice(1).join('');
                        }
                        setEditValues({ ...editValues, wholesale_min_free_delivery: value === '' ? 0 : parseFloat(value) || 0 });
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
                <div className="flex justify-end mt-3 pt-3 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRoute(route.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Odstrániť trasu
                  </Button>
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
    </Card>
  );
}
