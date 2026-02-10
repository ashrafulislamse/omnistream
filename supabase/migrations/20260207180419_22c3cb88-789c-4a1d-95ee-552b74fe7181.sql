
-- Also allow unauthenticated (anon) users to read app_settings
-- so the Auth page can check signup_disabled before login
CREATE POLICY "Anyone can read app settings"
ON public.app_settings
FOR SELECT
TO anon
USING (true);
