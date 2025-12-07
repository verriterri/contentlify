'use client'

import { useState, useEffect } from 'react'

interface LinkHealth {
  status: 'healthy' | 'broken' | 'redirect' | 'timeout' | 'unknown'
  statusCode?: number
  finalUrl?: string
  isStillAffiliate?: boolean
  error?: string
  checkedAt: string
}

interface AffiliateOpportunity {
  product: string
  category: string
  context: string
  confidence: number
  relevance?: number
  isAlreadyLinked: boolean
  linkedUrl?: string
  linkAnchorText?: string
  linkHealth?: LinkHealth
  estimatedValue?: number
  affiliatePrograms: Array<{
    name: string
    url: string
    commission: string
    isPrimary: boolean
    note?: string
    linkHealth?: LinkHealth
  }>
}

interface AffiliateOpportunitiesProps {
  opportunities: AffiliateOpportunity[]
}

export function AffiliateOpportunities({ opportunities }: AffiliateOpportunitiesProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'confidence' | 'relevance' | 'value'>('confidence')

  const currentOpportunities = opportunities

  // Get unique categories from current opportunities
  const categories = Array.from(new Set(currentOpportunities.map((opp) => opp.category)))

  // Filter opportunities
  let filtered = currentOpportunities.filter((opp) => {
    if (filterCategory !== 'all' && opp.category !== filterCategory) return false
    return true
  })

  // Sort opportunities
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'confidence':
        return b.confidence - a.confidence
      case 'relevance':
        return (b.relevance || 0) - (a.relevance || 0)
      case 'value':
        return (b.estimatedValue || 0) - (a.estimatedValue || 0)
      default:
        return 0
    }
  })

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Affiliate Opportunities</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filtered.length} opportunity{filtered.length !== 1 ? 'ies' : ''} found
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const csv = [
                  ['Product', 'Category', 'Context'].join(','),
                  ...filtered
                    .map((opp) =>
                      [
                        opp.product,
                        opp.category,
                        `"${opp.context.replace(/"/g, '""')}"`,
                      ].join(',')
                    ),
                ].join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'affiliate-opportunities.csv'
                a.click()
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 text-sm font-medium"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="confidence">Confidence</option>
            <option value="relevance">Relevance</option>
            <option value="value">Estimated Value</option>
          </select>
        </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product/Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Where Mentioned
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                  No opportunities found matching your filters.
                </td>
              </tr>
            ) : (
              filtered.map((opp, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{opp.product}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                      {opp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md">
                      "{opp.context.substring(0, 100)}
                      {opp.context.length > 100 ? '...' : ''}"
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

