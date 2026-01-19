import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface VATSettings {
  id: string;
  user_id: string;
  is_vat_payer: boolean;
  default_vat_rate: number;
  created_at: string;
  updated_at: string;
}

export function useVATSettings() {
  const [settings, setSettings] = useState<VATSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('vat_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching VAT settings:', error);
      // Only show error if it's a real database error, not just missing data
      if (error.code !== 'PGRST116') {
        toast({
          title: 'Chyba',
          description: 'Nepodarilo sa načítať nastavenia DPH',
          variant: 'destructive'
        });
      }
    }

    // Set data even if null (no settings yet)
    setSettings(data);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<VATSettings>) => {
    if (!user) return;

    if (!settings) {
      // Create new settings
      const { data, error } = await supabase
        .from('vat_settings')
        .insert({
          user_id: user.id,
          ...newSettings
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating VAT settings:', error);
        toast({
          title: 'Chyba',
          description: 'Nepodarilo sa uložiť nastavenia DPH',
          variant: 'destructive'
        });
        return false;
      }

      setSettings(data);
      toast({
        title: 'Úspech',
        description: 'Nastavenia DPH boli uložené'
      });
      return true;
    } else {
      // Update existing settings
      const { data, error } = await supabase
        .from('vat_settings')
        .update(newSettings)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating VAT settings:', error);
        toast({
          title: 'Chyba',
          description: 'Nepodarilo sa aktualizovať nastavenia DPH',
          variant: 'destructive'
        });
        return false;
      }

      setSettings(data);
      toast({
        title: 'Úspech',
        description: 'Nastavenia DPH boli aktualizované'
      });
      return true;
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
    isVATPayer: settings?.is_vat_payer || false,
    defaultVATRate: settings?.default_vat_rate || 20
  };
}
