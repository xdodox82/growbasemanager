import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LayoutGrid, Save, Loader2, LayoutDashboard, Leaf, Users, ShoppingCart, Blend, Warehouse, Package, Truck, Euro, FileBarChart, ListChecks, Scissors, Receipt, Box, Tag, Settings2 } from 'lucide-react';

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
  { id: 'crops', name: 'Plodiny', icon: Leaf, enabled: true },
  { id: 'blends', name: 'Mixy', icon: Blend, enabled: true },
  { id: 'prices', name: 'Ceny', icon: Euro, enabled: true },
  { id: 'orders', name: 'Objednávky', icon: ShoppingCart, enabled: true },
  { id: 'planting', name: 'Plán sadenia', icon: Leaf, enabled: true },
  { id: 'prep_planting', name: 'Príprava na sadenie', icon: Package, enabled: true },
  { id: 'prep_packaging', name: 'Príprava obalov', icon: Package, enabled: true },
  { id: 'harvest', name: 'Zber a balenie', icon: Leaf, enabled: true },
  { id: 'delivery', name: 'Rozvoz', icon: Truck, enabled: true },
  { id: 'inventory', name: 'Sklad', icon: Warehouse, enabled: true },
  { id: 'costs', name: 'Náklady', icon: Euro, enabled: true },
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
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#f1f5f9]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center">
            <LayoutGrid className="h-4 w-4 text-[#475569]" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#0f172a]">Správa modulov</div>
            <div className="text-xs text-[#64748b]">Vyberte ktoré položky sa zobrazujú v bočnom menu</div>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        {loading ? (
          <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-[#16a34a]" /><span className="text-sm text-[#64748b]">Načítavam...</span></div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {items.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${item.enabled ? 'bg-[#f0fdf4] border-[#bbf7d0]' : 'bg-[#f8fafc] border-[#e2e8f0] hover:border-[#cbd5e1]'}`}
                    onClick={() => handleToggle(item.id)}>
                    <Checkbox id={item.id} checked={item.enabled} onCheckedChange={() => handleToggle(item.id)}
                      className="border-[#cbd5e1]" />
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${item.enabled ? 'text-[#16a34a]' : 'text-[#94a3b8]'}`} />
                    <span className={`text-xs font-semibold ${item.enabled ? 'text-[#0f172a]' : 'text-[#64748b]'}`}>{item.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-[#f1f5f9]">
              <button onClick={handleSave} disabled={saving}
                className="h-9 px-5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? 'Ukladám...' : 'Uložiť zmeny'}
              </button>
              <button onClick={handleReset} disabled={saving}
                className="h-9 px-4 rounded-xl border border-[#e2e8f0] bg-white text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">
                Obnoviť predvolené
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
