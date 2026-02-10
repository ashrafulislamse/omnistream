
-- Create thumbnails storage bucket (public for reading)
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true);

-- Allow anyone to view thumbnails
CREATE POLICY "Thumbnails are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

-- Allow service role (edge functions) to insert thumbnails
CREATE POLICY "Service role can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'thumbnails');

-- Allow service role to update thumbnails
CREATE POLICY "Service role can update thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'thumbnails');
