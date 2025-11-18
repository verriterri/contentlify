'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface AnalysisJob {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  total_posts: number
  completed_posts: number
  failed_posts: number
  created_at: string
  completed_at: string | null
}

export function AnalysisQueue() {
  const [jobs, setJobs] = useState<AnalysisJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJobs()
    const interval = setInterval(loadJobs, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const loadJobs = async () => {
    try {
      // In a real implementation, you'd have an endpoint to get user's jobs
      // For now, this is a placeholder
      setLoading(false)
    } catch (error) {
      console.error('[Analysis Queue] Error loading jobs:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Loading analysis queue...</p>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Queue</h3>
        <p className="text-gray-600">No analyses in progress.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Analysis Queue</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {jobs.map((job) => (
          <div key={job.id} className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-gray-900">
                  {job.total_posts} post{job.total_posts !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-500">
                  Started {new Date(job.created_at).toLocaleString()}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  job.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : job.status === 'processing'
                    ? 'bg-blue-100 text-blue-800'
                    : job.status === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {job.status}
              </span>
            </div>
            {job.status === 'processing' && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>
                    {job.completed_posts} of {job.total_posts} completed
                  </span>
                  <span>
                    {Math.round((job.completed_posts / job.total_posts) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${(job.completed_posts / job.total_posts) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {job.status === 'completed' && (
              <div className="mt-3">
                <Link
                  href={`/dashboard/analyze?jobId=${job.id}`}
                  className="text-sm text-primary hover:text-primary-600"
                >
                  View Results →
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

