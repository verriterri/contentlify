import { SimpleHeader } from '@/components/SimpleHeader'
import Link from 'next/link'

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleHeader />

      <div className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Support
            </h1>
            <p className="text-xl text-gray-600">
              We're here to help! Contact us for any questions or issues.
            </p>
          </div>

          {/* Common Issues */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Common Issues</h2>

            <div className="space-y-6">
              {/* Wrong Email */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  I entered the wrong email address
                </h3>
                <p className="text-gray-600 mb-3">
                  No problem! Email us with your Stripe payment receipt, and we'll manually send you a login link to the correct email address for free.
                </p>
              </div>

              {/* Didn't Receive Email */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  I didn't receive the magic login link
                </h3>
                <p className="text-gray-600 mb-3">
                  First, check your spam/junk folder. The email should arrive within a few minutes of purchase. If you still don't see it, contact us with your payment details.
                </p>
              </div>

              {/* Can't Access Account */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  I can't access my account
                </h3>
                <p className="text-gray-600 mb-3">
                  Make sure you're using the most recent magic link we sent you. Magic links expire after 24 hours. If you need a new link, contact us with your registered email address.
                </p>
              </div>

              {/* Report Issues */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Issues with my GSC report
                </h3>
                <p className="text-gray-600 mb-3">
                  If you're having trouble connecting your Google Search Console account or generating your report, please contact us with details about the error you're seeing.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-gray-600 mb-6">
              Email us at:
            </p>
            <a
              href="mailto:support@contentlify.com"
              className="inline-block text-xl font-semibold text-primary hover:text-primary-600 transition-colors"
            >
              support@contentlify.com
            </a>
            <p className="text-sm text-gray-500 mt-6">
              We typically respond within 24 hours
            </p>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-8">
            <Link
              href="/"
              className="text-primary hover:text-primary-600 font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
