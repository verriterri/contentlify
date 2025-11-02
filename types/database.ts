// Database types matching Supabase schema

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'agency'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due'
export type AnalysisStatus = 'processing' | 'completed' | 'failed'
export type ProductType = 'checklist' | 'workbook' | 'ebook' | 'newsletter'
export type SocialPlatform = 'facebook' | 'twitter' | 'instagram' | 'pinterest'

export interface User {
  id: string
  email: string
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface ContentAnalysis {
  id: string
  user_id: string
  url: string
  content: string | null
  affiliate_opportunities: AffiliateOpportunity[]
  product_ideas: ProductIdea[]
  status: AnalysisStatus
  created_at: string
}

export interface AffiliateOpportunity {
  product: string
  category: string
  context: string
  confidence: number
  isAlreadyLinked: boolean
  affiliatePrograms: {
    name: string
    url: string
    commission: string
    isPrimary: boolean
  }[]
}

export interface ProductIdea {
  name: string
  type: ProductType
  description: string
  valueProposition: string
  suggestedPrice: string
  estimatedTime: string
  targetAudience: string
}

export interface GeneratedProduct {
  id: string
  user_id: string
  analysis_id: string | null
  product_type: ProductType
  title: string
  content: string
  template_used: string | null
  file_url: string | null
  created_at: string
}

export interface SocialPost {
  id: string
  product_id: string
  platform: SocialPlatform
  content: string
  created_at: string
}

// Database insert types (without generated fields)
export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'>
export type ContentAnalysisInsert = Omit<ContentAnalysis, 'id' | 'created_at'>
export type GeneratedProductInsert = Omit<GeneratedProduct, 'id' | 'created_at'>
export type SocialPostInsert = Omit<SocialPost, 'id' | 'created_at'>

