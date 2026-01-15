-- Add new columns to seeds table
ALTER TABLE public.seeds 
ADD COLUMN IF NOT EXISTS stocking_date date,
ADD COLUMN IF NOT EXISTS consumption_start_date date,
ADD COLUMN IF NOT EXISTS certificate_url text;

-- Create storage bucket for seed certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('seed-certificates', 'seed-certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for seed certificates
CREATE POLICY "Authenticated users can upload certificates"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'seed-certificates' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view certificates"
ON storage.objects
FOR SELECT
USING (bucket_id = 'seed-certificates');

CREATE POLICY "Authenticated users can update certificates"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'seed-certificates' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete certificates"
ON storage.objects
FOR DELETE
USING (bucket_id = 'seed-certificates' AND auth.role() = 'authenticated');