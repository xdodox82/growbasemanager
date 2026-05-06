export interface OrderItem {
  id?: string;
  crop_id?: string;
  crop_name: string;
  blend_id?: string;
  quantity: number;
  unit: string;
  packaging_size: string;
  delivery_form: string;
  packaging_type: string;
  packaging_volume_ml: number;
  packaging_id?: string;
  has_label: boolean;
  notes?: string;
  special_requirements?: string;
  price_per_unit?: number | string;
  total_price?: number;
  is_special_item?: boolean;
  custom_crop_name?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_type: string;
  delivery_date: string;
  status: string;
  order_type: string;
  route?: string;
  week_count?: number;
  total_price?: number;
  charge_delivery?: boolean;
  delivery_price?: number;
  notes?: string;
  order_source?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  recurring_weeks?: number;
  parent_order_id?: string;
  recurring_order_id?: string;
  recurring_start_date?: string;
  recurring_end_date?: string;
  recurring_total_weeks?: number;
  recurring_current_week?: number;
  created_at: string;
  order_items?: OrderItem[];
}

export interface Customer {
  id: string;
  name: string;
  company_name: string;
  customer_type: string;
  free_delivery?: boolean;
}

export interface Crop {
  id: string;
  name: string;
}

export interface Blend {
  id: string;
  name: string;
}

export interface Route {
  id: string;
  name: string;
  delivery_day_id?: string;
  delivery_fee_home?: number;
  delivery_fee_gastro?: number;
  delivery_fee_wholesale?: number;
  home_min_free_delivery?: number;
  gastro_min_free_delivery?: number;
  wholesale_min_free_delivery?: number;
}

export interface DeliveryDay {
  id: string;
  name: string;
  day_of_week: number;
}

export interface Price {
  id: string;
  crop_id?: string;
  blend_id?: string;
  packaging_size: string;
  unit_price: number;
  customer_type: string;
}

export interface Packaging {
  id: string;
  name: string;
  type: string;
}
