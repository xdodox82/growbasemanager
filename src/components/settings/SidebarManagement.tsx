import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar, Save, LayoutDashboard, Leaf, Users, ShoppingCart, Calendar, Blend, Warehouse, Package, Truck, Euro, FileBarChart, ListChecks } from 'lucide-react';

interface SidebarItem {
  id: string;
  name: string;
  icon: typeof LayoutDashboard;
  enabled: boolean;
}

const defaultSidebarItems: SidebarItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { id: 'today', name: 'Dnešné úlohy', icon: ListChecks, enabled: true },
  { id: 'customers', name: 'Zákazníci', icon: Users, enabled: true },
  { id: 'suppliers', name: 'Dodávatelia', icon: Users, enabled: true },
  { id: 'orders', name: 'Objednávky', icon: ShoppingCart, enabled: true },
  { id: 'crops', name: 'Plodiny', icon: Leaf, enabled: true },
  { id: 'blends', name: 'Mixy', icon: Blend, enabled: true },
  { id: 'planting', name: 'Siatba', icon: Calendar, enabled: true },
  { id: 'harvest', name: 'Zber úrody', icon: Leaf, enabled: true },
  { id: 'balenie', name: 'Balenie', icon: Package, enabled: true },
  { id: 'delivery', name: 'Rozvoz', icon: Truck, enabled: true },
  { id: 'calendar', name: 'Kalendár', icon: Calendar, enabled: true },
  { id: 'inventory', name: 'Sklad', icon: Warehouse, enabled: true },
  { id: 'prices', name: 'Ceny', icon: Euro, enabled: true },
  { id: 'reports', name: 'Reporty', icon: FileBarChart, enabled: true },
];

export function SidebarManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<SidebarItem[]>(defaultSidebarItems);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('sidebar_settings')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.sidebar_settings) {
        const savedSettings = data.sidebar_settings as Record<string, boolean>;
        setItems(prevItems =>
          prevItems.map(item => ({
            ...item,
            enabled: savedSettings[item.id] !== undefined ? savedSettings[item.id] : true,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading sidebar settings:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať nastavenia sidebaru.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (itemId: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const settings = items.reduce((acc, item) => {
        acc[item.id] = item.enabled;
        return acc;
      }, {} as Record<string, boolean>);

      const { error } = await supabase
        .from('profiles')
        .update({ sidebar_settings: settings })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Úspech',
        description: 'Nastavenia sidebaru boli uložené. Obnovte stránku, aby sa zmeny prejavili.',
      });

      window.location.reload();
    } catch (error) {
      console.error('Error saving sidebar settings:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa uložiť nastavenia sidebaru.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setItems(defaultSidebarItems);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sidebar className="h-5 w-5" />
          <CardTitle>Správa modulov</CardTitle>
        </div>
        <CardDescription>
          Vyberte, ktoré položky sa majú zobrazovať v bočnom menu
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Načítavam nastavenia...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      <Checkbox
                        id={item.id}
                        checked={item.enabled}
                        onCheckedChange={() => handleToggle(item.id)}
                      />
                      <Label
                        htmlFor={item.id}
                        className="flex items-center gap-2 cursor-pointer flex-1"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Label>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Ukladám...' : 'Uložiť zmeny'}
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  disabled={saving}
                >
                  Obnoviť predvolené
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
