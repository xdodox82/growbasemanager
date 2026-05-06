import { useState } from 'react';
import { Plus, Grid3x3, List, FileSpreadsheet, FileText, Calendar as CalendarIcon, SlidersHorizontal, ChevronLeft, ChevronRight, Leaf, Sprout, Flower, Palette } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import { CustomerTypeFilter } from '@/components/filters/CustomerTypeFilter';
import { format, isSameDay, isToday, getDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { sk } from 'date-fns/locale';
import type { Customer, Crop, Blend, Route, Order } from './types';

interface Props {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onNewOrder: () => void;
  onBulkDateChange: () => void;
  filterCustomerType: string;
  onFilterCustomerTypeChange: (v: string) => void;
  customerFilter: string;
  onCustomerFilterChange: (v: string) => void;
  orderCategoryFilter: string;
  onOrderCategoryFilterChange: (v: string) => void;
  filterCrop: string;
  onFilterCropChange: (v: string) => void;
  filterRoute: string;
  onFilterRouteChange: (v: string) => void;
  showArchive: boolean;
  onShowArchiveChange: (v: boolean) => void;
  showCancelled: boolean;
  onShowCancelledChange: (v: boolean) => void;
  selectedDates: Date[];
  onSelectedDatesChange: (dates: Date[]) => void;
  calendarOpen: boolean;
  onCalendarOpenChange: (v: boolean) => void;
  calendarMonth: Date;
  onCalendarMonthChange: (v: Date) => void;
  customers: Customer[];
  crops: Crop[];
  blends: Blend[];
  routes: Route[];
  orders: Order[];
  getDeliveryDaysArray: () => number[];
}

export function OrdersTopBar({
  viewMode, onViewModeChange, onNewOrder, onBulkDateChange,
  filterCustomerType, onFilterCustomerTypeChange,
  customerFilter, onCustomerFilterChange,
  orderCategoryFilter, onOrderCategoryFilterChange,
  filterCrop, onFilterCropChange,
  filterRoute, onFilterRouteChange,
  showArchive, onShowArchiveChange,
  showCancelled, onShowCancelledChange,
  selectedDates, onSelectedDatesChange,
  calendarOpen, onCalendarOpenChange,
  calendarMonth, onCalendarMonthChange,
  customers, crops, blends, routes, orders,
  getDeliveryDaysArray,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const activeFilterCount = [
    customerFilter !== 'all',
    orderCategoryFilter !== 'all',
    filterCrop !== 'all',
    filterRoute !== 'all',
    showArchive,
    showCancelled,
    selectedDates.length > 0,
  ].filter(Boolean).length;

  const isDeliveryDay = (date: Date) => getDeliveryDaysArray().includes(getDay(date));
  const hasOrdersOnDate = (date: Date) =>
    orders.some(order => isSameDay(new Date(order.delivery_date), date));

  const goToPreviousMonth = () =>
    onCalendarMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  const goToNextMonth = () =>
    onCalendarMonthChange(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));

  const renderCalendar = () => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });
    const firstDayOfWeek = getDay(start);
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    return (
      <div className="w-[320px] p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-base">
            {format(calendarMonth, 'MMMM yyyy', { locale: sk })}
          </h3>
          <Button variant="ghost" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-600 w-9 h-6 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: paddingDays }).map((_, i) => <div key={`pad-${i}`} className="w-9 h-9" />)}
          {days.map(day => {
            const isDelivery = isDeliveryDay(day);
            const hasOrdersDay = hasOrdersOnDate(day);
            const today = isToday(day);
            const selected = selectedDates.some(d => isSameDay(d, day));
            let bgColor = 'bg-white hover:bg-gray-50';
            if (isDelivery) bgColor = 'bg-green-200 hover:bg-green-300';
            else if (hasOrdersDay) bgColor = 'bg-yellow-300 hover:bg-yellow-400';
            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  onSelectedDatesChange(
                    selectedDates.some(d => isSameDay(d, day))
                      ? selectedDates.filter(d => !isSameDay(d, day))
                      : [...selectedDates, day]
                  );
                }}
                className={`${bgColor} ${today ? 'ring-2 ring-green-600' : ''} ${selected ? 'ring-2 ring-blue-500' : ''} rounded-full w-9 h-9 flex items-center justify-center text-sm font-medium cursor-pointer transition-all`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-4 space-y-2 text-xs">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-200 border border-gray-300" /><span>Rozvozový deň</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-300 border border-gray-300" /><span>Objednávky</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full ring-2 ring-blue-500" /><span>Vybraný deň</span></div>
        </div>
      </div>
    );
  };

  const filteredCustomers = customers?.filter(c =>
    filterCustomerType === 'all' ? true : c.customer_type === filterCustomerType
  );

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] px-4 py-3 mb-4">
      {/* Main bar */}
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-[#0f172a] mr-auto">Objednávky</span>

        {/* Ďalšie filtre toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-medium transition-colors ${
            expanded || activeFilterCount > 0
              ? 'border-[#16a34a] text-[#16a34a] bg-[#f0fdf4]'
              : 'border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Ďalšie filtre
          {activeFilterCount > 0 && (
            <span className="ml-0.5 bg-[#16a34a] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Bulk date change */}
        <button
          onClick={onBulkDateChange}
          title="Zmena termínu"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f0fdf4] hover:text-[#16a34a] transition-colors"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>

        {/* Export */}
        <button className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-[#e2e8f0] text-xs font-medium text-[#64748b] hover:bg-[#f8fafc] transition-colors">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Export
        </button>

        {/* PDF */}
        <button
          title="PDF"
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] transition-colors"
        >
          <FileText className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-[#e2e8f0]" />

        {/* View toggle — desktop only */}
        <div className="hidden md:flex items-center gap-0.5">
          <button
            onClick={() => onViewModeChange('grid')}
            title="Mriežka"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#64748b]'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            title="Zoznam"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-[#f0fdf4] text-[#16a34a]' : 'text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#64748b]'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-[#e2e8f0]" />

        {/* New order */}
        <button
          onClick={onNewOrder}
          className="flex items-center gap-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nová objednávka
        </button>
      </div>

      {/* Expandable filters panel */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#e2e8f0]">
          <div className="flex flex-wrap gap-2 items-center">
            <CustomerTypeFilter value={filterCustomerType} onChange={onFilterCustomerTypeChange} showLabel={false} />

            <div className="w-[220px]">
              <SearchableCustomerSelect
                value={customerFilter}
                onValueChange={onCustomerFilterChange}
                customers={filteredCustomers}
                placeholder="Hľadať zákazníka..."
                allowAll={true}
              />
            </div>

            <Select value={orderCategoryFilter} onValueChange={onOrderCategoryFilterChange}>
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <SelectValue placeholder="Kategória" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5}>
                <SelectItem value="all">Všetky kategórie</SelectItem>
                <SelectItem value="microgreens"><Leaf className="h-4 w-4 text-green-600 mr-2 inline" />Mikrozelenina</SelectItem>
                <SelectItem value="microherbs"><Sprout className="h-4 w-4 text-green-600 mr-2 inline" />Mikrobylinky</SelectItem>
                <SelectItem value="edible_flowers"><Flower className="h-4 w-4 text-green-600 mr-2 inline" />Jedlé kvety</SelectItem>
                <SelectItem value="mix"><Palette className="h-4 w-4 text-green-600 mr-2 inline" />Mixy</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCrop} onValueChange={onFilterCropChange}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Plodina" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto z-[100]">
                <SelectItem value="all">Všetky plodiny</SelectItem>
                {orderCategoryFilter === 'mix'
                  ? blends?.map(blend => <SelectItem key={blend.id} value={blend.name}>{blend.name}</SelectItem>)
                  : crops
                      ?.filter(crop => !orderCategoryFilter || orderCategoryFilter === 'all' ? true : (crop as any).category === orderCategoryFilter)
                      .map(crop => <SelectItem key={crop?.id} value={crop?.name || ''}>{crop?.name}</SelectItem>)
                }
              </SelectContent>
            </Select>

            <Select value={filterRoute} onValueChange={onFilterRouteChange}>
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <SelectValue placeholder="Trasa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všetky trasy</SelectItem>
                {routes?.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 text-sm font-normal gap-2">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {selectedDates.length === 0
                    ? 'Dátum'
                    : selectedDates.length === 1
                    ? format(selectedDates[0], 'dd.MM.yyyy', { locale: sk })
                    : `${selectedDates.length} dní`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                {renderCalendar()}
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1.5">
                <Switch id="topbar-archive-toggle" checked={showArchive} onCheckedChange={onShowArchiveChange} />
                <Label htmlFor="topbar-archive-toggle" className="text-sm cursor-pointer whitespace-nowrap">Archív</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch id="topbar-cancelled-toggle" checked={showCancelled} onCheckedChange={onShowCancelledChange} />
                <Label htmlFor="topbar-cancelled-toggle" className="text-sm cursor-pointer whitespace-nowrap">Zrušené</Label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
