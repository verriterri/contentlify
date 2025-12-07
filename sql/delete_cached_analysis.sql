-- Delete cached analysis for a specific URL
-- Replace 'YOUR_URL_HERE' with the actual URL you want to clear

-- Option 1: Delete analysis for a specific URL (replace with your URL)
DELETE FROM public.content_analyses
WHERE url = 'YOUR_URL_HERE'
  AND user_id = auth.uid(); -- Only delete your own analyses

-- Option 2: Delete all your cached analyses (use with caution!)
-- DELETE FROM public.content_analyses
-- WHERE user_id = auth.uid();

-- Option 3: Soft delete (mark as deleted instead of actually deleting)
-- UPDATE public.content_analyses
-- SET deleted_at = NOW()
-- WHERE url = 'YOUR_URL_HERE'
--   AND user_id = auth.uid();




