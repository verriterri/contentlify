'use client'

import { useState } from 'react'

interface Page {
  url: string
  title: string
  wordCount: number
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
        </div>
      </div>

      {/* Smart Selection Buttons */}
      <div className="flex flex-wrap gap-2">
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
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map((page) => {
                const isSelected = selectedUrls.has(page.url)

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
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={page.title}>
                          {page.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {page.url}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {page.wordCount.toLocaleString()}
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

