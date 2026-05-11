import { useState, useEffect } from 'react';
import { Scissors, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const DAYS = [
  { key: 'monday', label: 'Po' }, { key: 'tuesday', label: 'Ut' },
  { key: 'wednesday', label: 'St' }, { key: 'thursday', label: 'Št' },
  { key: 'friday', label: 'Pi' }, { key: 'saturday', label: 'So' },
  { key: 'sunday', label: 'Ne' },
];
const DAYS_FULL: Record<string, string> = {
  monday: 'Pondelok', tuesday: 'Utorok', wednesday: 'Streda',
  thursday: 'Štvrtok', friday: 'Piatok', saturday: 'Sobota', sunday: 'Nedeľa'
};
const DEFAULT: Record<string, boolean> = { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false };

export function HarvestSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(DEFAULT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('harvest_settings').eq('user_id', user.id).maybeSingle();
      if (data?.harvest_settings) setSettings({ ...DEFAULT, ...data.harvest_settings });
    } catch { } finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('profiles').update({ harvest_settings: settings }).eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Uložené', description: 'Dni zberu boli uložené' });
    } catch { toast({ title: 'Chyba', variant: 'destructive' }); } finally { setIsSaving(false); }
  };

  const selected = DAYS.filter(d => settings[d.key]).map(d => DAYS_FULL[d.key]).join(', ');

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#f1f5f9]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center">
            <Scissors className="h-4 w-4 text-[#475569]" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#0f172a]">Dni zberu</div>
            <div className="text-xs text-[#64748b]">Plán sadenia sa vypočíta podľa najbližšieho dňa zberu</div>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-[#16a34a]" /><span className="text-sm text-[#64748b]">Načítavam...</span></div>
        ) : (
          <>
            <div className="flex gap-2 mb-3">
              {DAYS.map(day => (
                <button key={day.key} type="button" onClick={() => setSettings(p => ({ ...p, [day.key]: !p[day.key] }))}
                  className={`w-10 h-10 rounded-lg border-2 text-sm font-bold transition-all ${settings[day.key] ? 'border-[#16a34a] bg-[#f0fdf4] text-[#16a34a]' : 'border-[#e2e8f0] bg-white text-[#94a3b8] hover:border-[#cbd5e1]'}`}>
                  {day.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748b]">{selected || 'Žiadne dni nevybrané'}</span>
              <button onClick={handleSave} disabled={isSaving}
                className="h-9 px-5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors disabled:opacity-50 flex items-center gap-2">
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Uložiť
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
