
-- Allow all authenticated users to read app_settings (e.g. signup_disabled flag)
CREATE POLICY "Authenticated users can read app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);
