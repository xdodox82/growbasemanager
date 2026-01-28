/*
  # Update RPC function to include ALL order_items fields
  
  1. Purpose
    - Extends the RPC to handle all fields in order_items table
    - Includes: crop_name, unit, packaging_size, has_label, notes, packaging_id, special_requirements, is_special_item, custom_crop_name
    - Ensures complete data insertion without missing fields
  
  2. New Parameters Added
    - p_crop_name: Text crop name
    - p_unit: Text unit (default 'ks')
    - p_packaging_size: Text packaging size (default '50g')
    - p_has_label: Boolean has label (default false)
    - p_notes: Text notes (nullable)
    - p_packaging_id: UUID packaging ID (nullable)
    - p_special_requirements: Text special requirements (nullable)
    - p_is_special_item: Boolean is special item (default false)
    - p_custom_crop_name: Text custom crop name (nullable)
*/

DROP FUNCTION IF EXISTS create_order_item_with_packaging(uuid, uuid, uuid, numeric, integer, text, numeric, numeric, text, integer, boolean);

CREATE OR REPLACE FUNCTION create_order_item_with_packaging(
  p_order_id uuid,
  p_crop_id uuid DEFAULT NULL,
  p_blend_id uuid DEFAULT NULL,
  p_quantity numeric DEFAULT 0,
  p_pieces integer DEFAULT 0,
  p_delivery_form text DEFAULT 'whole',
  p_price_per_unit numeric DEFAULT 0,
  p_total_price numeric DEFAULT 0,
  p_packaging_type text DEFAULT NULL,
  p_container_size_ml integer DEFAULT NULL,
  p_needs_label boolean DEFAULT false,
  p_crop_name text DEFAULT NULL,
  p_unit text DEFAULT 'ks',
  p_packaging_size text DEFAULT '50g',
  p_has_label boolean DEFAULT false,
  p_notes text DEFAULT NULL,
  p_packaging_id uuid DEFAULT NULL,
  p_special_requirements text DEFAULT NULL,
  p_is_special_item boolean DEFAULT false,
  p_custom_crop_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO order_items (
    order_id,
    crop_id,
    blend_id,
    quantity,
    pieces,
    delivery_form,
    price_per_unit,
    total_price,
    packaging_type,
    container_size_ml,
    needs_label,
    crop_name,
    unit,
    packaging_size,
    has_label,
    notes,
    packaging_id,
    special_requirements,
    is_special_item,
    custom_crop_name,
    user_id
  ) VALUES (
    p_order_id,
    p_crop_id,
    p_blend_id,
    p_quantity,
    p_pieces,
    p_delivery_form,
    p_price_per_unit,
    p_total_price,
    p_packaging_type,
    p_container_size_ml,
    p_needs_label,
    p_crop_name,
    p_unit,
    p_packaging_size,
    p_has_label,
    p_notes,
    p_packaging_id,
    p_special_requirements,
    p_is_special_item,
    p_custom_crop_name,
    v_user_id
  )
  RETURNING id INTO v_item_id;

  RETURN v_item_id;
END;
$$;