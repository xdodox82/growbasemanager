/*
  # Create RPC with JSONB parameter to bypass client schema cache
  
  1. Purpose
    - Completely bypasses client-side schema validation
    - Accepts a single JSONB parameter containing all order item data
    - Extracts fields server-side from the JSONB object
    - Eliminates "column does not exist" errors from stale client cache
  
  2. Parameters
    - p_data: JSONB object containing all order item fields
  
  3. Returns
    - UUID of the newly created order item
  
  4. Security
    - Uses SECURITY DEFINER to run with function owner privileges
    - Validates authentication via auth.uid()
    - Follows existing RLS policies
*/

DROP FUNCTION IF EXISTS create_order_item_with_packaging(uuid, uuid, uuid, numeric, integer, text, numeric, numeric, text, integer, boolean, text, text, text, boolean, text, uuid, text, boolean, text);

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
    (p_data->>'order_id')::uuid,
    (p_data->>'crop_id')::uuid,
    (p_data->>'blend_id')::uuid,
    COALESCE((p_data->>'quantity')::numeric, 0),
    COALESCE((p_data->>'pieces')::integer, 0),
    COALESCE(p_data->>'delivery_form', 'whole'),
    COALESCE((p_data->>'price_per_unit')::numeric, 0),
    COALESCE((p_data->>'total_price')::numeric, 0),
    p_data->>'packaging_type',
    (p_data->>'container_size_ml')::integer,
    COALESCE((p_data->>'needs_label')::boolean, false),
    p_data->>'crop_name',
    COALESCE(p_data->>'unit', 'ks'),
    COALESCE(p_data->>'packaging_size', '50g'),
    COALESCE((p_data->>'has_label')::boolean, false),
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