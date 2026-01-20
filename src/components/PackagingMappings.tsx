import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link2, Save, Loader2, Edit, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePackagingMappings } from '@/hooks/usePackagingMappings';

type Crop = {
  id: string;
  name: string;
  mappings?: { weight_g: number; volume: string }[];
};

type Packaging = {
  id: string;
  name: string;
  type: string;
  size: string;
};

const STANDARD_WEIGHTS = [25, 50, 60, 70, 100, 120, 150];

export function PackagingMappings() {
  const { toast } = useToast();
  const {
    loadMappingsByCrop,
    upsertMappings,
  } = usePackagingMappings();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [packagingIdMappings, setPackagingIdMappings] = useState<Record<number, string>>({});
  const [enabledWeights, setEnabledWeights] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [productsRes, packagingsRes] = await Promise.all([
        supabase.from('products').select('id, name').order('name'),
        supabase.from('packagings').select('id, name, type, size').order('name'),
      ]);

      console.log('📦 Loaded packagings:', packagingsRes.data);

      if (productsRes.data) {
        // Load mappings for all products
        const productsWithMappings = await Promise.all(
          productsRes.data.map(async (product) => {
            const mappings = await loadMappingsByCrop(product.id);
            console.log(`📋 Mappings for ${product.name}:`, mappings);
            const formattedMappings = mappings.map((m: any) => ({
              weight_g: m.weight_g,
              volume: m.packagings?.size || ''
            }));
            return {
              ...product,
              mappings: formattedMappings
            };
          })
        );
        setCrops(productsWithMappings);
      }

      if (packagingsRes.data) {
        setPackagings(packagingsRes.data);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať dáta',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = async (crop: Crop) => {
    setEditingCrop(crop);

    // Load current mappings for this crop
    const mappings = await loadMappingsByCrop(crop.id);
    console.log(`🔧 Opening edit dialog for ${crop.name}, mappings:`, mappings);

    const idMap: Record<number, string> = {};
    const enabledMap: Record<number, boolean> = {};

    mappings.forEach((m: any) => {
      if (m?.packaging_id && m?.weight_g) {
        idMap[m.weight_g] = m.packaging_id;
        enabledMap[m.weight_g] = true;
      }
    });

    console.log('🗺️ Packaging ID mappings:', idMap);
    setPackagingIdMappings(idMap);
    setEnabledWeights(enabledMap);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCrop(null);
    setPackagingIdMappings({});
    setEnabledWeights({});
  };

  const handleWeightToggle = (weight: number, checked: boolean) => {
    setEnabledWeights({ ...enabledWeights, [weight]: checked });
    if (!checked) {
      const newMappings = { ...packagingIdMappings };
      delete newMappings[weight];
      setPackagingIdMappings(newMappings);
    }
  };

  const handlePackagingChange = (weight: number, packagingId: string) => {
    if (packagingId === 'none') {
      const newMappings = { ...packagingIdMappings };
      delete newMappings[weight];
      setPackagingIdMappings(newMappings);
    } else {
      setPackagingIdMappings({ ...packagingIdMappings, [weight]: packagingId });
    }
    console.log(`📝 Updated packaging for ${weight}g:`, packagingId);
  };

  const handleSaveConfiguration = async () => {
    if (!editingCrop) return;

    setIsSaving(true);

    try {
      const mappingsToInsert = Object.entries(packagingIdMappings)
        .filter(([weight, packagingId]) => enabledWeights[parseInt(weight)] && packagingId && packagingId !== '')
        .map(([weight, packagingId]) => ({
          crop_id: editingCrop.id,
          weight_g: parseInt(weight),
          packaging_id: packagingId,
        }));

      console.log('💾 Saving mappings for', editingCrop.name, ':', mappingsToInsert);

      if (mappingsToInsert.length === 0) {
        console.log('⚠️ No mappings to save (empty array)');
        // If no mappings, delete all for this product
        const { error: deleteError } = await supabase
          .from('packagings')
          .delete()
          .eq('crop_id', editingCrop.id);

        if (deleteError) throw deleteError;
      } else {
        const result = await upsertMappings(mappingsToInsert);

        if (!result.success) {
          throw new Error(result.error?.message || 'Chyba pri ukladaní');
        }

        console.log('✅ Mappings saved successfully:', result.data);
      }

      toast({
        title: 'Úspech',
        description: `Konfigurácia pre ${editingCrop.name} bola uložená`,
      });

      // Reload all data to refresh the table
      await loadData();
      closeDialog();
    } catch (error: any) {
      console.error('❌ Error saving configuration:', error);
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa uložiť konfiguráciu',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatMappings = (mappings?: { weight_g: number; volume: string }[]) => {
    if (!mappings || mappings.length === 0) {
      return <span className="text-muted-foreground text-sm">Žiadne nastavenie</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {mappings
          .sort((a, b) => a.weight_g - b.weight_g)
          .map((m, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium"
            >
              {m.weight_g}g → {m.volume}
            </span>
          ))}
      </div>
    );
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

  console.log('🔍 All Packagings in State:', packagings);

  return (
    <>
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

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Plodina</TableHead>
                <TableHead>Nastavené balenia</TableHead>
                <TableHead className="w-[100px] text-right">Akcie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crops.map((crop) => (
                <TableRow key={crop.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {crop.name}
                      {crop.mappings && crop.mappings.length > 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatMappings(crop.mappings)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(crop)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Upraviť
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Konfigurácia obalov pre: {editingCrop?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Konfigurácia hmotnosti a objemu</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Zapnite prepínač pre hmotnosti, ktoré chcete používať
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {STANDARD_WEIGHTS.map((weight) => {
                const selectedPackaging = packagingIdMappings[weight]
                  ? packagings.find(p => p.id === packagingIdMappings[weight])
                  : null;

                return (
                  <div
                    key={weight}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
                      enabledWeights[weight]
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                        : 'bg-white dark:bg-gray-950 border-gray-200'
                    }`}
                  >
                    <Switch
                      checked={enabledWeights[weight] || false}
                      onCheckedChange={(checked) => handleWeightToggle(weight, checked)}
                    />
                    <div className="w-14">
                      <span
                        className={`font-bold text-sm ${
                          enabledWeights[weight] ? 'text-green-700 dark:text-green-300' : 'text-gray-400'
                        }`}
                      >
                        {weight}g
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Select
                        disabled={!enabledWeights[weight]}
                        value={packagingIdMappings[weight] || 'none'}
                        onValueChange={(value) => handlePackagingChange(weight, value)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Objem..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-</SelectItem>
                          {(() => {
                            console.log(`📦 Rendering dropdown for ${weight}g with ${packagings.length} packagings:`, packagings.map(p => ({ id: p.id, size: p.size, name: p.name })));
                            return packagings
                              .sort((a, b) => {
                                const aNum = parseInt(a.size || '0');
                                const bNum = parseInt(b.size || '0');
                                return aNum - bNum;
                              })
                              .map((packaging) => (
                                <SelectItem key={packaging.id} value={packaging.id}>
                                  {packaging.size || packaging.name}
                                </SelectItem>
                              ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            {Object.entries(packagingIdMappings).filter(([_, id]) => id && id !== '').length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                <h3 className="text-sm font-semibold mb-3">Náhľad konfigurácie</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(packagingIdMappings)
                    .filter(([_, packagingId]) => packagingId && packagingId !== '')
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([weight, packagingId]) => {
                      const packaging = packagings.find(p => p.id === packagingId);
                      return (
                        <span
                          key={weight}
                          className="inline-flex items-center px-3 py-2 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium"
                        >
                          {weight}g → {packaging?.size || packaging?.name || 'N/A'}
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Zrušiť
            </Button>
            <Button onClick={handleSaveConfiguration} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ukladám...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Uložiť konfiguráciu
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
