
-- Restore shared cache read access (intentionally shared cache)
DROP POLICY IF EXISTS "Users can read own cached entries" ON public.shared_cache;

-- Allow all authenticated users to read cache (this is by design - shared cache)
CREATE POLICY "Authenticated users can read shared cache"
ON public.shared_cache
FOR SELECT
TO authenticated
USING (true);
