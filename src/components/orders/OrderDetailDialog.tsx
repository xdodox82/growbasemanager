import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Truck, Store, RefreshCw, Check, X, Clock, Smartphone, Pencil, Plus } from 'lucide-react';
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
  if (!order) return null;

  const s = order.status;
  const isCancelled = s === 'cancelled' || s === 'zrusena';
  const currentStepIdx = STATUS_STEPS.findIndex(step => step.keys.includes(s));

  const nextMap: Record<string, { key: string; label: string; className: string }> = {
    'pending':         { key: 'confirmed',  label: 'Potvrdiť objednávku',    className: 'bg-blue-500 hover:bg-blue-600 text-white' },
    'pending_approval':{ key: 'confirmed',  label: 'Schváliť a potvrdiť',    className: 'bg-purple-500 hover:bg-purple-600 text-white' },
    'confirmed':       { key: 'growing',    label: 'Označiť: Rastie',        className: 'bg-violet-500 hover:bg-violet-600 text-white' },
    'growing':         { key: 'packed',     label: 'Označiť: Zabalená',      className: 'bg-amber-500 hover:bg-amber-600 text-white' },
    'packed':          { key: 'on_the_way', label: 'Odoslať: Na ceste',      className: 'bg-sky-500 hover:bg-sky-600 text-white' },
    'ready':           { key: 'on_the_way', label: 'Odoslať: Na ceste',      className: 'bg-sky-500 hover:bg-sky-600 text-white' },
    'packaging_ready': { key: 'on_the_way', label: 'Odoslať: Na ceste',      className: 'bg-sky-500 hover:bg-sky-600 text-white' },
    'on_the_way':      { key: 'delivered',  label: '✓ Označiť ako Doručenú', className: 'bg-[#10b981] hover:bg-[#059669] text-white' },
    // legacy Slovak keys for existing DB records
    'cakajuca':        { key: 'confirmed',  label: 'Potvrdiť objednávku',    className: 'bg-blue-500 hover:bg-blue-600 text-white' },
    'potvrdena':       { key: 'growing',    label: 'Označiť: Rastie',        className: 'bg-violet-500 hover:bg-violet-600 text-white' },
    'pripravena':      { key: 'on_the_way', label: 'Odoslať: Na ceste',      className: 'bg-sky-500 hover:bg-sky-600 text-white' },
  };
  const next = nextMap[s];
  const showQuickActions = s !== 'cancelled' && s !== 'delivered' && s !== 'zrusena' && s !== 'dorucena';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) onTabChange('detail'); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Detail objednávky</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab navigation */}
          <div className="flex border-b border-gray-200 -mt-1">
            <button
              onClick={() => onTabChange('detail')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'detail'
                  ? 'border-[#10b981] text-[#10b981]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Detail
            </button>
            <button
              onClick={() => onTabChange('history')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-[#10b981] text-[#10b981]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              História
            </button>
          </div>

          {/* ===== DETAIL TAB ===== */}
          {activeTab === 'detail' && (
            <>
              {/* Customer + date info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Zákazník</div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-900">{order.customer_name || 'Bez názvu'}</div>
                    {(order as any).order_source === 'app' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                        <Smartphone className="w-3 h-3" />APP
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Dátum dodania</div>
                  <div className="font-semibold text-gray-900">{formatDeliveryDate(order.delivery_date)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Trasa</div>
                  {order.route === 'Osobný odber' ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Store className="h-4 w-4" />
                      <span className="font-semibold">Osobný odber</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <span className="font-semibold text-gray-900">
                        {order.route || (order as any).customers?.delivery_routes?.name || '-'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-end">
                  {(order.parent_order_id || (order.is_recurring && (order.recurring_weeks || 0) > 1)) && (
                    <div className="flex items-center gap-1.5 text-blue-600">
                      <RefreshCw className="h-4 w-4" />
                      <span className="text-sm font-medium">Opakovaná</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Stepper */}
              <div className="p-4 bg-gray-50 rounded-lg">
                {isCancelled ? (
                  <div className="flex items-center gap-2 text-red-600 justify-center py-1">
                    <X className="h-5 w-5" />
                    <span className="font-semibold">Zrušená objednávka</span>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Postup objednávky</div>
                    {isMobile ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-400 w-14 text-right leading-tight">
                          {currentStepIdx > 0 ? STATUS_STEPS[currentStepIdx - 1].label : ''}
                        </span>
                        <div className="flex flex-col items-center flex-1">
                          <div className="w-10 h-10 rounded-full bg-[#10b981] border-2 border-[#10b981] shadow-md shadow-green-200 flex items-center justify-center">
                            <div className="w-3.5 h-3.5 rounded-full bg-white" />
                          </div>
                          <span className="text-xs font-bold text-[#10b981] mt-1.5 text-center">{STATUS_STEPS[currentStepIdx]?.label}</span>
                          <span className="text-[10px] text-gray-400">{currentStepIdx + 1} / {STATUS_STEPS.length}</span>
                        </div>
                        <span className="text-xs text-gray-400 w-14 leading-tight">
                          {currentStepIdx < STATUS_STEPS.length - 1 ? STATUS_STEPS[currentStepIdx + 1].label : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start">
                        {STATUS_STEPS.map((step, idx) => (
                          <div key={idx} className="flex items-center flex-1 min-w-0">
                            <div className="flex flex-col items-center flex-1 min-w-0">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                                idx < currentStepIdx
                                  ? 'bg-[#10b981] border-[#10b981]'
                                  : idx === currentStepIdx
                                  ? 'bg-[#10b981] border-[#10b981] shadow-md shadow-green-200'
                                  : 'bg-white border-gray-300'
                              }`}>
                                {idx < currentStepIdx ? (
                                  <Check className="h-3.5 w-3.5 text-white" />
                                ) : idx === currentStepIdx ? (
                                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                ) : null}
                              </div>
                              <span className={`text-[9px] font-medium text-center mt-1 leading-tight w-full px-0.5 break-words ${
                                idx === currentStepIdx ? 'text-[#10b981] font-bold' : idx < currentStepIdx ? 'text-gray-500' : 'text-gray-400'
                              }`}>{step.label}</span>
                            </div>
                            {idx < STATUS_STEPS.length - 1 && (
                              <div className={`h-0.5 w-3 flex-shrink-0 mb-5 ${idx < currentStepIdx ? 'bg-[#10b981]' : 'bg-gray-200'}`} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Action Buttons */}
              {showQuickActions && next && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onQuickStatusChange(order.id, next.key)}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors ${next.className}`}
                  >
                    {next.label}
                  </button>
                  <button
                    onClick={() => onQuickStatusChange(order.id, 'cancelled')}
                    className="px-3 py-2.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium transition-colors"
                  >
                    Zrušiť
                  </button>
                </div>
              )}

              {/* Recurring order info */}
              {order.is_recurring && order.recurring_end_date && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Opakovaná objednávka</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-600 min-w-[80px]">📅 Obdobie:</span>
                      <span className="font-medium text-gray-900">
                        {order.recurring_start_date && formatDeliveryDate(order.recurring_start_date)}
                        {' → '}
                        {formatDeliveryDate(order.recurring_end_date)}
                      </span>
                    </div>
                    {order.recurring_current_week && order.recurring_total_weeks && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-600 min-w-[80px]">🔢 Týždeň:</span>
                        <span className="font-medium text-gray-900">
                          {order.recurring_current_week} / {order.recurring_total_weeks}
                        </span>
                      </div>
                    )}
                    <div className="pt-3 mt-2 border-t border-blue-200">
                      <button
                        onClick={() => onExtend(order)}
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        ➕ Predĺžiť objednávku
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PWA recurring info */}
              {!order.is_recurring && order.notes?.includes('freq:') && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Opakovaná objednávka</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">PWA</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    {order.notes?.includes('freq:weekly') ? 'Frekvencia: každý týždeň' : 'Frekvencia: každé 2 týždne'}
                  </p>
                </div>
              )}

              {formatOrderNotes(order.notes ?? null) && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-semibold text-blue-900 mb-1">Poznámky:</div>
                  <div className="text-sm text-blue-800">{formatOrderNotes(order.notes ?? null)}</div>
                </div>
              )}

              {/* Order items */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-base mb-3">Položky objednávky:</h3>
                <div className="space-y-2">
                  {sortOrderItemsByValue(order.order_items || []).map((item, idx) => {
                    if (!item) return null;
                    const itemPrice = (item?.quantity || 0) * (parseFloat(item?.price_per_unit?.toString().replace(',', '.') || '0'));
                    const formLabel = getDeliveryFormLabel(item?.delivery_form);
                    const weightDisplay = item?.packaging_size
                      ? (item.packaging_size.includes('g') || item.packaging_size.includes('kg') ? item.packaging_size : `${item.packaging_size}g`)
                      : '-';
                    return (
                      <div key={idx} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {item?.quantity || 0}× {item?.crop_name || '-'}{item?.packaging_size ? ` ${weightDisplay}` : ''}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formLabel}
                            {item?.packaging_type && ` • ${item.packaging_type}`}
                            {item?.packaging_volume_ml && ` • ${item.packaging_volume_ml}ml`}
                          </div>
                          {item?.notes && <div className="text-xs text-gray-500 mt-1 italic">{item.notes}</div>}
                        </div>
                        <div className="font-bold text-[#10b981] text-lg ml-4">{itemPrice.toFixed(2)} €</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Medzisúčet:</span>
                  <span className="font-semibold text-gray-900">
                    {(() => {
                      if (order.order_items && Array.isArray(order.order_items)) {
                        return order.order_items.reduce((sum, item) => {
                          if (!item) return sum;
                          return sum + parseFloat(item.quantity?.toString() || '0') *
                                       parseFloat(item.price_per_unit?.toString().replace(',', '.') || '0');
                        }, 0).toFixed(2);
                      }
                      return (order?.total_price || 0).toFixed(2);
                    })()}€
                  </span>
                </div>
                {(() => {
                  if (customers.length === 0 || routes.length === 0) return null;
                  const deliveryFee = getDeliveryFee(order);
                  if (!order.charge_delivery || deliveryFee === 0) {
                    return (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#10b981] flex items-center gap-1 font-medium">
                          <Truck className="h-3 w-3" />Doprava: Zdarma
                        </span>
                      </div>
                    );
                  }
                  if (deliveryFee > 0) {
                    return (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Truck className="h-3 w-3" />Doprava:
                        </span>
                        <span className="font-semibold text-gray-900">{deliveryFee.toFixed(2)} €</span>
                      </div>
                    );
                  }
                })()}
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="text-lg text-gray-700 font-semibold">Celkom:</span>
                  <span className="text-3xl font-bold text-[#10b981]">
                    {(getOrderTotal(order) || 0).toFixed(2)} €
                  </span>
                </div>
              </div>

              {(order.created_at || (order as any).cancelled_at) && (
                <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                  {order.created_at && (
                    <p className="text-xs text-gray-400">
                      📅 Vytvorená: {new Date(order.created_at).toLocaleString('sk-SK', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  )}
                  {(order as any).cancelled_at && (
                    <p className="text-xs text-gray-400">
                      ❌ Zrušená: {new Date((order as any).cancelled_at).toLocaleString('sk-SK', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* ===== HISTORY TAB ===== */}
          {activeTab === 'history' && (
            <div className="py-2">
              <div className="relative pl-8">
                <div className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-gray-200" />
                <div className="space-y-5">
                  <div className="flex gap-3 items-start relative">
                    <div className="absolute -left-5 w-7 h-7 rounded-full bg-[#10b981] flex items-center justify-center z-10 shadow-sm">
                      <Plus className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">Objednávka vytvorená</div>
                      {order.created_at && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {new Date(order.created_at).toLocaleString('sk-SK', {
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      )}
                      {(order as any).order_source === 'app' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 mt-1">
                          <Smartphone className="w-3 h-3" />Cez APP
                        </span>
                      )}
                    </div>
                  </div>

                  {s !== 'cancelled' && s !== 'delivered' && s !== 'zrusena' && s !== 'dorucena' && (
                    <div className="flex gap-3 items-start relative">
                      <div className="absolute -left-5 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center z-10 shadow-sm">
                        <Clock className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">
                          Aktuálny stav: <span className="text-blue-600">{getStatusLabel(s)}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Plánované dodanie: {formatDeliveryDate(order.delivery_date)}
                        </div>
                      </div>
                    </div>
                  )}

                  {(s === 'delivered' || s === 'dorucena') && (
                    <div className="flex gap-3 items-start relative">
                      <div className="absolute -left-5 w-7 h-7 rounded-full bg-[#10b981] flex items-center justify-center z-10 shadow-sm">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[#10b981]">Objednávka doručená</div>
                        <div className="text-xs text-gray-500 mt-0.5">{formatDeliveryDate(order.delivery_date)}</div>
                      </div>
                    </div>
                  )}

                  {(s === 'cancelled' || s === 'zrusena' || (order as any).cancelled_at) && (
                    <div className="flex gap-3 items-start relative">
                      <div className="absolute -left-5 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center z-10 shadow-sm">
                        <X className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-red-600">Objednávka zrušená</div>
                        {(order as any).cancelled_at && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date((order as any).cancelled_at).toLocaleString('sk-SK', {
                              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-6">
                Podrobná história zmien stavu nie je momentálne sledovaná.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Zatvoriť</Button>
            <Button
              variant="default"
              className="bg-[#10b981] hover:bg-[#059669]"
              onClick={() => { onOpenChange(false); onEdit(order); }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Upraviť
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
