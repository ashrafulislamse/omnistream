-- Remove public SELECT policy, require authentication
DROP POLICY IF EXISTS "Anyone can view shared links by code" ON public.shared_links;

CREATE POLICY "Authenticated users can view shared links by code"
ON public.shared_links FOR SELECT
TO authenticated
USING (true);

-- Update the increment function to also require auth check isn't needed since RLS handles it
-- But the security definer function bypasses RLS, so it's fine for view counting