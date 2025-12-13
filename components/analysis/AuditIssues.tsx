'use client'

import type { AuditCheck } from '@/lib/audit/types'

interface AuditIssuesProps {
  criticalIssues: AuditCheck[]
  warnings: AuditCheck[]
}

export function AuditIssues({ criticalIssues, warnings }: AuditIssuesProps) {
  return (
    <div className="space-y-6">
      {/* Critical Issues */}
      {criticalIssues.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Critical Issues ({criticalIssues.length})
          </h3>
          <div className="space-y-4">
            {criticalIssues.map((issue) => (
              <div
                key={issue.id}
                className="bg-red-50 border border-red-200 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">!</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900 mb-1">{issue.name}</h4>
                    {issue.issue && (
                      <p className="text-sm text-red-800 mb-2">{issue.issue}</p>
                    )}
                    {issue.recommendation && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-red-900 mb-1">Fix:</p>
                        <p className="text-sm text-red-700">{issue.recommendation}</p>
                      </div>
                    )}
                    {issue.example && (
                      <div className="mt-2 p-2 bg-white rounded border border-red-200">
                        <p className="text-xs font-medium text-gray-700 mb-1">Example:</p>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">{issue.example}</pre>
                      </div>
                    )}
                    {issue.impact && (
                      <div className="mt-2 pt-2 border-t border-red-200">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Impact:</span>{' '}
                          {issue.impact.seo && `SEO: ${issue.impact.seo}`}
                          {issue.impact.seo && issue.impact.aeo && ' • '}
                          {issue.impact.aeo && `AEO: ${issue.impact.aeo}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Warnings ({warnings.length})
          </h3>
          <div className="space-y-4">
            {warnings.map((warning) => (
              <div
                key={warning.id}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">!</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 mb-1">{warning.name}</h4>
                    {warning.issue && (
                      <p className="text-sm text-yellow-800 mb-2">{warning.issue}</p>
                    )}
                    {warning.recommendation && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-yellow-900 mb-1">Fix:</p>
                        <p className="text-sm text-yellow-700">{warning.recommendation}</p>
                      </div>
                    )}
                    {warning.example && (
                      <div className="mt-2 p-2 bg-white rounded border border-yellow-200">
                        <p className="text-xs font-medium text-gray-700 mb-1">Example:</p>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">{warning.example}</pre>
                      </div>
                    )}
                    {warning.impact && (
                      <div className="mt-2 pt-2 border-t border-yellow-200">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Impact:</span>{' '}
                          {warning.impact.seo && `SEO: ${warning.impact.seo}`}
                          {warning.impact.seo && warning.impact.aeo && ' • '}
                          {warning.impact.aeo && `AEO: ${warning.impact.aeo}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* No Issues */}
      {criticalIssues.length === 0 && warnings.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-green-900 mb-1">No Issues Found!</h3>
          <p className="text-sm text-green-700">Your content passes all critical checks and warnings.</p>
        </div>
      )}
    </div>
  )
}




