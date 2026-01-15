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
import { useOrders, useCustomers, useCrops, useBlends } from '@/hooks/useSupabaseData';
import { Package, FileSpreadsheet, FileText, CheckCircle2, CalendarIcon, Filter, Undo2 } from 'lucide-react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useInventoryConsumption } from '@/hooks/useInventoryConsumption';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function BaleniePage() {
  const { data: orders, update: updateOrder } = useOrders();
  const { data: customers } = useCustomers();
  const { data: crops } = useCrops();
  const { data: blends } = useBlends();
  const { toast } = useToast();
  const { consumeOrderInventory } = useInventoryConsumption();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'ready'>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Get orders that need to be packaged on the selected date
  // BALENIE: Only show BLEND orders (not crop orders - those are handled in Harvest)
  let ordersForDate = orders.filter(order =>
    order.delivery_date &&
    isSameDay(startOfDay(new Date(order.delivery_date)), startOfDay(selectedDate)) &&
    (order.status === 'ready' || order.status === 'confirmed') &&
    order.blend_id !== null  // Only blend orders
  );

  // Filter by customer type if selected
  if (selectedCustomerType !== 'all') {
    ordersForDate = ordersForDate.filter(order => {
      const customer = customers.find(c => c.id === order.customer_id);
      return customer?.customer_type === selectedCustomerType;
    });
  }

  // Split into pending (confirmed) and ready (packaged) AFTER filtering
  const pendingOrders = ordersForDate.filter(order => order.status === 'confirmed');
  const readyOrders = ordersForDate.filter(order => order.status === 'ready');

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
  const groupOrders = (ordersList: typeof orders) => {
    const grouped = ordersList.reduce((acc, order) => {
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

    // Sort orders within each group by customer, packaging size, label
    Object.values(grouped).forEach(group => {
      group.orders.sort((a, b) => {
        if (a.customerName !== b.customerName) return a.customerName.localeCompare(b.customerName);
        if (a.packagingSize !== b.packagingSize) return a.packagingSize.localeCompare(b.packagingSize);
        if (a.hasLabel !== b.hasLabel) return a.hasLabel ? -1 : 1;
        return 0;
      });
    });

    // Sort groups by crop harvest order
    return Object.entries(grouped).sort(([keyA, groupA], [keyB, groupB]) => {
      const cropA = crops.find(c => c.id === groupA.cropId);
      const cropB = crops.find(c => c.id === groupB.cropId);
      const orderA = (cropA as any)?.harvest_order ?? 999;
      const orderB = (cropB as any)?.harvest_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return groupA.name.localeCompare(groupB.name);
    });
  };

  // Group orders by crop/blend, then by packaging details for sorting
  const groupedOrders = ordersForDate.reduce((acc, order) => {
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
      status: order.status || 'confirmed',
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
      status: string;
    }[]
  }>);

  Object.values(groupedOrders).forEach(group => {
    group.orders.sort((a, b) => {
      if (a.customerName !== b.customerName) return a.customerName.localeCompare(b.customerName);
      if (a.packagingSize !== b.packagingSize) return a.packagingSize.localeCompare(b.packagingSize);
      if (a.hasLabel !== b.hasLabel) return a.hasLabel ? -1 : 1;
      return 0;
    });
  });

  const sortedGroupedOrders = Object.entries(groupedOrders).sort(([keyA, groupA], [keyB, groupB]) => {
    const cropA = crops.find(c => c.id === groupA.cropId);
    const cropB = crops.find(c => c.id === groupB.cropId);
    const orderA = (cropA as any)?.harvest_order ?? 999;
    const orderB = (cropB as any)?.harvest_order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return groupA.name.localeCompare(groupB.name);
  });

  // Group pending and ready orders separately
  const sortedPendingOrders = groupOrders(pendingOrders).sort(([keyA, groupA], [keyB, groupB]) => {
    // Prioritize blends (mixy) first
    const isBlendA = !!groupA.blendId;
    const isBlendB = !!groupB.blendId;
    if (isBlendA && !isBlendB) return -1;
    if (!isBlendA && isBlendB) return 1;

    // Then sort by harvest order
    const cropA = crops.find(c => c.id === groupA.cropId);
    const cropB = crops.find(c => c.id === groupB.cropId);
    const orderA = (cropA as any)?.harvest_order ?? 999;
    const orderB = (cropB as any)?.harvest_order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return groupA.name.localeCompare(groupB.name);
  });
  const sortedReadyOrders = groupOrders(readyOrders).sort(([keyA, groupA], [keyB, groupB]) => {
    // Prioritize blends (mixy) first
    const isBlendA = !!groupA.blendId;
    const isBlendB = !!groupB.blendId;
    if (isBlendA && !isBlendB) return -1;
    if (!isBlendA && isBlendB) return 1;

    // Then sort by harvest order
    const cropA = crops.find(c => c.id === groupA.cropId);
    const cropB = crops.find(c => c.id === groupB.cropId);
    const orderA = (cropA as any)?.harvest_order ?? 999;
    const orderB = (cropB as any)?.harvest_order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return groupA.name.localeCompare(groupB.name);
  });

  // Format packaging summary
  const getPackagingSummary = (summary: Record<string, number>) => {
    return Object.entries(summary)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([size, count]) => `${count}x ${size}`)
      .join(' + ');
  };

  const toggleItemComplete = (orderId: string) => {
    setCompletedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
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

  const markOrderPackaged = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    const { error } = await updateOrder(orderId, { status: 'ready' });
    if (!error) {
      if (order) {
        await consumeOrderInventory(
          order.crop_id || null,
          order.delivery_form || 'cut',
          order.packaging_size || '50g',
          Math.ceil(order.quantity || 1),
          order.has_label !== false
        );
      }

      setSelectedOrderIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
      toggleItemComplete(orderId);
      toast({
        title: 'Zabalené',
        description: 'Objednávka bola zabalená a zásoby boli odpočítané.',
      });
    }
  };

  const markSelectedPackaged = async () => {
    if (selectedOrderIds.size === 0) return;

    const promises = Array.from(selectedOrderIds).map(async (orderId) => {
      const order = orders.find(o => o.id === orderId);
      await updateOrder(orderId, { status: 'ready' });

      if (order) {
        await consumeOrderInventory(
          order.crop_id || null,
          order.delivery_form || 'cut',
          order.packaging_size || '50g',
          Math.ceil(order.quantity || 1),
          order.has_label !== false
        );
      }
    });
    await Promise.all(promises);

    setSelectedOrderIds(new Set());
    toast({
      title: 'Vybrané zabalené',
      description: `${selectedOrderIds.size} objednávok bolo označených ako zabalené a zásoby odpočítané.`,
    });
  };

  const markOrderPending = async (orderId: string) => {
    const { error } = await updateOrder(orderId, { status: 'confirmed' });
    if (!error) {
      toast({
        title: 'Vrátené',
        description: 'Objednávka bola vrátená do zoznamu na balenie.',
      });
    }
  };

  const markOrderDelivered = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    const { error } = await updateOrder(orderId, { status: 'delivered' });
    if (!error) {
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

  const markAllPackaged = async () => {
    const promises = ordersForDate.map(order =>
      updateOrder(order.id, { status: 'ready' })
    );
    await Promise.all(promises);
    ordersForDate.forEach(order => toggleItemComplete(order.id));
    toast({
      title: 'Všetko zabalené',
      description: `${ordersForDate.length} objednávok bolo označených ako zabalených.`,
    });
  };

  const returnToPackaging = async (orderId: string) => {
    const { error } = await updateOrder(orderId, { status: 'confirmed' });
    if (!error) {
      toast({
        title: 'Vrátené na balenie',
        description: 'Objednávka bola vrátená do zoznamu na balenie.',
      });
    }
  };

  const completedCount = readyOrders.length;
  const totalItemsCount = ordersForDate.length;
  const pendingCount = pendingOrders.length;

  const exportToExcel = () => {
    const rows: any[] = [];

    sortedPendingOrders.forEach(([key, item]) => {
      item.orders.forEach((order, idx) => {
        rows.push({
          'Status': idx === 0 ? 'Na spracovanie' : '',
          'Položka': idx === 0 ? item.name : '',
          'Balenia': idx === 0 ? getPackagingSummary(item.packagingSummary) : '',
          'Zákazník': order.customerName,
          'Balenie': `1x ${order.packagingSize}`,
          'Etiketa': order.hasLabel ? 'Áno' : 'Nie',
        });
      });
    });

    if (sortedReadyOrders.length > 0) {
      rows.push({});
      rows.push({ 'Status': 'ZABALENÉ' });
      sortedReadyOrders.forEach(([key, item]) => {
        item.orders.forEach((order, idx) => {
          rows.push({
            'Status': '',
            'Položka': idx === 0 ? item.name : '',
            'Balenia': idx === 0 ? getPackagingSummary(item.packagingSummary) : '',
            'Zákazník': order.customerName,
            'Balenie': `1x ${order.packagingSize}`,
            'Etiketa': order.hasLabel ? 'Áno' : 'Nie',
          });
        });
      });
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Balenie');

    ws['!cols'] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 25 },
      { wch: 12 },
      { wch: 10 },
    ];

    XLSX.writeFile(wb, `balenie-${format(selectedDate, 'yyyy-MM-dd')}.xlsx`);
  };

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
        <title>Balenie - ${format(selectedDate, 'd. MMMM yyyy', { locale: sk })}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 20px; }
          h2 { font-size: 18px; margin-top: 30px; margin-bottom: 10px; background: #f5f5f5; padding: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .checkbox { width: 20px; height: 20px; border: 2px solid #333; display: inline-block; margin-right: 10px; }
          .section { margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <h1>Balenie - ${format(selectedDate, 'd. MMMM yyyy', { locale: sk })}</h1>

        <div class="section">
          <h2>Na spracovanie (${pendingCount})</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">✓</th>
                <th>Položka</th>
                <th>Balenia</th>
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
                    <td>${idx === 0 ? escapeHtml(getPackagingSummary(item.packagingSummary)) : ''}</td>
                    <td>${escapeHtml(order.customerName)}</td>
                    <td>1x ${escapeHtml(order.packagingSize)}</td>
                    <td>${order.hasLabel ? '✓' : '—'}</td>
                  </tr>
                `).join('')
              ).join('')}
            </tbody>
          </table>
        </div>

        ${sortedReadyOrders.length > 0 ? `
        <div class="section">
          <h2>Zabalené (${completedCount})</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">✓</th>
                <th>Položka</th>
                <th>Balenia</th>
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
                    <td>${idx === 0 ? escapeHtml(getPackagingSummary(item.packagingSummary)) : ''}</td>
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

  // Dates with orders for calendar highlighting
  const orderDates = orders
    .filter(o => (o.status === 'ready' || o.status === 'pending') && o.delivery_date)
    .map(o => startOfDay(new Date(o.delivery_date!)));

  return (
    <MainLayout>
      <PageHeader
        title="Balenie"
        description="Prehľad položiek na balenie"
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
            <label className="text-sm font-medium mb-2 block">Dátum balenia</label>
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
                    orders: orderDates,
                  }}
                  modifiersStyles={{
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
            <label className="text-sm font-medium mb-2 block">Typ zákazníka</label>
            <Select value={selectedCustomerType} onValueChange={setSelectedCustomerType}>
              <SelectTrigger className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Typ zákazníka" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetci zákazníci</SelectItem>
                <SelectItem value="home">Domáci zákazníci</SelectItem>
                <SelectItem value="gastro">Gastro</SelectItem>
                <SelectItem value="wholesale">Veľkoobchod</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Zobrazenie</label>
            <Select value={statusFilter} onValueChange={(value: 'all' | 'pending' | 'ready') => setStatusFilter(value)}>
              <SelectTrigger className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Zobraziť" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetko</SelectItem>
                <SelectItem value="pending">Len na balenie</SelectItem>
                <SelectItem value="ready">Len zabalené</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        {/* Summary Card */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {format(selectedDate, 'd. MMMM yyyy', { locale: sk })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {totalItemsCount} položiek celkom • {pendingCount} na balenie • {completedCount} zabalených
              </p>
            </div>
          </div>
        </Card>

        {sortedPendingOrders.length === 0 && sortedReadyOrders.length === 0 ? (
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title="Žiadne položky"
            description="Na tento deň nie sú naplánované žiadne balenia."
          />
        ) : (
          <>
            {/* Pending Orders Section */}
            {sortedPendingOrders.length > 0 && statusFilter !== 'ready' && (
              <Card className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Na spracovanie</h3>
                      <p className="text-sm text-muted-foreground">
                        {pendingCount} {pendingCount === 1 ? 'položka' : pendingCount < 5 ? 'položky' : 'položiek'} na zabalenie
                      </p>
                    </div>
                  </div>
                  {selectedOrderIds.size > 0 && (
                    <Button
                      size="sm"
                      onClick={markSelectedPackaged}
                      variant="outline"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Označiť vybrané ({selectedOrderIds.size})
                    </Button>
                  )}
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
                        <TableHead className="hidden sm:table-cell">Balenia</TableHead>
                        <TableHead>Zákazník</TableHead>
                        <TableHead className="hidden md:table-cell">Balenie</TableHead>
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
                              <>
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
                                <TableCell rowSpan={item.orders.length} className="font-semibold hidden sm:table-cell">
                                  {getPackagingSummary(item.packagingSummary)}
                                </TableCell>
                              </>
                            ) : null}
                            <TableCell>
                              <span className="truncate">{order.customerName}</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              1x {order.packagingSize}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {order.hasLabel ? '✓ Áno' : '— Nie'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markOrderPackaged(order.id)}
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
                    <h3 className="text-lg font-semibold">Zabalené dnes</h3>
                    <p className="text-sm text-muted-foreground">
                      {completedCount} {completedCount === 1 ? 'položka' : completedCount < 5 ? 'položky' : 'položiek'} pripravených na rozvoz
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Položka</TableHead>
                        <TableHead className="hidden sm:table-cell">Balenia</TableHead>
                        <TableHead>Zákazník</TableHead>
                        <TableHead className="hidden md:table-cell">Balenie</TableHead>
                        <TableHead className="hidden lg:table-cell">Etiketa</TableHead>
                        <TableHead className="hidden md:table-cell">Akcia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedReadyOrders.map(([key, item]) => (
                        item.orders.map((order, orderIdx) => (
                          <TableRow key={order.id} className="bg-success/5">
                            {orderIdx === 0 ? (
                              <>
                                <TableCell rowSpan={item.orders.length} className="font-medium text-muted-foreground">
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
                                <TableCell rowSpan={item.orders.length} className="font-semibold text-muted-foreground hidden sm:table-cell">
                                  {getPackagingSummary(item.packagingSummary)}
                                </TableCell>
                              </>
                            ) : null}
                            <TableCell className="text-muted-foreground">
                              <span className="truncate">{order.customerName}</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              1x {order.packagingSize}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {order.hasLabel ? '✓ Áno' : '— Nie'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => returnToPackaging(order.id)}
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
          </>
        )}
      </div>
    </MainLayout>
  );
}
