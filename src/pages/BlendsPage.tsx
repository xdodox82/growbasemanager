import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { useBlends, useCrops, DbBlend, CropPercentage } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Blend as BlendIcon, Plus, Pencil, Trash2, X, Percent, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BlendsPage = () => {
  const { data: blends, loading, add, update, remove } = useBlends();
  const { data: crops, loading: cropsLoading } = useCrops();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlend, setEditingBlend] = useState<DbBlend | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [formData, setFormData] = useState<{
    name: string;
    notes: string;
    crops: CropPercentage[];
  }>({
    name: '',
    notes: '',
    crops: [],
  });

  const getCropName = (cropId: string, isBlend?: boolean) => {
    if (isBlend) {
      return blends.find(b => b.id === cropId)?.name || 'Neznámy mix';
    }
    return crops.find(c => c.id === cropId)?.name || 'Neznáma plodina';
  };

  const getCropColor = (cropId: string, isBlend?: boolean) => {
    if (isBlend) {
      return '#6366f1'; // Indigo color for blends
    }
    return crops.find(c => c.id === cropId)?.color || '#888888';
  };

  const getTotalPercentage = () => {
    return formData.crops.reduce((sum, c) => sum + c.percentage, 0);
  };

  const getBlendCrops = (blend: DbBlend): CropPercentage[] => {
    if (blend.crop_percentages && Array.isArray(blend.crop_percentages)) {
      return blend.crop_percentages as CropPercentage[];
    }
    // Fallback for old data with just crop_ids
    if (blend.crop_ids && blend.crop_ids.length > 0) {
      const percentage = Math.floor(100 / blend.crop_ids.length);
      return blend.crop_ids.map((cropId, index) => ({
        cropId,
        percentage: index === blend.crop_ids!.length - 1 
          ? 100 - (percentage * (blend.crop_ids!.length - 1)) 
          : percentage
      }));
    }
    return [];
  };

  const resetForm = () => {
    setFormData({
      name: '',
      notes: '',
      crops: [],
    });
    setEditingBlend(null);
  };

  const openEditDialog = (blend: DbBlend) => {
    setEditingBlend(blend);
    setFormData({
      name: blend.name,
      notes: (blend as any).notes || '',
      crops: getBlendCrops(blend),
    });
    setIsDialogOpen(true);
  };

  const addCropToBlend = () => {
    setFormData({
      ...formData,
      crops: [...formData.crops, { cropId: '', percentage: 0, isBlend: false }],
    });
  };

  const addBlendToBlend = () => {
    // Filter out the blend being edited and blends already added
    const availableBlends = blends.filter(b => 
      b.id !== editingBlend?.id && 
      !formData.crops.some(bc => bc.isBlend && bc.cropId === b.id)
    );
    
    if (availableBlends.length === 0) {
      toast({
        title: 'Upozornenie',
        description: 'Žiadne ďalšie mixy nie sú dostupné.',
        variant: 'destructive',
      });
      return;
    }

    setFormData({
      ...formData,
      crops: [...formData.crops, { cropId: '', percentage: 0, isBlend: true }],
    });
  };

  const removeCropFromBlend = (index: number) => {
    setFormData({
      ...formData,
      crops: formData.crops.filter((_, i) => i !== index),
    });
  };

  const updateCropInBlend = (index: number, field: 'cropId' | 'percentage' | 'isBlend', value: string | number | boolean) => {
    const newCrops = [...formData.crops];
    newCrops[index] = { ...newCrops[index], [field]: value };
    setFormData({ ...formData, crops: newCrops });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Chyba',
        description: 'Zadajte názov mixu',
        variant: 'destructive',
      });
      return;
    }

    if (formData.crops.length < 2) {
      toast({
        title: 'Chyba',
        description: 'Mix musí obsahovať aspoň 2 položky',
        variant: 'destructive',
      });
      return;
    }

    const totalPercentage = getTotalPercentage();
    if (totalPercentage !== 100) {
      toast({
        title: 'Chyba',
        description: `Celkové percento musí byť 100% (teraz: ${totalPercentage}%)`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const blendData = {
      name: formData.name,
      notes: formData.notes,
      crop_ids: formData.crops.map(c => c.cropId),
      crop_percentages: formData.crops,
    };

    if (editingBlend) {
      const { error } = await update(editingBlend.id, blendData);
      if (!error) {
        toast({
          title: 'Mix aktualizovaný',
          description: `${formData.name} bol úspešne upravený.`,
        });
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await add(blendData);
      if (!error) {
        toast({
          title: 'Mix vytvorený',
          description: `${formData.name} bol pridaný.`,
        });
        setIsDialogOpen(false);
        resetForm();
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      const blend = blends.find(b => b.id === deleteId);
      const { error } = await remove(deleteId);
      if (!error) {
        toast({
          title: 'Mix odstránený',
          description: `${blend?.name} bol odstránený.`,
        });
      }
      setDeleteId(null);
    }
  };

  if (loading || cropsLoading) {
    return (
      <MainLayout>
        <PageHeader title="Mixy" description="Vytvárajte kombinácie mikrozelenín" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-5 w-32 mt-3" />
              <Skeleton className="h-4 w-20 mt-2" />
            </Card>
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader 
        title="Mixy" 
        description="Vytvárajte kombinácie mikrozelenín"
      >
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nový mix
            </Button>
          </DialogTrigger>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingBlend ? 'Upraviť mix' : 'Nový mix'}
                </DialogTitle>
                <DialogDescription>
                  Vytvorte kombináciu rôznych mikrozelenín.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Názov mixu *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="napr. Šalátový mix"
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Zloženie mixu *</Label>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={getTotalPercentage() === 100 ? 'default' : 'destructive'}
                        className="gap-1"
                      >
                        <Percent className="h-3 w-3" />
                        {getTotalPercentage()}%
                      </Badge>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addCropToBlend}
                        disabled={crops.length === 0}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Plodina
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addBlendToBlend}
                        disabled={blends.filter(b => b.id !== editingBlend?.id).length === 0}
                        className="gap-1"
                      >
                        <BlendIcon className="h-3 w-3" />
                        Mix
                      </Button>
                    </div>
                  </div>

                  {crops.length === 0 && blends.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                      Najprv pridajte plodiny v sekcii "Plodiny".
                    </div>
                  ) : formData.crops.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                      Pridajte aspoň 2 položky (plodiny alebo mixy).
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.crops.map((blendCrop, index) => (
                        <div key={index} className="flex gap-2 items-center p-3 bg-secondary/30 rounded-lg">
                          <div 
                            className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ${blendCrop.isBlend ? 'bg-gradient-to-br from-primary/30 to-info/30' : ''}`}
                            style={{ backgroundColor: blendCrop.isBlend ? undefined : (blendCrop.cropId ? getCropColor(blendCrop.cropId, blendCrop.isBlend) : '#888888') }}
                          >
                            {blendCrop.isBlend && <BlendIcon className="h-4 w-4 text-primary" />}
                          </div>
                          <div className="flex-1">
                            {blendCrop.isBlend ? (
                              <Select 
                                value={blendCrop.cropId} 
                                onValueChange={(value) => updateCropInBlend(index, 'cropId', value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Vyberte mix" />
                                </SelectTrigger>
                                <SelectContent>
                                  {blends
                                    .filter(b => b.id !== editingBlend?.id)
                                    .map(blend => (
                                      <SelectItem 
                                        key={blend.id} 
                                        value={blend.id}
                                        disabled={formData.crops.some((c, i) => i !== index && c.isBlend && c.cropId === blend.id)}
                                      >
                                        🔀 {blend.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select 
                                value={blendCrop.cropId} 
                                onValueChange={(value) => updateCropInBlend(index, 'cropId', value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Vyberte plodinu" />
                                </SelectTrigger>
                                <SelectContent>
                                  {crops.map(crop => (
                                    <SelectItem 
                                      key={crop.id} 
                                      value={crop.id}
                                      disabled={formData.crops.some((c, i) => i !== index && !c.isBlend && c.cropId === crop.id)}
                                    >
                                      {crop.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <div className="w-20">
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              value={blendCrop.percentage || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                updateCropInBlend(index, 'percentage', value === '' ? 0 : parseInt(value));
                              }}
                              className="h-9 text-center"
                              placeholder="0"
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">%</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeCropFromBlend(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Poznámky</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Použitie, odporúčania..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Zrušiť
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingBlend ? 'Uložiť zmeny' : 'Vytvoriť mix'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {blends.length === 0 ? (
        <EmptyState
          icon={<BlendIcon className="h-8 w-8" />}
          title="Žiadne mixy"
          description="Vytvorte vlastné mixy kombinovaním rôznych mikrozelenín."
          action={
            crops.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Najprv pridajte plodiny v sekcii "Plodiny".
              </p>
            ) : (
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Vytvoriť mix
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blends.map((blend) => {
            const blendCrops = getBlendCrops(blend);
            return (
              <Card key={blend.id} className="p-5 transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-success/20 to-info/20">
                      <BlendIcon className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{blend.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {blendCrops.length} položiek
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(blend)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(blend.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {blendCrops.map((blendCrop, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {blendCrop.isBlend ? (
                        <BlendIcon className="h-3 w-3 text-primary flex-shrink-0" />
                      ) : (
                        <div 
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getCropColor(blendCrop.cropId, blendCrop.isBlend) }}
                        />
                      )}
                      <span className="flex-1 text-sm">
                        {blendCrop.isBlend && '🔀 '}
                        {getCropName(blendCrop.cropId, blendCrop.isBlend)}
                      </span>
                      <span className="text-sm font-medium">{blendCrop.percentage}%</span>
                    </div>
                  ))}
                </div>

                {/* Visual percentage bar */}
                <div className="mt-4 h-2 rounded-full overflow-hidden flex">
                  {blendCrops.map((blendCrop, index) => (
                    <div 
                      key={index}
                      className="h-full"
                      style={{ 
                        width: `${blendCrop.percentage}%`,
                        backgroundColor: getCropColor(blendCrop.cropId, blendCrop.isBlend),
                      }}
                    />
                  ))}
                </div>

                {(blend as any).notes && (
                  <p className="mt-4 text-sm text-muted-foreground border-t border-border pt-3">
                    {(blend as any).notes}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť mix?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Mix bude permanentne odstránený.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Odstrániť
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default BlendsPage;