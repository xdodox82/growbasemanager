/*
  # Fix RPC Function for Updating Future Recurring Orders

  ## Problem
  The WHERE clause in the RPC function was too complex and had a logical error.
  When parent_order_id is NULL, the condition would never match future orders correctly.

  ## Changes
  1. **Simplified WHERE clause**
     - If current order has parent_order_id = NULL, it's the "parent" order
     - Other orders in the series will have parent_order_id = current order's ID
     - If current order has parent_order_id = some_ID, it's a "child" order
     - Other orders in the series will have parent_order_id = same some_ID
  
  2. **Added debug logging**
     - Added RAISE NOTICE statements to help debug the function
     - Shows how many orders were found and updated
  
  3. **Improved error handling**
     - More descriptive error messages
*/

CREATE OR REPLACE FUNCTION update_future_recurring_orders(
  p_current_order_id UUID,
  p_new_items JSONB,
  p_order_updates JSONB
)
RETURNS TABLE(updated_count INTEGER) AS $$
DECLARE
  v_current_order RECORD;
  v_parent_id UUID;
  v_future_order RECORD;
  v_item JSONB;
  v_count INTEGER := 0;
  v_total_quantity NUMERIC := 0;
BEGIN
  -- Get current order info
  SELECT * INTO v_current_order
  FROM orders
  WHERE id = p_current_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_current_order_id;
  END IF;
  
  RAISE NOTICE 'Current order: ID=%, parent_order_id=%, delivery_date=%', 
    v_current_order.id, v_current_order.parent_order_id, v_current_order.delivery_date;
  
  -- Determine the parent_order_id to use for finding siblings
  IF v_current_order.parent_order_id IS NOT NULL THEN
    v_parent_id := v_current_order.parent_order_id;
    RAISE NOTICE 'Using parent_order_id from current order: %', v_parent_id;
  ELSE
    v_parent_id := p_current_order_id;
    RAISE NOTICE 'Current order is parent. Using its ID: %', v_parent_id;
  END IF;
  
  -- Calculate total quantity from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_new_items)
  LOOP
    v_total_quantity := v_total_quantity + COALESCE((v_item->>'quantity')::NUMERIC, 0);
  END LOOP;
  
  RAISE NOTICE 'Total quantity from items: %', v_total_quantity;
  RAISE NOTICE 'Number of items to insert: %', jsonb_array_length(p_new_items);
  
  -- Find and update all future orders in this recurring series
  -- Simplified WHERE clause: just find orders with parent_order_id = v_parent_id
  FOR v_future_order IN
    SELECT *
    FROM orders
    WHERE parent_order_id = v_parent_id
      AND delivery_date > v_current_order.delivery_date
      AND status NOT IN ('delivered', 'cancelled')
      AND customer_id = v_current_order.customer_id
    ORDER BY delivery_date ASC
  LOOP
    RAISE NOTICE 'Updating future order: ID=%, delivery_date=%', 
      v_future_order.id, v_future_order.delivery_date;
    
    -- Delete existing order_items for this future order
    DELETE FROM order_items WHERE order_id = v_future_order.id;
    
    -- Insert new order_items based on pattern
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_new_items)
    LOOP
      INSERT INTO order_items (
        order_id,
        crop_id,
        blend_id,
        quantity,
        unit,
        packaging_size,
        delivery_form,
        has_label,
        user_id
      ) VALUES (
        v_future_order.id,
        (v_item->>'crop_id')::UUID,
        (v_item->>'blend_id')::UUID,
        (v_item->>'quantity')::NUMERIC,
        v_item->>'unit',
        v_item->>'packaging_size',
        v_item->>'delivery_form',
        (v_item->>'has_label')::BOOLEAN,
        v_future_order.user_id
      );
    END LOOP;
    
    -- Update order main fields
    UPDATE orders
    SET
      crop_id = COALESCE((p_order_updates->>'crop_id')::UUID, crop_id),
      blend_id = COALESCE((p_order_updates->>'blend_id')::UUID, blend_id),
      quantity = COALESCE(v_total_quantity, quantity),
      unit = COALESCE(p_order_updates->>'unit', unit),
      delivery_form = COALESCE(p_order_updates->>'delivery_form', delivery_form),
      packaging_size = COALESCE(p_order_updates->>'packaging_size', packaging_size),
      has_label = COALESCE((p_order_updates->>'has_label')::BOOLEAN, has_label)
    WHERE id = v_future_order.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Total orders updated: %', v_count;
  
  -- Return count of updated orders
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;