
-- =============================================
-- 1. SHARED FETCH CACHE — public read, auth insert
-- =============================================
CREATE TABLE public.shared_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url text NOT NULL,
  file_data jsonb NOT NULL,
  file_count integer NOT NULL DEFAULT 1,
  fetched_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '8 hours')
);

-- Index for fast lookups by URL
CREATE INDEX idx_shared_cache_source_url ON public.shared_cache (source_url);
-- Index for cleanup of expired entries
CREATE INDEX idx_shared_cache_expires_at ON public.shared_cache (expires_at);

-- Unique constraint to avoid duplicate URLs (keep latest)
CREATE UNIQUE INDEX idx_shared_cache_unique_url ON public.shared_cache (source_url);

ALTER TABLE public.shared_cache ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read the shared cache
CREATE POLICY "Authenticated users can read shared cache"
  ON public.shared_cache FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can insert/update cache entries
CREATE POLICY "Authenticated users can insert shared cache"
  ON public.shared_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update shared cache"
  ON public.shared_cache FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Allow service role to delete expired entries (cron cleanup)
CREATE POLICY "Service role can delete expired cache"
  ON public.shared_cache FOR DELETE
  USING (auth.role() = 'service_role');

-- =============================================
-- 2. LINK HEALTH STATUS — track broken links on favorites
-- =============================================
CREATE TABLE public.link_health (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  favorite_id uuid NOT NULL REFERENCES public.favorites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source_url text NOT NULL,
  status text NOT NULL DEFAULT 'healthy', -- 'healthy', 'broken', 'expired', 'unknown'
  last_checked_at timestamp with time zone NOT NULL DEFAULT now(),
  fail_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_link_health_favorite ON public.link_health (favorite_id);
CREATE INDEX idx_link_health_user ON public.link_health (user_id);
CREATE INDEX idx_link_health_status ON public.link_health (status);

ALTER TABLE public.link_health ENABLE ROW LEVEL SECURITY;

-- Users can only see their own link health
CREATE POLICY "Users can view own link health"
  ON public.link_health FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own link health"
  ON public.link_health FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own link health"
  ON public.link_health FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own link health"
  ON public.link_health FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can update all (for the cron health checker)
CREATE POLICY "Service role can manage all link health"
  ON public.link_health FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- 3. CLEANUP FUNCTION — remove expired shared cache entries
-- =============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.shared_cache WHERE expires_at < now();
$$;
