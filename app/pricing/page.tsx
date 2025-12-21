import { DirectCheckoutButton } from '@/components/checkout/DirectCheckoutButton'
import { HomeHeader } from '@/components/HomeHeader'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomeHeader />

      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Get Your GSC Diagnostic Report
            </h1>
            <p className="text-xl text-gray-600">
              One-time payment. Instant access. Actionable insights.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl border-2 border-blue-600 shadow-xl p-10 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">GSC Diagnostic Report</h2>
              <div className="mb-6">
                <span className="text-6xl font-bold text-gray-900">$9.99</span>
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

              <p className="text-sm text-gray-500 mt-4">
                No subscription. No recurring charges.
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              <div>
                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full text-lg font-bold mb-2">
                  1
                </div>
                <p className="text-sm text-gray-600">Purchase Report</p>
              </div>
              <div>
                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full text-lg font-bold mb-2">
                  2
                </div>
                <p className="text-sm text-gray-600">Check Your Email</p>
              </div>
              <div>
                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full text-lg font-bold mb-2">
                  3
                </div>
                <p className="text-sm text-gray-600">Connect Google</p>
              </div>
              <div>
                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full text-lg font-bold mb-2">
                  4
                </div>
                <p className="text-sm text-gray-600">View Report</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
