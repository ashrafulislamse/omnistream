-- Allow anyone to increment view_count on shared links (for anonymous viewers)
DROP POLICY IF EXISTS "Users can update own shared links" ON public.shared_links;

CREATE POLICY "Users can update own shared links"
ON public.shared_links FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can increment view count"
ON public.shared_links FOR UPDATE
USING (true)
WITH CHECK (true);