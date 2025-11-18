-- Add anonymous usage tracking table to prevent cookie clearing abuse
-- This tracks free trial usage by IP address hash

CREATE TABLE IF NOT EXISTS public.anonymous_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usage_key TEXT NOT NULL UNIQUE, -- SHA256 hash of (IP + fingerprint) - primary tracking
  ip_hash TEXT NOT NULL, -- SHA256 hash of IP address - secondary check
  fingerprint_hash TEXT, -- SHA256 hash of browser fingerprint - secondary check
  analysis_count INTEGER NOT NULL DEFAULT 0,
  blocked_attempts INTEGER DEFAULT 0, -- Track abuse attempts
  last_analysis_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_usage_key ON public.anonymous_usage(usage_key);
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_ip_hash ON public.anonymous_usage(ip_hash);
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_fingerprint_hash ON public.anonymous_usage(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_last_analysis ON public.anonymous_usage(last_analysis_at);

-- Enable RLS
ALTER TABLE public.anonymous_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Allow server-side API access (anon key used in API routes)
-- This prevents direct client access while allowing server-side operations
-- The anon key is used in Next.js API routes, so we need to allow it
CREATE POLICY "Server-side API access" ON public.anonymous_usage
  FOR ALL
  USING (true); -- Allow all operations via server-side API routes
  -- Note: This table should only be accessed via server-side API routes, not directly from client

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_anonymous_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_anonymous_usage_updated_at
  BEFORE UPDATE ON public.anonymous_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_anonymous_usage_updated_at();

