import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { History, Monitor, Smartphone, Tablet, MapPin, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

interface LoginRecord {
  id: string;
  login_at: string;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  is_new_device: boolean;
}

export const LoginHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .eq('user_id', user.id)
      .order('login_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setHistory(data as LoginRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">História prihlásení</h2>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">História prihlásení</h2>
            <p className="text-sm text-muted-foreground">Posledných 20 prihlásení</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchHistory}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Zatiaľ žiadne zaznamenané prihlásenia
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((record, index) => (
            <div
              key={record.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                index === 0 ? 'border-primary/30 bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {getDeviceIcon(record.device_type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {record.browser || 'Neznámy prehliadač'} na {record.os || 'neznámom systéme'}
                    </span>
                    {record.is_new_device && (
                      <Badge variant="secondary" className="text-xs">
                        Nové zariadenie
                      </Badge>
                    )}
                    {index === 0 && (
                      <Badge className="text-xs bg-success">
                        Aktuálne
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {(record.city || record.country) && (
                      <>
                        <MapPin className="h-3 w-3" />
                        <span>
                          {[record.city, record.country].filter(Boolean).join(', ')}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    {record.ip_address && (
                      <>
                        <span>{record.ip_address}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>
                      {format(new Date(record.login_at), 'd. MMM yyyy, HH:mm', { locale: sk })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
