'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { SimpleHeader } from '@/components/SimpleHeader'

export default function WelcomePage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [email, setEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // You could fetch session details here if needed
    // For now, we'll just show the welcome message
    setLoading(false)
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleHeader />

      <div className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Thank You for Your Purchase!
            </h1>
            <p className="text-xl text-gray-600">
              Your payment was successful
            </p>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">What Happens Next?</h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Check Your Email</h3>
                  <p className="text-gray-600">
                    We've created your account and sent a magic login link to your email address.
                    The link is valid for 24 hours.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Click the Login Link</h3>
                  <p className="text-gray-600">
                    Open the email and click the "Access My Account" button to log in instantly.
                    No password needed!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Connect Google Search Console</h3>
                  <p className="text-gray-600">
                    Once logged in, authorize access to your Google Search Console account.
                    This allows us to fetch your search data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Generate Your Report</h3>
                  <p className="text-gray-600">
                    Select your property and click "Fetch GSC Data" to generate your diagnostic report.
                    The report will be ready in seconds!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-primary-800 mb-1">Didn't receive the email?</h3>
                <p className="text-primary-700 text-sm mb-3">
                  Check your spam folder. The email should arrive within a few minutes.
                  If you still don't see it, contact our support team.
                </p>
                <Link
                  href="/support"
                  className="text-primary hover:text-primary-600 font-medium text-sm underline"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/login"
              className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors"
            >
              Already Have the Link? Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
