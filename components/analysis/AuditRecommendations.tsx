'use client'

import type { AuditResult } from '@/lib/audit/types'

interface AuditRecommendationsProps {
  audit: AuditResult
  crossInsights?: string[]
}

export function AuditRecommendations({ audit, crossInsights = [] }: AuditRecommendationsProps) {
  const { recommendations } = audit
  
  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }
  
  const getPriorityLabel = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'High Priority'
      case 'medium':
        return 'Medium Priority'
      case 'low':
        return 'Low Priority'
      default:
        return 'Priority'
    }
  }
  
  const getCategoryBadge = (category: 'seo' | 'aeo' | 'both') => {
    const colors = {
      seo: 'bg-blue-100 text-blue-800',
      aeo: 'bg-purple-100 text-purple-800',
      both: 'bg-indigo-100 text-indigo-800',
    }
    return colors[category] || colors.both
  }
  
  return (
    <div className="space-y-6">
      {/* Cross-Insights */}
      {crossInsights.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Connected Insights
          </h3>
          <ul className="space-y-2">
            {crossInsights.map((insight, idx) => (
              <li key={idx} className="text-sm text-indigo-800 flex items-start gap-2">
                <span className="text-indigo-600 mt-0.5">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Recommendations */}
      {recommendations.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actionable Recommendations ({recommendations.length})
          </h3>
          <div className="space-y-4">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(rec.priority)}`}>
                      {getPriorityLabel(rec.priority)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryBadge(rec.category)}`}>
                      {rec.category.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <h4 className="font-semibold text-gray-900 mb-2">{rec.issue}</h4>
                <p className="text-sm text-gray-700 mb-2">{rec.fix}</p>
                
                {rec.example && (
                  <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-1">Example:</p>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">{rec.example}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-green-900 mb-1">All Recommendations Addressed!</h3>
          <p className="text-sm text-green-700">Your content is well-optimized. Keep up the great work!</p>
        </div>
      )}
    </div>
  )
}



