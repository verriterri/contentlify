'use client'

import type { AuditResult } from '@/lib/audit/types'

interface AuditScoreProps {
  audit: AuditResult
}

export function AuditScore({ audit }: AuditScoreProps) {
  const { score, tier1Passed, tier1Total, tier2Passed, tier2Total } = audit
  
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }
  
  const getScoreBorderColor = (score: number) => {
    if (score >= 80) return 'border-green-500'
    if (score >= 60) return 'border-yellow-500'
    return 'border-red-500'
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Score</h3>
      
      <div className="flex items-center gap-6">
        {/* Score Circle */}
        <div className={`relative w-32 h-32 rounded-full ${getScoreBgColor(score)} ${getScoreBorderColor(score)} border-4 flex items-center justify-center`}>
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <div className="text-sm text-gray-600">/ 100</div>
          </div>
        </div>
        
        {/* Breakdown */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Critical Checks (Tier 1)</span>
              <span className="text-sm font-semibold text-gray-900">
                {tier1Passed} / {tier1Total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all"
                style={{ width: `${(tier1Passed / tier1Total) * 100}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Warnings (Tier 2)</span>
              <span className="text-sm font-semibold text-gray-900">
                {tier2Passed} / {tier2Total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-600 h-2 rounded-full transition-all"
                style={{ width: `${(tier2Passed / tier2Total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Score Interpretation */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          {score >= 80 && 'Excellent! Your content is well-optimized for both SEO and AEO.'}
          {score >= 60 && score < 80 && 'Good start, but there are several areas for improvement.'}
          {score < 60 && 'Your content needs significant optimization to rank well in search and answer engines.'}
        </p>
      </div>
    </div>
  )
}



