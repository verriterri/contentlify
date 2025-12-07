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
  const [showOnlyBroken, setShowOnlyBroken] = useState(false)
  const [sortBy, setSortBy] = useState<'confidence' | 'relevance' | 'value'>('confidence')
  const [checkingHealth, setCheckingHealth] = useState(false)
  const [healthProgress, setHealthProgress] = useState<{ checked: number; total: number } | null>(null)
  const [opportunitiesWithHealth, setOpportunitiesWithHealth] = useState<AffiliateOpportunity[]>(opportunities)

  // Sync opportunitiesWithHealth when opportunities prop changes
  useEffect(() => {
    setOpportunitiesWithHealth(opportunities)
  }, [opportunities])


  // Update filtered to use opportunitiesWithHealth
  const currentOpportunities = opportunitiesWithHealth.length > 0 ? opportunitiesWithHealth : opportunities

  // Get unique categories from current opportunities
  const categories = Array.from(new Set(currentOpportunities.map((opp) => opp.category)))

  // Filter opportunities
  let filtered = currentOpportunities.filter((opp) => {
    if (filterCategory !== 'all' && opp.category !== filterCategory) return false
    if (showOnlyBroken) {
      // Show only opportunities with broken links
      const hasBrokenLink = opp.linkHealth?.status === 'broken' ||
        opp.affiliatePrograms.some(program => program.linkHealth?.status === 'broken')
      if (!hasBrokenLink) return false
    }
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

  const copyAllLinks = () => {
    const links = filtered
      .filter((opp) => opp.affiliatePrograms.length > 0)
      .map((opp) => opp.affiliatePrograms[0].url)
      .join('\n')
    navigator.clipboard.writeText(links)
    alert('Links copied to clipboard!')
  }

  const checkLinkHealth = async () => {
    setCheckingHealth(true)
    setHealthProgress({ checked: 0, total: 0 })

    // Collect all URLs to check
    const urlsToCheck: string[] = []
    const urlToOpportunityMap = new Map<string, { oppIndex: number; isLinkedUrl: boolean; programIndex?: number }>()

    opportunities.forEach((opp, oppIndex) => {
      if (opp.linkedUrl) {
        urlsToCheck.push(opp.linkedUrl)
        urlToOpportunityMap.set(opp.linkedUrl, { oppIndex, isLinkedUrl: true })
      }
      opp.affiliatePrograms.forEach((program, programIndex) => {
        if (program.url) {
          urlsToCheck.push(program.url)
          urlToOpportunityMap.set(program.url, { oppIndex, isLinkedUrl: false, programIndex })
        }
      })
    })

    // Remove duplicates
    const uniqueUrls = Array.from(new Set(urlsToCheck))
    setHealthProgress({ checked: 0, total: uniqueUrls.length })

    try {
      const response = await fetch('/api/check-link-health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: uniqueUrls }),
      })

      if (!response.ok) {
        throw new Error('Failed to check link health')
      }

      const data = await response.json()
      const healthResults = data.results || {}

      // Update opportunities with health data
      const updated = opportunities.map((opp, oppIndex) => {
        const updatedOpp = { ...opp }
        
        // Update linkedUrl health
        if (opp.linkedUrl && healthResults[opp.linkedUrl]) {
          updatedOpp.linkHealth = healthResults[opp.linkedUrl]
        }

        // Update affiliate program link health
        updatedOpp.affiliatePrograms = opp.affiliatePrograms.map((program, programIndex) => {
          if (program.url && healthResults[program.url]) {
            return {
              ...program,
              linkHealth: healthResults[program.url],
            }
          }
          return program
        })

        return updatedOpp
      })

      setOpportunitiesWithHealth(updated)
      setHealthProgress({ checked: uniqueUrls.length, total: uniqueUrls.length })
    } catch (error) {
      console.error('Error checking link health:', error)
      alert('Failed to check link health. Please try again.')
    } finally {
      setCheckingHealth(false)
      setTimeout(() => setHealthProgress(null), 2000) // Clear progress after 2 seconds
    }
  }

  const getHealthIcon = (health?: LinkHealth) => {
    if (!health) return null

    const icons = {
      healthy: (
        <span className="text-green-600" title="Link is working">
          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </span>
      ),
      broken: (
        <span className="text-red-600" title={`Link is broken: ${health.error || 'HTTP ' + health.statusCode}`}>
          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </span>
      ),
      redirect: (
        <span className="text-yellow-600" title={`Link redirects${health.finalUrl ? ' to: ' + health.finalUrl : ''}`}>
          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      ),
      timeout: (
        <span className="text-gray-400" title="Link check timed out">
          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        </span>
      ),
      unknown: (
        <span className="text-gray-400" title="Link health unknown">
          <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </span>
      ),
    }

    return icons[health.status] || null
  }

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
              onClick={checkLinkHealth}
              disabled={checkingHealth}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              {checkingHealth ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {healthProgress ? `Checking (${healthProgress.checked}/${healthProgress.total})...` : 'Checking...'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Check Link Health
                </>
              )}
            </button>
            <button
              onClick={copyAllLinks}
              className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Copy All Links
            </button>
            <button
              onClick={() => {
                const csv = [
                  ['Product', 'Category', 'Program', 'URL', 'Commission', 'Link Health'].join(','),
                  ...filtered
                    .map((opp) =>
                      [
                        opp.product,
                        opp.category,
                        opp.affiliatePrograms[0]?.name || '',
                        opp.affiliatePrograms[0]?.url || '',
                        opp.affiliatePrograms[0]?.commission || '',
                        opp.affiliatePrograms[0]?.linkHealth?.status || 'not checked',
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showOnlyBroken"
              checked={showOnlyBroken}
              onChange={(e) => setShowOnlyBroken(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="showOnlyBroken" className="text-sm text-gray-700">
              Show only broken links
            </label>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Affiliate Program
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Commission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Link Health
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No opportunities found matching your filters.
                </td>
              </tr>
            ) : (
              filtered.map((opp, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900">{opp.product}</div>
                      {opp.linkHealth && getHealthIcon(opp.linkHealth)}
                    </div>
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
                  <td className="px-6 py-4">
                    {opp.affiliatePrograms.length > 0 ? (
                      <div className="space-y-1">
                        {opp.affiliatePrograms.map((program, i) => (
                          <div key={i} className="text-sm flex items-center gap-2">
                            <a
                              href={program.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary-600"
                            >
                              {program.name}
                            </a>
                            {program.linkHealth && getHealthIcon(program.linkHealth)}
                            {program.isPrimary && (
                              <span className="ml-2 text-xs text-gray-500">(Primary)</span>
                            )}
                            {program.linkHealth?.finalUrl && program.linkHealth.finalUrl !== program.url && (
                              <span className="text-xs text-gray-400" title={`Redirects to: ${program.linkHealth.finalUrl}`}>
                                ↪
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No program found</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {opp.affiliatePrograms[0]?.commission || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col gap-1">
                      {opp.linkHealth && (
                        <div className="flex items-center gap-1">
                          {getHealthIcon(opp.linkHealth)}
                          <span className="text-xs text-gray-600">Existing link</span>
                        </div>
                      )}
                      {opp.affiliatePrograms[0]?.linkHealth && (
                        <div className="flex items-center gap-1">
                          {getHealthIcon(opp.affiliatePrograms[0].linkHealth)}
                          <span className="text-xs text-gray-600">Program link</span>
                        </div>
                      )}
                      {!opp.linkHealth && !opp.affiliatePrograms[0]?.linkHealth && (
                        <span className="text-xs text-gray-400">Not checked</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {opp.affiliatePrograms.length > 0 && (
                      <a
                        href={opp.affiliatePrograms[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-600"
                      >
                        Learn More
                      </a>
                    )}
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

