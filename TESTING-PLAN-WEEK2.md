# Week 2 Testing Plan

## Pre-Testing Setup

### 1. Database Setup
- [ ] Run the updated `sql/schema.sql` in Supabase SQL Editor
- [ ] Verify all tables are created:
  - `blog_scans`
  - `analysis_jobs`
  - Updated `users` table with `credits` column
- [ ] Verify RLS policies are in place
- [ ] Test that new user signup grants 1 free credit

### 2. Environment Variables
- [ ] Verify `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] Verify `OPENAI_API_KEY` is set (for AI features)
- [ ] Verify `STRIPE_*` variables are set (if testing payments)

### 3. Start Development Server
```bash
npm run dev
```

---

## Test 1: Blog Scanner (Free, No Auth Required)

### 1.1 Basic Blog Scan
- [ ] Navigate to `/dashboard/analyze` or landing page
- [ ] Enter a blog URL (e.g., `example.com` or `https://example.com`)
- [ ] Click "Scan Blog - Free"
- [ ] **Expected**: Loading indicator appears
- [ ] **Expected**: Scan completes and redirects to `/scan/[scanId]`
- [ ] **Expected**: See blog summary with total posts, words, affiliate links

### 1.2 Test Different Blog Sources
Test with blogs that have:
- [ ] **Sitemap**: Blog with `/sitemap.xml` (should use sitemap method)
- [ ] **RSS Feed**: Blog with `/feed` or `/rss` (should use RSS method)
- [ ] **Crawl Only**: Blog with no sitemap/RSS (should use crawl method)

### 1.3 Test Error Cases
- [ ] Invalid URL format → Should show error message
- [ ] Non-existent domain → Should show error message
- [ ] Blog with no posts → Should show "No posts found" message
- [ ] Rate limiting: Make 6 scans in quick succession → Should show rate limit error

### 1.4 Verify Scan Data Storage
- [ ] Check Supabase `blog_scans` table
- [ ] Verify `scan_data` JSONB contains posts array
- [ ] Verify `expires_at` is set (7 days from now for anonymous)

---

## Test 2: Post Selection Interface

### 2.1 View Scan Results
- [ ] After scan completes, verify you're on `/scan/[scanId]`
- [ ] **Expected**: See blog summary card with stats
- [ ] **Expected**: See quick stats breakdown (under-monetized, partially monetized, etc.)
- [ ] **Expected**: See post list table with all posts

### 2.2 Post Selection
- [ ] Click checkbox on individual post → Post should be selected
- [ ] Click "Select All" → All posts should be selected
- [ ] Click "Deselect All" → All posts should be deselected
- [ ] Click "Select Under-Monetized" → Only high-potential posts selected
- [ ] Use Shift+Click to select range → Multiple posts selected

### 2.3 Per-Post Credit Selection (NEW FEATURE)
- [ ] Find a post with >5,000 words
- [ ] Select the post (checkbox)
- [ ] **Expected**: "Analyze Full Post" checkbox becomes enabled
- [ ] Toggle "Analyze Full Post" checkbox:
  - [ ] Unchecked → Shows "First 5K words" (1 credit)
  - [ ] Checked → Shows "Full post" (2+ credits depending on word count)
- [ ] Verify credit calculation updates in sticky footer
- [ ] Test with multiple long posts:
  - [ ] Select 3 posts over 5,000 words
  - [ ] Toggle some to "Full post", leave others as "First 5K"
  - [ ] Verify credit calculation is accurate

### 2.4 Filters & Sorting
- [ ] **Word Count Filter**: Select "2000+" → Only long posts shown
- [ ] **Affiliate Links Filter**: Select "0-2" → Only under-monetized shown
- [ ] **Date Filter**: Select "Last 6 months" → Only recent posts shown
- [ ] **Sort By**: 
  - [ ] "Fewest Affiliate Links" → Posts sorted correctly
  - [ ] "Most Words" → Posts sorted correctly
  - [ ] "Most Recent" → Posts sorted correctly
- [ ] **Clear Filters**: Click "Clear all filters" → All filters reset

### 2.5 Selection Summary (Sticky Footer)
- [ ] Select posts → Footer appears at bottom
- [ ] **Expected**: Shows "X posts selected"
- [ ] **Expected**: Shows "X credits needed" (updates as preferences change)
- [ ] **Expected**: Shows "Your Credits: Y" (if logged in)
- [ ] **Expected**: Shows "Need Z more credits" if insufficient
- [ ] Test with logged-out user → Should show "Sign In to Analyze"
- [ ] Test with insufficient credits → Should show "Buy Credits" button

---

## Test 3: Bulk Analysis API

### 3.1 Start Bulk Analysis (Logged In)
- [ ] Log in to account
- [ ] Select 3-5 posts (mix of short and long)
- [ ] For long posts, set some to "Full post", others to "First 5K"
- [ ] Click "Analyze Selected Posts"
- [ ] **Expected**: Redirects to bulk analysis page or shows progress
- [ ] **Expected**: Job created in `analysis_jobs` table

### 3.2 Verify Credit Deduction
- [ ] Note your credit balance before analysis
- [ ] Start analysis
- [ ] **Expected**: Credits deducted correctly based on preferences
- [ ] Check `users.credits` in database → Should be reduced
- [ ] Check `content_analyses.credits_used` → Should match calculation

### 3.3 Test Analysis Processing
- [ ] Monitor console logs for processing
- [ ] **Expected**: Each post processed sequentially
- [ ] **Expected**: Affiliate opportunities detected
- [ ] **Expected**: Product ideas generated
- [ ] **Expected**: Analysis saved to `content_analyses` table

### 3.4 Test Job Status Endpoint
- [ ] Get job ID from previous analysis
- [ ] Call `GET /api/analyze/bulk/[jobId]`
- [ ] **Expected**: Returns job status, progress, results
- [ ] **Expected**: Status updates from "queued" → "processing" → "completed"

### 3.5 Test Error Cases
- [ ] **Insufficient Credits**: Select more posts than credits available
  - [ ] **Expected**: Error message with credit requirement
  - [ ] **Expected**: Redirect to pricing page
- [ ] **Invalid Post URL**: Include a broken URL in selection
  - [ ] **Expected**: That post fails, others continue
  - [ ] **Expected**: `failed_posts` count increments
- [ ] **Network Error**: Simulate network failure
  - [ ] **Expected**: Job marked as failed
  - [ ] **Expected**: Credits not deducted for failed posts

---

## Test 4: Results Display

### 4.1 View Analysis Results
- [ ] After analysis completes, navigate to results page
- [ ] **Expected**: See Results component with tabs (Overview, Affiliates, Products)

### 4.2 Overview Tab
- [ ] **Expected**: Blog post info (title, word count, credits used)
- [ ] **Expected**: Stats cards (opportunities, products, estimated revenue)
- [ ] **Expected**: Next actions section with CTAs

### 4.3 Affiliate Opportunities Tab
- [ ] **Expected**: Table with all opportunities
- [ ] **Expected**: Columns: Product, Category, Where Mentioned, Program, Commission
- [ ] Test filters:
  - [ ] Filter by category → Only that category shown
  - [ ] Toggle "Show already linked" → Filters correctly
  - [ ] Sort by confidence → Sorted correctly
- [ ] **Expected**: "Copy All Links" button works
- [ ] **Expected**: "Export CSV" button downloads file

### 4.4 Product Ideas Tab
- [ ] **Expected**: Grid of product idea cards
- [ ] **Expected**: Each card shows type, name, description, price
- [ ] **Expected**: "Generate Outline" button on each card
- [ ] Click "Generate Outline" → Should open modal or navigate to generator

---

## Test 5: Edge Cases & Integration

### 5.1 Large Blog Scan
- [ ] Test with blog that has 100+ posts
- [ ] **Expected**: Scan completes (may take longer)
- [ ] **Expected**: Only first 100 posts shown (free scan limit)
- [ ] **Expected**: Can still select and analyze posts

### 5.2 Anonymous User Flow
- [ ] Log out
- [ ] Scan a blog → Should work (no auth required)
- [ ] Try to analyze posts → Should prompt to sign in
- [ ] Sign in → Should be able to analyze

### 5.3 Credit Preference Persistence
- [ ] Set global preference to "charge extra" in settings
- [ ] Scan blog, select long post
- [ ] **Expected**: "Analyze Full Post" checkbox defaults to checked
- [ ] Change global preference to "don't charge extra"
- [ ] **Expected**: New selections default to unchecked

### 5.4 Multiple Scans
- [ ] Scan same blog twice
- [ ] **Expected**: Both scans saved separately
- [ ] **Expected**: Can access both via their scan IDs

### 5.5 Expired Scan
- [ ] Create scan, manually set `expires_at` to past date in database
- [ ] Try to access scan → Should show "expired" message

---

## Test 6: UI/UX Polish

### 6.1 Mobile Responsiveness
- [ ] Test on mobile viewport (< 768px)
- [ ] **Expected**: Post table becomes scrollable
- [ ] **Expected**: Filters stack vertically
- [ ] **Expected**: Sticky footer remains visible

### 6.2 Loading States
- [ ] During blog scan → Loading indicator visible
- [ ] During bulk analysis → Progress bar updates
- [ ] **Expected**: No UI freezes or blank screens

### 6.3 Visual Indicators
- [ ] **Expected**: 💡 icon on high-potential posts
- [ ] **Expected**: ⚠️ icon on short posts
- [ ] **Expected**: ✓ icon on well-monetized posts
- [ ] **Expected**: Color-coded badges (yellow, green, blue)

---

## Test 7: Performance

### 7.1 Scan Performance
- [ ] Time a blog scan with 50 posts
- [ ] **Expected**: Completes in < 60 seconds
- [ ] **Expected**: No timeout errors

### 7.2 Bulk Analysis Performance
- [ ] Analyze 10 posts
- [ ] **Expected**: Completes in reasonable time (~2-3 seconds per post)
- [ ] **Expected**: Progress updates smoothly

### 7.3 Database Queries
- [ ] Check Supabase logs for slow queries
- [ ] **Expected**: No queries > 1 second
- [ ] **Expected**: Indexes being used

---

## Test 8: Data Accuracy

### 8.1 Word Count Accuracy
- [ ] Compare scanner word count with actual post
- [ ] **Expected**: Within 5% accuracy

### 8.2 Affiliate Link Detection
- [ ] Test with post containing known affiliate links
- [ ] **Expected**: Links detected correctly
- [ ] **Expected**: Count matches manual count

### 8.3 Credit Calculation
- [ ] Test various word counts:
  - [ ] 1,000 words → 1 credit
  - [ ] 5,000 words → 1 credit
  - [ ] 7,500 words → 2 credits (if charge extra)
  - [ ] 12,000 words → 3 credits (if charge extra)
- [ ] **Expected**: Calculations match expected formula

---

## Quick Test Checklist

**Minimum Viable Test (5 minutes):**
1. ✅ Scan a blog (any blog URL)
2. ✅ Select 2-3 posts
3. ✅ Toggle "Analyze Full Post" on a long post
4. ✅ Verify credit calculation updates
5. ✅ Start analysis (if logged in with credits)
6. ✅ View results

**Full Test (30 minutes):**
- Complete all sections above
- Test with multiple blog types
- Test error cases
- Verify data accuracy

---

## Known Issues to Watch For

1. **Rate Limiting**: Anonymous users limited to 5 scans/hour
2. **Timeout**: Very large blogs (>500 posts) may timeout
3. **Credit Calculation**: Must account for per-post preferences
4. **RLS Policies**: Anonymous scans need special handling
5. **Background Processing**: Bulk analysis runs in background (may need job queue later)

---

## Success Criteria

✅ Blog scanner works for sitemap, RSS, and crawl methods  
✅ Post selection interface is intuitive and responsive  
✅ Per-post credit selection works correctly  
✅ Credit calculations are accurate  
✅ Bulk analysis processes posts correctly  
✅ Results display shows all data correctly  
✅ Error handling is graceful  
✅ UI is responsive on mobile  

---

## Next Steps After Testing

1. Fix any bugs found
2. Optimize slow queries
3. Add loading states where missing
4. Improve error messages
5. Add analytics tracking
6. Consider adding job queue for production (Bull, etc.)

