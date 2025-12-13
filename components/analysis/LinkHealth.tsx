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

interface LinkInfo {
  url: string
  anchorText: string
  context?: string
}

interface LinkHealthProps {
  pageUrl: string
  linkDetails?: LinkInfo[]
}

export function LinkHealth({ pageUrl, linkDetails: providedLinks }: LinkHealthProps) {
  const [links, setLinks] = useState<LinkInfo[]>([])
  const [linkHealth, setLinkHealth] = useState<Map<string, LinkHealth>>(new Map())
  const [loading, setLoading] = useState(false)
  const [checkingHealth, setCheckingHealth] = useState(false)
  const [healthProgress, setHealthProgress] = useState<{ checked: number; total: number } | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'healthy' | 'broken' | 'redirect' | 'timeout'>('all')

  // Update links when providedLinks prop changes or on mount
  useEffect(() => {
    if (providedLinks && Array.isArray(providedLinks)) {
      setLinks(providedLinks)
    }
  }, [providedLinks])

  const loadLinks = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: pageUrl }),
      })

      if (!response.ok) {
        throw new Error('Failed to load links')
      }

      const data = await response.json()
      // Extract links from the scrape result
      const linkDetails = data.linkDetails || []
      setLinks(linkDetails)
    } catch (error) {
      console.error('Error loading links:', error)
      alert('Failed to load links from page. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const checkLinkHealth = async () => {
    if (links.length === 0) {
      await loadLinks()
      return
    }

    setCheckingHealth(true)
    setHealthProgress({ checked: 0, total: links.length })

    const urlsToCheck = links.map(link => link.url)
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
      setLinkHealth(new Map(Object.entries(healthResults)))
      setHealthProgress({ checked: uniqueUrls.length, total: uniqueUrls.length })
    } catch (error) {
      console.error('Error checking link health:', error)
      alert('Failed to check link health. Please try again.')
    } finally {
      setCheckingHealth(false)
      setTimeout(() => setHealthProgress(null), 2000)
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

  const getHealthStatus = (url: string): LinkHealth | undefined => {
    return linkHealth.get(url)
  }

  const filteredLinks = links.filter(link => {
    if (filterStatus === 'all') return true
    const health = getHealthStatus(link.url)
    if (!health) return false
    return health.status === filterStatus
  })

  const healthyCount = links.filter(l => getHealthStatus(l.url)?.status === 'healthy').length
  const brokenCount = links.filter(l => getHealthStatus(l.url)?.status === 'broken').length
  const redirectCount = links.filter(l => getHealthStatus(l.url)?.status === 'redirect').length
  const timeoutCount = links.filter(l => getHealthStatus(l.url)?.status === 'timeout').length
  const uncheckedCount = links.filter(l => !getHealthStatus(l.url)).length

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Link Health</h2>
            <p className="text-sm text-gray-600 mt-1">
              {links.length > 0 ? (
                <>
                  {links.length} link{links.length !== 1 ? 's' : ''} found
                  {linkHealth.size > 0 && (
                    <>
                      {' • '}
                      <span className="text-green-600">{healthyCount} healthy</span>
                      {brokenCount > 0 && <>, <span className="text-red-600">{brokenCount} broken</span></>}
                      {redirectCount > 0 && <>, <span className="text-yellow-600">{redirectCount} redirects</span></>}
                      {timeoutCount > 0 && <>, <span className="text-gray-400">{timeoutCount} timeout</span></>}
                      {uncheckedCount > 0 && <>, <span className="text-gray-400">{uncheckedCount} unchecked</span></>}
                    </>
                  )}
                </>
              ) : (
                'No links loaded yet'
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {links.length === 0 && (
              <button
                onClick={loadLinks}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {loading ? 'Loading...' : 'Load Links'}
              </button>
            )}
            {links.length > 0 && (
              <button
                onClick={checkLinkHealth}
                disabled={checkingHealth}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
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
                    Check All Links
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      {links.length > 0 && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Links ({links.length})</option>
                <option value="healthy">Healthy ({healthyCount})</option>
                <option value="broken">Broken ({brokenCount})</option>
                <option value="redirect">Redirects ({redirectCount})</option>
                <option value="timeout">Timeout ({timeoutCount})</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {links.length === 0 && !loading && (
        <div className="p-12 text-center text-gray-500">
          <p className="mb-4">No links loaded yet.</p>
          <button
            onClick={loadLinks}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 text-sm font-medium"
          >
            Load Links from Page
          </button>
        </div>
      )}

      {links.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anchor Text
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Context
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No links found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link, index) => {
                  const health = getHealthStatus(link.url)
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {health ? (
                          <div className="flex items-center gap-2">
                            {getHealthIcon(health)}
                            <span className="text-sm text-gray-900 capitalize">{health.status}</span>
                            {health.statusCode && (
                              <span className="text-xs text-gray-500">({health.statusCode})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not checked</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:text-primary-600 break-all"
                        >
                          {link.url}
                        </a>
                        {health?.finalUrl && health.finalUrl !== link.url && (
                          <div className="text-xs text-gray-500 mt-1">
                            ↪ Redirects to: {health.finalUrl}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {link.anchorText || '(no text)'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-md">
                          {link.context ? (
                            <>
                              "{link.context.substring(0, 100)}
                              {link.context.length > 100 ? '...' : ''}"
                            </>
                          ) : (
                            <span className="text-gray-400">No context</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

