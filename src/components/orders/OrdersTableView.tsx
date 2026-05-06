import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Copy, Pencil, Trash2, House, Utensils, Store, Smartphone, RefreshCw } from 'lucide-react';
import { getStatusBadgeClass, getStatusBorderColor, getStatusLabel, formatDeliveryDate } from './orderUtils';
import type { Order } from './types';

interface Props {
  filteredOrders: Order[];
  getOrderTotal: (order: Order) => number;
  onSelectOrder: (order: Order) => void;
  onDuplicate: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
}

export function OrdersTableView({ filteredOrders, getOrderTotal, onSelectOrder, onDuplicate, onEdit, onDelete }: Props) {
  return (
    <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Zákazník</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dátum dodania</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trasa</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Celková cena</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOrders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                style={{ borderLeft: `4px solid ${getStatusBorderColor(order.status)}` }}
                onClick={() => onSelectOrder(order)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center text-white">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-sm text-gray-900">{order.customer_name || 'Bez názvu'}</div>
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
                      </div>
                      {order.order_items && order.order_items.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {order.order_items.reduce((sum, item) => sum + (item?.quantity || 0), 0)} položiek
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{formatDeliveryDate(order.delivery_date)}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{order.route || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center flex-wrap gap-2">
                    <Badge className={`border ${getStatusBadgeClass(order.status)} text-xs font-semibold px-2 py-0.5`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                    {(order.parent_order_id || (order.is_recurring && (order.recurring_weeks || 0) > 1) || order.notes?.includes('freq:weekly') || order.notes?.includes('freq:biweekly')) && (
                      <RefreshCw className="h-4 w-4 text-blue-600" title="Opakujúca sa objednávka" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-base font-bold text-[#10b981]">
                    {(getOrderTotal(order) || 0).toFixed(2)} €
                  </span>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 justify-end">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
