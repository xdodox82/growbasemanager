import { format, parseISO } from 'date-fns';
import type { OrderItem } from './types';

export const sortOrderItemsByValue = (items: OrderItem[]): OrderItem[] => {
  if (!items || items.length === 0) return [];
  return [...items].sort((a, b) => {
    const valueA = parseFloat(a?.quantity?.toString() || '0') *
                   parseFloat((a?.price_per_unit?.toString() || '0').replace(',', '.'));
    const valueB = parseFloat(b?.quantity?.toString() || '0') *
                   parseFloat((b?.price_per_unit?.toString() || '0').replace(',', '.'));
    return valueB - valueA;
  });
};

export const formatOrderNotes = (notes: string | null): string | null => {
  if (!notes) return null;
  let result = notes;
  result = result.replace(/freq:biweekly/g, '');
  result = result.replace(/freq:weekly/g, '');
  result = result.replace(/Opakovaná každé 2 týždne/g, '');
  result = result.replace(/Opakovaná týždenne/g, '');
  result = result.trim();
  return result.length > 0 ? result : null;
};

export const getDeliveryFormLabel = (form: string | null | undefined): string => {
  if (!form || form === 'cut' || form === 'rezana') return 'Zrezaná';
  if (form === 'live' || form === 'ziva') return 'Živá';
  return form;
};

export const formatDeliveryDate = (dateString: string): string => {
  try {
    if (!dateString) return '-';
    const date = parseISO(dateString);
    return format(date, 'dd.MM.yyyy');
  } catch {
    return dateString || '-';
  }
};

export const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'growing':          return 'bg-green-100 text-green-800 border-green-300';
    case 'packed':           return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'on_the_way':       return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'pending_approval': return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'pending':          return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'confirmed':        return 'bg-green-100 text-green-800 border-green-300';
    case 'ready':
    case 'packaging_ready':  return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'delivered':        return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'cancelled':        return 'bg-red-100 text-red-800 border-red-300';
    // legacy Slovak values kept for existing DB records
    case 'cakajuca':         return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'potvrdena':        return 'bg-green-100 text-green-800 border-green-300';
    case 'pripravena':       return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'dorucena':         return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'zrusena':          return 'bg-red-100 text-red-800 border-red-300';
    default:                 return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const getStatusBorderColor = (status: string): string => {
  switch (status) {
    case 'growing':          return '#10b981';
    case 'packed':           return '#f59e0b';
    case 'on_the_way':       return '#0ea5e9';
    case 'pending_approval': return '#a855f7';
    case 'pending':          return '#eab308';
    case 'confirmed':        return '#22c55e';
    case 'ready':
    case 'packaging_ready':  return '#f97316';
    case 'delivered':        return '#3b82f6';
    case 'cancelled':        return '#ef4444';
    // legacy Slovak values kept for existing DB records
    case 'cakajuca':         return '#eab308';
    case 'potvrdena':        return '#22c55e';
    case 'pripravena':       return '#f97316';
    case 'dorucena':         return '#3b82f6';
    case 'zrusena':          return '#ef4444';
    default:                 return '#e5e7eb';
  }
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'pending':         'Čakajúca',
    'pending_approval':'Čaká na schválenie',
    'confirmed':       'Potvrdená',
    'growing':         'Rastie',
    'packaging_ready': 'Obaly pripravené',
    'packed':          'Zabalená',
    'ready':           'Pripravená na rozvoz',
    'on_the_way':      'Na ceste',
    'delivered':       'Doručená',
    'cancelled':       'Zrušená',
    // legacy Slovak values kept for existing DB records
    'cakajuca':        'Čakajúca',
    'potvrdena':       'Potvrdená',
    'pripravena':      'Pripravená',
    'dorucena':        'Doručená',
    'zrusena':         'Zrušená',
  };
  return labels[status] || 'Nová';
};

export const STATUS_STEPS = [
  { keys: ['pending', 'pending_approval', 'cakajuca'],           label: 'Čakajúca' },
  { keys: ['confirmed', 'potvrdena'],                            label: 'Potvrdená' },
  { keys: ['growing'],                                           label: 'Rastie'    },
  { keys: ['packed', 'ready', 'packaging_ready', 'pripravena'],  label: 'Zabalená'  },
  { keys: ['on_the_way'],                                        label: 'Na ceste'  },
  { keys: ['delivered', 'dorucena'],                             label: 'Doručená'  },
];
