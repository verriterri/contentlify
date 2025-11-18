'use client'

import Link from 'next/link'

interface CreditBalanceProps {
  credits: number
}

export function CreditBalance({ credits }: CreditBalanceProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            <span className="font-bold text-primary">{credits}</span> credits
          </span>
        </div>
      </div>
      {credits === 0 && (
        <Link
          href="/pricing"
          className="text-sm font-medium text-primary hover:text-primary-600"
        >
          Buy Credits
        </Link>
      )}
    </div>
  )
}

