/*
  # Fix generate_planting_plan function - use crops table instead of products
  
  1. Changes
     - Replace references to 'products' table with 'crops' table
     - Function logic remains the same
*/

CREATE OR REPLACE FUNCTION generate_planting_plan(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  plan_id UUID,
  crop_name TEXT,
  sow_date DATE,
  delivery_date DATE,
  tray_size TEXT,
  tray_count INTEGER,
  seed_amount_grams NUMERIC,
  total_seed_grams NUMERIC,
  created_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_crop RECORD;
  v_sow_date DATE;
  v_tray_count INTEGER;
  v_seed_amount NUMERIC;
  v_total_seed NUMERIC;
  v_existing_plan RECORD;
  v_plan_id UUID;
  v_created_new BOOLEAN;
BEGIN
  -- Loop through all orders in the date range
  FOR v_order IN
    SELECT DISTINCT o.id, o.delivery_date
    FROM orders o
    WHERE o.delivery_date >= p_start_date
      AND o.delivery_date <= p_end_date
      AND o.status != 'cancelled'
  LOOP
    -- Loop through order items for this order
    FOR v_item IN
      SELECT oi.id, oi.crop_id, oi.blend_id, oi.quantity, oi.packaging_size
      FROM order_items oi
      WHERE oi.order_id = v_order.id
        AND oi.crop_id IS NOT NULL
    LOOP
      -- Get crop details (using crops table, not products)
      SELECT * INTO v_crop
      FROM crops
      WHERE id = v_item.crop_id;
      
      IF v_crop.id IS NULL THEN
        CONTINUE;
      END IF;
      
      -- Calculate sow date
      v_sow_date := v_order.delivery_date - COALESCE(v_crop.days_to_harvest, 10);
      
      -- Calculate tray count (estimate based on expected yield)
      -- Assume packaging_size is like '50g', '100g', etc.
      -- quantity is number of pieces
      v_tray_count := GREATEST(1, CEIL(
        (v_item.quantity * COALESCE(NULLIF(regexp_replace(v_item.packaging_size, '[^0-9]', '', 'g'), '')::NUMERIC, 50)) 
        / COALESCE(NULLIF(v_crop.expected_yield, 0), 200)
      ));
      
      -- Calculate seed amount per tray
      v_seed_amount := COALESCE(v_crop.seed_density, 30);
      
      -- Calculate total seed amount
      v_total_seed := v_tray_count * v_seed_amount;
      
      -- Check if plan already exists for this crop and sow date
      SELECT * INTO v_existing_plan
      FROM planting_plans
      WHERE crop_id = v_item.crop_id
        AND sow_date = v_sow_date
      LIMIT 1;
      
      IF v_existing_plan.id IS NOT NULL THEN
        -- Update existing plan (add to tray count)
        v_plan_id := v_existing_plan.id;
        v_created_new := FALSE;
        
        UPDATE planting_plans
        SET 
          tray_count = COALESCE(tray_count, 0) + v_tray_count,
          total_seed_grams = (COALESCE(tray_count, 0) + v_tray_count) * v_seed_amount
        WHERE id = v_plan_id;
      ELSE
        -- Create new plan
        v_created_new := TRUE;
        
        INSERT INTO planting_plans (
          crop_id,
          order_id,
          sow_date,
          expected_harvest_date,
          tray_count,
          tray_size,
          seed_amount_grams,
          total_seed_grams,
          status
        ) VALUES (
          v_item.crop_id,
          v_order.id,
          v_sow_date,
          v_order.delivery_date,
          v_tray_count,
          'XL',
          v_seed_amount,
          v_total_seed,
          'planned'
        )
        RETURNING id INTO v_plan_id;
      END IF;
      
      -- Return the plan details
      RETURN QUERY
      SELECT
        v_plan_id,
        v_crop.name,
        v_sow_date,
        v_order.delivery_date,
        'XL'::TEXT,
        v_tray_count,
        v_seed_amount,
        v_total_seed,
        v_created_new;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$;
