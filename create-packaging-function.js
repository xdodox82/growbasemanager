import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const sql = `
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
    price_per_unit, total_price, packaging_type, container_size_ml,
    needs_label, crop_name, unit, packaging_size, notes, packaging_id,
    special_requirements, is_special_item, custom_crop_name
  ) VALUES (
    (p_data->>'order_id')::uuid,
    NULLIF(p_data->>'crop_id', '')::uuid,
    NULLIF(p_data->>'blend_id', '')::uuid,
    (p_data->>'quantity')::numeric,
    COALESCE((p_data->>'pieces')::integer, 0),
    COALESCE(p_data->>'delivery_form', 'whole'),
    (p_data->>'price_per_unit')::numeric,
    (p_data->>'total_price')::numeric,
    p_data->>'package_type',
    NULLIF(p_data->>'package_ml', '')::integer,
    COALESCE((p_data->>'has_label_req')::boolean, false),
    p_data->>'crop_name',
    COALESCE(p_data->>'unit', 'ks'),
    COALESCE(p_data->>'packaging_size', '50g'),
    p_data->>'notes',
    NULLIF(p_data->>'packaging_id', '')::uuid,
    p_data->>'special_requirements',
    COALESCE((p_data->>'is_special_item')::boolean, false),
    p_data->>'custom_crop_name'
  )
  RETURNING id INTO v_item_id;

  RETURN v_item_id;
END;
$$;
`

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

if (error) {
  console.error('Error:', error)
} else {
  console.log('Success! Function created.')
}
