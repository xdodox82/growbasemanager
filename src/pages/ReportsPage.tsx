import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-components';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrders, useCustomers, useCrops, useBlends, useSeeds, usePackagings, useSubstrates, useOtherInventory, usePlantingPlans, useSuppliers, useLabels } from '@/hooks/useSupabaseData';
import { FileSpreadsheet, ShoppingCart, Package, TrendingUp, Leaf, BarChart3, FileText, Sprout, Box, Layers, Tag, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, eachMonthOfInterval, differenceInDays } from 'date-fns';
import { sk } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'orders' | 'inventory' | 'production';
type InventorySubType = 'all' | 'seeds' | 'packagings' | 'substrates' | 'labels';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ReportsPage() {
  const { data: orders } = useOrders();
  const { data: customers } = useCustomers();
  const { data: crops } = useCrops();
  const { data: blends } = useBlends();
  const { data: seeds } = useSeeds();
  const { data: packagings } = usePackagings();
  const { data: substrates } = useSubstrates();
  const { data: otherInventory } = useOtherInventory();
  const { data: plantingPlans } = usePlantingPlans();
  const { data: suppliers } = useSuppliers();
  const { data: labels } = useLabels();
  
  const [reportType, setReportType] = useState<ReportType>('orders');
  const [inventorySubType, setInventorySubType] = useState<InventorySubType>('all');
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return 'Neznámy zákazník';
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Neznámy zákazník';
    return customer.company_name || customer.name || 'Neznámy zákazník';
  };

  const getCropName = (cropId: string | null) => {
    if (!cropId) return 'Neznáma plodina';
    return crops.find(c => c.id === cropId)?.name || 'Neznáma plodina';
  };

  const getBlendName = (blendId: string | null) => {
    if (!blendId) return 'Neznáma zmes';
    return blends.find(b => b.id === blendId)?.name || 'Neznáma zmes';
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return '-';
    return suppliers.find(s => s.id === supplierId)?.name || '-';
  };

  // Orders report data
  const filteredOrders = orders.filter(order => {
    if (!order.delivery_date) return false;
    const orderDate = new Date(order.delivery_date);
    return isWithinInterval(orderDate, {
      start: new Date(dateFrom),
      end: new Date(dateTo),
    });
  });

  const orderStats = {
    total: filteredOrders.length,
    pending: filteredOrders.filter(o => o.status === 'pending').length,
    growing: filteredOrders.filter(o => o.status === 'growing').length,
    ready: filteredOrders.filter(o => o.status === 'ready').length,
    delivered: filteredOrders.filter(o => o.status === 'delivered').length,
    cancelled: filteredOrders.filter(o => o.status === 'cancelled').length,
  };

  // Group orders by crop/blend
  const totalQuantityByItem = filteredOrders.reduce((acc, order) => {
    const key = order.crop_id || order.blend_id || 'unknown';
    const name = order.crop_id ? getCropName(order.crop_id) : order.blend_id ? getBlendName(order.blend_id) : 'Neznáme';
    if (!acc[key]) {
      acc[key] = { name, quantity: 0 };
    }
    acc[key].quantity += order.quantity || 0;
    return acc;
  }, {} as Record<string, { name: string; quantity: number }>);

  // Chart data for orders by status
  const orderStatusChartData = [
    { name: 'Čakajúce', value: orderStats.pending, color: '#f59e0b' },
    { name: 'V pestovaní', value: orderStats.growing, color: '#3b82f6' },
    { name: 'Pripravené', value: orderStats.ready, color: '#22c55e' },
    { name: 'Doručené', value: orderStats.delivered, color: '#8b5cf6' },
    { name: 'Zrušené', value: orderStats.cancelled, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Chart data for items quantity
  const itemsChartData = Object.values(totalQuantityByItem)
    .map((item, index) => ({
      name: item.name,
      quantity: item.quantity,
      fill: COLORS[index % COLORS.length]
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  // Detailed inventory stats
  const seedsStats = useMemo(() => {
    const totalQuantity = seeds.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const lowStock = seeds.filter(s => s.min_stock && s.quantity < s.min_stock).length;
    const expiringSoon = seeds.filter(s => {
      if (!s.expiry_date) return false;
      const daysToExpiry = differenceInDays(new Date(s.expiry_date), new Date());
      return daysToExpiry > 0 && daysToExpiry <= 30;
    }).length;
    const byCrop = seeds.reduce((acc, s) => {
      const name = getCropName(s.crop_id);
      if (!acc[name]) acc[name] = { quantity: 0, count: 0 };
      acc[name].quantity += s.quantity || 0;
      acc[name].count += 1;
      return acc;
    }, {} as Record<string, { quantity: number; count: number }>);
    
    return { totalQuantity, lowStock, expiringSoon, byCrop, count: seeds.length };
  }, [seeds, crops]);

  const packagingsStats = useMemo(() => {
    const totalQuantity = packagings.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const lowStock = packagings.filter(p => p.min_stock && p.quantity < p.min_stock).length;
    const byType = packagings.reduce((acc, p) => {
      const type = p.type || 'Neurčený';
      if (!acc[type]) acc[type] = { quantity: 0, count: 0 };
      acc[type].quantity += p.quantity || 0;
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, { quantity: number; count: number }>);
    const bySize = packagings.reduce((acc, p) => {
      const size = p.size || 'Neurčená';
      if (!acc[size]) acc[size] = { quantity: 0, count: 0 };
      acc[size].quantity += p.quantity || 0;
      acc[size].count += 1;
      return acc;
    }, {} as Record<string, { quantity: number; count: number }>);
    
    return { totalQuantity, lowStock, byType, bySize, count: packagings.length };
  }, [packagings]);

  const substratesStats = useMemo(() => {
    const totalQuantity = substrates.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const lowStock = substrates.filter(s => s.min_stock && s.quantity < s.min_stock).length;
    const byType = substrates.reduce((acc, s) => {
      const type = s.type || 'Neurčený';
      if (!acc[type]) acc[type] = { quantity: 0, count: 0 };
      acc[type].quantity += s.quantity || 0;
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, { quantity: number; count: number }>);
    
    return { totalQuantity, lowStock, byType, count: substrates.length };
  }, [substrates]);

  const labelsStats = useMemo(() => {
    const totalQuantity = labels.reduce((sum, l) => sum + (l.quantity || 0), 0);
    const lowStock = labels.filter(l => l.min_stock && l.quantity < l.min_stock).length;
    const byType = labels.reduce((acc, l) => {
      const type = l.type || 'Štandard';
      if (!acc[type]) acc[type] = { quantity: 0, count: 0 };
      acc[type].quantity += l.quantity || 0;
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, { quantity: number; count: number }>);
    
    return { totalQuantity, lowStock, byType, count: labels.length };
  }, [labels]);

  // Inventory chart data by type
  const inventoryChartData = [
    { name: 'Semená', value: seeds.length, color: '#22c55e' },
    { name: 'Obaly', value: packagings.length, color: '#3b82f6' },
    { name: 'Substrát', value: substrates.length, color: '#f59e0b' },
    { name: 'Štítky', value: labels.length, color: '#8b5cf6' },
    { name: 'Ostatné', value: otherInventory.length, color: '#ec4899' },
  ].filter(d => d.value > 0);

  // All inventory for basic export
  const allInventory = [
    ...seeds.map(s => ({
      name: getCropName(s.crop_id),
      quantity: `${s.quantity} ${s.unit || 'g'}`,
      supplier: getSupplierName(s.supplier_id),
      type: 'Semená',
    })),
    ...packagings.map(p => ({
      name: p.name,
      quantity: `${p.quantity} ks`,
      supplier: getSupplierName(p.supplier_id),
      type: 'Obaly',
    })),
    ...substrates.map(s => ({
      name: s.name,
      quantity: `${s.quantity} ${s.unit || 'kg'}`,
      supplier: getSupplierName(s.supplier_id),
      type: 'Substrát',
    })),
    ...labels.map(l => ({
      name: l.name,
      quantity: `${l.quantity} ks`,
      supplier: getSupplierName(l.supplier_id),
      type: 'Štítky',
    })),
    ...otherInventory.map(o => ({
      name: o.name,
      quantity: `${o.quantity} ${o.unit || 'ks'}`,
      supplier: '-',
      type: 'Ostatné',
    })),
  ];

  // Production report data
  const productionStats = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthPlans = plantingPlans.filter(plan => {
        const sowDate = new Date(plan.sow_date);
        return isWithinInterval(sowDate, { start: monthStart, end: monthEnd });
      });

      const harvestedPlans = monthPlans.filter(p => p.status === 'harvested');

      return {
        month: format(month, 'MMM', { locale: sk }),
        sown: monthPlans.length,
        harvested: harvestedPlans.length,
        trays: monthPlans.reduce((sum, p) => sum + (p.tray_count || 1), 0)
      };
    });
  }, [plantingPlans]);

  const productionByCrop = useMemo(() => {
    const byCrop: Record<string, { name: string; trays: number; color: string }> = {};
    
    plantingPlans.forEach(plan => {
      const planDate = new Date(plan.sow_date);
      if (isWithinInterval(planDate, { start: new Date(dateFrom), end: new Date(dateTo) })) {
        const cropId = plan.crop_id;
        if (!cropId) return;
        const crop = crops.find(c => c.id === cropId);
        if (!byCrop[cropId]) {
          byCrop[cropId] = {
            name: crop?.name || 'Neznáma',
            trays: 0,
            color: crop?.color || '#888888'
          };
        }
        byCrop[cropId].trays += plan.tray_count || 1;
      }
    });

    return Object.values(byCrop).sort((a, b) => b.trays - a.trays);
  }, [plantingPlans, crops, dateFrom, dateTo]);

  const exportOrdersToCSV = () => {
    const headers = ['Dátum', 'Zákazník', 'Stav', 'Položka', 'Množstvo'];
    const rows = filteredOrders.map(order => [
      order.delivery_date ? format(new Date(order.delivery_date), 'dd.MM.yyyy') : '-',
      getCustomerName(order.customer_id),
      order.status || '-',
      order.crop_id ? getCropName(order.crop_id) : order.blend_id ? getBlendName(order.blend_id) : '-',
      `${order.quantity} ${order.unit || 'g'}`,
    ]);

    const csvContent = [
      `Report objednávok - ${format(new Date(dateFrom), 'd.M.yyyy')} - ${format(new Date(dateTo), 'd.M.yyyy')}`,
      '',
      headers.join(';'),
      ...rows.map(row => row.join(';')),
      '',
      'Súhrn podľa položiek:',
      'Položka;Celkové množstvo (g)',
      ...Object.values(totalQuantityByItem).map(item => `${item.name};${item.quantity}`),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report-objednavok-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportInventoryToCSV = () => {
    const headers = ['Typ', 'Názov', 'Množstvo', 'Dodávateľ'];
    const rows = allInventory.map(item => [
      item.type,
      item.name,
      item.quantity,
      item.supplier,
    ]);

    const csvContent = [
      `Report zásob - ${format(new Date(), 'd.M.yyyy')}`,
      '',
      headers.join(';'),
      ...rows.map(row => row.join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report-zasob-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportProductionToCSV = () => {
    const headers = ['Plodina', 'Počet tácov'];
    const rows = productionByCrop.map(item => [
      item.name,
      item.trays.toString(),
    ]);

    const csvContent = [
      `Report produkcie - ${format(new Date(dateFrom), 'd.M.yyyy')} - ${format(new Date(dateTo), 'd.M.yyyy')}`,
      '',
      headers.join(';'),
      ...rows.map(row => row.join(';')),
      '',
      'Mesačná štatistika:',
      'Mesiac;Vysiate;Zozbierané;Tácov',
      ...productionStats.map(s => `${s.month};${s.sown};${s.harvested};${s.trays}`),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report-produkcie-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportOrdersToExcel = () => {
    const data = filteredOrders.map(order => ({
      'Číslo': (order as any).order_number || '-',
      'Dátum': order.delivery_date ? format(new Date(order.delivery_date), 'dd.MM.yyyy') : '-',
      'Zákazník': getCustomerName(order.customer_id),
      'Stav': order.status || '-',
      'Položka': order.crop_id ? getCropName(order.crop_id) : order.blend_id ? getBlendName(order.blend_id) : '-',
      'Množstvo': order.quantity,
      'Jednotka': order.unit || 'g',
      'Forma': order.delivery_form === 'cut' ? 'Rezaná' : order.delivery_form === 'live' ? 'Živá' : order.delivery_form || '-',
      'Balenie': order.packaging_size || '-',
      'Poznámky': order.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Objednávky');
    
    // Add summary sheet
    const summaryData = Object.values(totalQuantityByItem).map(item => ({
      'Položka': item.name,
      'Celkové množstvo (g)': item.quantity,
    }));
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Súhrn');
    
    XLSX.writeFile(wb, `objednavky-${format(new Date(dateFrom), 'yyyy-MM-dd')}-${format(new Date(dateTo), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportOrdersToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Report objednávok', 14, 20);
    doc.setFontSize(10);
    doc.text(`Obdobie: ${format(new Date(dateFrom), 'd.M.yyyy')} - ${format(new Date(dateTo), 'd.M.yyyy')}`, 14, 28);
    
    const tableData = filteredOrders.map(order => [
      (order as any).order_number || '-',
      order.delivery_date ? format(new Date(order.delivery_date), 'dd.MM.yyyy') : '-',
      getCustomerName(order.customer_id),
      order.status || '-',
      order.crop_id ? getCropName(order.crop_id) : order.blend_id ? getBlendName(order.blend_id) : '-',
      `${order.quantity} ${order.unit || 'g'}`,
    ]);

    autoTable(doc, {
      head: [['#', 'Dátum', 'Zákazník', 'Stav', 'Položka', 'Množstvo']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    doc.save(`objednavky-${format(new Date(dateFrom), 'yyyy-MM-dd')}-${format(new Date(dateTo), 'yyyy-MM-dd')}.pdf`);
  };

  const exportInventoryToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(allInventory.map(item => ({
      'Typ': item.type,
      'Názov': item.name,
      'Množstvo': item.quantity,
      'Dodávateľ': item.supplier,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Zásoby');
    XLSX.writeFile(wb, `zasoby-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportInventoryToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Report zásob', 14, 20);
    doc.setFontSize(10);
    doc.text(`Dátum: ${format(new Date(), 'd.M.yyyy')}`, 14, 28);
    
    autoTable(doc, {
      head: [['Typ', 'Názov', 'Množstvo', 'Dodávateľ']],
      body: allInventory.map(item => [item.type, item.name, item.quantity, item.supplier]),
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    });
    doc.save(`zasoby-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportProductionToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(productionByCrop.map(item => ({
      'Plodina': item.name,
      'Počet tácov': item.trays,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produkcia');
    
    const wsMonthly = XLSX.utils.json_to_sheet(productionStats.map(s => ({
      'Mesiac': s.month,
      'Vysiate': s.sown,
      'Zozbierané': s.harvested,
      'Tácov': s.trays,
    })));
    XLSX.utils.book_append_sheet(wb, wsMonthly, 'Mesačná štatistika');
    XLSX.writeFile(wb, `produkcia-${format(new Date(dateFrom), 'yyyy-MM-dd')}-${format(new Date(dateTo), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportProductionToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Report produkcie', 14, 20);
    doc.setFontSize(10);
    doc.text(`Obdobie: ${format(new Date(dateFrom), 'd.M.yyyy')} - ${format(new Date(dateTo), 'd.M.yyyy')}`, 14, 28);
    
    autoTable(doc, {
      head: [['Plodina', 'Počet tácov']],
      body: productionByCrop.map(item => [item.name, item.trays.toString()]),
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    });
    doc.save(`produkcia-${format(new Date(dateFrom), 'yyyy-MM-dd')}-${format(new Date(dateTo), 'yyyy-MM-dd')}.pdf`);
  };

  const handleExport = () => {
    switch (reportType) {
      case 'orders':
        exportOrdersToCSV();
        break;
      case 'inventory':
        exportInventoryToCSV();
        break;
      case 'production':
        exportProductionToCSV();
        break;
    }
  };

  return (
    <MainLayout>
      <PageHeader 
        title="Reporty" 
        description="Prehľady, štatistiky a export dát"
      />

      <div className="space-y-6">
        {/* Report type selector */}
        <Card className="p-4 md:p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 w-full sm:w-auto">
              <Label>Typ reportu</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orders">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Objednávky
                    </div>
                  </SelectItem>
                  <SelectItem value="inventory">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Zásoby
                    </div>
                  </SelectItem>
                  <SelectItem value="production">
                    <div className="flex items-center gap-2">
                      <Leaf className="h-4 w-4" />
                      Produkcia
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(reportType === 'orders' || reportType === 'production') && (
              <>
                <div className="space-y-2">
                  <Label>Od</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Do</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button onClick={handleExport} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
            {reportType === 'orders' && (
              <>
                <Button onClick={exportOrdersToExcel} variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button onClick={exportOrdersToPDF} variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
              </>
            )}
            {reportType === 'inventory' && (
              <>
                <Button onClick={exportInventoryToExcel} variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button onClick={exportInventoryToPDF} variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
              </>
            )}
            {reportType === 'production' && (
              <>
                <Button onClick={exportProductionToExcel} variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button onClick={exportProductionToPDF} variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Orders Report */}
        {reportType === 'orders' && (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Celkom</p>
                <p className="text-2xl font-bold">{orderStats.total}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Čakajúce</p>
                <p className="text-2xl font-bold text-warning">{orderStats.pending}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">V pestovaní</p>
                <p className="text-2xl font-bold text-info">{orderStats.growing}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Pripravené</p>
                <p className="text-2xl font-bold text-success">{orderStats.ready}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Doručené</p>
                <p className="text-2xl font-bold text-primary">{orderStats.delivered}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Zrušené</p>
                <p className="text-2xl font-bold text-destructive">{orderStats.cancelled}</p>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-4 md:p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Stav objednávok
                </h3>
                {orderStatusChartData.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderStatusChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {orderStatusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Žiadne dáta</p>
                )}
              </Card>

              <Card className="p-4 md:p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top položky podľa množstva
                </h3>
                {itemsChartData.length > 0 ? (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={itemsChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip formatter={(value) => [`${value} g`, 'Množstvo']} />
                        <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Žiadne dáta</p>
                )}
              </Card>
            </div>

            {/* Orders list */}
            <Card className="p-4 md:p-6 overflow-hidden">
              <h3 className="font-semibold mb-4">Zoznam objednávok</h3>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Zákazník</TableHead>
                      <TableHead className="hidden sm:table-cell">Stav</TableHead>
                      <TableHead>Položka</TableHead>
                      <TableHead className="text-right">Množstvo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.delivery_date ? format(new Date(order.delivery_date), 'dd.MM.yyyy') : '-'}</TableCell>
                        <TableCell className="font-medium">{getCustomerName(order.customer_id)}</TableCell>
                        <TableCell className="hidden sm:table-cell">{order.status}</TableCell>
                        <TableCell>{order.crop_id ? getCropName(order.crop_id) : order.blend_id ? getBlendName(order.blend_id) : '-'}</TableCell>
                        <TableCell className="text-right">
                          {order.quantity} {order.unit || 'g'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Žiadne objednávky pre vybraté obdobie
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {/* Inventory Report */}
        {reportType === 'inventory' && (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sprout className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-muted-foreground">Semená</p>
                </div>
                <p className="text-2xl font-bold">{seedsStats.count}</p>
                {seedsStats.lowStock > 0 && (
                  <Badge variant="destructive" className="mt-1 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {seedsStats.lowStock} nízky stav
                  </Badge>
                )}
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Box className="h-4 w-4 text-blue-500" />
                  <p className="text-sm text-muted-foreground">Obaly</p>
                </div>
                <p className="text-2xl font-bold">{packagingsStats.count}</p>
                {packagingsStats.lowStock > 0 && (
                  <Badge variant="destructive" className="mt-1 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {packagingsStats.lowStock} nízky stav
                  </Badge>
                )}
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="h-4 w-4 text-amber-500" />
                  <p className="text-sm text-muted-foreground">Substrát</p>
                </div>
                <p className="text-2xl font-bold">{substratesStats.count}</p>
                {substratesStats.lowStock > 0 && (
                  <Badge variant="destructive" className="mt-1 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {substratesStats.lowStock} nízky stav
                  </Badge>
                )}
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="h-4 w-4 text-purple-500" />
                  <p className="text-sm text-muted-foreground">Štítky</p>
                </div>
                <p className="text-2xl font-bold">{labelsStats.count}</p>
                {labelsStats.lowStock > 0 && (
                  <Badge variant="destructive" className="mt-1 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {labelsStats.lowStock} nízky stav
                  </Badge>
                )}
              </Card>
            </div>

            {/* Detailed tabs */}
            <Card className="p-4 md:p-6">
              <Tabs defaultValue="seeds" className="w-full">
                <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
                  <TabsTrigger value="seeds" className="gap-2">
                    <Sprout className="h-4 w-4" />
                    <span className="hidden sm:inline">Semená</span>
                  </TabsTrigger>
                  <TabsTrigger value="packagings" className="gap-2">
                    <Box className="h-4 w-4" />
                    <span className="hidden sm:inline">Obaly</span>
                  </TabsTrigger>
                  <TabsTrigger value="substrates" className="gap-2">
                    <Layers className="h-4 w-4" />
                    <span className="hidden sm:inline">Substrát</span>
                  </TabsTrigger>
                  <TabsTrigger value="labels" className="gap-2">
                    <Tag className="h-4 w-4" />
                    <span className="hidden sm:inline">Štítky</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="seeds">
                  <div className="rounded-lg border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plodina</TableHead>
                          <TableHead>Množstvo</TableHead>
                          <TableHead className="hidden md:table-cell">Min. stav</TableHead>
                          <TableHead className="hidden sm:table-cell">Šarža</TableHead>
                          <TableHead className="hidden lg:table-cell">Expirácia</TableHead>
                          <TableHead className="hidden md:table-cell">Dodávateľ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seeds.map((seed) => {
                          const isLow = seed.min_stock && seed.quantity < seed.min_stock;
                          return (
                            <TableRow key={seed.id} className={isLow ? 'bg-destructive/10' : ''}>
                              <TableCell className="font-medium">{getCropName(seed.crop_id)}</TableCell>
                              <TableCell>{seed.quantity} {seed.unit || 'g'}</TableCell>
                              <TableCell className="hidden md:table-cell">{seed.min_stock || '-'}</TableCell>
                              <TableCell className="hidden sm:table-cell">{seed.lot_number || '-'}</TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {seed.expiry_date ? format(new Date(seed.expiry_date), 'dd.MM.yyyy') : '-'}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">{getSupplierName(seed.supplier_id)}</TableCell>
                            </TableRow>
                          );
                        })}
                        {seeds.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">Žiadne semená</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="packagings">
                  <div className="rounded-lg border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Názov</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Veľkosť</TableHead>
                          <TableHead>Množstvo</TableHead>
                          <TableHead className="hidden md:table-cell">Min. stav</TableHead>
                          <TableHead className="hidden sm:table-cell">Dodávateľ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packagings.map((pkg) => {
                          const isLow = pkg.min_stock && pkg.quantity < pkg.min_stock;
                          return (
                            <TableRow key={pkg.id} className={isLow ? 'bg-destructive/10' : ''}>
                              <TableCell className="font-medium">{pkg.name}</TableCell>
                              <TableCell>{pkg.type || '-'}</TableCell>
                              <TableCell>{pkg.size || '-'}</TableCell>
                              <TableCell>{pkg.quantity} ks</TableCell>
                              <TableCell className="hidden md:table-cell">{pkg.min_stock || '-'}</TableCell>
                              <TableCell className="hidden sm:table-cell">{getSupplierName(pkg.supplier_id)}</TableCell>
                            </TableRow>
                          );
                        })}
                        {packagings.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">Žiadne obaly</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="substrates">
                  <div className="rounded-lg border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Názov</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Množstvo</TableHead>
                          <TableHead className="hidden md:table-cell">Min. stav</TableHead>
                          <TableHead className="hidden sm:table-cell">Dodávateľ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {substrates.map((sub) => {
                          const isLow = sub.min_stock && sub.quantity < sub.min_stock;
                          return (
                            <TableRow key={sub.id} className={isLow ? 'bg-destructive/10' : ''}>
                              <TableCell className="font-medium">{sub.name}</TableCell>
                              <TableCell>{sub.type || '-'}</TableCell>
                              <TableCell>{sub.quantity} {sub.unit || 'kg'}</TableCell>
                              <TableCell className="hidden md:table-cell">{sub.min_stock || '-'}</TableCell>
                              <TableCell className="hidden sm:table-cell">{getSupplierName(sub.supplier_id)}</TableCell>
                            </TableRow>
                          );
                        })}
                        {substrates.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">Žiadny substrát</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="labels">
                  <div className="rounded-lg border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Názov</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Veľkosť</TableHead>
                          <TableHead>Množstvo</TableHead>
                          <TableHead className="hidden md:table-cell">Min. stav</TableHead>
                          <TableHead className="hidden sm:table-cell">Dodávateľ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {labels.map((label) => {
                          const isLow = label.min_stock && label.quantity < label.min_stock;
                          return (
                            <TableRow key={label.id} className={isLow ? 'bg-destructive/10' : ''}>
                              <TableCell className="font-medium">{label.name}</TableCell>
                              <TableCell>{label.type || '-'}</TableCell>
                              <TableCell>{label.size || '-'}</TableCell>
                              <TableCell>{label.quantity} ks</TableCell>
                              <TableCell className="hidden md:table-cell">{label.min_stock || '-'}</TableCell>
                              <TableCell className="hidden sm:table-cell">{getSupplierName(label.supplier_id)}</TableCell>
                            </TableRow>
                          );
                        })}
                        {labels.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">Žiadne štítky</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        )}

        {/* Production Report */}
        {reportType === 'production' && (
          <div className="space-y-6">
            {/* Monthly chart */}
            <Card className="p-4 md:p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Mesačná produkcia
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={productionStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sown" stroke="#22c55e" strokeWidth={2} name="Vysiate" />
                    <Line type="monotone" dataKey="harvested" stroke="#f59e0b" strokeWidth={2} name="Zozbierané" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Production by crop */}
            <Card className="p-4 md:p-6 overflow-hidden">
              <h3 className="font-semibold mb-4">Produkcia podľa plodiny</h3>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plodina</TableHead>
                      <TableHead className="text-right">Počet tácov</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionByCrop.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.trays}</TableCell>
                      </TableRow>
                    ))}
                    {productionByCrop.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          Žiadne dáta pre vybraté obdobie
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
