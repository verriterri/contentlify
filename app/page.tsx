import { DirectCheckoutButton } from '@/components/checkout/DirectCheckoutButton'
import { HomeHeader } from '@/components/HomeHeader'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <HomeHeader />

      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 bg-gradient-to-br from-gray-900 to-primary-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Unlock Your Search Performance Insights
            </h1>
            <p className="text-2xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Get a comprehensive diagnostic report of your Google Search Console data for just $4.99
            </p>
            <div className="flex justify-center">
              <DirectCheckoutButton />
            </div>
            <p className="text-primary-100 mt-4 text-sm">
              No subscription. One-time payment. Instant access.
            </p>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What's Included in Your Report</h2>
            <p className="text-xl text-gray-600">Comprehensive insights from your Google Search Console data</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Top Queries */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Top 100 Queries</h3>
              <p className="text-gray-600 leading-relaxed">
                See your top-performing search queries with detailed metrics: clicks, impressions, CTR, and average position. Identify what's working and where to focus your SEO efforts.
              </p>
            </div>

            {/* Top Pages */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Top 100 Pages by Clicks</h3>
              <p className="text-gray-600 leading-relaxed">
                Discover which pages are driving the most traffic from Google. Understand your content's performance and identify opportunities for optimization.
              </p>
            </div>

            {/* CTR Analysis */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Click-Through Rate Insights</h3>
              <p className="text-gray-600 leading-relaxed">
                Analyze your CTR performance across queries and pages. Find low-hanging fruit to improve your titles and meta descriptions.
              </p>
            </div>

            {/* Position Tracking */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Position & Performance Summary</h3>
              <p className="text-gray-600 leading-relaxed">
                Get a complete overview of your search performance over the last 28 days, including total clicks, impressions, average CTR, and average position.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get your report in 4 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Account</h3>
              <p className="text-gray-600">
                Sign up with your email. Quick and free.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Purchase Report</h3>
              <p className="text-gray-600">
                One-time payment of $4.99. Instant access.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Google</h3>
              <p className="text-gray-600">
                Authorize access to your Search Console data.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full text-2xl font-bold mb-4">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">View Your Report</h3>
              <p className="text-gray-600">
                Select your property and generate your diagnostic report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">One-time payment. No subscription. No hidden fees.</p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl border-2 border-primary shadow-xl p-10 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">GSC Diagnostic Report</h3>
              <div className="mb-6">
                <span className="text-6xl font-bold text-gray-900">$4.99</span>
                <p className="text-gray-600 mt-2">One-time payment</p>
              </div>

              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Top 100 queries with full metrics</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Top 100 pages by clicks</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Performance summary (28 days)</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">CTR and position analysis</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Instant access after purchase</span>
                </li>
              </ul>

              <DirectCheckoutButton />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Do I need to sign up before purchasing?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes, you'll need to create a free account first. Then you can purchase your $4.99 report. This takes just a minute and uses Supabase's secure authentication.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What do I get for $4.99?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                You get one GSC diagnostic report for one property. The report includes your top 100 queries, top 100 pages, and a complete performance summary for the last 28 days.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Can I generate multiple reports?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Each $4.99 payment allows you to generate one report. If you want to analyze another property or get updated data, you can purchase another report for $4.99.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What do I need to use this service?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                You need a Google account with access to Google Search Console and at least one verified property. If you don't have Search Console set up yet, you can create a free account at search.google.com/search-console.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                How long does it take to get my report?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                The report is generated instantly once you connect your Google Search Console account and select a property. The entire process from purchase to viewing your report takes just a few minutes.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Is this a subscription?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                No. This is a one-time payment for one diagnostic report. There are no recurring charges, no hidden fees, and no subscription commitments.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What data time period does the report cover?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Each report covers the most recent 28 days of data available in your Google Search Console account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-primary-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to unlock your search insights?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Get your comprehensive GSC diagnostic report in minutes for just $4.99
          </p>
          <DirectCheckoutButton />
        </div>
      </section>
    </div>
  )
}
