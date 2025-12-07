-- Migration: Update JSONB scan_data to use new field names
-- This updates the JSONB data in existing scans to match the new terminology

BEGIN;

-- Update scan_data: rename 'posts' to 'pages' and update summary field names
UPDATE public.site_scans
SET scan_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      scan_data,
      '{pages}',
      COALESCE(scan_data->'posts', '[]'::jsonb)
    ),
    '{summary,avgWordsPerPage}',
    COALESCE(scan_data->'summary'->'avgWordsPerPage', scan_data->'summary'->'avgWordsPerPost', '0'::jsonb)
  ),
  '{summary,pagesWithNoAffiliateLinks}',
  COALESCE(scan_data->'summary'->'pagesWithNoAffiliateLinks', scan_data->'summary'->'postsWithNoAffiliateLinks', '0'::jsonb)
)
WHERE scan_data IS NOT NULL
  AND (
    scan_data ? 'posts' OR
    scan_data->'summary' ? 'avgWordsPerPost' OR
    scan_data->'summary' ? 'postsWithNoAffiliateLinks'
  );

-- Remove old fields if they exist
UPDATE public.site_scans
SET scan_data = scan_data - 'posts'
WHERE scan_data ? 'posts';

UPDATE public.site_scans
SET scan_data = jsonb_set(
  scan_data,
  '{summary}',
  (scan_data->'summary') - 'avgWordsPerPost' - 'postsWithNoAffiliateLinks'
)
WHERE scan_data->'summary' ? 'avgWordsPerPost' OR scan_data->'summary' ? 'postsWithNoAffiliateLinks';

COMMIT;

-- Verification query (run after migration)
-- SELECT id, scan_data->'pages' as pages, scan_data->'summary'->'avgWordsPerPage' as avgWordsPerPage 
-- FROM public.site_scans 
-- LIMIT 5;

