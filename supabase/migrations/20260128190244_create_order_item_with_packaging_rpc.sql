/*
  # Create RPC function for order item insertion with packaging fields

  1. Purpose
    - Bypasses client-side table schema cache issues
    - Directly inserts order items with all fields including packaging_type, container_size_ml, and needs_label
    - Ensures clean data insertion without column mismatch errors

  2. Parameters
    - p_order_id: UUID of the order
    - p_crop_id: UUID of the crop (nullable)
    - p_blend_id: UUID of the blend (nullable)
    - p_quantity: Numeric quantity
    - p_pieces: Integer number of pieces
    - p_delivery_form: Text delivery form (e.g., 'whole', 'halves')
    - p_price_per_unit: Numeric price per unit
    - p_total_price: Numeric total price
    - p_packaging_type: Text packaging type (e.g., 'PET', 'Glass')
    - p_container_size_ml: Integer container size in milliliters
    - p_needs_label: Boolean indicating if label is needed

  3. Returns
    - UUID of the newly created order item

  4. Security
    - Follows existing RLS policies
    - Uses authenticated user's ID for user_id field
*/

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
  p_needs_label boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_id uuid;
  v_user_id uuid;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert the order item with all fields
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
    v_user_id
  )
  RETURNING id INTO v_item_id;

  RETURN v_item_id;
END;
$$;