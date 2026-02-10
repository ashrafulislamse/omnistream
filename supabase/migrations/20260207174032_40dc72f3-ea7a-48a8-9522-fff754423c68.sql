
-- Create app_settings table for admin-configurable settings
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for auth page to check signup status)
CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage app settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default signup_disabled = false
INSERT INTO public.app_settings (key, value) VALUES ('signup_disabled', 'false');
