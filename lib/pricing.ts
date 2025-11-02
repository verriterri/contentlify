// Pricing plans configuration (safe for client-side import)
export const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    monthlyPrice: 29,
    annualPrice: 290, // 2 months free: 29 * 10 = 290
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
    annualPrice: 790, // 2 months free: 79 * 10 = 790
    analysesLimit: null, // Unlimited
    productsLimit: null, // Unlimited
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
    annualPrice: 1990, // 2 months free: 199 * 10 = 1990
    analysesLimit: null, // Unlimited
    productsLimit: null, // Unlimited
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

