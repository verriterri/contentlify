'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface SiteUrlInputProps {
  maxPages?: number
  showLimitNote?: boolean
}

export function SiteUrlInput({ maxPages, showLimitNote = false }: SiteUrlInputProps) {
  const [siteUrl, setSiteUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const router = useRouter()

  const handleScan = async () => {
    if (!siteUrl.trim()) {
      setError('Please enter a site URL')
      return
    }

    setLoading(true)
    setError(null)
    setProgress({ current: 0, total: 0, message: 'Starting scan...' })
    
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const requestBody: { siteUrl: string; maxPages?: number } = { siteUrl: siteUrl.trim() }
      if (maxPages !== undefined) {
        requestBody.maxPages = maxPages
      }

      const response = await fetch('/api/site/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to scan site')
      }

      // Read streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const data = JSON.parse(line)
              if (data.type === 'progress') {
                setProgress({
                  current: data.current,
                  total: data.total,
                  message: data.message
                })
              } else if (data.type === 'complete') {
                // Dispatch event to update credits in header
                window.dispatchEvent(new CustomEvent('credits-updated'))

                // Redirect to analyze page with scanId
                if (data.data.scanId) {
                  router.push(`/dashboard/analyze?scanId=${data.data.scanId}`)
                } else if (data.data.pages && data.data.pages.length > 0) {
                  const encodedData = encodeURIComponent(JSON.stringify({
                    siteUrl: data.data.siteUrl,
                    totalPages: data.data.totalPages,
                    scannedPages: data.data.scannedPages,
                    pages: data.data.pages,
                    summary: data.data.summary,
                    method: data.data.method,
                    scannedAt: data.data.scannedAt,
                  }))
                  router.push(`/dashboard/analyze?scanId=temp&data=${encodedData}`)
                } else {
                  throw new Error('Scan completed but no results returned')
                }
              } else if (data.type === 'cancelled') {
                setError('Scan cancelled')
                setLoading(false)
                return
              }
            } catch (e) {
              console.error('Error parsing progress:', e)
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Scan cancelled')
      } else {
        setError(err.message || 'Failed to scan site. Please try again.')
      }
      setLoading(false)
    } finally {
      abortControllerRef.current = null
    }
  }

  const handleStop = () => {
    setShowStopConfirm(true)
  }

  const confirmStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setShowStopConfirm(false)
    setLoading(false)
    setProgress({ current: 0, total: 0, message: '' })
  }

  const cancelStop = () => {
    setShowStopConfirm(false)
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
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter your site URL (e.g., yoursite.com)"
          className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-lg text-lg bg-white text-gray-900 focus:outline-none focus:border-primary transition-colors"
          disabled={loading}
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore="true"
        />
        <div className="flex gap-3">
          {loading && (
            <button
              onClick={handleStop}
              className="px-6 py-4 bg-red-600 text-white rounded-lg font-semibold text-lg hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              Stop
            </button>
          )}
          <button
            onClick={handleScan}
            disabled={loading || !siteUrl.trim()}
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
              'Scan Site'
            )}
          </button>
        </div>
      </div>
      
      {showLimitNote && (
        <p className="mt-2 text-sm text-gray-500">
          Note: Only the first 50 pages found will be returned. Sign up for an account to get all pages, and also get 3 free credits for a day.
        </p>
      )}
      
      {loading && progress.total > 0 && (
        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              {progress.message || `Processing page ${progress.current} of ${progress.total}...`}
            </span>
            <span className="text-sm text-blue-700">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {showStopConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Stop Scan?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to stop the scan? Progress will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelStop}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmStop}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Stop Scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

