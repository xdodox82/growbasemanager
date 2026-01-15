-- Add min_stock column to seeds table
ALTER TABLE public.seeds ADD COLUMN min_stock numeric DEFAULT NULL;

-- Add min_stock column to packagings table
ALTER TABLE public.packagings ADD COLUMN min_stock integer DEFAULT NULL;

-- Add min_stock column to labels table
ALTER TABLE public.labels ADD COLUMN min_stock integer DEFAULT NULL;

-- Add min_stock column to substrates table
ALTER TABLE public.substrates ADD COLUMN min_stock numeric DEFAULT NULL;

-- Create table for notification settings
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_low_stock BOOLEAN DEFAULT true,
  email_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notification_settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for notification_settings
CREATE POLICY "Users can view own notification settings" 
ON public.notification_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings" 
ON public.notification_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings" 
ON public.notification_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();