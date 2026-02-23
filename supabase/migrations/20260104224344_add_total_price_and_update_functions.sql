/*
  # Add Total Price and Update Functions for Recurring Orders

  ## Changes
  
  1. **Add total_price column to orders table**
     - `total_price` (numeric) - calculated total price of the order based on order_items
  
  2. **Create RPC function: update_future_recurring_orders**
     - Takes current_order_id and array of new order items
     - Finds all child orders (where parent_order_id = current order OR parent_order_id = current.parent_order_id)
     - Deletes all existing order_items for those future orders
     - Inserts new order_items based on the pattern
     - Updates main order fields (crop_id, blend_id, quantity, delivery_form, packaging_size, has_label)
  
  3. **Create function: calculate_order_total_price**
     - Calculates total price from order_items with JOIN to prices table
     - Matches on crop_id/blend_id, packaging_size, and customer_type
     - Returns 0 if no price found
  
  4. **Create trigger: update_order_total_on_items_change**
     - Automatically recalculates total_price when order_items change
     - Runs on INSERT, UPDATE, DELETE of order_items
  
  ## Important Notes
  
  - All future orders (status != 'delivered' and status != 'cancelled') will be updated
  - The RPC function ensures atomicity - all updates happen in a transaction
  - Trigger ensures total_price is always up-to-date
*/

-- Add total_price column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_price NUMERIC DEFAULT 0;

-- Function to calculate order total price from order_items
CREATE OR REPLACE FUNCTION calculate_order_total_price(p_order_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC := 0;
  v_customer_id UUID;
  v_customer_type TEXT;
BEGIN
  -- Get customer info from order
  SELECT customer_id INTO v_customer_id
  FROM orders
  WHERE id = p_order_id;
  
  -- Get customer type
  IF v_customer_id IS NOT NULL THEN
    SELECT customer_type INTO v_customer_type
    FROM customers
    WHERE id = v_customer_id;
  END IF;
  
  -- Default to 'all' if no customer type
  v_customer_type := COALESCE(v_customer_type, 'all');
  
  -- Calculate total from order_items with prices
  SELECT COALESCE(SUM(
    oi.quantity * COALESCE(
      (
        SELECT p.unit_price
        FROM prices p
        WHERE (p.crop_id = oi.crop_id OR p.blend_id = oi.blend_id)
          AND p.packaging_size = oi.packaging_size
          AND (p.customer_type = v_customer_type OR p.customer_type = 'all')
        ORDER BY 
          CASE WHEN p.customer_type = v_customer_type THEN 1 ELSE 2 END,
          p.created_at DESC
        LIMIT 1
      ),
      -- Fallback to crop default price if no specific price found
      (
        SELECT c.expected_yield * 0.05 -- default price calculation
        FROM crops c
        WHERE c.id = oi.crop_id
        LIMIT 1
      ),
      0
    )
  ), 0) INTO v_total
  FROM order_items oi
  WHERE oi.order_id = p_order_id;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to update order total_price when order_items change
CREATE OR REPLACE FUNCTION update_order_total_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_price for the affected order
  IF TG_OP = 'DELETE' THEN
    UPDATE orders
    SET total_price = calculate_order_total_price(OLD.order_id)
    WHERE id = OLD.order_id;
    RETURN OLD;
  ELSE
    UPDATE orders
    SET total_price = calculate_order_total_price(NEW.order_id)
    WHERE id = NEW.order_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on order_items
DROP TRIGGER IF EXISTS trigger_update_order_total ON order_items;
CREATE TRIGGER trigger_update_order_total
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_total_trigger();

-- RPC function to update future recurring orders
CREATE OR REPLACE FUNCTION update_future_recurring_orders(
  p_current_order_id UUID,
  p_new_items JSONB, -- Array of items: [{crop_id, blend_id, quantity, unit, packaging_size, delivery_form, has_label}]
  p_order_updates JSONB -- Order fields to update: {crop_id, blend_id, quantity, unit, delivery_form, packaging_size, has_label}
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
  
  -- Determine the parent_order_id to use for finding siblings
  IF v_current_order.parent_order_id IS NOT NULL THEN
    v_parent_id := v_current_order.parent_order_id;
  ELSE
    v_parent_id := p_current_order_id;
  END IF;
  
  -- Calculate total quantity from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_new_items)
  LOOP
    v_total_quantity := v_total_quantity + COALESCE((v_item->>'quantity')::NUMERIC, 0);
  END LOOP;
  
  -- Find and update all future orders in this recurring series
  FOR v_future_order IN
    SELECT *
    FROM orders
    WHERE (parent_order_id = v_parent_id OR (parent_order_id IS NULL AND id = v_parent_id AND id != p_current_order_id))
      AND delivery_date > v_current_order.delivery_date
      AND status NOT IN ('delivered', 'cancelled')
      AND customer_id = v_current_order.customer_id
    ORDER BY delivery_date ASC
  LOOP
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
  
  -- Return count of updated orders
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing orders to calculate their total_price
UPDATE orders
SET total_price = calculate_order_total_price(id)
WHERE total_price = 0 OR total_price IS NULL;