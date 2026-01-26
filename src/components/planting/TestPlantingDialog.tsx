import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Beaker, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';

interface Crop {
  id: string;
  name: string;
  category: string;
  color?: string;
  days_to_harvest: number;
  tray_configs?: any;
}

interface TestPlantingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TestPlantingDialog({ open, onOpenChange, onSuccess }: TestPlantingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [testType, setTestType] = useState('osivo');
  const [batchNumber, setBatchNumber] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCropId, setSelectedCropId] = useState('');
  const [sowDate, setSowDate] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [selectedTraySize, setSelectedTraySize] = useState<'XL' | 'L' | 'M' | 'S'>('XL');
  const [trayCount, setTrayCount] = useState(0);
  const [useCustomDensity, setUseCustomDensity] = useState(false);
  const [customSeedDensity, setCustomSeedDensity] = useState(0);
  const [notes, setNotes] = useState('');
  const [crops, setCrops] = useState<Crop[]>([]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (open) {
      fetchCrops();
    }
  }, [open]);

  const fetchCrops = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setCrops(data || []);
    } catch (error) {
      console.error('Error fetching crops:', error);
    }
  };

  const selectedCrop = useMemo(() => {
    return crops.find(crop => crop.id === selectedCropId);
  }, [crops, selectedCropId]);

  const filteredCrops = useMemo(() => {
    if (selectedCategory === 'all') return crops;
    return crops.filter(crop => crop.category === selectedCategory);
  }, [crops, selectedCategory]);

  const handleCropSelect = useCallback((cropId: string) => {
    setSelectedCropId(cropId);
    setUseCustomDensity(false);
    setCustomSeedDensity(0);
  }, []);

  const seedDensity = useMemo(() => {
    if (useCustomDensity) return customSeedDensity;
    if (!selectedCrop?.tray_configs) return 0;
    return selectedCrop.tray_configs[selectedTraySize]?.seed_density_grams ||
           selectedCrop.tray_configs[selectedTraySize]?.seed_density || 0;
  }, [selectedCrop, selectedTraySize, useCustomDensity, customSeedDensity]);

  const totalSeedGrams = useMemo(() => {
    return seedDensity * trayCount;
  }, [seedDensity, trayCount]);

  useEffect(() => {
    if (sowDate && selectedCrop?.days_to_harvest) {
      const sow = new Date(sowDate);
      sow.setDate(sow.getDate() + selectedCrop.days_to_harvest);
      setHarvestDate(format(sow, 'yyyy-MM-dd'));
    }
  }, [sowDate, selectedCrop]);

  const resetForm = () => {
    setTestType('osivo');
    setBatchNumber('');
    setSelectedCategory('all');
    setSelectedCropId('');
    setSowDate('');
    setHarvestDate('');
    setSelectedTraySize('XL');
    setTrayCount(0);
    setUseCustomDensity(false);
    setCustomSeedDensity(0);
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCropId || !sowDate || trayCount <= 0) {
      toast({
        title: 'Chyba',
        description: 'Vyplňte všetky povinné polia.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    try {
      const dataToSave = {
        crop_id: selectedCropId,
        test_type: testType,
        batch_number: batchNumber || null,
        sow_date: sowDate,
        harvest_date: harvestDate,
        tray_size: selectedTraySize,
        tray_count: trayCount,
        seed_amount_grams: seedDensity,
        total_seed_grams: totalSeedGrams,
        notes: notes || null,
        status: 'planned',
        user_id: user?.id
      };

      console.log('Creating test planting:', dataToSave);

      const { error } = await supabase
        .from('test_plantings')
        .insert(dataToSave);

      if (error) {
        console.error('Test planting insert error:', error);
        throw error;
      }

      toast({
        title: 'Test vytvorený',
        description: 'Testovací výsev bol úspešne vytvorený.'
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error saving test planting:', error);
      toast({
        title: 'Chyba',
        description: error?.message || 'Nepodarilo sa vytvoriť testovací výsev.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const formatGrams = (grams: number) => {
    return Math.round(grams * 10) / 10;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-yellow-600" />
            Nový testovací výsev
          </DialogTitle>
          <DialogDescription>
            Vytvorte nový testovací výsev na overenie osiva, substrátu alebo technológie.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">

            <div className="grid gap-2">
              <Label htmlFor="testType" className="text-sm">Typ testu *</Label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger id="testType" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="osivo">🌱 Osivo</SelectItem>
                  <SelectItem value="substrat">🪴 Substrát</SelectItem>
                  <SelectItem value="technologia">⚙️ Technológia</SelectItem>
                  <SelectItem value="ine">📋 Iné</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="batchNumber" className="text-sm">Šarža (voliteľné)</Label>
              <Input
                id="batchNumber"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="napr. 2024-11-A"
                className="h-9"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-sm">Kategória plodiny</Label>
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-9">
                  <TabsTrigger value="all" className="text-xs">Všetko</TabsTrigger>
                  <TabsTrigger value="microgreens" className="text-xs">Mikrozelenina</TabsTrigger>
                  <TabsTrigger value="microherbs" className="text-xs">Mikrobylinky</TabsTrigger>
                  <TabsTrigger value="edible_flowers" className="text-xs">Jedlé kvety</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="crop" className="text-sm">Plodina *</Label>
              <Select value={selectedCropId} onValueChange={handleCropSelect}>
                <SelectTrigger id="crop" className="h-9">
                  <SelectValue placeholder="Vyberte plodinu" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCrops.map(crop => (
                    <SelectItem key={crop.id} value={crop.id}>
                      {crop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="traySize" className="text-sm">Veľkosť tácky *</Label>
                <Select value={selectedTraySize} onValueChange={(val) => setSelectedTraySize(val as 'XL' | 'L' | 'M' | 'S')}>
                  <SelectTrigger id="traySize" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XL">XL</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="S">S</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="trayCount" className="text-sm">Počet táciek *</Label>
                <Input
                  id="trayCount"
                  type="number"
                  value={trayCount || ''}
                  onChange={(e) => setTrayCount(parseInt(e.target.value) || 0)}
                  min="0"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCustomDensity"
                  checked={useCustomDensity}
                  onChange={(e) => setUseCustomDensity(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="useCustomDensity" className="cursor-pointer text-sm">
                  Vlastná hustota semien
                </Label>
              </div>
              {useCustomDensity && (
                <Input
                  type="number"
                  value={customSeedDensity || ''}
                  onChange={(e) => setCustomSeedDensity(parseFloat(e.target.value) || 0)}
                  placeholder="g/tácku"
                  className="h-9"
                  step="0.1"
                />
              )}
              <p className="text-xs text-muted-foreground">
                Hustota: {formatGrams(seedDensity)}g/tácku • Celkom: {formatGrams(totalSeedGrams)}g
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sowDate" className="text-sm">Dátum výsevu *</Label>
                <Input
                  id="sowDate"
                  type="date"
                  value={sowDate}
                  onChange={(e) => setSowDate(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="harvestDate" className="text-sm">Dátum zberu</Label>
                <Input
                  id="harvestDate"
                  type="date"
                  value={harvestDate}
                  readOnly
                  className="h-9 bg-muted"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-sm">Poznámka (voliteľné)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Napr: test substrátu, test osiva, test novej odrody..."
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <Beaker className="h-3 w-3 mt-0.5 flex-shrink-0 text-yellow-700" />
              <p className="text-yellow-800">Semená sa NEODPOČÍTAJÚ zo skladu pri testovacom výseve.</p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={saving}
            >
              Zrušiť
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vytvoriť test
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
