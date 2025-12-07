'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ScanHistory {
  id: string
  site_url: string
  total_pages: number
  scanned_pages: number
  created_at: string
  scan_data?: {
    method?: string
  }
  expires_at?: string | null
  type: 'scan' | 'analysis' // 'scan' for site_scans, 'analysis' for content_analyses
  title?: string // For analyses
}

/**
 * Extract root domain from URL (e.g., "example.com" from "https://www.example.com/article")
 */
function extractRootDomain(url: string): string {
  if (!url || typeof url !== 'string') {
    return 'unknown'
  }
  
  // Normalize URL - add protocol if missing
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`
  }
  
  try {
    const urlObj = new URL(normalizedUrl)
    const hostname = urlObj.hostname.toLowerCase()
    // Remove www. prefix
    return hostname.replace(/^www\./, '')
  } catch {
    // If URL parsing fails, try to extract domain manually
    // Try with protocol first
    let match = normalizedUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/i)
    if (match) {
      return match[1].toLowerCase().replace(/^www\./, '')
    }
    // Try without protocol (just domain)
    match = url.match(/^(?:www\.)?([^\/\s]+)/i)
    if (match) {
      return match[1].toLowerCase().replace(/^www\./, '')
    }
    return 'unknown'
  }
}

export default function HistoryPage() {
  const router = useRouter()
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([])
  const [loadingScans, setLoadingScans] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedScanDomains, setExpandedScanDomains] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'site' | 'date'>('site')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const hasInitializedScans = useRef(false)

  // Group scans by root domain
  const groupedScanHistory = useMemo(() => {
    const groups = new Map<string, ScanHistory[]>()
    
    scanHistory.forEach((item) => {
      const rootDomain = extractRootDomain(item.site_url)
      if (!groups.has(rootDomain)) {
        groups.set(rootDomain, [])
      }
      groups.get(rootDomain)!.push(item)
    })
    
    // Convert to array and sort by domain name, then by date within each group
    const grouped = Array.from(groups.entries())
      .map(([domain, items]) => ({
        domain,
        items: items.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }))
    
    // Sort groups based on sortBy option and direction
    if (sortBy === 'date') {
      // Sort by date of last scan
      return grouped.sort((a, b) => {
        const dateA = new Date(a.items[0].created_at).getTime()
        const dateB = new Date(b.items[0].created_at).getTime()
        return sortDirection === 'desc' ? dateB - dateA : dateA - dateB
      })
    } else {
      // Sort by domain name
      return grouped.sort((a, b) => {
        const comparison = a.domain.localeCompare(b.domain)
        return sortDirection === 'desc' ? -comparison : comparison
      })
    }
  }, [scanHistory, sortBy, sortDirection])

  // Auto-expand scans only if there's a single domain
  useEffect(() => {
    if (groupedScanHistory.length > 0 && !hasInitializedScans.current) {
      if (groupedScanHistory.length === 1) {
        setExpandedScanDomains(new Set([groupedScanHistory[0].domain]))
      }
      hasInitializedScans.current = true
    }
  }, [groupedScanHistory])

  useEffect(() => {
    loadScanHistory()
  }, [])

  const loadScanHistory = async () => {
    setLoadingScans(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please sign in to view your scan history')
        setLoadingScans(false)
        return
      }

      // Load site scans
      const { data: scans, error: scansError } = await supabase
        .from('site_scans')
        .select('id, site_url, total_pages, scanned_pages, created_at, scan_data, expires_at, user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (scansError) {
        throw scansError
      }

      // Load single page analyses
      const { data: analyses, error: analysesError } = await supabase
        .from('content_analyses')
        .select('id, url, title, created_at, status, deleted_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (analysesError) {
        console.error('Error loading analyses:', analysesError)
        // Don't throw - continue with just scans
      }

      // Transform scans to include type
      const transformedScans: ScanHistory[] = (scans || []).filter((scan) => {
        // If this is a logged-in user's scan (user_id is set), always show it
        if (scan.user_id) return true
        // For anonymous scans, check if they've expired
        if (!scan.expires_at) return true
        return new Date(scan.expires_at) > new Date()
      }).map((scan) => ({
        ...scan,
        type: 'scan' as const,
      }))

      // Transform analyses to match ScanHistory format
      const transformedAnalyses: ScanHistory[] = (analyses || []).map((analysis) => ({
        id: analysis.id,
        site_url: analysis.url,
        total_pages: 1,
        scanned_pages: 1,
        created_at: analysis.created_at,
        title: analysis.title,
        type: 'analysis' as const,
        expires_at: null,
      }))

      // Combine and sort by date
      const allHistory = [...transformedScans, ...transformedAnalyses].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setScanHistory(allHistory)
    } catch (err: any) {
      setError(err.message || 'Failed to load scan history')
    } finally {
      setLoadingScans(false)
    }
  }

  const toggleScanDomain = (domain: string) => {
    setExpandedScanDomains((prev) => {
      const next = new Set(prev)
      if (next.has(domain)) {
        next.delete(domain)
      } else {
        next.add(domain)
      }
      return next
    })
  }

  const handleViewScan = (item: ScanHistory) => {
    if (item.type === 'analysis') {
      router.push(`/dashboard/analyze?analysisId=${item.id}`)
    } else {
      router.push(`/dashboard/analyze?scanId=${item.id}`)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          History
        </h1>
        <div className="flex items-center gap-4">
          {/* Sort Options */}
          {scanHistory.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'site' | 'date')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="site">Site</option>
                <option value="date">Date Last Scanned</option>
              </select>
              <button
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortDirection === 'asc' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loadingScans ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading scan history...</p>
        </div>
      ) : scanHistory.length > 0 ? (
        <div className="space-y-6">
          {groupedScanHistory.map(({ domain, items }) => {
            const isExpanded = expandedScanDomains.has(domain)
            return (
              <div key={domain} className="bg-white rounded-lg shadow">
                <button
                  onClick={() => toggleScanDomain(domain)}
                  className="w-full px-6 py-4 border-b border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {domain}
                        </h2>
                        {items.length > 0 && (
                          <span className="text-sm text-gray-500">
                            Last scanned: {new Date(items[0].created_at).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {items.length} {items.length === 1 ? 'scan' : 'scans'}
                      </p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {isExpanded && (
                  <div className="divide-y divide-gray-200">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <button
                              onClick={() => handleViewScan(item)}
                              className="text-left w-full"
                            >
                              <p className="text-sm font-medium text-gray-900 truncate hover:text-primary transition-colors">
                                {item.title || item.site_url}
                              </p>
                              {item.title && (
                                <p className="text-xs text-gray-500 truncate mt-1">
                                  {item.site_url}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <p className="text-xs text-gray-500">
                                  {item.scanned_pages} / {item.total_pages} {item.total_pages === 1 ? 'page' : 'pages'}
                                </p>
                                {item.scan_data?.method && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                                    {item.scan_data.method}
                                  </span>
                                )}
                                {item.type === 'analysis' && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                    Analysis
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(item.created_at).toLocaleString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </p>
                            </button>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewScan(item)
                            }}
                            className="ml-4 text-primary hover:text-primary-600 text-sm font-medium transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-600 mb-2">
            No scan history yet.
          </p>
          <p className="text-sm text-gray-500">
            Scan your site to see your scan history here.
          </p>
        </div>
      )}
    </div>
  )
}

