/*
  # Fix create_order_item_with_packaging function
  
  1. Changes
    - Fix column name: unit_price → price_per_unit
    - Fix JSONB field reference: unit_price → price_per_unit
  
  2. Purpose
    - Creates a PostgreSQL function to insert order items with all packaging fields
    - Handles JSONB input for flexible data structure
    - Returns the created order item ID
*/

DROP FUNCTION IF EXISTS create_order_item_with_packaging;

CREATE OR REPLACE FUNCTION create_order_item_with_packaging(p_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_id uuid;
BEGIN
  INSERT INTO order_items (
    order_id, crop_id, blend_id, quantity, pieces, delivery_form,
    price_per_unit, total_price, package_type, package_ml,
    has_label_req, crop_name, unit, packaging_size, notes,
    special_requirements
  ) VALUES (
    (p_data->>'order_id')::uuid,
    NULLIF(p_data->>'crop_id', '')::uuid,
    NULLIF(p_data->>'blend_id', '')::uuid,
    (p_data->>'quantity')::numeric,
    NULLIF(p_data->>'pieces', '')::integer,
    COALESCE(p_data->>'delivery_form', 'cut'),
    (p_data->>'price_per_unit')::numeric,
    (p_data->>'total_price')::numeric,
    p_data->>'package_type',
    p_data->>'package_ml',
    COALESCE((p_data->>'has_label_req')::boolean, false),
    p_data->>'crop_name',
    COALESCE(p_data->>'unit', 'ks'),
    COALESCE(p_data->>'packaging_size', '50g'),
    p_data->>'notes',
    p_data->>'special_requirements'
  )
  RETURNING id INTO v_item_id;
  
  RETURN v_item_id;
END;
$$;