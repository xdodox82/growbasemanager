import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, addDays } from 'date-fns';
import { sk } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader as Loader2 } from 'lucide-react';

interface BulkDateChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface AffectedOrder {
  id: string;
  customer_name: string;
  delivery_date: string;
  status: string;
}

const getOrderCountText = (count: number): string => {
  if (count === 1) return '1 objednávka';
  if (count >= 2 && count <= 4) return `${count} objednávky`;
  return `${count} objednávok`;
};

const getWillBeMovedText = (count: number): string => {
  if (count === 1) return 'Bude presunutá 1 objednávka';
  if (count >= 2 && count <= 4) return `Budú presunuté ${count} objednávky`;
  return `Bude presunutých ${count} objednávok`;
};

const getMoveButtonText = (count: number): string => {
  if (count === 1) return 'Presunúť 1 objednávku';
  if (count >= 2 && count <= 4) return `Presunúť ${count} objednávky`;
  return `Presunúť ${count} objednávok`;
};

export function BulkDateChangeDialog({ open, onOpenChange, onSuccess }: BulkDateChangeDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [originalDate, setOriginalDate] = useState('');
  const [newDate, setNewDate] = useState('');
  const [affectedOrders, setAffectedOrders] = useState<AffectedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const resetDialog = () => {
    setStep(1);
    setOriginalDate('');
    setNewDate('');
    setAffectedOrders([]);
    setLoading(false);
    setProcessing(false);
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const handleOriginalDateChange = async (date: string) => {
    setOriginalDate(date);
    if (!date) {
      setAffectedOrders([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, delivery_date, status')
        .eq('delivery_date', date)
        .in('status', ['cakajuca', 'pestovanie']);

      if (error) throw error;

      setAffectedOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať objednávky',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!originalDate || !newDate || affectedOrders.length === 0) return;

    setProcessing(true);
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ delivery_date: newDate })
        .eq('delivery_date', originalDate)
        .in('status', ['cakajuca', 'pestovanie']);

      if (updateError) throw updateError;

      const customersWithEmail: Array<{ name: string; email: string }> = [];

      for (const order of affectedOrders) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('name, email, app_user_id')
          .eq('id', order.id)
          .single();

        if (customerData?.app_user_id && customerData?.email) {
          customersWithEmail.push({
            name: customerData.name,
            email: customerData.email,
          });
        }
      }

      let emailsSent = 0;
      for (const customer of customersWithEmail) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'date_changed',
              customerName: customer.name,
              customerEmail: customer.email,
              oldDate: format(parseISO(originalDate), 'dd.MM.yyyy', { locale: sk }),
              newDate: format(parseISO(newDate), 'dd.MM.yyyy', { locale: sk }),
            },
          });
          emailsSent++;
        } catch (emailError) {
          console.error('Email send error:', emailError);
        }
      }

      toast({
        title: 'Úspech',
        description: `${affectedOrders.length} objednávok presunutých${emailsSent > 0 ? `. ${emailsSent} zákazníkov notifikovaných.` : '.'} ✓`,
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error updating orders:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa presunúť objednávky',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Hromadná zmena termínu
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="original-date">Krok 1: Vyberte pôvodný dátum doručenia</Label>
                <Input
                  id="original-date"
                  type="date"
                  value={originalDate}
                  onChange={(e) => handleOriginalDateChange(e.target.value)}
                  disabled={loading}
                />
              </div>

              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )}

              {!loading && originalDate && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Nájdených {getOrderCountText(affectedOrders.length)} na tento dátum
                  </p>
                  {affectedOrders.length === 0 && (
                    <p className="text-sm text-blue-700 mt-1">
                      Žiadne čakajúce alebo pestované objednávky
                    </p>
                  )}
                </div>
              )}

              {!loading && affectedOrders.length > 0 && (
                <Button
                  onClick={() => setStep(2)}
                  className="w-full"
                >
                  Pokračovať
                </Button>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-date">Krok 2: Vyberte nový dátum doručenia</Label>
                <Input
                  id="new-date"
                  type="date"
                  min={tomorrow}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>

              {newDate && (
                <Button
                  onClick={() => setStep(3)}
                  className="w-full"
                >
                  Pokračovať
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="w-full"
              >
                Späť
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-3">
                <Label>Krok 3: Náhľad ovplyvnených objednávok</Label>
                <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-3">
                  {affectedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <p className="font-medium text-gray-900">{order.customer_name}</p>
                      <p className="text-sm text-gray-600">
                        {format(parseISO(order.delivery_date), 'dd.MM.yyyy', { locale: sk })} →{' '}
                        {format(parseISO(newDate), 'dd.MM.yyyy', { locale: sk })}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    {getWillBeMovedText(affectedOrders.length)}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    z {format(parseISO(originalDate), 'dd.MM.yyyy', { locale: sk })} na{' '}
                    {format(parseISO(newDate), 'dd.MM.yyyy', { locale: sk })}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="w-full"
                disabled={processing}
              >
                Späť
              </Button>
            </>
          )}
        </div>

        {step === 3 && (
          <DialogFooter>
            <Button
              onClick={handleConfirm}
              disabled={processing}
              className="w-full bg-[#10b981] hover:bg-[#059669]"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Presúvam...
                </>
              ) : (
                getMoveButtonText(affectedOrders.length)
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
