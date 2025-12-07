'use client'

interface AnalysisResult {
  analysisId: string
  url: string
  title: string
  wordCount: number
  creditsUsed: number
  affiliateOpportunities: any[]
  productIdeas: any[]
}

interface OverviewStatsProps {
  analysis: AnalysisResult
}

export function OverviewStats({ analysis }: OverviewStatsProps) {
  const totalOpportunities = analysis.affiliateOpportunities.length
  const productIdeasCount = analysis.productIdeas.length

  // Estimate potential revenue (rough calculation)
  const estimatedRevenue = totalOpportunities * 50 // $50 per opportunity (very rough)

  return (
    <div className="space-y-6">
      {/* Page Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Analysis Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Page</p>
            <p className="text-lg font-semibold text-gray-900 truncate" title={analysis.title}>
              {analysis.title}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Word Count</p>
            <p className="text-lg font-semibold text-gray-900">
              {analysis.wordCount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Credits Used</p>
            <p className="text-lg font-semibold text-gray-900">{analysis.creditsUsed}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Analyzed At</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Affiliate Opportunities</p>
              <p className="text-3xl font-bold text-gray-900">{totalOpportunities}</p>
              <p className="text-sm text-gray-500 mt-1">
                Potential affiliate opportunities
              </p>
            </div>
            <div className="bg-primary-100 rounded-lg p-3">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-5.657-5.657l1.102-1.101m0 0L11 16l-1.102-1.101m5.657-5.657L19 8l-1.102-1.101m-5.657 5.657L11 16m0 0l-1.102 1.101"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Product Ideas</p>
              <p className="text-3xl font-bold text-gray-900">{productIdeasCount}</p>
              <p className="text-sm text-gray-500 mt-1">Ready to generate</p>
            </div>
            <div className="bg-green-100 rounded-lg p-3">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Est. Additional Revenue</p>
              <p className="text-3xl font-bold text-gray-900">${estimatedRevenue}</p>
              <p className="text-sm text-gray-500 mt-1">Potential per month</p>
            </div>
            <div className="bg-yellow-100 rounded-lg p-3">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Next Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Actions</h3>
        <div className="space-y-3">
          {totalOpportunities > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">
                  Review {totalOpportunities} affiliate opportunit{totalOpportunities !== 1 ? 'ies' : 'y'}
                </p>
                <p className="text-sm text-gray-600">
                  Products and services mentioned in your content that could be monetized
                </p>
              </div>
              <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 text-sm font-medium">
                View Opportunities
              </button>
            </div>
          )}
          {productIdeasCount > 0 && (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">
                  Generate {productIdeasCount} product outline{productIdeasCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-600">
                  Create digital products to sell based on your content
                </p>
              </div>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                Generate Outlines
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

