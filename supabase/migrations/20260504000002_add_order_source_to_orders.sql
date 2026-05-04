/*
  # Add order_source to orders

  1. Changes
    - Add `order_source` TEXT DEFAULT 'manual' to orders table
    - Allowed values: 'manual' (entered in GrowBase), 'app' (from PWA/customer app), 'recurring' (auto-generated child of recurring order)
    - Add CHECK constraint to enforce allowed values
*/

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_source_check
  CHECK (order_source IN ('manual', 'app', 'recurring'));

-- Backfill: mark existing child orders (with parent_order_id) as recurring
UPDATE public.orders
  SET order_source = 'recurring'
  WHERE parent_order_id IS NOT NULL
    AND order_source = 'manual';
