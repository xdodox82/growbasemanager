/*
  # Add Global VAT Settings

  1. Purpose
    - Store global VAT (DPH) configuration
    - Track if user is VAT payer
    - Store default VAT rate
    
  2. New Table
    - `vat_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `is_vat_payer` (boolean, default false) - Platca DPH
      - `default_vat_rate` (numeric, default 20) - Default VAT rate percentage
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS
    - Users can only view/edit their own settings
*/

CREATE TABLE IF NOT EXISTS vat_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_vat_payer boolean DEFAULT false,
  default_vat_rate numeric DEFAULT 20,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vat_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vat_settings' AND policyname = 'Users can view own VAT settings'
  ) THEN
    CREATE POLICY "Users can view own VAT settings"
      ON vat_settings
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vat_settings' AND policyname = 'Users can insert own VAT settings'
  ) THEN
    CREATE POLICY "Users can insert own VAT settings"
      ON vat_settings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vat_settings' AND policyname = 'Users can update own VAT settings'
  ) THEN
    CREATE POLICY "Users can update own VAT settings"
      ON vat_settings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'vat_settings' AND policyname = 'Users can delete own VAT settings'
  ) THEN
    CREATE POLICY "Users can delete own VAT settings"
      ON vat_settings
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create function if not exists
CREATE OR REPLACE FUNCTION update_vat_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_vat_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_vat_settings_updated_at
      BEFORE UPDATE ON vat_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_vat_settings_updated_at();
  END IF;
END $$;
