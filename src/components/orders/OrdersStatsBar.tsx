import { House, Utensils, Store } from 'lucide-react';
import type { Order, Customer } from './types';

interface Props {
  filteredOrders: Order[];
  customers: Customer[];
  domaciRevenue: number;
  gastroRevenue: number;
  wholesaleRevenue: number;
}

export function OrdersStatsBar({ filteredOrders, customers, domaciRevenue, gastroRevenue, wholesaleRevenue }: Props) {
  const countByType = (type: string) =>
    filteredOrders.filter(o => customers?.find(c => c.id === o?.customer_id)?.customer_type === type).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-[#10b981]/20 hover:border-[#10b981]/40 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#10b981] flex items-center justify-center">
              <House className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700 uppercase">Domáci</span>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-[#10b981]">{domaciRevenue.toFixed(2).replace('.', ',')} €</div>
            <p className="text-[10px] text-gray-500">{countByType('home')} obj.</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg p-3 border border-blue-500/20 hover:border-blue-500/40 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Utensils className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700 uppercase">Gastro</span>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-blue-600">{gastroRevenue.toFixed(2).replace('.', ',')} €</div>
            <p className="text-[10px] text-gray-500">{countByType('gastro')} obj.</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-500/20 hover:border-orange-500/40 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700 uppercase">Veľkoobchod</span>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-orange-600">{wholesaleRevenue.toFixed(2).replace('.', ',')} €</div>
            <p className="text-[10px] text-gray-500">{countByType('wholesale')} obj.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
