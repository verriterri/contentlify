'use client'

import { useState } from 'react'
import { AffiliateOpportunities } from './AffiliateOpportunities'
import { ProductIdeas } from './ProductIdeas'
import { OverviewStats } from './OverviewStats'
import { ContentAuditReport } from './ContentAuditReport'
import { LinkHealth } from './LinkHealth'
import type { AuditResult } from '@/lib/audit/types'

interface AnalysisResult {
  analysisId: string
  url: string
  title: string
  wordCount: number
  creditsUsed: number
  linkDetails?: any[]
  affiliateOpportunities: any[]
  productIdeas: any[]
  seoAudit?: AuditResult | null
  crossInsights?: string[]
}

interface ResultsProps {
  analysis: AnalysisResult
}

export function Results({ analysis }: ResultsProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'affiliates' | 'products' | 'links'>(
    analysis.seoAudit ? 'audit' : 'affiliates'
  )

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            ...(analysis.seoAudit ? [{ id: 'audit', label: 'Content Optimization Report' }] : []),
            { id: 'links', label: 'Link Health' },
            { id: 'affiliates', label: 'Affiliate Opportunities' },
            { id: 'products', label: 'Product Ideas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'audit' && analysis.seoAudit && (
        <ContentAuditReport audit={analysis.seoAudit} crossInsights={analysis.crossInsights} />
      )}
      {activeTab === 'affiliates' && (
        <AffiliateOpportunities opportunities={analysis.affiliateOpportunities} />
      )}
      {activeTab === 'products' && <ProductIdeas ideas={analysis.productIdeas} analysisId={analysis.analysisId} />}
      {activeTab === 'links' && <LinkHealth pageUrl={analysis.url} linkDetails={analysis.linkDetails} />}
    </div>
  )
}

