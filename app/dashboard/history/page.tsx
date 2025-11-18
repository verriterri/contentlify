'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface AnalysisHistory {
  id: string
  url: string
  title?: string
  created_at: string
  status: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [history, setHistory] = useState<AnalysisHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please sign in to view your analysis history')
        setLoadingHistory(false)
        return
      }

      const { data: analyses, error: fetchError } = await supabase
        .from('content_analyses')
        .select('id, url, title, status, created_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) {
        throw fetchError
      }

      if (analyses) {
        // Deduplicate by ID to prevent duplicates
        const uniqueAnalyses = Array.from(
          new Map(analyses.map(item => [item.id, item])).values()
        )
        setHistory(uniqueAnalyses as AnalysisHistory[])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis history')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleLoadHistory = async (analysisId: string) => {
    router.push(`/dashboard/analyze?analysisId=${analysisId}`)
  }

  const handleDelete = async (analysisId: string) => {
    if (!confirm('Are you sure you want to delete this analysis? It will be hidden from your history but will still count toward your monthly limit.')) {
      return
    }

    // Soft delete - mark as deleted instead of actually deleting
    const { error } = await supabase
      .from('content_analyses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', analysisId)

    if (error) {
      setError('Failed to delete analysis')
    } else {
      // Reload history
      loadHistory()
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Analysis History
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loadingHistory ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading history...</p>
        </div>
      ) : history.length > 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="divide-y divide-gray-200">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <button
                      onClick={() => handleLoadHistory(item.id)}
                      className="text-left w-full"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate hover:text-primary transition-colors">
                        {item.title || item.url}
                      </p>
                      {item.title && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {item.url}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(item.created_at).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </p>
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(item.id)
                    }}
                    className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 mb-2">No analysis history yet.</p>
          <p className="text-sm text-gray-500">
            Start analyzing content to see your history here.
          </p>
        </div>
      )}
    </div>
  )
}

