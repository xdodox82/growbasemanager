/*
  # Add Delivery Exceptions Table

  1. New Tables
    - `delivery_exceptions`
      - `id` (uuid, primary key) - Unique identifier for the exception
      - `date` (date, unique) - The date when delivery should be skipped or modified
      - `type` (text) - Type of exception (e.g., 'skip', 'holiday', 'custom')
      - `note` (text, nullable) - Optional note explaining the exception
      - `user_id` (uuid) - Reference to the user who created the exception
      - `created_at` (timestamptz) - Timestamp when the exception was created

  2. Security
    - Enable RLS on `delivery_exceptions` table
    - Add policy for authenticated users to manage delivery exceptions

  3. Purpose
    - Track dates when deliveries should be skipped (holidays, maintenance days, etc.)
    - Allow marking special delivery days with custom notes
    - Support delivery route planning by excluding exception dates
*/

CREATE TABLE IF NOT EXISTS public.delivery_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'skip',
  note TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delivery_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage delivery exceptions"
  ON public.delivery_exceptions
  FOR ALL
  TO authenticated
  USING (true);

-- Add index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_delivery_exceptions_date ON public.delivery_exceptions(date);

-- Add index for user_id
CREATE INDEX IF NOT EXISTS idx_delivery_exceptions_user_id ON public.delivery_exceptions(user_id);
