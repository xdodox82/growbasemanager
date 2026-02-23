/*
  # Add delivery minimum order limits to delivery routes

  1. Changes
    - Add minimum order amount fields for free delivery by customer type
    - home_min_free_delivery: Minimum order for free delivery (home customers)
    - gastro_min_free_delivery: Minimum order for free delivery (gastro customers)
    - wholesale_min_free_delivery: Minimum order for free delivery (wholesale customers)
  
  2. Purpose
    - Allow route-specific configuration of delivery fees and minimum orders
    - If order total >= minimum, delivery is free
    - If order total < minimum, charge the delivery_fee_[type]
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_routes' AND column_name = 'home_min_free_delivery'
  ) THEN
    ALTER TABLE delivery_routes ADD COLUMN home_min_free_delivery numeric DEFAULT 15;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_routes' AND column_name = 'gastro_min_free_delivery'
  ) THEN
    ALTER TABLE delivery_routes ADD COLUMN gastro_min_free_delivery numeric DEFAULT 30;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_routes' AND column_name = 'wholesale_min_free_delivery'
  ) THEN
    ALTER TABLE delivery_routes ADD COLUMN wholesale_min_free_delivery numeric DEFAULT 50;
  END IF;
END $$;
