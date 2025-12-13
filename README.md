# Contentlify

Content monetization platform that helps bloggers/creators optimize revenue through affiliate links, digital products, and promotional content generation.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: Supabase (Postgres + Auth)
- **Payments**: Stripe
- **AI**: OpenAI API (GPT-4o-mini for speed/cost)
- **PDF Generation**: jsPDF or react-pdf
- **File Storage**: Supabase Storage or Vercel Blob
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Accounts for:
  - Supabase (for database and auth)
  - Stripe (for payments)
  - OpenAI (for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd contentlify
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Stripe Price IDs (from Stripe Dashboard → Products → Prices)
# Get these by creating Products and Prices in Stripe Dashboard
STRIPE_PRICE_STARTER_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_STARTER_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_AGENCY_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_AGENCY_YEARLY=price_xxxxxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note**: You'll need to obtain these values from:
- OpenAI: https://platform.openai.com/api-keys
- Supabase: Your project settings → API
- Stripe: Dashboard → Developers → API keys

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Project Structure

```
contentlify/
├── app/              # Next.js App Router routes
├── components/       # Reusable UI components
├── lib/              # Utilities, API clients, helpers
├── types/            # TypeScript type definitions
├── public/           # Static assets
└── ...config files
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Next Steps

After setup, follow the build plan prompts to implement features:
1. Supabase Setup (database schema)
2. Authentication
3. Stripe Integration
4. Landing Page
5. Content Analysis features

## License

Private project - All rights reserved

