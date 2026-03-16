import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Trash2, Loader as Loader2, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { sk } from 'date-fns/locale';

interface DeliveryException {
  id: string;
  date: string;
  type: string;
  note?: string;
  created_at: string;
}

export function DeliveryExceptionsSettings() {
  const { toast } = useToast();
  const [exceptions, setExceptions] = useState<DeliveryException[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState<'skip' | 'shift_earlier' | 'shift_later'>('skip');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchExceptions();
  }, []);

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_exceptions')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setExceptions(data || []);
    } catch (error) {
      console.error('Error fetching delivery exceptions:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať výnimky',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddException = async () => {
    if (!newDate) {
      toast({
        title: 'Chyba',
        description: 'Vyberte dátum',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('delivery_exceptions')
        .insert({
          date: newDate,
          type: newType,
          note: newNote || null,
        });

      if (error) throw error;

      toast({
        title: 'Úspech',
        description: 'Výnimka pridaná',
      });

      setNewDate('');
      setNewType('skip');
      setNewNote('');
      fetchExceptions();
    } catch (error: any) {
      console.error('Error adding exception:', error);
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa pridať výnimku',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteException = async (id: string) => {
    try {
      const { error } = await supabase
        .from('delivery_exceptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Úspech',
        description: 'Výnimka odstránená',
      });

      fetchExceptions();
    } catch (error) {
      console.error('Error deleting exception:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa odstrániť výnimku',
        variant: 'destructive',
      });
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'skip':
        return <Badge className="bg-red-500 hover:bg-red-600">Zrušené doručenie</Badge>;
      case 'shift_earlier':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Posun o 1 deň skôr</Badge>;
      case 'shift_later':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Posun o 1 deň neskôr</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Kalendár výnimiek / Štátne sviatky</h2>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Tu môžete nastaviť výnimočné dni kedy sa mení bežný harmonogram doručenia.
        Napríklad štátne sviatky, prázdniny alebo iné dni kedy sa doručuje skôr alebo
        neskôr ako zvyčajne. Zákazníci nebudú môcť v tieto dni zadávať objednávky v aplikácii.
      </p>

      <div className="space-y-6">
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-medium mb-4">Pridať novú výnimku</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exception-date">Dátum</Label>
              <Input
                id="exception-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exception-type">Typ</Label>
              <Select value={newType} onValueChange={(value: any) => setNewType(value)}>
                <SelectTrigger id="exception-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Zrušené doručenie</SelectItem>
                  <SelectItem value="shift_earlier">Posun o 1 deň skôr</SelectItem>
                  <SelectItem value="shift_later">Posun o 1 deň neskôr</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exception-note">Poznámka (voliteľné)</Label>
              <Input
                id="exception-note"
                type="text"
                placeholder="napr. Veľká noc"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleAddException}
                disabled={saving || !newDate}
                className="w-full bg-[#10b981] hover:bg-[#059669]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Ukladám...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Pridať
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-3">Existujúce výnimky</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : exceptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Žiadne výnimky</p>
            </div>
          ) : (
            <div className="space-y-2">
              {exceptions.map((exception) => (
                <div
                  key={exception.id}
                  className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="font-medium text-gray-900 min-w-[120px]">
                      {format(parseISO(exception.date), 'dd.MM.yyyy (EEEE)', { locale: sk })}
                    </div>
                    <div>{getTypeBadge(exception.type)}</div>
                    {exception.note && (
                      <div className="text-sm text-gray-600">{exception.note}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteException(exception.id)}
                    className="hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
