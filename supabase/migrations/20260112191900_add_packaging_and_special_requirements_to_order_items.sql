/*
  # Add Packaging Details and Special Requirements to Order Items

  1. Changes
    - Add `packaging_material` column to order_items (rPET, PET, EKO)
    - Add `packaging_volume_ml` column to order_items (e.g., 250, 500, 750, 1000, 1200)
    - Add `special_requirements` column to order_items for custom notes per item
    - Add `packaging_id` column to track which packaging was used

  2. Notes
    - These fields enhance order item details for better tracking
    - Packaging material and volume help with inventory management
    - Special requirements allow per-item customization
*/

-- Add new columns to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS packaging_material text DEFAULT 'PET';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS packaging_volume_ml integer;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS special_requirements text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS packaging_id uuid REFERENCES packagings(id) ON DELETE SET NULL;