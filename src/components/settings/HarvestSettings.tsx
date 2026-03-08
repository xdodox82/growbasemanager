import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scissors } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const DAYS = [
  { key: 'monday', label: 'Pondelok' },
  { key: 'tuesday', label: 'Utorok' },
  { key: 'wednesday', label: 'Streda' },
  { key: 'thursday', label: 'Štvrtok' },
  { key: 'friday', label: 'Piatok' },
  { key: 'saturday', label: 'Sobota' },
  { key: 'sunday', label: 'Nedeľa' },
];

const DEFAULT_SETTINGS: Record<string, boolean> = {
  monday: false, tuesday: false, wednesday: false,
  thursday: false, friday: false, saturday: false, sunday: false,
};

export function HarvestSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, boolean>>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('harvest_settings')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.harvest_settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.harvest_settings });
      }
    } catch (error) {
      console.error('Error loading harvest settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          harvest_settings: settings
        }, {
          onConflict: 'id'
        });
      if (error) throw error;
      toast({ title: 'Uložené', description: 'Dni zberu boli úspešne uložené' });
    } catch (error) {
      console.error('Error saving harvest settings:', error);
      toast({ title: 'Chyba', description: 'Nepodarilo sa uložiť dni zberu', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Scissors className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Dni zberu</h2>
            <p className="text-sm text-muted-foreground">Načítavam...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Scissors className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Dni zberu</h2>
          <p className="text-sm text-muted-foreground">
            Nastavte v ktoré dni sa zbiera. Plán sadenia sa vypočíta podľa najbližšieho dňa zberu pred dátumom doručenia.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {DAYS.map(day => (
          <button
            key={day.key}
            type="button"
            onClick={() => toggleDay(day.key)}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              settings[day.key]
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Vybrané: {DAYS.filter(d => settings[d.key]).map(d => d.label).join(', ') || 'žiadne'}
        </p>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Ukladám...' : 'Uložiť'}
        </Button>
      </div>
    </Card>
  );
}
