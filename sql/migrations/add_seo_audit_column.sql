-- Migration: Add seo_audit column to content_analyses table
-- Run this in your Supabase SQL Editor

-- Add the seo_audit JSONB column to content_analyses table
ALTER TABLE public.content_analyses
ADD COLUMN IF NOT EXISTS seo_audit JSONB;

-- Add a comment to document the column
COMMENT ON COLUMN public.content_analyses.seo_audit IS 'SEO/AEO content audit results including score, critical issues, warnings, and recommendations';



