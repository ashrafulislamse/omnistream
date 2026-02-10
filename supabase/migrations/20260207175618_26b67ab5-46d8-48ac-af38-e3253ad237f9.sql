
-- 1. Fix shared_links: Replace overly permissive "true" SELECT policy with share_code-based access
DROP POLICY IF EXISTS "Authenticated users can view shared links by code" ON public.shared_links;

CREATE POLICY "Authenticated users can view shared links by share_code"
ON public.shared_links
FOR SELECT
TO authenticated
USING (
  share_code = current_setting('request.query.share_code', true)
  OR auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Fix app_settings: Restrict read access to authenticated users only
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

CREATE POLICY "Authenticated users can read app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- 3. Fix shared_cache: Restrict UPDATE to only the user who created the cache entry
DROP POLICY IF EXISTS "Authenticated users can update shared cache" ON public.shared_cache;

CREATE POLICY "Users can update own shared cache entries"
ON public.shared_cache
FOR UPDATE
TO authenticated
USING (fetched_by = auth.uid());
