/**
 * Split content into chunks for processing
 * Ensures chunks are within token limits while preserving sentence boundaries
 */

export interface Chunk {
  text: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Split content into chunks of approximately maxChunkSize characters
 * Tries to break at sentence boundaries to preserve context
 */
export function chunkContent(
  content: string,
  maxChunkSize: number = 8000
): Chunk[] {
  if (content.length <= maxChunkSize) {
    return [
      {
        text: content,
        startIndex: 0,
        endIndex: content.length,
      },
    ];
  }

  const chunks: Chunk[] = [];
  let currentIndex = 0;

  while (currentIndex < content.length) {
    const remaining = content.length - currentIndex;
    const targetSize = Math.min(maxChunkSize, remaining);

    // Try to find a good break point (sentence end or paragraph)
    let chunkEnd = currentIndex + targetSize;

    if (chunkEnd < content.length) {
      // Look for sentence endings within the last 20% of the chunk
      const searchStart = currentIndex + Math.floor(targetSize * 0.8);
      const searchEnd = chunkEnd;

      // Try to find sentence boundary
      const sentenceEnd = content.lastIndexOf('. ', searchEnd);
      const paragraphEnd = content.lastIndexOf('\n\n', searchEnd);

      // Use the best break point found
      if (paragraphEnd >= searchStart) {
        chunkEnd = paragraphEnd + 2; // Include the double newline
      } else if (sentenceEnd >= searchStart) {
        chunkEnd = sentenceEnd + 2; // Include the period and space
      }
      // Otherwise use the original chunkEnd
    } else {
      chunkEnd = content.length;
    }

    chunks.push({
      text: content.substring(currentIndex, chunkEnd),
      startIndex: currentIndex,
      endIndex: chunkEnd,
    });

    currentIndex = chunkEnd;
  }

  return chunks;
}

/**
 * Extract core product terms from a name (removes articles, common modifiers)
 * This is more generic than domain-specific prefixes
 */
function extractCoreTerms(name: string): string[] {
  const lower = name.toLowerCase().trim();
  
  // Remove articles and very common words
  const commonWords = new Set([
    'the', 'a', 'an', 'this', 'that', 'these', 'those',
    'basic', 'beginner', 'starter', 'professional', 'premium', 'advanced',
    'essential', 'complete', 'full', 'all-in-one', 'all in one',
    'take-home', 'take home', 'home',
    'kit', 'set', 'pack', 'bundle', 'package', 'collection',
  ]);
  
  // Split into words and filter
  const words = lower
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length > 2 && !commonWords.has(w))
    .sort();
  
  return words;
}

/**
 * Calculate similarity score between two product names (0-1)
 * Higher score = more similar
 */
function calculateSimilarity(name1: string, name2: string): number {
  const lower1 = name1.toLowerCase().trim();
  const lower2 = name2.toLowerCase().trim();
  
  // Exact match
  if (lower1 === lower2) {
    return 1.0;
  }
  
  // One is contained in the other (e.g., "Glazes" in "Basic Glazes")
  if (lower1.includes(lower2) || lower2.includes(lower1)) {
    const shorter = Math.min(lower1.length, lower2.length);
    const longer = Math.max(lower1.length, lower2.length);
    // If shorter is at least 60% of longer, consider it similar
    if (shorter / longer >= 0.6) {
      return 0.8;
    }
  }
  
  // Extract core terms and compare
  const terms1 = extractCoreTerms(name1);
  const terms2 = extractCoreTerms(name2);
  
  if (terms1.length === 0 || terms2.length === 0) {
    return 0;
  }
  
  // Count matching core terms
  const set1 = new Set(terms1);
  const set2 = new Set(terms2);
  
  let matches = 0;
  for (const term of set1) {
    if (set2.has(term)) {
      matches++;
    }
  }
  
  // Calculate Jaccard similarity (intersection over union)
  const union = new Set([...terms1, ...terms2]);
  const similarity = matches / union.size;
  
  // If they share most core terms, they're likely the same product
  // Threshold: at least 70% similarity AND at least 2 matching terms
  return similarity >= 0.7 && matches >= 2 ? similarity : 0;
}

/**
 * Check if two product names are essentially the same product
 * Uses intelligent similarity matching instead of static rules
 */
function areSimilarProducts(name1: string, name2: string): boolean {
  const similarity = calculateSimilarity(name1, name2);
  // Threshold: 70% similarity means they're likely the same product
  return similarity >= 0.7;
}

/**
 * Extract numeric price from suggestedPrice string (e.g., "$29-$49" -> 49, "$99+" -> 99)
 * Returns the highest price if range, or the price if single value
 */
function extractPrice(priceString: string): number {
  const price = priceString.trim();
  if (!price) return 0;
  
  // Remove $ and + signs, extract numbers
  const numbers = price.match(/\$?(\d+)/g);
  if (!numbers || numbers.length === 0) return 0;
  
  // Extract numeric values
  const values = numbers.map(n => parseInt(n.replace(/\$/g, ''), 10));
  // Return highest value (for ranges like "$29-$49")
  return Math.max(...values);
}

/**
 * Score value proposition strength based on length and sellability keywords
 * Higher score = stronger value proposition
 */
function scoreValueProposition(valueProp: string): number {
  if (!valueProp) return 0;
  
  const lower = valueProp.toLowerCase();
  let score = 0;
  
  // Length bonus (longer = more thought out)
  score += Math.min(valueProp.length / 50, 2); // Max 2 points
  
  // Sellability keywords
  const keywords = [
    'solve', 'achieve', 'transform', 'increase', 'improve', 'save time',
    'save money', 'boost', 'maximize', 'minimize', 'eliminate', 'streamline',
    'automate', 'master', 'complete', 'professional', 'comprehensive'
  ];
  
  for (const keyword of keywords) {
    if (lower.includes(keyword)) {
      score += 0.5;
    }
  }
  
  return score;
}

/**
 * Score product type by typical sellability
 * Higher-priced product types get higher scores
 */
function scoreProductType(type: string): number {
  const typeLower = type.toLowerCase();
  
  // Typical price ranges by type (for ranking)
  // ebook, template: higher value ($49-$99+)
  // workbook: medium-high ($29-$49)
  // checklist: medium ($9-$29)
  // newsletter: variable (can be subscription-based)
  
  if (typeLower.includes('ebook') || typeLower.includes('template')) {
    return 3;
  } else if (typeLower.includes('workbook')) {
    return 2;
  } else if (typeLower.includes('newsletter')) {
    return 1.5; // Subscription can be lucrative
  } else if (typeLower.includes('checklist')) {
    return 1;
  }
  
  return 1; // Default
}

/**
 * Calculate sellability score for a product idea
 * Higher score = more sellable/lucrative
 */
export function calculateProductIdeaScore(idea: {
  suggestedPrice?: string;
  valueProposition?: string;
  type?: string;
  description?: string;
}): number {
  let score = 0;
  
  // Price is the strongest indicator (50% weight)
  const price = extractPrice(idea.suggestedPrice || '');
  score += (price / 100) * 5; // Normalize: $100 = 5 points
  
  // Value proposition strength (30% weight)
  const valuePropScore = scoreValueProposition(idea.valueProposition || '');
  score += valuePropScore * 1.5;
  
  // Product type (15% weight)
  const typeScore = scoreProductType(idea.type || '');
  score += typeScore;
  
  // Description completeness (5% weight) - longer descriptions show more thought
  if (idea.description) {
    score += Math.min(idea.description.length / 100, 0.5);
  }
  
  return score;
}

/**
 * Sort product ideas by sellability (most sellable first)
 */
export function sortProductIdeasBySellability<T extends { suggestedPrice?: string; valueProposition?: string; type?: string; description?: string }>(
  ideas: T[]
): T[] {
  return [...ideas].sort((a, b) => {
    const scoreA = calculateProductIdeaScore(a);
    const scoreB = calculateProductIdeaScore(b);
    return scoreB - scoreA; // Descending order (highest sellability first)
  });
}

/**
 * Combine multiple analysis results into a single unified result
 * Deduplicates by product name with intelligent grouping
 */
export function combineAnalysisResults<T extends { confidence?: number; relevance?: number }>(
  results: T[][]
): T[] {
  const combined: T[] = [];

  for (const resultSet of results) {
    if (!Array.isArray(resultSet)) continue;
    
    for (const item of resultSet) {
      const productName = ((item as any).product || (item as any).name || '').trim();
      if (!productName) continue;
      
      // Check if we already have a similar product
      let foundSimilar = false;
      for (let i = 0; i < combined.length; i++) {
        const existing = combined[i];
        const existingName = ((existing as any).product || (existing as any).name || '').trim();
        
        if (areSimilarProducts(productName, existingName)) {
          // Similar product found - keep the one with better score or longer name
          const existingScore =
            (existing.confidence || 0) * 0.7 + (existing.relevance || 0) * 0.3;
          const newScore = (item.confidence || 0) * 0.7 + (item.relevance || 0) * 0.3;
          
          // Prefer the one with higher score, or longer name (more specific)
          if (newScore > existingScore || (newScore === existingScore && productName.length > existingName.length)) {
            combined[i] = item;
          }
          foundSimilar = true;
          break;
        }
      }
      
      // If no similar product found, add it
      if (!foundSimilar) {
        combined.push(item);
      }
    }
  }

  return combined;
}

