/*
  # Fix calculate_order_total_price function to use products table

  1. Changes
    - Replace reference to 'crops' table with 'products' table in the fallback price calculation
    - This function is called when calculating order totals and was causing errors due to non-existent 'crops' table

  2. Notes
    - The 'crops' table was renamed to 'products' but this function wasn't updated
    - This is a CRITICAL fix for order creation/saving functionality
*/

CREATE OR REPLACE FUNCTION public.calculate_order_total_price(p_order_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
-- Fallback to product default price if no specific price found
(
SELECT c.expected_yield * 0.05
FROM products c
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
$function$;
