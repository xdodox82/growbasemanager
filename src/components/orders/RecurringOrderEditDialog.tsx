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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

interface RecurringOrderEditDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (updateAllFuture: boolean) => void;
  orderDate: string;
}

export function RecurringOrderEditDialog({
  open,
  onClose,
  onConfirm,
  orderDate,
}: RecurringOrderEditDialogProps) {
  const [selectedOption, setSelectedOption] = useState<'single' | 'all'>('single');

  const formattedDate = orderDate
    ? format(new Date(orderDate), 'd.M.yyyy', { locale: sk })
    : '';

  const handleConfirm = () => {
    onConfirm(selectedOption === 'all');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upraviť opakujúcu sa objednávku</DialogTitle>
          <DialogDescription>
            Táto objednávka je súčasťou opakujúcej sa série.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedOption}
            onValueChange={(value) => setSelectedOption(value as 'single' | 'all')}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="single" id="single" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="single" className="font-medium cursor-pointer">
                  Upraviť len túto objednávku
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Zmeny sa prejavia len pre objednávku z {formattedDate}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <RadioGroupItem value="all" id="all" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="all" className="font-medium cursor-pointer">
                  Upraviť túto + všetky budúce objednávky
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Zmeny sa prejavia pre objednávku z {formattedDate} a všetky nasledujúce
                  objednávky v tejto sérii
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Zrušiť
          </Button>
          <Button onClick={handleConfirm}>Potvrdiť</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
