import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, Save, Loader2, Check, Cloud, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePackagingMappings } from '@/hooks/usePackagingMappings';

type Crop = {
  id: string;
  name: string;
  hasMapping?: boolean;
};

type Packaging = {
  id: string;
  name: string;
  type: string;
  size: string;
};

const STANDARD_WEIGHTS = [25, 50, 60, 70, 100, 120, 150];
const PACKAGING_VOLUMES = ['250ml', '500ml', '750ml', '1000ml', '1200ml', '1500ml'];

export function PackagingMappings() {
  const { toast } = useToast();
  const {
    loadMappingsByCrop,
    upsertMappings,
    deleteMappingsByCrop,
    getCropsWithMappings
  } = usePackagingMappings();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [selectedCropId, setSelectedCropId] = useState('');
  const [volumeMappings, setVolumeMappings] = useState<Record<number, string>>({});
  const [enabledWeights, setEnabledWeights] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCropId) {
      loadMappingsForCrop(selectedCropId);
    } else {
      setVolumeMappings({});
      setEnabledWeights({});
    }
  }, [selectedCropId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [cropsRes, packagingsRes, mappingsRes] = await Promise.all([
        supabase.from('crops').select('id, name').order('name'),
        supabase.from('packagings').select('id, name, type, size').order('name'),
        supabase.from('packaging_mappings').select('crop_id'),
      ]);

      const cropsWithMappings = cropsRes.data?.map(crop => ({
        ...crop,
        hasMapping: mappingsRes.data?.some(m => m.crop_id === crop.id) || false
      })) || [];

      setCrops(cropsWithMappings);
      if (packagingsRes.data) setPackagings(packagingsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať dáta',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMappingsForCrop = async (cropId: string) => {
    try {
      const data = await loadMappingsByCrop(cropId);

      if (data && Array.isArray(data)) {
        const mappings: Record<number, string> = {};
        const enabled: Record<number, boolean> = {};
        data.forEach((m: any) => {
          if (m?.packagings?.size && m?.weight_g) {
            mappings[m.weight_g] = m.packagings.size;
            enabled[m.weight_g] = true;
          }
        });
        setVolumeMappings(mappings);
        setEnabledWeights(enabled);
      } else {
        setVolumeMappings({});
        setEnabledWeights({});
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
      setVolumeMappings({});
      setEnabledWeights({});
    }
  };

  const handleWeightToggle = (weight: number, checked: boolean) => {
    setEnabledWeights({ ...enabledWeights, [weight]: checked });
    if (!checked) {
      setVolumeMappings({ ...volumeMappings, [weight]: '' });
    }
  };

  const handleVolumeChange = (weight: number, volume: string) => {
    setVolumeMappings({ ...volumeMappings, [weight]: volume === 'none' ? '' : volume });
  };

  const handleSaveConfiguration = async () => {
    if (!selectedCropId) {
      toast({
        title: 'Chyba',
        description: 'Vyberte plodinu',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    setSyncStatus('syncing');
    setSyncMessage('Ukladá sa...');

    try {
      const mappingsToInsert = Object.entries(volumeMappings)
        .filter(([weight, volume]) => enabledWeights[parseInt(weight)] && volume && volume !== '')
        .map(([weight, volume]) => {
          const packaging = packagings?.find(p => p?.size === volume);
          return {
            crop_id: selectedCropId,
            weight_g: parseInt(weight),
            packaging_id: packaging?.id || '',
          };
        })
        .filter(m => m?.packaging_id);

      const result = await upsertMappings(mappingsToInsert);

      if (!result.success) {
        throw new Error(result.error?.message || 'Chyba pri ukladaní');
      }

      await Promise.all([
        loadMappingsForCrop(selectedCropId),
        loadData()
      ]);

      setSyncStatus('success');
      setSyncMessage('Uložené');
      toast({
        title: 'Úspech',
        description: 'Konfigurácia obalov bola uložená',
      });
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      setSyncStatus('error');
      setSyncMessage('Chyba pri ukladaní');
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa uložiť konfiguráciu',
        variant: 'destructive',
      });
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Automatické priradenie obalov</h2>
            <p className="text-sm text-muted-foreground">Načítavam...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!crops || crops.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Automatické priradenie obalov</h2>
            <p className="text-sm text-muted-foreground">
              Nastavte predvolený obal pre kombináciu plodiny a hmotnosti
            </p>
          </div>
        </div>
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>Najprv vytvorte plodiny v sekcii Plodiny</p>
        </div>
      </Card>
    );
  }

  if (!packagings || packagings.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Automatické priradenie obalov</h2>
            <p className="text-sm text-muted-foreground">
              Nastavte predvolený obal pre kombináciu plodiny a hmotnosti
            </p>
          </div>
        </div>
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>Najprv vytvorte obaly v sekcii Balenie</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Link2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Automatické priradenie obalov</h2>
          <p className="text-sm text-muted-foreground">
            Nastavte predvolený obal pre kombináciu plodiny a hmotnosti (Zrezaná mikrozelenina)
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <Label>Plodina</Label>
            <Select value={selectedCropId} onValueChange={setSelectedCropId}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte plodinu..." />
              </SelectTrigger>
              <SelectContent>
                {crops && crops.length > 0 ? (
                  crops.map((crop) => (
                    <SelectItem key={crop?.id} value={crop?.id || ''}>
                      <div className="flex items-center gap-2">
                        {crop?.name || ''}
                        {crop?.hasMapping && (
                          <Check className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-crops" disabled>
                    Žiadne plodiny
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedCropId ? (
          <>
            <div className="space-y-2">
              <Label className="text-base font-semibold">Konfigurácia hmotnosti a objemu</Label>
              <p className="text-sm text-muted-foreground mb-3">Zapnite prepínač pre hmotnosti, ktoré chcete používať</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {STANDARD_WEIGHTS.map((weight) => (
                  <div key={weight} className={`flex items-center gap-2 p-2 border rounded-md transition-all ${enabledWeights[weight] ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                    <Switch
                      checked={enabledWeights[weight] || false}
                      onCheckedChange={(checked) => handleWeightToggle(weight, checked)}
                      className="scale-90"
                    />
                    <div className="w-12">
                      <span className={`font-bold text-xs ${enabledWeights[weight] ? 'text-green-700' : 'text-gray-400'}`}>
                        {weight}g
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Select
                        disabled={!enabledWeights[weight]}
                        value={volumeMappings[weight] || 'none'}
                        onValueChange={(value) => handleVolumeChange(weight, value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Objem..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-</SelectItem>
                          {PACKAGING_VOLUMES.map((volume) => (
                            <SelectItem key={volume} value={volume}>
                              {volume}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSaveConfiguration} disabled={isSaving} size="lg" className="gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ukladám...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Uložiť zmeny
                  </>
                )}
              </Button>
            </div>

            <div className="mt-6 border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold">Aktuálne nastavené balenia</h3>
                <div className="flex items-center gap-1 text-xs">
                  {syncStatus === 'idle' && (
                    <Cloud className="h-4 w-4 text-gray-400" />
                  )}
                  {syncStatus === 'syncing' && (
                    <>
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      <span className="text-blue-600">{syncMessage}</span>
                    </>
                  )}
                  {syncStatus === 'success' && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">{syncMessage}</span>
                    </>
                  )}
                  {syncStatus === 'error' && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">{syncMessage}</span>
                    </>
                  )}
                </div>
              </div>
              {Object.entries(volumeMappings).filter(([_, vol]) => vol && vol !== '').length > 0 ? (
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-semibold">Hmotnosť</th>
                        <th className="text-left py-2 px-2 font-semibold">Objem krabičky</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(volumeMappings)
                        .filter(([_, volume]) => volume && volume !== '')
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([weight, volume]) => (
                          <tr key={weight} className="border-b last:border-b-0">
                            <td className="py-2 px-2 font-medium text-green-700">{weight}g</td>
                            <td className="py-2 px-2">{volume}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                  <p className="text-sm">Žiadne nastavené balenia</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>Vyberte plodinu pre nastavenie konfigurácie obalov</p>
          </div>
        )}
      </div>
    </Card>
  );
}
