import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Bell, AlertTriangle, Calendar, Package, X, Sprout, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ===================== TYPES =====================

type NotifType = 'new_pwa_order' | 'pending_order' | 'low_seed' | 'low_packaging' | 'harvest_due';
type NotifPriority = 'high' | 'medium' | 'low';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  priority: NotifPriority;
  timestamp: string;
  link?: string;
}

interface OrderRow {
  id: string;
  order_number: number | null;
  customer_id: string | null;
  status: string;
  created_at: string;
  source?: string | null;
  customers?: { name: string | null } | null;
}

interface SeedRow {
  id: string;
  crop_id: string | null;
  quantity: number | null;
  min_stock: number | null;
  unit: string | null;
  archived: boolean | null;
  products?: { name: string | null } | null;
}

interface PackagingRow {
  id: string;
  name: string | null;
  size: string | null;
  type: string | null;
  quantity: number | null;
  min_stock: number | null;
}

interface PlanRow {
  id: string;
  crop_id: string | null;
  expected_harvest_date: string;
  status: string;
  products?: { name: string | null } | null;
}

// ===================== CONSTANTS =====================

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const NEW_ORDER_WINDOW_HOURS = 24;
const PENDING_STATUSES = ['pending', 'pending_approval', 'cakajuca'];
const PENDING_THRESHOLD_DAYS = 1;
const HARVEST_WINDOW_DAYS = 2;

// ===================== HELPERS =====================

const dayWord = (count: number): string => {
  if (count === 1) return 'deň';
  if (count >= 2 && count <= 4) return 'dni';
  return 'dní';
};

const formatOrderNumber = (n: number | null): string => {
  if (n == null) return '???';
  return `MR-${String(n).padStart(3, '0')}`;
};

const formatHarvestDate = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'dnes';
  if (diffDays === 1) return 'zajtra';
  if (diffDays === 2) return 'pozajtra';
  return `${target.getDate()}.${target.getMonth() + 1}.`;
};

// ===================== COMPONENT =====================

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('dismissed-notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const navigate = useNavigate();
  const fetchRef = useRef<() => Promise<void>>();

  // ===================== FETCH =====================

  const fetchNotifications = useCallback(async () => {
    const notifs: Notification[] = [];
    const now = new Date();
    const newOrderCutoff = new Date(now.getTime() - NEW_ORDER_WINDOW_HOURS * 60 * 60 * 1000);
    const pendingCutoff = new Date(now.getTime() - PENDING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    const harvestUpperBound = new Date(now.getTime() + HARVEST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    harvestUpperBound.setHours(23, 59, 59, 999);

    try {
      const [ordersRes, seedsRes, packagingsRes, plansRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            id, order_number, customer_id, status, created_at, source,
            customers:customer_id ( name )
          `)
          .in('status', PENDING_STATUSES)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('seeds')
          .select(`
            id, crop_id, quantity, min_stock, unit, archived,
            products:crop_id ( name )
          `)
          .eq('archived', false)
          .not('min_stock', 'is', null),
        supabase
          .from('packagings')
          .select('id, name, size, type, quantity, min_stock')
          .not('min_stock', 'is', null),
        supabase
          .from('planting_plans')
          .select(`
            id, crop_id, expected_harvest_date, status,
            products:crop_id ( name )
          `)
          .eq('status', 'in_progress')
          .lte('expected_harvest_date', harvestUpperBound.toISOString().split('T')[0])
          .order('expected_harvest_date', { ascending: true }),
      ]);

      // ===== 1 & 2: Objednávky =====
      if (!ordersRes.error && ordersRes.data) {
        const orders = ordersRes.data as unknown as OrderRow[];
        orders.forEach(o => {
          if (!o.created_at) return;
          const created = new Date(o.created_at);
          const customerName = o.customers?.name || 'Neznámy zákazník';
          const orderNum = formatOrderNumber(o.order_number);

          // Nová objednávka z PWA — vytvorená za posledných 24h + source='app'
          if (created >= newOrderCutoff && o.source === 'app') {
            notifs.push({
              id: `new-pwa-${o.id}`,
              type: 'new_pwa_order',
              title: 'Nová objednávka z PWA',
              message: `${orderNum} — ${customerName}`,
              priority: 'high',
              timestamp: o.created_at,
              link: '/orders',
            });
            return;
          }

          // Nevybavená — staršia ako 1 deň
          if (created < pendingCutoff) {
            const daysSince = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            notifs.push({
              id: `pending-${o.id}`,
              type: 'pending_order',
              title: 'Nevybavená objednávka',
              message: `${orderNum} čaká ${daysSince} ${dayWord(daysSince)} na potvrdenie`,
              priority: daysSince >= 3 ? 'high' : 'medium',
              timestamp: o.created_at,
              link: '/orders',
            });
          }
        });
      } else if (ordersRes.error) {
        console.warn('[NotificationCenter] orders fetch:', ordersRes.error.message);
      }

      // ===== 3: Nízke zásoby osiva =====
      if (!seedsRes.error && seedsRes.data) {
        const seeds = seedsRes.data as unknown as SeedRow[];
        seeds.forEach(s => {
          if (s.quantity == null || s.min_stock == null) return;
          if (s.quantity >= s.min_stock) return;
          const cropName = s.products?.name || 'Neznáma plodina';
          const unit = s.unit || '';
          const isZero = s.quantity <= 0;
          notifs.push({
            id: `low-seed-${s.id}`,
            type: 'low_seed',
            title: 'Nízka zásoba osiva',
            message: `${cropName}: zostáva ${s.quantity}${unit}`,
            priority: isZero ? 'high' : 'medium',
            timestamp: now.toISOString(),
            link: '/inventory?tab=seeds',
          });
        });
      } else if (seedsRes.error) {
        console.warn('[NotificationCenter] seeds fetch:', seedsRes.error.message);
      }

      // ===== 4: Nízke zásoby obalov =====
      if (!packagingsRes.error && packagingsRes.data) {
        const packagings = packagingsRes.data as unknown as PackagingRow[];
        packagings.forEach(p => {
          if (p.quantity == null || p.min_stock == null) return;
          if (p.quantity >= p.min_stock) return;
          const label = [p.name, p.size].filter(Boolean).join(' ') || p.type || 'Obal';
          const isZero = p.quantity <= 0;
          notifs.push({
            id: `low-pkg-${p.id}`,
            type: 'low_packaging',
            title: 'Nízka zásoba obalov',
            message: `${label}: zostáva ${p.quantity} ks`,
            priority: isZero ? 'high' : 'medium',
            timestamp: now.toISOString(),
            link: '/inventory?tab=packaging',
          });
        });
      } else if (packagingsRes.error) {
        console.warn('[NotificationCenter] packagings fetch:', packagingsRes.error.message);
      }

      // ===== 5: Blížiaci sa zber =====
      if (!plansRes.error && plansRes.data) {
        const plans = plansRes.data as unknown as PlanRow[];
        plans.forEach(p => {
          if (!p.expected_harvest_date) return;
          const cropName = p.products?.name || 'Neznáma plodina';
          notifs.push({
            id: `harvest-${p.id}`,
            type: 'harvest_due',
            title: 'Blížiaci sa zber',
            message: `${cropName} — ${formatHarvestDate(p.expected_harvest_date)}`,
            priority: 'high',
            timestamp: p.expected_harvest_date,
            link: '/harvest-packing',
          });
        });
      } else if (plansRes.error) {
        console.warn('[NotificationCenter] planting_plans fetch:', plansRes.error.message);
      }

      setNotifications(notifs);
    } catch (err) {
      console.error('[NotificationCenter] fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchRef.current = fetchNotifications;
  }, [fetchNotifications]);

  // ===================== EFFECTS =====================

  // Initial fetch + 5min refresh
  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  // Realtime subscription pre INSERT do orders (okamžité notifikácie PWA objednávok)
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel('notifications-orders')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          () => {
            fetchRef.current?.();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[NotificationCenter] realtime subscription failed:', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // ===================== DERIVED =====================

  const visibleNotifications = useMemo(() => {
    const priorityOrder: Record<NotifPriority, number> = { high: 0, medium: 1, low: 2 };
    return notifications
      .filter(n => !dismissedIds.includes(n.id))
      .sort((a, b) => {
        const p = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (p !== 0) return p;
        return b.timestamp.localeCompare(a.timestamp);
      });
  }, [notifications, dismissedIds]);

  const highPriorityCount = visibleNotifications.filter(n => n.priority === 'high').length;

  // ===================== ACTIONS =====================

  const dismissNotification = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    try {
      localStorage.setItem('dismissed-notifications', JSON.stringify(newDismissed));
    } catch {
      // ignore
    }
  };

  const clearAllDismissed = () => {
    setDismissedIds([]);
    try {
      localStorage.removeItem('dismissed-notifications');
    } catch {
      // ignore
    }
  };

  // ===================== STYLING =====================

  const getIcon = (type: NotifType) => {
    switch (type) {
      case 'new_pwa_order':
        return <ShoppingCart className="h-4 w-4" />;
      case 'pending_order':
        return <AlertTriangle className="h-4 w-4" />;
      case 'low_seed':
        return <Sprout className="h-4 w-4" />;
      case 'low_packaging':
        return <Package className="h-4 w-4" />;
      case 'harvest_due':
        return <Calendar className="h-4 w-4" />;
    }
  };

  // GrowBase dizajn — bez shadcn destructive/warning tokenov
  const getPriorityClasses = (priority: NotifPriority): string => {
    switch (priority) {
      case 'high':
        return 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]';
      case 'medium':
        return 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]';
      case 'low':
        return 'bg-[#f1f5f9] text-[#475569] border-[#e2e8f0]';
    }
  };

  // ===================== RENDER =====================

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc]"
          aria-label="Upozornenia"
        >
          <Bell className="h-5 w-5" />
          {visibleNotifications.length > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white',
                highPriorityCount > 0
                  ? 'bg-[#dc2626] text-white animate-pulse'
                  : 'bg-[#16a34a] text-white'
              )}
            >
              {visibleNotifications.length > 9 ? '9+' : visibleNotifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 md:w-96 p-0 border border-[#cbd5e1] shadow-lg"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <h3 className="text-sm font-bold text-[#0f172a]">Upozornenia</h3>
          <Badge variant="secondary" className="bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]">
            {visibleNotifications.length}
          </Badge>
        </div>

        {visibleNotifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-[#cbd5e1]" />
            <p className="text-sm text-[#475569]">Žiadne nové upozornenia</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            <div className="divide-y divide-[#e2e8f0]">
              {visibleNotifications.map((notification) => {
                const handleNavigate = () => {
                  if (notification.link) {
                    setIsOpen(false);
                    navigate(notification.link);
                  }
                };
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-stretch transition-colors group',
                      notification.priority === 'high' && 'bg-[#fef2f2]/40',
                      'hover:bg-[#f8fafc]'
                    )}
                  >
                    {/* Klikateľná zóna — content (icon + texty) */}
                    <button
                      type="button"
                      onClick={handleNavigate}
                      disabled={!notification.link}
                      className={cn(
                        'flex-1 min-w-0 px-4 py-3 flex items-start gap-3 text-left',
                        notification.link ? 'cursor-pointer' : 'cursor-default'
                      )}
                    >
                      <div
                        className={cn(
                          'p-2 rounded-lg border flex-shrink-0',
                          getPriorityClasses(notification.priority)
                        )}
                      >
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#0f172a]">{notification.title}</p>
                        <p className="text-xs text-[#475569] mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </button>

                    {/* Dismiss zóna — samostatne, mimo navigate kliku */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                      className="w-10 flex-shrink-0 flex items-center justify-center text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
                      aria-label="Skryť upozornenie"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {dismissedIds.length > 0 && (
          <div className="px-2 py-2 border-t border-[#e2e8f0] bg-[#f8fafc]">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-[#475569] hover:text-[#0f172a] hover:bg-white"
              onClick={clearAllDismissed}
            >
              Zobraziť skryté upozornenia ({dismissedIds.length})
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
