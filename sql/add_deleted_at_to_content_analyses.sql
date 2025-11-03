-- Add deleted_at column for soft deletes
-- Run this in your Supabase SQL Editor

ALTER TABLE public.content_analyses 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries filtering out deleted records
CREATE INDEX IF NOT EXISTS idx_content_analyses_deleted_at ON public.content_analyses(deleted_at) 
WHERE deleted_at IS NULL;

