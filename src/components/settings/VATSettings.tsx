import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useVATSettings } from '@/hooks/useVATSettings';
import { Loader2, Receipt } from 'lucide-react';

export function VATSettings() {
  const { settings, loading, updateSettings, isVATPayer, defaultVATRate } = useVATSettings();
  const [localIsVATPayer, setLocalIsVATPayer] = useState(false);
  const [localVATRate, setLocalVATRate] = useState('20');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalIsVATPayer(settings.is_vat_payer);
      setLocalVATRate(settings.default_vat_rate.toString());
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await updateSettings({
      is_vat_payer: localIsVATPayer,
      default_vat_rate: parseFloat(localVATRate)
    });
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
        <div className="flex items-center gap-3">
          <Receipt className="h-5 w-5 text-[#10b981]" />
          <div>
            <h3 className="text-lg font-semibold">Nastavenia DPH</h3>
            <p className="text-sm text-gray-600">
              Konfigurujte globálne nastavenia pre výpočet DPH
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="vat-payer" className="text-base font-medium">
                Platca DPH
              </Label>
              <p className="text-sm text-gray-500">
                Zapnite, ak ste platca DPH. DPH polia sa zobrazia vo všetkých formulároch s nákladmi.
              </p>
            </div>
            <Switch
              id="vat-payer"
              checked={localIsVATPayer}
              onCheckedChange={setLocalIsVATPayer}
            />
          </div>

          {localIsVATPayer && (
            <div className="space-y-2 pl-4 border-l-4 border-[#10b981]">
              <Label htmlFor="default-vat-rate" className="text-sm font-medium">
                Predvolená sadzba DPH (%)
              </Label>
              <Input
                id="default-vat-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={localVATRate}
                onChange={(e) => setLocalVATRate(e.target.value)}
                className="w-32"
                placeholder="20"
              />
              <p className="text-xs text-gray-500">
                Táto sadzba sa použije ako predvolená hodnota vo všetkých formulároch.
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#10b981] hover:bg-[#059669]"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Uložiť nastavenia DPH
        </Button>
      </div>
    </Card>
  );
}
