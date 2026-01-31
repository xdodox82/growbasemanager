export interface Crop {
  id: string;
  name: string;
  category: 'microgreens' | 'edible_flowers' | 'microherbs'; // Kategória plodiny
  daysToGermination: number;
  germinationType?: 'warm' | 'cold'; // Klíčenie v teple/chlade
  daysInDarkness?: number; // Dni v tme (po klíčení)
  daysOnLight: number; // dni na svetle
  daysToHarvest: number; // celková doba rastu (klíčenie + tma + svetlo) - pre rezanú formu
  seedDensity: number; // grams per tray
  // Príprava semien
  seedSoaking?: boolean; // Namáčanie semien pred výsevom
  // Rezaná forma
  canBeCut?: boolean; // Môže byť dodaná ako rezaná (default true)
  expectedYield?: number; // grams per tray pre rezanú formu (voliteľné pre jedlé kvety)
  // Živá forma
  canBeLive?: boolean; // Môže byť dodaná ako živá rastlina
  color: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CROP_CATEGORIES = {
  microgreens: 'Mikrozelenina',
  microherbs: 'Mikrobylinky',
  edible_flowers: 'Jedlé kvety',
} as const;

export const CROP_CATEGORY_ORDER = {
  microgreens: 0,
  microherbs: 1,
  edible_flowers: 2,
} as const;

export const GERMINATION_TYPES = {
  warm: 'V teple',
  cold: 'V chlade',
} as const;

export interface Blend {
  id: string;
  name: string;
  crops: { cropId: string; percentage: number }[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  customerType: 'domestic' | 'gastro' | 'wholesale';
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  companyName?: string;
  supplierType?: 'seeds' | 'packaging' | 'substrate' | 'other'; // Druh dodávateľa
  ico?: string;
  icDph?: string;
  dic?: string;
  email?: string;
  phone?: string;
  address?: string;
  bankAccount?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const SUPPLIER_TYPES = {
  seeds: 'Semená',
  packaging: 'Obaly',
  substrate: 'Substrát',
  other: 'Ostatné',
} as const;

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  deliveryDate: Date;
  status: 'pending' | 'growing' | 'ready' | 'delivered' | 'cancelled';
  isRecurring: boolean;
  recurringType?: 'single' | 'weekly' | 'biweekly'; // Typ opakovania
  recurringDays?: number[];
  packagingType?: 'disposable' | 'returnable'; // Druh balenia
  hasLabel?: boolean; // Etiketa
  deliveryRouteId?: string; // Rozvozová trasa
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryRoute {
  id: string;
  name: string; // Názov trasy
  region: string; // Kraj
  stops: DeliveryStop[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryStop {
  id: string;
  name: string; // Názov zastávky/mesta
  address?: string;
  position: number; // Poradie v trase
}

export interface OrderItem {
  id: string;
  cropId?: string;
  blendId?: string;
  quantity: number; // in grams
  pieces?: number; // počet kusov
  deliveryForm?: 'cut' | 'live'; // Forma dodania - rezaná/živá
  package_ml: string; // NEW SCHEMA: Veľkosť balenia (napr. "250", "500")
  package_type: string; // NEW SCHEMA: Typ obalu (napr. "PET", "PP")
  has_label_req: boolean; // NEW SCHEMA: Požiadavka na etiketu
}

export const DELIVERY_FORMS = {
  cut: 'Rezaná',
  live: 'Živá',
} as const;

export interface PlantingPlan {
  id: string;
  orderId: string;
  cropId: string;
  trays: number;
  sowDate: Date;
  harvestDate: Date;
  status: 'scheduled' | 'sown' | 'growing' | 'harvested';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  type: 'sow' | 'water' | 'harvest' | 'deliver' | 'pack';
  date: Date;
  cropId?: string;
  orderId?: string;
  plantingPlanId?: string;
  trays?: number;
  quantity?: number;
  customerName?: string;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
}

export const TASK_TYPE_LABELS = {
  sow: 'Výsev',
  water: 'Zalievanie',
  harvest: 'Zber',
  deliver: 'Doručenie',
  pack: 'Balenie',
} as const;

export interface DashboardStats {
  totalTrays: number;
  activeOrders: number;
  todaysTasks: number;
  upcomingHarvests: number;
}

export interface Seed {
  id: string;
  cropId: string; // Prepojenie na druh mikrozeleniny
  supplierId?: string; // Prepojenie na dodávateľa
  stockDate: Date; // Dátum naskladnenia
  quantity: number; // Množstvo
  quantityUnit: 'g' | 'kg'; // Jednotka
  supplier: string; // Dodávateľ (text - pre spätnú kompatibilitu)
  batchNumber: string; // Číslo šarže
  expirationDate?: Date; // Dátum spotreby
  consumptionStartDate?: Date; // Začiatok spotreby
  consumptionEndDate?: Date; // Koniec spotreby
  certificate?: string; // Názov certifikátu
  certificateFile?: string; // Base64 PDF súbor certifikátu
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Slovenské kraje
export const SLOVAK_REGIONS = [
  'Bratislavský kraj',
  'Trnavský kraj',
  'Trenčiansky kraj',
  'Nitriansky kraj',
  'Žilinský kraj',
  'Banskobystrický kraj',
  'Prešovský kraj',
  'Košický kraj',
] as const;

export interface Packaging {
  id: string;
  type: '250ml' | '500ml' | '750ml' | '1000ml' | '1200ml'; // Druh obalu
  supplierId?: string; // Prepojenie na dodávateľa
  supplier: string; // Dodávateľ (text - pre spätnú kompatibilitu)
  stockDate: Date; // Dátum naskladnenia
  quantity: number; // Počet kusov
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Substrate {
  id: string;
  type: 'coconut' | 'peat' | 'other'; // Druh substrátu
  customType?: string; // Vlastný typ ak je "other"
  supplierId?: string; // Prepojenie na dodávateľa
  supplier: string; // Dodávateľ
  stockDate: Date; // Dátum naskladnenia
  quantity: number; // Množstvo
  quantityUnit: 'l' | 'kg'; // Jednotka
  currentStock: number; // Aktuálne množstvo na sklade
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OtherInventory {
  id: string;
  name: string; // Názov položky
  supplierId?: string; // Prepojenie na dodávateľa
  supplier?: string; // Dodávateľ
  stockDate: Date; // Dátum naskladnenia
  quantity: number; // Množstvo
  quantityUnit: 'ks' | 'l' | 'g' | 'kg'; // Jednotka
  currentStock: number; // Aktuálne množstvo na sklade
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbPackagingMapping {
  id?: string;
  crop_id: string;
  packaging_id: string;
  weight_g: number;
  created_at?: string;
  updated_at?: string;
}
