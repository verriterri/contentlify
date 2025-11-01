# ContentMaxer - Complete Cursor Build Plan

**Project Overview:**
ContentMaxer is a content monetization platform that helps bloggers/creators optimize revenue through affiliate links, digital products, and promotional content generation.

---

## Tech Stack

```
Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
Backend: Next.js API routes
Database: Supabase (Postgres + Auth)
Payments: Stripe
AI: OpenAI API (GPT-4o-mini for speed/cost)
PDF Generation: jsPDF or react-pdf
File Storage: Supabase Storage or Vercel Blob
Deployment: Vercel
```

---

## Phase 1: Foundation & Auth (Prompts 1-5)

### Prompt 1: Project Setup
```
Create a Next.js 14 project with TypeScript and Tailwind CSS using the app router.

Setup requirements:
- Install dependencies: next, react, typescript, tailwindcss, @supabase/supabase-js, stripe, openai
- Configure tailwind with a modern SaaS color scheme (primary: purple #7C3AED)
- Setup .env.local with placeholders for:
  - OPENAI_API_KEY
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - STRIPE_SECRET_KEY
  - STRIPE_PUBLISHABLE_KEY
  - NEXT_PUBLIC_APP_URL
- Create a clean folder structure:
  /app (routes)
  /components (reusable UI)
  /lib (utilities, API clients)
  /types (TypeScript types)
- Add a README.md with setup instructions
```

### Prompt 2: Supabase Setup
```
Create Supabase database schema and setup file.

Create /lib/supabase.ts with Supabase client initialization.

Create /sql/schema.sql with these tables:

1. users (extends Supabase auth)
   - id (uuid, references auth.users)
   - email
   - subscription_tier (text: 'free', 'starter', 'pro', 'agency')
   - subscription_status (text: 'active', 'canceled', 'past_due')
   - stripe_customer_id
   - created_at
   - updated_at

2. content_analyses
   - id (uuid)
   - user_id (uuid, references users)
   - url (text)
   - content (text)
   - affiliate_opportunities (jsonb)
   - product_ideas (jsonb)
   - status (text: 'processing', 'completed', 'failed')
   - created_at

3. generated_products
   - id (uuid)
   - user_id (uuid)
   - analysis_id (uuid, references content_analyses)
   - product_type (text: 'checklist', 'workbook', 'ebook', 'newsletter')
   - title (text)
   - content (text)
   - template_used (text)
   - file_url (text)
   - created_at

4. social_posts
   - id (uuid)
   - product_id (uuid, references generated_products)
   - platform (text: 'facebook', 'twitter', 'instagram', 'pinterest')
   - content (text)
   - created_at

Add RLS policies for secure access.
```

### Prompt 3: Authentication
```
Setup Supabase authentication with email/password.

Create components:
- /components/auth/LoginForm.tsx - email/password login
- /components/auth/SignupForm.tsx - email/password signup
- /components/auth/AuthProvider.tsx - wrap app with auth context

Create routes:
- /app/login/page.tsx
- /app/signup/page.tsx
- /app/dashboard/layout.tsx (protected route wrapper)

Add middleware.ts to protect routes that require authentication.
Redirect authenticated users from /login to /dashboard.
Redirect unauthenticated users from /dashboard to /login.

Use modern, clean UI with Tailwind. Include error handling and loading states.
```

### Prompt 4: Stripe Integration
```
Setup Stripe subscription billing.

Create /lib/stripe.ts with Stripe client initialization.

Create /app/api/webhooks/stripe/route.ts to handle:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted

Create /app/api/create-checkout-session/route.ts
- Accept tier: 'starter' | 'pro' | 'agency'
- Create Stripe checkout session
- Return session URL

Create pricing plans:
- Starter: $29/month - 10 analyses/month, 20 products/month
- Pro: $79/month - Unlimited analyses, unlimited products
- Agency: $199/month - Everything + 3 team seats + white-label

Create /components/pricing/PricingTable.tsx with these plans.
Include annual pricing option (20% discount).
```

### Prompt 5: Landing Page
```
Create a compelling landing page at /app/page.tsx

Sections:
1. Hero
   - Headline: "Stop Leaving Money on the Table"
   - Subheadline: "Find affiliate opportunities, create digital products, and promote them—all from your existing content"
   - CTA: "Analyze My Content Free" → /signup
   - Screenshot/demo of the tool

2. Problem/Solution
   - Problem: Bloggers don't know how to monetize beyond ads
   - Solution: We show you exactly what to create and how to sell it

3. Features (with icons)
   - 🔗 Affiliate Opportunity Detection
   - 📦 Digital Product Generation
   - 📱 Social Post Creation
   - 📧 Newsletter Templates
   - All include affiliate links automatically

4. How It Works (3 steps)
   - Paste your blog URL
   - See monetization opportunities
   - Generate products & promotion in minutes

5. Pricing Table
   - Use PricingTable component

6. FAQ
   - "How does affiliate detection work?"
   - "What products can I create?"
   - "Do I need design skills?"
   - "Can I edit the generated content?"

7. CTA
   - "Start Monetizing Your Content"
   - Free tier: 1 analysis

Use modern SaaS design: clean, minimal, purple accents, good typography.
Make it responsive and fast.
```

---

## Phase 2: Core Content Analysis (Prompts 6-10)

### Prompt 6: URL Scraper
```
Create /lib/scrapers/url-scraper.ts

Function: scrapeUrl(url: string)
- Accept any blog URL
- Use fetch or cheerio to extract:
  - Page title
  - Main content (strip navigation, footer, ads)
  - Existing links (to detect current affiliate links)
  - Meta description
- Handle errors gracefully (timeouts, 404s, blocked requests)
- Return structured data:
  {
    url: string
    title: string
    content: string
    existingLinks: string[]
    wordCount: number
    error?: string
  }

Add rate limiting and caching to avoid abuse.
Test with common blog platforms: WordPress, Medium, Substack, Ghost.
```

### Prompt 7: Affiliate Opportunity Detector (UPDATED)
```
Create /lib/ai/affiliate-detector.ts

This uses a two-step approach: AI detection + smart matching.

Step 1: AI Product Detection
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
- Specific brands/products (not generic terms like "a microphone")
- Products that could have affiliate programs
- Products mentioned in recommendation/review context"

Step 2: Match Against Affiliate Programs
Create /lib/data/affiliate-programs.ts with curated list of top programs:

export const CURATED_PROGRAMS = [
  {
    name: "Amazon Associates",
    url: "https://affiliate-program.amazon.com",
    applies_to: "all_physical_products",
    commission: "1-10%",
    category: ["physical_product", "electronics", "books"]
  },
  {
    name: "Notion Partners",
    url: "https://notion.so/affiliates",
    applies_to: ["notion"],
    commission: "$10/user",
    category: ["software", "productivity"]
  },
  {
    name: "ConvertKit",
    url: "https://convertkit.com/ambassador",
    applies_to: ["convertkit"],
    commission: "30% recurring",
    category: ["email_marketing", "software"]
  },
  {
    name: "Bluehost",
    url: "https://bluehost.com/affiliates",
    applies_to: ["bluehost", "hosting", "web hosting"],
    commission: "$65-100/sale",
    category: ["hosting", "web_hosting"]
  },
  // Add 50-100 more popular programs manually
  // Focus on: Teachable, Gumroad, Shopify, WordPress plugins,
  // design tools (Canva, Adobe), marketing tools (Mailchimp, HubSpot),
  // hosting (SiteGround, WP Engine), courses (Udemy, Skillshare)
];

Function: matchAffiliatePrograms(detectedProducts)
- For each detected product:
  - Check if exact match in curated list (product name match)
  - Check if category match (e.g., physical_product → Amazon)
  - Return all matching programs
  - If no match: return generic suggestion "Search for [product] affiliate program"

Return type:
{
  product: string
  category: string
  context: string
  confidence: number
  isAlreadyLinked: boolean
  affiliatePrograms: Array<{
    name: string
    url: string
    commission: string
    isPrimary: boolean
  }>
}[]

For products not in curated list, return:
{
  name: "Search Web",
  url: "#",
  commission: "Unknown",
  note: "Google '[product] affiliate program' to find options"
}

This approach is:
- Maintainable (you control the curated list)
- Accurate (AI finds products, you provide verified programs)
- Scalable (add more programs over time)
- Honest (doesn't hallucinate commission rates)
```

### Prompt 8: Product Ideas Generator
```
Create /lib/ai/product-ideas-generator.ts

Function: generateProductIdeas(content: string, title: string)

Use OpenAI API to suggest 5-10 digital product ideas based on the content.

Prompt structure:
"Based on this blog post, suggest digital products the author could create and sell.

For each product idea:
- Product name
- Product type (checklist, workbook, ebook, template, newsletter)
- Why it would sell (value proposition)
- Suggested price range
- Time to create estimate
- Target audience

Focus on products that ADD VALUE beyond the free blog post.
Examples:
- Blog has tips → Product is implementation system
- Blog has overview → Product is deep dive guide
- Blog explains concept → Product is done-for-you templates

Return 5-10 ideas as JSON array."

Return type:
{
  name: string
  type: 'checklist' | 'workbook' | 'ebook' | 'newsletter' | 'template'
  description: string
  valueProposition: string
  suggestedPrice: string
  estimatedTime: string
  targetAudience: string
}[]
```

### Prompt 9: API Route - Analyze Content
```
Create /app/api/analyze/route.ts

POST endpoint that:
1. Accepts { url: string } from authenticated user
2. Checks user's analysis limit based on subscription tier
3. Scrapes the URL
4. Runs affiliate detection (AI + matching)
5. Generates product ideas
6. Saves to content_analyses table
7. Returns combined results

Include error handling for:
- Invalid URLs
- Scraping failures
- AI API errors
- Rate limits exceeded

Return format:
{
  analysisId: string
  url: string
  title: string
  wordCount: number
  affiliateOpportunities: [...],
  productIdeas: [...]
}

Add loading states and progress indicators.
```

### Prompt 10: Analysis Results UI
```
Create /app/dashboard/analyze/page.tsx

UI Components:

1. Input Section
   - Text input for URL
   - "Analyze Content" button
   - Shows loading state with progress messages
   - Example: "Analyzing content... Finding affiliate opportunities... Generating product ideas..."

2. Results Section (after analysis completes)

   A. Affiliate Opportunities Card
      - Shows count: "Found 8 monetization opportunities"
      - Table with columns:
        * Product/Service
        * Context (where mentioned)
        * Best Affiliate Program
        * Est. Commission
        * Already Linked? (yes/no badge)
        * Action buttons: [Copy Link] [Learn More]
      - Sort by commission (highest first)
      - Expandable rows for multiple affiliate program options
      - For products not in database: show "Search [product] affiliate program"

   B. Digital Product Ideas Card
      - Shows count: "10 product ideas to test"
      - Grid of product cards, each showing:
        * Product name
        * Product type (badge: Checklist, Workbook, etc.)
        * Value proposition (2-3 sentences)
        * Suggested price
        * [Generate This Product] button
      - Can favorite/save ideas for later

3. History Sidebar
   - List of past analyses
   - Click to view previous results
   - Delete option

Use clean card-based layout. Make it scannable with good typography hierarchy.
Add empty states for no opportunities found.
Include helpful tips and explanations.
```

---

## Phase 3: Product Generation (Prompts 11-16)

### Prompt 11: Product Generator Core
```
Create /lib/ai/product-generator.ts

Function: generateProduct(params: {
  productIdea: ProductIdea
  originalContent: string
  affiliateOpportunities: AffiliateOpportunity[]
  template: string
})

Use OpenAI API to generate product content based on:
- The selected product idea
- Original blog post content as source material
- Chosen template structure
- Affiliate opportunities to weave in naturally

For each product type, have specific prompt templates:

CHECKLIST:
"Create a comprehensive checklist based on this blog post.
- Include 15-25 actionable items
- Group into logical sections
- Add brief explanations (1-2 sentences per item)
- Include checkboxes
- Where relevant, mention specific tools/products with affiliate links
- Make it printable and fillable"

WORKBOOK:
"Create a workbook that helps readers implement the concepts from this blog post.
- Include introduction explaining how to use it
- 5-8 exercises/worksheets
- Fill-in-the-blank sections
- Reflection questions
- Action plan template
- Resource list (including affiliate products where relevant)
- Conclusion with next steps"

EBOOK:
"Expand this blog post into a comprehensive ebook (20-30 pages).
- Add depth and detail beyond the original post
- Include case studies/examples
- Add chapter structure
- Include images/diagrams descriptions
- Resource recommendations (with affiliate links)
- Conclusion and action items"

NEWSLETTER:
"Create a newsletter edition based on this content.
- Engaging subject line
- Personal introduction
- Main content (formatted for email)
- Key takeaways section
- Recommended tools/products (with affiliate links)
- Call to action
- P.S. section"

Return structured content that can be formatted into PDF/document.
```

### Prompt 12: Template System
```
Create /lib/templates/ directory with template definitions.

For each product type, create 3 template options:

/lib/templates/checklist-templates.ts
- Minimal: Simple list, clean layout
- Detailed: Includes tips and notes sections
- Visual: Icon-based with color coding

/lib/templates/workbook-templates.ts
- Professional: Corporate style, lots of whitespace
- Creative: Colorful, hand-drawn elements
- Practical: Dense, information-focused

/lib/templates/ebook-templates.ts
- Modern: Sans-serif, image-heavy
- Classic: Serif fonts, traditional book layout
- Magazine: Multi-column, editorial style

/lib/templates/newsletter-templates.ts
- Plain Text: No formatting, email-friendly
- Styled: HTML with brand colors
- Digest: Link roundup style

Each template should define:
- Layout structure
- Typography settings
- Color scheme
- Spacing/margins
- Section arrangement

Create /components/templates/TemplateSelector.tsx
- Show preview thumbnails of each template
- Click to select
- Display template details
```

### Prompt 13: PDF Generator
```
Create /lib/generators/pdf-generator.ts

Use jsPDF or react-pdf to generate PDFs from structured content.

Function: generatePDF(params: {
  content: GeneratedContent
  template: Template
  userBranding?: {
    name: string
    logo?: string
    colors?: { primary: string, secondary: string }
  }
})

Features:
- Apply template styling
- Handle multi-page content
- Add page numbers
- Include table of contents for longer documents
- Add affiliate links as clickable URLs
- Include user branding if provided
- Add watermark: "Created with ContentMaxer" (removable for Pro+ tiers)

Return: Buffer or Blob for download/storage

Upload to Supabase Storage and return public URL.
```

### Prompt 14: Export Options
```
Create /lib/generators/export-formats.ts

Functions for different export formats:

1. exportToPDF(content, template)
   - Use pdf-generator.ts
   - Return download link

2. exportToDocx(content, template)
   - Use docx library or html-docx-js
   - Format with proper styles
   - Include clickable affiliate links
   - Return download link

3. exportToMarkdown(content)
   - Convert to clean markdown
   - Preserve structure and links
   - Return as .md file download

4. exportToGoogleDoc(content)
   - Generate .docx
   - Provide instructions for uploading to Google Drive
   - OR future: OAuth integration to create directly

Create /components/export/ExportOptions.tsx
- Buttons for each export format
- Show file size estimates
- Download triggers
- Copy to clipboard option for markdown
```

### Prompt 15: Product Generation UI
```
Create /app/dashboard/generate/page.tsx

Flow:
1. User selects product idea from analysis results
2. Choose template (show TemplateSelector)
3. Customize options:
   - Product title (editable)
   - Brand name
   - Color scheme
   - Include affiliate links? (toggle)
4. Generate button → loading state (30-60 seconds)
5. Preview generated product
6. Export options
7. Save to library

Create /components/product/ProductPreview.tsx
- Show formatted preview of generated product
- Paginated view for longer documents
- Highlight where affiliate links are included
- Edit button → opens simple editor for tweaks

Create /components/product/ProductEditor.tsx
- Rich text editor (use Tiptap or similar)
- Allow basic edits to generated content
- Save changes
- Re-export with changes

Include helpful progress messages during generation:
"Analyzing your content..."
"Structuring the product..."
"Adding affiliate opportunities..."
"Formatting with your template..."
"Almost ready..."
```

### Prompt 16: Product Library
```
Create /app/dashboard/products/page.tsx

Display all generated products for the user.

Features:
- Grid/list view toggle
- Filter by product type
- Search by name
- Sort by date created
- Each product card shows:
  * Thumbnail/preview
  * Product name
  * Type badge
  * Date created
  * Download count
  * Actions: [View] [Download] [Edit] [Delete] [Regenerate]

Create /app/dashboard/products/[id]/page.tsx
- View individual product details
- All export options
- Edit content
- View analytics (Pro feature):
  * Times downloaded
  * Social shares
  * Affiliate link clicks (if tracked)

Include empty state: "No products yet. Generate your first product from an analysis!"
```

---

## Phase 4: Social & Newsletter Features (Prompts 17-20)

### Prompt 17: Social Post Generator
```
Create /lib/ai/social-generator.ts

Function: generateSocialPosts(params: {
  product: GeneratedProduct
  originalContent?: string
  platforms: Platform[]
})

For each platform, generate platform-optimized content:

FACEBOOK (2,200 char limit):
"Create an engaging Facebook post promoting this digital product.
- Hook in first line
- Explain value proposition
- Include social proof if applicable
- Mention affiliate tools/products naturally
- Call to action
- 3-5 relevant hashtags"

TWITTER/X (280 char limit):
"Create a compelling tweet promoting this product.
- Attention-grabbing opener
- Clear value statement
- Link to product
- 1-2 hashtags
- Consider creating a thread (2-4 tweets) for more complex products"

INSTAGRAM (2,200 char limit):
"Create an Instagram caption for this product.
- Story-driven opening
- Value proposition
- Mention affiliate products naturally
- Strong call to action
- 10-15 relevant hashtags
- Engagement question at end"

PINTEREST (500 char limit):
"Create a Pinterest description.
- SEO-optimized title
- Clear benefits
- Keywords for discovery
- Link to product"

Return type:
{
  platform: Platform
  content: string
  hashtags: string[]
  suggestedImage?: string (description of what image should show)
}[]

For products that mention affiliate products, naturally weave those into social posts.
```

### Prompt 18: Newsletter Generator
```
Create /lib/ai/newsletter-generator.ts

Function: generateNewsletter(params: {
  content: string
  productIdeas?: ProductIdea[]
  affiliateOpportunities?: AffiliateOpportunity[]
  style: 'plain' | 'styled' | 'digest'
})

Generate complete newsletter edition:

Structure:
- Subject line (compelling, 50 chars max)
- Preview text (100 chars)
- Header/greeting
- Main content (blog post repurposed for email)
  * Break into sections
  * Add subheadings
  * Include key takeaways
- Recommended Products section
  * Feature 2-3 affiliate products mentioned in content
  * Brief description + affiliate link
  * Why reader should check it out
- Digital Products CTA
  * If user generated products, promote them
  * "Want the complete guide? Check out my [Product Name]"
- Closing/P.S.
  * Personal touch
  * Teaser for next newsletter

For each style:
- PLAIN: Text-only, email-safe, works everywhere
- STYLED: HTML template, brand colors, images
- DIGEST: Bullet points, quick reads, link roundup format

Output HTML (for styled) and plain text versions.
Return both formats so user can use in any email platform.
```

### Prompt 19: Social Posts UI
```
Create /app/dashboard/social/page.tsx

Two modes:

1. Generate from Product
   - Select a generated product
   - Choose platforms (checkboxes: FB, X, IG, Pinterest)
   - Generate posts button
   - Shows all posts with copy buttons

2. Generate from URL
   - Enter blog URL
   - Generates promotional posts for that content
   - Include affiliate links found in content

Create /components/social/SocialPostCard.tsx
- Platform icon and name
- Generated post content
- Character count
- Copy to clipboard button
- Edit button (inline editing)
- Preview how it looks on platform
- Hashtags listed separately
- "Post Directly" button (future feature placeholder)

Create /components/social/SocialPostEditor.tsx
- Edit generated post
- See character count update live
- Platform constraints enforced
- Re-generate if not happy

Include tips:
"Best times to post on [Platform]"
"Add a relevant image for higher engagement"
"Tag relevant accounts for more reach"
```

### Prompt 20: Newsletter UI
```
Create /app/dashboard/newsletter/page.tsx

Features:

1. Generate Newsletter
   - Input blog URL or select generated product
   - Choose style (plain/styled/digest)
   - Preview newsletter
   - Copy to clipboard OR download as HTML file

2. Newsletter Preview
   - Toggle between HTML preview and plain text
   - Mobile/desktop view toggle
   - Edit subject line
   - Edit content sections
   - See where affiliate links are placed

3. Export Options
   - Copy HTML (for platforms like ConvertKit, Mailchimp)
   - Copy Plain Text (for simple email clients)
   - Download as .html file
   - Integration placeholders:
     * "Send via Mailchimp" (future)
     * "Send via ConvertKit" (future)
     * "Send via Substack" (future)

Create /components/newsletter/NewsletterPreview.tsx
- Realistic email client preview
- Shows subject line, preview text, full content
- Highlights affiliate links
- Mobile-responsive preview

Include guidance:
"Newsletters with 2-3 affiliate recommendations see higher click rates"
"Personal stories increase engagement by 40%"
"Send on Tuesday or Thursday mornings for best open rates"
```

---

## Phase 5: Dashboard & Polish (Prompts 21-25)

### Prompt 21: Main Dashboard
```
Create /app/dashboard/page.tsx

Overview dashboard with:

1. Stats Cards (top row)
   - Total Analyses
   - Products Generated
   - Social Posts Created
   - Newsletters Sent

2. Quick Actions (prominent buttons)
   - Analyze New Content
   - Generate Product
   - Create Social Posts
   - Write Newsletter

3. Recent Activity Feed
   - Latest analyses
   - Recently generated products
   - Quick access to each

4. Usage Limits (for non-unlimited tiers)
   - Progress bars showing:
     * Analyses this month: 7/10
     * Products this month: 15/20
   - Upgrade CTA if approaching limits

5. Tips & Getting Started
   - For new users: onboarding checklist
   - Tutorial videos/guides
   - Feature announcements

6. Affiliate Earnings Tracker (future feature)
   - Placeholder for tracking affiliate performance
   - "Connect your affiliate accounts" CTA

Use modern dashboard layout with cards, good spacing, purple accents.
Make it feel professional but not overwhelming.
```

### Prompt 22: Settings & Profile
```
Create /app/dashboard/settings/page.tsx

Tabs:

1. Profile
   - Name
   - Email (read-only, from Supabase)
   - Brand name (used in products)
   - Website URL
   - Avatar upload

2. Branding
   - Brand colors (primary, secondary)
   - Logo upload (used in products)
   - Typography preferences
   - Save as default for all products

3. Integrations (future features)
   - Connect affiliate accounts
   - Connect social media (for auto-posting)
   - Connect email platform (Mailchimp, ConvertKit)
   - Each with "Coming Soon" badge for MVP

4. Billing
   - Current plan display
   - Usage statistics
   - Upgrade/downgrade options
   - Manage subscription (Stripe portal)
   - Billing history

5. Preferences
   - Email notifications (toggle)
   - Default export format
   - Default template selection
   - Language (English for MVP)

Use clean tabbed interface. Save button at bottom of each section.
Include success/error toasts for actions.
```

### Prompt 23: Onboarding Flow
```
Create /components/onboarding/OnboardingFlow.tsx

Multi-step modal that appears for new users:

Step 1: Welcome
- "Welcome to ContentMaxer!"
- Brief value proposition
- "Let's get you set up in 2 minutes"

Step 2: Brand Setup
- "What's your brand name?"
- "What's your website?"
- Optional: Upload logo

Step 3: First Analysis
- "Let's analyze your first piece of content"
- Input blog URL
- Quick tour of results page

Step 4: Choose Your Focus
- "What are you most interested in?"
  □ Finding affiliate opportunities
  □ Creating digital products
  □ Growing on social media
  □ All of the above
- Customizes dashboard based on selection

Step 5: Done!
- "You're all set!"
- Show next steps
- Link to tutorial/docs

Save onboarding state to prevent showing again.
Allow "Skip" option on each step.
```

### Prompt 24: Help & Documentation
```
Create /app/dashboard/help/page.tsx

Resources:

1. Quick Start Guide
   - How to analyze content
   - How to generate products
   - How to create social posts
   - How to write newsletters

2. Video Tutorials (embed placeholder)
   - 5-minute product walkthrough
   - Template selection guide
   - Exporting your products
   - Maximizing affiliate revenue

3. FAQ
   - How does affiliate detection work?
   - What if AI makes mistakes?
   - Can I edit generated content?
   - How do I use my products to make money?
   - What's included in each plan?
   - Can I cancel anytime?

4. Feature Requests
   - Simple form to submit ideas
   - Upvote existing requests
   - See what's coming next

5. Support
   - Contact form
   - Email: support@contentmaxer.com
   - Response time expectations
   - Link to Discord community (future)

Create /components/help/SearchHelp.tsx
- Search bar for docs
- Instant results as they type
- Links to relevant help articles

Make it easy to find answers without contacting support.
```

### Prompt 25: Error Handling & Loading States
```
Improve error handling and loading states across the entire app.

Global Error Handler:
- Create /components/ErrorBoundary.tsx
- Catch React errors gracefully
- Show user-friendly error messages
- Log errors to console/monitoring
- Provide recovery options

API Error Handling:
- Standardize error responses from API routes
- Show toast notifications for errors
- Specific messages for common errors:
  * Rate limit exceeded → "You've used all your analyses for this month. Upgrade for unlimited."
  * AI timeout → "Content is taking longer than expected. Try again or contact support."
  * Invalid URL → "We couldn't access that URL. Make sure it's publicly accessible."
  * Payment failed → "There was an issue with your payment. Please update your billing info."

Loading States:
- Skeleton loaders for slow-loading content
- Progress bars for long operations (analysis, generation)
- Disable buttons during processing
- Show helpful messages during waits
- Never leave user wondering what's happening

Create /components/ui/LoadingState.tsx
- Reusable loading component
- Spinner + optional message
- Use throughout app consistently

Create /components/ui/EmptyState.tsx
- No results found
- No products yet
- No analyses yet
- Each with relevant illustration and CTA

Test all user flows for smooth experience even when things go wrong.
```

---

## Phase 6: Testing & Launch Prep (Prompts 26-30)

### Prompt 26: Testing Checklist
```
Create comprehensive testing plan and execute tests.

Create /tests/ directory with test files.

Unit Tests (if time permits):
- Test affiliate detection logic
- Test product generation formatting
- Test export functions
- Test pricing calculations

Manual Testing Checklist:

Authentication:
□ Sign up with new account
□ Log in with existing account
□ Password reset flow
□ Logout and redirect

Content Analysis:
□ Analyze WordPress blog
□ Analyze Medium post
□ Analyze Substack post
□ Analyze custom site
□ Handle invalid URLs
□ Handle private/blocked content

Affiliate Detection:
□ Finds products correctly
□ Shows multiple affiliate options
□ Handles already-linked products
□ Copy links works

Product Generation:
□ Generate checklist
□ Generate workbook
□ Generate ebook
□ Generate newsletter
□ Template selection works
□ Preview displays correctly

Exports:
□ PDF download works
□ DOCX download works
□ Markdown copy works
□ Files are properly formatted

Social Posts:
□ Generate for all platforms
□ Character limits enforced
□ Copy buttons work
□ Edits save correctly

Billing:
□ Free tier limits enforced
□ Upgrade flow works
□ Stripe checkout completes
□ Subscription activates
□ Downgrade works
□ Cancellation works

Mobile:
□ All pages responsive
□ Touch targets adequate
□ Forms work on mobile
□ Exports work on mobile

Create bug tracking doc for issues found.
```

### Prompt 27: Performance Optimization
```
Optimize app performance before launch.

Areas to optimize:

1. API Routes
   - Add caching for repeated analyses (same URL)
   - Implement request deduplication
   - Add response compression
   - Optimize database queries
   - Add indexes to Supabase tables

2. Frontend
   - Implement React.lazy() for code splitting
   - Optimize images (Next.js Image component)
   - Minimize bundle size
   - Add loading states to prevent layout shift
   - Prefetch data where possible

3. AI Calls
   - Use GPT-4o-mini (faster, cheaper)
   - Optimize prompts for faster responses
   - Implement streaming responses if possible
   - Add timeout handling (30 seconds max)
   - Retry logic for failed requests

4. File Generation
   - Generate PDFs server-side
   - Stream large files
   - Compress before download
   - Cache generated files

5. Database
   - Add connection pooling
   - Optimize queries
   - Add appropriate indexes
   - Implement soft deletes

Run Lighthouse audit and aim for:
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >90

Use Vercel Analytics to monitor real performance.
```

### Prompt 28: SEO & Marketing Setup
```
Prepare site for SEO and marketing launch.

1. SEO Basics
   Create /app/layout.tsx with:
   - Proper meta tags
   - Open Graph tags for social sharing
   - Twitter Card tags
   - Favicon and app icons
   - Sitemap.xml
   - Robots.txt

2. Landing Page SEO
   Optimize /app/page.tsx:
   - H1: "Stop Leaving Money on the Table"
   - Semantic HTML structure
   - Alt text for all images
   - Internal linking
   - Fast load time
   - Mobile-friendly

3. Blog Setup (for content marketing)
   Create /app/blog/page.tsx
   - Blog post list
   - MDX support for writing posts
   - SEO-optimized permalinks
   - Share buttons
   - Author bio
   
   Write 3 launch posts:
   - "How to Find Hidden Affiliate Opportunities in Your Content"
   - "5 Digital Products You Can Create from Existing Blog Posts"
   - "The Complete Guide to Content Monetization in 2025"

4. Analytics
   - Add Google Analytics 4
   - Add Facebook Pixel (for ads)
   - Track key events:
     * Sign ups
     * Analyses run
     * Products generated
     * Upgrades

5. Social Media Prep
   - Create Twitter/X account
   - Create LinkedIn company page
   - Create Facebook page
   - Create Instagram account
   - Prepare launch posts for each platform

6. Email Collection
   Add email capture for:
   - Waitlist (pre-launch)
   - Newsletter signup
   - Failed payment recovery
   Set up with your email provider.
```

### Prompt 29: Legal & Compliance
```
Add necessary legal pages and compliance features.

Create legal pages:

/app/legal/terms/page.tsx
- Terms of Service
- User obligations
- Service limitations
- Refund policy (if applicable)
- Dispute resolution

/app/legal/privacy/page.tsx
- Privacy Policy
- Data collection practices
- Cookie usage
- Third-party services (OpenAI, Stripe)
- GDPR compliance (if applicable)
- Data deletion requests

/app/legal/affiliate-disclosure/page.tsx
- Explain affiliate links in generated content
- FTC compliance
- User responsibility for disclosure

Add to footer:
- Links to all legal pages
- Copyright notice
- Contact email

GDPR Compliance (if targeting EU):
- Cookie consent banner
- Data export functionality
- Account deletion
- Privacy by design

Disclaimers:
Add disclaimer to product generation:
"Generated content may require review for accuracy. Users are responsible for compliance with affiliate program terms and FTC guidelines."

Terms acceptance:
- Checkbox on signup: "I agree to Terms and Privacy Policy"
- Store acceptance in database
```

### Prompt 30: Launch Preparation
```
Final launch checklist and deployment.

Pre-Launch Checklist:

Technical:
□ All features working
□ No critical bugs
□ Performance optimized
□ Mobile responsive
□ Error handling in place
□ Loading states everywhere
□ Analytics tracking
□ Monitoring set up (Sentry, LogRocket, etc.)

Content:
□ Landing page complete
□ Pricing page clear
□ Help docs written
□ FAQ comprehensive
□ Legal pages published
□ Blog posts ready

Marketing:
□ Product Hunt submission drafted
□ Social media accounts created
□ Launch tweets/posts scheduled
□ Email to waitlist ready
□ Press kit prepared (if applicable)

Business:
□ Stripe products created
□ Payment flows tested
□ Refund policy defined
□ Support email monitored
□ Feedback system in place

Deployment:
□ Environment variables set in Vercel
□ Database migrations run
□ Supabase RLS policies active
□ Domain connected
□ SSL certificate active
□ Backup system in place

Soft Launch Plan:
Week 1: Friends & family (10 users)
Week 2: Reddit soft launch (50 users)
Week 3: Fix critical issues
Week 4: Product Hunt launch

Monitor:
- Error rates
- Sign-up conversion
- Feature usage
- Support tickets
- Revenue

Create /app/admin/page.tsx (simple admin dashboard):
- User count
- Revenue metrics
- Most popular features
- Recent errors
- Support queue

Launch! 🚀
```

---

## Additional Prompts for Specific Features

### Prompt 31: Affiliate Link Insertion Helper
```
Create /lib/helpers/affiliate-link-inserter.ts

Function to help users insert affiliate links into their content.

Given:
- Original blog post HTML
- List of affiliate opportunities detected
- User's affiliate IDs for various programs

Generate:
- Modified HTML with affiliate links inserted
- Non-intrusive: links blend naturally
- Proper disclosure added at top/bottom
- Returns both HTML and markdown versions

Create /components/tools/LinkInserter.tsx
- Show original content
- Highlight suggested link placements
- Click to approve each insertion
- Preview final result
- Export updated content

This helps complete the LinkMaxer → ContentMaxer loop.
User finds opportunities, then can update their actual blog post.
```

### Prompt 32: Batch Analysis
```
Create /app/dashboard/batch/page.tsx

Allow users to analyze multiple URLs at once.

Features:
- Upload CSV of URLs
- Or connect to RSS feed
- Or enter sitemap.xml
- Analyze up to 50 URLs at once (Pro tier)
- Shows progress bar
- Results table with:
  * URL
  * Affiliate opportunities count
  * Product ideas count
  * Status
  * Actions

Bulk operations:
- Generate products for top opportunities
- Export all affiliate opportunities to CSV
- Create social posts for all products

This is huge for users with lots of existing content.
Saved for post-MVP but include placeholder.
```

### Prompt 33: Affiliate Performance Tracking
```
Future feature: Track affiliate link performance.

Placeholder UI in /app/dashboard/analytics/page.tsx

Would require:
- Link shortener/tracking system (Bitly API or custom)
- Dashboard showing:
  * Clicks per affiliate link
  * Conversion estimates
  * Revenue estimates
  * Top performing products/programs

For MVP: Show placeholder with "Coming Soon"
"Connect your affiliate accounts to see performance metrics"

This becomes a premium feature that justifies higher pricing.
```

---

## Environment Variables

Create `.env.local`:
```
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

# Optional
SENTRY_DSN=...
GOOGLE_ANALYTICS_ID=...
```

---

## Development Timeline

**Week 1: Foundation** (Prompts 1-5)
- Project setup
- Auth
- Landing page
- Stripe

**Week 2: Core Analysis** (Prompts 6-10)
- URL scraping
- Affiliate detection
- Product ideas
- Analysis UI

**Week 3: Product Generation** (Prompts 11-16)
- Product generator
- Templates
- PDF export
- Product library

**Week 4: Social & Newsletter** (Prompts 17-20)
- Social posts
- Newsletter
- UI for both

**Week 5: Polish** (Prompts 21-25)
- Dashboard
- Settings
- Onboarding
- Help docs

**Week 6: Launch** (Prompts 26-30)
- Testing
- Optimization
- SEO
- Deploy

---

## Tips for Working with Cursor

1. **One prompt at a time** - Don't skip ahead
2. **Review code** - Cursor makes mistakes sometimes
3. **Test frequently** - After each major feature
4. **Commit often** - Git commit after each working feature
5. **Be specific** - If Cursor misunderstands, clarify
6. **Iterate** - First attempt might not be perfect

---

## Cost Estimates

**Monthly Operating Costs:**
- Vercel: $0 (Hobby tier)
- Supabase: $25
- OpenAI API: $50-200
- Stripe: 2.9% + $0.30/transaction
- Domain: $12/year
- **Total: ~$75-250/month**

---

## Post-Launch Features

Consider adding based on feedback:
- WordPress plugin
- Browser extension
- Team collaboration
- White-label
- API access
- Zapier integration
- Auto-posting
- Email integrations
- Marketplace for products

---

**Good luck building! 🚀**
