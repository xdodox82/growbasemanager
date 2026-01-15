import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];

// Typed hooks for each table
export interface DbCrop {
  id: string;
  name: string;
  variety: string | null;
  category: string | null;
  days_to_harvest: number;
  days_to_germination: number | null;
  germination_type: string | null;
  needs_weight: boolean | null;
  days_in_darkness: number | null;
  days_on_light: number | null;
  seed_density: number | null;
  expected_yield: number | null;
  seed_soaking: boolean | null;
  can_be_cut: boolean | null;
  can_be_live: boolean | null;
  color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  delivery_notes: string | null;
  delivery_day_ids: string[] | null;
  delivery_route_id: string | null;
  customer_type: string | null;
  company_name: string | null;
  contact_name: string | null;
  ico: string | null;
  dic: string | null;
  ic_dph: string | null;
  bank_account: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSupplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  company_name: string | null;
  supplier_type: string | null;
  ico: string | null;
  ic_dph: string | null;
  dic: string | null;
  bank_account: string | null;
  created_at: string;
}

export interface DbOrder {
  id: string;
  customer_id: string | null;
  crop_id: string | null;
  blend_id: string | null;
  quantity: number;
  unit: string | null;
  order_date: string;
  delivery_date: string | null;
  status: string | null;
  notes: string | null;
  is_recurring: boolean | null;
  recurrence_pattern: string | null;
  delivery_form: string | null;
  packaging_size: string | null;
  has_label: boolean | null;
  order_number: number | null;
  parent_order_id: string | null;
  skipped: boolean | null;
  recurring_weeks: number | null;
  total_price: number | null;
  created_at: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  crop_id: string | null;
  blend_id: string | null;
  quantity: number;
  unit: string | null;
  packaging_size: string | null;
  delivery_form: string | null;
  has_label: boolean | null;
  notes: string | null;
  created_at: string;
}

export interface DbLabel {
  id: string;
  name: string;
  type: string | null;
  size: string | null;
  quantity: number;
  supplier_id: string | null;
  notes: string | null;
  min_stock: number | null;
  created_at: string;
}

export interface CropComponent {
  crop_id: string;
  percentage: number;
  seed_id?: string | null;
}

export interface DbPlantingPlan {
  id: string;
  crop_id: string | null;
  order_id: string | null;
  tray_count: number | null;
  sow_date: string;
  expected_harvest_date: string | null;
  actual_harvest_date: string | null;
  status: string | null;
  notes: string | null;
  seed_id: string | null;
  is_combined: boolean | null;
  crop_components: CropComponent[] | null;
  created_at: string;
}

export interface CropPercentage {
  cropId: string;
  percentage: number;
  isBlend?: boolean; // true if this is a blend, false/undefined if it's a crop
}

export interface DbBlend {
  id: string;
  name: string;
  crop_ids: string[] | null;
  crop_percentages: CropPercentage[] | null;
  notes: string | null;
  created_at: string;
}

export interface DbSeed {
  id: string;
  crop_id: string | null;
  supplier_id: string | null;
  quantity: number;
  unit: string | null;
  lot_number: string | null;
  purchase_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  min_stock: number | null;
  consumption_start_date: string | null;
  stocking_date: string | null;
  certificate_url: string | null;
  created_at: string;
}

export interface DbPackaging {
  id: string;
  name: string;
  type: string | null;
  size: string | null;
  quantity: number;
  supplier_id: string | null;
  notes: string | null;
  min_stock: number | null;
  created_at: string;
}

export interface DbSubstrate {
  id: string;
  name: string;
  type: string | null;
  quantity: number;
  unit: string | null;
  supplier_id: string | null;
  notes: string | null;
  min_stock: number | null;
  created_at: string;
}

export interface DbOtherInventory {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  notes: string | null;
  created_at: string;
}

export interface DbTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean | null;
  category: string | null;
  created_at: string;
}

// Hook for crops
export function useCrops() {
  const [data, setData] = useState<DbCrop[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('crops')
        .select('*')
        .order('name');

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching crops:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbCrop, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('crops')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [...prev, result]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding crop:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať plodinu.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbCrop>) => {
    try {
      const { data: result, error } = await supabase
        .from('crops')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating crop:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať plodinu.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('crops').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting crop:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť plodinu.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}

// Hook for customers
export function useCustomers() {
  const [data, setData] = useState<DbCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbCustomer, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('customers')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [...prev, result]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať zákazníka.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbCustomer>) => {
    try {
      const { data: result, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať zákazníka.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť zákazníka.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}

// Hook for suppliers
export function useSuppliers() {
  const [data, setData] = useState<DbSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbSupplier, 'id' | 'created_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('suppliers')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [...prev, result]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding supplier:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať dodávateľa.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbSupplier>) => {
    try {
      const { data: result, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať dodávateľa.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť dodávateľa.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}

// Hook for orders
export function useOrders() {
  const [data, setData] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbOrder, 'id' | 'created_at' | 'order_number'>) => {
    try {
      const { data: result, error } = await supabase
        .from('orders')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [result, ...prev]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding order:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať objednávku.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbOrder>) => {
    try {
      const { data: result, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať objednávku.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť objednávku.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}

// Hook for order items
export function useOrderItems() {
  const [data, setData] = useState<DbOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('order_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbOrderItem, 'id' | 'created_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('order_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [result, ...prev]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding order item:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať položku objednávky.' });
      return { data: null, error };
    }
  };

  const addMany = async (items: Omit<DbOrderItem, 'id' | 'created_at'>[]) => {
    try {
      const { data: result, error } = await supabase
        .from('order_items')
        .insert(items)
        .select();

      if (error) throw error;
      setData((prev) => [...(result || []), ...prev]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding order items:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať položky objednávky.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbOrderItem>) => {
    try {
      const { data: result, error } = await supabase
        .from('order_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating order item:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať položku objednávky.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('order_items').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting order item:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť položku objednávky.' });
      return { error };
    }
  };

  const removeByOrderId = async (orderId: string) => {
    try {
      const { error } = await supabase.from('order_items').delete().eq('order_id', orderId);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.order_id !== orderId));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting order items:', error);
      return { error };
    }
  };

  const getByOrderId = (orderId: string) => data.filter(item => item.order_id === orderId);

  return { data, loading, refetch: fetchData, add, addMany, update, remove, removeByOrderId, getByOrderId };
}

// Helper function to transform planting plan from DB to typed interface
const transformPlantingPlan = (plan: any): DbPlantingPlan => ({
  ...plan,
  crop_components: plan.crop_components as CropComponent[] | null,
});

// Hook for planting plans
export function usePlantingPlans() {
  const [data, setData] = useState<DbPlantingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('planting_plans')
        .select('*')
        .order('sow_date', { ascending: false });

      if (error) throw error;
      setData((result || []).map(transformPlantingPlan));
    } catch (error) {
      console.error('Error fetching planting plans:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbPlantingPlan, 'id' | 'created_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('planting_plans')
        .insert(item as any)
        .select()
        .single();

      if (error) throw error;
      const transformed = transformPlantingPlan(result);
      setData((prev) => [transformed, ...prev]);
      return { data: transformed, error: null };
    } catch (error: any) {
      console.error('Error adding planting plan:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať výsev.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbPlantingPlan>) => {
    try {
      const { data: result, error } = await supabase
        .from('planting_plans')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      const transformed = transformPlantingPlan(result);
      setData((prev) => prev.map((item) => (item.id === id ? transformed : item)));
      return { data: transformed, error: null };
    } catch (error: any) {
      console.error('Error updating planting plan:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať výsev.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('planting_plans').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting planting plan:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť výsev.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}

// Hook for blends
export function useBlends() {
  const [data, setData] = useState<DbBlend[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('blends')
        .select('*')
        .order('name');

      if (error) throw error;
      setData((result || []) as unknown as DbBlend[]);
    } catch (error) {
      console.error('Error fetching blends:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbBlend, 'id' | 'created_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('blends')
        .insert(item as any)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [...prev, result as unknown as DbBlend]);
      return { data: result as unknown as DbBlend, error: null };
    } catch (error: any) {
      console.error('Error adding blend:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať zmes.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbBlend>) => {
    try {
      const { data: result, error } = await supabase
        .from('blends')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result as unknown as DbBlend : item)));
      return { data: result as unknown as DbBlend, error: null };
    } catch (error: any) {
      console.error('Error updating blend:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať zmes.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('blends').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting blend:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť zmes.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}

// Hook for seeds
export function useSeeds() {
  const [data, setData] = useState<DbSeed[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('seeds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching seeds:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbSeed, 'id' | 'created_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('seeds')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [result, ...prev]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding seed:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať semená.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbSeed>) => {
    try {
      const { data: result, error } = await supabase
        .from('seeds')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating seed:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať semená.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('seeds').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting seed:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť semená.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}

// Hook for tasks
export function useTasks() {
  const [data, setData] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbTask, 'id' | 'created_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('tasks')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [result, ...prev]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať úlohu.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbTask>) => {
    try {
      const { data: result, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať úlohu.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť úlohu.' });
      return { error };
    }
  };

  const toggleComplete = async (id: string) => {
    const task = data.find((t) => t.id === id);
    if (task) {
      return update(id, { completed: !task.completed });
    }
    return { data: null, error: new Error('Task not found') };
  };

  return { data, loading, refetch: fetchData, add, update, remove, toggleComplete };
}

// Hook for packagings
export function usePackagings() {
  const [data, setData] = useState<DbPackaging[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('packagings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching packagings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbPackaging, 'id' | 'created_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('packagings')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [result, ...prev]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding packaging:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať obal.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbPackaging>) => {
    try {
      const { data: result, error } = await supabase
        .from('packagings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating packaging:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať obal.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('packagings').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting packaging:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť obal.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}

// Hook for substrates
export function useSubstrates() {
  const [data, setData] = useState<DbSubstrate[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('substrates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching substrates:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbSubstrate, 'id' | 'created_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('substrates')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [result, ...prev]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding substrate:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať substrát.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbSubstrate>) => {
    try {
      const { data: result, error } = await supabase
        .from('substrates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating substrate:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať substrát.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('substrates').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting substrate:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť substrát.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}

// Hook for other_inventory
export function useOtherInventory() {
  const [data, setData] = useState<DbOtherInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('other_inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching other_inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbOtherInventory, 'id' | 'created_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('other_inventory')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [result, ...prev]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding other_inventory:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať položku.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbOtherInventory>) => {
    try {
      const { data: result, error } = await supabase
        .from('other_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating other_inventory:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať položku.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('other_inventory').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting other_inventory:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť položku.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}

// Interface for delivery routes
export interface DbDeliveryRoute {
  id: string;
  name: string;
  delivery_day_id: string | null;
  customer_ids: string[] | null;
  created_at: string;
}

// Interface for delivery days
export interface DbDeliveryDay {
  id: string;
  name: string;
  day_of_week: number;
  created_at: string;
}

// Hook for delivery routes
export function useDeliveryRoutes() {
  const [data, setData] = useState<DbDeliveryRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('delivery_routes')
        .select('*')
        .order('name');

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching delivery_routes:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbDeliveryRoute, 'id' | 'created_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('delivery_routes')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [...prev, result]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding delivery_route:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať trasu.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbDeliveryRoute>) => {
    try {
      const { data: result, error } = await supabase
        .from('delivery_routes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating delivery_route:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať trasu.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('delivery_routes').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting delivery_route:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť trasu.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}

// Hook for delivery days
export function useDeliveryDays() {
  const [data, setData] = useState<DbDeliveryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('delivery_days')
        .select('*')
        .order('day_of_week');

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching delivery_days:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbDeliveryDay, 'id' | 'created_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('delivery_days')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [...prev, result]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding delivery_day:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať deň.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbDeliveryDay>) => {
    try {
      const { data: result, error } = await supabase
        .from('delivery_days')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating delivery_day:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať deň.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('delivery_days').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting delivery_day:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť deň.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}

// Hook for labels
export function useLabels() {
  const [data, setData] = useState<DbLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: result, error } = await supabase
        .from('labels')
        .select('*')
        .order('name');

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error('Error fetching labels:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (item: Omit<DbLabel, 'id' | 'created_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('labels')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => [...prev, result]);
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error adding label:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa pridať etiketu.' });
      return { data: null, error };
    }
  };

  const update = async (id: string, updates: Partial<DbLabel>) => {
    try {
      const { data: result, error } = await supabase
        .from('labels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setData((prev) => prev.map((item) => (item.id === id ? result : item)));
      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error updating label:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať etiketu.' });
      return { data: null, error };
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from('labels').delete().eq('id', id);
      if (error) throw error;
      setData((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting label:', error);
      toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa odstrániť etiketu.' });
      return { error };
    }
  };

  return { data, loading, refetch: fetchData, add, update, remove };
}
