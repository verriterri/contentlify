# ContentMaxer - Complete Cursor Build Plan

## Product Overview

**ContentMaxer** helps bloggers maximize revenue by:
1. **FREE blog scan** - finds all posts (shows ONLY titles, URLs, dates)
2. **1 FREE analysis** (no signup) - proves value on one post
3. Detecting missed affiliate link opportunities
4. Suggesting digital product ideas based on content
5. Generating product outlines to guide development
6. Creating social media posts to promote them

**CRITICAL PRODUCT DECISION:**
- **Free scans show NO helpful metadata** (no word counts, no affiliate link counts, no opportunity indicators)
- **Strategic data only visible to paying users** (protects core value)
- **1 free analysis** (without signup) to prove value
- **First purchase gets 2x credits** (no free credits on signup)

## Pricing (Per-Analysis Model)

**1 analysis = 1 credit** (any post length up to 5,000 words)

### First Purchase Bonus (One-Time Offer):
🎁 **Get DOUBLE credits on your first purchase!**
- Buy 5 → Get 10 analyses - $9.99 (first time only)
- Buy 20 → Get 40 analyses - $29.99 (first time only)  ⭐ Most Popular
- Buy 50 → Get 100 analyses - $49.99 (first time only)
- Buy 100 → Get 200 analyses - $79.99 (first time only)  ⭐ Best Value

### Regular Pricing (After First Purchase):
- 5 analyses - $9.99
- 20 analyses - $29.99
- 50 analyses - $49.99
- 100 analyses - $79.99

Credits never expire. Use across multiple blogs.

## Key User Flow

### For Anonymous Users (No Signup):
1. Enter blog URL → Free scan finds all posts
2. See basic list: **titles, URLs, dates ONLY** (no metadata)
3. Pick any 1 post → Analyze FREE
4. Complete Turnstile (anti-abuse)
5. See full results: opportunities, product ideas, estimated value
6. Want more? "Sign up & get 2x credits on first purchase!"

### After Signup (1 Free Credit):
1. Get 1 free credit to analyze 1 post
2. Can save scans and results permanently
3. **Still see NO metadata** until they have credits (but can use their 1 free credit to analyze)
4. After using free credit: Prompted "Get 2x credits on your first purchase! ⏰ One-time offer"
5. After first purchase: unlock ALL features

### With Credits (Full Power):
1. Blog scans show FULL metadata: word counts, affiliate links, scores
2. Smart filters: "Show under-monetized posts" 💡
3. Opportunity indicators: High/Med/Low potential
4. Sort by: Most opportunities, Fewest links, Longest posts
5. Batch analyze multiple posts
6. Generate product outlines
7. Create social media posts

**The metadata IS the product.** Don't give it away free.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **AI**: OpenAI GPT-4
- **PDF Generation**: react-pdf or jsPDF
- **Deployment**: Vercel
- **Web Scraping**: Cheerio + Puppeteer (if needed)

---

## Development Timeline

- **Week 1**: Foundation (Prompts 1-5)
- **Week 2**: Core Analysis (Prompts 6-10)
- **Week 3**: Product Generation (Prompts 11-16)
- **Week 4**: Social & Newsletter (Prompts 17-20)
- **Week 5**: Polish (Prompts 21-25)
- **Week 6**: Launch Prep (Prompts 26-30)

---

## Environment Variables

Create `.env.local`:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

# THE 33 CURSOR PROMPTS

## Week 1: Foundation

### Prompt 1: Project Setup
**Use: Cursor Composer (CMD+I)**

```
Create a new Next.js 14 project with TypeScript, Tailwind CSS, and App Router.

Setup:
- npx create-next-app@latest contentmaxer --typescript --tailwind --app --no-src-dir
- Install dependencies:
  - npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
  - npm install stripe
  - npm install openai
  - npm install cheerio
  - npm install @radix-ui/react-toast
  - npm install lucide-react
  - npx shadcn-ui@latest init (defaults)

Project structure:
/app
  /page.tsx (landing page)
  /dashboard
    /page.tsx (main dashboard)
    /analyze/page.tsx (blog analysis)
    /products/page.tsx (product library)
    /settings/page.tsx
  /api
    /analyze/route.ts
    /products/route.ts
    /stripe/webhook/route.ts
/components
  /ui (shadcn components)
  /landing
  /dashboard
  /analysis
/lib
  /supabase
  /stripe
  /openai
  /scrapers
  /generators

Create .env.local template with all required variables.
Set up basic folder structure with placeholder files.
```

---

### Prompt 2: Supabase Setup & Auth
**Use: Cursor Composer**

```
Set up Supabase authentication and database schema.

Create /lib/supabase/client.ts:
- Client-side Supabase client
- Server-side Supabase client
- Middleware for auth

Database schema (create SQL file):

-- Users table (extended from Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  credits INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Credit purchases
CREATE TABLE credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  amount INTEGER,
  price DECIMAL(10,2),
  stripe_session_id TEXT,
  status TEXT, -- 'pending', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Blog analyses
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  url TEXT NOT NULL,
  credits_used INTEGER DEFAULT 1,
  affiliate_opportunities JSONB,
  product_ideas JSONB,
  status TEXT, -- 'processing', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Generated products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  analysis_id UUID REFERENCES analyses(id),
  title TEXT,
  description TEXT,
  format TEXT, -- 'pdf', 'markdown', 'docx'
  template TEXT,
  content JSONB,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

Set up RLS policies for security.

Create /components/auth/SignInButton.tsx
Create /components/auth/SignOutButton.tsx
Create /components/auth/AuthProvider.tsx

Implement authentication flow:
- Sign up with email
- Sign in with email
- Magic link login
- Sign out
- Protected routes
```

---

### Prompt 3: Landing Page
**Use: Cursor Composer**

```
Create landing page at /app/page.tsx

Design a conversion-focused landing page for ContentMaxer:

Hero Section:
- Headline: "Find the Money You're Leaving on the Table"
- Subheadline: "Scan your entire blog for missed affiliate opportunities and digital product ideas in one click"
- URL Input: Large input field with placeholder "Enter your blog URL (e.g., yourblog.com)"
- CTA: "Scan My Blog - Free" (primary button)
- Note: "No credit card required • See all your posts in 30 seconds"
- Hero image/screenshot of results

Problem Section:
"Bloggers Miss Thousands in Revenue"
- Posts with no affiliate links
- Long posts barely monetized
- No digital products to sell
- Hard to know which posts have potential

Solution Section:
"ContentMaxer Shows You Exactly Which Posts to Optimize"

How It Works:
1. Enter Blog URL → We scan your entire blog (free)
2. See All Posts → Word count, existing affiliate links, published date
3. Select Posts → Choose which ones to analyze (smart filters included)
4. Get Opportunities → AI finds missed affiliate links and product ideas
5. Generate Outlines → Create digital product outlines to guide development
6. Promote → Get social posts ready to copy-paste

Features Grid:
- Free Blog Scan (see all your posts)
- Smart Post Selection (under-monetized filter)
- Affiliate Link Detection
- Product Idea Generation
- Product Outlines (not full products)
- Social Media Posts
- Never Expires Credits
- Pay Only for What You Analyze

Pricing Section:
Simple Per-Post Pricing:

**🎁 First Purchase Bonus - Get DOUBLE Credits!**
- 5 analyses → 10 analyses - $9.99 (first time only)
- 20 analyses → 40 analyses - $29.99 (first time only) — Most Popular
- 50 analyses → 100 analyses - $49.99 (first time only)
- 100 analyses → 200 analyses - $79.99 (first time only) — Best Value

**Regular Pricing** (after first purchase):
- 5 analyses - $9.99
- 20 analyses - $29.99
- 50 analyses - $49.99
- 100 analyses - $79.99

"Analyze any post, any length, one flat price."
"Credits never expire. Use across multiple blogs."
"First-time buyers get DOUBLE credits!"

Example:
"Blog with 47 posts? Try 1 free, then buy 50 credits (get 100 with first purchase bonus) for $49.99. Analyze all your posts + 53 more!"

Social Proof (placeholder for now):
- "Found $3,200/month in missed opportunities across my blog" - Travel Blogger
- "Analyzed 30 posts, now making an extra $800/month" - Food Blog

FAQ:
- How does the free scan work?
- What counts as one analysis?
- Do credits expire?
- What affiliate programs do you support?
- Can I choose which posts to analyze?
- What if I have multiple blogs?

Footer:
- About
- Blog  
- Support
- Terms
- Privacy

Use shadcn/ui components. Make it mobile responsive.
Modern, clean design. Use purple/blue gradient accent.
Emphasize the FREE blog scan to reduce friction.
```

---

### Prompt 4: Stripe Integration with First Purchase Bonus
**Use: Cursor Composer**

```
Set up Stripe payment integration for credit purchases with 2x first purchase bonus.

Create /lib/stripe/client.ts:
- Initialize Stripe client
- Create checkout session function
- Handle webhook verification

Create Stripe Products in your Stripe Dashboard:
- 5 analyses - $9.99 (price_5analyses)
- 20 analyses - $29.99 (price_20analyses)
- 50 analyses - $49.99 (price_50analyses)
- 100 analyses - $79.99 (price_100analyses)

**Note: The 2x first purchase bonus is applied in the webhook, NOT in Stripe.**

Create /app/api/stripe/checkout/route.ts:
- Accept POST with {priceId, userId}
- Create Stripe checkout session
- Pass metadata: {userId, baseCredits, isFirstPurchase}
- Return session URL
- Store pending purchase in database

Example implementation:
```typescript
export async function POST(req: Request) {
  const { priceId, userId } = await req.json();
  
  // Check if first purchase
  const { data: user } = await supabase
    .from('profiles')
    .select('has_made_first_purchase')
    .eq('id', userId)
    .single();
  
  const isFirstPurchase = !user?.has_made_first_purchase;
  
  // Map price ID to credits
  const creditMap = {
    'price_5analyses': 5,
    'price_20analyses': 20,
    'price_50analyses': 50,
    'price_100analyses': 100,
  };
  
  const baseCredits = creditMap[priceId];
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    metadata: {
      userId,
      baseCredits,
      isFirstPurchase: isFirstPurchase.toString(),
    },
  });
  
  // Store pending purchase
  await supabase.from('credit_purchases').insert({
    user_id: userId,
    amount: baseCredits,
    stripe_session_id: session.id,
    status: 'pending',
  });
  
  return Response.json({ url: session.url });
}
```

Create /app/api/stripe/webhook/route.ts:
- Handle checkout.session.completed
- Check if first purchase
- **Apply 2x bonus if first purchase**
- Add credits to user profile
- Update purchase status to 'completed'
- Mark has_made_first_purchase = true
- Send confirmation email (optional)

Example implementation:
```typescript
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json({ error: 'Webhook error' }, { status: 400 });
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, baseCredits, isFirstPurchase } = session.metadata;
    
    // Apply 2x bonus if first purchase
    const creditsToAdd = isFirstPurchase === 'true' 
      ? parseInt(baseCredits) * 2  // DOUBLE for first purchase
      : parseInt(baseCredits);      // Normal after that
    
    // Add credits to user
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    
    await supabase
      .from('profiles')
      .update({
        credits: (profile.credits || 0) + creditsToAdd,
        has_made_first_purchase: true,  // Mark first purchase used
      })
      .eq('id', userId);
    
    // Update purchase record
    await supabase
      .from('credit_purchases')
      .update({
        status: 'completed',
        actual_credits_granted: creditsToAdd,  // Track bonus
      })
      .eq('stripe_session_id', session.id);
    
    // Optional: Send email confirmation
    // await sendPurchaseConfirmation(userId, creditsToAdd, isFirstPurchase);
  }
  
  return Response.json({ received: true });
}
```

Database schema updates:
```sql
-- Add first purchase tracking
ALTER TABLE profiles ADD COLUMN has_made_first_purchase BOOLEAN DEFAULT FALSE;

-- Add to credit purchases to track bonuses
ALTER TABLE credit_purchases ADD COLUMN actual_credits_granted INTEGER;
```

Create /components/pricing/PricingCard.tsx:
- Display credit packages
- Show first purchase bonus prominently
- "Buy Now" button
- Highlights best value (100-pack with 2x = 200 credits!)

Example:
```typescript
<div className="pricing-card">
  <h3>50 Credits</h3>
  {isFirstPurchase && (
    <div className="first-purchase-badge">
      🎁 First Purchase: Get 100 Credits!
    </div>
  )}
  <div className="price">$49.99</div>
  {isFirstPurchase ? (
    <div className="credits">Get 100 credits (2x bonus!)</div>
  ) : (
    <div className="credits">50 credits</div>
  )}
  <button onClick={() => handlePurchase('price_50analyses')}>
    Buy Now
  </button>
</div>
```

Create /components/pricing/CreditBalance.tsx:
- Shows current credit balance
- "Buy More Credits" button
- Usage history
- Shows if first purchase bonus is still available

Test flow:
1. User clicks "Buy 20 Analyses - $29.99"
2. Redirect to Stripe checkout
3. Complete payment with test card (4242 4242 4242 4242)
4. Webhook processes
5. **First purchase: 40 credits added** (2x bonus!)
6. **Second purchase: 20 credits added** (normal)
7. User redirected to dashboard with success message

Use Stripe test mode for development.
Document webhook setup instructions in README.

**The 2x first purchase bonus is a powerful conversion tool. Make it VERY visible in the UI.**
```

---

### Prompt 5: Dashboard Layout
**Use: Cursor Composer**

```
Create main dashboard layout and navigation.

Create /app/dashboard/layout.tsx:
- Sidebar navigation:
  * Overview
  * Analyze Blog
  * My Products
  * Settings
  * Buy Credits
- Top bar:
  * Credit balance
  * User menu (profile, sign out)
- Mobile responsive (hamburger menu)

Create /app/dashboard/page.tsx (Overview):
- Credit balance card
- Recent analyses (table)
- Quick actions:
  * Analyze new blog
  * View products
  * Buy credits
- Stats:
  * Total analyses
  * Products created
  * Credits used this month

Create /components/dashboard/CreditBalance.tsx:
- Current balance
- Usage this month
- "Buy More Credits" button

Create /components/dashboard/RecentAnalyses.tsx:
- Table of recent blog analyses
- Columns: URL, Date, Opportunities, Products, Actions
- Click to view details

Use shadcn/ui Table, Card, Button components.
Professional, clean dashboard design.
```

---

## Week 2: Core Analysis Features

### Prompt 6: Blog Scanner & Post Discovery (FREE - Minimal Data Only)
**Use: Cursor Composer**

```
Create blog scanning functionality that returns MINIMAL data for free users.

**CRITICAL: Free scans show NO strategic metadata. This protects the core product value.**

Create /lib/scrapers/blog-scanner.ts:

Function: scanBlog(blogUrl: string, userHasCredits: boolean = false)

Steps:
1. Attempt to find sitemap.xml at {blogUrl}/sitemap.xml
2. If sitemap found, parse for post URLs
3. If no sitemap, try RSS feed at {blogUrl}/feed or {blogUrl}/rss
4. If neither, attempt to scrape blog homepage for post links

Return type depends on user status:

For FREE users (userHasCredits = false):
{
  blogUrl: string
  totalPosts: number
  posts: Array<{
    url: string
    title: string
    publishedDate: Date | null
    // NO word count
    // NO affiliate link count
    // NO opportunity scores
  }>
  scannedAt: Date
  method: 'sitemap' | 'rss' | 'crawl'
}

For PAYING users (userHasCredits = true):
{
  blogUrl: string
  totalPosts: number
  posts: Array<{
    url: string
    title: string
    publishedDate: Date | null
    wordCount: number              // ← Only for paying users
    affiliateLinkCount: number     // ← Only for paying users
    opportunityScore: number       // ← Only for paying users
    contentPreview: string
  }>
  summary: {                       // ← Only for paying users
    totalWords: number
    avgWordsPerPost: number
    totalAffiliateLinks: number
    underMonetizedCount: number
  }
  scannedAt: Date
  method: 'sitemap' | 'rss' | 'crawl'
}

Function: getPostMetadata(postUrl: string, getUserMetadata: boolean = false)

Extract basic info:
1. Title (h1, meta og:title, or <title>)
2. Published date (meta tags, structured data)

If getUserMetadata = true (paying users only):
3. Word count (count words in main content)
4. Existing affiliate links (count links matching patterns)
5. Content preview (first 200 chars)
6. Opportunity score (calculated from word count + affiliate links)

Create /lib/scrapers/affiliate-link-detector.ts:

Function: countAffiliateLinks(html: string): number

Detect affiliate links by checking for:
- amazon.com/...?tag=
- amzn.to/
- shareasale.com
- anrdoezrs.net, dpbolvw.net, jdoqocy.com, kqzyfj.com (CJ)
- qksrv.net (Rakuten)
- avantlink.com
- pntrs.com (Partnerize)
- impact.com
- awin1.com
- partnerlinks.io
- URL parameters: ?affiliate, ?ref=, ?aff_id=

Return count of links matching these patterns.

Create /app/api/blog/scan/route.ts:

POST /api/blog/scan
Body: { blogUrl: string }

Flow:
1. Validate blog URL format
2. Check if user is authenticated AND has credits
3. Determine data level:
   - If user has credits: return FULL metadata
   - If anonymous OR no credits: return MINIMAL data (titles, URLs, dates only)
4. Scan blog to find all posts (up to 100 for free tier)
5. For each post:
   - Always get: title, URL, date
   - Only if user has credits: word count, affiliate links, scores
6. Store in database with user_id (null for anonymous)
7. Anonymous scans expire after 7 days

Response for FREE users:
{
  blogUrl: string
  totalPosts: number
  scannedPosts: number
  posts: Array<{
    url: string
    title: string
    publishedDate: string
  }>
  message: "Sign up and purchase credits to see word counts, affiliate link analysis, and opportunity scores"
}

Response for PAYING users:
{
  blogUrl: string
  totalPosts: number
  scannedPosts: number
  posts: Array<{
    url: string
    title: string
    publishedDate: string
    wordCount: number
    affiliateLinkCount: number
    opportunityScore: number
  }>
  summary: {
    totalWords: number
    avgWordsPerPost: number
    totalAffiliateLinks: number
    underMonetizedCount: number
  }
}

Error handling:
- Invalid URL format
- Blog unreachable (404, DNS error)
- No posts found
- Timeout (blogs with 1000+ posts)
- Rate limiting (5 scans per hour per IP for anonymous)

Create /components/scanner/BlogUrlInput.tsx:
- Large input field for blog URL
- "Scan Blog - Free" button
- Loading state with progress indicator
- Shows example URLs

Create /components/scanner/ScanResults.tsx:

For FREE users:
- Shows: "Found X posts"
- Basic list with titles and dates only
- Big CTA: "Purchase credits to unlock word counts, affiliate link analysis, and smart filtering"

For PAYING users:
- Full summary (total posts, words, avg per post)
- Breakdown: under-monetized, partially monetized, well-monetized
- Complete table with all metadata
- Smart filter buttons

**KEY PRINCIPLE: The metadata analysis IS the product. Don't give it away.**

For MVP: Use Cheerio for HTML parsing. Add Puppeteer later if needed.
Rate limit anonymous users: 5 scans per hour per IP.
```

---

### Prompt 6.5: Post Selection Interface (Metadata Only for Paying Users)
**Use: Cursor Composer**

```
Create post selection interface that shows different data based on user status.

**CRITICAL: Strategic metadata (word counts, affiliate links, filters, scores) ONLY visible to users with credits.**

Create /app/scan/[scanId]/page.tsx:

Main post selection page with TWO different views:

═══════════════════════════════════════
VIEW 1: FREE USERS (No Credits)
═══════════════════════════════════════

1. Blog Summary Card:
   - Blog URL and name
   - Total posts found
   - Scan date
   - **NO word counts, NO affiliate link data**

2. Simple Post List:
   - Just titles, URLs, and dates
   - NO checkboxes (can't select yet)
   - NO word counts
   - NO affiliate link counts
   - NO opportunity indicators
   - NO smart filters

3. Upgrade Prompt (Prominent):
   ┌─────────────────────────────────────────┐
   │ 🔒 Unlock Full Analysis                 │
   │                                         │
   │ Purchase credits to see:                │
   │ ✓ Word counts for each post             │
   │ ✓ Affiliate link analysis               │
   │ ✓ Opportunity scores                    │
   │ ✓ Smart filters (under-monetized, etc)  │
   │ ✓ Batch post selection                  │
   │                                         │
   │ [Get 2x Credits on First Purchase]      │
   └─────────────────────────────────────────┘

═══════════════════════════════════════
VIEW 2: PAYING USERS (Has Credits)
═══════════════════════════════════════

1. Blog Summary Card:
   - Blog URL and name
   - Total posts found
   - **Total words across all posts**
   - **Average words per post**
   - **Total existing affiliate links**
   - Scan date

2. Quick Stats Breakdown:
   - Under-monetized posts: X posts (1500+ words, 0-2 affiliate links) 💡
   - Partially monetized: X posts (3-9 affiliate links)
   - Well-monetized: X posts (10+ affiliate links) ✓
   - Short posts: X posts (<800 words) ⚠️

3. Smart Selection Buttons:
   - "Select Under-Monetized (X posts)" 
   - "Select Recent Posts (Last 6 Months)"
   - "Select Long Posts (1500+ words)"
   - "Select All Unmonetized (0 affiliate links)"
   - "Select All" / "Deselect All"

4. Post List Table:
   Columns: [Checkbox] [Title] [Word Count] [Affiliate Links] [Date] [Status]
   
   For each post show:
   - Checkbox for selection
   - Post title (truncated with tooltip)
   - **Word count**
   - **Affiliate link count with indicator:**
     * 0-2 links: 💡 "High potential"
     * 3-9 links: "Some links"
     * 10+ links: ✓ "Well monetized"
   - Published date
   - Status: "Not analyzed" | "Analyzed X days ago"

5. Visual Indicators:
   - 💡 HIGH POTENTIAL: 1500+ words, 0-2 links
   - ⚠️ LIMITED: <800 words
   - ✓ MONETIZED: 10+ links
   - 🔄 ANALYZED: Already analyzed

6. Filters & Sorting:
   Filters:
   - Word count: All | 500-1000 | 1000-2000 | 2000+ 
   - Affiliate links: All | 0-2 | 3-9 | 10+
   - Date: All | Last month | Last 6 months | Last year
   - Status: All | Not analyzed | Already analyzed
   
   Sort by:
   - Most Recent (default)
   - Oldest First
   - Most Words
   - Fewest Affiliate Links
   - Most Affiliate Links

7. Selection Summary (Sticky Footer):
   - "X posts selected"
   - "X credits needed"
   - Current credit balance: "You have Y credits"
   - If insufficient: "Need Z more credits"
   - Buttons:
     * "Buy Credits" (if insufficient)
     * "Analyze Selected Posts" (if sufficient)

═══════════════════════════════════════

Create /components/scanner/PostSelectionTable.tsx:
- Accepts `userHasCredits` prop
- Renders simple list OR full table based on credits
- Virtualized table for performance (if many posts)
- Checkbox selection with shift-click for range
- Mobile responsive (cards on mobile)

Create /components/scanner/SmartFilters.tsx:
- Only renders if user has credits
- Quick filter chips
- Apply multiple filters
- Show active filter count

Create /components/scanner/SelectionSummary.tsx:
- Only renders if user has credits
- Sticky bottom bar
- Always visible selection count and cost
- Clear CTA buttons

Create /components/scanner/UpgradePrompt.tsx:
- Prominent CTA for free users
- Shows what they're missing
- Links to pricing with first purchase bonus

Database schema addition:
CREATE TABLE blog_scans (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NULL,
  blog_url TEXT,
  total_posts INTEGER,
  scanned_posts INTEGER,
  scan_data JSONB, -- Full data stored
  scan_data_minimal JSONB, -- Minimal data (titles/dates only)
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

Implementation logic:
```javascript
const userHasCredits = user?.credits > 0;

if (!userHasCredits) {
  // Show minimal view
  return <MinimalPostList posts={scan.scan_data_minimal} />
} else {
  // Show full view with metadata
  return <FullPostSelectionTable posts={scan.scan_data} />
}
```

Handle edge cases:
- User signs up mid-scan: Refresh to show full data
- User runs out of credits: Show upgrade prompt
- Scan expired: Prompt to rescan

**The strategic data is the product. Gate it properly.**
```

---

### Prompt 6.75: Abuse Prevention for Free Analysis
**Use: Cursor Composer**

```
Implement multi-layer abuse prevention for the 1 free analysis.

**GOAL: Prevent users from abusing the free analysis by creating multiple accounts or using VPNs.**

Install dependencies:
npm install @fingerprintjs/fingerprintjs
npm install @marsidev/react-turnstile

Create /lib/abuse-prevention/fingerprint.ts:

```typescript
import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<any> | null = null;

export async function getFingerprint(): Promise<string> {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  
  const fp = await fpPromise;
  const result = await fp.get();
  
  return result.visitorId; // Unique device fingerprint
}
```

Create /lib/abuse-prevention/check-usage.ts:

```typescript
import { createHash } from 'crypto';

function createUsageKey(ipAddress: string, fingerprint: string): string {
  return createHash('sha256')
    .update(`${ipAddress}_${fingerprint}`)
    .digest('hex');
}

export async function canAnalyzeFree(
  ipAddress: string,
  fingerprint: string
): Promise<{ allowed: boolean; reason?: string }> {
  
  const usageKey = createUsageKey(ipAddress, fingerprint);
  
  // Check database for existing usage
  const { data: usage } = await supabase
    .from('anonymous_usage')
    .select('*')
    .eq('usage_key', usageKey)
    .single();
  
  if (usage) {
    if (usage.analysis_count >= 1) {
      return {
        allowed: false,
        reason: 'free_trial_used'
      };
    }
    
    // Check rate limiting (max 1 per minute)
    const timeSince = Date.now() - new Date(usage.last_analysis_at).getTime();
    if (timeSince < 60000) {
      await incrementBlockedAttempts(usageKey);
      return {
        allowed: false,
        reason: 'rate_limit'
      };
    }
  }
  
  return { allowed: true };
}

export async function recordFreeAnalysis(
  ipAddress: string,
  fingerprint: string,
  blogUrl: string
) {
  const usageKey = createUsageKey(ipAddress, fingerprint);
  
  await supabase.from('anonymous_usage').upsert({
    usage_key: usageKey,
    ip_address: ipAddress,
    fingerprint: fingerprint,
    blog_url: blogUrl,
    analysis_count: 1,
    last_analysis_at: new Date().toISOString(),
  });
}
```

Database schema:
CREATE TABLE anonymous_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_key TEXT UNIQUE NOT NULL,
  ip_address TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  blog_url TEXT,
  analysis_count INTEGER DEFAULT 1,
  blocked_attempts INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_usage_key ON anonymous_usage(usage_key);
CREATE INDEX idx_ip_address ON anonymous_usage(ip_address);

-- Cleanup old entries (run nightly)
DELETE FROM anonymous_usage WHERE created_at < NOW() - INTERVAL '30 days';

Create /components/analysis/FreeAnalysisButton.tsx:

```typescript
import { Turnstile } from '@marsidev/react-turnstile';
import { getFingerprint } from '@/lib/abuse-prevention/fingerprint';
import { useState, useEffect } from 'react';

export function FreeAnalysisButton({ postUrl, blogUrl }) {
  const [turnstileToken, setTurnstileToken] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    getFingerprint().then(setFingerprint);
  }, []);
  
  const handleAnalyze = async () => {
    if (!turnstileToken) {
      alert('Please complete verification');
      return;
    }
    
    setLoading(true);
    
    const response = await fetch('/api/analyze/free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postUrl,
        blogUrl,
        fingerprint,
        turnstileToken
      })
    });
    
    const data = await response.json();
    
    if (data.requiresSignup) {
      showSignupModal(data.message);
    } else {
      showResults(data.analysis);
    }
    
    setLoading(false);
  };
  
  return (
    <div>
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={setTurnstileToken}
      />
      
      <button 
        onClick={handleAnalyze}
        disabled={!turnstileToken || !fingerprint || loading}
        className="..."
      >
        {loading ? 'Analyzing...' : 'Analyze Free (No Signup)'}
      </button>
    </div>
  );
}
```

Update /app/api/analyze/free/route.ts:

```typescript
export async function POST(req: Request) {
  const { 
    postUrl, 
    blogUrl,
    fingerprint, 
    turnstileToken 
  } = await req.json();
  
  // 1. Verify Turnstile (stops bots)
  const turnstileValid = await verifyTurnstile(turnstileToken);
  if (!turnstileValid) {
    return Response.json({ 
      error: 'Please complete verification' 
    }, { status: 403 });
  }
  
  // 2. Get IP address
  const ipAddress = getClientIP(req);
  
  // 3. Check if user can analyze
  const usageCheck = await canAnalyzeFree(ipAddress, fingerprint);
  if (!usageCheck.allowed) {
    const message = usageCheck.reason === 'free_trial_used'
      ? 'You\'ve used your free analysis. Sign up for 5 FREE credits!'
      : 'Please wait 60 seconds before analyzing again';
      
    return Response.json({
      error: message,
      requiresSignup: true
    }, { status: 429 });
  }
  
  // 4. Check blog URL abuse (max 3 free analyses per blog per day)
  const blogCheck = await checkBlogUsage(blogUrl);
  if (!blogCheck.allowed) {
    return Response.json({
      error: 'This blog was recently analyzed. Sign up to continue.',
      requiresSignup: true
    }, { status: 429 });
  }
  
  // 5. Rate limit (max 1 per minute per IP)
  const rateLimitKey = `rate:${ipAddress}`;
  const rateLimitCheck = await redis.get(rateLimitKey);
  if (rateLimitCheck) {
    return Response.json({
      error: 'Please wait 60 seconds before analyzing again'
    }, { status: 429 });
  }
  await redis.setex(rateLimitKey, 60, '1');
  
  // 6. Perform analysis (actual AI work)
  const analysis = await analyzePost(postUrl);
  
  // 7. Record usage
  await recordFreeAnalysis(ipAddress, fingerprint, blogUrl);
  
  // 8. Return results with signup CTA
  return Response.json({
    analysis,
    message: 'Sign up free to get 2x credits on your first purchase!'
  });
}
```

Environment variables needed:
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

Get Turnstile keys from: https://dash.cloudflare.com/

Abuse Prevention Layers:
1. ✅ Browser fingerprinting (device ID)
2. ✅ IP address tracking
3. ✅ Turnstile CAPTCHA (stops bots)
4. ✅ Combined usage key (IP + fingerprint)
5. ✅ Rate limiting (1 per minute)
6. ✅ Blog URL tracking (max 3 free per blog/day)
7. ✅ Blocked attempts counter

This multi-layer approach makes it very difficult to abuse the free trial while keeping friction low for legitimate users.
```

---

### Prompt 7: Affiliate Opportunity Detector
**Use: Cursor Composer**

```
Create AI-powered affiliate opportunity detection.

Two-step system:

Step 1: AI Product Detection
Create /lib/ai/product-detector.ts

Function: detectProducts(content: string, existingLinks: string[])

Use OpenAI API with this prompt:
"Analyze this blog post and identify products/services mentioned that could be affiliate-linked.

For each product found:
1. Extract exact product/brand name
2. Determine category (software, physical_product, service, hosting, course, etc.)
3. Provide context quote where mentioned
4. Confidence score (0-1)
5. Is it already linked in the content?

Return JSON array:
[
  {
    product: string,
    category: string,
    context: string,
    confidence: number,
    isAlreadyLinked: boolean
  }
]

Only include:
- Specific brands/products (not generic terms)
- Products that could have affiliate programs
- Products mentioned in recommendation/review context"

Step 2: Match Against Affiliate Programs
Create /lib/data/affiliate-programs.ts with curated list:

export const AFFILIATE_PROGRAMS = [
  {
    name: "Amazon Associates",
    url: "https://affiliate-program.amazon.com",
    applies_to: ["all_physical_products"],
    commission: "1-10%",
    categories: ["physical_product", "electronics", "books"]
  },
  {
    name: "Notion Partners",
    url: "https://notion.so/affiliates",
    applies_to: ["notion"],
    commission: "$10/user",
    categories: ["software"]
  },
  // Add 50-100 top programs:
  // - Hosting: Bluehost, SiteGround, WP Engine
  // - Email: ConvertKit, Mailchimp
  // - Courses: Teachable, Thinkific, Gumroad
  // - Tools: Canva, Adobe, Grammarly
];

Function: matchAffiliatePrograms(detectedProducts)
- Check if exact match in curated list
- Check category match
- Return matching programs with commission info
- If no match: return "Search '[product] affiliate program' suggestion"

Return type:
{
  product: string
  category: string
  context: string
  confidence: number
  isAlreadyLinked: boolean
  programs: Array<{
    name: string
    url: string
    commission: string
    isPrimary: boolean
  }>
}[]

This approach:
- AI finds the products (accurate)
- You provide verified program info (honest)
- Doesn't hallucinate commission rates
- Maintainable and scalable
```

---

### Prompt 8: Product Idea Generator
**Use: Cursor Composer**

```
Create digital product idea generator.

Create /lib/ai/product-ideas-generator.ts

Function: generateProductIdeas(content: string, title: string)

Use OpenAI API with this prompt:
"Based on this blog post, suggest 5-10 digital product ideas the author could create and sell.

For each product idea:
1. Product type (checklist, guide, template, workbook, cheat sheet, course outline, resource list)
2. Title
3. Description (2-3 sentences)
4. Target audience
5. Suggested price point ($5-50)
6. Why it fits this content
7. Estimated creation time

Focus on:
- Quick to create (under 2 hours)
- High value to reader
- Natural extension of blog content
- Can be created from AI generation

Return JSON array:
[
  {
    type: string,
    title: string,
    description: string,
    audience: string,
    price: number,
    reasoning: string,
    timeToCreate: string
  }
]"

Response should suggest a mix of product types:
- Checklists (simplest)
- Resource lists
- Templates
- Guides (1-2 pages)
- Workbooks (interactive)

Sort by ease of creation (checklists first).

Create /components/analysis/ProductIdeas.tsx:
- Card grid of product ideas
- Shows type, title, description
- Suggested price
- "Generate This Product" button
- Can select multiple to generate in bulk
```

---

### Prompt 9: Bulk Analysis API Endpoint
**Use: Cursor Composer**

```
Create API endpoint to analyze multiple selected posts.

Create /app/api/analyze/bulk/route.ts:

POST /api/analyze/bulk
Body: { 
  scanId: string,
  postUrls: string[],
  userId: string 
}

Flow:
1. Verify user is authenticated
2. Check user has enough credits (1 credit per post)
3. If insufficient credits, return error with purchase link
4. Create bulk analysis job in database
5. Process posts sequentially (to avoid rate limits):
   a. Scrape post content
   b. Detect affiliate opportunities (AI call)
   c. Generate product ideas (AI call)
   d. Save analysis to database
   e. Deduct 1 credit
   f. Update job progress
6. Return job ID for progress tracking

Response:
{
  jobId: string
  totalPosts: number
  creditsRequired: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
}

Create /app/api/analyze/bulk/[jobId]/route.ts:

GET /api/analyze/bulk/[jobId]
Returns current job status and progress

Response:
{
  jobId: string
  status: 'processing' | 'completed' | 'failed'
  progress: {
    completed: number
    total: number
    currentPost: string | null
  }
  results: Array<{
    postUrl: string
    status: 'pending' | 'completed' | 'failed'
    analysisId: string | null
  }>
}

Create /app/api/analyze/single/route.ts:

POST /api/analyze/single
Body: { postUrl: string, userId: string }

For analyzing a single post:
1. Check user has at least 1 credit
2. Scrape post content
3. Detect affiliate opportunities
4. Generate product ideas
5. Deduct 1 credit
6. Save analysis
7. Return results immediately

Response:
{
  analysisId: string
  postUrl: string
  title: string
  wordCount: number
  creditsUsed: 1
  remainingCredits: number
  affiliateOpportunities: [...],
  productIdeas: [...],
  analyzedAt: Date
}

Create /lib/scrapers/post-content-scraper.ts:

Function: scrapePostContent(url: string)

Extract from individual post:
1. Title
2. Main content (clean HTML and text)
3. Word count
4. Existing affiliate links (for comparison)
5. Meta description
6. Images (for context)

Return type:
{
  url: string
  title: string
  content: string (cleaned HTML)
  textContent: string (for AI)
  wordCount: number
  existingLinks: Array<{href: string, text: string, isAffiliate: boolean}>
  scrapedAt: Date
}

Error handling:
- Not enough credits → Return clear upgrade message
- Post URL invalid/unreachable → Mark as failed, don't charge credits
- AI API error → Retry 3x with exponential backoff
- Timeout (>30s per post) → Mark as failed, don't charge credits

Rate limiting:
- Max 50 posts per bulk job
- Max 5 concurrent bulk jobs per user
- For jobs with 10+ posts, process in background

Create /components/analysis/BulkAnalysisProgress.tsx:
- Real-time progress bar
- Shows: "Analyzing post 15 of 32..."
- Current post being analyzed
- Estimated time remaining
- Cancel button (for long jobs)

Create /components/analysis/AnalysisQueue.tsx:
- Shows queued and processing analyses
- Status indicators
- Cancel button for pending analyses

Database schema updates:
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  scan_id UUID REFERENCES blog_scans(id),
  total_posts INTEGER,
  completed_posts INTEGER DEFAULT 0,
  failed_posts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'queued',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP NULL
);

CREATE TABLE analyses (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES analysis_jobs(id) NULL,
  user_id UUID REFERENCES users(id),
  post_url TEXT,
  post_title TEXT,
  word_count INTEGER,
  credits_used INTEGER DEFAULT 1,
  affiliate_opportunities JSONB,
  product_ideas JSONB,
  status TEXT DEFAULT 'completed',
  analyzed_at TIMESTAMP DEFAULT NOW()
);

User experience:
1. User selects 25 posts on scan results page
2. Clicks "Analyze Selected Posts"
3. If signed in with credits: analysis starts immediately
4. If not signed in: prompt to sign up
5. If insufficient credits: show purchase options
6. During analysis: show progress in real-time
7. After completion: redirect to results dashboard
```
2. Detecting opportunities...
3. Generating product ideas...
4. Complete!

Results page shows:
- Blog info (title, word count, pages)
- Affiliate opportunities table
- Product ideas grid
- Actions: "Generate Products" or "Run New Analysis"
```

---

### Prompt 10: Results Display Components
**Use: Cursor Composer**

```
Create components to display analysis results.

Create /components/analysis/Results.tsx:
Main results container with tabs:
- Affiliate Opportunities
- Product Ideas
- Overview

Create /components/analysis/AffiliateOpportunities.tsx:
Table with columns:
- Product/Service
- Category
- Where Mentioned (context quote)
- Affiliate Program(s)
- Est. Commission
- Actions (Copy Link, Learn More)

Features:
- Filter by category
- Sort by confidence
- Show/hide already linked items
- Bulk actions: "Copy All Links"
- Export to CSV

Create /components/analysis/ProductIdeaCard.tsx:
Card showing:
- Product type badge
- Title
- Description
- Target audience
- Suggested price
- "Generate" button (opens modal to select format/template)

Create /components/analysis/OverviewStats.tsx:
- Total opportunities found
- Estimated additional revenue
- Pages scanned
- Credits used
- Next actions

Use shadcn/ui: Table, Card, Badge, Tabs, Dialog
Make results visually impressive - users should feel they got value.
```

---

## Week 3: Product Generation

### Prompt 11: Product Generator Core
**Use: Cursor Composer**

```
Create digital product content generator.

Create /lib/ai/product-generator.ts

Function: generateProductContent(idea: ProductIdea, template: string)

Use OpenAI API with detailed prompts for each product type:

For Checklist:
"Create a comprehensive checklist for: {title}

Description: {description}
Target audience: {audience}

Format as:
- Introduction paragraph (why this checklist matters)
- Main checklist items (15-25 items)
- Each item should be actionable
- Group into 3-5 logical sections
- Add brief tip for complex items
- Conclusion with next steps

Return markdown format."

For Guide:
"Create a detailed guide for: {title}

Description: {description}
Target audience: {audience}

Structure:
1. Introduction (problem this solves)
2. Step-by-step instructions (5-10 steps)
3. Each step with:
   - Clear heading
   - Detailed explanation
   - Example if applicable
   - Pro tip
4. Common mistakes to avoid
5. Resources and next steps

Return markdown format with proper headings."

For Template:
"Create a fillable template for: {title}

Description: {description}
Target audience: {audience}

Include:
- Instructions on how to use
- Template sections with [FILL IN] placeholders
- Example of completed template
- Tips for customization

Return markdown format."

For Resource List:
"Create a curated resource list for: {title}

Description: {description}
Target audience: {audience}

Include:
- 15-25 carefully selected resources
- Organized into categories
- For each resource:
  * Name
  * Type (tool/article/course/book)
  * Brief description (1-2 sentences)
  * Why it's useful
  * URL (use realistic but generic URLs)

Return markdown format."

Response type:
{
  content: string (markdown)
  wordCount: number
  sections: string[]
}

Create /app/api/products/generate/route.ts:
- POST endpoint
- Accepts: { ideaId, template, format }
- Generates content
- Saves to database
- Returns product ID
```

---

### Prompt 12: Template System
**Use: Cursor Composer**

```
Create product template system.

Create /lib/templates/index.ts:

Define 3 templates per product type:

CHECKLIST_TEMPLATES = {
  minimal: {
    name: "Minimal",
    description: "Clean, simple checklist",
    style: "bullet points, no decorations"
  },
  detailed: {
    name: "Detailed",
    description: "With tips and explanations",
    style: "each item has sub-points and pro tips"
  },
  professional: {
    name: "Professional",
    description: "Formatted for business use",
    style: "formal tone, grouped sections, executive summary"
  }
}

GUIDE_TEMPLATES = {
  stepByStep: {
    name: "Step-by-Step",
    description: "Linear process guide",
    style: "numbered steps, clear progression"
  },
  comprehensive: {
    name: "Comprehensive",
    description: "In-depth with examples",
    style: "detailed sections, examples, case studies"
  },
  quickStart: {
    name: "Quick Start",
    description: "Fast implementation guide",
    style: "action-focused, minimal explanation"
  }
}

TEMPLATE_TEMPLATES = {
  basic: {
    name: "Basic Template",
    description: "Simple fill-in-the-blank",
    style: "form-like with clear fields"
  },
  advanced: {
    name: "Advanced Template",
    description: "With examples and guidance",
    style: "detailed instructions, examples provided"
  },
  interactive: {
    name: "Interactive Workbook",
    description: "Questions and exercises",
    style: "prompts, reflection questions, space for notes"
  }
}

RESOURCE_LIST_TEMPLATES = {
  categorized: {
    name: "Categorized List",
    description: "Organized by type",
    style: "grouped into categories, descriptions"
  },
  annotated: {
    name: "Annotated List",
    description: "With detailed explanations",
    style: "longer descriptions, use cases, recommendations"
  },
  comparison: {
    name: "Comparison Table",
    description: "Side-by-side comparison",
    style: "table format, pros/cons, pricing"
  }
}

Create /components/products/TemplateSelector.tsx:
- Modal to choose template
- Show preview of each template style
- "Select Template" buttons

These templates guide the AI prompt engineering.
```

---

### Prompt 13: PDF Generator
**Use: Cursor Composer**

```
Create PDF export functionality.

Install: npm install jspdf jspdf-autotable

Create /lib/generators/pdf-generator.ts:

Function: generatePDF(content: MarkdownContent, metadata: ProductMetadata)

Steps:
1. Parse markdown to structured data
2. Create jsPDF document
3. Add header with product title
4. Style sections appropriately:
   - H1: Large, bold
   - H2: Medium, bold, colored
   - H3: Regular, bold
   - Paragraphs: Regular text
   - Lists: Indented with bullets
   - Code blocks: Monospace, gray background
5. Add footer with:
   - Page numbers
   - "Created with ContentMaxer"
   - Date
6. Return PDF as base64 or blob

Styling:
- Professional font (Helvetica)
- Clean margins
- Proper spacing
- Branded colors (subtle)
- Print-ready

Function: generateWordDoc(content, metadata)
- Use similar approach
- Export as .docx using docx library
- If too complex, just do markdown export for now

Create /app/api/products/export/route.ts:
- POST with {productId, format: 'pdf' | 'markdown' | 'docx'}
- Generate file
- Upload to Supabase storage
- Return download URL

Create /components/products/ExportButton.tsx:
- Dropdown: PDF / Markdown / Docx
- Click to generate
- Loading state
- Download link appears when ready

Store files in Supabase Storage:
- Bucket: product-exports
- Path: {userId}/{productId}/{filename}
- Generate signed URL for download (expires in 1 hour)
```

---

### Prompt 14: Product Library
**Use: Cursor Composer**

```
Create product library view.

Create /app/dashboard/products/page.tsx:

Layout:
- Grid of product cards
- Filters:
  * Product type
  * Date created
  * Source blog
- Sort options:
  * Newest first
  * Oldest first
  * Most downloaded

Create /components/products/ProductCard.tsx:
Card showing:
- Product type badge
- Title
- Created date
- Source blog
- Quick stats (downloads, views)
- Actions:
  * View
  * Download (PDF/Markdown/Docx)
  * Share
  * Delete

Create /app/dashboard/products/[id]/page.tsx:
Product detail view:
- Full product content (markdown rendered)
- Metadata (created date, source, template used)
- Export options
- Edit button (opens editor - future feature)
- Share options
- Related products

Create /components/products/ProductViewer.tsx:
- Renders markdown as formatted HTML
- Professional styling
- Print-friendly
- Copy to clipboard button

Database query optimizations:
- Paginated product lists
- Eager load metadata
- Cache frequently accessed products

User should feel like they have a growing library of valuable assets.
```

---

### Prompt 15: Product Editor (Basic)
**Use: Cursor Composer**

```
Create basic product editing functionality.

Create /components/products/ProductEditor.tsx:

Features:
- Markdown editor (use react-markdown-editor-lite or similar)
- Live preview
- Save button
- Reset button
- Version history (future feature - placeholder for now)

Layout:
- Split view: Editor | Preview
- Toolbar:
  * Bold, italic, heading
  * List, link
  * Undo/redo
- Auto-save draft every 30 seconds

Create /app/api/products/update/route.ts:
- PATCH endpoint
- Updates product content
- Maintains version history
- Returns updated product

For MVP: Keep editor simple
- Text editing works
- Formatting preserved
- Can update and save

Advanced features for later:
- Collaborative editing
- Comments
- AI rewriting suggestions
- Template switching

Use a simple markdown editor library to start.
Goal: User can tweak AI-generated content before exporting.
```

---

### Prompt 16: Bulk Product Generation
**Use: Cursor Composer**

```
Add ability to generate multiple products at once.

Create /components/analysis/BulkProductGenerator.tsx:

Modal with:
- Checkbox list of product ideas
- Select all / deselect all
- Template selector for each (or apply one template to all)
- Estimated time and credit cost
- "Generate All" button

Flow:
1. User selects 3-5 product ideas
2. Chooses templates
3. Clicks "Generate All"
4. Shows progress:
   - Product 1: Generating... ✓
   - Product 2: Generating... ⏳
   - Product 3: Waiting...
5. When complete, shows success message
6. Links to product library

Create /app/api/products/bulk-generate/route.ts:
- POST with array of product requests
- Process sequentially (avoid rate limits)
- Update progress in database
- Client polls for updates

Technical consideration:
- Long-running requests (may need job queue)
- For MVP: Process up to 5 products synchronously
- Add queue system (Bull/Redis) later if needed

Bulk generation should feel fast and efficient.
Key feature for power users.
```

---

## Week 4: Social & Newsletter Features

### Prompt 17: Social Media Post Generator
**Use: Cursor Composer**

```
Create social media post generator.

Create /lib/ai/social-post-generator.ts:

Function: generateSocialPosts(product: Product)

Generate posts for 4 platforms:
1. Twitter/X (280 chars)
2. LinkedIn (1,000 chars)
3. Facebook (500 chars)
4. Instagram (2,200 chars with hashtags)

Use OpenAI with this prompt:
"Create social media posts to promote this digital product:

Title: {title}
Description: {description}
Price: {price}

Generate 4 posts:

1. TWITTER/X (280 chars max):
- Hook in first line
- Value proposition
- Call to action
- 2-3 relevant hashtags

2. LINKEDIN (professional tone, 1000 chars):
- Start with insight or question
- Explain value
- Professional CTA
- Light hashtags (2-3)

3. FACEBOOK (casual, engaging, 500 chars):
- Conversational tone
- Benefits-focused
- Direct CTA
- Emoji usage OK

4. INSTAGRAM (visual description, 2200 chars):
- Longer storytelling approach
- Value-focused
- Multiple hashtags (10-15)
- Call to action in bio note

Return JSON with each platform's post."

Create /components/products/SocialPosts.tsx:
- Tab interface (Twitter / LinkedIn / FB / IG)
- Post preview with character count
- "Copy" button for each
- "Edit" button (opens simple editor)
- Preview shows how post will look on each platform

Create /app/dashboard/products/[id]/social/page.tsx:
- Generate social posts for product
- Shows all 4 platforms
- Easy copy/paste
- Regenerate button (uses 1 credit)

Make copying effortless - one click to clipboard.
```

---

### Prompt 18: Newsletter Generator
**Use: Cursor Composer**

```
Create newsletter email generator.

Create /lib/ai/newsletter-generator.ts:

Function: generateNewsletter(product: Product, style: 'casual' | 'professional')

Generate email newsletter to promote product:

Prompt:
"Create a newsletter email promoting this product:

Title: {title}
Description: {description}
Price: {price}

Style: {style}

Structure:
1. Subject line (compelling, not salesy)
2. Preview text
3. Email body:
   - Personal greeting
   - Hook/story opening
   - Problem this product solves
   - What's inside the product
   - Social proof (placeholder)
   - Clear CTA (button text + URL placeholder)
   - PS with additional value
4. Alt subject lines (3 options)

Return JSON with all components."

Create /components/products/NewsletterPreview.tsx:
- Email preview (styled like actual email)
- Edit subject line
- Edit body (rich text editor)
- Copy HTML or plain text
- Send test email (ConvertKit/Mailchimp integration - future)

Create /app/dashboard/products/[id]/newsletter/page.tsx:
- Generate newsletter for product
- Choose style
- Preview
- Copy/export
- Integration options (placeholder)

For MVP:
- Generate content
- Preview
- Copy to clipboard

Future:
- Direct send via email provider API
- A/B test subject lines
- Schedule sends
```

---

### Prompt 19: Content Calendar
**Use: Cursor Composer**

```
Create simple content calendar for product launches.

Create /app/dashboard/calendar/page.tsx:

View:
- Calendar grid (monthly view)
- Color-coded by content type:
  * Blog analysis
  * Product creation
  * Social post
  * Newsletter send

Features:
- Add product launch date
- Auto-suggest promotion schedule:
  * Week before: Teaser posts
  * Launch day: Announcement
  * Day after: Testimonial request
  * Week after: Case study
- Drag and drop to reschedule
- Mark as complete

Create /components/calendar/ContentCalendar.tsx:
- Uses react-big-calendar or similar
- Click date to add content
- Click event to view/edit

Create /app/api/calendar/route.ts:
- CRUD for calendar events
- Link to products
- Reminder system (future)

Database table:
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  product_id UUID REFERENCES products(id),
  type TEXT, -- 'launch', 'social', 'newsletter'
  title TEXT,
  date DATE,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
);

For MVP: Basic calendar view
Simple to-do list would work too.
Goal: Help users plan product launches.
```

---

### Prompt 20: Sharing & Distribution
**Use: Cursor Composer**

```
Add sharing and distribution features.

Create /components/products/ShareModal.tsx:

Options:
1. Generate shareable link
   - Public view of product (read-only)
   - Custom URL: contentmaxer.com/p/{shortId}
   - Anyone with link can view

2. Download as:
   - PDF
   - Markdown
   - Docx

3. Direct share to:
   - Twitter (pre-filled post)
   - LinkedIn (pre-filled post)
   - Facebook (pre-filled post)
   - Email (mailto link with content)

4. Embed code:
   - Iframe embed for blog
   - Copy HTML code

Create /app/p/[shortId]/page.tsx:
- Public product view
- Minimal UI (no dashboard chrome)
- Shows product content
- "Get Your Own ContentMaxer Account" CTA
- SEO optimized (og:tags, meta description)

Create /app/api/products/share/route.ts:
- Generate short link
- Track views
- Analytics for shared products

Database:
CREATE TABLE shared_products (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  short_id TEXT UNIQUE,
  user_id UUID REFERENCES profiles(id),
  views INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP
);

Analytics to track:
- Views on shared products
- Conversions from shared links
- Most shared products

This helps with viral growth - users share products, non-users see value, sign up.
```

---

## Week 5: Polish & Settings

### Prompt 21: User Settings Page
**Use: Cursor Composer**

```
Create comprehensive settings page.

Create /app/dashboard/settings/page.tsx:

Sections:

1. Profile Settings:
   - Name
   - Email (read-only, from Supabase)
   - Avatar (upload to Supabase storage)
   - Update button

2. Affiliate Settings:
   - Store affiliate IDs for different programs:
     * Amazon Associates ID
     * ShareASale ID
     * Impact ID
     * Custom tags
   - Used to pre-fill affiliate links in analysis
   - Secure storage (encrypted)

3. Preferences:
   - Default template preferences
   - Email notifications (when analysis complete)
   - Newsletter (product updates)
   - Timezone

4. Billing:
   - Current credit balance
   - Purchase history (table)
   - Download invoices
   - Manage payment methods (Stripe portal link)

5. API Keys (future):
   - Generate API key
   - API documentation link
   - Usage limits

6. Danger Zone:
   - Export all data
   - Delete account (with confirmation)

Create /app/api/settings/route.ts:
- GET: Fetch user settings
- PATCH: Update settings
- Validate inputs

Database:
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  affiliate_ids JSONB, -- {amazon: '', shareASale: ''}
  preferences JSONB,
  updated_at TIMESTAMP
);

Use shadcn/ui Form components with validation.
```

---

### Prompt 22: Onboarding Flow
**Use: Cursor Composer**

```
Create new user onboarding experience.

Create /app/onboarding/page.tsx:

Multi-step wizard (3 steps):

Step 1: Welcome
- "Welcome to ContentMaxer!"
- Explain what the product does
- "Let's get you set up"
- Next button

Step 2: Add Affiliate IDs (optional)
- "Enter your affiliate IDs to streamline analysis"
- Form for:
  * Amazon Associates ID
  * ShareASale ID
  * Other
- "Skip" or "Save & Continue"

Step 3: First Analysis
- "Let's scan your first blog post"
- URL input
- "You have 0 credits. Buy credits to get started"
- Or: "Here's 1 free credit to try it out" (onboarding bonus)
- Scan button

After completion:
- Mark user as onboarded
- Redirect to dashboard
- Show success message

Database:
ALTER TABLE profiles ADD COLUMN onboarded BOOLEAN DEFAULT FALSE;

Create /lib/onboarding/welcome-bonus.ts:
- Give new users 1 free credit to try the product
- Or don't charge for first analysis (loss leader)

Smooth onboarding increases activation and retention.
```

---

### Prompt 23: Help Documentation
**Use: Cursor Composer**

```
Create help center and documentation.

Create /app/help/page.tsx:

Sections:

1. Getting Started:
   - How ContentMaxer works
   - Buying credits
   - Running your first analysis

2. Features:
   - Affiliate opportunity detection
   - Product idea generation
   - Generating products
   - Exporting and sharing

3. Best Practices:
   - Writing monetizable blog content
   - Choosing the right products to create
   - Promoting your products

4. Pricing & Billing:
   - How page counting works
   - Credit packages explained
   - Refund policy

5. Technical:
   - Supported blog platforms
   - Scraping limitations
   - Affiliate program database

6. FAQ:
   - Common questions and answers

Create /components/help/SearchBar.tsx:
- Search help articles
- Instant results
- Popular articles

Create /components/help/ArticleCard.tsx:
- Title, description, category
- Read time
- Click to read full article

Format articles in markdown.
Store in /content/help/*.md files.

Use Next.js dynamic routes: /app/help/[slug]/page.tsx

Add "Help" link in dashboard sidebar and footer.
Include "?" icon throughout app with contextual help tooltips.
```

---

### Prompt 24: Error Handling & Loading States
**Use: Cursor Chat**

```
Improve error handling and loading states throughout the app.

1. Create /components/common/ErrorBoundary.tsx:
   - Catch React errors
   - Show friendly error page
   - Log to Sentry (add Sentry later)
   - "Report this issue" button

2. Create /components/common/LoadingSpinner.tsx:
   - Consistent loading spinner
   - Use throughout app
   - Branded colors

3. Update all API routes with consistent error responses:
   - Status codes: 200, 400, 401, 403, 404, 500
   - Error messages in JSON: { error: string, details?: string }

4. Add toast notifications for user feedback:
   - Success: "Analysis complete!"
   - Error: "Something went wrong. Please try again."
   - Info: "Your product is being generated..."

5. Loading states for key actions:
   - Analyzing blog (show progress)
   - Generating product (show spinner)
   - Exporting PDF (show spinner)
   - Saving settings (button disabled)

6. Empty states:
   - No products yet: "Generate your first product"
   - No analyses yet: "Scan your first blog"
   - No credits: "Buy credits to get started"

7. Form validation:
   - URL input: validate format
   - Settings: validate affiliate IDs
   - Show errors inline

Use shadcn/ui Toast component for notifications.
Every user action should have clear feedback.
```

---

### Prompt 25: Mobile Responsiveness
**Use: Cursor Chat**

```
Ensure all pages are fully mobile responsive.

Check these pages:
1. Landing page
2. Dashboard
3. Blog analysis
4. Product library
5. Product detail
6. Settings

For each page:
- Test on mobile viewport (375px width)
- Navigation: hamburger menu on mobile
- Tables: horizontal scroll or cards on mobile
- Forms: full width inputs
- Buttons: touch-friendly size (min 44px)
- Text: readable without zoom

Create /components/layout/MobileNav.tsx:
- Slide-out menu
- Touch-friendly
- Shows credit balance
- User menu

Update Tailwind config if needed:
- Add mobile-first breakpoints
- Ensure all custom components work on mobile

Test key user flows on mobile:
1. Sign up → buy credits → analyze blog → view results
2. Generate product → export PDF → share

Mobile users are significant portion of traffic.
Must work perfectly on phones and tablets.
```

---

## Week 6: Launch Preparation

### Prompt 26: Performance Optimization
**Use: Cursor Chat**

```
Optimize app performance for production.

1. Next.js optimizations:
   - Use next/image for all images
   - Enable static generation where possible
   - Dynamic imports for heavy components
   - Prefetch navigation routes

2. Database optimizations:
   - Add indexes to frequently queried columns
   - Optimize queries (avoid N+1)
   - Use database connection pooling

3. API optimizations:
   - Cache OpenAI responses (identical prompts)
   - Rate limit API endpoints
   - Use Redis for caching (add later if needed)

4. Bundle size:
   - Remove unused dependencies
   - Code split large components
   - Lazy load non-critical features

5. Lighthouse audit:
   - Run on landing page and dashboard
   - Aim for 90+ score
   - Fix accessibility issues
   - Improve SEO score

6. Monitor performance:
   - Add Vercel Analytics
   - Track Core Web Vitals
   - Set up error monitoring (Sentry)

Run these commands:
- npm run build (check bundle size)
- npm run analyze (if you have webpack-bundle-analyzer)

Fast app = better user experience = better conversion.
```

---

### Prompt 27: SEO & Meta Tags
**Use: Cursor Composer**

```
Add SEO optimization throughout the app.

Create /lib/seo/metadata.ts:

Export default metadata for pages:
- Landing page
- Dashboard (noindex)
- Public product pages (index)
- Help articles (index)

For each page, add:
- Title tag
- Meta description
- OpenGraph tags (og:title, og:description, og:image)
- Twitter card tags
- Canonical URL

Create /app/sitemap.ts:
- Generate sitemap.xml
- Include:
  * Landing page
  * Help articles
  * Public product pages (if any)

Create /app/robots.txt:
- Allow all except /dashboard, /api
- Reference sitemap

Landing page SEO:
- H1: Main headline with primary keyword
- H2s: Support keywords
- Alt text on images
- Structured data (JSON-LD):
  * Organization
  * WebApplication
  * FAQ schema for FAQ section

Create /components/seo/StructuredData.tsx:
- Component to inject JSON-LD
- Use on landing page and help articles

Blog posts (for future content marketing):
- /app/blog setup
- Article schema
- Author schema

Long-term SEO strategy:
- Rank for "[niche] affiliate programs"
- "how to monetize [niche] blog"
- "create digital products from blog"

SEO helps with organic acquisition - crucial for growth.
```

---

### Prompt 28: Analytics & Tracking
**Use: Cursor Composer**

```
Set up analytics and tracking.

1. Google Analytics 4:
   - Add GA4 tracking code
   - Track page views
   - Track events:
     * Sign up
     * Purchase credits
     * Analyze blog
     * Generate product
     * Export product
     * Share product

Create /lib/analytics/events.ts:
- trackEvent function
- Pre-defined event names
- Include metadata (credits used, product type, etc.)

2. Conversion tracking:
   - Track signup → purchase funnel
   - Track product generation → export rate
   - Track shared products → new signups

3. User behavior:
   - Time spent on analysis results
   - Most popular product types
   - Drop-off points

4. Dashboard analytics:
   - Show user their own stats:
     * Total analyses run
     * Products created
     * Credits used
     * Most profitable products (future)

5. Admin analytics (for you):
   - MRR (Monthly Recurring Revenue) - wait, we're not subscription
   - Monthly revenue from credit purchases
   - User retention (day 1, day 7, day 30)
   - Most popular features
   - Churn rate

Create /app/admin/analytics/page.tsx:
- Protected route (your user ID only)
- Show key business metrics:
  * Total users
  * Total revenue
  * Average credits per user
  * Product generation rate
  * Top referral sources

Set up PostHog or Mixpanel for product analytics (optional but recommended).

Track everything - data helps you make informed product decisions.
```

---

### Prompt 29: Legal Pages
**Use: Cursor Composer**

```
Create legal pages (Terms of Service, Privacy Policy).

Create /app/legal/terms/page.tsx:

Terms of Service should cover:
1. Acceptance of terms
2. Description of service
3. User responsibilities:
   - Comply with affiliate program TOS
   - Own rights to blog content
   - Follow FTC guidelines for affiliate disclosure
4. Intellectual property:
   - User owns generated content
   - ContentMaxer owns platform
5. Payment terms:
   - Credits are non-refundable (or 7-day refund policy)
   - Pricing subject to change
6. Prohibited uses:
   - No spam
   - No scraping
   - No reselling
7. Limitation of liability
8. Termination
9. Changes to terms

Create /app/legal/privacy/page.tsx:

Privacy Policy should cover:
1. What data we collect:
   - Email, name
   - Affiliate IDs (encrypted)
   - Blog content (temporarily)
   - Payment info (via Stripe)
   - Usage analytics
2. How we use it:
   - Provide service
   - Improve product
   - Send emails (with opt-out)
3. Data sharing:
   - Third parties (OpenAI, Stripe, Supabase)
   - No selling of data
4. Data security:
   - Encryption
   - Secure storage
5. User rights:
   - Access data
   - Delete account
   - Export data
6. Cookies and tracking
7. GDPR and CCPA compliance

Add footer links to these pages.
Checkbox on signup: "I agree to Terms and Privacy Policy"

Store acceptance in database:
ALTER TABLE profiles ADD COLUMN terms_accepted_at TIMESTAMP;

Use a legal template generator or consult a lawyer for production.
For MVP: Use Termly.io or similar service to generate compliant policies.

Legal protection is important - don't skip this.
```

---

### Prompt 30: Launch Checklist
**Use: Cursor Chat**

```
Final pre-launch checklist and deployment.

Technical Checklist:
□ All features working
□ No critical bugs
□ Performance optimized (Lighthouse score >90)
□ Mobile responsive
□ Error handling in place
□ Loading states everywhere
□ Analytics tracking working
□ SEO tags on all pages
□ Sitemap generated
□ Robots.txt configured

Content Checklist:
□ Landing page copy finalized
□ Pricing page clear
□ Help docs written
□ FAQ comprehensive
□ Legal pages published (Terms, Privacy)
□ About page (your story)
□ Blog posts ready (1-3 for launch)

Marketing Checklist:
□ Product Hunt submission drafted
□ Twitter/X account created
□ Launch tweet written
□ Email to waitlist ready (if you have one)
□ Reddit posts planned (r/Entrepreneur, r/Blogging)
□ Press kit prepared (optional)

Business Checklist:
□ Stripe products created in live mode
□ Payment flows tested with real cards
□ Refund policy defined
□ Support email set up (support@contentmaxer.com)
□ Feedback system in place (email or Canny)
□ Customer support process defined

Security Checklist:
□ Environment variables secure
□ API keys in Vercel (not in code)
□ Database RLS policies active
□ Rate limiting on API routes
□ Supabase dashboard secured
□ No console.logs with sensitive data

Deployment:
1. Final git commit
2. Push to main branch
3. Vercel auto-deploys
4. Test production URL
5. Monitor error logs
6. Watch analytics

Day 1 Plan:
- Post on Product Hunt (8am PT)
- Share on Twitter/X
- Post in relevant subreddits
- Email any waitlist
- Monitor for bugs
- Respond to feedback quickly

First Week Goals:
- 100 signups
- 10 paying customers
- <5 critical bugs
- >4.5 star rating (if Product Hunt)

Good luck! 🚀

Create launch.md file with this checklist for reference.
```

---

## Post-Launch Features (Prompts 31-33)

### Prompt 31: Analytics Dashboard
**Use: After initial traction**

```
Build user analytics dashboard.

Create /app/dashboard/analytics/page.tsx:

Show user their performance:
1. Revenue potential:
   - Affiliate opportunities found
   - Estimated monthly revenue from suggestions
   - Products created (and suggested pricing)

2. Usage stats:
   - Blogs analyzed
   - Products generated
   - Credits remaining
   - Most productive day/time

3. Product performance:
   - Views on shared products
   - Downloads
   - Social shares

4. Content insights:
   - Most common product types generated
   - Best performing content topics
   - Opportunities by category

5. Recommendations:
   - "You haven't analyzed content in 30 days - scan your recent posts"
   - "Your checklists get 3x more shares than guides - create more"
   - "You're running low on credits - refill now"

Charts and visualizations:
- Use recharts or Chart.js
- Line chart: analyses over time
- Bar chart: product types
- Pie chart: opportunities by category

Make analytics actionable and motivating.
```

---

### Prompt 32: WordPress Plugin
**Use: After product-market fit**

```
Create WordPress plugin for ContentMaxer.

Plugin features:
1. Install from WP plugin directory
2. Connect WP site to ContentMaxer account (API key)
3. Scan posts directly from WP admin:
   - Button in post editor: "Scan with ContentMaxer"
   - Shows opportunities in sidebar
   - One-click to add affiliate links
4. Bulk scan all posts
5. Product library accessible in WP
6. Insert generated products as downloads

File structure:
/contentmaxer-wp-plugin
  contentmaxer.php (main file)
  /assets (css, js)
  /includes
    /api (connection to ContentMaxer API)
    /admin (WP admin pages)
    /editor (Gutenberg block or classic editor button)

WordPress.org submission process:
1. Code review requirements
2. Security best practices
3. Internationalization
4. Documentation

API needed in ContentMaxer:
- Create API key system
- Endpoint: POST /api/v1/analyze (with API key auth)
- Endpoint: GET /api/v1/products (list user's products)

WordPress plugin = huge distribution channel.
Makes the product instantly accessible to millions of bloggers.
```

---

### Prompt 33: Affiliate Marketplace
**Use: When you have 1000+ users**

```
Create affiliate program marketplace.

New feature: Curated affiliate program recommendations.

Create /app/marketplace/page.tsx:

Browse affiliate programs by:
- Category (hosting, courses, tools, etc.)
- Commission structure (%, flat fee, recurring)
- Difficulty to join (instant, application, invitation)
- Popularity (most used by ContentMaxer users)

For each program:
- Name, logo
- Description
- Commission details
- Sign-up link (with your affiliate link - meta!)
- Tips for getting approved
- Average earnings (from ContentMaxer data)
- "I use this" button (track which programs you're in)

User benefits:
- Discover new, high-paying programs
- See what successful users promote
- Track which programs they've joined
- Get notified of new opportunities

Your benefit:
- Affiliate commissions from sign-ups
- Data on best-performing programs
- Community-driven program database

Database:
CREATE TABLE affiliate_programs (
  id UUID PRIMARY KEY,
  name TEXT,
  url TEXT,
  commission_structure TEXT,
  category TEXT,
  difficulty TEXT,
  user_count INTEGER, -- how many ContentMaxer users joined
  avg_commission DECIMAL,
  created_at TIMESTAMP
);

CREATE TABLE user_programs (
  user_id UUID,
  program_id UUID,
  joined_at TIMESTAMP,
  status TEXT -- 'pending', 'approved', 'active'
);

This creates a two-sided value prop:
1. Better affiliate suggestions for users
2. Affiliate revenue for you

Marketplace could become major revenue driver.
```

---

## Tips for Development with Cursor

### How to Use These Prompts:

1. **One at a time**: Copy prompt into Cursor Composer (CMD+I)
2. **Review code**: Read what Cursor generates before moving on
3. **Test immediately**: Run the app after each prompt, make sure it works
4. **Commit often**: Git commit after each working feature
5. **Iterate**: If Cursor misunderstands, clarify and regenerate

### Cursor Keyboard Shortcuts:

- **CMD+I**: Open Composer (for generating new code)
- **CMD+K**: Inline edit (for modifying existing code)
- **CMD+L**: Chat with context (ask questions about code)
- **@file**: Reference specific file in chat
- **CMD+Enter**: Accept Cursor's suggestion

### When Things Break:

1. Select the broken file (CMD+L)
2. Chat: "This isn't working. Error: [paste error]. Fix it."
3. Review suggestion
4. Accept or iterate

### Pro Tips:

- Use descriptive variable names (helps Cursor understand context)
- Add comments before prompting (gives Cursor more context)
- Test with real data (your actual blog URL)
- Keep OpenAI API key loaded with credits
- Monitor Vercel deployment logs

---

## Cost Estimates

**Monthly Operating Costs (at scale):**

- Vercel: $0-20 (Hobby tier free, Pro $20)
- Supabase: $25 (Pro tier for production)
- OpenAI API: $50-500 (depends on usage)
  * Blog scan (free to user): ~$0.01 per scan (minimal, just metadata)
  * Post analysis: ~$0.10-0.30 per post (affiliate detection + product ideas)
  * Product outline generation: ~$0.05-0.15 per outline
  * Social posts: ~$0.03-0.05 per set
- Stripe: 2.9% + $0.30 per transaction
- Domain: $12/year
- Sentry (errors): $0-26
- Analytics (PostHog): $0-20

**Total: $75-600/month** depending on scale

**Unit Economics:**

Per analysis (user pays $2-4):
- AI cost: ~$0.15-0.30
- Gross margin: ~$1.70-3.85 per analysis
- Margin: 85-96%

**Revenue Projections:**

At 100 paying customers:
- Average purchase: $60 (20 analyses)
- Analyses performed: 2,000/month
- Revenue: $6,000/month
- AI costs: ~$400
- Infrastructure: ~$100
- **Profit: ~$5,500/month (92% margin)**

At 500 paying customers:
- Revenue: $30,000/month
- Costs: ~$2,500
- **Profit: ~$27,500/month**

Key: High margins because AI costs scale linearly but are low per unit.

---

## Post-Launch Marketing Ideas

1. **Content Marketing**:
   - "How to Monetize a [Niche] Blog" guides
   - Case studies of successful users
   - Weekly tips newsletter

2. **Partnerships**:
   - Affiliate for hosting companies (Bluehost, WP Engine)
   - Guest posts on blog monetization sites
   - Podcast interviews

3. **Community**:
   - Start a Facebook group for users
   - Weekly office hours
   - User-generated content showcase

4. **Paid Acquisition**:
   - Google Ads: "monetize blog" keywords
   - Facebook/Instagram ads to bloggers
   - Sponsored content on blog growth sites

5. **Viral Features**:
   - "Made with ContentMaxer" badge on public products
   - Referral program (give credits for referrals)
   - Showcase gallery of best products

---

## Success Metrics to Track

**Acquisition:**
- Signups per day
- Traffic sources
- Conversion rate (visitor → signup)

**Activation:**
- % who complete first analysis
- % who generate first product
- Time to first value

**Revenue:**
- Daily/monthly revenue
- Average credit purchase size
- LTV per user

**Retention:**
- % who return day 7, day 30
- % who make second purchase
- Churn rate

**Referral:**
- % who share products
- Signups from shared links
- Word-of-mouth growth

---

## Ready to Build?

1. Start with Prompt 1
2. Work through sequentially
3. Test after each major feature
4. Ship MVP in 6-8 weeks
5. Launch on Product Hunt
6. Iterate based on feedback

**You've got this! Let me know if you hit any snags.** 🚀

---

## Appendix: Quick Reference

**Key Dependencies:**
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "@supabase/supabase-js": "^2.38.0",
    "stripe": "^14.0.0",
    "openai": "^4.20.0",
    "cheerio": "^1.0.0-rc.12",
    "jspdf": "^2.5.1",
    "lucide-react": "^0.292.0"
  }
}
```

**Environment Variables:**
```
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

**Useful Commands:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
git add .            # Stage changes
git commit -m ""     # Commit changes
vercel --prod        # Deploy to production
```
