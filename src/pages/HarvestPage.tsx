import React, { useState, useMemo } from 'react';
import { useOrders, useCrops } from '@/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, RotateCcw, CheckCircle2, Calendar as CalendarIcon, ShoppingBag } from "lucide-react";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function HarvestPage() {
  const { data: orders, update: updateOrder, loading } = useOrders();
  const { data: crops } = useCrops();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // 1. FILTROVANIE: Hľadáme položky v objednávkach na zvolený deň
  const harvestItems = useMemo(() => {
    const items: any[] = [];
    orders.forEach(order => {
      if (order.delivery_date === selectedDate && order.status !== 'delivered') {
        // Prechádzame order_items, ktoré máš v DB
        order.order_items?.forEach((item: any) => {
          items.push({
            ...item,
            orderId: order.id,
            customerName: order.customer_name,
            orderStatus: order.status,
            returnedCount: order.returned_packaging_count || 0
          });
        });
      }
    });
    return items;
  }, [orders, selectedDate]);

  // 2. SUMÁR KRABIČIEK: Tu vidíš koľko čoho nabaliť
  const packagingSummary = useMemo(() => {
    const summary: Record<string, { name: string, size: string, count: number }> = {};
    harvestItems.forEach(item => {
      const key = `${item.crop_name}-${item.packaging_size}`;
      if (!summary[key]) {
        summary[key] = { name: item.crop_name, size: item.packaging_size, count: 0 };
      }
      summary[key].count += 1;
    });
    return Object.values(summary);
  }, [harvestItems]);

  const handleUpdateReturned = async (orderId: string, count: string) => {
    await updateOrder(orderId, { returned_packaging_count: parseInt(count) || 0 });
    toast({ title: "Aktualizované", description: "Počet vratných obalov uložený." });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Zber a Balenie</h1>
        <div className="flex items-center gap-2 border p-2 rounded">
          <CalendarIcon size={18} />
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border-none h-8" />
        </div>
      </div>

      {/* SUMÁR KRABIČIEK */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {packagingSummary.map((s, i) => (
          <Card key={i} className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase opacity-60">{s.name}</p>
                <Badge variant="outline">{s.size}</Badge>
              </div>
              <div className="text-2xl font-black">{s.count} ks</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ZOZNAM NA BALENIE */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Jednotlivé balenia pre zákazníkov</CardTitle></CardHeader>
        <CardContent className="p-0 divide-y">
          {harvestItems.map((item, i) => (
            <div key={i} className="p-4 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <p className="font-bold">{item.customerName || 'Zákazník'}</p>
                <p className="text-sm">{item.crop_name} - {item.packaging_size}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-orange-50 p-1 px-3 rounded border border-orange-200">
                  <RotateCcw size={14} className="text-orange-600" />
                  <span className="text-xs font-bold italic">Vrátené:</span>
                  <Input 
                    type="number" 
                    className="w-14 h-7 bg-white" 
                    defaultValue={item.returnedCount}
                    onBlur={(e) => handleUpdateReturned(item.orderId, e.target.value)}
                  />
                </div>
                <Button size="sm" variant={item.orderStatus === 'ready' ? "outline" : "default"}>
                  {item.orderStatus === 'ready' ? <CheckCircle2 size={16} /> : <Package size={16} />}
                  <span className="ml-2">{item.orderStatus === 'ready' ? "Hotovo" : "Zabaliť"}</span>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}