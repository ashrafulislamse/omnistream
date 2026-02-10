
-- Drop the broken policy we just created
DROP POLICY IF EXISTS "Authenticated users can view shared links by share_code" ON public.shared_links;

-- Create a security definer function to look up shared links by code
-- This bypasses RLS safely and only returns the specific link
CREATE OR REPLACE FUNCTION public.get_shared_link_by_code(_share_code text)
RETURNS TABLE (
  id uuid,
  share_code text,
  title text,
  source_url text,
  file_data jsonb,
  file_count integer,
  view_count integer,
  created_at timestamptz,
  expires_at timestamptz,
  user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, share_code, title, source_url, file_data, file_count, view_count, created_at, expires_at, user_id
  FROM public.shared_links
  WHERE shared_links.share_code = _share_code
  LIMIT 1;
$$;
