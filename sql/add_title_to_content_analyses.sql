-- Add title column to content_analyses table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.content_analyses 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Create index for faster lookups by URL and user
CREATE INDEX IF NOT EXISTS idx_content_analyses_url_user ON public.content_analyses(user_id, url, created_at DESC);

