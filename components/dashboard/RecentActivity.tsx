'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Analysis {
  id: string
  url: string
  title: string | null
  status: string
  created_at: string
  credits_used: number
}

interface Scan {
  id: string
  site_url: string
  total_pages: number
  scanned_pages: number
  created_at: string
  scan_data: {
    method?: string
  }
}

interface ScanHistory {
  id: string
  site_url: string
  total_pages: number
  scanned_pages: number
  created_at: string
  scan_data?: {
    method?: string
  }
  type: 'scan' | 'analysis'
  title?: string
  analyses?: Analysis[] // Analyses associated with this scan
}

interface RecentActivityProps {
  analyses: Analysis[]
  scans: Scan[]
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
    let match = normalizedUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/i)
    if (match) {
      return match[1].toLowerCase().replace(/^www\./, '')
    }
    match = url.match(/^(?:www\.)?([^\/\s]+)/i)
    if (match) {
      return match[1].toLowerCase().replace(/^www\./, '')
    }
    return 'unknown'
  }
}

export function RecentActivity({ analyses, scans }: RecentActivityProps) {
  const router = useRouter()
  const [expandedScanDomains, setExpandedScanDomains] = useState<Set<string>>(new Set())
  const hasInitializedScans = useRef(false)

  // Transform scans and analyses to match History page format
  const scanHistory = useMemo(() => {
    // Transform scans
    const transformedScans: ScanHistory[] = scans.map((scan) => ({
      ...scan,
      type: 'scan' as const,
      analyses: [], // Will be populated below
    }))

    // Transform analyses and associate them with scans
    const transformedAnalyses: ScanHistory[] = analyses.map((analysis) => ({
      id: analysis.id,
      site_url: analysis.url,
      total_pages: 1,
      scanned_pages: 1,
      created_at: analysis.created_at,
      title: analysis.title,
      type: 'analysis' as const,
    }))

    // Group analyses by scan (match by domain)
    transformedScans.forEach((scan) => {
      const scanDomain = extractRootDomain(scan.site_url)
      scan.analyses = transformedAnalyses.filter((analysis) => {
        const analysisDomain = extractRootDomain(analysis.site_url)
        return analysisDomain === scanDomain
      })
    })

    // Add standalone analyses (not associated with any scan)
    const standaloneAnalyses = transformedAnalyses.filter((analysis) => {
      const analysisDomain = extractRootDomain(analysis.site_url)
      return !transformedScans.some((scan) => {
        const scanDomain = extractRootDomain(scan.site_url)
        return scanDomain === analysisDomain
      })
    })

    // Combine scans and standalone analyses, sort by date
    const allHistory = [...transformedScans, ...standaloneAnalyses].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return allHistory
  }, [scans, analyses])

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
    
    // Convert to array and sort by date within each group
    return Array.from(groups.entries())
      .map(([domain, items]) => ({
        domain,
        items: items.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      }))
      .sort((a, b) => {
        // Sort groups by date of most recent item
        const dateA = new Date(a.items[0].created_at).getTime()
        const dateB = new Date(b.items[0].created_at).getTime()
        return dateB - dateA
      })
  }, [scanHistory])

  // Auto-expand scans only if there's a single domain
  useEffect(() => {
    if (groupedScanHistory.length > 0 && !hasInitializedScans.current) {
      if (groupedScanHistory.length === 1) {
        setExpandedScanDomains(new Set([groupedScanHistory[0].domain]))
      }
      hasInitializedScans.current = true
    }
  }, [groupedScanHistory])

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
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Recent Analyses</h2>
          <Link
            href="/dashboard/history"
            className="text-sm text-primary hover:text-primary-600 font-medium"
          >
            View All →
          </Link>
        </div>
      </div>

      {scanHistory.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {groupedScanHistory.map(({ domain, items }) => {
            const isExpanded = expandedScanDomains.has(domain)
            const scansInGroup = items.filter(item => item.type === 'scan')
            const analysesInGroup = items.filter(item => item.type === 'analysis')
            
            return (
              <div key={domain}>
                <button
                  onClick={() => toggleScanDomain(domain)}
                  className="w-full px-6 py-4 border-b border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {domain}
                        </h3>
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
                        {scansInGroup.length} {scansInGroup.length === 1 ? 'scan' : 'scans'}
                        {analysesInGroup.length > 0 && (
                          <> • {analysesInGroup.length} {analysesInGroup.length === 1 ? 'analysis' : 'analyses'}</>
                        )}
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
                    {items.map((item) => {
                      if (item.type === 'scan') {
                        return (
                          <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 pr-4">
                                <button
                                  onClick={() => handleViewScan(item)}
                                  className="text-left w-full"
                                >
                                  <p className="text-sm font-medium text-gray-900 truncate hover:text-primary transition-colors">
                                    {item.site_url}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2">
                                    <p className="text-xs text-gray-500">
                                      {item.scanned_pages} / {item.total_pages} {item.total_pages === 1 ? 'page' : 'pages'}
                                    </p>
                                    {item.scan_data?.method && (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                                        {item.scan_data.method}
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
                            {/* Show analyses for this scan */}
                            {item.analyses && item.analyses.length > 0 && (
                              <div className="mt-4 ml-4 pl-4 border-l-2 border-gray-200">
                                <p className="text-xs font-medium text-gray-700 mb-2">Analyses:</p>
                                {item.analyses.map((analysis) => (
                                  <div key={analysis.id} className="mb-3 last:mb-0 pb-3 last:pb-0 border-b border-gray-100 last:border-b-0">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0 pr-4">
                                        <Link
                                          href={`/dashboard/analyze?analysisId=${analysis.id}`}
                                          className="text-sm text-gray-700 hover:text-primary transition-colors block"
                                        >
                                          <p className="font-medium text-gray-900 truncate">
                                            {analysis.title || analysis.site_url}
                                          </p>
                                          {analysis.title && (
                                            <p className="text-xs text-gray-500 truncate mt-1">
                                              {analysis.site_url}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                              Analysis
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {new Date(analysis.created_at).toLocaleDateString()}
                                            </span>
                                          </div>
                                        </Link>
                                      </div>
                                      <Link
                                        href={`/dashboard/analyze?analysisId=${analysis.id}`}
                                        className="ml-4 text-primary hover:text-primary-600 text-sm font-medium transition-colors"
                                      >
                                        View
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      } else {
                        // Standalone analysis (not associated with a scan)
                        return (
                          <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
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
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                      Analysis
                                    </span>
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
                        )
                      }
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No analyses yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by analyzing your first page.</p>
          <div className="mt-6">
            <Link
              href="/dashboard/analyze"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-600"
            >
              Analyze New Site
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

