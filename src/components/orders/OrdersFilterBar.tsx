import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import { CustomerTypeFilter } from '@/components/filters/CustomerTypeFilter';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Leaf, Sprout, Flower, Palette } from 'lucide-react';
import { format, isSameDay, isToday, getDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { sk } from 'date-fns/locale';
import type { Customer, Crop, Blend, Order } from './types';

interface Props {
  filterCustomerType: string;
  onFilterCustomerTypeChange: (v: string) => void;
  customerFilter: string;
  onCustomerFilterChange: (v: string) => void;
  orderCategoryFilter: string;
  onOrderCategoryFilterChange: (v: string) => void;
  filterCrop: string;
  onFilterCropChange: (v: string) => void;
  filterPeriod: string;
  onFilterPeriodChange: (v: string) => void;
  filterStatus: string;
  onFilterStatusChange: (v: string) => void;
  showArchive: boolean;
  onShowArchiveChange: (v: boolean) => void;
  showCancelled: boolean;
  onShowCancelledChange: (v: boolean) => void;
  selectedDates: Date[];
  onSelectedDatesChange: (dates: Date[]) => void;
  calendarOpen: boolean;
  onCalendarOpenChange: (v: boolean) => void;
  calendarOpenMobile: boolean;
  onCalendarOpenMobileChange: (v: boolean) => void;
  calendarMonth: Date;
  onCalendarMonthChange: (v: Date) => void;
  customers: Customer[];
  crops: Crop[];
  blends: Blend[];
  orders: Order[];
  getDeliveryDaysArray: () => number[];
}

export function OrdersFilterBar({
  filterCustomerType, onFilterCustomerTypeChange,
  customerFilter, onCustomerFilterChange,
  orderCategoryFilter, onOrderCategoryFilterChange,
  filterCrop, onFilterCropChange,
  filterPeriod, onFilterPeriodChange,
  filterStatus, onFilterStatusChange,
  showArchive, onShowArchiveChange,
  showCancelled, onShowCancelledChange,
  selectedDates, onSelectedDatesChange,
  calendarOpen, onCalendarOpenChange,
  calendarOpenMobile, onCalendarOpenMobileChange,
  calendarMonth, onCalendarMonthChange,
  customers, crops, blends, orders,
  getDeliveryDaysArray,
}: Props) {
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
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="w-9 h-9" />
          ))}
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
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-200 border border-gray-300" />
            <span>Rozvozový deň</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-300 border border-gray-300" />
            <span>Objednávky</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full ring-2 ring-blue-500" />
            <span>Vybraný deň</span>
          </div>
        </div>
      </div>
    );
  };

  const filteredCustomers = customers?.filter(c =>
    filterCustomerType === 'all' ? true : c.customer_type === filterCustomerType
  );

  const cropOptions = orderCategoryFilter === 'mix'
    ? null
    : crops?.filter(crop =>
        !orderCategoryFilter || orderCategoryFilter === 'all'
          ? true
          : (crop as any).category === orderCategoryFilter
      );

  return (
    <>
      {/* ─── DESKTOP filtre ─── */}
      <div className="hidden md:block space-y-2">
        {/* Riadok 1: selects + prepínače */}
        <div className="flex flex-wrap gap-2 items-center">
          <CustomerTypeFilter value={filterCustomerType} onChange={onFilterCustomerTypeChange} showLabel={false} />
          <div className="w-[260px]">
            <SearchableCustomerSelect
              value={customerFilter}
              onValueChange={onCustomerFilterChange}
              customers={filteredCustomers}
              placeholder="Hľadať zákazníka..."
              allowAll={true}
            />
          </div>
          <Select value={orderCategoryFilter} onValueChange={onOrderCategoryFilterChange}>
            <SelectTrigger className="w-[170px] h-9 text-sm">
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
            <SelectTrigger className="w-[155px] h-9 text-sm">
              <SelectValue placeholder="Plodina" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto z-[100]">
              <SelectItem value="all">Všetky plodiny</SelectItem>
              {orderCategoryFilter === 'mix'
                ? blends?.map(blend => <SelectItem key={blend.id} value={blend.name}>{blend.name}</SelectItem>)
                : cropOptions?.map(crop => <SelectItem key={crop?.id} value={crop?.name || ''}>{crop?.name}</SelectItem>)
              }
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
              <Switch id="archive-toggle" checked={showArchive} onCheckedChange={onShowArchiveChange} />
              <Label htmlFor="archive-toggle" className="text-sm cursor-pointer whitespace-nowrap">Archív</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <Switch id="cancelled-toggle" checked={showCancelled} onCheckedChange={onShowCancelledChange} />
              <Label htmlFor="cancelled-toggle" className="text-sm cursor-pointer whitespace-nowrap">Zrušené</Label>
            </div>
          </div>
        </div>

        {/* Riadok 2: period chipy */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Obdobie:</span>
          {([
            { value: 'all',          label: 'Všetky' },
            { value: 'this_week',    label: 'Tento týždeň' },
            { value: 'next_week',    label: 'Budúci týždeň' },
            { value: 'last_week',    label: 'Minulý týždeň' },
            { value: 'last_2_weeks', label: 'Pred 2T' },
            { value: 'last_month',   label: 'Minulý mesiac' },
          ] as const).map(p => (
            <button
              key={p.value}
              onClick={() => onFilterPeriodChange(p.value)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                filterPeriod === p.value
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Riadok 3: status chipy */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Stav:</span>
          {([
            { value: 'all',              label: 'Všetky',     on: 'bg-gray-700 text-white border-gray-700',        off: 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50' },
            { value: 'cakajuca',         label: 'Čakajúca',   on: 'bg-yellow-500 text-white border-yellow-500',     off: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' },
            { value: 'pending_approval', label: 'Schválenie', on: 'bg-purple-500 text-white border-purple-500',     off: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
            { value: 'potvrdena',        label: 'Potvrdená',  on: 'bg-green-500 text-white border-green-500',       off: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
            { value: 'growing',          label: 'Rastie',     on: 'bg-[#10b981] text-white border-[#10b981]',       off: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
            { value: 'packed',           label: 'Zabalená',   on: 'bg-amber-500 text-white border-amber-500',       off: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
            { value: 'on_the_way',       label: 'Na ceste',   on: 'bg-sky-500 text-white border-sky-500',           off: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' },
            { value: 'pripravena',       label: 'Pripravená', on: 'bg-orange-500 text-white border-orange-500',     off: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
            { value: 'dorucena',         label: 'Doručená',   on: 'bg-blue-500 text-white border-blue-500',         off: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
          ] as const).map(s => (
            <button
              key={s.value}
              onClick={() => onFilterStatusChange(s.value)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                filterStatus === s.value ? s.on : s.off
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── MOBILE filtre ─── */}
      <div className="md:hidden space-y-2">
        <CustomerTypeFilter value={filterCustomerType} onChange={onFilterCustomerTypeChange} showLabel={false} />
        <div className="w-full">
          <SearchableCustomerSelect
            value={customerFilter}
            onValueChange={onCustomerFilterChange}
            customers={filteredCustomers}
            placeholder="Hľadať zákazníka..."
            allowAll={true}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={orderCategoryFilter} onValueChange={onOrderCategoryFilterChange}>
            <SelectTrigger><SelectValue placeholder="Kategória" /></SelectTrigger>
            <SelectContent position="popper" sideOffset={5}>
              <SelectItem value="all">Všetky</SelectItem>
              <SelectItem value="microgreens">Mikrozelenina</SelectItem>
              <SelectItem value="microherbs">Mikrobylinky</SelectItem>
              <SelectItem value="edible_flowers">Jedlé kvety</SelectItem>
              <SelectItem value="mix">Mixy</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCrop} onValueChange={onFilterCropChange}>
            <SelectTrigger><SelectValue placeholder="Plodina" /></SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto z-[100]">
              <SelectItem value="all">Všetky plodiny</SelectItem>
              {orderCategoryFilter === 'mix'
                ? blends?.map(blend => <SelectItem key={blend.id} value={blend.name}>{blend.name}</SelectItem>)
                : cropOptions?.map(crop => <SelectItem key={crop?.id} value={crop?.name || ''}>{crop?.name}</SelectItem>)
              }
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Popover open={calendarOpenMobile} onOpenChange={onCalendarOpenMobileChange}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal h-10 w-full">
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">
                  {selectedDates.length === 0
                    ? 'Dátum'
                    : selectedDates.length === 1
                    ? format(selectedDates[0], 'dd.MM.yyyy', { locale: sk })
                    : `${selectedDates.length} dní`}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              {renderCalendar()}
            </PopoverContent>
          </Popover>
          <Select value={filterPeriod} onValueChange={onFilterPeriodChange}>
            <SelectTrigger><SelectValue placeholder="Obdobie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všetky týždne</SelectItem>
              <SelectItem value="this_week">Tento týždeň</SelectItem>
              <SelectItem value="next_week">Budúci týždeň</SelectItem>
              <SelectItem value="last_week">Minulý týždeň</SelectItem>
              <SelectItem value="last_2_weeks">Pred 2 týždňami</SelectItem>
              <SelectItem value="last_month">Minulý mesiac</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status chipy – horizontálne scrollovateľné */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="flex items-center gap-1.5 min-w-max">
            {([
              { value: 'all',              label: 'Všetky',     on: 'bg-gray-700 text-white border-gray-700',        off: 'bg-white text-gray-600 border-gray-300' },
              { value: 'cakajuca',         label: 'Čakajúca',   on: 'bg-yellow-500 text-white border-yellow-500',     off: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
              { value: 'pending_approval', label: 'Schválenie', on: 'bg-purple-500 text-white border-purple-500',     off: 'bg-purple-50 text-purple-700 border-purple-200' },
              { value: 'potvrdena',        label: 'Potvrdená',  on: 'bg-green-500 text-white border-green-500',       off: 'bg-green-50 text-green-700 border-green-200' },
              { value: 'growing',          label: 'Rastie',     on: 'bg-[#10b981] text-white border-[#10b981]',       off: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { value: 'packed',           label: 'Zabalená',   on: 'bg-amber-500 text-white border-amber-500',       off: 'bg-amber-50 text-amber-700 border-amber-200' },
              { value: 'on_the_way',       label: 'Na ceste',   on: 'bg-sky-500 text-white border-sky-500',           off: 'bg-sky-50 text-sky-700 border-sky-200' },
              { value: 'pripravena',       label: 'Pripravená', on: 'bg-orange-500 text-white border-orange-500',     off: 'bg-orange-50 text-orange-700 border-orange-200' },
              { value: 'dorucena',         label: 'Doručená',   on: 'bg-blue-500 text-white border-blue-500',         off: 'bg-blue-50 text-blue-700 border-blue-200' },
            ] as const).map(s => (
              <button
                key={s.value}
                onClick={() => onFilterStatusChange(s.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${
                  filterStatus === s.value ? s.on : s.off
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Switch id="archive-toggle-mobile" checked={showArchive} onCheckedChange={onShowArchiveChange} />
            <Label htmlFor="archive-toggle-mobile" className="text-sm cursor-pointer whitespace-nowrap">Archív</Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch id="cancelled-toggle-mobile" checked={showCancelled} onCheckedChange={onShowCancelledChange} />
            <Label htmlFor="cancelled-toggle-mobile" className="text-sm cursor-pointer whitespace-nowrap">Zrušené</Label>
          </div>
        </div>
      </div>
    </>
  );
}
