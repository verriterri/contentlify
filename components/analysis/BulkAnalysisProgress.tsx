'use client'

import { useEffect, useState } from 'react'

interface BulkAnalysisProgressProps {
  jobId: string
  onComplete?: () => void
}

export function BulkAnalysisProgress({ jobId, onComplete }: BulkAnalysisProgressProps) {
  const [progress, setProgress] = useState({
    status: 'processing' as 'queued' | 'processing' | 'completed' | 'failed',
    completed: 0,
    total: 0,
    failed: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/analyze/bulk/${jobId}`)
        if (response.ok) {
          const data = await response.json()
          setProgress({
            status: data.status,
            completed: data.progress.completed,
            total: data.progress.total,
            failed: data.progress.failed,
          })
          setLoading(false)

          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(pollInterval)
            onComplete?.()
          }
        }
      } catch (error) {
        console.error('[Bulk Progress] Error polling:', error)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [jobId, onComplete])

  const percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Analysis Progress</h3>
          <span className="text-sm text-gray-600">
            {progress.completed} of {progress.total} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-primary h-4 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
          <span>{percentage}% complete</span>
        </div>
      </div>

      {progress.failed > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            {progress.failed} page{progress.failed !== 1 ? 's' : ''} failed to analyze
          </p>
        </div>
      )}

      {progress.status === 'completed' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Analysis complete! {progress.completed} page{progress.completed !== 1 ? 's' : ''} analyzed successfully.
          </p>
        </div>
      )}

      {progress.status === 'failed' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium">
            Analysis failed. Please try again or contact support.
          </p>
        </div>
      )}
    </div>
  )
}

