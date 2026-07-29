import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Truck, Store, RefreshCw, Check, X, Clock, Smartphone, Pencil, Plus, Pause, CalendarClock, Loader as Loader2 } from 'lucide-react';
import {
  sortOrderItemsByValue, formatOrderNotes, getDeliveryFormLabel,
  formatDeliveryDate, STATUS_STEPS, getStatusLabel,
} from './orderUtils';
import type { Order, Customer, Route } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  activeTab: 'detail' | 'history';
  onTabChange: (tab: 'detail' | 'history') => void;
  isMobile: boolean;
  customers: Customer[];
  routes: Route[];
  getDeliveryFee: (order: Order) => number;
  getOrderTotal: (order: Order) => number;
  onQuickStatusChange: (orderId: string, newStatus: string) => Promise<void>;
  onEdit: (order: Order) => void;
  onExtend: (order: Order) => void;
}

export function OrderDetailDialog({
  open, onOpenChange, order, activeTab, onTabChange,
  isMobile, customers, routes,
  getDeliveryFee, getOrderTotal,
  onQuickStatusChange, onEdit, onExtend,
}: Props) {
  const { toast } = useToast();

  // ── Predobjednavka bez potvrdeneho terminu ────────────────────────────
  // delivery_date je pri nej len zastupna hodnota (create_order zapisuje
  // current_date + 30). Skutocny termin urcuje pestovatel — az vtedy sa
  // delivery_date_confirmed prepne na true.
  const needsDate = order ? (order as any).delivery_date_confirmed === false : false;
  const [dateOptions, setDateOptions] = useState<string[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !order || !needsDate) { setDateOptions(null); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('preorder_available_dates', { p_order_id: order.id });
      if (cancelled) return;
      if (error) {
        console.error('preorder_available_dates:', error);
        setDateOptions([]);
        return;
      }
      setDateOptions((data || []).map((r: any) => (typeof r === 'string' ? r : r.delivery_date)));
    })();
    return () => { cancelled = true; };
  }, [open, order?.id, needsDate]);

  const confirmDate = async (d: string) => {
    if (!order) return;
    setConfirming(d);
    try {
      const { error } = await supabase.rpc('confirm_preorder_date', { p_order_id: order.id, p_date: d });
      if (error) throw error;
      toast({ title: 'Termín určený', description: 'Zákazníkovi sme poslali e-mail s termínom doručenia.' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Chyba', description: e?.message || 'Termín sa nepodarilo určiť', variant: 'destructive' });
    } finally {
      setConfirming(null);
    }
  };

  if (!order) return null;

  const s = order.status;
  const isCancelled = s === 'cancelled';
  const isPaused = s === 'paused';
  const isFlash = (order as any).source === 'flash' || (order as any).order_source === 'flash';
  // Flash = prebytky (už zožaté) → preskakuje krok „Rastie"
  const steps = isFlash ? STATUS_STEPS.filter(step => !step.keys.includes('growing')) : STATUS_STEPS;
  const currentStepIdx = steps.findIndex(step => step.keys.includes(s));
  // trasa: ak nie je textové pole route, dohľadaj názov podľa delivery_route_id;
  // ak ani to nie je a v notes je príznak osobného odberu, zobraz „Osobný odber".
  const routeName = (order as any).route
    || routes.find(r => r.id === (order as any).delivery_route_id)?.name
    || (((order as any).notes || '').includes('Osobný odber') ? 'Osobný odber' : '')
    || '';

  // Tok stavov podla jednotneho slovnika (28.7.2026): sedem hodnot,
  // pending_approval → growing → packed → on_the_way → delivered.
  // Odstranene 'pending', 'confirmed', 'ready', 'packaging_ready' a stare
  // slovenske hodnoty — databaza ich uz nepovoluje (orders_status_check),
  // takze schvalenie predobjednavky na 'confirmed' by skoncilo chybou.
  const nextMap: Record<string, { key: string; label: string; color: string }> = {
    'pending_approval': { key: 'growing',    label: 'Schváliť objednávku',  color: 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white' },
    'growing':          { key: 'packed',     label: 'Označiť: Zabalená',    color: 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white' },
    'packed':           { key: 'on_the_way', label: 'Odoslať: Na ceste',    color: 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white' },
    'on_the_way':       { key: 'delivered',  label: 'Označiť ako Doručenú', color: 'bg-[#16a34a] hover:bg-[#15803d] text-white' },
  };
  if (isFlash) {
    // flash objednavka je uz zozbierana — po schvaleni ide rovno k baleniu
    nextMap['pending_approval'] = { key: 'packed', label: 'Označiť: Zabalená', color: 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white' };
    nextMap['growing']          = { key: 'packed', label: 'Označiť: Zabalená', color: 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white' };
  }
  const next = nextMap[s];
  // Kym predobjednavka nema termin, nema zmysel ju posuvat dalej v stavoch —
  // najprv treba urcit, kedy bude dorucena.
  const showQuickActions = !['cancelled', 'delivered'].includes(s) && !needsDate;

  const subtotal = (order.order_items || []).reduce((sum, item) => {
    if (!item) return sum;
    return sum + (item.quantity || 0) * parseFloat((item.price_per_unit?.toString() || '0').replace(',', '.'));
  }, 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) onTabChange('detail'); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-0">
          <DialogTitle className="text-[16px] font-700 text-[#0f172a] flex items-center gap-2">
            Detail objednávky
            {(order as any).order_number && (
              <span className="text-[13px] font-bold px-2 py-0.5 rounded-lg bg-[#f1f5f9] border border-[#cbd5e1] text-[#475569]">
                MR-{String((order as any).order_number).padStart(3, '0')}
              </span>
            )}
          </DialogTitle>
          {/* Badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {((order as any).order_source === 'app' || (order as any).source === 'app') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]">
                <Smartphone className="w-3 h-3" />Z mobilnej app
              </span>
            )}
            {(order.parent_order_id || (order.is_recurring && (order.recurring_weeks || 0) > 1) || order.notes?.includes('freq:')) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                <RefreshCw className="w-3 h-3" />Opakovaná
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-[#e2e8f0] -mt-1">
          <button
            onClick={() => onTabChange('detail')}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === 'detail'
                ? 'border-[#16a34a] text-[#16a34a]'
                : 'border-transparent text-[#64748b] hover:text-[#374151]'
            }`}
          >Detail</button>
          <button
            onClick={() => onTabChange('history')}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-[#16a34a] text-[#16a34a]'
                : 'border-transparent text-[#64748b] hover:text-[#374151]'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />História
          </button>
        </div>

        {/* ===== DETAIL TAB ===== */}
        {activeTab === 'detail' && (
          <div className="space-y-4 pt-1">

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-px bg-[#f1f5f9] border border-[#cbd5e1] rounded-xl overflow-hidden">
              <div className="bg-white px-4 py-3">
                <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">Zákazník</div>
                <div className="text-[13px] font-semibold text-[#0f172a]">{order.customer_name || '—'}</div>
              </div>
              <div className="bg-white px-4 py-3">
                <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">Dátum dodania</div>
                {/* Pri nepotvrdenej predobjednavke je delivery_date len zastupna hodnota
                    (create_order zapisuje current_date + 30). Zobrazovat ju ako termin
                    by bol slub, ktory nikto nedal. */}
                <div className="text-[13px] font-semibold text-[#0f172a]">
                  {needsDate ? <span className="text-[#ea580c]">Termín zatiaľ neurčený</span> : formatDeliveryDate(order.delivery_date)}
                </div>
              </div>
              <div className="bg-white px-4 py-3">
                <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">Trasa</div>
                <div className="text-[13px] font-semibold text-[#0f172a] flex items-center gap-1.5">
                  {routeName === 'Osobný odber'
                    ? <><Store className="h-3.5 w-3.5 text-[#16a34a]" /><span className="text-[#16a34a]">Osobný odber</span></>
                    : <><Truck className="h-3.5 w-3.5 text-[#94a3b8]" />{routeName || '—'}</>
                  }
                </div>
              </div>
              <div className="bg-white px-4 py-3">
                <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1">Spôsob platby</div>
                <div className="text-[13px] font-semibold text-[#0f172a]">
                  {(order as any).payment_method === 'invoice' ? 'Faktúra' : (order as any).payment_method === 'card' ? 'Karta' : 'Hotovosť'}
                </div>
              </div>
            </div>

            {/* Status stepper */}
            <div className="bg-[#f8fafc] border border-[#cbd5e1] rounded-xl p-4">
              {isCancelled ? (
                <div className="flex items-center gap-2 text-[#dc2626] justify-center py-1">
                  <X className="h-5 w-5" />
                  <span className="font-semibold text-[14px]">Zrušená objednávka</span>
                </div>
              ) : isPaused ? (
                <div className="flex flex-col items-center gap-1 text-[#475569] justify-center py-1">
                  <div className="flex items-center gap-2">
                    <Pause className="h-5 w-5" />
                    <span className="font-semibold text-[14px]">Pozastavená dodávka</span>
                  </div>
                  <span className="text-[11px] text-[#64748b]">Zákazník preskočil tento termín — príprava sa nespúšťa</span>
                </div>
              ) : (
                <>
                  <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Postup objednávky</div>
                  {/* Progress bar stepper — bez prekrývajúcich sa labelov */}
                  <div className="relative">
                    {/* Progress line */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 h-0.5 bg-[#e2e8f0]" />
                    <div
                      className="absolute top-3.5 left-3.5 h-0.5 bg-[#16a34a] transition-all"
                      style={{ width: currentStepIdx >= 0 ? `${(currentStepIdx / (steps.length - 1)) * 100}%` : '0%' }}
                    />
                    {/* Steps */}
                    <div className="relative flex justify-between">
                      {steps.map((step, idx) => {
                        const done = idx < currentStepIdx;
                        const active = idx === currentStepIdx;
                        return (
                          <div key={idx} className="flex flex-col items-center" style={{ width: `${100 / steps.length}%` }}>
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all z-10 ${
                              done ? 'bg-[#16a34a] border-[#16a34a]'
                              : active ? 'bg-white border-[#16a34a] shadow-sm shadow-green-200'
                              : 'bg-white border-[#cbd5e1]'
                            }`}>
                              {done ? <Check className="h-3.5 w-3.5 text-white" />
                                : active ? <div className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
                                : null}
                            </div>
                            <span className={`text-[9px] font-medium text-center mt-1.5 leading-tight max-w-[48px] ${
                              active ? 'text-[#16a34a] font-bold' : done ? 'text-[#64748b]' : 'text-[#cbd5e1]'
                            }`}>{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Predobjednavka — urcenie terminu dorucenia */}
            {needsDate && (
              <div className="p-4 rounded-xl border border-[#fdba74] bg-[#fff7ed]">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarClock className="h-4 w-4 text-[#ea580c]" />
                  <span className="font-semibold text-[13px] text-[#7c2d12]">Určte termín doručenia</span>
                </div>
                <p className="text-[12px] text-[#7c2d12] opacity-80 mb-3">
                  Ponúkame len rozvozové dni zákazníka, na ktoré sa plodiny stihnú dopestovať.
                </p>

                {dateOptions === null && (
                  <div className="flex items-center gap-2 text-[12px] text-[#7c2d12]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Načítavam termíny…
                  </div>
                )}

                {dateOptions?.length === 0 && (
                  <p className="text-[12px] text-[#7c2d12]">
                    Žiadny vhodný termín. Skontrolujte, či má zákazník priradenú rozvozovú trasu.
                  </p>
                )}

                {dateOptions && dateOptions.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {dateOptions.map(d => (
                      <button
                        key={d}
                        onClick={() => confirmDate(d)}
                        disabled={confirming !== null}
                        className="py-2 px-3 rounded-lg bg-white border border-[#fdba74] text-[13px] font-semibold text-[#7c2d12] hover:bg-[#ffedd5] disabled:opacity-50 transition-colors"
                      >
                        {confirming === d ? 'Ukladám…' : formatDeliveryDate(d)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick actions */}
            {showQuickActions && next && (
              <div className="flex gap-2">
                <button
                  onClick={() => onQuickStatusChange(order.id, next.key)}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-[13px] transition-colors flex items-center justify-center gap-2 ${next.color}`}
                >
                  <Check className="h-4 w-4" />
                  {next.label}
                </button>
                <button
                  onClick={() => onQuickStatusChange(order.id, 'cancelled')}
                  className="px-3 py-2.5 rounded-lg border border-[#fecaca] text-[#dc2626] hover:bg-[#fef2f2] text-[13px] font-medium transition-colors"
                >
                  Zrušiť
                </button>
              </div>
            )}

            {/* Recurring info */}
            {order.is_recurring && order.recurring_end_date && (
              <div className="p-3 bg-[#eff6ff] rounded-xl border border-[#bfdbfe]">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-[#2563eb]" />
                  <span className="font-semibold text-[13px] text-[#1e40af]">Opakovaná objednávka</span>
                </div>
                <div className="text-[12px] text-[#1d4ed8] space-y-1">
                  {order.recurring_start_date && (
                    <div>Obdobie: {formatDeliveryDate(order.recurring_start_date)} → {formatDeliveryDate(order.recurring_end_date)}</div>
                  )}
                  {order.recurring_current_week && order.recurring_total_weeks && (
                    <div>Týždeň: {order.recurring_current_week} / {order.recurring_total_weeks}</div>
                  )}
                </div>
                <button
                  onClick={() => onExtend(order)}
                  className="mt-2 w-full px-4 py-2 text-[12px] font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg transition-colors"
                >
                  Predĺžiť objednávku
                </button>
              </div>
            )}

            {/* Notes */}
            {formatOrderNotes(order.notes ?? null) && (
              <div className="p-3 bg-[#eff6ff] rounded-xl border border-[#bfdbfe]">
                <div className="text-[11px] font-semibold text-[#1e40af] uppercase tracking-wider mb-1">Poznámky</div>
                <div className="text-[13px] text-[#1d4ed8]">{formatOrderNotes(order.notes ?? null)}</div>
              </div>
            )}

            {/* Items — eshop štýl */}
            <div>
              <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Položky objednávky</div>
              <div className="space-y-2">
                {sortOrderItemsByValue(order.order_items || []).map((item, idx) => {
                  if (!item) return null;
                  const itemTotal = (item.quantity || 0) * parseFloat((item.price_per_unit?.toString() || '0').replace(',', '.'));
                  const weightDisplay = item.packaging_size
                    ? (item.packaging_size.includes('g') || item.packaging_size.includes('kg') ? item.packaging_size : `${item.packaging_size}g`)
                    : '';
                  return (
                    <div key={idx} className="flex items-center justify-between border border-[#cbd5e1] rounded-xl px-4 py-3 hover:bg-[#f8fafc] transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[#0f172a]">{item.crop_name || '—'}</div>
                        <div className="text-[11px] text-[#64748b] mt-0.5">
                          {item.quantity} × {weightDisplay}
                          {(() => {
                            const ml = (item as any).package_ml || item.packaging_volume_ml;
                            const type = (item as any).package_type || item.packaging_type;
                            if (ml && type) return ` · ${ml}ml ${type}`;
                            if (ml) return ` · ${ml}ml`;
                            if (type) return ` · ${type}`;
                            return '';
                          })()}
                          {item.has_label ? ' · Etiketa' : ''}
                        </div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="text-[14px] font-bold text-[#0f172a]">{itemTotal.toFixed(2).replace('.', ',')} €</div>
                        <div className="text-[11px] text-[#94a3b8]">
                          {parseFloat((item.price_per_unit?.toString() || '0').replace(',', '.')).toFixed(2).replace('.', ',')} € / ks
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals — zelený box */}
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3 space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#166534]">Medzisúčet</span>
                <span className="font-semibold text-[#14532d]">{subtotal.toFixed(2).replace('.', ',')} €</span>
              </div>
              {(() => {
                if (customers.length === 0 || routes.length === 0) return null;
                const fee = getDeliveryFee(order);
                return (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#166534] flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" />Doprava
                    </span>
                    <span className="font-semibold text-[#14532d]">
                      {!order.charge_delivery || fee === 0 ? 'Zdarma' : `${fee.toFixed(2).replace('.', ',')} €`}
                    </span>
                  </div>
                );
              })()}
              <div className="flex justify-between items-center pt-2 border-t border-[#86efac]">
                <span className="text-[14px] font-bold text-[#166534]">Celkom</span>
                <span className="text-[20px] font-bold text-[#16a34a]">{(getOrderTotal(order) || 0).toFixed(2).replace('.', ',')} €</span>
              </div>
            </div>

            {/* Created at */}
            {order.created_at && (
              <div className="text-[11px] text-[#94a3b8]">
                Vytvorená: {new Date(order.created_at).toLocaleString('sk-SK', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== HISTORY TAB ===== */}
        {activeTab === 'history' && (
          <div className="py-2">
            <div className="space-y-5">
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Plus className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-[13px] text-[#0f172a]">Objednávka vytvorená</div>
                    {order.created_at && (
                      <div className="text-[11px] text-[#64748b] mt-0.5">
                        {new Date(order.created_at).toLocaleString('sk-SK', {
                          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    )}
                    {((order as any).order_source === 'app' || (order as any).source === 'app') && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd] mt-1">
                        <Smartphone className="w-3 h-3" />Cez mobilnú app
                      </span>
                    )}
                  </div>
                </div>

                {!['cancelled', 'delivered'].includes(s) && (
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-[#2563eb] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-[13px] text-[#0f172a]">
                        Aktuálny stav: <span className="text-[#2563eb]">{getStatusLabel(s)}</span>
                      </div>
                      <div className="text-[11px] text-[#64748b] mt-0.5">
                        Plánované dodanie: {formatDeliveryDate(order.delivery_date)}
                      </div>
                    </div>
                  </div>
                )}

                {s === 'delivered' && (
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-[13px] text-[#16a34a]">Objednávka doručená</div>
                      <div className="text-[11px] text-[#64748b] mt-0.5">{formatDeliveryDate(order.delivery_date)}</div>
                    </div>
                  </div>
                )}

                {(s === 'cancelled' || (order as any).cancelled_at) && (
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-[#dc2626] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <X className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-[13px] text-[#dc2626]">Objednávka zrušená</div>
                      {(order as any).cancelled_at && (
                        <div className="text-[11px] text-[#64748b] mt-0.5">
                          {new Date((order as any).cancelled_at).toLocaleString('sk-SK', {
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
            <p className="text-[11px] text-[#94a3b8] text-center mt-6">
              Podrobná história zmien stavu nie je momentálne sledovaná.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[#e2e8f0]">
          <Button variant="outline" className="border-[#cbd5e1] text-[#475569] hover:bg-[#f8fafc]" onClick={() => onOpenChange(false)}>
            Zatvoriť
          </Button>
          <Button
            className="bg-[#16a34a] hover:bg-[#15803d] text-white"
            onClick={() => { onOpenChange(false); onEdit(order); }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Upraviť
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
