import {
  Home,
  CheckSquare,
  Users,
  Building2,
  Sprout,
  Blend,
  DollarSign,
  ShoppingCart,
  CalendarDays,
  Box,
  Tag,
  Scissors,
  Truck,
  Warehouse,
  Receipt,
  FileText,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: LucideIcon;
  /** True ak je položka aktívna pri location.pathname začínajúcom href (sklad, náklady) */
  matchPrefix?: boolean;
}

export interface NavGroup {
  id: 'prehlad' | 'produkcia' | 'sprava';
  label: string;
  items: NavItem[];
}

/**
 * Jediný zdroj pravdy pre menu GrowBase.
 * Používa: Sidebar.tsx (desktop), MobileSidebar.tsx, MobileBottomNav.tsx.
 *
 * Pravidlá:
 * - id musí zodpovedať kľúču v sidebar_settings (worker_permissions filter)
 * - Sklad a Náklady sú jedna stránka so záložkami → matchPrefix: true
 * - Nikdy sem nepridávaj /users (presunuté do Nastavení) ani /calendar (zrušené)
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'prehlad',
    label: 'Prehľad',
    items: [
      { id: 'dashboard', name: 'Dashboard', href: '/', icon: Home },
      { id: 'today', name: 'Dnešné úlohy', href: '/today', icon: CheckSquare },
    ],
  },
  {
    id: 'produkcia',
    label: 'Produkcia',
    items: [
      { id: 'planting', name: 'Plán sadenia', href: '/planting', icon: CalendarDays },
      { id: 'prep-planting', name: 'Príprava na sadenie', href: '/prep-planting', icon: Box },
      { id: 'prep-packaging', name: 'Príprava obalov', href: '/prep-packaging', icon: Tag },
      { id: 'harvest-packing', name: 'Zber a balenie', href: '/harvest-packing', icon: Scissors },
      { id: 'delivery', name: 'Rozvoz', href: '/delivery', icon: Truck },
    ],
  },
  {
    id: 'sprava',
    label: 'Správa',
    items: [
      { id: 'customers', name: 'Zákazníci', href: '/customers', icon: Users },
      { id: 'suppliers', name: 'Dodávatelia', href: '/suppliers', icon: Building2 },
      { id: 'orders', name: 'Objednávky', href: '/orders', icon: ShoppingCart },
      { id: 'crops', name: 'Plodiny', href: '/crops', icon: Sprout },
      { id: 'blends', name: 'Mixy', href: '/blends', icon: Blend },
      { id: 'prices', name: 'Ceny', href: '/prices', icon: DollarSign },
      { id: 'inventory', name: 'Sklad', href: '/inventory', icon: Warehouse, matchPrefix: true },
      { id: 'costs', name: 'Náklady', href: '/costs', icon: Receipt, matchPrefix: true },
      { id: 'reports', name: 'Reporty', href: '/reports', icon: FileText },
    ],
  },
];

/** Flat zoznam všetkých nav položiek (vhodné pre mobile menu grid) */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);

/** Helper: je daná položka aktívna pre aktuálny pathname? */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.matchPrefix) return pathname.startsWith(item.href);
  return pathname === item.href;
}

/** Helper: filter podľa worker_permissions (sidebar_settings) */
export function isNavItemVisible(
  item: NavItem,
  sidebarSettings: Record<string, boolean>
): boolean {
  if (Object.keys(sidebarSettings).length === 0) return true;
  return sidebarSettings[item.id] !== false;
}
