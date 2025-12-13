'use client'

import type { AuditResult } from '@/lib/audit/types'
import { AuditScore } from './AuditScore'
import { AuditIssues } from './AuditIssues'
import { AuditRecommendations } from './AuditRecommendations'

interface ContentAuditReportProps {
  audit: AuditResult
  crossInsights?: string[]
}

export function ContentAuditReport({ audit, crossInsights = [] }: ContentAuditReportProps) {
  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <AuditScore audit={audit} />
      
      {/* Critical Issues and Warnings */}
      <div className="bg-white rounded-lg shadow p-6">
        <AuditIssues
          criticalIssues={audit.criticalIssues}
          warnings={audit.warnings}
        />
      </div>
      
      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow p-6">
        <AuditRecommendations
          audit={audit}
          crossInsights={crossInsights}
        />
      </div>
    </div>
  )
}



