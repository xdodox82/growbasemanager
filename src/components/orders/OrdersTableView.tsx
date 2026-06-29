import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Copy, Pencil, Trash2, House, Utensils, Store, Smartphone, RefreshCw, Users, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { getStatusBadgeClass, getStatusBorderColor, getStatusLabel, formatDeliveryDate } from './orderUtils';
import type { Order } from './types';

interface Props {
  filteredOrders: Order[];
  getOrderTotal: (order: Order) => number;
  sortField?: 'delivery_date' | 'total_price' | null;
  sortDir?: 'asc' | 'desc';
  onSort?: (field: 'delivery_date' | 'total_price') => void;
  onSelectOrder: (order: Order) => void;
  onDuplicate: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
}

export function OrdersTableView({ filteredOrders, getOrderTotal, sortField, sortDir, onSort, onSelectOrder, onDuplicate, onEdit, onDelete }: Props) {
  const SortIcon = ({ field }: { field: 'delivery_date' | 'total_price' }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-[#cbd5e1]" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-[#16a34a]" />
      : <ChevronDown className="h-3 w-3 text-[#16a34a]" />;
  };
  return (
    <div className="hidden md:block bg-white rounded-xl border border-[#cbd5e1] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#f8fafc] border-b-2 border-[#cbd5e1]">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wider">Zákazník</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => onSort?.('delivery_date')}
                  className={`inline-flex items-center gap-1 uppercase tracking-wider ${onSort ? 'cursor-pointer hover:text-[#16a34a]' : 'cursor-default'} ${sortField === 'delivery_date' ? 'text-[#16a34a]' : ''}`}
                >
                  Dátum dodania
                  {onSort && <SortIcon field="delivery_date" />}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wider">Trasa</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-[#475569] uppercase tracking-wider">Stav</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => onSort?.('total_price')}
                  className={`inline-flex items-center gap-1 uppercase tracking-wider ${onSort ? 'cursor-pointer hover:text-[#16a34a]' : 'cursor-default'} ${sortField === 'total_price' ? 'text-[#16a34a]' : ''}`}
                >
                  Celková cena
                  {onSort && <SortIcon field="total_price" />}
                </button>
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold text-[#475569] uppercase tracking-wider">Akcie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {filteredOrders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-[#f8fafc] cursor-pointer transition-colors"
                style={{ borderLeft: `3px solid ${getStatusBorderColor(order.status)}` }}
                onClick={() => onSelectOrder(order)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center text-white shrink-0">
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-[#0f172a]">{order.customer_name || 'Bez názvu'}</span>
                        {((order as any).order_source === 'app' || (order as any).source === 'app' || (order as any).source === 'flash') && (
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
                      </div>
                      {order.order_items && order.order_items.length > 0 && (
                        <div className="text-[11px] text-[#94a3b8] mt-0.5">
                          {order.order_items.reduce((sum, item) => sum + (item?.quantity || 0), 0)} pol.
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[#334155]">{formatDeliveryDate(order.delivery_date)}</td>
                <td className="px-4 py-3 text-sm text-[#475569]">{order.route || <span className="text-[#cbd5e1]">—</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Badge className={`border ${getStatusBadgeClass(order.status)} text-[10px] font-semibold px-2 py-0`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                    {(order.parent_order_id || (order.is_recurring && (order.recurring_weeks || 0) > 1) || order.notes?.includes('freq:weekly') || order.notes?.includes('freq:biweekly')) && (
                      <RefreshCw className="h-3.5 w-3.5 text-blue-500" title="Opakujúca sa objednávka" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-bold text-[#0f172a]">
                    {(getOrderTotal(order) || 0).toFixed(2).replace('.', ',')} €
                  </span>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-0.5 justify-end">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
