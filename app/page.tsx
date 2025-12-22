import Link from 'next/link'
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
              See Your Google Search Console Data in Plain English
            </h1>
            <p className="text-2xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Free forever. Get your search performance insights in a clean, easy-to-understand dashboard.
            </p>
            <div className="flex justify-center">
              <a
                href="/signup"
                className="bg-white text-primary px-10 py-5 rounded-lg font-bold text-xl hover:bg-gray-100 transition-colors shadow-xl"
              >
                Get Started Free
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* AI Upgrade CTA Section */}
      <section className="py-16 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Want to Know What to Do About It?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Upgrade to AI-powered analysis for just $4.99
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-lg p-6 border border-primary-200">
              <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">AI-Powered Analysis</h3>
              <p className="text-sm text-gray-700">Get actionable insights and personalized recommendations</p>
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-lg p-6 border border-primary-200">
              <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">SEO Recommendations</h3>
              <p className="text-sm text-gray-700">Personalized advice to improve your rankings</p>
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-lg p-6 border border-primary-200">
              <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Content Optimization</h3>
              <p className="text-sm text-gray-700">Specific suggestions for your pages</p>
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-lg p-6 border border-primary-200">
              <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Keyword Opportunities</h3>
              <p className="text-sm text-gray-700">Find untapped ranking potential</p>
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-lg p-6 border border-primary-200">
              <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">CTR Optimization</h3>
              <p className="text-sm text-gray-700">Strategies to improve click rates</p>
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-lg p-6 border border-primary-200">
              <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Traffic Drop Diagnosis</h3>
              <p className="text-sm text-gray-700">We'll figure out why your traffic dropped and what to do about it</p>
            </div>
          </div>

          <div className="text-center">
            <DirectCheckoutButton />
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Free Dashboard Features</h2>
            <p className="text-xl text-gray-600">All of this is included for free, forever</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Top Queries */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">FREE</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Top 100 Queries</h3>
              <p className="text-gray-600 leading-relaxed">
                See your top-performing search queries with detailed metrics: clicks, impressions, CTR, and average position.
              </p>
            </div>

            {/* Top Pages */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">FREE</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Top 100 Pages</h3>
              <p className="text-gray-600 leading-relaxed">
                Discover which pages are driving the most traffic from Google with detailed performance metrics.
              </p>
            </div>

            {/* CTR Analysis */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">FREE</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Click-Through Rate Data</h3>
              <p className="text-gray-600 leading-relaxed">
                View CTR performance across all your queries and pages with sortable metrics.
              </p>
            </div>

            {/* Position Tracking */}
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">FREE</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Performance Summary</h3>
              <p className="text-gray-600 leading-relaxed">
                Complete overview of your last 28 days: total clicks, impressions, average CTR, and average position.
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
            <p className="text-xl text-gray-600">Start for free in 4 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign Up Free</h3>
              <p className="text-gray-600">
                Create account, no payment required
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Google</h3>
              <p className="text-gray-600">
                Authorize Search Console access
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">View Your Dashboard</h3>
              <p className="text-gray-600">
                See your data in plain English
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full text-2xl font-bold mb-4">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upgrade for Insights</h3>
              <p className="text-gray-600">
                Get AI analysis for $4.99 (optional)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Start Free, Upgrade When Ready</h2>
            <p className="text-xl text-gray-600">No credit card required. Upgrade to AI analysis for $4.99 anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free Dashboard */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Dashboard</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-gray-900">$0</span>
                  <p className="text-gray-600 mt-2">Forever free</p>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">All GSC data visualized</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Top 100 queries</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Top 100 pages</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Performance metrics</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700">Forever free</span>
                </li>
              </ul>

              <a
                href="/signup"
                className="block w-full bg-gray-200 text-gray-900 px-8 py-4 rounded-lg font-semibold text-center hover:bg-gray-300 transition-colors"
              >
                Get Started Free
              </a>
            </div>

            {/* AI Analysis */}
            <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-2xl border-2 border-primary shadow-xl p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 bg-primary text-white text-sm font-bold rounded-full">FEATURED</span>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">AI Analysis</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-gray-900">$4.99</span>
                  <p className="text-gray-600 mt-2">One-time per analysis</p>
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-4 font-semibold">Everything in Free, PLUS:</p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-900 font-medium">AI-powered insights</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-900 font-medium">SEO recommendations</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-900 font-medium">Content optimization tips</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-900 font-medium">Keyword opportunities</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-900 font-medium">CTR improvement strategies</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-900 font-medium">Traffic drop diagnosis</span>
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
                Is the dashboard really free?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes! Sign up, connect your Google Search Console, and access your dashboard completely free. No credit card required. View your top queries, pages, and performance metrics anytime.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What's included in the free dashboard?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                The free dashboard includes your top 100 queries and pages, full performance metrics (clicks, impressions, CTR, position), and a 28-day summary. Everything you need to track your search performance.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What do I get with AI analysis for $4.99?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                AI analysis provides personalized SEO recommendations, content optimization strategies, keyword opportunities, CTR optimization tips, and actionable next steps based on your specific data. Each $4.99 purchase generates one AI analysis report.
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
                Can I use the free dashboard without upgrading?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Absolutely! The free dashboard is yours forever. Upgrade to AI analysis only when you want deeper insights and recommendations. No pressure, no time limits.
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
            Ready to understand your search performance?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Start free. Upgrade to AI insights anytime.
          </p>
          <div className="flex flex-col items-center gap-4">
            <a
              href="/signup"
              className="bg-white text-primary px-10 py-5 rounded-lg font-bold text-xl hover:bg-gray-100 transition-colors shadow-xl"
            >
              Get Started Free
            </a>
            <p className="text-primary-100 text-sm">
              Or get AI analysis for $4.99
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
