import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useVATSettings } from '@/hooks/useVATSettings';
import { Loader2, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function VATSettings() {
  const { settings, loading, updateSettings } = useVATSettings();
  const [localIsVATPayer, setLocalIsVATPayer] = useState(false);
  const [localVATRate, setLocalVATRate] = useState('20');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (settings) {
      setLocalIsVATPayer(settings.is_vat_payer);
      setLocalVATRate(settings.default_vat_rate.toString());
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await updateSettings({ is_vat_payer: localIsVATPayer, default_vat_rate: parseFloat(localVATRate) });
    setSaving(false);
    toast({ title: 'Uložené', description: 'Nastavenia DPH boli uložené' });
  };

  if (loading) return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm px-5 py-4 flex items-center gap-3">
      <Loader2 className="h-4 w-4 animate-spin text-[#16a34a]" />
      <span className="text-sm text-[#64748b]">Načítavam...</span>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#f1f5f9]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center">
            <Receipt className="h-4 w-4 text-[#475569]" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#0f172a]">Nastavenia DPH</div>
            <div className="text-xs text-[#64748b]">Globálne nastavenia pre výpočet DPH</div>
          </div>
        </div>
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#0f172a]">Platca DPH</div>
            <div className="text-xs text-[#64748b]">DPH polia sa zobrazia vo všetkých formulároch</div>
          </div>
          <Switch checked={localIsVATPayer} onCheckedChange={setLocalIsVATPayer} />
        </div>
        {localIsVATPayer && (
          <div className="flex items-center gap-4 pl-4 border-l-2 border-[#16a34a]">
            <div>
              <div className="text-xs font-semibold text-[#475569] mb-1">Predvolená sadzba DPH (%)</div>
              <Input type="number" min="0" max="100" step="0.01" value={localVATRate}
                onChange={e => setLocalVATRate(e.target.value)}
                className="w-28 h-9 border-[#e2e8f0] text-sm" placeholder="20" />
            </div>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="h-9 px-5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Uložiť
          </button>
        </div>
      </div>
    </div>
  );
}
