import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useVATSettings } from '@/hooks/useVATSettings';

interface VATInputProps {
  priceIncludesVAT: boolean;
  onPriceIncludesVATChange: (value: boolean) => void;
  vatRate: string;
  onVATRateChange: (value: string) => void;
}

export function VATInput({
  priceIncludesVAT,
  onPriceIncludesVATChange,
  vatRate,
  onVATRateChange
}: VATInputProps) {
  const { isVATPayer, defaultVATRate, loading } = useVATSettings();

  // Auto-set default VAT rate when component mounts
  useEffect(() => {
    if (!loading && isVATPayer && !vatRate) {
      onVATRateChange(defaultVATRate.toString());
    }
  }, [loading, isVATPayer, defaultVATRate, vatRate, onVATRateChange]);

  // Don't show VAT fields if user is not a VAT payer
  if (!loading && !isVATPayer) {
    return null;
  }

  // Show loading state
  if (loading) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="price-includes-vat"
          checked={priceIncludesVAT}
          onCheckedChange={(checked) => onPriceIncludesVATChange(checked === true)}
        />
        <Label htmlFor="price-includes-vat" className="text-sm font-medium cursor-pointer">
          Cena je s DPH
        </Label>
      </div>
      {priceIncludesVAT && (
        <p className="text-xs text-gray-500">
          Ak je zaškrtnuté, cena obsahuje DPH
        </p>
      )}

      {priceIncludesVAT && (
        <div>
          <Label className="text-sm">Sadzba DPH (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={vatRate}
            onChange={(e) => onVATRateChange(e.target.value)}
            className="mt-1"
            placeholder={defaultVATRate.toString()}
          />
          <p className="text-xs text-gray-500 mt-1">
            Výška DPH v percentách
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to calculate VAT breakdown
export function calculateVAT(totalPrice: number, vatRate: number, priceIncludesVAT: boolean) {
  const total = parseFloat(totalPrice.toString()) || 0;
  const rate = parseFloat(vatRate.toString()) || 0;

  if (!priceIncludesVAT || rate === 0) {
    return {
      netPrice: total,
      vatAmount: 0,
      totalPrice: total
    };
  }

  // If price includes VAT, calculate backwards
  const netPrice = total / (1 + rate / 100);
  const vatAmount = total - netPrice;

  return {
    netPrice: Math.round(netPrice * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalPrice: total
  };
}
