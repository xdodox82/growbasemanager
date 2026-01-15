import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WorkerPermission {
  id: string;
  user_id: string;
  can_view_dashboard: boolean;
  can_view_today_tasks: boolean;
  can_view_customers: boolean;
  can_view_suppliers: boolean;
  can_view_orders: boolean;
  can_view_crops: boolean;
  can_view_blends: boolean;
  can_view_planting: boolean;
  can_view_prep_planting: boolean;
  can_view_harvest: boolean;
  can_view_prep_packaging: boolean;
  can_view_balenie: boolean;
  can_view_delivery: boolean;
  can_view_calendar: boolean;
  can_view_costs_fuel: boolean;
  can_view_costs_adblue: boolean;
  can_view_costs_water: boolean;
  can_view_costs_electricity: boolean;
  can_view_costs_other: boolean;
  can_view_inventory: boolean;
  can_view_seeds: boolean;
  can_view_packaging: boolean;
  can_view_substrate: boolean;
  can_view_labels: boolean;
  can_view_consumables: boolean;
  can_view_prices: boolean;
  can_view_reports: boolean;
  can_view_settings: boolean;
}

const DEFAULT_PERMISSIONS: Omit<WorkerPermission, 'id' | 'user_id'> = {
  can_view_dashboard: true,
  can_view_today_tasks: true,
  can_view_customers: false,
  can_view_suppliers: false,
  can_view_orders: true,
  can_view_crops: true,
  can_view_blends: true,
  can_view_planting: true,
  can_view_prep_planting: true,
  can_view_harvest: true,
  can_view_prep_packaging: true,
  can_view_balenie: true,
  can_view_delivery: true,
  can_view_calendar: true,
  can_view_costs_fuel: false,
  can_view_costs_adblue: false,
  can_view_costs_water: false,
  can_view_costs_electricity: false,
  can_view_costs_other: false,
  can_view_inventory: true,
  can_view_seeds: true,
  can_view_packaging: true,
  can_view_substrate: true,
  can_view_labels: true,
  can_view_consumables: true,
  can_view_prices: false,
  can_view_reports: false,
  can_view_settings: false,
};

export const useWorkerPermissions = () => {
  const [permissions, setPermissions] = useState<WorkerPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  const fetchPermissions = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('worker_permissions')
        .select('*');

      if (error) throw error;
      setPermissions((data as WorkerPermission[]) || []);
    } catch (error) {
      console.error('Error fetching worker permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const getPermissionForUser = (userId: string): WorkerPermission | null => {
    return permissions.find(p => p.user_id === userId) || null;
  };

  const createPermission = async (userId: string, perms: Partial<Omit<WorkerPermission, 'id' | 'user_id'>>) => {
    try {
      const { data, error } = await supabase
        .from('worker_permissions')
        .insert({
          user_id: userId,
          ...DEFAULT_PERMISSIONS,
          ...perms,
        })
        .select()
        .single();

      if (error) throw error;
      setPermissions(prev => [...prev, data as WorkerPermission]);
      return true;
    } catch (error) {
      console.error('Error creating permission:', error);
      return false;
    }
  };

  const updatePermission = async (userId: string, perms: Partial<Omit<WorkerPermission, 'id' | 'user_id'>>) => {
    try {
      const existing = permissions.find(p => p.user_id === userId);
      
      if (existing) {
        const { error } = await supabase
          .from('worker_permissions')
          .update(perms)
          .eq('user_id', userId);

        if (error) throw error;
        setPermissions(prev => prev.map(p => 
          p.user_id === userId ? { ...p, ...perms } : p
        ));
      } else {
        await createPermission(userId, perms);
      }
      return true;
    } catch (error) {
      console.error('Error updating permission:', error);
      return false;
    }
  };

  const togglePermission = async (userId: string, permissionKey: keyof Omit<WorkerPermission, 'id' | 'user_id'>) => {
    const existing = permissions.find(p => p.user_id === userId);
    const currentValue = existing ? existing[permissionKey] : DEFAULT_PERMISSIONS[permissionKey];
    return updatePermission(userId, { [permissionKey]: !currentValue });
  };

  return {
    permissions,
    loading,
    refetch: fetchPermissions,
    getPermissionForUser,
    createPermission,
    updatePermission,
    togglePermission,
    DEFAULT_PERMISSIONS,
  };
};

// Hook for checking current user's permissions
export const useMyPermissions = () => {
  const [myPermissions, setMyPermissions] = useState<WorkerPermission | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    const fetchMyPermissions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Admins have all permissions
      if (isAdmin) {
        setMyPermissions({
          id: 'admin',
          user_id: user.id,
          can_view_dashboard: true,
          can_view_today_tasks: true,
          can_view_customers: true,
          can_view_suppliers: true,
          can_view_orders: true,
          can_view_crops: true,
          can_view_blends: true,
          can_view_planting: true,
          can_view_prep_planting: true,
          can_view_harvest: true,
          can_view_prep_packaging: true,
          can_view_balenie: true,
          can_view_delivery: true,
          can_view_calendar: true,
          can_view_costs_fuel: true,
          can_view_costs_adblue: true,
          can_view_costs_water: true,
          can_view_costs_electricity: true,
          can_view_costs_other: true,
          can_view_inventory: true,
          can_view_seeds: true,
          can_view_packaging: true,
          can_view_substrate: true,
          can_view_labels: true,
          can_view_consumables: true,
          can_view_prices: true,
          can_view_reports: true,
          can_view_settings: true,
        });
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('worker_permissions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        
        // If no permission record exists, use defaults
        if (!data) {
          setMyPermissions({
            id: 'default',
            user_id: user.id,
            ...DEFAULT_PERMISSIONS,
          });
        } else {
          setMyPermissions(data as WorkerPermission);
        }
      } catch (error) {
        console.error('Error fetching my permissions:', error);
        // Use defaults on error
        setMyPermissions({
          id: 'default',
          user_id: user?.id || '',
          ...DEFAULT_PERMISSIONS,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMyPermissions();
  }, [user, isAdmin]);

  const canView = (section: keyof Omit<WorkerPermission, 'id' | 'user_id'>): boolean => {
    if (isAdmin) return true;
    if (!myPermissions) return DEFAULT_PERMISSIONS[section];
    return myPermissions[section];
  };

  return {
    myPermissions,
    loading,
    canView,
    canViewPrices: canView('can_view_prices'),
    canViewCustomers: canView('can_view_customers'),
    canViewSuppliers: canView('can_view_suppliers'),
    canViewTodayTasks: canView('can_view_today_tasks'),
    canViewHarvest: canView('can_view_harvest'),
    canViewDelivery: canView('can_view_delivery'),
    canViewPlanting: canView('can_view_planting'),
    canViewOrders: canView('can_view_orders'),
    canViewInventory: canView('can_view_inventory'),
  };
};
