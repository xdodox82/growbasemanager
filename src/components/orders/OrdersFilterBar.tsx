import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchableCustomerSelect } from '@/components/orders/SearchableCustomerSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, House, Utensils, Store, Leaf, Sprout, Flower, Palette, SlidersHorizontal } from 'lucide-react';
import { format, isSameDay, isToday, getDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useState } from 'react';
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
  customers: Customer[];
  crops: Crop[];
  blends: Blend[];
  orders: Order[];
  getDeliveryDaysArray: () => number[];
}

const chip = (active: boolean, activeClass: string) =>
  `inline-flex items-center gap-1.5 px-3 py-1 rounded-md border-[1.5px] text-[11px] font-medium cursor-pointer transition-colors ${
    active
      ? activeClass
      : 'border-[#e2e8f0] text-[#64748b] bg-white hover:border-[#bbf7d0] hover:text-[#16a34a] hover:bg-[#f0fdf4]'
  }`;

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
  customers, crops, blends, orders,
  getDeliveryDaysArray,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const isDeliveryDay = (date: Date) => getDeliveryDaysArray().includes(getDay(date));
  const hasOrdersOnDate = (date: Date) => orders.some(order => isSameDay(new Date(order.delivery_date), date));
  const goToPreviousMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  const goToNextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));

  const filteredCustomers = customers?.filter(c =>
    filterCustomerType === 'all' ? true : c.customer_type === filterCustomerType
  );
  const cropOptions = orderCategoryFilter === 'mix'
    ? null
    : crops?.filter(crop =>
        !orderCategoryFilter || orderCategoryFilter === 'all' ? true : (crop as any).category === orderCategoryFilter
      );

  const activeMoreCount = [
    customerFilter !== 'all',
    filterCrop !== 'all',
    showArchive,
    showCancelled,
    selectedDates.length > 0,
  ].filter(Boolean).length;

  const renderCalendar = () => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });
    const firstDayOfWeek = getDay(start);
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    return (
      <div className="w-[300px] p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={goToPreviousMonth} className="w-7 h-7 rounded-lg border border-[#e2e8f0] flex items-center justify-center hover:bg-[#f0fdf4]">
            <ChevronLeft className="h-3.5 w-3.5 text-[#64748b]" />
          </button>
          <span className="text-[13px] font-600 text-[#0f172a]">{format(calendarMonth, 'MMMM yyyy', { locale: sk })}</span>
          <button onClick={goToNextMonth} className="w-7 h-7 rounded-lg border border-[#e2e8f0] flex items-center justify-center hover:bg-[#f0fdf4]">
            <ChevronRight className="h-3.5 w-3.5 text-[#64748b]" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-[#94a3b8] h-6 flex items-center justify-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: paddingDays }).map((_, i) => <div key={`p${i}`} className="w-8 h-8" />)}
          {days.map(day => {
            const isDelivery = isDeliveryDay(day);
            const today = isToday(day);
            const selected = selectedDates.some(d => isSameDay(d, day));
            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectedDatesChange(
                  selectedDates.some(d => isSameDay(d, day))
                    ? selectedDates.filter(d => !isSameDay(d, day))
                    : [...selectedDates, day]
                )}
                className={`w-8 h-8 rounded-lg text-[11px] font-medium flex items-center justify-center transition-all
                  ${selected ? 'bg-[#16a34a] text-white' : isDelivery ? 'bg-[#f0fdf4] text-[#16a34a] font-semibold' : 'text-[#475569] hover:bg-[#f8fafc]'}
                  ${today && !selected ? 'ring-1.5 ring-[#16a34a]' : ''}
                `}
              >{day.getDate()}</button>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-[10px] text-[#94a3b8]">
            <div className="w-3 h-3 rounded bg-[#f0fdf4] border border-[#16a34a]" />Rozvoz
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#94a3b8]">
            <div className="w-3 h-3 rounded bg-[#16a34a]" />Vybraný
          </div>
        </div>
      </div>
    );
  };

  const rowLabel = (text: string) => (
    <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider min-w-[80px] shrink-0">{text}</span>
  );

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] px-4 py-3 mb-4 space-y-0">

      {/* Riadok 1: Typ zákazníka */}
      <div className="flex items-center gap-2 flex-wrap py-2">
        {rowLabel('Zákazník')}
        <button onClick={() => onFilterCustomerTypeChange('all')} className={chip(filterCustomerType === 'all', 'bg-[#16a34a] border-[#16a34a] text-white')}>Všetci</button>
        <button onClick={() => onFilterCustomerTypeChange('home')} className={chip(filterCustomerType === 'home', 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]')}>
          <House className="w-3 h-3" />Domáci
        </button>
        <button onClick={() => onFilterCustomerTypeChange('gastro')} className={chip(filterCustomerType === 'gastro', 'bg-[#eff6ff] border-[#2563eb] text-[#2563eb]')}>
          <Utensils className="w-3 h-3" />Gastro
        </button>
        <button onClick={() => onFilterCustomerTypeChange('wholesale')} className={chip(filterCustomerType === 'wholesale', 'bg-[#fff7ed] border-[#d97706] text-[#d97706]')}>
          <Store className="w-3 h-3" />VO
        </button>
      </div>

      <div className="border-t border-[#f8fafc]" />

      {/* Riadok 2: Kategória */}
      <div className="flex items-center gap-2 flex-wrap py-2">
        {rowLabel('Kategória')}
        <button onClick={() => onOrderCategoryFilterChange('all')} className={chip(orderCategoryFilter === 'all', 'bg-[#16a34a] border-[#16a34a] text-white')}>Všetky</button>
        <button onClick={() => onOrderCategoryFilterChange('microgreens')} className={chip(orderCategoryFilter === 'microgreens', 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]')}>
          <Leaf className="w-3 h-3" />Mikrozelenia
        </button>
        <button onClick={() => onOrderCategoryFilterChange('microherbs')} className={chip(orderCategoryFilter === 'microherbs', 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]')}>
          <Sprout className="w-3 h-3" />Mikrobylinky
        </button>
        <button onClick={() => onOrderCategoryFilterChange('edible_flowers')} className={chip(orderCategoryFilter === 'edible_flowers', 'bg-[#fdf4ff] border-[#a855f7] text-[#a855f7]')}>
          <Flower className="w-3 h-3" />Jedlé kvety
        </button>
        <button onClick={() => onOrderCategoryFilterChange('mix')} className={chip(orderCategoryFilter === 'mix', 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]')}>
          <Palette className="w-3 h-3" />Mixy
        </button>
      </div>

      <div className="border-t border-[#f8fafc]" />

      {/* Riadok 3: Stav */}
      <div className="flex items-center gap-2 flex-wrap py-2">
        {rowLabel('Stav')}
        {([
          { v: 'all',              l: 'Všetky',     a: 'bg-[#16a34a] border-[#16a34a] text-white' },
          { v: 'growing',          l: 'Rastie',      a: 'bg-[#dcfce7] border-[#16a34a] text-[#166534]' },
          { v: 'packed',           l: 'Zabalená',    a: 'bg-[#dbeafe] border-[#2563eb] text-[#1e40af]' },
          { v: 'on_the_way',       l: 'Na ceste',    a: 'bg-[#ede9fe] border-[#7c3aed] text-[#5b21b6]' },
          { v: 'cakajuca',         l: 'Čakajúca',    a: 'bg-[#fef3c7] border-[#d97706] text-[#92400e]' },
          { v: 'pending_approval', l: 'Čaká schv.',  a: 'bg-[#fef3c7] border-[#d97706] text-[#92400e]' },
          { v: 'potvrdena',        l: 'Potvrdená',   a: 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]' },
          { v: 'dorucena',         l: 'Doručená',    a: 'bg-[#d1fae5] border-[#059669] text-[#064e3b]' },
          { v: 'zrusena',          l: 'Zrušená',     a: 'bg-[#f8fafc] border-[#94a3b8] text-[#64748b]' },
        ] as const).map(s => (
          <button key={s.v} onClick={() => onFilterStatusChange(s.v)} className={chip(filterStatus === s.v, s.a)}>{s.l}</button>
        ))}
      </div>

      <div className="border-t border-[#f8fafc]" />

      {/* Riadok 4: Dátum + Ďalšie filtre */}
      <div className="flex items-center gap-2 flex-wrap py-2">
        {rowLabel('Dátum')}
        {([
          { v: 'all',          l: 'Všetky' },
          { v: 'this_week',    l: 'Tento týždeň' },
          { v: 'next_week',    l: 'Budúci týždeň' },
          { v: 'last_week',    l: 'Minulý týždeň' },
          { v: 'last_2_weeks', l: 'Posl. 2 týždne' },
          { v: 'last_month',   l: 'Tento mesiac' },
        ] as const).map(p => (
          <button key={p.v} onClick={() => onFilterPeriodChange(p.v)} className={chip(filterPeriod === p.v, 'bg-[#16a34a] border-[#16a34a] text-white')}>{p.l}</button>
        ))}
        <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
          <PopoverTrigger asChild>
            <button className={chip(selectedDates.length > 0, 'bg-[#16a34a] border-[#16a34a] text-white')}>
              <CalendarIcon className="w-3 h-3" />
              {selectedDates.length > 0 ? `${selectedDates.length} dní` : 'Vybrať...'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">{renderCalendar()}</PopoverContent>
        </Popover>

        <button
          onClick={() => setMoreOpen(v => !v)}
          className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-md border-[1.5px] text-[11px] font-medium cursor-pointer transition-colors ${
            moreOpen || activeMoreCount > 0
              ? 'border-[#16a34a] text-[#16a34a] bg-[#f0fdf4]'
              : 'border-[#e2e8f0] text-[#64748b] bg-white hover:border-[#bbf7d0] hover:text-[#16a34a] hover:bg-[#f0fdf4]'
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
          Ďalšie filtre
          {activeMoreCount > 0 && (
            <span className="bg-[#16a34a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{activeMoreCount}</span>
          )}
        </button>
      </div>

      {/* Rozbalený panel */}
      {moreOpen && (
        <div className="border-t border-[#f1f5f9] pt-3 mt-1 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Zákazník</div>
            <SearchableCustomerSelect
              value={customerFilter}
              onValueChange={onCustomerFilterChange}
              customers={filteredCustomers}
              placeholder="Hľadať zákazníka..."
              allowAll={true}
            />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Konkrétna plodina</div>
            <Select value={filterCrop} onValueChange={onFilterCropChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Všetky plodiny" />
              </SelectTrigger>
              <SelectContent className="max-h-[260px] overflow-y-auto z-[100]">
                <SelectItem value="all">Všetky plodiny</SelectItem>
                {orderCategoryFilter === 'mix'
                  ? blends?.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)
                  : cropOptions?.map(c => <SelectItem key={c?.id} value={c?.name || ''}>{c?.name}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Zobraziť</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Switch id="archive-t" checked={showArchive} onCheckedChange={onShowArchiveChange} />
                <Label htmlFor="archive-t" className="text-sm cursor-pointer">Archív (doručené)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="cancelled-t" checked={showCancelled} onCheckedChange={onShowCancelledChange} />
                <Label htmlFor="cancelled-t" className="text-sm cursor-pointer">Zrušené</Label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
