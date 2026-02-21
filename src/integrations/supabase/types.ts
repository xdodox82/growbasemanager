export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      adblue_costs: {
        Row: {
          id: string
          user_id: string
          date: string
          liters: number
          price_per_liter: number
          total_price: number
          notes: string | null
          created_at: string | null
          price_includes_vat: boolean | null
          vat_rate: number | null
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          liters: number
          price_per_liter: number
          total_price: number
          notes?: string | null
          created_at?: string | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          liters?: number
          price_per_liter?: number
          total_price?: number
          notes?: string | null
          created_at?: string | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
      }
      blends: {
        Row: {
          id: string
          name: string
          crop_ids: string[] | null
          created_at: string
          crop_percentages: Json | null
          notes: string | null
          user_id: string | null
          sku_prefix: string | null
        }
        Insert: {
          id?: string
          name: string
          crop_ids?: string[] | null
          created_at?: string
          crop_percentages?: Json | null
          notes?: string | null
          user_id?: string | null
          sku_prefix?: string | null
        }
        Update: {
          id?: string
          name?: string
          crop_ids?: string[] | null
          created_at?: string
          crop_percentages?: Json | null
          notes?: string | null
          user_id?: string | null
          sku_prefix?: string | null
        }
      }
      car_service_costs: {
        Row: {
          id: string
          user_id: string
          date: string
          description: string
          km_state: number | null
          price: number
          notes: string | null
          created_at: string | null
          price_includes_vat: boolean | null
          vat_rate: number | null
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          description: string
          km_state?: number | null
          price: number
          notes?: string | null
          created_at?: string | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          description?: string
          km_state?: number | null
          price?: number
          notes?: string | null
          created_at?: string | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
      }
      consumable_inventory: {
        Row: {
          id: string
          user_id: string
          category: string
          name: string
          quantity: number
          unit: string
          min_quantity: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          unit_cost: number | null
          price_includes_vat: boolean | null
          vat_rate: number | null
        }
        Insert: {
          id?: string
          user_id?: string
          category: string
          name: string
          quantity: number
          unit: string
          min_quantity?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          unit_cost?: number | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          name?: string
          quantity?: number
          unit?: string
          min_quantity?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          unit_cost?: number | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          delivery_notes: string | null
          delivery_day_ids: string[] | null
          created_at: string
          updated_at: string
          delivery_route_id: string | null
          customer_type: string | null
          company_name: string | null
          contact_name: string | null
          ico: string | null
          dic: string | null
          ic_dph: string | null
          bank_account: string | null
          user_id: string | null
          payment_method: 'cash' | 'invoice' | null
          free_delivery: boolean | null
          uses_returnable_packaging: boolean | null
          default_packaging_type: string | null
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          delivery_notes?: string | null
          delivery_day_ids?: string[] | null
          created_at?: string
          updated_at?: string
          delivery_route_id?: string | null
          customer_type?: string | null
          company_name?: string | null
          contact_name?: string | null
          ico?: string | null
          dic?: string | null
          ic_dph?: string | null
          bank_account?: string | null
          user_id?: string | null
          payment_method?: 'cash' | 'invoice' | null
          free_delivery?: boolean | null
          uses_returnable_packaging?: boolean | null
          default_packaging_type?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          delivery_notes?: string | null
          delivery_day_ids?: string[] | null
          created_at?: string
          updated_at?: string
          delivery_route_id?: string | null
          customer_type?: string | null
          company_name?: string | null
          contact_name?: string | null
          ico?: string | null
          dic?: string | null
          ic_dph?: string | null
          bank_account?: string | null
          user_id?: string | null
          payment_method?: 'cash' | 'invoice' | null
          free_delivery?: boolean | null
          uses_returnable_packaging?: boolean | null
          default_packaging_type?: string | null
        }
      }
      delivery_days: {
        Row: {
          id: string
          name: string
          day_of_week: number
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          day_of_week: number
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          day_of_week?: number
          created_at?: string
          user_id?: string | null
        }
      }
      delivery_days_settings: {
        Row: {
          id: string
          user_id: string
          monday: boolean | null
          tuesday: boolean | null
          wednesday: boolean | null
          thursday: boolean | null
          friday: boolean | null
          saturday: boolean | null
          sunday: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          monday?: boolean | null
          tuesday?: boolean | null
          wednesday?: boolean | null
          thursday?: boolean | null
          friday?: boolean | null
          saturday?: boolean | null
          sunday?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          monday?: boolean | null
          tuesday?: boolean | null
          wednesday?: boolean | null
          thursday?: boolean | null
          friday?: boolean | null
          saturday?: boolean | null
          sunday?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      delivery_routes: {
        Row: {
          id: string
          name: string
          delivery_day_id: string | null
          customer_ids: string[] | null
          created_at: string
          user_id: string | null
          delivery_fee: number | null
          delivery_fee_home: number | null
          delivery_fee_gastro: number | null
          delivery_fee_wholesale: number | null
          home_min_free_delivery: number | null
          gastro_min_free_delivery: number | null
          wholesale_min_free_delivery: number | null
        }
        Insert: {
          id?: string
          name: string
          delivery_day_id?: string | null
          customer_ids?: string[] | null
          created_at?: string
          user_id?: string | null
          delivery_fee?: number | null
          delivery_fee_home?: number | null
          delivery_fee_gastro?: number | null
          delivery_fee_wholesale?: number | null
          home_min_free_delivery?: number | null
          gastro_min_free_delivery?: number | null
          wholesale_min_free_delivery?: number | null
        }
        Update: {
          id?: string
          name?: string
          delivery_day_id?: string | null
          customer_ids?: string[] | null
          created_at?: string
          user_id?: string | null
          delivery_fee?: number | null
          delivery_fee_home?: number | null
          delivery_fee_gastro?: number | null
          delivery_fee_wholesale?: number | null
          home_min_free_delivery?: number | null
          gastro_min_free_delivery?: number | null
          wholesale_min_free_delivery?: number | null
        }
      }
      delivery_settings: {
        Row: {
          id: string
          user_id: string
          free_delivery_threshold: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          free_delivery_threshold?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          free_delivery_threshold?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      electricity_costs: {
        Row: {
          id: string
          user_id: string
          month: string
          meter_start: number
          meter_end: number
          total_consumption: number
          price_per_kwh: number | null
          total_price: number | null
          notes: string | null
          created_at: string | null
          price_includes_vat: boolean | null
          vat_rate: number | null
        }
        Insert: {
          id?: string
          user_id?: string
          month: string
          meter_start: number
          meter_end: number
          total_consumption: number
          price_per_kwh?: number | null
          total_price?: number | null
          notes?: string | null
          created_at?: string | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          meter_start?: number
          meter_end?: number
          total_consumption?: number
          price_per_kwh?: number | null
          total_price?: number | null
          notes?: string | null
          created_at?: string | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
      }
      fuel_costs: {
        Row: {
          id: string
          user_id: string
          date: string
          liters: number
          fuel_type: 'benzin' | 'diesel'
          price_per_liter: number
          total_price: number
          trip_km: number | null
          avg_consumption: number | null
          notes: string | null
          created_at: string | null
          price_includes_vat: boolean | null
          vat_rate: number | null
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          liters: number
          fuel_type: 'benzin' | 'diesel'
          price_per_liter: number
          total_price: number
          trip_km?: number | null
          avg_consumption?: number | null
          notes?: string | null
          created_at?: string | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          liters?: number
          fuel_type?: 'benzin' | 'diesel'
          price_per_liter?: number
          total_price?: number
          trip_km?: number | null
          avg_consumption?: number | null
          notes?: string | null
          created_at?: string | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
      }
      labels: {
        Row: {
          id: string
          name: string
          type: string | null
          size: string | null
          quantity: number
          supplier_id: string | null
          notes: string | null
          created_at: string
          min_stock: number | null
          user_id: string | null
          unit_cost: number | null
        }
        Insert: {
          id?: string
          name: string
          type?: string | null
          size?: string | null
          quantity?: number
          supplier_id?: string | null
          notes?: string | null
          created_at?: string
          min_stock?: number | null
          user_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          id?: string
          name?: string
          type?: string | null
          size?: string | null
          quantity?: number
          supplier_id?: string | null
          notes?: string | null
          created_at?: string
          min_stock?: number | null
          user_id?: string | null
          unit_cost?: number | null
        }
      }
      login_history: {
        Row: {
          id: string
          user_id: string
          login_at: string
          ip_address: string | null
          user_agent: string | null
          device_type: string | null
          browser: string | null
          os: string | null
          country: string | null
          city: string | null
          is_new_device: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          login_at?: string
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          country?: string | null
          city?: string | null
          is_new_device?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          login_at?: string
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          country?: string | null
          city?: string | null
          is_new_device?: boolean | null
          created_at?: string
        }
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          email_low_stock: boolean | null
          email_address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_low_stock?: boolean | null
          email_address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_low_stock?: boolean | null
          email_address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          crop_id: string | null
          blend_id: string | null
          quantity: number
          unit: string | null
          packaging_size: string | null
          delivery_form: string | null
          has_label: boolean | null
          notes: string | null
          created_at: string
          user_id: string | null
          packaging_material: string | null
          packaging_volume_ml: number | null
          special_requirements: string | null
          packaging_id: string | null
          price_per_unit: number | null
          total_price: number | null
          crop_name: string | null
          is_special_item: boolean | null
          custom_crop_name: string | null
          pieces: number | null
          packaging_type: string | null
        }
        Insert: {
          id?: string
          order_id: string
          crop_id?: string | null
          blend_id?: string | null
          quantity?: number
          unit?: string | null
          packaging_size?: string | null
          delivery_form?: string | null
          has_label?: boolean | null
          notes?: string | null
          created_at?: string
          user_id?: string | null
          packaging_material?: string | null
          packaging_volume_ml?: number | null
          special_requirements?: string | null
          packaging_id?: string | null
          price_per_unit?: number | null
          total_price?: number | null
          crop_name?: string | null
          is_special_item?: boolean | null
          custom_crop_name?: string | null
          pieces?: number | null
          packaging_type?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          crop_id?: string | null
          blend_id?: string | null
          quantity?: number
          unit?: string | null
          packaging_size?: string | null
          delivery_form?: string | null
          has_label?: boolean | null
          notes?: string | null
          created_at?: string
          user_id?: string | null
          packaging_material?: string | null
          packaging_volume_ml?: number | null
          special_requirements?: string | null
          packaging_id?: string | null
          price_per_unit?: number | null
          total_price?: number | null
          crop_name?: string | null
          is_special_item?: boolean | null
          custom_crop_name?: string | null
          pieces?: number | null
          packaging_type?: string | null
        }
      }
      orders: {
        Row: {
          id: string
          customer_id: string | null
          crop_id: string | null
          blend_id: string | null
          quantity: number
          unit: string | null
          order_date: string
          delivery_date: string | null
          status: string | null
          notes: string | null
          is_recurring: boolean | null
          recurrence_pattern: string | null
          created_at: string
          order_number: number
          delivery_form: string | null
          packaging_size: string | null
          has_label: boolean | null
          packaging_type: string | null
          parent_order_id: string | null
          skipped: boolean | null
          recurring_weeks: number | null
          user_id: string | null
          total_price: number | null
          delivery_order: number | null
          charge_delivery: boolean | null
          delivery_price: number | null
          delivery_type: string | null
          customer_name: string | null
          crop_name: string | null
          route: string | null
          delivery_route_id: string | null
          recurring_type: string | null
          customer_type: string | null
          returned_packaging_count: number | null
          actual_harvest_date: string | null
        }
        Insert: {
          id?: string
          customer_id?: string | null
          crop_id?: string | null
          blend_id?: string | null
          quantity?: number
          unit?: string | null
          order_date?: string
          delivery_date?: string | null
          status?: string | null
          notes?: string | null
          is_recurring?: boolean | null
          recurrence_pattern?: string | null
          created_at?: string
          order_number?: number
          delivery_form?: string | null
          packaging_size?: string | null
          has_label?: boolean | null
          packaging_type?: string | null
          parent_order_id?: string | null
          skipped?: boolean | null
          recurring_weeks?: number | null
          user_id?: string | null
          total_price?: number | null
          delivery_order?: number | null
          charge_delivery?: boolean | null
          delivery_price?: number | null
          delivery_type?: string | null
          customer_name?: string | null
          crop_name?: string | null
          route?: string | null
          delivery_route_id?: string | null
          recurring_type?: string | null
          customer_type?: string | null
          returned_packaging_count?: number | null
          actual_harvest_date?: string | null
        }
        Update: {
          id?: string
          customer_id?: string | null
          crop_id?: string | null
          blend_id?: string | null
          quantity?: number
          unit?: string | null
          order_date?: string
          delivery_date?: string | null
          status?: string | null
          notes?: string | null
          is_recurring?: boolean | null
          recurrence_pattern?: string | null
          created_at?: string
          order_number?: number
          delivery_form?: string | null
          packaging_size?: string | null
          has_label?: boolean | null
          packaging_type?: string | null
          parent_order_id?: string | null
          skipped?: boolean | null
          recurring_weeks?: number | null
          user_id?: string | null
          total_price?: number | null
          delivery_order?: number | null
          charge_delivery?: boolean | null
          delivery_price?: number | null
          delivery_type?: string | null
          customer_name?: string | null
          crop_name?: string | null
          route?: string | null
          delivery_route_id?: string | null
          recurring_type?: string | null
          customer_type?: string | null
          returned_packaging_count?: number | null
          actual_harvest_date?: string | null
        }
      }
      other_costs: {
        Row: {
          id: string
          user_id: string
          date: string
          category: string
          description: string
          price: number
          notes: string | null
          created_at: string | null
          price_includes_vat: boolean | null
          vat_rate: number | null
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          category: string
          description: string
          price: number
          notes?: string | null
          created_at?: string | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          category?: string
          description?: string
          price?: number
          notes?: string | null
          created_at?: string | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
      }
      other_inventory: {
        Row: {
          id: string
          name: string
          category: string | null
          quantity: number
          unit: string | null
          notes: string | null
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          quantity?: number
          unit?: string | null
          notes?: string | null
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          quantity?: number
          unit?: string | null
          notes?: string | null
          created_at?: string
          user_id?: string | null
        }
      }
      packaging_configurations: {
        Row: {
          id: string
          product_id: string | null
          target_weight_g: number
          packaging_id: string | null
          user_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          product_id?: string | null
          target_weight_g: number
          packaging_id?: string | null
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string | null
          target_weight_g?: number
          packaging_id?: string | null
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      packaging_mappings: {
        Row: {
          id: string
          crop_id: string | null
          weight_g: number
          packaging_id: string | null
          user_id: string | null
          created_at: string | null
          blend_id: string | null
        }
        Insert: {
          id?: string
          crop_id?: string | null
          weight_g: number
          packaging_id?: string | null
          user_id?: string | null
          created_at?: string | null
          blend_id?: string | null
        }
        Update: {
          id?: string
          crop_id?: string | null
          weight_g?: number
          packaging_id?: string | null
          user_id?: string | null
          created_at?: string | null
          blend_id?: string | null
        }
      }
      packagings: {
        Row: {
          id: string
          name: string
          type: string | null
          size: string | null
          quantity: number
          supplier_id: string | null
          notes: string | null
          created_at: string
          min_stock: number | null
          user_id: string | null
          price_per_piece: number | null
          price_includes_vat: boolean | null
          vat_rate: number | null
          supplier: string | null
          stock_date: string | null
          sku: string | null
        }
        Insert: {
          id?: string
          name: string
          type?: string | null
          size?: string | null
          quantity?: number
          supplier_id?: string | null
          notes?: string | null
          created_at?: string
          min_stock?: number | null
          user_id?: string | null
          price_per_piece?: number | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
          supplier?: string | null
          stock_date?: string | null
          sku?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string | null
          size?: string | null
          quantity?: number
          supplier_id?: string | null
          notes?: string | null
          created_at?: string
          min_stock?: number | null
          user_id?: string | null
          price_per_piece?: number | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
          supplier?: string | null
          stock_date?: string | null
          sku?: string | null
        }
      }
      planting_plans: {
        Row: {
          id: string
          crop_id: string | null
          order_id: string | null
          tray_count: number | null
          sow_date: string
          expected_harvest_date: string | null
          actual_harvest_date: string | null
          status: string | null
          notes: string | null
          created_at: string
          seed_id: string | null
          is_combined: boolean | null
          crop_components: Json | null
          user_id: string | null
          soaking_hours_before_sowing: number | null
          tray_size: string | null
          is_test_batch: boolean | null
          count_as_production: boolean
          substrate_type: string | null
          substrate_note: string | null
        }
        Insert: {
          id?: string
          crop_id?: string | null
          order_id?: string | null
          tray_count?: number | null
          sow_date: string
          expected_harvest_date?: string | null
          actual_harvest_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string
          seed_id?: string | null
          is_combined?: boolean | null
          crop_components?: Json | null
          user_id?: string | null
          soaking_hours_before_sowing?: number | null
          tray_size?: string | null
          is_test_batch?: boolean | null
          count_as_production?: boolean
          substrate_type?: string | null
          substrate_note?: string | null
        }
        Update: {
          id?: string
          crop_id?: string | null
          order_id?: string | null
          tray_count?: number | null
          sow_date?: string
          expected_harvest_date?: string | null
          actual_harvest_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string
          seed_id?: string | null
          is_combined?: boolean | null
          crop_components?: Json | null
          user_id?: string | null
          soaking_hours_before_sowing?: number | null
          tray_size?: string | null
          is_test_batch?: boolean | null
          count_as_production?: boolean
          substrate_type?: string | null
          substrate_note?: string | null
        }
      }
      prices: {
        Row: {
          id: string
          crop_id: string | null
          blend_id: string | null
          packaging_size: string
          unit_price: number
          created_at: string
          updated_at: string
          customer_type: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          crop_id?: string | null
          blend_id?: string | null
          packaging_size?: string
          unit_price?: number
          created_at?: string
          updated_at?: string
          customer_type?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          crop_id?: string | null
          blend_id?: string | null
          packaging_size?: string
          unit_price?: number
          created_at?: string
          updated_at?: string
          customer_type?: string | null
          user_id?: string | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          variety: string | null
          days_to_harvest: number
          seed_density: number | null
          expected_yield: number | null
          seed_soaking: boolean | null
          color: string | null
          created_at: string
          updated_at: string
          category: string | null
          days_to_germination: number | null
          germination_type: string | null
          days_in_darkness: number | null
          days_on_light: number | null
          can_be_cut: boolean | null
          can_be_live: boolean | null
          notes: string | null
          needs_weight: boolean | null
          user_id: string | null
          harvest_order: number | null
          safety_buffer_percent: number | null
          tray_configs: Json | null
          default_substrate_type: string | null
          default_substrate_note: string | null
          sku_prefix: string | null
        }
        Insert: {
          id?: string
          name: string
          variety?: string | null
          days_to_harvest?: number
          seed_density?: number | null
          expected_yield?: number | null
          seed_soaking?: boolean | null
          color?: string | null
          created_at?: string
          updated_at?: string
          category?: string | null
          days_to_germination?: number | null
          germination_type?: string | null
          days_in_darkness?: number | null
          days_on_light?: number | null
          can_be_cut?: boolean | null
          can_be_live?: boolean | null
          notes?: string | null
          needs_weight?: boolean | null
          user_id?: string | null
          harvest_order?: number | null
          safety_buffer_percent?: number | null
          tray_configs?: Json | null
          default_substrate_type?: string | null
          default_substrate_note?: string | null
          sku_prefix?: string | null
        }
        Update: {
          id?: string
          name?: string
          variety?: string | null
          days_to_harvest?: number
          seed_density?: number | null
          expected_yield?: number | null
          seed_soaking?: boolean | null
          color?: string | null
          created_at?: string
          updated_at?: string
          category?: string | null
          days_to_germination?: number | null
          germination_type?: string | null
          days_in_darkness?: number | null
          days_on_light?: number | null
          can_be_cut?: boolean | null
          can_be_live?: boolean | null
          notes?: string | null
          needs_weight?: boolean | null
          user_id?: string | null
          harvest_order?: number | null
          safety_buffer_percent?: number | null
          tray_configs?: Json | null
          default_substrate_type?: string | null
          sku_prefix?: string | null
          default_substrate_note?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          email: string | null
          created_at: string
          updated_at: string
          sidebar_settings: Json | null
          delivery_settings: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
          sidebar_settings?: Json | null
          delivery_settings?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
          sidebar_settings?: Json | null
          delivery_settings?: Json | null
        }
      }
      seeds: {
        Row: {
          id: string
          crop_id: string | null
          supplier_id: string | null
          quantity: number
          unit: string | null
          lot_number: string | null
          purchase_date: string | null
          expiry_date: string | null
          notes: string | null
          created_at: string
          stocking_date: string | null
          consumption_start_date: string | null
          certificate_url: string | null
          min_stock: number | null
          user_id: string | null
          finished_date: string | null
          unit_price_per_kg: number | null
          price_includes_vat: boolean | null
          vat_rate: number | null
          batch_number: string | null
          consumption_end_date: string | null
          certificate: string | null
          certificate_file: string | null
        }
        Insert: {
          id?: string
          crop_id?: string | null
          supplier_id?: string | null
          quantity?: number
          unit?: string | null
          lot_number?: string | null
          purchase_date?: string | null
          expiry_date?: string | null
          notes?: string | null
          created_at?: string
          stocking_date?: string | null
          consumption_start_date?: string | null
          certificate_url?: string | null
          min_stock?: number | null
          user_id?: string | null
          finished_date?: string | null
          unit_price_per_kg?: number | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
          batch_number?: string | null
          consumption_end_date?: string | null
          certificate?: string | null
          certificate_file?: string | null
        }
        Update: {
          id?: string
          crop_id?: string | null
          supplier_id?: string | null
          quantity?: number
          unit?: string | null
          lot_number?: string | null
          purchase_date?: string | null
          expiry_date?: string | null
          notes?: string | null
          created_at?: string
          stocking_date?: string | null
          consumption_start_date?: string | null
          certificate_url?: string | null
          min_stock?: number | null
          user_id?: string | null
          finished_date?: string | null
          unit_price_per_kg?: number | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
          batch_number?: string | null
          consumption_end_date?: string | null
          certificate?: string | null
          certificate_file?: string | null
        }
      }
      substrates: {
        Row: {
          id: string
          name: string
          type: string | null
          quantity: number
          unit: string | null
          supplier_id: string | null
          notes: string | null
          created_at: string
          min_stock: number | null
          user_id: string | null
          unit_cost: number | null
          custom_type: string | null
          supplier: string | null
          stock_date: string | null
          current_stock: number | null
        }
        Insert: {
          id?: string
          name: string
          type?: string | null
          quantity?: number
          unit?: string | null
          supplier_id?: string | null
          notes?: string | null
          created_at?: string
          min_stock?: number | null
          user_id?: string | null
          unit_cost?: number | null
          custom_type?: string | null
          supplier?: string | null
          stock_date?: string | null
          current_stock?: number | null
        }
        Update: {
          id?: string
          name?: string
          type?: string | null
          quantity?: number
          unit?: string | null
          supplier_id?: string | null
          notes?: string | null
          created_at?: string
          min_stock?: number | null
          user_id?: string | null
          unit_cost?: number | null
          custom_type?: string | null
          supplier?: string | null
          stock_date?: string | null
          current_stock?: number | null
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact_name: string | null
          email: string | null
          phone: string | null
          address: string | null
          notes: string | null
          created_at: string
          company_name: string | null
          supplier_type: string | null
          ico: string | null
          ic_dph: string | null
          dic: string | null
          bank_account: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          company_name?: string | null
          supplier_type?: string | null
          ico?: string | null
          ic_dph?: string | null
          dic?: string | null
          bank_account?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          contact_name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string
          company_name?: string | null
          supplier_type?: string | null
          ico?: string | null
          ic_dph?: string | null
          dic?: string | null
          bank_account?: string | null
          user_id?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          due_date: string | null
          completed: boolean | null
          category: string | null
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          due_date?: string | null
          completed?: boolean | null
          category?: string | null
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          completed?: boolean | null
          category?: string | null
          created_at?: string
          user_id?: string | null
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'worker'
        }
        Insert: {
          id?: string
          user_id: string
          role?: 'admin' | 'worker'
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'worker'
        }
      }
      vat_settings: {
        Row: {
          id: string
          vat_rate: number
          is_enabled: boolean
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          vat_rate?: number
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          vat_rate?: number
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
      water_costs: {
        Row: {
          id: string
          user_id: string
          month: string
          meter_start: number
          meter_end: number
          total_consumption: number
          price_per_m3: number | null
          total_price: number | null
          notes: string | null
          created_at: string | null
          price_includes_vat: boolean | null
          vat_rate: number | null
        }
        Insert: {
          id?: string
          user_id?: string
          month: string
          meter_start: number
          meter_end: number
          total_consumption: number
          price_per_m3?: number | null
          total_price?: number | null
          notes?: string | null
          created_at?: string | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          month?: string
          meter_start?: number
          meter_end?: number
          total_consumption?: number
          price_per_m3?: number | null
          total_price?: number | null
          notes?: string | null
          created_at?: string | null
          price_includes_vat?: boolean | null
          vat_rate?: number | null
        }
      }
      worker_permissions: {
        Row: {
          id: string
          user_id: string
          can_view_prices: boolean
          can_view_customers: boolean
          can_view_suppliers: boolean
          can_view_today_tasks: boolean
          can_view_harvest: boolean
          can_view_delivery: boolean
          can_view_planting: boolean
          can_view_orders: boolean
          can_view_inventory: boolean
          created_at: string
          updated_at: string
          can_view_dashboard: boolean | null
          can_view_crops: boolean | null
          can_view_blends: boolean | null
          can_view_prep_planting: boolean | null
          can_view_prep_packaging: boolean | null
          can_view_balenie: boolean | null
          can_view_calendar: boolean | null
          can_view_costs_fuel: boolean | null
          can_view_costs_adblue: boolean | null
          can_view_costs_water: boolean | null
          can_view_costs_electricity: boolean | null
          can_view_costs_other: boolean | null
          can_view_seeds: boolean | null
          can_view_packaging: boolean | null
          can_view_substrate: boolean | null
          can_view_labels: boolean | null
          can_view_consumables: boolean | null
          can_view_reports: boolean | null
          can_view_settings: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          can_view_prices?: boolean
          can_view_customers?: boolean
          can_view_suppliers?: boolean
          can_view_today_tasks?: boolean
          can_view_harvest?: boolean
          can_view_delivery?: boolean
          can_view_planting?: boolean
          can_view_orders?: boolean
          can_view_inventory?: boolean
          created_at?: string
          updated_at?: string
          can_view_dashboard?: boolean | null
          can_view_crops?: boolean | null
          can_view_blends?: boolean | null
          can_view_prep_planting?: boolean | null
          can_view_prep_packaging?: boolean | null
          can_view_balenie?: boolean | null
          can_view_calendar?: boolean | null
          can_view_costs_fuel?: boolean | null
          can_view_costs_adblue?: boolean | null
          can_view_costs_water?: boolean | null
          can_view_costs_electricity?: boolean | null
          can_view_costs_other?: boolean | null
          can_view_seeds?: boolean | null
          can_view_packaging?: boolean | null
          can_view_substrate?: boolean | null
          can_view_labels?: boolean | null
          can_view_consumables?: boolean | null
          can_view_reports?: boolean | null
          can_view_settings?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          can_view_prices?: boolean
          can_view_customers?: boolean
          can_view_suppliers?: boolean
          can_view_today_tasks?: boolean
          can_view_harvest?: boolean
          can_view_delivery?: boolean
          can_view_planting?: boolean
          can_view_orders?: boolean
          can_view_inventory?: boolean
          created_at?: string
          updated_at?: string
          can_view_dashboard?: boolean | null
          can_view_crops?: boolean | null
          can_view_blends?: boolean | null
          can_view_prep_planting?: boolean | null
          can_view_prep_packaging?: boolean | null
          can_view_balenie?: boolean | null
          can_view_calendar?: boolean | null
          can_view_costs_fuel?: boolean | null
          can_view_costs_adblue?: boolean | null
          can_view_costs_water?: boolean | null
          can_view_costs_electricity?: boolean | null
          can_view_costs_other?: boolean | null
          can_view_seeds?: boolean | null
          can_view_packaging?: boolean | null
          can_view_substrate?: boolean | null
          can_view_labels?: boolean | null
          can_view_consumables?: boolean | null
          can_view_reports?: boolean | null
          can_view_settings?: boolean | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: 'admin' | 'worker'
      payment_method: 'cash' | 'invoice'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
