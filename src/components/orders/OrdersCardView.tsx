import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Copy, Pencil, Trash2, Calendar, Truck, Store, House, Utensils, Smartphone, RefreshCw } from 'lucide-react';
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredOrders.map((order) => (
        <Card
          key={order.id}
          className="p-5 hover:shadow-xl transition-all bg-white rounded-xl border border-gray-200 cursor-pointer"
          style={{ borderLeft: `4px solid ${getStatusBorderColor(order.status)}` }}
          onClick={() => onSelectOrder(order)}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center text-white shadow-md">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                {order.order_items && order.order_items.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-[#10b981] flex items-center justify-center shadow">
                    <span className="text-xs font-bold text-[#10b981]">
                      {order.order_items.reduce((sum, item) => sum + (item?.quantity || 0), 0)}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">{order.customer_name || 'Bez názvu'}</h3>
                <div className="flex items-center flex-wrap gap-2 mt-1.5">
                  <Badge className={`border ${getStatusBadgeClass(order.status)} text-xs font-semibold px-2.5 py-0.5`}>
                    {getStatusLabel(order.status)}
                  </Badge>
                  {(order as any).order_source === 'app' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                      <Smartphone className="w-3 h-3" />APP
                    </span>
                  )}
                  {order.customer_type === 'home' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <House className="w-3 h-3" />Domáci
                    </span>
                  )}
                  {order.customer_type === 'gastro' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <Utensils className="w-3 h-3" />Gastro
                    </span>
                  )}
                  {order.customer_type === 'wholesale' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                      <Store className="w-3 h-3" />VO
                    </span>
                  )}
                  {(order.parent_order_id || (order.is_recurring && (order.recurring_weeks || 0) > 1) || order.notes?.includes('freq:weekly') || order.notes?.includes('freq:biweekly')) && (
                    <RefreshCw className="h-4 w-4 text-blue-600" title="Opakujúca sa objednávka" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100" onClick={() => onDuplicate(order)}>
                <Copy className="h-4 w-4 text-gray-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100" onClick={() => onEdit(order)}>
                <Pencil className="h-4 w-4 text-gray-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50" onClick={() => onDelete(order.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>

          <div className="space-y-2.5 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>Dodanie: {formatDeliveryDate(order.delivery_date)}</span>
            </div>
            {order.route && (
              order.route === 'Osobný odber' ? (
                <div className="flex items-center gap-2 text-green-600">
                  <Store className="h-4 w-4" />
                  <span className="font-medium">Osobný odber</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-600">
                  <Truck className="h-4 w-4" />
                  <span>Trasa: {order.route}</span>
                </div>
              )
            )}
          </div>

          <div className="border-t border-gray-200 pt-3 space-y-2">
            {(() => {
              if (customers.length === 0 || routes.length === 0) return null;
              const deliveryFee = getDeliveryFee(order);
              const orderSubtotal = (order.order_items || []).reduce((sum, item) => {
                if (!item) return sum;
                return sum + parseFloat(item?.quantity?.toString() || '0') *
                             parseFloat((item?.price_per_unit?.toString() || '0').replace(',', '.'));
              }, 0);

              if (!order.charge_delivery || deliveryFee === 0) {
                return (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Doprava:</span>
                    <span className="font-semibold text-[#10b981]">Zdarma</span>
                  </div>
                );
              }
              if (deliveryFee > 0) {
                return (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Doprava:</span>
                    <span className="font-semibold text-gray-900">{deliveryFee.toFixed(2)} €</span>
                  </div>
                );
              }
            })()}
            <div className="flex justify-between items-center">
              <span className="text-base text-gray-700 font-semibold">Celkom:</span>
              <span className="text-2xl font-bold text-[#10b981]">
                {(getOrderTotal(order) || 0).toFixed(2)} €
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
