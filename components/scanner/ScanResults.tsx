'use client'

import { useState } from 'react'

interface Page {
  url: string
  title: string
  wordCount: number
  affiliateLinkCount: number
  publishedDate: string | null
}

interface ScanResultsProps {
  siteUrl: string
  totalPages: number
  scannedPages: number
  pages: Page[]
  summary: {
    totalWords: number
    avgWordsPerPage: number
    totalAffiliateLinks: number
    underMonetizedCount: number
  }
  onSelectPages?: (selectedUrls: string[]) => void
}

/**
 * Check if a page is a legal/administrative page that shouldn't be monetized
 */
function isLegalOrAdminPage(page: Page): boolean {
  const url = page.url.toLowerCase()
  const title = page.title.toLowerCase()
  
  const legalPatterns = [
    'terms',
    'privacy',
    'legal',
    'disclaimer',
    'cookie',
    'gdpr',
    'accessibility',
    'sitemap',
    'contact',
    'about',
    'imprint',
    'impressum',
    'datenschutz',
    'agb',
    'nutzungsbedingungen',
  ]
  
  // Check URL path (all segments, not just last)
  const urlPath = url
  if (legalPatterns.some(pattern => urlPath.includes(`/${pattern}`) || urlPath.includes(`-${pattern}`) || urlPath.endsWith(pattern))) {
    return true
  }
  
  // Check title
  if (legalPatterns.some(pattern => title.includes(pattern))) {
    return true
  }
  
  return false
}

export function ScanResults({
  siteUrl,
  totalPages,
  scannedPages,
  pages,
  summary,
  onSelectPages,
}: ScanResultsProps) {
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())

  const toggleSelection = (url: string) => {
    const newSelected = new Set(selectedUrls)
    if (newSelected.has(url)) {
      newSelected.delete(url)
    } else {
      newSelected.add(url)
    }
    setSelectedUrls(newSelected)
    onSelectPages?.(Array.from(newSelected))
  }

  const selectAll = () => {
    const allUrls = new Set(pages.map((p) => p.url))
    setSelectedUrls(allUrls)
    onSelectPages?.(Array.from(allUrls))
  }

  const deselectAll = () => {
    setSelectedUrls(new Set())
    onSelectPages?.([])
  }

  const selectUnderMonetized = () => {
    const underMonetized = pages.filter(
      (p) => p.wordCount >= 1500 && p.affiliateLinkCount <= 2
    )
    const urls = new Set(underMonetized.map((p) => p.url))
    setSelectedUrls(urls)
    onSelectPages?.(Array.from(urls))
  }

  // Categorize pages
  const underMonetized = pages.filter((p) => p.wordCount >= 1500 && p.affiliateLinkCount <= 2)
  const partiallyMonetized = pages.filter((p) => p.affiliateLinkCount >= 3 && p.affiliateLinkCount <= 9)
  const wellMonetized = pages.filter((p) => p.affiliateLinkCount >= 10)
  const shortPages = pages.filter((p) => p.wordCount < 800)

  return (
    <div className="space-y-6">
      {/* Site Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{siteUrl}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Pages</p>
            <p className="text-2xl font-bold text-gray-900">{totalPages}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Words</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalWords.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Words</p>
            <p className="text-2xl font-bold text-gray-900">{summary.avgWordsPerPage.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Affiliate Links</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalAffiliateLinks}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="font-semibold text-gray-900">Under-Monetized</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{underMonetized.length}</p>
          <p className="text-sm text-gray-600">1500+ words, 0-2 links</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="font-semibold text-gray-900">Partially Monetized</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{partiallyMonetized.length}</p>
          <p className="text-sm text-gray-600">3-9 affiliate links</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold text-gray-900">Well Monetized</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{wellMonetized.length}</p>
          <p className="text-sm text-gray-600">10+ affiliate links</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-semibold text-gray-900">Short Pages</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{shortPages.length}</p>
          <p className="text-sm text-gray-600">&lt;800 words</p>
        </div>
      </div>

      {/* Smart Selection Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={selectUnderMonetized}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          Select Under-Monetized ({underMonetized.length} pages)
        </button>
        <button
          onClick={selectAll}
          className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Select All
        </button>
        <button
          onClick={deselectAll}
          className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Deselect All
        </button>
      </div>

      {/* Pages List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedUrls.size === pages.length && pages.length > 0}
                    onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Words
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Affiliate Links
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map((page) => {
                const isSelected = selectedUrls.has(page.url)
                const isHighPotential = page.wordCount >= 1500 && page.affiliateLinkCount <= 2 && !isLegalOrAdminPage(page)
                const isShort = page.wordCount < 800
                const isWellMonetized = page.affiliateLinkCount >= 10

                return (
                  <tr
                    key={page.url}
                    className={`hover:bg-gray-50 ${isSelected ? 'bg-primary-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(page.url)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isHighPotential && (
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="High potential">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        )}
                        {isShort && (
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Short page">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {isWellMonetized && (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Well monetized">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={page.title}>
                            {page.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {page.url}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {page.wordCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">{page.affiliateLinkCount}</span>
                        {page.affiliateLinkCount <= 2 && page.wordCount >= 1500 && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            High potential
                          </span>
                        )}
                        {page.affiliateLinkCount >= 10 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Well monetized
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {page.publishedDate
                        ? new Date(page.publishedDate).toLocaleDateString()
                        : 'Unknown'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUrls.size > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900">
            {selectedUrls.size} page{selectedUrls.size !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  )
}

