
-- Shared links table: users can share fetched files via unique links
CREATE TABLE public.shared_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  user_id uuid NOT NULL,
  title text,
  source_url text NOT NULL,
  file_data jsonb NOT NULL,
  file_count integer NOT NULL DEFAULT 1,
  view_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone, -- null = never expires
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_links_share_code ON public.shared_links (share_code);
CREATE INDEX idx_shared_links_user ON public.shared_links (user_id);

ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Owner can manage their shared links
CREATE POLICY "Users can view own shared links"
  ON public.shared_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert shared links"
  ON public.shared_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shared links"
  ON public.shared_links FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own shared links"
  ON public.shared_links FOR UPDATE
  USING (auth.uid() = user_id);

-- Anyone can read shared links by share_code (public viewing)
CREATE POLICY "Anyone can view shared links by code"
  ON public.shared_links FOR SELECT
  USING (true);
