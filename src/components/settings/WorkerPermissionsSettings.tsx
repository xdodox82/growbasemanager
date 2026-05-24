import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
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
  Scissors,
  FileBarChart,
  Box,
  Tag,
  Settings,
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
  { key: 'can_view_crops', label: 'Plodiny', icon: Leaf, description: 'Prístup k plodinám' },
  { key: 'can_view_blends', label: 'Mixy', icon: Blend, description: 'Prístup k mixom' },
  { key: 'can_view_prices', label: 'Ceny', icon: Euro, description: 'Zobrazenie cien a cenníkov', sensitive: true },
  { key: 'can_view_orders', label: 'Objednávky', icon: ShoppingCart, description: 'Zobrazenie objednávok' },
  { key: 'can_view_planting', label: 'Plán sadenia', icon: Calendar, description: 'Zobrazenie plánu sadenia' },
  { key: 'can_view_prep_planting', label: 'Príprava na sadenie', icon: Box, description: 'Príprava na sadenie' },
  { key: 'can_view_prep_packaging', label: 'Príprava obalov', icon: Tag, description: 'Príprava obalového materiálu' },
  { key: 'can_view_harvest', label: 'Zber a balenie', icon: Scissors, description: 'Prístup k zberu úrody a baleniu' },
  { key: 'can_view_delivery', label: 'Rozvoz', icon: Truck, description: 'Prístup k rozvozu' },
  { key: 'can_view_inventory', label: 'Sklad', icon: Warehouse, description: 'Prístup k inventáru' },
  { key: 'can_view_costs_fuel', label: 'Náklady', icon: Receipt, description: 'Prístup k nákladom', sensitive: true },
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

        // Combine and filter only EXPLICIT workers (must have user_roles record)
        const allUsers: UserWithRole[] = (profiles || [])
          .filter(profile => {
            const roleData = roles?.find(r => r.user_id === profile.user_id);
            return roleData?.role === 'worker'; // len explicitní workers
          })
          .map(profile => ({
            id: profile.user_id,
            email: profile.email || '',
            fullName: profile.full_name,
            role: 'worker' as const,
          }));

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
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm px-5 py-4 flex items-center gap-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#16a34a] border-t-transparent" />
        <span className="text-sm text-[#64748b]">Načítavam pracovníkov...</span>
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f1f5f9]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center">
              <Users className="h-4 w-4 text-[#475569]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#0f172a]">Oprávnenia pracovníkov</div>
              <div className="text-xs text-[#64748b]">Nastavte čo môžu pracovníci vidieť</div>
            </div>
          </div>
        </div>
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-[#64748b]">Žiadni pracovníci nie sú zaregistrovaní.</p>
          <p className="text-xs text-[#94a3b8] mt-1">Oprávnenia sa nastavia automaticky pri pridaní pracovníkov cez stránku Používatelia.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#f1f5f9]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center">
            <Users className="h-4 w-4 text-[#475569]" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#0f172a]">Oprávnenia pracovníkov</div>
            <div className="text-xs text-[#64748b]">Nastavte čo môžu pracovníci vidieť v aplikácii</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#f1f5f9]">
        {workers.map((worker) => (
          <div key={worker.id} className="px-5 py-4">
            {/* Worker header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#475569]">
                  {(worker.fullName?.charAt(0) || worker.email.charAt(0)).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-[#0f172a]">{worker.fullName || 'Neznáme meno'}</div>
                <div className="text-xs text-[#64748b]">{worker.email}</div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[#f1f5f9] border border-[#e2e8f0] text-[#475569]">
                Pracovník
              </span>
            </div>

            {/* Permissions grid */}
            <div className="grid gap-2 sm:grid-cols-2">
              {PERMISSION_CONFIG.map((config) => {
                const Icon = config.icon;
                const value = getPermissionValue(worker.id, config.key as keyof Omit<WorkerPermission, 'id' | 'user_id'>);
                return (
                  <div key={config.key}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      value ? 'bg-[#f0fdf4] border-[#bbf7d0]' : 'bg-[#f8fafc] border-[#e2e8f0] hover:border-[#cbd5e1]'
                    }`}
                    onClick={() => handleToggle(worker.id, config.key as keyof Omit<WorkerPermission, 'id' | 'user_id'>)}>
                    <Switch
                      checked={value}
                      onCheckedChange={() => handleToggle(worker.id, config.key as keyof Omit<WorkerPermission, 'id' | 'user_id'>)}
                      className="shrink-0"
                    />
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${value ? 'text-[#16a34a]' : 'text-[#94a3b8]'}`} />
                    <span className={`text-xs font-semibold truncate ${value ? 'text-[#0f172a]' : 'text-[#64748b]'}`}>{config.label}</span>
                    {config.sensitive && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#fff7ed] border border-[#fed7aa] text-[#c2410c] shrink-0">Citlivé</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 bg-[#f8fafc] border-t border-[#e2e8f0]">
        <p className="text-xs text-[#64748b]">
          <strong className="text-[#475569]">Citlivé údaje</strong> (ceny, zákazníci, dodávatelia, reporty) sú predvolene skryté. Zapnite ich len ak je to nevyhnutné.
        </p>
      </div>
    </div>
  );
};
