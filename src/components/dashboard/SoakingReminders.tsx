import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Droplets, AlertTriangle, CheckCircle, Calendar, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';

interface SoakingReminder {
  plan_id: string;
  sow_date: string;
  tray_count: number;
  seed_amount_grams: number;
  crop_name: string;
  crop_id: string;
  soaking_duration_hours: number;
  reminder_date: string;
  days_until_sow: number;
}

export default function SoakingReminders() {
  const [reminders, setReminders] = useState<SoakingReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReminders();

    const channel = supabase
      .channel('soaking-reminders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'soaking_completions'
        },
        () => {
          fetchReminders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planting_plans'
        },
        () => {
          fetchReminders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchReminders() {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_pending_soaking_reminders');

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaysReminders = (data || []).filter((reminder: SoakingReminder) => {
        const reminderDate = parseISO(reminder.reminder_date);
        return reminderDate.getTime() === today.getTime();
      });

      setReminders(todaysReminders);
    } catch (error) {
      console.error('Error fetching soaking reminders:', error);
      toast.error('Chyba pri načítaní upozornení na namáčanie');
    } finally {
      setLoading(false);
    }
  }

  async function markAsCompleted(planId: string, cropName: string) {
    try {
      setCompletingId(planId);

      const { error } = await supabase
        .from('soaking_completions')
        .insert({
          planting_plan_id: planId,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(`${cropName} - namáčanie označené ako dokončené`, {
        icon: <CheckCircle className="h-4 w-4 text-green-600" />
      });

      await fetchReminders();
    } catch (error) {
      console.error('Error marking soaking as complete:', error);
      toast.error('Chyba pri označovaní namáčania');
    } finally {
      setCompletingId(null);
    }
  }

  function getReminderUrgency(daysUntilSow: number) {
    if (daysUntilSow === 0) return 'today';
    if (daysUntilSow === 1) return 'tomorrow';
    return 'upcoming';
  }

  function getReminderTitle(daysUntilSow: number) {
    if (daysUntilSow === 0) return 'Sadí sa DNES';
    if (daysUntilSow === 1) return 'Sadí sa ZAJTRA';
    return `Sadí sa o ${daysUntilSow} dni`;
  }

  function formatDate(dateString: string) {
    try {
      return format(parseISO(dateString), 'dd.MM.yyyy');
    } catch {
      return dateString;
    }
  }

  function formatDuration(hours: number) {
    if (hours >= 1) {
      return `${hours} ${hours === 1 ? 'hodina' : hours < 5 ? 'hodiny' : 'hodín'}`;
    } else {
      const minutes = Math.round(hours * 60);
      return `${minutes} minút`;
    }
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Droplets className="h-5 w-5" />
            Namáčanie semien
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reminders.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle className="h-5 w-5" />
            Namáčanie semien
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm text-green-700">
            <Info className="h-4 w-4 flex-shrink-0" />
            <p>Dnes nie sú potrebné žiadne namáčania semien</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 shadow-lg">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <Droplets className="h-5 w-5 animate-pulse" />
          💧 NAMOČIŤ SEMENÁ
          <Badge variant="destructive" className="ml-auto">
            {reminders.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {reminders.map((reminder) => {
          const urgency = getReminderUrgency(reminder.days_until_sow);
          const isCompleting = completingId === reminder.plan_id;

          return (
            <div
              key={reminder.plan_id}
              className={`p-4 rounded-lg border-2 ${
                urgency === 'today'
                  ? 'bg-red-50 border-red-300'
                  : urgency === 'tomorrow'
                  ? 'bg-orange-50 border-orange-300'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-5 w-5 flex-shrink-0 ${
                      urgency === 'today'
                        ? 'text-red-600 animate-pulse'
                        : urgency === 'tomorrow'
                        ? 'text-orange-600'
                        : 'text-amber-600'
                    }`}
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {reminder.crop_name}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        {getReminderTitle(reminder.days_until_sow)}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>{formatDate(reminder.sow_date)}</span>
                    </div>
                  </div>
                </div>

                <Badge
                  variant={urgency === 'today' ? 'destructive' : 'default'}
                  className={
                    urgency === 'tomorrow'
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : urgency === 'upcoming'
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : ''
                  }
                >
                  {urgency === 'today' ? 'DNES' : urgency === 'tomorrow' ? 'ZAJTRA' : 'ONEDLHO'}
                </Badge>
              </div>

              <div className="space-y-2 mb-3 pl-7">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{reminder.tray_count}</span>{' '}
                  {reminder.tray_count === 1
                    ? 'tácka'
                    : reminder.tray_count < 5
                    ? 'tácky'
                    : 'tácok'}
                  {' • '}
                  <span className="font-medium">{reminder.seed_amount_grams}g</span> semien
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Droplets className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Namáčať {formatDuration(reminder.soaking_duration_hours)}
                  </span>
                </div>

                {reminder.soaking_duration_hours >= 8 && (
                  <div className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                    💡 Tip: Namočte večer, aby boli semená pripravené na ráno
                  </div>
                )}
              </div>

              <div className="pl-7">
                <Button
                  onClick={() => markAsCompleted(reminder.plan_id, reminder.crop_name)}
                  disabled={isCompleting}
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {isCompleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Označujem...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      ✓ Namočené
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
