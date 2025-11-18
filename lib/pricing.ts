// Credit packages configuration
// Note: First purchase bonus (2x credits) is applied automatically in the webhook
// Example: Buy 50 analyses → Get 100 analyses on first purchase
export const CREDIT_PACKAGES = {
  '5': {
    name: '5 Analyses',
    credits: 5,
    price: 9.99, // ~$2 per analysis
    pricePerAnalysis: 1.998,
    stripePriceId: process.env.STRIPE_PRICE_5_ANALYSES || '',
    popular: false,
  },
  '20': {
    name: '20 Analyses',
    credits: 20,
    price: 29.99, // ~$1.50 per analysis
    pricePerAnalysis: 1.4995,
    stripePriceId: process.env.STRIPE_PRICE_20_ANALYSES || '',
    popular: false,
  },
  '50': {
    name: '50 Analyses',
    credits: 50,
    price: 49.99, // ~$1 per analysis
    pricePerAnalysis: 0.9998,
    stripePriceId: process.env.STRIPE_PRICE_50_ANALYSES || '',
    popular: true, // Most Popular
  },
  '100': {
    name: '100 Analyses',
    credits: 100,
    price: 79.99, // ~$0.80 per analysis
    pricePerAnalysis: 0.7999,
    stripePriceId: process.env.STRIPE_PRICE_100_ANALYSES || '',
    popular: false,
    bestValue: true, // Best Value
  },
} as const

export type CreditPackageKey = keyof typeof CREDIT_PACKAGES

// Legacy pricing plans (kept for backwards compatibility during migration)
export const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    monthlyPrice: 29,
    annualPrice: 290,
    analysesLimit: 10,
    productsLimit: 20,
    features: [
      '10 content analyses per month',
      '20 product generations per month',
      'Basic templates',
      'Email support',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 79,
    annualPrice: 790,
    analysesLimit: null,
    productsLimit: null,
    features: [
      'Unlimited content analyses',
      'Unlimited product generations',
      'Batch analysis (analyze multiple URLs at once)',
      'All templates',
      'Priority support',
      'Advanced analytics',
    ],
  },
  agency: {
    name: 'Agency',
    monthlyPrice: 199,
    annualPrice: 1990,
    analysesLimit: null,
    productsLimit: null,
    features: [
      'Everything in Pro',
      '3 team seats',
      'White-label options',
      'Dedicated support',
      'Custom integrations',
    ],
  },
} as const

export type PricingTier = keyof typeof PRICING_PLANS

