'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SingleUrlInput() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Validate URL format
      let normalizedUrl = url.trim()
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`
      }

      try {
        new URL(normalizedUrl)
      } catch {
        throw new Error('Invalid URL format')
      }

      // Redirect to analyze page with the URL
      // User will need to be logged in to actually analyze
      router.push(`/dashboard/analyze?url=${encodeURIComponent(normalizedUrl)}`)
    } catch (err: any) {
      setError(err.message || 'Invalid URL. Please try again.')
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleAnalyze()
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter a page URL (e.g., yoursite.com/page-title)"
          className="w-full px-6 py-4 border-2 border-gray-300 rounded-lg text-lg bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors"
          disabled={loading}
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore="true"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !url.trim()}
          className="w-full px-8 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary-600 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </span>
          ) : (
            'Analyze Page'
          )}
        </button>
      </div>
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-500 mt-3">
        Analyze a single page for affiliate opportunities and product ideas
      </p>

      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium mb-2">Example URLs:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-500">
          <li>https://yoursite.com/my-page</li>
          <li>yoursite.com/article-title</li>
          <li>www.yoursite.com/2025/page-name</li>
        </ul>
      </div>
    </div>
  )
}

