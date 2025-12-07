/**
 * Calculate credits needed for analyzing content
 * 
 * Pricing model:
 * - 1 credit for up to 5,000 words
 * - For pages over 5,000 words:
 *   - If chargeExtraForLongPages is false: 1 credit (analyze first 5K words only)
 *   - If chargeExtraForLongPages is true: 1 credit + 1 credit per additional 5,000 words (rounded up)
 */
export function calculateCreditsForAnalysis(
  wordCount: number,
  chargeExtraForLongPages: boolean = false
): number {
  // Always 1 credit for pages up to 5,000 words
  if (wordCount <= 5000) {
    return 1;
  }
  
  // For pages over 5,000 words
  if (!chargeExtraForLongPages) {
    // Analyze first 5K words only: 1 credit
    return 1;
  }
  
  // Analyze full page: 1 credit + 1 credit per additional 5,000 words
  const additionalWords = wordCount - 5000;
  const additionalCredits = Math.ceil(additionalWords / 5000);
  return 1 + additionalCredits;
}

/**
 * Get a human-readable description of the credit cost
 */
export function getCreditCostDescription(
  wordCount: number,
  chargeExtraForLongPages: boolean = false
): string {
  if (wordCount <= 5000) {
    return `1 credit per page`;
  }
  
  if (!chargeExtraForLongPages) {
    return `1 credit (first 5,000 words only)`;
  }
  
  const credits = calculateCreditsForAnalysis(wordCount, chargeExtraForLongPages);
  return `${credits} credit${credits > 1 ? 's' : ''} (full page)`;
}

/**
 * Get word count that will be analyzed
 * If chargeExtraForLongPages is false and wordCount > 5000, only first 5K words are analyzed
 */
export function getAnalyzedWordCount(
  wordCount: number,
  chargeExtraForLongPages: boolean = false
): number {
  // If not charging extra and page is over 5K words, only analyze first 5K
  if (!chargeExtraForLongPages && wordCount > 5000) {
    return 5000;
  }
  
  // Otherwise analyze full page
  return wordCount;
}

