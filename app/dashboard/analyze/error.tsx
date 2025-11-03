'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AnalyzeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Analyze page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error analyzing content</h2>
        <p className="text-gray-600 mb-4">
          {error.message || 'An error occurred while loading the analysis page.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 text-center"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

