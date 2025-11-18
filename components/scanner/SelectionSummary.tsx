'use client'

import Link from 'next/link'
import { calculateCreditsForAnalysis } from '@/lib/utils/credit-calculator'

interface Post {
  url: string
  wordCount: number
}

interface SelectionSummaryProps {
  selectedCount: number
  selectedPosts: Post[]
  chargeExtraPreferences: Map<string, boolean>
  globalChargeExtra: boolean
  userCredits: number | null
  freeTrialUsed: boolean
  onAnalyze: () => void
}

export function SelectionSummary({
  selectedCount,
  selectedPosts,
  chargeExtraPreferences,
  globalChargeExtra,
  userCredits,
  freeTrialUsed,
  onAnalyze,
}: SelectionSummaryProps) {
  if (selectedCount === 0) {
    return null
  }

  // Calculate credits needed using per-post preferences
  const creditsNeeded = selectedPosts.reduce((sum, post) => {
    const chargeExtra = chargeExtraPreferences.has(post.url)
      ? chargeExtraPreferences.get(post.url)!
      : globalChargeExtra
    return sum + calculateCreditsForAnalysis(post.wordCount, chargeExtra)
  }, 0)

  const isAnonymous = userCredits === null
  const isSinglePost = selectedCount === 1
  // Free trial available for: anonymous users OR logged-in users with 0 credits, AND free trial not used yet
  // For anonymous users: allow free trial if selecting 1 post and haven't used it yet
  // For logged-in users with 0 credits: allow free trial if selecting 1 post and haven't used it yet
  const canAnalyzeFree = isSinglePost && creditsNeeded === 1 && !freeTrialUsed && (isAnonymous || userCredits === 0)
  const insufficientCredits = userCredits !== null && userCredits > 0 && userCredits < creditsNeeded
  const creditsShort = insufficientCredits ? creditsNeeded - userCredits! : 0
  
  // Debug logging (remove in production)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[SelectionSummary] Debug:', {
      isAnonymous,
      isSinglePost,
      creditsNeeded,
      freeTrialUsed,
      userCredits,
      canAnalyzeFree,
      insufficientCredits,
    })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-gray-600">Posts Selected</p>
              <p className="text-2xl font-bold text-gray-900">{selectedCount}</p>
            </div>
            {!canAnalyzeFree && (
              <div>
                <p className="text-sm text-gray-600">Credits Needed</p>
                <p className="text-2xl font-bold text-gray-900">{creditsNeeded}</p>
              </div>
            )}
            {canAnalyzeFree && (
              <div>
                <p className="text-sm text-green-600">Free Analysis</p>
                <p className="text-2xl font-bold text-green-600">1 Post</p>
              </div>
            )}
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
            {canAnalyzeFree ? (
              <button
                onClick={onAnalyze}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Analyze Free (No Signup)
              </button>
            ) : isAnonymous ? (
              <div className="flex flex-col items-end gap-2">
                {freeTrialUsed && isSinglePost && (
                  <p className="text-sm text-gray-600">
                    Free trial already used. Sign up to continue analyzing.
                  </p>
                )}
                {!isSinglePost && (
                  <p className="text-sm text-gray-600">
                    Free trial is for 1 post only. Select 1 post or sign up to analyze multiple.
                  </p>
                )}
                <Link
                  href="/login?redirect=/pricing"
                  className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
                >
                  Sign Up to Analyze {selectedCount > 1 ? `${selectedCount} Posts` : ''}
                </Link>
              </div>
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
                Analyze Selected Posts
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

