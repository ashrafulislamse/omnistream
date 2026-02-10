
CREATE TABLE public.fetched_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_url TEXT NOT NULL,
  file_data JSONB NOT NULL,
  file_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fetched_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fetched files"
ON public.fetched_files FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fetched files"
ON public.fetched_files FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fetched files"
ON public.fetched_files FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_fetched_files_user ON public.fetched_files(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_fetched_files_url ON public.fetched_files(user_id, source_url);
