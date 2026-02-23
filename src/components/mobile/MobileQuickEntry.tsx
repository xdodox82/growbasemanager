import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store/appStore';
import { useToast } from '@/hooks/use-toast';
import { Sprout, Minus, Plus, CheckCircle2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { sk } from 'date-fns/locale';

interface MobileQuickEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'planting' | 'harvest';
}

export function MobileQuickEntry({ open, onOpenChange, type }: MobileQuickEntryProps) {
  const { crops, addPlantingPlan } = useAppStore();
  const { toast } = useToast();
  
  const [cropId, setCropId] = useState('');
  const [trays, setTrays] = useState(1);

  const selectedCrop = crops.find(c => c.id === cropId);
  const harvestDate = selectedCrop 
    ? addDays(new Date(), selectedCrop.daysToHarvest)
    : null;

  const handleSubmit = () => {
    if (!cropId) {
      toast({
        title: 'Chyba',
        description: 'Vyberte plodinu',
        variant: 'destructive',
      });
      return;
    }

    if (!harvestDate) return;

    addPlantingPlan({
      orderId: '',
      cropId,
      trays,
      sowDate: new Date(),
      harvestDate,
      status: 'sown',
      notes: 'Rýchly záznam z mobilu',
    });

    toast({
      title: 'Výsev zaznamenaný',
      description: `${selectedCrop?.name} - ${trays} tácov`,
    });

    // Reset form
    setCropId('');
    setTrays(1);
    onOpenChange(false);
  };

  const adjustTrays = (delta: number) => {
    setTrays(prev => Math.max(1, prev + delta));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-success" />
            Rýchly záznam výsevu
          </DrawerTitle>
          <DrawerDescription>
            Jednoduchý formulár pre rýchle zadanie z farmy
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-6">
          {/* Crop selection with large touch targets */}
          <div className="space-y-3">
            <Label className="text-base">Plodina</Label>
            <div className="grid grid-cols-2 gap-2">
              {crops.slice(0, 6).map(crop => (
                <Button
                  key={crop.id}
                  variant={cropId === crop.id ? 'default' : 'outline'}
                  className={`h-16 flex-col gap-1 ${
                    cropId === crop.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setCropId(crop.id)}
                >
                  <div 
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: crop.color }}
                  />
                  <span className="text-sm font-medium truncate w-full">
                    {crop.name}
                  </span>
                </Button>
              ))}
            </div>
            
            {crops.length > 6 && (
              <Select value={cropId} onValueChange={setCropId}>
                <SelectTrigger className="h-14 text-base">
                  <SelectValue placeholder="Ďalšie plodiny..." />
                </SelectTrigger>
                <SelectContent>
                  {crops.slice(6).map(crop => (
                    <SelectItem key={crop.id} value={crop.id} className="h-12">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: crop.color }}
                        />
                        {crop.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tray count with large +/- buttons */}
          <div className="space-y-3">
            <Label className="text-base">Počet tácov</Label>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                className="h-16 w-16 rounded-full text-xl"
                onClick={() => adjustTrays(-1)}
                disabled={trays <= 1}
              >
                <Minus className="h-6 w-6" />
              </Button>
              
              <div className="text-center">
                <Input
                  type="number"
                  value={trays}
                  onChange={e => setTrays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-16 w-24 text-center text-3xl font-bold"
                  min={1}
                />
                <span className="text-sm text-muted-foreground mt-1">tácov</span>
              </div>
              
              <Button
                variant="outline"
                size="lg"
                className="h-16 w-16 rounded-full text-xl"
                onClick={() => adjustTrays(1)}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Preview info */}
          {selectedCrop && harvestDate && (
            <Card className="p-4 bg-success/10 border-success/30">
              <div className="flex items-center gap-2 text-success mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Prehľad</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plodina:</span>
                  <span className="font-medium">{selectedCrop.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Počet tácov:</span>
                  <span className="font-medium">{trays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dátum zberu:</span>
                  <span className="font-medium">
                    {format(harvestDate, 'd. MMMM', { locale: sk })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Semená:</span>
                  <span className="font-medium">
                    {selectedCrop.seedDensity * trays}g
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        <DrawerFooter className="pt-4">
          <Button 
            onClick={handleSubmit} 
            size="lg" 
            className="h-14 text-lg gap-2"
            disabled={!cropId}
          >
            <CheckCircle2 className="h-5 w-5" />
            Zaznamenať výsev
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" size="lg" className="h-12">
              Zrušiť
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
