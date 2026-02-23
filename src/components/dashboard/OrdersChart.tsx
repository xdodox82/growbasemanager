import { useMemo } from 'react';
import { useOrders, useCustomers } from '@/hooks/useSupabaseData';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package } from 'lucide-react';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { sk } from 'date-fns/locale';

export const OrdersChart = () => {
  const { data: orders } = useOrders();
  const { data: customers } = useCustomers();

  // Orders per day for the last 7 days
  const ordersPerDay = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: startOfDay(date),
        label: format(date, 'EEE', { locale: sk }),
        fullDate: format(date, 'd.M.', { locale: sk }),
        count: 0,
        quantity: 0,
      };
    });

    orders.forEach(order => {
      const orderDate = startOfDay(new Date(order.created_at));
      const dayData = days.find(d => isSameDay(d.date, orderDate));
      if (dayData) {
        dayData.count += 1;
        dayData.quantity += order.quantity || 0;
      }
    });

    return days;
  }, [orders]);

  // Orders by status
  const ordersByStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {
      pending: 0,
      growing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach(order => {
      const status = order.status || 'pending';
      if (statusCounts[status] !== undefined) {
        statusCounts[status] += 1;
      }
    });

    return [
      { name: 'Čakajúce', value: statusCounts.pending, color: 'hsl(var(--warning))' },
      { name: 'Rastú', value: statusCounts.growing, color: 'hsl(var(--success))' },
      { name: 'Pripravené', value: statusCounts.ready, color: 'hsl(var(--primary))' },
      { name: 'Doručené', value: statusCounts.delivered, color: 'hsl(var(--muted-foreground))' },
      { name: 'Zrušené', value: statusCounts.cancelled, color: 'hsl(var(--destructive))' },
    ].filter(s => s.value > 0);
  }, [orders]);

  const totalActiveOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const totalThisWeek = ordersPerDay.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Orders Chart */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Objednávky za týždeň</h2>
            <p className="text-sm text-muted-foreground">
              {totalThisWeek} objednávok, {totalActiveOrders} aktívnych
            </p>
          </div>
        </div>

        {totalThisWeek > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ordersPerDay}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="label" 
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullDate;
                  }
                  return label;
                }}
                formatter={(value: number) => [`${value} objednávok`, 'Počet']}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <Package className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Zatiaľ žiadne objednávky tento týždeň</p>
          </div>
        )}
      </Card>

      {/* Status Pie Chart */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Stav objednávok</h2>
            <p className="text-sm text-muted-foreground">
              {orders.length} celkom
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {ordersByStatus.length > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {ordersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [`${value}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[150px] text-muted-foreground">
              <p className="text-sm">Žiadne objednávky</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Legenda</p>
            {ordersByStatus.map((status) => (
              <div key={status.name} className="flex items-center gap-2 text-sm">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: status.color }}
                />
                <span className="flex-1">{status.name}</span>
                <span className="font-medium">{status.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
