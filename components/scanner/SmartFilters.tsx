'use client'

interface SmartFiltersProps {
  filters: {
    wordCount: 'all' | '<500' | '500-1000' | '1000-2000' | '2000+'
    affiliateLinks: 'all' | '0-2' | '3-9' | '10+'
    date: 'all' | 'last-month' | 'last-6-months' | 'last-year'
    status: 'all' | 'not-analyzed' | 'analyzed'
    name: string
  }
  onFiltersChange: (filters: SmartFiltersProps['filters']) => void
  sortBy: 'recent' | 'oldest' | 'most-words' | 'fewest-links' | 'most-links' | 'name-asc' | 'name-desc'
  onSortChange: (sortBy: SmartFiltersProps['sortBy']) => void
  hasCredits: boolean
}

export function SmartFilters({
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  hasCredits,
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
            <option value="500-1000">500-1,000</option>
            <option value="1000-2000">1,000-2,000</option>
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

