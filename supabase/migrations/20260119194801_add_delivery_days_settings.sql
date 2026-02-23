/*
  # Add Delivery Days Settings

  1. Purpose
    - Store global delivery days configuration
    - Track which days of the week are delivery days
    
  2. New Table
    - `delivery_days_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `monday` (boolean, default false)
      - `tuesday` (boolean, default false)
      - `wednesday` (boolean, default false)
      - `thursday` (boolean, default false)
      - `friday` (boolean, default false)
      - `saturday` (boolean, default false)
      - `sunday` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS
    - Users can only view/edit their own settings
*/

CREATE TABLE IF NOT EXISTS delivery_days_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  monday boolean DEFAULT false,
  tuesday boolean DEFAULT false,
  wednesday boolean DEFAULT false,
  thursday boolean DEFAULT false,
  friday boolean DEFAULT false,
  saturday boolean DEFAULT false,
  sunday boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_days_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own delivery days settings"
  ON delivery_days_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own delivery days settings"
  ON delivery_days_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own delivery days settings"
  ON delivery_days_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own delivery days settings"
  ON delivery_days_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_delivery_days_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_delivery_days_settings_updated_at
  BEFORE UPDATE ON delivery_days_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_days_settings_updated_at();
