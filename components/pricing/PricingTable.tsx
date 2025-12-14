'use client'

import { useState } from 'react'
import { CREDIT_PACKAGES, CreditPackageKey } from '@/lib/pricing'

export function PricingTable() {
  const [loading, setLoading] = useState<string | null>(null)

  const handlePurchase = async (packageKey: CreditPackageKey) => {
    setLoading(packageKey)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageKey }),
        credentials: 'include', // Include cookies in request
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle 401 by redirecting to login
        if (response.status === 401) {
          window.location.href = `/login?redirect=/pricing`
          return
        }
        // Show error message for other errors
        alert(`Error: ${data.error || 'Failed to create checkout session'}`)
        setLoading(null)
        return
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Failed to create checkout session')
        setLoading(null)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Purchase Analyses
        </h2>
        <p className="text-lg text-gray-600 mb-2">
          1 analysis = 1 page (up to 5,000 words)
        </p>
        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-green-800 font-medium">
            First Purchase Bonus: Get 20% more credits on your first buy!
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(CREDIT_PACKAGES).map(([packageKey, pkg]) => {
          const isPopular = pkg.popular
          const isBestValue = (pkg as any).bestValue || false

          return (
            <div
              key={packageKey}
              className={`relative rounded-2xl border-2 p-6 ${
                isPopular
                  ? 'border-primary shadow-lg scale-105'
                  : isBestValue
                  ? 'border-purple-500 shadow-md'
                  : 'border-gray-200'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              {isBestValue && (
                <div className="absolute -top-4 right-4">
                  <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Best Value
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {pkg.name}
                </h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">
                    ${pkg.price}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  ${pkg.pricePerAnalysis.toFixed(2)} per analysis
                </p>
                <div className="mt-3 p-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-800 font-medium">
                    First purchase: Get {Math.floor(pkg.credits * 1.2)} analyses!
                  </p>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700 text-sm">
                    {pkg.credits} analyses
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700 text-sm">
                    One-time purchase
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700 text-sm">
                    Credits never expire
                  </span>
                </li>
              </ul>

              <button
                type="button"
                onClick={() => handlePurchase(packageKey as CreditPackageKey)}
                disabled={loading === packageKey}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  isPopular
                    ? 'bg-primary text-white hover:bg-primary-600'
                    : isBestValue
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === packageKey ? 'Processing...' : 'Purchase Credits'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
