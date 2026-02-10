
-- 1. Fix app_settings: Only admins should read
DROP POLICY IF EXISTS "Authenticated users can read app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

CREATE POLICY "Admins can read app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix shared_cache SELECT: Only own entries or matching source_url  
DROP POLICY IF EXISTS "Authenticated users can read shared cache" ON public.shared_cache;

CREATE POLICY "Users can read own cached entries"
ON public.shared_cache
FOR SELECT
TO authenticated
USING (fetched_by = auth.uid());

-- 3. Fix shared_cache INSERT: Require fetched_by = auth.uid()
DROP POLICY IF EXISTS "Authenticated users can insert shared cache" ON public.shared_cache;

CREATE POLICY "Users can insert own shared cache entries"
ON public.shared_cache
FOR INSERT
TO authenticated
WITH CHECK (fetched_by = auth.uid());

-- 4. Add handle_new_user input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name_value TEXT;
BEGIN
  display_name_value := COALESCE(
    LEFT(NEW.raw_user_meta_data->>'display_name', 100),
    LEFT(NEW.email, 100)
  );
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, display_name_value);
  RETURN NEW;
END;
$$;

-- 5. Add missing RLS policies for download_history
CREATE POLICY "Users can delete own history"
ON public.download_history
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own history"
ON public.download_history
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 6. Add missing DELETE policy for rate_limits
CREATE POLICY "Users can delete own rate limits"
ON public.rate_limits
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
