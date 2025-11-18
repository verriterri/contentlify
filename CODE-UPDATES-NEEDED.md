# Code Updates Needed to Match New Build Plan

## Summary
The new build plan has a critical strategic change: **Metadata (word counts, affiliate link counts) is the core product value and should only be visible to users with credits.**

## Key Changes Required

### 1. Blog Scan API - Hide Metadata for Users Without Credits

**File**: `app/api/blog/scan/route.ts`

**Current Behavior**: Returns full metadata (wordCount, affiliateLinkCount) for all users

**Required Change**: 
- Check if user has credits (or is logged in with credits > 0)
- If user has NO credits: Return only `title`, `url`, `publishedDate` (no wordCount, no affiliateLinkCount)
- If user HAS credits: Return full metadata
- Also hide summary stats (totalWords, avgWordsPerPost, totalAffiliateLinks, underMonetizedCount) for users without credits

**Implementation**:
```typescript
// After getting user info, check credits
const hasCredits = userCredits > 0;

// Filter posts based on credits
const postsToReturn = hasCredits 
  ? postMetadata  // Full metadata
  : postMetadata.map(p => ({
      url: p.url,
      title: p.title,
      publishedDate: p.publishedDate,
      // wordCount and affiliateLinkCount are hidden
    }));

// Filter summary
const summaryToReturn = hasCredits
  ? { totalWords, avgWordsPerPost, totalAffiliateLinks, underMonetizedCount }
  : {}; // Empty summary for users without credits
```

### 2. PostSelectionTable - Hide Metadata Columns

**File**: `components/scanner/PostSelectionTable.tsx`

**Current Behavior**: Always shows Word Count and Affiliate Links columns

**Required Change**:
- Accept `hasCredits` prop (boolean)
- Conditionally hide Word Count and Affiliate Links columns when `hasCredits === false`
- Hide opportunity indicators (💡, ⚠️, ✓) when `hasCredits === false`
- Hide "High potential" and "Well monetized" badges when `hasCredits === false`
- Hide "Analyze Full Post" column (chargeExtra option) when `hasCredits === false`

**Implementation**:
```typescript
interface PostSelectionTableProps {
  // ... existing props
  hasCredits: boolean; // NEW
}

// In component:
{hasCredits && (
  <th>Word Count</th>
)}
{hasCredits && (
  <th>Affiliate Links</th>
)}
```

### 3. SmartFilters - Hide/Disable Metadata Filters

**File**: `components/scanner/SmartFilters.tsx`

**Current Behavior**: Always shows Word Count and Affiliate Links filters

**Required Change**:
- Accept `hasCredits` prop (boolean)
- Hide Word Count filter when `hasCredits === false`
- Hide Affiliate Links filter when `hasCredits === false`
- Hide sort options that depend on metadata: 'most-words', 'fewest-links', 'most-links'
- Keep Date and Status filters visible (these don't require metadata)

**Implementation**:
```typescript
interface SmartFiltersProps {
  // ... existing props
  hasCredits: boolean; // NEW
}

// Conditionally render filters
{hasCredits && (
  <div>
    <label>Word Count</label>
    {/* ... */}
  </div>
)}
```

### 4. Scan Results Page - Pass hasCredits to Components

**File**: `app/scan/[scanId]/page.tsx`

**Required Change**:
- Calculate `hasCredits = userCredits !== null && userCredits > 0`
- Pass `hasCredits` prop to `PostSelectionTable` and `SmartFilters`
- Show upgrade prompt when user has no credits: "Get 2x credits on your first purchase! ⏰ One-time offer"

**Implementation**:
```typescript
const hasCredits = userCredits !== null && userCredits > 0;

// In render:
{!hasCredits && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
    <p className="text-blue-900 font-medium">
      💡 Unlock full metadata: word counts, affiliate links, opportunity scores
    </p>
    <p className="text-blue-700 text-sm mt-1">
      Get 2x credits on your first purchase! ⏰ One-time offer
    </p>
    <Link href="/pricing" className="mt-2 inline-block">
      <button className="px-4 py-2 bg-primary text-white rounded-lg">
        View Pricing
      </button>
    </Link>
  </div>
)}

<PostSelectionTable
  // ... existing props
  hasCredits={hasCredits}
/>

<SmartFilters
  // ... existing props
  hasCredits={hasCredits}
/>
```

### 5. Update Pricing Packages

**File**: `lib/pricing.ts`

**Current**: 
- 5 credits: $10
- 20 credits: $30
- 50 credits: $50
- 100 credits: $80

**Required**: 
- 5 analyses: $20 (first purchase: 10 analyses)
- 20 analyses: $60 (first purchase: 40 analyses) - Most Popular
- 50 analyses: $100 (first purchase: 100 analyses) - Best Value
- 100 analyses: $150 (first purchase: 200 analyses)

**Implementation**:
```typescript
export const CREDIT_PACKAGES = {
  '5': {
    name: '5 Analyses',
    credits: 5,
    price: 20,
    pricePerAnalysis: 4,
    stripePriceId: process.env.STRIPE_PRICE_5_ANALYSES || '',
    popular: false,
  },
  '20': {
    name: '20 Analyses',
    credits: 20,
    price: 60,
    pricePerAnalysis: 3,
    stripePriceId: process.env.STRIPE_PRICE_20_ANALYSES || '',
    popular: true,
  },
  '50': {
    name: '50 Analyses',
    credits: 50,
    price: 100,
    pricePerAnalysis: 2,
    stripePriceId: process.env.STRIPE_PRICE_50_ANALYSES || '',
    popular: false,
    bestValue: true,
  },
  '100': {
    name: '100 Analyses',
    credits: 100,
    price: 150,
    pricePerAnalysis: 1.5,
    stripePriceId: process.env.STRIPE_PRICE_100_ANALYSES || '',
    popular: false,
  },
} as const
```

### 6. Update Webhook for First Purchase Bonus

**File**: `app/api/webhooks/stripe/route.ts`

**Current**: Already has first purchase bonus logic, but needs to match new pricing

**Required**: 
- Keep existing 2x bonus logic
- Ensure it works with new pricing packages
- Update environment variable names if needed

### 7. Update Pricing Table Component

**File**: `components/pricing/PricingTable.tsx`

**Required**: 
- Update to show new pricing ($20, $60, $100, $150)
- Show "First Purchase Bonus: Get 2x credits!" prominently
- Update environment variable references

### 8. Blog Scan API - Check User Credits

**File**: `app/api/blog/scan/route.ts`

**Required**: 
- Check if user is authenticated
- If authenticated, check user credits
- Return metadata only if user has credits > 0
- For anonymous users, return no metadata

**Implementation**:
```typescript
// After getting user (around line 166)
let userCredits = 0;
if (user) {
  const { data: userData } = await supabase
    .from('users')
    .select('credits')
    .eq('id', user.id)
    .single();
  userCredits = userData?.credits || 0;
}

const hasCredits = userCredits > 0;

// Filter posts
const postsToReturn = hasCredits
  ? postMetadata
  : postMetadata.map(p => ({
      url: p.url,
      title: p.title,
      publishedDate: p.publishedDate,
    }));

// Filter summary
const summaryToReturn = hasCredits
  ? { totalWords, avgWordsPerPost, totalAffiliateLinks, underMonetizedCount }
  : {};
```

## Testing Checklist

- [ ] Anonymous user sees only titles, URLs, dates in scan results
- [ ] Anonymous user cannot see word counts or affiliate link counts
- [ ] Anonymous user cannot use word count or affiliate link filters
- [ ] Logged-in user with 0 credits sees same as anonymous (no metadata)
- [ ] Logged-in user with credits > 0 sees full metadata
- [ ] Pricing shows correct amounts ($20, $60, $100, $150)
- [ ] First purchase bonus applies correctly (2x credits)
- [ ] Upgrade prompts appear for users without credits

## Priority Order

1. **High Priority** (Core functionality):
   - Update blog scan API to hide metadata
   - Update PostSelectionTable to conditionally show columns
   - Update SmartFilters to conditionally show filters
   - Update scan results page to pass hasCredits prop

2. **Medium Priority** (Pricing):
   - Update pricing packages
   - Update pricing table component
   - Verify webhook bonus logic

3. **Low Priority** (Polish):
   - Add upgrade prompts
   - Update messaging throughout UI

