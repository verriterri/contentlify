# Quick Test Guide - Week 2 Features

## 🚀 Quick Start (5 minutes)

### Step 1: Setup
```bash
# 1. Make sure database is updated
# Run sql/schema.sql in Supabase SQL Editor

# 2. Start dev server
npm run dev

# 3. Navigate to http://localhost:3000/dashboard/analyze
```

### Step 2: Test Blog Scanner
1. **Enter a blog URL** (e.g., `example.com` or any blog you know)
2. Click **"Scan Blog - Free"**
3. Wait for scan to complete (~10-30 seconds)
4. **Expected**: Redirects to `/scan/[scanId]` with all posts listed

### Step 3: Test Post Selection
1. **Select 2-3 posts** using checkboxes
2. If any post has **>5,000 words**, you'll see "Analyze Full Post" checkbox
3. **Toggle the checkbox** → Notice credit calculation updates in footer
4. **Expected**: Footer shows "X posts selected" and "X credits needed"

### Step 4: Test Analysis (if logged in with credits)
1. Click **"Analyze Selected Posts"**
2. **Expected**: Analysis starts, progress shown
3. Wait for completion
4. **Expected**: Results page with affiliate opportunities and product ideas

---

## 🧪 Test Scenarios

### Scenario A: Anonymous User Flow
1. **Log out** (if logged in)
2. Go to `/dashboard/analyze`
3. Scan a blog → ✅ Should work (no auth required)
4. Select posts → ✅ Should work
5. Try to analyze → ❌ Should prompt to sign in

### Scenario B: Per-Post Credit Selection
1. Scan a blog with posts over 5,000 words
2. Select a long post (e.g., 7,500 words)
3. **Check "Analyze Full Post"** → Footer shows 2 credits
4. **Uncheck "Analyze Full Post"** → Footer shows 1 credit
5. Select another long post (e.g., 12,000 words)
6. **Check "Analyze Full Post"** → Footer shows 3 credits (1 + 2)
7. **Uncheck it** → Footer shows 2 credits (1 + 1)

### Scenario C: Credit Calculation Accuracy
Test these word counts:
- 1,000 words → 1 credit (always)
- 5,000 words → 1 credit (always)
- 7,500 words → 1 credit (if unchecked) OR 2 credits (if checked)
- 12,000 words → 1 credit (if unchecked) OR 3 credits (if checked)

### Scenario D: Filters & Sorting
1. Scan a blog with mixed post types
2. **Filter by "2000+ words"** → Only long posts shown
3. **Filter by "0-2 affiliate links"** → Only under-monetized shown
4. **Sort by "Fewest Affiliate Links"** → Posts sorted correctly
5. **Clear filters** → All posts shown again

---

## 🐛 Common Issues to Check

### Issue 1: Blog Scan Fails
**Check:**
- Is the blog URL accessible?
- Does it have a sitemap or RSS feed?
- Check browser console for errors
- Check server logs for API errors

### Issue 2: Posts Not Showing
**Check:**
- Is the blog actually a blog? (some sites don't have posts)
- Check `blog_scans` table in Supabase
- Verify `scan_data` JSONB has posts array

### Issue 3: Credit Calculation Wrong
**Check:**
- Are per-post preferences being saved?
- Is global preference loaded correctly?
- Check `calculateCreditsForAnalysis()` function
- Verify word counts are correct

### Issue 4: Analysis Fails
**Check:**
- Do you have enough credits?
- Is OpenAI API key set?
- Check `analysis_jobs` table for error status
- Check server logs for detailed errors

---

## ✅ Success Checklist

After testing, you should be able to:
- [ ] Scan any blog (sitemap, RSS, or crawl)
- [ ] See all posts with metadata
- [ ] Select posts individually or in bulk
- [ ] Toggle "Analyze Full Post" for long posts
- [ ] See accurate credit calculations
- [ ] Start bulk analysis
- [ ] View results with opportunities and product ideas
- [ ] Filter and sort posts
- [ ] Export affiliate opportunities to CSV

---

## 📊 Test Data

### Good Test Blogs
- WordPress blogs (usually have sitemap)
- Medium publications (have RSS)
- Personal blogs (may need crawling)

### Test URLs
- `https://example.com` (will fail - no real blog)
- Use your own blog or a public blog you know

---

## 🔍 Debugging Tips

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: See API request/response details
3. **Check Supabase Logs**: View database queries and errors
4. **Check Server Logs**: See backend processing logs
5. **Check Database**: Verify data is being saved correctly

---

## 📝 What to Report

If you find issues, note:
1. **What you did** (steps to reproduce)
2. **What you expected** (expected behavior)
3. **What happened** (actual behavior)
4. **Error messages** (from console/logs)
5. **Screenshots** (if applicable)

---

## 🎯 Priority Tests

**Must Test:**
1. ✅ Blog scanner works
2. ✅ Post selection works
3. ✅ Per-post credit toggle works
4. ✅ Credit calculation is accurate
5. ✅ Analysis completes successfully

**Nice to Test:**
- Filters and sorting
- Export features
- Mobile responsiveness
- Error handling

