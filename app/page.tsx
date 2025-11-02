import Link from 'next/link'
import { PricingTable } from '@/components/pricing/PricingTable'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary-50 to-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Stop Leaving Money on the Table
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Find affiliate opportunities, create digital products, and promote them—all from your existing content
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary-600 transition-colors shadow-lg hover:shadow-xl"
                >
                  Analyze My Content Free
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary border-2 border-primary rounded-lg font-semibold text-lg hover:bg-primary-50 transition-colors"
                >
                  View Pricing
                </Link>
              </div>
            </div>
            <div className="relative">
              {/* Placeholder for demo/screenshot */}
              <div className="bg-gray-200 rounded-lg shadow-2xl p-8 aspect-video flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium">Demo Preview</p>
                  <p className="text-sm">Screenshot of ContentMaxer in action</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">The Problem</h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-4">
                Most bloggers and content creators struggle to monetize beyond display ads. You put hours into creating valuable content, but you're missing out on:
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-red-500 mr-3">✗</span>
                  <span>Affiliate opportunities hidden in your content</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-3">✗</span>
                  <span>Digital products you could easily create</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-3">✗</span>
                  <span>Promotional content to drive sales</span>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">The Solution</h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-4">
                ContentMaxer analyzes your content and shows you exactly what to create and how to sell it:
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-3">✓</span>
                  <span>Automatically detect affiliate opportunities</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3">✓</span>
                  <span>Generate digital products in minutes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3">✓</span>
                  <span>Create social posts and newsletters with affiliate links</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need to Monetize</h2>
            <p className="text-xl text-gray-600">All features include affiliate links automatically</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-5.657-5.657l1.102-1.101m0 0L11 16l-1.102-1.101m5.657-5.657L19 8l-1.102-1.101m-5.657 5.657L11 16m0 0l-1.102 1.101" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Affiliate Opportunity Detection</h3>
              <p className="text-gray-600">
                Our AI scans your content to find products and services you can promote with affiliate links
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Digital Product Generation</h3>
              <p className="text-gray-600">
                Create checklists, workbooks, ebooks, and newsletters based on your existing blog posts
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Social Post Creation</h3>
              <p className="text-gray-600">
                Generate platform-optimized social posts for Facebook, X, Instagram, and Pinterest to maximize your reach
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="mb-4">
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Newsletter Templates</h3>
              <p className="text-gray-600">
                Create engaging newsletter editions with affiliate recommendations built right in
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get started in minutes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full text-2xl font-bold mb-6">
                1
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Paste Your Blog URL</h3>
              <p className="text-gray-600">
                Simply paste the URL of any blog post you want to monetize. We'll analyze it automatically.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full text-2xl font-bold mb-6">
                2
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">See Monetization Opportunities</h3>
              <p className="text-gray-600">
                Get a detailed report showing affiliate opportunities and product ideas tailored to your content.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full text-2xl font-bold mb-6">
                3
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Generate Products & Promotion</h3>
              <p className="text-gray-600">
                Create digital products, social posts, and newsletters in minutes—all with affiliate links included.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Start free, upgrade when you're ready</p>
          </div>
          <PricingTable />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                How does affiliate detection work?
              </h3>
              <p className="text-gray-600">
                Our AI analyzes your content to identify products, services, and brands mentioned. We then suggest relevant affiliate programs and provide guidance on where to find them. While we can't guarantee exact commission rates, we help you discover monetization opportunities you might have missed.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What products can I create?
              </h3>
              <p className="text-gray-600">
                You can generate checklists, workbooks, ebooks, templates, and newsletter editions. Each product is tailored to your content and includes affiliate links where relevant. All products are downloadable as PDFs or other formats.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Do I need design skills?
              </h3>
              <p className="text-gray-600">
                Not at all! ContentMaxer generates professional-looking products using our templates. You can choose from multiple design styles, and everything is ready to use right away. Customization features like colors and branding are available in Pro and above plans.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Can I edit the generated content?
              </h3>
              <p className="text-gray-600">
                Yes! All generated content can be edited before you export it. You can modify text, remove sections, add your own content, and customize everything to match your needs. The affiliate links are preserved throughout editing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Start Monetizing Your Content Today
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Get started with a free analysis. No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl"
          >
            Analyze My Content Free
          </Link>
          <p className="text-sm text-primary-100 mt-4">
            Free tier includes 1 analysis • Upgrade anytime for unlimited access
          </p>
        </div>
      </section>
    </div>
  )
}
