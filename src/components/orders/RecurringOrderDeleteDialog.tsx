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

interface RecurringOrderDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (deleteAllFuture: boolean) => void;
  orderDate: string;
}

export function RecurringOrderDeleteDialog({
  open,
  onClose,
  onConfirm,
  orderDate,
}: RecurringOrderDeleteDialogProps) {
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
          <DialogTitle>Zmazať opakujúcu sa objednávku</DialogTitle>
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
              <RadioGroupItem value="single" id="delete-single" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="delete-single" className="font-medium cursor-pointer">
                  Zmazať len túto objednávku
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Zmaže sa len objednávka z {formattedDate}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <RadioGroupItem value="all" id="delete-all" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="delete-all" className="font-medium cursor-pointer">
                  Zmazať túto + všetky budúce objednávky
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Zmaže sa objednávka z {formattedDate} a všetky nasledujúce
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
          <Button variant="destructive" onClick={handleConfirm}>
            Zmazať
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
