
-- Drop and recreate without user_id in return type
DROP FUNCTION IF EXISTS public.get_shared_link_by_code(text);

CREATE FUNCTION public.get_shared_link_by_code(_share_code text)
 RETURNS TABLE(id uuid, share_code text, title text, source_url text, file_data jsonb, file_count integer, view_count integer, created_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, share_code, title, source_url, file_data, file_count, view_count, created_at, expires_at
  FROM public.shared_links
  WHERE shared_links.share_code = _share_code
  LIMIT 1;
$function$;
