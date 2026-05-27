import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Copy, Pencil, Trash2, House, Utensils, Store, Smartphone, RefreshCw, Users, Truck } from 'lucide-react';
import { getStatusBadgeClass, getStatusBorderColor, getStatusLabel, formatDeliveryDate } from './orderUtils';
import { formatEur } from '@/utils/formatters';
import type { Order } from './types';

interface Props {
  filteredOrders: Order[];
  getOrderTotal: (order: Order) => number;
  onSelectOrder: (order: Order) => void;
  onDuplicate: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
}

/**
 * Kompaktný zoznam objednávok — Gmail štýl.
 * Funguje na mobile aj desktope (responsive: na mobile menej info, na desktope plné).
 * Jeden riadok = jedna objednávka, klik otvorí detail.
 */
export function OrdersListView({
  filteredOrders, getOrderTotal,
  onSelectOrder, onDuplicate, onEdit, onDelete,
}: Props) {
  const isRecurring = (order: Order) =>
    !!order.parent_order_id ||
    (order.is_recurring && (order.recurring_weeks || 0) > 1) ||
    order.notes?.includes('freq:weekly') ||
    order.notes?.includes('freq:biweekly');

  const customerTypeBadge = (order: Order) => {
    if (order.customer_type === 'home') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
          <House className="w-2.5 h-2.5" />Domáci
        </span>
      );
    }
    if (order.customer_type === 'gastro') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
          <Utensils className="w-2.5 h-2.5" />Gastro
        </span>
      );
    }
    if (order.customer_type === 'wholesale') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
          <Store className="w-2.5 h-2.5" />VO
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-[#cbd5e1] overflow-hidden">
      <div className="divide-y divide-[#e2e8f0]">
        {filteredOrders.map((order) => {
          const itemCount = order.order_items?.reduce((sum, item) => sum + (item?.quantity || 0), 0) || 0;
          const total = getOrderTotal(order) || 0;

          return (
            <div
              key={order.id}
              className="flex items-center gap-3 px-3 py-3 md:px-4 md:py-3 hover:bg-[#f8fafc] cursor-pointer transition-colors"
              style={{ borderLeft: `3px solid ${getStatusBorderColor(order.status)}` }}
              onClick={() => onSelectOrder(order)}
            >
              {/* Ikona objednávky s počtom položiek */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-[#10b981] flex items-center justify-center text-white">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                {itemCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border-2 border-[#10b981] flex items-center justify-center">
                    <span className="text-[9px] font-bold text-[#10b981] leading-none">{itemCount}</span>
                  </div>
                )}
              </div>

              {/* Hlavná info — názov + meta */}
              <div className="flex-1 min-w-0">
                {/* Prvý riadok: meno + status + badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-sm text-[#0f172a] truncate">
                    {order.customer_name || 'Bez názvu'}
                  </span>
                  <Badge className={`border ${getStatusBadgeClass(order.status)} text-[10px] font-semibold px-1.5 py-0 shrink-0`}>
                    {getStatusLabel(order.status)}
                  </Badge>
                  {((order as any).order_source === 'app' || (order as any).source === 'app') && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                      <Smartphone className="w-2.5 h-2.5" />App
                    </span>
                  )}
                  {(order as any).group_order_id && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-medium bg-[#f5f3ff] text-[#6d28d9] border border-[#ddd6fe] shrink-0">
                      <Users className="w-2.5 h-2.5" />Skupina
                    </span>
                  )}
                  {/* Customer type — len na desktope, na mobile schované kvôli miestu */}
                  <span className="hidden sm:inline-flex">
                    {customerTypeBadge(order)}
                  </span>
                  {isRecurring(order) && (
                    <RefreshCw className="h-3 w-3 text-blue-500 shrink-0" />
                  )}
                </div>

                {/* Druhý riadok: dátum + trasa (skratená na mobile) */}
                <div className="flex items-center gap-2 text-[11px] text-[#64748b] mt-0.5">
                  <span className="truncate">{formatDeliveryDate(order.delivery_date)}</span>
                  {order.route && (
                    <>
                      <span className="text-[#cbd5e1]">·</span>
                      <span className="flex items-center gap-1 truncate">
                        {order.route === 'Osobný odber' ? (
                          <>
                            <Store className="h-3 w-3 shrink-0" />
                            <span className="truncate">Osobný odber</span>
                          </>
                        ) : (
                          <>
                            <Truck className="h-3 w-3 shrink-0" />
                            <span className="truncate">{order.route}</span>
                          </>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Cena */}
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-[#0f172a] whitespace-nowrap">
                  {formatEur(total)}
                </div>
              </div>

              {/* Akcie — len desktop (na mobile by zaberali príliš veľa miesta; akcie sú v detaile) */}
              <div className="hidden md:flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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
          );
        })}
      </div>
    </div>
  );
}
