import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Pencil, Trash2, Calendar, Truck, Store, House, Utensils, Smartphone, RefreshCw, ShoppingCart, Users } from 'lucide-react';
import { getStatusBadgeClass, getStatusBorderColor, getStatusLabel, formatDeliveryDate } from './orderUtils';
import type { Order, Customer, Route } from './types';

interface Props {
  filteredOrders: Order[];
  customers: Customer[];
  routes: Route[];
  getOrderTotal: (order: Order) => number;
  getDeliveryFee: (order: Order) => number;
  onSelectOrder: (order: Order) => void;
  onDuplicate: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
}

export function OrdersCardView({
  filteredOrders, customers, routes,
  getOrderTotal, getDeliveryFee,
  onSelectOrder, onDuplicate, onEdit, onDelete,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {filteredOrders.map((order) => (
        <div
          key={order.id}
          className="bg-white rounded-xl border-2 border-[#cbd5e1] hover:shadow-md transition-all cursor-pointer overflow-hidden"
          style={{ borderLeftColor: getStatusBorderColor(order.status), borderLeftWidth: 4 }}
          onClick={() => onSelectOrder(order)}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center text-white shadow-sm">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                {order.order_items && order.order_items.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border-2 border-[#10b981] flex items-center justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-[#10b981] leading-none">
                      {order.order_items.reduce((sum, item) => sum + (item?.quantity || 0), 0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-[#0f172a] truncate">{order.customer_name || 'Bez názvu'}</h3>
                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                  <Badge className={`border ${getStatusBadgeClass(order.status)} text-[10px] font-semibold px-2 py-0`}>
                    {getStatusLabel(order.status)}
                  </Badge>
                  {((order as any).order_source === 'app' || (order as any).source === 'app') && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                      <Smartphone className="w-2.5 h-2.5" />App
                    </span>
                  )}
                  {(order as any).group_order_id && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-medium bg-[#f5f3ff] text-[#6d28d9] border border-[#ddd6fe]">
                      <Users className="w-2.5 h-2.5" />Skupina
                    </span>
                  )}
                  {order.customer_type === 'home' && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <House className="w-2.5 h-2.5" />Domáci
                    </span>
                  )}
                  {order.customer_type === 'gastro' && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <Utensils className="w-2.5 h-2.5" />Gastro
                    </span>
                  )}
                  {order.customer_type === 'wholesale' && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                      <Store className="w-2.5 h-2.5" />VO
                    </span>
                  )}
                  {(order.parent_order_id || (order.is_recurring && (order.recurring_weeks || 0) > 1) || order.notes?.includes('freq:weekly') || order.notes?.includes('freq:biweekly')) && (
                    <RefreshCw className="h-3 w-3 text-blue-500" title="Opakujúca sa objednávka" />
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#f0fdf4]" onClick={() => onDuplicate(order)}>
                <Copy className="h-3.5 w-3.5 text-[#94a3b8]" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-[#f0fdf4]" onClick={() => onEdit(order)}>
                <Pencil className="h-3.5 w-3.5 text-[#94a3b8]" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-50" onClick={() => onDelete(order.id)}>
                <Trash2 className="h-3.5 w-3.5 text-[#f87171]" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 pb-3 space-y-1.5 text-xs text-[#475569]">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" />
              <span>{formatDeliveryDate(order.delivery_date)}</span>
            </div>
            {order.route && (
              order.route === 'Osobný odber' ? (
                <div className="flex items-center gap-1.5 text-[#10b981]">
                  <Store className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">Osobný odber</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" />
                  <span>{order.route}</span>
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#cbd5e1] px-4 py-2.5 flex items-center justify-between">
            {(() => {
              if (customers.length === 0 || routes.length === 0) return null;
              const deliveryFee = getDeliveryFee(order);
              if (!order.charge_delivery || deliveryFee === 0) {
                return (
                  <span className="text-xs text-[#10b981] font-medium">Doprava zdarma</span>
                );
              }
              return (
                <span className="text-xs text-[#475569]">Doprava: {deliveryFee.toFixed(2)} €</span>
              );
            })()}
            <span className="text-lg font-bold text-[#0f172a] ml-auto">
              {(getOrderTotal(order) || 0).toFixed(2)} €
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
