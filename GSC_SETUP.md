# GSC Analysis Product - Setup Guide

## What Was Built

A minimal viable product for Google Search Console analysis with one-time payment ($9.99).

### Features
- Google Search Console OAuth connection
- Fetch and display basic GSC data (top queries, pages, clicks, impressions)
- One-time Stripe payment ($9.99) to unlock analysis
- Simple analysis dashboard with summary stats and data tables

## Database Schema

New tables added to `sql/schema.sql`:

1. **gsc_payments** - Tracks one-time $9.99 payments
2. **gsc_connections** - Stores OAuth tokens for Google Search Console
3. **gsc_analysis_results** - Caches GSC data for users

## API Routes

### Authentication
- `GET /api/auth/google` - Initiates Google OAuth flow
- `GET /api/auth/google/callback` - Handles OAuth callback, stores tokens

### Payment
- `POST /api/gsc/checkout` - Creates Stripe checkout session ($9.99)
- `POST /api/webhooks/stripe` - Updated to handle GSC payment completion

### Analysis
- `GET /api/gsc/analyze?action=list` - Lists available GSC properties
- `GET /api/gsc/analyze?siteUrl=...` - Fetches GSC data (requires payment)

## Frontend
- `/app/dashboard/gsc/page.tsx` - Main GSC dashboard page
- `/components/gsc/GSCDashboard.tsx` - Dashboard component with payment/connection gates

## Setup Instructions

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google Search Console API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback` (and production URL)
7. Copy Client ID and Client Secret

### 2. Update Environment Variables

Add to `.env.local`:

```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

Make sure these are already set:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Database Migration

1. Go to your Supabase SQL Editor
2. Run the updated `sql/schema.sql` file
   - **WARNING**: This resets the entire database. For production, extract only the new tables:
     - `gsc_payments`
     - `gsc_connections`
     - `gsc_analysis_results`
   - Also add the new indexes, RLS policies, and triggers for these tables

### 4. Test the Flow

1. Start the app: `npm run dev`
2. Sign in to your account
3. Navigate to `/dashboard/gsc`
4. You should see "Pay $9.99 to Unlock" button
5. Complete payment (use Stripe test card: `4242 4242 4242 4242`)
6. After payment, you'll see "Connect Google Search Console"
7. Connect your Google account
8. Select a property and fetch GSC data
9. View top queries and pages with stats

## User Flow

1. **Not Paid** → Show payment button ($9.99)
2. **Paid, Not Connected** → Show "Connect Google" button
3. **Paid & Connected** → Show GSC dashboard with:
   - Property selector dropdown
   - Summary stats (clicks, impressions, CTR, position)
   - Top 20 queries table
   - Top 20 pages table

## Data Displayed

For the selected GSC property (last 28 days):
- **Summary**: Total clicks, impressions, avg CTR, avg position
- **Top 100 Queries**: Query text, clicks, impressions, CTR, position
- **Top 100 Pages**: Page URL, clicks, impressions, CTR, position

## Token Refresh

OAuth tokens are automatically refreshed when expired:
- Tokens are checked before each API call
- Refresh happens automatically if token expires within 5 minutes
- Updated tokens are stored back in the database

## Security

- OAuth state parameter prevents CSRF attacks
- Stripe webhook signature verification
- Payment gate on analysis endpoint
- Row-level security on all database tables
- Tokens stored securely in database (use encryption in production!)

## Production Considerations

1. **Token Encryption**: Consider encrypting `access_token` and `refresh_token` in database
2. **Rate Limiting**: Add rate limiting to GSC API calls
3. **Error Handling**: Add better error messages for users
4. **Analytics**: Track usage and conversion
5. **Caching**: Cache GSC data to reduce API calls
6. **Multiple Properties**: Allow analyzing multiple properties
7. **Date Range Picker**: Let users select custom date ranges
8. **Export**: Add CSV/PDF export functionality

## Next Steps

- [ ] Add navigation link to GSC dashboard in sidebar/menu
- [ ] Test with real Google account and GSC data
- [ ] Set up Stripe webhook in production
- [ ] Add more analysis features (trends, comparisons, etc.)
- [ ] Improve UI/UX with charts and visualizations
