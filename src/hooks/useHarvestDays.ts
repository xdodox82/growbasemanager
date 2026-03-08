import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function useHarvestDays() {
  const [harvestSettings, setHarvestSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('harvest_settings')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.harvest_settings) {
        setSettings(data.harvest_settings);
      }
    };
    loadSettings();
  }, []);

  const setSettings = (s: Record<string, boolean>) => setHarvestSettings(s);

  const getHarvestDaysArray = (): number[] => {
    return Object.entries(harvestSettings)
      .filter(([_, enabled]) => enabled)
      .map(([day]) => DAY_MAP[day])
      .filter(n => n !== undefined);
  };

  const getHarvestDateForDelivery = (deliveryDateStr: string): string => {
    const harvestDays = getHarvestDaysArray();
    if (harvestDays.length === 0) return deliveryDateStr;

    const deliveryDate = new Date(deliveryDateStr);

    for (let i = 0; i <= 7; i++) {
      const checkDate = new Date(deliveryDate);
      checkDate.setDate(deliveryDate.getDate() - i);
      const dayOfWeek = checkDate.getDay();
      if (harvestDays.includes(dayOfWeek)) {
        return checkDate.toISOString().split('T')[0];
      }
    }

    return deliveryDateStr;
  };

  return { harvestSettings, getHarvestDaysArray, getHarvestDateForDelivery };
}
