import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, addWeeks } from 'date-fns';
import { sk } from 'date-fns/locale';

interface RecurringOrderExtendDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (additionalWeeks: number) => void;
  currentEndDate?: string;
}

export function RecurringOrderExtendDialog({
  open,
  onClose,
  onConfirm,
  currentEndDate,
}: RecurringOrderExtendDialogProps) {
  const [additionalWeeks, setAdditionalWeeks] = useState<number>(1);

  const handleConfirm = () => {
    if (additionalWeeks > 0) {
      onConfirm(additionalWeeks);
      onClose();
      setAdditionalWeeks(1);
    }
  };

  const newEndDate = currentEndDate
    ? addWeeks(new Date(currentEndDate), additionalWeeks)
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Predĺžiť opakujúcu sa objednávku</DialogTitle>
          <DialogDescription>
            Zadajte počet týždňov, o ktoré chcete predĺžiť túto objednávku.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {currentEndDate && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Aktuálny koniec:</div>
              <div className="font-semibold text-gray-900">
                {format(new Date(currentEndDate), 'd.M.yyyy', { locale: sk })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="additional-weeks">Počet týždňov na predĺženie</Label>
            <Input
              id="additional-weeks"
              type="number"
              min="1"
              max="52"
              value={additionalWeeks}
              onChange={(e) => setAdditionalWeeks(parseInt(e.target.value) || 1)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Zadajte číslo od 1 do 52
            </p>
          </div>

          {newEndDate && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600">Nový koniec:</div>
              <div className="font-semibold text-blue-900">
                {format(newEndDate, 'd.M.yyyy', { locale: sk })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Zrušiť
          </Button>
          <Button onClick={handleConfirm} disabled={additionalWeeks < 1}>
            Predĺžiť
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
