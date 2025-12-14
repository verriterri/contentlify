'use client'

import Link from 'next/link'
import { calculateCreditsForAnalysis } from '@/lib/utils/credit-calculator'

interface Page {
  url: string
  wordCount: number
}

interface SelectionSummaryProps {
  selectedCount: number
  selectedPosts: Page[]
  chargeExtraPreferences: Map<string, boolean>
  globalChargeExtra: boolean
  userCredits: number | null
  onAnalyze: () => void
}

export function SelectionSummary({
  selectedCount,
  selectedPosts,
  chargeExtraPreferences,
  globalChargeExtra,
  userCredits,
  onAnalyze,
}: SelectionSummaryProps) {
  if (selectedCount === 0) {
    return null
  }

  // Calculate credits needed using per-page preferences
  const creditsNeeded = selectedPosts.reduce((sum, page) => {
    const chargeExtra = chargeExtraPreferences.has(page.url)
      ? chargeExtraPreferences.get(page.url)!
      : globalChargeExtra
    return sum + calculateCreditsForAnalysis(page.wordCount, chargeExtra)
  }, 0)

  const isAnonymous = userCredits === null
  const insufficientCredits = userCredits !== null && userCredits < creditsNeeded
  const creditsShort = insufficientCredits ? creditsNeeded - userCredits! : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-gray-600">Pages Selected</p>
              <p className="text-2xl font-bold text-gray-900">{selectedCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Credits Needed</p>
              <p className="text-2xl font-bold text-gray-900">{creditsNeeded}</p>
            </div>
            {userCredits !== null && (
              <div>
                <p className="text-sm text-gray-600">Your Credits</p>
                <p className="text-2xl font-bold text-primary">{userCredits}</p>
              </div>
            )}
            {insufficientCredits && (
              <div>
                <p className="text-sm text-red-600">Need</p>
                <p className="text-2xl font-bold text-red-600">{creditsShort} more</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isAnonymous ? (
              <Link
                href="/login?redirect=/pricing"
                className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
              >
                Sign Up to Analyze {selectedCount > 1 ? `${selectedCount} Pages` : ''}
              </Link>
            ) : insufficientCredits ? (
              <Link
                href={`/pricing?needed=${creditsNeeded}&have=${userCredits}`}
                className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
              >
                Buy Credits
              </Link>
            ) : (
              <button
                onClick={onAnalyze}
                className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
              >
                Analyze Selected Pages
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

