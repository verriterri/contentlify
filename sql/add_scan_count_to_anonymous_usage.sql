-- Add scan_count to anonymous_usage table to track blog scans separately from analyses
-- Anonymous users get 2 free credits: 1 for scanning, 1 for analyzing

ALTER TABLE public.anonymous_usage 
ADD COLUMN IF NOT EXISTS scan_count INTEGER NOT NULL DEFAULT 0;

-- Update index to include scan_count for faster queries
CREATE INDEX IF NOT EXISTS idx_anonymous_usage_scan_count ON public.anonymous_usage(scan_count);

