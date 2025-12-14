// Database types matching Supabase schema

import type { AuditResult } from '@/lib/audit/types'

export type AnalysisStatus = 'processing' | 'completed' | 'failed'
export type ProductType = 'checklist' | 'workbook' | 'ebook' | 'newsletter' | 'template' | 'video_series'
export type SocialPlatform = 'facebook' | 'twitter' | 'instagram' | 'pinterest'

export interface User {
  id: string
  email: string
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
  seo_audit: AuditResult | null
  status: AnalysisStatus
  created_at: string
}

export interface LinkHealth {
  status: 'healthy' | 'broken' | 'redirect' | 'timeout' | 'unknown'
  statusCode?: number
  finalUrl?: string
  isStillAffiliate?: boolean
  error?: string
  checkedAt: string
}

export interface AffiliateOpportunity {
  product: string
  category: string
  context: string
  confidence: number
  relevance?: number
  isAlreadyLinked: boolean
  linkedUrl?: string
  linkAnchorText?: string
  linkHealth?: LinkHealth
  estimatedValue?: number // Estimated item price in USD (for sorting high-value items first)
  affiliatePrograms: {
    name: string
    url: string
    commission: string
    isPrimary: boolean
    note?: string
    linkHealth?: LinkHealth
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

