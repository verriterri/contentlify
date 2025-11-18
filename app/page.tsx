import Link from 'next/link'
import { PricingTable } from '@/components/pricing/PricingTable'
import { BlogUrlInput } from '@/components/scanner/BlogUrlInput'
import { HomeHeader } from '@/components/HomeHeader'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <HomeHeader />
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              Find the Money You're Leaving on the Table
            </h1>
            <p className="text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Scan your entire blog for missed affiliate opportunities and digital product ideas in one click
            </p>
            <div className="max-w-2xl mx-auto">
              <BlogUrlInput />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section - Framer Style */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Blog Scanner Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all border border-gray-100">
              <div className="mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Blog Scanner</h3>
                <p className="text-gray-600 leading-relaxed">
                  Scan your entire blog for free. See all posts with titles, URLs, and dates. Purchase credits to unlock word counts, affiliate links, and opportunity scores.
                </p>
              </div>
              <Link
                href="/dashboard/analyze"
                className="inline-flex items-center text-primary font-semibold hover:text-primary-600 transition-colors"
              >
                Try Blog Scanner
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Affiliate Detector Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all border border-gray-100">
              <div className="mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-5.657-5.657l1.102-1.101m0 0L11 16l-1.102-1.101m5.657-5.657L19 8l-1.102-1.101m-5.657 5.657L11 16m0 0l-1.102 1.101" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Affiliate Detector</h3>
                <p className="text-gray-600 leading-relaxed">
                  AI finds every missed affiliate opportunity in your content. Get matched with the right programs automatically.
                </p>
              </div>
              <Link
                href="/dashboard/analyze"
                className="inline-flex items-center text-primary font-semibold hover:text-primary-600 transition-colors"
              >
                Try Affiliate Detector
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Product Ideas Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all border border-gray-100">
              <div className="mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Product Ideas</h3>
                <p className="text-gray-600 leading-relaxed">
                  Generate digital product ideas based on your content. Checklists, workbooks, ebooks, and more.
                </p>
              </div>
              <Link
                href="/dashboard/generate"
                className="inline-flex items-center text-primary font-semibold hover:text-primary-600 transition-colors"
              >
                Try Product Ideas
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Product Outlines Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all border border-gray-100">
              <div className="mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Product Outlines</h3>
                <p className="text-gray-600 leading-relaxed">
                  Generate structured outlines for digital products. Ready-to-develop templates with clear sections.
                </p>
              </div>
              <Link
                href="/dashboard/generate"
                className="inline-flex items-center text-primary font-semibold hover:text-primary-600 transition-colors"
              >
                Try Product Outlines
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Social Posts Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all border border-gray-100">
              <div className="mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Social Posts</h3>
                <p className="text-gray-600 leading-relaxed">
                  Generate platform-optimized social posts. Ready to copy-paste for Twitter, LinkedIn, Facebook, and Instagram.
                </p>
              </div>
              <Link
                href="/dashboard/generate"
                className="inline-flex items-center text-primary font-semibold hover:text-primary-600 transition-colors"
              >
                Try Social Posts
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Newsletter Templates Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all border border-gray-100">
              <div className="mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Newsletter Templates</h3>
                <p className="text-gray-600 leading-relaxed">
                  Create engaging newsletter editions with affiliate recommendations built right in.
                </p>
              </div>
              <Link
                href="/dashboard/generate"
                className="inline-flex items-center text-primary font-semibold hover:text-primary-600 transition-colors"
              >
                Try Newsletter Templates
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-xl text-gray-600">Get started in minutes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-white rounded-full text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter Blog URL</h3>
              <p className="text-gray-600 text-sm">
                We scan your entire blog (free)
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-white rounded-full text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">See All Posts</h3>
              <p className="text-gray-600 text-sm">
                Word count, existing affiliate links, published date
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-white rounded-full text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Posts</h3>
              <p className="text-gray-600 text-sm">
                Choose which ones to analyze (smart filters included)
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-white rounded-full text-xl font-bold mb-4">
                4
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Opportunities</h3>
              <p className="text-gray-600 text-sm">
                AI finds missed affiliate links and product ideas
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-white rounded-full text-xl font-bold mb-4">
                5
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate Outlines</h3>
              <p className="text-gray-600 text-sm">
                Create digital product outlines to guide development
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary text-white rounded-full text-xl font-bold mb-4">
                6
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Promote</h3>
              <p className="text-gray-600 text-sm">
                Get social posts ready to copy-paste
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Simple pricing</h2>
            <p className="text-xl text-gray-600">Pay per analysis. Credits never expire.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 text-center hover:border-primary transition-colors">
              <h3 className="text-xl font-bold text-gray-900 mb-2">5 Analyses</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">$9.99</span>
                <p className="text-gray-600 mt-2">$2.00 per analysis</p>
              </div>
              <Link
                href="/pricing"
                className="block w-full py-3 px-4 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Buy Now
              </Link>
            </div>
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 text-center hover:border-primary transition-colors">
              <h3 className="text-xl font-bold text-gray-900 mb-2">20 Analyses</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">$29.99</span>
                <p className="text-gray-600 mt-2">$1.50 per analysis</p>
              </div>
              <Link
                href="/pricing"
                className="block w-full py-3 px-4 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Buy Now
              </Link>
            </div>
            <div className="bg-white rounded-2xl border-2 border-primary shadow-lg p-8 text-center relative hover:shadow-xl transition-shadow">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">50 Analyses</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">$49.99</span>
                <p className="text-gray-600 mt-2">$1.00 per analysis</p>
              </div>
              <Link
                href="/pricing"
                className="block w-full py-3 px-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
              >
                Buy Now
              </Link>
            </div>
            <div className="bg-white rounded-2xl border-2 border-green-500 p-8 text-center relative hover:shadow-lg transition-shadow">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Best Value
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">100 Analyses</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">$79.99</span>
                <p className="text-gray-600 mt-2">$0.80 per analysis</p>
              </div>
              <Link
                href="/pricing"
                className="block w-full py-3 px-4 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
              >
                Buy Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                How does it work?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Enter any blog post URL and our AI analyzes it for affiliate opportunities and digital product ideas. You can also scan your entire blog from the dashboard to see all posts at once.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What counts as one analysis?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                One analysis = one blog post. Posts up to 5,000 words cost 1 credit. For longer posts, we charge 1 additional credit for each additional 5,000 words (or portion).
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Do credits expire?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                No! Credits never expire. Use them across multiple blogs, whenever you want.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Can I scan my entire blog?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes! You can scan your entire blog for free (no signup required). See all your posts with titles, URLs, and dates. Purchase credits to unlock word counts, affiliate links, and opportunity scores, then choose which ones to analyze.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Start monetizing your content today
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Get instant insights on monetization opportunities. No credit card required.
          </p>
          <Link
            href="/dashboard/analyze"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            Get Started - Free
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            New users get 1 free credit to try analysis
          </p>
        </div>
      </section>
    </div>
  )
}
