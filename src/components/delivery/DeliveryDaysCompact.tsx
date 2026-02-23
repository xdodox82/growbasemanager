import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useDeliveryDays } from '@/hooks/useDeliveryDays';
import { Loader2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DAYS_COMPACT = [
  { key: 'monday', label: 'Po' },
  { key: 'tuesday', label: 'Ut' },
  { key: 'wednesday', label: 'St' },
  { key: 'thursday', label: 'Št' },
  { key: 'friday', label: 'Pi' },
  { key: 'saturday', label: 'So' },
  { key: 'sunday', label: 'Ne' },
];

export function DeliveryDaysCompact() {
  const { settings, loading, updateSettings } = useDeliveryDays();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        monday: settings.monday,
        tuesday: settings.tuesday,
        wednesday: settings.wednesday,
        thursday: settings.thursday,
        friday: settings.friday,
        saturday: settings.saturday,
        sunday: settings.sunday,
      });
    }
  }, [settings]);

  const toggleDay = async (dayKey: string) => {
    const newSettings = {
      ...localSettings,
      [dayKey]: !localSettings[dayKey as keyof typeof localSettings],
    };
    setLocalSettings(newSettings);

    // Auto-save on change
    await updateSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Načítavam...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Calendar className="h-4 w-4 text-[#10b981]" />
        Rozvozové dni:
      </div>
      <div className="flex gap-1">
        {DAYS_COMPACT.map((day) => (
          <Button
            key={day.key}
            variant={localSettings[day.key as keyof typeof localSettings] ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleDay(day.key)}
            className={
              localSettings[day.key as keyof typeof localSettings]
                ? 'h-8 w-10 bg-[#10b981] hover:bg-[#059669] text-white'
                : 'h-8 w-10 hover:bg-gray-100'
            }
          >
            {day.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Kliknite na dni pre výber
      </p>
    </div>
  );
}
