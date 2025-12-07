'use client'

import { useState, useEffect } from 'react'

interface Page {
  url: string
  title: string
  wordCount: number
  publishedDate: string | null
  estimatedValue?: number // Total estimated value from analysis (sum of all opportunities)
  category?: string // Primary category from analysis (mapped to standard category)
  lastAnalyzedAt?: string | null // Timestamp of last analysis
  analysisId?: string | null // ID of the latest analysis
}

interface PostSelectionTableProps {
  posts: Page[]
  selectedUrls: Set<string>
  onSelectionChange: (urls: Set<string>) => void
  chargeExtraPreferences: Map<string, boolean>
  onChargeExtraChange: (prefs: Map<string, boolean>) => void
  globalChargeExtra: boolean
  hasCredits: boolean
  primaryKeywords: Map<string, string>
  onPrimaryKeywordsChange: (keywords: Map<string, string>) => void
}

const POSTS_PER_PAGE = 50

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

export function PostSelectionTable({
  posts,
  selectedUrls,
  onSelectionChange,
  chargeExtraPreferences,
  onChargeExtraChange,
  globalChargeExtra,
  hasCredits,
  primaryKeywords,
  onPrimaryKeywordsChange,
}: PostSelectionTableProps) {
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Reset to page 1 when posts change (e.g., filters applied)
  useEffect(() => {
    setCurrentPage(1)
  }, [posts.length])
  
  // Calculate pagination
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE)
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE
  const endIndex = startIndex + POSTS_PER_PAGE
  const paginatedPosts = posts.slice(startIndex, endIndex)

  // Helper function to get first 3 words from title, excluding stop words
  const getFirstThreeWords = (title: string): string => {
    // Common stop words to exclude
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'my', 'your', 'our', 'their', 'this',
      'these', 'those', 'i', 'you', 'we', 'they', 'me', 'him', 'her', 'us',
      'them', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'can',
      'could', 'should', 'would', 'may', 'might', 'must', 'shall', 'the'
    ])
    
    const words = title.trim().split(/\s+/).filter(word => {
      // Remove empty strings and stop words (case-insensitive)
      const lowerWord = word.toLowerCase().replace(/[^\w]/g, '') // Remove punctuation
      return word.length > 0 && !stopWords.has(lowerWord)
    })
    
    return words.slice(0, 3).join(' ')
  }

  const toggleSelection = (url: string, index: number) => {
    const newSelected = new Set(selectedUrls)
    const isCurrentlySelected = newSelected.has(url)
    
    if (isCurrentlySelected) {
      newSelected.delete(url)
    } else {
      newSelected.add(url)
      // Auto-populate primary keyword with first 3 words of title if not already set
      const page = posts.find(p => p.url === url)
      if (page && !primaryKeywords.has(url)) {
        const autoKeyword = getFirstThreeWords(page.title)
        if (autoKeyword) {
          const newKeywords = new Map(primaryKeywords)
          newKeywords.set(url, autoKeyword)
          onPrimaryKeywordsChange(newKeywords)
        }
      }
    }
    setLastSelectedIndex(index)
    onSelectionChange(newSelected)
  }

  const handleShiftClick = (url: string, index: number) => {
    if (lastSelectedIndex !== null && (event as MouseEvent).shiftKey) {
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      const newSelected = new Set(selectedUrls)
      
      for (let i = start; i <= end; i++) {
        newSelected.add(posts[i].url)
      }
      
      onSelectionChange(newSelected)
    } else {
      toggleSelection(url, index)
    }
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-500">No pages match the current filters.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden w-full">
      {/* Pagination Info */}
      {posts.length > POSTS_PER_PAGE && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
            <span className="font-medium">{Math.min(endIndex, posts.length)}</span> of{' '}
            <span className="font-medium">{posts.length.toLocaleString()}</span> pages
            {selectedUrls.size > 0 && (
              <span className="ml-3 text-primary font-medium">
                ({selectedUrls.size.toLocaleString()} selected)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto w-full">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={selectedUrls.size === posts.length && posts.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const allUrls = new Set(posts.map((p) => p.url))
                      onSelectionChange(allUrls)
                      // Auto-populate primary keywords for all selected pages
                      const newKeywords = new Map(primaryKeywords)
                      posts.forEach((page) => {
                        if (!newKeywords.has(page.url)) {
                          const autoKeyword = getFirstThreeWords(page.title)
                          if (autoKeyword) {
                            newKeywords.set(page.url, autoKeyword)
                          }
                        }
                      })
                      if (newKeywords.size > primaryKeywords.size) {
                        onPrimaryKeywordsChange(newKeywords)
                      }
                    } else {
                      onSelectionChange(new Set())
                    }
                  }}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              {hasCredits && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Word Count
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Date
              </th>
              {hasCredits && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              )}
              {hasCredits && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Analyze Full Page
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Primary Keyword
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedPosts.map((page, index) => {
              // Calculate actual index in full pages array for shift-click selection
              const actualIndex = startIndex + index
              const isSelected = selectedUrls.has(page.url)
              const isShort = hasCredits && (page.wordCount || 0) < 800
              const isLongPage = hasCredits && (page.wordCount || 0) > 5000
              const chargeExtra = chargeExtraPreferences.has(page.url)
                ? chargeExtraPreferences.get(page.url)!
                : globalChargeExtra

              const handleChargeExtraToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
                e.stopPropagation()
                const newPrefs = new Map(chargeExtraPreferences)
                if (e.target.checked) {
                  newPrefs.set(page.url, true)
                } else {
                  newPrefs.set(page.url, false)
                }
                onChargeExtraChange(newPrefs)
              }

              const handlePrimaryKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                e.stopPropagation()
                const newKeywords = new Map(primaryKeywords)
                const value = e.target.value
                if (value.trim()) {
                  newKeywords.set(page.url, value)
                } else {
                  newKeywords.delete(page.url)
                }
                onPrimaryKeywordsChange(newKeywords)
              }

              const currentPrimaryKeyword = primaryKeywords.get(page.url) || ''

              return (
                <tr
                  key={page.url}
                  className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-primary-50' : ''}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName !== 'INPUT') {
                      handleShiftClick(page.url, actualIndex)
                    }
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(page.url, actualIndex)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-sm font-medium text-gray-900 break-words pr-4"
                          title={page.title}
                        >
                          {page.title}
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={page.url.startsWith('http') ? page.url : `https://${page.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-500 break-all pr-4 hover:text-primary transition-colors flex-1"
                            title={page.url}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {page.url}
                          </a>
                          <a
                            href={page.url.startsWith('http') ? page.url : `https://${page.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-600 transition-colors flex-shrink-0"
                            title="Open in new tab"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>
                  {hasCredits && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(page.wordCount || 0).toLocaleString()}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {page.publishedDate
                      ? new Date(page.publishedDate).toLocaleDateString()
                      : 'Unknown'}
                  </td>
                  {hasCredits && (
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {page.lastAnalyzedAt && page.analysisId ? (
                        <a
                          href={`/dashboard/analyze?analysisId=${page.analysisId}`}
                          className="text-xs text-primary hover:text-primary-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {new Date(page.lastAnalyzedAt).toLocaleDateString()} {new Date(page.lastAnalyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">Not analyzed</span>
                      )}
                    </td>
                  )}
                  {hasCredits && (
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {isLongPage ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={chargeExtra}
                            onChange={handleChargeExtraToggle}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            disabled={!isSelected}
                          />
                          <span className="text-xs text-gray-600">
                            {chargeExtra ? 'Full page' : 'First 5K words'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    {isSelected ? (
                      <input
                        type="text"
                        value={currentPrimaryKeyword}
                        onChange={handlePrimaryKeywordChange}
                        placeholder="Optional keyword"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      {posts.length > POSTS_PER_PAGE && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
            <span className="font-medium">{Math.min(endIndex, posts.length)}</span> of{' '}
            <span className="font-medium">{posts.length.toLocaleString()}</span> pages
            {selectedUrls.size > 0 && (
              <span className="ml-3 text-primary font-medium">
                ({selectedUrls.size.toLocaleString()} selected)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

