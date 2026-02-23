import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface DbPrice {
  id: string;
  crop_id: string | null;
  blend_id: string | null;
  packaging_size: string;
  unit_price: number;
  customer_type: string;
  created_at: string;
  updated_at: string;
}

export interface DbVatSettings {
  id: string;
  vat_rate: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function usePrices() {
  const [data, setData] = useState<DbPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data: prices, error } = await supabase
      .from('prices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prices:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať ceny',
        variant: 'destructive',
      });
    } else {
      setData(prices || []);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const add = async (price: Omit<DbPrice, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('prices').insert([price]);
    if (error) {
      console.error('Error adding price:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa pridať cenu',
        variant: 'destructive',
      });
      return false;
    }
    await fetchData();
    return true;
  };

  const addMany = async (prices: Omit<DbPrice, 'id' | 'created_at' | 'updated_at'>[]) => {
    const { error } = await supabase.from('prices').insert(prices);
    if (error) {
      console.error('Error adding prices:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa pridať ceny',
        variant: 'destructive',
      });
      return false;
    }
    await fetchData();
    return true;
  };

  const update = async (id: string, updates: Partial<DbPrice>) => {
    const { error } = await supabase.from('prices').update(updates).eq('id', id);
    if (error) {
      console.error('Error updating price:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa aktualizovať cenu',
        variant: 'destructive',
      });
      return false;
    }
    await fetchData();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('prices').delete().eq('id', id);
    if (error) {
      console.error('Error deleting price:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa odstrániť cenu',
        variant: 'destructive',
      });
      return false;
    }
    await fetchData();
    return true;
  };

  const getPrice = (cropId: string | null, blendId: string | null, packagingSize: string, customerType?: string): number | null => {
    // First try to find price for specific customer type
    if (customerType) {
      const specificPrice = data.find(p => 
        p.crop_id === cropId && 
        p.blend_id === blendId && 
        p.packaging_size === packagingSize &&
        p.customer_type === customerType
      );
      if (specificPrice) return specificPrice.unit_price;
    }
    
    // Fallback to 'all' customer type
    const defaultPrice = data.find(p => 
      p.crop_id === cropId && 
      p.blend_id === blendId && 
      p.packaging_size === packagingSize &&
      (p.customer_type === 'all' || !p.customer_type)
    );
    return defaultPrice?.unit_price ?? null;
  };

  return { data, loading, refetch: fetchData, add, addMany, update, remove, getPrice };
}

export function useVatSettings() {
  const [data, setData] = useState<DbVatSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data: settings, error } = await supabase
      .from('vat_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching VAT settings:', error);
    } else {
      setData(settings);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const update = async (updates: Partial<DbVatSettings>) => {
    if (!data) return false;
    
    const { error } = await supabase
      .from('vat_settings')
      .update(updates)
      .eq('id', data.id);
    
    if (error) {
      console.error('Error updating VAT settings:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa aktualizovať DPH nastavenia',
        variant: 'destructive',
      });
      return false;
    }
    await fetchData();
    toast({
      title: 'Úspech',
      description: 'DPH nastavenia boli aktualizované',
    });
    return true;
  };

  const calculateWithVat = (price: number): number => {
    if (!data?.is_enabled) return price;
    return price * (1 + data.vat_rate / 100);
  };

  const calculateWithoutVat = (priceWithVat: number): number => {
    if (!data?.is_enabled) return priceWithVat;
    return priceWithVat / (1 + data.vat_rate / 100);
  };

  return { 
    data, 
    loading, 
    refetch: fetchData, 
    update, 
    calculateWithVat, 
    calculateWithoutVat,
    vatRate: data?.vat_rate ?? 20,
    isVatEnabled: data?.is_enabled ?? false
  };
}
