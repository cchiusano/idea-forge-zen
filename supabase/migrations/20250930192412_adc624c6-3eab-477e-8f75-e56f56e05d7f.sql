-- Create function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create table to store Google Drive OAuth tokens
CREATE TABLE IF NOT EXISTS public.google_drive_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.google_drive_tokens ENABLE ROW LEVEL SECURITY;

-- Allow all access (since this is a single-user app for now)
CREATE POLICY "Allow all access to tokens"
  ON public.google_drive_tokens
  FOR ALL
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_google_drive_tokens_updated_at
  BEFORE UPDATE ON public.google_drive_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();