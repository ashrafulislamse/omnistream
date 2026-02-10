-- Drop the overly permissive policy and replace with a more targeted one
DROP POLICY IF EXISTS "Anyone can increment view count" ON public.shared_links;

-- Create a function to safely increment view count (no auth required)
CREATE OR REPLACE FUNCTION public.increment_shared_link_views(_share_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.shared_links
  SET view_count = view_count + 1
  WHERE share_code = _share_code;
$$;