/*
  # Update RPC Function with New Column Names

  1. Purpose
    - Update create_order_item_with_packaging to use renamed columns
    - package_ml (was packaging_volume_ml)
    - package_type (was packaging_type)
    - has_label_req (was has_label)

  2. Changes
    - Drop and recreate the function with new column mappings
    - Maintain all existing functionality and security
*/

DROP FUNCTION IF EXISTS create_order_item_with_packaging(jsonb);

CREATE OR REPLACE FUNCTION create_order_item_with_packaging(p_data JSONB)
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
    package_type,
    package_ml,
    has_label_req,
    crop_name,
    unit,
    packaging_size,
    notes,
    packaging_id,
    special_requirements,
    is_special_item,
    custom_crop_name,
    user_id
  ) VALUES (
    (p_data->>'order_id')::uuid,
    (p_data->>'crop_id')::uuid,
    (p_data->>'blend_id')::uuid,
    COALESCE((p_data->>'quantity')::numeric, 0),
    COALESCE((p_data->>'pieces')::integer, 0),
    COALESCE(p_data->>'delivery_form', 'whole'),
    COALESCE((p_data->>'price_per_unit')::numeric, 0),
    COALESCE((p_data->>'total_price')::numeric, 0),
    p_data->>'package_type',
    (p_data->>'package_ml')::integer,
    COALESCE((p_data->>'has_label_req')::boolean, false),
    p_data->>'crop_name',
    COALESCE(p_data->>'unit', 'ks'),
    COALESCE(p_data->>'packaging_size', '50g'),
    p_data->>'notes',
    (p_data->>'packaging_id')::uuid,
    p_data->>'special_requirements',
    COALESCE((p_data->>'is_special_item')::boolean, false),
    p_data->>'custom_crop_name',
    v_user_id
  )
  RETURNING id INTO v_item_id;

  RETURN v_item_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_order_item_with_packaging(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_item_with_packaging(jsonb) TO service_role;
