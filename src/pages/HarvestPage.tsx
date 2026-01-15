import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlantingPlans, useOrders, useCustomers, useCrops, useBlends } from '@/hooks/useSupabaseData';
import { Scissors, FileSpreadsheet, FileText, Leaf, CheckCircle2, CalendarIcon, Filter, Undo2 } from 'lucide-react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useInventoryConsumption } from '@/hooks/useInventoryConsumption';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function HarvestPage() {
  const { data: plantingPlans, update: updatePlantingPlan } = usePlantingPlans();
  const { data: orders, update: updateOrder } = useOrders();
  const { data: customers } = useCustomers();
  const { data: crops } = useCrops();
  const { data: blends } = useBlends();
  const { toast } = useToast();
  const { consumeOrderInventory } = useInventoryConsumption();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'ready'>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Get planting plans that need to be harvested on the selected date
  const harvestPlans = plantingPlans.filter(plan =>
    plan.expected_harvest_date &&
    isSameDay(startOfDay(new Date(plan.expected_harvest_date)), startOfDay(selectedDate)) &&
    plan.status !== 'harvested'
  );

  // Get orders that need to be delivered on the selected date
  let ordersForDate = orders.filter(order =>
    order.delivery_date &&
    isSameDay(startOfDay(new Date(order.delivery_date)), startOfDay(selectedDate)) &&
    order.status !== 'delivered' && order.status !== 'cancelled'
  );

  // Filter by customer type if selected
  if (selectedCustomerType !== 'all') {
    ordersForDate = ordersForDate.filter(order => {
      const customer = customers.find(c => c.id === order.customer_id);
      return customer?.customer_type === selectedCustomerType;
    });
  }

  // Filter by status if selected
  if (statusFilter !== 'all') {
    ordersForDate = ordersForDate.filter(order => {
      if (statusFilter === 'ready') {
        return order.status === 'ready';
      } else {
        return order.status === 'pending' || order.status === 'confirmed';
      }
    });
  }

  // Split orders into pending and ready
  const pendingOrders = ordersForDate.filter(order =>
    order.status === 'pending' || order.status === 'confirmed'
  );
  const readyOrders = ordersForDate.filter(order =>
    order.status === 'ready'
  );

  const getCropName = (cropId: string | null) => {
    if (!cropId) return 'Neznáma plodina';
    return crops.find(c => c.id === cropId)?.name || 'Neznáma plodina';
  };

  const getCropColor = (cropId: string | null) => {
    if (!cropId) return '#888888';
    return crops.find(c => c.id === cropId)?.color || '#888888';
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return 'Neznámy zákazník';
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Neznámy zákazník';
    // Prioritize company_name for gastro/wholesale customers
    return customer.company_name || customer.name || 'Neznámy zákazník';
  };

  const getItemName = (order: { crop_id?: string | null; blend_id?: string | null }) => {
    if (order.crop_id) {
      return getCropName(order.crop_id);
    }
    if (order.blend_id) {
      const blend = blends.find(b => b.id === order.blend_id);
      return blend?.name || 'Neznáma zmes';
    }
    return 'Neznáma položka';
  };

  // Helper function to group orders
  const groupOrders = (ordersList: typeof orders) => ordersList.reduce((acc, order) => {
    const key = order.crop_id || order.blend_id || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        name: getItemName(order),
        cropId: order.crop_id,
        blendId: order.blend_id,
        totalQuantity: 0,
        packagingSummary: {} as Record<string, number>,
        orders: [],
      };
    }
    acc[key].totalQuantity += order.quantity || 0;

    const packagingKey = order.packaging_size || '50g';
    acc[key].packagingSummary[packagingKey] = (acc[key].packagingSummary[packagingKey] || 0) + 1;

    acc[key].orders.push({
      id: order.id,
      customerName: getCustomerName(order.customer_id),
      customerType: customers.find(c => c.id === order.customer_id)?.customer_type || 'home',
      quantity: order.quantity || 0,
      unit: order.unit || 'g',
      packagingSize: order.packaging_size || '50g',
      hasLabel: order.has_label !== false,
      deliveryForm: order.delivery_form || 'cut',
    });
    return acc;
  }, {} as Record<string, {
    name: string;
    cropId?: string | null;
    blendId?: string | null;
    totalQuantity: number;
    packagingSummary: Record<string, number>;
    orders: {
      id: string;
      customerName: string;
      customerType: string;
      quantity: number;
      unit: string;
      packagingSize: string;
      hasLabel: boolean;
      deliveryForm: string;
    }[]
  }>);

  // Group pending and ready orders separately
  const groupedPendingOrders = groupOrders(pendingOrders);
  const groupedReadyOrders = groupOrders(readyOrders);

  // Helper function to sort grouped orders
  const sortGroupedOrders = (grouped: ReturnType<typeof groupOrders>) => {
    Object.values(grouped).forEach(group => {
      group.orders.sort((a, b) => {
        if (a.customerName !== b.customerName) return a.customerName.localeCompare(b.customerName);
        if (a.packagingSize !== b.packagingSize) return a.packagingSize.localeCompare(b.packagingSize);
        if (a.hasLabel !== b.hasLabel) return a.hasLabel ? -1 : 1;
        return 0;
      });
    });

    return Object.entries(grouped).sort(([keyA, groupA], [keyB, groupB]) => {
      const cropA = crops.find(c => c.id === groupA.cropId);
      const cropB = crops.find(c => c.id === groupB.cropId);
      const orderA = (cropA as any)?.harvest_order ?? 999;
      const orderB = (cropB as any)?.harvest_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return groupA.name.localeCompare(groupB.name);
    });
  };

  const sortedPendingOrders = sortGroupedOrders(groupedPendingOrders);
  const sortedReadyOrders = sortGroupedOrders(groupedReadyOrders);

  // Format packaging summary
  const getPackagingSummary = (summary: Record<string, number>) => {
    return Object.entries(summary)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([size, count]) => `${count}x ${size}`)
      .join(' + ');
  };


  const togglePlanComplete = async (planId: string) => {
    const plan = plantingPlans.find(p => p.id === planId);
    if (plan) {
      const newStatus = plan.status === 'harvested' ? 'growing' : 'harvested';
      const { error } = await updatePlantingPlan(planId, { 
        status: newStatus,
        actual_harvest_date: newStatus === 'harvested' ? format(new Date(), 'yyyy-MM-dd') : null
      });
      if (!error) {
        toast({
          title: newStatus === 'harvested' ? 'Zber zaznamenaný' : 'Zber zrušený',
          description: `Plodina ${getCropName(plan.crop_id)} bola ${newStatus === 'harvested' ? 'zozbieraná' : 'vrátená do pestovania'}.`,
        });
      }
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const markOrderReady = async (orderId: string) => {
    const { error } = await updateOrder(orderId, { status: 'ready' });
    if (!error) {
      setSelectedOrderIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
      toast({
        title: 'Zabalené',
        description: 'Položka bola zozbieraná a zabalená.',
      });
    }
  };

  const markSelectedReady = async () => {
    if (selectedOrderIds.size === 0) return;

    const promises = Array.from(selectedOrderIds).map(orderId =>
      updateOrder(orderId, { status: 'ready' })
    );
    await Promise.all(promises);

    setSelectedOrderIds(new Set());
    toast({
      title: 'Vybrané zabalené',
      description: `${selectedOrderIds.size} položiek bolo označených ako zabalené.`,
    });
  };

  const markOrderPending = async (orderId: string) => {
    const { error } = await updateOrder(orderId, { status: 'confirmed' });
    if (!error) {
      toast({
        title: 'Vrátené',
        description: 'Položka bola vrátená do zoznamu na spracovanie.',
      });
    }
  };

  const markOrderDelivered = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    const { error } = await updateOrder(orderId, { status: 'delivered' });
    if (!error) {
      // Consume packaging and labels when order is delivered
      if (order) {
        await consumeOrderInventory(
          order.crop_id || null,
          order.delivery_form || 'cut',
          order.packaging_size || '50g',
          Math.ceil(order.quantity || 1),
          order.has_label !== false
        );
      }
      
      toast({
        title: 'Objednávka doručená',
        description: 'Objednávka bola označená ako doručená a zásoby boli odpočítané.',
      });
    }
  };

  const markAllReady = async () => {
    const promises = pendingOrders.map(order =>
      updateOrder(order.id, { status: 'ready' })
    );
    await Promise.all(promises);
    toast({
      title: 'Všetky pripravené',
      description: `${pendingOrders.length} objednávok bolo označených ako pripravené na rozvoz.`,
    });
  };

  const totalItemsCount = ordersForDate.length;
  const readyCount = readyOrders.length;
  const pendingCount = pendingOrders.length;

  const exportToExcel = () => {
    const rows: any[] = [];

    // Add pending orders
    sortedPendingOrders.forEach(([key, item]) => {
      item.orders.forEach((order, idx) => {
        rows.push({
          'Status': idx === 0 ? 'Na spracovanie' : '',
          'Položka': idx === 0 ? item.name : '',
          'Zákazník': order.customerName,
          'Balenie': `1x ${order.packagingSize}`,
          'Množstvo': '1 ks',
          'Etiketa': order.hasLabel ? 'Áno' : 'Nie',
        });
      });
    });

    // Add ready orders
    if (readyOrders.length > 0) {
      rows.push({});
      rows.push({ 'Status': 'ZABALENÉ' });
      sortedReadyOrders.forEach(([key, item]) => {
        item.orders.forEach((order, idx) => {
          rows.push({
            'Status': '',
            'Položka': idx === 0 ? item.name : '',
            'Zákazník': order.customerName,
            'Balenie': `1x ${order.packagingSize}`,
            'Množstvo': '1 ks',
            'Etiketa': order.hasLabel ? 'Áno' : 'Nie',
          });
        });
      });
    }


    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Zber úrody');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 25 },
      { wch: 12 },
      { wch: 10 },
    ];

    XLSX.writeFile(wb, `zber-urody-${format(selectedDate, 'yyyy-MM-dd')}.xlsx`);
  };

  // HTML escape function to prevent XSS attacks
  const escapeHtml = (unsafe: string): string => {
    return unsafe.replace(/[&<>"']/g, (m) => {
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return escapeMap[m] || m;
    });
  };

  const exportToPDF = () => {
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Zber úrody - ${format(selectedDate, 'd. MMMM yyyy', { locale: sk })}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .section { margin-top: 30px; }
          .section h2 { font-size: 18px; margin-bottom: 10px; }
          .checkbox { width: 20px; height: 20px; border: 2px solid #333; display: inline-block; margin-right: 10px; }
        </style>
      </head>
      <body>
        <h1>Zber úrody - ${format(selectedDate, 'd. MMMM yyyy', { locale: sk })}</h1>

        <div class="section">
          <h2>Na spracovanie (${pendingCount})</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">✓</th>
                <th>Položka</th>
                <th>Zákazník</th>
                <th>Balenie</th>
                <th>Etiketa</th>
              </tr>
            </thead>
            <tbody>
              ${sortedPendingOrders.map(([key, item]) =>
                item.orders.map((order, idx) => `
                  <tr>
                    <td><span class="checkbox"></span></td>
                    <td>${idx === 0 ? escapeHtml(item.name) : ''}</td>
                    <td>${escapeHtml(order.customerName)}</td>
                    <td>1x ${escapeHtml(order.packagingSize)}</td>
                    <td>${order.hasLabel ? '✓' : '—'}</td>
                  </tr>
                `).join('')
              ).join('')}
            </tbody>
          </table>
        </div>

        ${readyOrders.length > 0 ? `
        <div class="section">
          <h2>Zabalené (${readyCount})</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">✓</th>
                <th>Položka</th>
                <th>Zákazník</th>
                <th>Balenie</th>
                <th>Etiketa</th>
              </tr>
            </thead>
            <tbody>
              ${sortedReadyOrders.map(([key, item]) =>
                item.orders.map((order, idx) => `
                  <tr>
                    <td><span class="checkbox"></span></td>
                    <td>${idx === 0 ? escapeHtml(item.name) : ''}</td>
                    <td>${escapeHtml(order.customerName)}</td>
                    <td>1x ${escapeHtml(order.packagingSize)}</td>
                    <td>${order.hasLabel ? '✓' : '—'}</td>
                  </tr>
                `).join('')
              ).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Dates with harvests for calendar highlighting
  const harvestDates = plantingPlans
    .filter(p => p.status !== 'harvested' && p.expected_harvest_date)
    .map(p => startOfDay(new Date(p.expected_harvest_date!)));

  const orderDates = orders
    .filter(o => o.status !== 'delivered' && o.status !== 'cancelled' && o.delivery_date)
    .map(o => startOfDay(new Date(o.delivery_date!)));

  return (
    <MainLayout>
      <PageHeader 
        title="Zber úrody" 
        description="Prehľad položiek na zber a balenie"
      >
        <Button variant="outline" onClick={exportToExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel
        </Button>
        <Button variant="outline" onClick={exportToPDF} className="gap-2">
          <FileText className="h-4 w-4" />
          Export PDF
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Dátum zberu</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'd. MMMM yyyy', { locale: sk }) : "Vyberte dátum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={sk}
                  initialFocus
                  modifiers={{
                    harvest: harvestDates,
                    orders: orderDates,
                  }}
                  modifiersStyles={{
                    harvest: {
                      backgroundColor: 'hsl(var(--success) / 0.2)',
                      borderRadius: '50%',
                    },
                    orders: {
                      border: '2px solid hsl(var(--primary))',
                      borderRadius: '50%',
                    },
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'pending' | 'ready')}>
              <SelectTrigger className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetko</SelectItem>
                <SelectItem value="pending">Na spracovanie</SelectItem>
                <SelectItem value="ready">Hotovo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Typ zákazníka</label>
            <Select value={selectedCustomerType} onValueChange={setSelectedCustomerType}>
              <SelectTrigger className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Všetci zákazníci" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetci zákazníci</SelectItem>
                <SelectItem value="home">Domáci zákazníci</SelectItem>
                <SelectItem value="gastro">Gastro</SelectItem>
                <SelectItem value="wholesale">Veľkoobchod</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        {/* Summary Card */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Scissors className="h-5 w-5 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {format(selectedDate, 'd. MMMM yyyy', { locale: sk })}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {totalItemsCount} položiek celkom • {pendingCount} na spracovanie • {readyCount} hotových
                </p>
              </div>
            </div>
            {pendingCount > 0 && statusFilter !== 'ready' && (
              <div className="flex gap-2">
                {selectedOrderIds.size > 0 && (
                  <Button
                    size="sm"
                    onClick={markSelectedReady}
                    variant="outline"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Označiť vybrané ({selectedOrderIds.size})
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={markAllReady}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Všetko pripravené
                </Button>
              </div>
            )}
          </div>
        </Card>

        {sortedPendingOrders.length === 0 && sortedReadyOrders.length === 0 ? (
          <EmptyState
            icon={<Scissors className="h-8 w-8" />}
            title="Žiadne položky"
            description="Na tento deň nie sú naplánované žiadne zbery."
          />
        ) : (
          <div className="space-y-6">
            {/* Pending Orders Section */}
            {sortedPendingOrders.length > 0 && statusFilter !== 'ready' && (
              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Scissors className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Na spracovanie</h3>
                    <p className="text-sm text-muted-foreground">
                      {pendingCount} {pendingCount === 1 ? 'položka' : pendingCount < 5 ? 'položky' : 'položiek'} na zber a balenie
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedOrderIds.size === pendingOrders.length && pendingOrders.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedOrderIds(new Set(pendingOrders.map(o => o.id)));
                              } else {
                                setSelectedOrderIds(new Set());
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Položka</TableHead>
                        <TableHead>Zákazník</TableHead>
                        <TableHead className="hidden md:table-cell">Balenie</TableHead>
                        <TableHead className="hidden sm:table-cell">Množstvo</TableHead>
                        <TableHead className="hidden lg:table-cell">Etiketa</TableHead>
                        <TableHead className="hidden md:table-cell">Akcia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPendingOrders.map(([key, item]) => (
                        item.orders.map((order, orderIdx) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedOrderIds.has(order.id)}
                                onCheckedChange={() => toggleOrderSelection(order.id)}
                              />
                            </TableCell>
                            {orderIdx === 0 ? (
                              <TableCell rowSpan={item.orders.length} className="font-medium">
                                <div className="flex items-center gap-2">
                                  {item.cropId && (
                                    <div
                                      className="h-3 w-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: getCropColor(item.cropId) }}
                                    />
                                  )}
                                  <span className="truncate">{item.name}</span>
                                </div>
                              </TableCell>
                            ) : null}
                            <TableCell>
                              <span className="truncate">{order.customerName}</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              1x {order.packagingSize}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              1 ks
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {order.hasLabel ? '✓ Áno' : '— Nie'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markOrderReady(order.id)}
                                className="gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Hotovo
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Ready Orders Section */}
            {sortedReadyOrders.length > 0 && statusFilter !== 'pending' && (
              <Card className="p-4 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Dnes hotové</h3>
                    <p className="text-sm text-muted-foreground">
                      {readyCount} {readyCount === 1 ? 'položka' : readyCount < 5 ? 'položky' : 'položiek'} zabalených
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Položka</TableHead>
                        <TableHead>Zákazník</TableHead>
                        <TableHead className="hidden md:table-cell">Balenie</TableHead>
                        <TableHead className="hidden sm:table-cell">Množstvo</TableHead>
                        <TableHead className="hidden lg:table-cell">Etiketa</TableHead>
                        <TableHead className="hidden md:table-cell">Akcia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedReadyOrders.map(([key, item]) => (
                        item.orders.map((order, orderIdx) => (
                          <TableRow key={order.id} className="bg-success/5">
                            {orderIdx === 0 ? (
                              <TableCell rowSpan={item.orders.length} className="font-medium">
                                <div className="flex items-center gap-2">
                                  {item.cropId && (
                                    <div
                                      className="h-3 w-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: getCropColor(item.cropId) }}
                                    />
                                  )}
                                  <span className="truncate">{item.name}</span>
                                </div>
                              </TableCell>
                            ) : null}
                            <TableCell className="text-muted-foreground">
                              <span className="truncate">{order.customerName}</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              1x {order.packagingSize}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground">
                              1 ks
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {order.hasLabel ? '✓ Áno' : '— Nie'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markOrderPending(order.id)}
                                className="gap-1"
                              >
                                <Undo2 className="h-3 w-3" />
                                Späť
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
