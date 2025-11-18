'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BulkAnalysisProgress } from '@/components/analysis/BulkAnalysisProgress'

export default function BulkAnalysisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const startBulkAnalysis = async () => {
      try {
        // Get parameters from URL
        const scanId = searchParams?.get('scanId')
        const postsParam = searchParams?.get('posts')
        const preferencesParam = searchParams?.get('preferences')

        if (!postsParam) {
          setError('No posts specified for analysis')
          setLoading(false)
          return
        }

        // Parse posts (comma-separated URLs)
        const postUrls = postsParam.split(',').filter(url => url.trim())

        if (postUrls.length === 0) {
          setError('No valid posts found')
          setLoading(false)
          return
        }

        // Parse preferences (JSON string)
        let preferences: Record<string, boolean> = {}
        if (preferencesParam) {
          try {
            preferences = JSON.parse(decodeURIComponent(preferencesParam))
          } catch (e) {
            console.warn('Failed to parse preferences, using defaults')
          }
        }

        // Call bulk analysis API
        const response = await fetch('/api/analyze/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scanId: scanId || null,
            postUrls,
            preferences,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to start bulk analysis')
          setLoading(false)
          return
        }

        // Store job ID and start polling
        setJobId(data.jobId)
        setLoading(false)
      } catch (err: any) {
        console.error('[Bulk Analysis] Error:', err)
        setError(err.message || 'An error occurred while starting the analysis')
        setLoading(false)
      }
    }

    startBulkAnalysis()
  }, [searchParams])

  const handleComplete = () => {
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push('/dashboard/analyze')
    }, 2000)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="animate-spin h-12 w-12 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Starting bulk analysis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-medium text-red-900">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!jobId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">No job ID available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk Analysis</h1>
        <p className="text-gray-600">Your posts are being analyzed. This may take a few minutes.</p>
      </div>
      <BulkAnalysisProgress jobId={jobId} onComplete={handleComplete} />
    </div>
  )
}

