import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useDeliveryDays } from '@/hooks/useDeliveryDays';
import { Loader2 } from 'lucide-react';

const DAYS = [
  { key: 'monday', label: 'Pondelok' },
  { key: 'tuesday', label: 'Utorok' },
  { key: 'wednesday', label: 'Streda' },
  { key: 'thursday', label: 'Štvrtok' },
  { key: 'friday', label: 'Piatok' },
  { key: 'saturday', label: 'Sobota' },
  { key: 'sunday', label: 'Nedeľa' },
];

export function DeliveryDaysSettings() {
  const { settings, loading, updateSettings } = useDeliveryDays();
  const [localSettings, setLocalSettings] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    setSaving(true);
    await updateSettings(localSettings);
    setSaving(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#10b981]" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Rozvozové dni</h3>
          <p className="text-sm text-gray-600">
            Vyberte dni v týždni, keď vykonávate rozvoz. Tieto dni budú zvýraznené pri výbere dátumu objednávky.
          </p>
        </div>

        <div className="space-y-3">
          {DAYS.map((day) => (
            <div key={day.key} className="flex items-center space-x-3">
              <Checkbox
                id={`day-${day.key}`}
                checked={localSettings[day.key as keyof typeof localSettings]}
                onCheckedChange={(checked) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    [day.key]: checked === true,
                  }))
                }
              />
              <Label
                htmlFor={`day-${day.key}`}
                className="text-sm font-normal cursor-pointer"
              >
                {day.label}
              </Label>
            </div>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#10b981] hover:bg-[#059669]"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Uložiť rozvozové dni
        </Button>
      </div>
    </Card>
  );
}
