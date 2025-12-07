'use client'

interface SmartFiltersProps {
  filters: {
    wordCount: 'all' | '<500' | '<800' | '500-1000' | '1000-2000' | '1500+' | '2000+'
    affiliateLinks: 'all' | '0' | '0-2' | '3-9' | '10+'
    date: 'all' | 'last-month' | 'last-6-months' | 'last-year'
    status: 'all' | 'not-analyzed' | 'analyzed'
    name: string
  }
  onFiltersChange: (filters: SmartFiltersProps['filters']) => void
  sortBy: 'recent' | 'oldest' | 'most-words' | 'fewest-links' | 'most-links' | 'name-asc' | 'name-desc'
  onSortChange: (sortBy: SmartFiltersProps['sortBy']) => void
  hasCredits: boolean
  categoryCounts?: {
    underMonetized: number
    partiallyMonetized: number
    wellMonetized: number
    shortPages: number
    noAffiliateLinks: number
  }
}

export function SmartFilters({
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  hasCredits,
  categoryCounts,
}: SmartFiltersProps) {
  const activeFilterCount = [
    filters.wordCount !== 'all',
    filters.affiliateLinks !== 'all',
    filters.date !== 'all',
    filters.status !== 'all',
    filters.name.trim() !== '',
  ].filter(Boolean).length

  const clearAllFilters = () => {
    onFiltersChange({
      wordCount: 'all',
      affiliateLinks: 'all',
      date: 'all',
      status: 'all',
      name: '',
    })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters & Sorting</h3>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-primary hover:text-primary-600"
          >
            Clear all filters ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Quick Stats Breakdown (only for users with credits) */}
      {hasCredits && categoryCounts && (() => {
        const isUnderMonetizedSelected = filters.wordCount === '1500+' && filters.affiliateLinks === '0-2'
        const isPartiallyMonetizedSelected = filters.wordCount === 'all' && filters.affiliateLinks === '3-9'
        const isWellMonetizedSelected = filters.wordCount === 'all' && filters.affiliateLinks === '10+'
        const isShortPagesSelected = filters.wordCount === '<800' && filters.affiliateLinks === 'all'
        const isNoAffiliateLinksSelected = filters.wordCount === 'all' && filters.affiliateLinks === '0'

        return (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div 
              onClick={() => {
                onFiltersChange({
                  ...filters,
                  wordCount: '1500+',
                  affiliateLinks: '0-2',
                })
              }}
              className={`${isUnderMonetizedSelected ? 'bg-yellow-200 border-yellow-500' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4 cursor-pointer ${isUnderMonetizedSelected ? 'hover:bg-yellow-300' : 'hover:bg-yellow-100'} transition-colors`}
            >
              <div className="flex items-center gap-2 mb-2">
                <svg className={`w-6 h-6 ${isUnderMonetizedSelected ? 'text-yellow-800' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="font-semibold text-gray-900">Under-Monetized</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{categoryCounts.underMonetized}</p>
              <p className="text-sm text-gray-600">1500+ words, 0-2 links</p>
            </div>

            <div 
              onClick={() => {
                onFiltersChange({
                  ...filters,
                  wordCount: 'all',
                  affiliateLinks: '3-9',
                })
              }}
              className={`${isPartiallyMonetizedSelected ? 'bg-blue-200 border-blue-500' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 cursor-pointer ${isPartiallyMonetizedSelected ? 'hover:bg-blue-300' : 'hover:bg-blue-100'} transition-colors`}
            >
              <div className="flex items-center gap-2 mb-2">
                <svg className={`w-6 h-6 ${isPartiallyMonetizedSelected ? 'text-blue-800' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="font-semibold text-gray-900">Partially Monetized</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{categoryCounts.partiallyMonetized}</p>
              <p className="text-sm text-gray-600">3-9 affiliate links</p>
            </div>

            <div 
              onClick={() => {
                onFiltersChange({
                  ...filters,
                  wordCount: 'all',
                  affiliateLinks: '10+',
                })
              }}
              className={`${isWellMonetizedSelected ? 'bg-green-200 border-green-500' : 'bg-green-50 border-green-200'} border rounded-lg p-4 cursor-pointer ${isWellMonetizedSelected ? 'hover:bg-green-300' : 'hover:bg-green-100'} transition-colors`}
            >
              <div className="flex items-center gap-2 mb-2">
                <svg className={`w-6 h-6 ${isWellMonetizedSelected ? 'text-green-800' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-semibold text-gray-900">Well Monetized</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{categoryCounts.wellMonetized}</p>
              <p className="text-sm text-gray-600">10+ affiliate links</p>
            </div>

            <div 
              onClick={() => {
                onFiltersChange({
                  ...filters,
                  wordCount: '<800',
                  affiliateLinks: 'all',
                })
              }}
              className={`${isShortPagesSelected ? 'bg-gray-200 border-gray-500' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4 cursor-pointer ${isShortPagesSelected ? 'hover:bg-gray-300' : 'hover:bg-gray-100'} transition-colors`}
            >
              <div className="flex items-center gap-2 mb-2">
                <svg className={`w-6 h-6 ${isShortPagesSelected ? 'text-gray-800' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="font-semibold text-gray-900">Short Pages</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{categoryCounts.shortPages}</p>
              <p className="text-sm text-gray-600">&lt;800 words</p>
            </div>

            <div 
              onClick={() => {
                onFiltersChange({
                  ...filters,
                  wordCount: 'all',
                  affiliateLinks: '0',
                })
              }}
              className={`${isNoAffiliateLinksSelected ? 'bg-red-200 border-red-500' : 'bg-red-50 border-red-200'} border rounded-lg p-4 cursor-pointer ${isNoAffiliateLinksSelected ? 'hover:bg-red-300' : 'hover:bg-red-100'} transition-colors`}
            >
              <div className="flex items-center gap-2 mb-2">
                <svg className={`w-6 h-6 ${isNoAffiliateLinksSelected ? 'text-red-800' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="font-semibold text-gray-900">No Affiliate Links</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{categoryCounts.noAffiliateLinks}</p>
              <p className="text-sm text-gray-600">Pages with 0 links</p>
            </div>
          </div>
        )
      })()}

      {/* Name/Title Search Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search by Name or URL
        </label>
        <input
          type="text"
          value={filters.name}
          onChange={(e) =>
            onFiltersChange({ ...filters, name: e.target.value })
          }
          placeholder="Type to search posts by title or URL..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className={`grid grid-cols-1 ${hasCredits ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-4 mb-4`}>
        {/* Word Count Filter (only for users with credits) */}
        {hasCredits && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Word Count
          </label>
          <select
            value={filters.wordCount}
            onChange={(e) =>
              onFiltersChange({ ...filters, wordCount: e.target.value as any })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All</option>
            <option value="<500">&lt; 500</option>
            <option value="<800">&lt; 800</option>
            <option value="500-1000">500-1,000</option>
            <option value="1000-2000">1,000-2,000</option>
            <option value="1500+">1,500+</option>
            <option value="2000+">2,000+</option>
          </select>
        </div>
        )}

        {/* Affiliate Links Filter (only for users with credits) */}
        {hasCredits && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Affiliate Links
          </label>
          <select
            value={filters.affiliateLinks}
            onChange={(e) =>
              onFiltersChange({ ...filters, affiliateLinks: e.target.value as any })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All</option>
            <option value="0">0 links</option>
            <option value="0-2">0-2 links</option>
            <option value="3-9">3-9 links</option>
            <option value="10+">10+ links</option>
          </select>
        </div>
        )}

        {/* Date Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <select
            value={filters.date}
            onChange={(e) =>
              onFiltersChange({ ...filters, date: e.target.value as any })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All</option>
            <option value="last-month">Last month</option>
            <option value="last-6-months">Last 6 months</option>
            <option value="last-year">Last year</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) =>
              onFiltersChange({ ...filters, status: e.target.value as any })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All</option>
            <option value="not-analyzed">Not analyzed</option>
            <option value="analyzed">Analyzed</option>
          </select>
        </div>
      </div>

      {/* Sort By */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sort By
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'name-asc', label: 'Name (A-Z)' },
            { value: 'name-desc', label: 'Name (Z-A)' },
            ...(hasCredits ? [
              { value: 'fewest-links', label: 'Fewest Affiliate Links' },
              { value: 'most-words', label: 'Most Words' },
              { value: 'most-links', label: 'Most Affiliate Links' },
            ] : []),
            { value: 'recent', label: 'Most Recent' },
            { value: 'oldest', label: 'Oldest First' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === option.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

