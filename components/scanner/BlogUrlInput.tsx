'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function BlogUrlInput() {
  const [blogUrl, setBlogUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleScan = async () => {
    if (!blogUrl.trim()) {
      setError('Please enter a blog URL')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/blog/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blogUrl: blogUrl.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan blog')
      }

      // Redirect to scan results page
      if (data.scanId) {
        router.push(`/scan/${data.scanId}`)
      } else if (data.posts && data.posts.length > 0) {
        // If we have scan data but no scanId (database save failed), 
        // pass the data via query params as fallback
        const encodedData = encodeURIComponent(JSON.stringify({
          blogUrl: data.blogUrl,
          totalPosts: data.totalPosts,
          scannedPosts: data.scannedPosts,
          posts: data.posts,
          summary: data.summary,
          method: data.method,
          scannedAt: data.scannedAt,
        }))
        router.push(`/scan/temp?data=${encodedData}`)
      } else {
        // If no scanId and no data, show error
        throw new Error('Scan completed but no results returned')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to scan blog. Please try again.')
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleScan()
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={blogUrl}
          onChange={(e) => setBlogUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter your blog URL (e.g., yourblog.com)"
          className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-lg text-lg bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors"
          disabled={loading}
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore="true"
        />
        <button
          onClick={handleScan}
          disabled={loading || !blogUrl.trim()}
          className="px-8 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary-600 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Scanning...
            </span>
          ) : (
            'Scan Blog - 1 Credit'
          )}
        </button>
      </div>
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-500 mt-3">
        Costs 1 credit • Larger sites will take longer to process.
      </p>
    </div>
  )
}

