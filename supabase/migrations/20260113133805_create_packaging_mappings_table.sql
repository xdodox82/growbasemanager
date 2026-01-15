/*
  # Create Packaging Mappings Table
  
  1. New Tables
    - `packaging_mappings`
      - `id` (uuid, primary key)
      - `crop_id` (uuid, foreign key to crops)
      - `weight_g` (integer) - weight in grams (e.g., 50 for 50g)
      - `packaging_id` (uuid, foreign key to packagings)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
  
  2. Purpose
    - Map crop + weight combinations to default packaging
    - Enable automatic packaging pre-fill in order forms
    - Reduce manual selection when creating orders
  
  3. Security
    - Enable RLS
    - Users can only access their own mappings
    - Policies for select, insert, update, delete
*/

CREATE TABLE IF NOT EXISTS packaging_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid REFERENCES crops(id) ON DELETE CASCADE,
  weight_g integer NOT NULL,
  packaging_id uuid REFERENCES packagings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(crop_id, weight_g, user_id)
);

ALTER TABLE packaging_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own packaging mappings"
  ON packaging_mappings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own packaging mappings"
  ON packaging_mappings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own packaging mappings"
  ON packaging_mappings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own packaging mappings"
  ON packaging_mappings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_packaging_mappings_crop_weight ON packaging_mappings(crop_id, weight_g);
CREATE INDEX IF NOT EXISTS idx_packaging_mappings_user ON packaging_mappings(user_id);