-- Create prices table for crops and blends
CREATE TABLE public.prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE,
  blend_id UUID REFERENCES public.blends(id) ON DELETE CASCADE,
  packaging_size TEXT NOT NULL DEFAULT '100g',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_crop_or_blend CHECK (
    (crop_id IS NOT NULL AND blend_id IS NULL) OR 
    (crop_id IS NULL AND blend_id IS NOT NULL)
  )
);

-- Create VAT settings table
CREATE TABLE public.vat_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vat_rate NUMERIC NOT NULL DEFAULT 20,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default VAT settings
INSERT INTO public.vat_settings (vat_rate, is_enabled) VALUES (20, false);

-- Enable RLS
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vat_settings ENABLE ROW LEVEL SECURITY;

-- Policies for prices
CREATE POLICY "Authenticated users can view prices" 
ON public.prices FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert prices" 
ON public.prices FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update prices" 
ON public.prices FOR UPDATE USING (true);

CREATE POLICY "Admins can delete prices" 
ON public.prices FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for vat_settings
CREATE POLICY "Authenticated users can view vat_settings" 
ON public.vat_settings FOR SELECT USING (true);

CREATE POLICY "Admins can update vat_settings" 
ON public.vat_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_prices_updated_at
BEFORE UPDATE ON public.prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vat_settings_updated_at
BEFORE UPDATE ON public.vat_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();