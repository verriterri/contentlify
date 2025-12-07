-- Migration: Rename blog_scans to site_scans and update column names
-- This migration updates the database schema to use generic "site" and "page" terminology
-- instead of "blog" and "post"

BEGIN;

-- ============================================================================
-- STEP 1: Rename table blog_scans to site_scans
-- ============================================================================
ALTER TABLE public.blog_scans RENAME TO site_scans;

-- ============================================================================
-- STEP 2: Rename columns in site_scans table
-- ============================================================================
ALTER TABLE public.site_scans RENAME COLUMN blog_url TO site_url;
ALTER TABLE public.site_scans RENAME COLUMN total_posts TO total_pages;
ALTER TABLE public.site_scans RENAME COLUMN scanned_posts TO scanned_pages;

-- ============================================================================
-- STEP 3: Update foreign key reference in analysis_jobs table
-- ============================================================================
-- First, drop the existing foreign key constraint
ALTER TABLE public.analysis_jobs 
  DROP CONSTRAINT IF EXISTS analysis_jobs_scan_id_fkey;

-- Update the foreign key to reference the new table name
ALTER TABLE public.analysis_jobs 
  ADD CONSTRAINT analysis_jobs_scan_id_fkey 
  FOREIGN KEY (scan_id) 
  REFERENCES public.site_scans(id) 
  ON DELETE SET NULL;

-- ============================================================================
-- STEP 4: Rename columns in analysis_jobs table
-- ============================================================================
ALTER TABLE public.analysis_jobs RENAME COLUMN total_posts TO total_pages;
ALTER TABLE public.analysis_jobs RENAME COLUMN completed_posts TO completed_pages;
ALTER TABLE public.analysis_jobs RENAME COLUMN failed_posts TO failed_pages;

-- ============================================================================
-- STEP 5: Drop old indexes and create new ones with updated names
-- ============================================================================
-- Drop old indexes
DROP INDEX IF EXISTS public.idx_blog_scans_user_id;
DROP INDEX IF EXISTS public.idx_blog_scans_blog_url;
DROP INDEX IF EXISTS public.idx_blog_scans_expires_at;
DROP INDEX IF EXISTS public.idx_blog_scans_created_at;

-- Create new indexes with updated names
CREATE INDEX IF NOT EXISTS idx_site_scans_user_id ON public.site_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_site_scans_site_url ON public.site_scans(site_url);
CREATE INDEX IF NOT EXISTS idx_site_scans_expires_at ON public.site_scans(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_site_scans_created_at ON public.site_scans(created_at DESC);

-- ============================================================================
-- STEP 6: Drop old RLS policies and create new ones
-- ============================================================================
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own scans or anonymous scans" ON public.site_scans;
DROP POLICY IF EXISTS "Users can insert own scans or anonymous scans" ON public.site_scans;
DROP POLICY IF EXISTS "Users can update own scans" ON public.site_scans;
DROP POLICY IF EXISTS "Users can delete own scans" ON public.site_scans;

-- Create new policies (same logic, but on the renamed table)
CREATE POLICY "Users can view own scans or anonymous scans"
  ON public.site_scans FOR SELECT
  USING (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Users can insert own scans or anonymous scans"
  ON public.site_scans FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Users can update own scans"
  ON public.site_scans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scans"
  ON public.site_scans FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 7: Update table comment
-- ============================================================================
COMMENT ON TABLE public.site_scans IS 'Site scans table (for free site scanning)';

-- ============================================================================
-- STEP 8: Update content_analyses comment if it references blog
-- ============================================================================
COMMENT ON TABLE public.content_analyses IS 'Page analyses with affiliate opportunities and product ideas';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration to verify)
-- ============================================================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%site%';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'site_scans';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'analysis_jobs';
-- SELECT policyname FROM pg_policies WHERE tablename = 'site_scans';

