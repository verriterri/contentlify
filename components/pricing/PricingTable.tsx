'use client'

import { useState } from 'react'
import { PRICING_PLANS, PricingTier } from '@/lib/pricing'

export function PricingTable() {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (tier: PricingTier) => {
    setLoading(tier)
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          billingInterval,
        }),
        credentials: 'include', // Include cookies in request
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle 401 by redirecting to login
        if (response.status === 401) {
          window.location.href = `/login?redirect=/pricing&tier=${tier}`
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
      {/* Billing Toggle */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setBillingInterval('month')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'month'
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval('year')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'year'
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Annual
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
              Get 2 months free
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.entries(PRICING_PLANS).map(([tierKey, plan]) => {
          // For annual billing, show monthly equivalent for all plans
          const isAnnual = billingInterval === 'year'
          const monthlyEquivalent = isAnnual ? (plan.annualPrice / 12) : plan.monthlyPrice
          const displayPeriod = 'month'
          const isPopular = tierKey === 'pro'
          
          // For annual prices with cents, split for superscript display
          const priceParts = monthlyEquivalent.toFixed(2).split('.')
          const dollars = priceParts[0]
          const cents = priceParts[1]

          return (
            <div
              key={tierKey}
              className={`relative rounded-2xl border-2 p-8 ${
                isPopular
                  ? 'border-primary shadow-lg scale-105'
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

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">
                    ${dollars}
                    {isAnnual && cents !== '00' && <sup className="text-xl font-normal">.{cents}</sup>}
                  </span>
                  <span className="text-gray-600 ml-2">/{displayPeriod}</span>
                </div>
                {billingInterval === 'year' && (
                  <p className="text-sm text-gray-500 mt-2">
                    <span className="line-through">${plan.monthlyPrice}/month</span>{' '}
                    <span className="text-green-600 font-medium">Billed annually (${plan.annualPrice}/year)</span>
                  </p>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
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
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleSubscribe(tierKey as PricingTier)}
                disabled={loading === tierKey}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  isPopular
                    ? 'bg-primary text-white hover:bg-primary-600'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === tierKey ? 'Processing...' : 'Get Started'}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-center text-sm text-gray-500 mt-8">
        30-day money back guarantee. Cancel anytime.
      </p>
    </div>
  )
}

