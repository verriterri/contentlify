'use client'

import { useState, useEffect } from 'react'

interface Post {
  url: string
  title: string
  wordCount: number
  affiliateLinkCount: number
  publishedDate: string | null
  estimatedValue?: number // Total estimated value from analysis (sum of all opportunities)
  category?: string // Primary category from analysis (mapped to standard category)
}

interface PostSelectionTableProps {
  posts: Post[]
  selectedUrls: Set<string>
  onSelectionChange: (urls: Set<string>) => void
  chargeExtraPreferences: Map<string, boolean>
  onChargeExtraChange: (prefs: Map<string, boolean>) => void
  globalChargeExtra: boolean
  hasCredits: boolean
}

const POSTS_PER_PAGE = 50

export function PostSelectionTable({
  posts,
  selectedUrls,
  onSelectionChange,
  chargeExtraPreferences,
  onChargeExtraChange,
  globalChargeExtra,
  hasCredits,
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

  const toggleSelection = (url: string, index: number) => {
    const newSelected = new Set(selectedUrls)
    if (newSelected.has(url)) {
      newSelected.delete(url)
    } else {
      newSelected.add(url)
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
        <p className="text-gray-500">No posts match the current filters.</p>
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
            <span className="font-medium">{posts.length.toLocaleString()}</span> posts
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
                      onSelectionChange(new Set(posts.map((p) => p.url)))
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
              {hasCredits && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Affiliate Links
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
                  Analyze Full Post
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedPosts.map((post, index) => {
              // Calculate actual index in full posts array for shift-click selection
              const actualIndex = startIndex + index
              const isSelected = selectedUrls.has(post.url)
              const isHighPotential = hasCredits && (post.wordCount || 0) >= 1500 && (post.affiliateLinkCount || 0) <= 2
              const isShort = hasCredits && (post.wordCount || 0) < 800
              const isWellMonetized = hasCredits && (post.affiliateLinkCount || 0) >= 10
              const isLongPost = hasCredits && (post.wordCount || 0) > 5000
              const chargeExtra = chargeExtraPreferences.has(post.url)
                ? chargeExtraPreferences.get(post.url)!
                : globalChargeExtra

              const handleChargeExtraToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
                e.stopPropagation()
                const newPrefs = new Map(chargeExtraPreferences)
                if (e.target.checked) {
                  newPrefs.set(post.url, true)
                } else {
                  newPrefs.set(post.url, false)
                }
                onChargeExtraChange(newPrefs)
              }

              return (
                <tr
                  key={post.url}
                  className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-primary-50' : ''}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName !== 'INPUT') {
                      handleShiftClick(post.url, actualIndex)
                    }
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(post.url, actualIndex)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 flex gap-1">
                        {isHighPotential && (
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="High potential (1500+ words, 0-2 links)">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        )}
                        {isShort && (
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Short post (&lt;800 words)">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {isWellMonetized && (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Well monetized (10+ links)">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-sm font-medium text-gray-900 break-words pr-4"
                          title={post.title}
                        >
                          {post.title}
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={post.url.startsWith('http') ? post.url : `https://${post.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-500 break-all pr-4 hover:text-primary transition-colors flex-1"
                            title={post.url}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {post.url}
                          </a>
                          <a
                            href={post.url.startsWith('http') ? post.url : `https://${post.url}`}
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
                      {(post.wordCount || 0).toLocaleString()}
                    </td>
                  )}
                  {hasCredits && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">{post.affiliateLinkCount || 0}</span>
                        {(post.affiliateLinkCount || 0) <= 2 && (post.wordCount || 0) >= 1500 && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            High potential
                          </span>
                        )}
                        {(post.affiliateLinkCount || 0) >= 10 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Well monetized
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {post.publishedDate
                      ? new Date(post.publishedDate).toLocaleDateString()
                      : 'Unknown'}
                  </td>
                  {hasCredits && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-gray-500">Not analyzed</span>
                    </td>
                  )}
                  {hasCredits && (
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {isLongPost ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={chargeExtra}
                            onChange={handleChargeExtraToggle}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            disabled={!isSelected}
                          />
                          <span className="text-xs text-gray-600">
                            {chargeExtra ? 'Full post' : 'First 5K words'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                  )}
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
            <span className="font-medium">{posts.length.toLocaleString()}</span> posts
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

