/**
 * Calculate credits needed for analyzing content
 * 
 * New pricing model (simplified):
 * - Always 1 credit per post, regardless of word count
 */
export function calculateCreditsForAnalysis(
  wordCount: number,
  chargeExtraForLongPosts: boolean = false // Deprecated, kept for backwards compatibility
): number {
  // Always 1 credit per post
  return 1;
}

/**
 * Get a human-readable description of the credit cost
 */
export function getCreditCostDescription(
  wordCount: number,
  chargeExtraForLongPosts: boolean = false // Deprecated, kept for backwards compatibility
): string {
  return `1 credit per post`;
}

/**
 * Get word count that will be analyzed
 * Always analyzes full post regardless of length
 */
export function getAnalyzedWordCount(
  wordCount: number,
  chargeExtraForLongPosts: boolean = false // Deprecated, kept for backwards compatibility
): number {
  return wordCount; // Always analyze full post
}

