'use client'

import { useState } from 'react'

interface Post {
  url: string
  title: string
  wordCount: number
  affiliateLinkCount: number
  publishedDate: string | null
}

interface ScanResultsProps {
  blogUrl: string
  totalPosts: number
  scannedPosts: number
  posts: Post[]
  summary: {
    totalWords: number
    avgWordsPerPost: number
    totalAffiliateLinks: number
    underMonetizedCount: number
  }
  onSelectPosts?: (selectedUrls: string[]) => void
}

export function ScanResults({
  blogUrl,
  totalPosts,
  scannedPosts,
  posts,
  summary,
  onSelectPosts,
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
    onSelectPosts?.(Array.from(newSelected))
  }

  const selectAll = () => {
    const allUrls = new Set(posts.map((p) => p.url))
    setSelectedUrls(allUrls)
    onSelectPosts?.(Array.from(allUrls))
  }

  const deselectAll = () => {
    setSelectedUrls(new Set())
    onSelectPosts?.([])
  }

  const selectUnderMonetized = () => {
    const underMonetized = posts.filter(
      (p) => p.wordCount >= 1500 && p.affiliateLinkCount <= 2
    )
    const urls = new Set(underMonetized.map((p) => p.url))
    setSelectedUrls(urls)
    onSelectPosts?.(Array.from(urls))
  }

  // Categorize posts
  const underMonetized = posts.filter((p) => p.wordCount >= 1500 && p.affiliateLinkCount <= 2)
  const partiallyMonetized = posts.filter((p) => p.affiliateLinkCount >= 3 && p.affiliateLinkCount <= 9)
  const wellMonetized = posts.filter((p) => p.affiliateLinkCount >= 10)
  const shortPosts = posts.filter((p) => p.wordCount < 800)

  return (
    <div className="space-y-6">
      {/* Blog Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{blogUrl}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Posts</p>
            <p className="text-2xl font-bold text-gray-900">{totalPosts}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Words</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalWords.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Words</p>
            <p className="text-2xl font-bold text-gray-900">{summary.avgWordsPerPost.toLocaleString()}</p>
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
            <p className="font-semibold text-gray-900">Short Posts</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{shortPosts.length}</p>
          <p className="text-sm text-gray-600">&lt;800 words</p>
        </div>
      </div>

      {/* Smart Selection Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={selectUnderMonetized}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          Select Under-Monetized ({underMonetized.length} posts)
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

      {/* Posts List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedUrls.size === posts.length && posts.length > 0}
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
              {posts.map((post) => {
                const isSelected = selectedUrls.has(post.url)
                const isHighPotential = post.wordCount >= 1500 && post.affiliateLinkCount <= 2
                const isShort = post.wordCount < 800
                const isWellMonetized = post.affiliateLinkCount >= 10

                return (
                  <tr
                    key={post.url}
                    className={`hover:bg-gray-50 ${isSelected ? 'bg-primary-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(post.url)}
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
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Short post">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {isWellMonetized && (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Well monetized">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={post.title}>
                            {post.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {post.url}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {post.wordCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">{post.affiliateLinkCount}</span>
                        {post.affiliateLinkCount <= 2 && post.wordCount >= 1500 && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            High potential
                          </span>
                        )}
                        {post.affiliateLinkCount >= 10 && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Well monetized
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {post.publishedDate
                        ? new Date(post.publishedDate).toLocaleDateString()
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
            {selectedUrls.size} post{selectedUrls.size !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  )
}

