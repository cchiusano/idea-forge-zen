-- Create storage bucket for source documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('sources', 'sources', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for sources bucket
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'sources');

CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'sources');

CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'sources');