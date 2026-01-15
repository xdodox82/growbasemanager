import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkerPermissions, WorkerPermission } from '@/hooks/useWorkerPermissions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Euro,
  Building2,
  Truck,
  ClipboardList,
  Leaf,
  Package,
  ShoppingCart,
  Calendar,
  LayoutDashboard,
  Blend,
  Sprout,
  Warehouse,
  Wheat,
  Scissors,
  FileBarChart,
  Layers,
  Box,
  Tag,
  Settings,
  Fuel,
  Droplet,
  Zap,
  Droplets,
  Receipt
} from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  fullName: string | null;
  role: 'admin' | 'worker';
}

const PERMISSION_CONFIG: Array<{
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  sensitive?: boolean;
}> = [
  { key: 'can_view_dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Zobrazenie prehľadu a štatistík' },
  { key: 'can_view_today_tasks', label: 'Dnešné úlohy', icon: ClipboardList, description: 'Zobrazenie dnešných úloh' },
  { key: 'can_view_customers', label: 'Zákazníci', icon: Building2, description: 'Zobrazenie zákazníkov a kontaktov', sensitive: true },
  { key: 'can_view_suppliers', label: 'Dodávatelia', icon: Truck, description: 'Zobrazenie dodávateľov', sensitive: true },
  { key: 'can_view_orders', label: 'Objednávky', icon: ShoppingCart, description: 'Zobrazenie objednávok' },
  { key: 'can_view_crops', label: 'Plodiny', icon: Leaf, description: 'Prístup k plodinám' },
  { key: 'can_view_blends', label: 'Zmesi', icon: Blend, description: 'Prístup k zmesiam' },
  { key: 'can_view_planting', label: 'Plán sadenia', icon: Calendar, description: 'Zobrazenie plánu sadenia' },
  { key: 'can_view_prep_planting', label: 'Príprava sadenia', icon: Box, description: 'Príprava na sadenie' },
  { key: 'can_view_harvest', label: 'Zber', icon: Scissors, description: 'Prístup k zberu úrody' },
  { key: 'can_view_prep_packaging', label: 'Príprava obalov', icon: Tag, description: 'Príprava obalového materiálu' },
  { key: 'can_view_balenie', label: 'Balenie', icon: Package, description: 'Prístup k baleniu' },
  { key: 'can_view_delivery', label: 'Rozvoz', icon: Truck, description: 'Prístup k rozvozu' },
  { key: 'can_view_calendar', label: 'Kalendár', icon: Calendar, description: 'Zobrazenie kalendára' },
  { key: 'can_view_costs_fuel', label: 'Náklady - PHM', icon: Fuel, description: 'Pohonné hmoty', sensitive: true },
  { key: 'can_view_costs_adblue', label: 'Náklady - AdBlue', icon: Droplets, description: 'AdBlue náklady', sensitive: true },
  { key: 'can_view_costs_water', label: 'Náklady - Voda', icon: Droplet, description: 'Náklady za vodu', sensitive: true },
  { key: 'can_view_costs_electricity', label: 'Náklady - Elektrina', icon: Zap, description: 'Náklady za elektrinu', sensitive: true },
  { key: 'can_view_costs_other', label: 'Náklady - Ostatné', icon: Receipt, description: 'Ostatné náklady', sensitive: true },
  { key: 'can_view_inventory', label: 'Sklad', icon: Warehouse, description: 'Prístup k inventáru' },
  { key: 'can_view_seeds', label: 'Sklad - Osivo', icon: Wheat, description: 'Správa osiva' },
  { key: 'can_view_packaging', label: 'Sklad - Obaly', icon: Package, description: 'Obalový materiál' },
  { key: 'can_view_substrate', label: 'Sklad - Substrát', icon: Layers, description: 'Správa substrátu' },
  { key: 'can_view_labels', label: 'Sklad - Etikety', icon: Tag, description: 'Správa etikiet' },
  { key: 'can_view_consumables', label: 'Sklad - Spotrebný materiál', icon: Package, description: 'Spotrebný materiál' },
  { key: 'can_view_prices', label: 'Ceny', icon: Euro, description: 'Zobrazenie cien a cenníkov', sensitive: true },
  { key: 'can_view_reports', label: 'Reporty', icon: FileBarChart, description: 'Prístup k reportom', sensitive: true },
  { key: 'can_view_settings', label: 'Nastavenia', icon: Settings, description: 'Prístup k nastaveniam', sensitive: true },
];

export const WorkerPermissionsSettings = () => {
  const [workers, setWorkers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { permissions, loading: loadingPermissions, togglePermission, getPermissionForUser, DEFAULT_PERMISSIONS } = useWorkerPermissions();
  const { toast } = useToast();

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, email, full_name');

        if (profilesError) throw profilesError;

        // Fetch all roles
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) throw rolesError;

        // Combine and filter only workers
        const allUsers: UserWithRole[] = (profiles || []).map(profile => {
          const roleData = roles?.find(r => r.user_id === profile.user_id);
          return {
            id: profile.user_id,
            email: profile.email || '',
            fullName: profile.full_name,
            role: (roleData?.role as 'admin' | 'worker') || 'worker',
          };
        }).filter(u => u.role === 'worker');

        setWorkers(allUsers);
      } catch (error) {
        console.error('Error fetching workers:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchWorkers();
  }, []);

  const handleToggle = async (userId: string, permissionKey: keyof Omit<WorkerPermission, 'id' | 'user_id'>) => {
    const success = await togglePermission(userId, permissionKey);
    if (success) {
      toast({
        title: 'Oprávnenie aktualizované',
        description: 'Oprávnenie pracovníka bolo úspešne zmenené',
      });
    } else {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa zmeniť oprávnenie',
        variant: 'destructive',
      });
    }
  };

  const getPermissionValue = (userId: string, key: keyof Omit<WorkerPermission, 'id' | 'user_id'>): boolean => {
    const userPermission = getPermissionForUser(userId);
    if (userPermission) {
      return userPermission[key];
    }
    return DEFAULT_PERMISSIONS[key];
  };

  if (loadingUsers || loadingPermissions) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Card>
    );
  }

  if (workers.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Oprávnenia pracovníkov</h3>
            <p className="text-sm text-muted-foreground">Nastavte, čo môžu pracovníci vidieť</p>
          </div>
        </div>
        <p className="text-muted-foreground text-center py-8">
          Žiadni pracovníci nie sú zaregistrovaní. Oprávnenia sa nastavia automaticky pri pridaní pracovníkov.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Oprávnenia pracovníkov</h3>
          <p className="text-sm text-muted-foreground">Nastavte, čo môžu pracovníci vidieť v aplikácii</p>
        </div>
      </div>

      <div className="space-y-6">
        {workers.map((worker) => (
          <div key={worker.id} className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-medium">
                  {worker.fullName?.charAt(0) || worker.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{worker.fullName || 'Neznáme meno'}</p>
                <p className="text-sm text-muted-foreground">{worker.email}</p>
              </div>
              <Badge variant="secondary" className="ml-auto">Pracovník</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PERMISSION_CONFIG.map((config) => {
                const Icon = config.icon;
                const value = getPermissionValue(worker.id, config.key as keyof Omit<WorkerPermission, 'id' | 'user_id'>);
                
                return (
                  <div 
                    key={config.key}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      value ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 ${value ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-sm font-medium truncate">{config.label}</Label>
                          {config.sensitive && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
                              Citlivé
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={() => handleToggle(worker.id, config.key as keyof Omit<WorkerPermission, 'id' | 'user_id'>)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Poznámka:</strong> Citlivé údaje (ceny, zákazníci, dodávatelia) sú predvolene skryté pre pracovníkov. 
          Zapnite ich len ak potrebujete, aby pracovník mal k týmto údajom prístup.
        </p>
      </div>
    </Card>
  );
};
