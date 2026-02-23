import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface DeliveryDaysSetting {
  id: string;
  user_id: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  created_at: string;
  updated_at: string;
}

export function useDeliveryDays() {
  const [settings, setSettings] = useState<DeliveryDaysSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('delivery_days_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching delivery days:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať nastavenia rozvozových dní',
        variant: 'destructive'
      });
    } else {
      setSettings(data);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<DeliveryDaysSetting>) => {
    if (!user) return;

    if (!settings) {
      // Create new settings
      const { data, error } = await supabase
        .from('delivery_days_settings')
        .insert({
          user_id: user.id,
          ...newSettings
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating delivery days:', error);
        toast({
          title: 'Chyba',
          description: 'Nepodarilo sa uložiť nastavenia',
          variant: 'destructive'
        });
        return false;
      }

      setSettings(data);
      toast({
        title: 'Úspech',
        description: 'Rozvozové dni boli uložené'
      });
      return true;
    } else {
      // Update existing settings
      const { data, error } = await supabase
        .from('delivery_days_settings')
        .update(newSettings)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating delivery days:', error);
        toast({
          title: 'Chyba',
          description: 'Nepodarilo sa aktualizovať nastavenia',
          variant: 'destructive'
        });
        return false;
      }

      setSettings(data);
      toast({
        title: 'Úspech',
        description: 'Rozvozové dni boli aktualizované'
      });
      return true;
    }
  };

  const getDeliveryDaysArray = (): number[] => {
    if (!settings) return [];

    const days: number[] = [];
    if (settings.monday) days.push(1);
    if (settings.tuesday) days.push(2);
    if (settings.wednesday) days.push(3);
    if (settings.thursday) days.push(4);
    if (settings.friday) days.push(5);
    if (settings.saturday) days.push(6);
    if (settings.sunday) days.push(0);

    return days;
  };

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
    getDeliveryDaysArray
  };
}
