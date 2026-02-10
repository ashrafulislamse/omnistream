
-- 1. Add UPDATE policy for favorites
CREATE POLICY "Users can update own favorites"
ON public.favorites
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 2. Add UPDATE policy for fetched_files
CREATE POLICY "Users can update own fetched files"
ON public.fetched_files
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 3. Add user DELETE policy for shared_cache
CREATE POLICY "Users can delete own shared cache entries"
ON public.shared_cache
FOR DELETE
TO authenticated
USING (fetched_by = auth.uid());
