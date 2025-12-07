import { openai, isOpenAIConfigured } from '../openai';
import { CURATED_PROGRAMS, DEFAULT_SUGGESTION } from '../data/affiliate-programs';
import { isAffiliateLink } from '../utils/affiliate-link-detector';

import { LinkInfo } from '../scrapers/url-scraper';

export interface DetectedProduct {
  product: string;
  category: string;
  context: string;
  confidence: number;
  relevance?: number; // How relevant to the article topic (0-1)
  isAlreadyLinked: boolean;
  linkedUrl?: string; // If already linked, the URL
  linkAnchorText?: string; // The text that's linked
  estimatedValue?: number; // Estimated item price in USD (for physical products especially)
}

export interface LinkHealth {
  status: 'healthy' | 'broken' | 'redirect' | 'timeout' | 'unknown';
  statusCode?: number;
  finalUrl?: string;
  isStillAffiliate?: boolean;
  error?: string;
  checkedAt: string; // ISO date string
}

export interface AffiliateOpportunity {
  product: string;
  category: string;
  context: string;
  confidence: number;
  relevance?: number; // How relevant to the article topic
  isAlreadyLinked: boolean;
  linkedUrl?: string;
  linkAnchorText?: string;
  linkHealth?: LinkHealth; // Health of existing link
  estimatedValue?: number; // Estimated item price in USD (for sorting high-value items first)
  affiliatePrograms: Array<{
    name: string;
    url: string;
    commission: string;
    isPrimary: boolean;
    note?: string;
    linkHealth?: LinkHealth; // Health of affiliate program link
  }>;
}

/**
 * Check if a URL is a social sharing link
 */
function isSocialSharingLink(url: string): boolean {
  const urlLower = url.toLowerCase();
  const socialPatterns = [
    /facebook\.com\/sharer\.php/,
    /twitter\.com\/intent\/tweet/,
    /linkedin\.com\/sharing\/share-offsite/,
    /linkedin\.com\/shareArticle/,
    /pinterest\.com\/pin\/create\/button/,
    /reddit\.com\/submit/,
    /whatsapp\.com\/send/,
    /telegram\.me\/share/,
    /mailto:/,
    /share\.php/,
    /\/share\?/,
    /\/sharer\?/,
  ];
  
  return socialPatterns.some(pattern => pattern.test(urlLower));
}

/**
 * Helper function to check if a product is already linked
 * @param productName - The product name to check
 * @param linkDetails - Array of link information
 * @param rootDomain - Root domain of the article (to filter out internal links)
 */
function checkIfProductIsLinked(
  productName: string,
  linkDetails: LinkInfo[],
  rootDomain: string | null = null
): { isLinked: boolean; linkedUrl?: string; anchorText?: string } {
  const productLower = productName.toLowerCase();
  
  // Collect all potential matches with their match quality scores
  const matches: Array<{
    link: LinkInfo;
    score: number; // Higher = better match
    matchType: 'domain' | 'anchor' | 'context';
  }> = [];
  
  for (const link of linkDetails) {
    // Skip social sharing links (Facebook, Twitter, LinkedIn, etc.)
    if (isSocialSharingLink(link.url)) {
      continue;
    }
    
    // Skip internal links (links to the same domain as the article)
    if (rootDomain) {
      try {
        const linkDomain = extractRootDomain(link.url);
        if (linkDomain && linkDomain === rootDomain) {
          // This is an internal link, skip it
          continue;
        }
      } catch {
        // If we can't parse the URL, continue checking
      }
    }
    
    // CRITICAL: Only consider affiliate links
    if (!isAffiliateLink(link.url)) {
      continue;
    }
    
    const anchorLower = link.anchorText.toLowerCase();
    const urlLower = link.url.toLowerCase();
    
    // Check if URL domain matches the product (highest priority)
    let urlDomain = '';
    let isAmazonLink = false;
    try {
      urlDomain = new URL(link.url).hostname.toLowerCase();
      // Check if this is an Amazon affiliate link (including shorteners)
      isAmazonLink = urlDomain.includes('amazon.') || urlDomain.includes('amzn.to') || urlDomain.includes('amzn.com');
    } catch {
      // Skip URL parsing errors
    }
    
    // Normalize strings for better matching (remove articles, punctuation, parentheticals)
    const normalizeForMatch = (str: string): string => {
      return str
        .toLowerCase()
        .replace(/\([^)]*\)/g, '') // Remove parentheticals like "(book)", "(2024)"
        .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
        .replace(/\b(the|a|an)\b/g, '') // Remove articles
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };
    
    const normalizedProduct = normalizeForMatch(productLower);
    const normalizedAnchor = normalizeForMatch(anchorLower);
    
    // Extract the core product name (remove common words like "help", "a", "out", etc.)
    // This helps avoid false matches with generic words
    const getCoreProductName = (product: string): string => {
      const words = product.split(/\s+/).filter(w => {
        const lower = w.toLowerCase();
        // Filter out common words that appear in many contexts
        const commonWords = ['help', 'a', 'an', 'the', 'out', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        return w.length > 3 && !commonWords.includes(lower);
      });
      return words.join(' ');
    };
    
    const coreProductName = getCoreProductName(normalizedProduct);
    
    // Check if URL domain matches the product (highest priority)
    // STRICT: Only match if the domain contains the core product name or a significant brand word
    let domainMatch = false;
    if (urlDomain && coreProductName) {
      // Check if domain contains the core product name (all words must be present)
      const coreWords = coreProductName.split(/\s+/).filter(w => w.length > 3);
      if (coreWords.length > 0) {
        // All core words must appear in the domain (as substrings)
        const allWordsMatch = coreWords.every(word => {
          const cleanedWord = word.replace(/[^a-z0-9]/g, '');
          return urlDomain.includes(cleanedWord);
        });
        
        // Additionally, check if the domain contains a significant portion of the product name
        // For single-word products, require exact match in domain
        if (coreWords.length === 1) {
          const productWord = coreWords[0].replace(/[^a-z0-9]/g, '');
          // For single words, require the word to be a significant part of the domain
          // (at least 50% of the word length should match, or it's the main domain word)
          domainMatch = urlDomain.includes(productWord) && productWord.length >= 4;
        } else {
          // For multi-word products, require at least 2 core words to match
          domainMatch = allWordsMatch && coreWords.length >= 2;
        }
      }
      
      // Also check if the domain is the exact product name (e.g., "notion.so" for "Notion")
      if (!domainMatch) {
        const productWithoutSpaces = normalizedProduct.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        const domainWithoutDots = urlDomain.replace(/\./g, '');
        if (productWithoutSpaces.length >= 4 && domainWithoutDots.includes(productWithoutSpaces)) {
          domainMatch = true;
        }
      }
    }
    
    // Check anchor text match - prioritize exact/substring matches
    // CRITICAL: Be very strict to avoid false positives
    const isSingleWordProduct = normalizedProduct.split(/\s+/).length === 1;
    
    let anchorMatch = false;
    
    if (isSingleWordProduct && normalizedProduct.length >= 4) {
      // For single-word products, ONLY use word boundary matching
      // e.g., "work" shouldn't match "Upwork" or "framework"
      // "wix" should match "wix" or "wix website" but not "website" or "critterdepot"
      const productWord = normalizedProduct.replace(/[^\w]/g, '');
      const wordBoundaryRegex = new RegExp(`\\b${productWord}\\b`, 'i');
      anchorMatch = wordBoundaryRegex.test(anchorLower);
      
      // Also check if the anchor text is exactly the product name (case-insensitive)
      if (!anchorMatch) {
        anchorMatch = normalizedAnchor.trim() === normalizedProduct.trim();
      }
    } else {
      // For multi-word products, use stricter matching
      const normalizedProductWords = normalizedProduct.split(/\s+/).filter(w => w.length > 0);
      const anchorWords = normalizedAnchor.split(/\s+/).filter(w => w.length > 0);
      
      // CRITICAL: Exclude common words from matching to avoid false positives
      const commonWords = ['help', 'a', 'an', 'the', 'out', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'and', 'or', 'but'];
      const significantProductWords = normalizedProductWords.filter(w => !commonWords.includes(w.toLowerCase()));
      const significantAnchorWords = anchorWords.filter(w => !commonWords.includes(w.toLowerCase()));
      
      // Primary: Check if normalized anchor contains normalized product (or vice versa for short anchors)
      // But only if the product name is substantial (not just common words)
      if (significantProductWords.length > 0) {
        const significantProductName = significantProductWords.join(' ');
        const significantAnchorName = significantAnchorWords.join(' ');
        
        // Check if anchor contains the significant product name
        let anchorContainsProduct = significantAnchorName.includes(significantProductName);
        let productContainsAnchor = significantProductName.includes(significantAnchorName);
        
        // For Amazon links, also check if anchor contains most of the product words (more lenient)
        if (!anchorContainsProduct && isAmazonLink && significantProductWords.length >= 2) {
          // Check if at least 2/3 of significant product words appear in anchor
          const wordsInAnchor = significantProductWords.filter(word => 
            significantAnchorName.includes(word)
          );
          if (wordsInAnchor.length >= Math.ceil(significantProductWords.length * 0.67)) {
            anchorContainsProduct = true;
          }
        }
        
        // For very short anchors, allow product to contain anchor
        if (significantAnchorName.length < significantProductName.length * 0.5) {
          anchorMatch = productContainsAnchor;
        } else {
          anchorMatch = anchorContainsProduct;
        }
      }
      
      // Secondary: Word overlap - require at least 75% of significant product words to match
      // and at least 2 significant words must match
      // For Amazon links, be more lenient (50% match ratio instead of 75%)
      if (!anchorMatch && significantProductWords.length > 1) {
        const matchingWords = significantProductWords.filter(w => significantAnchorWords.includes(w));
        const matchRatio = matchingWords.length / Math.max(significantProductWords.length, 1);
        
        // Additional check: the product name should be a substantial part of the anchor
        // (at least 30% of anchor words should be product words, or anchor should be similar length)
        const anchorMatchRatio = matchingWords.length / Math.max(significantAnchorWords.length, 1);
        const lengthSimilarity = Math.min(normalizedProduct.length, normalizedAnchor.length) / Math.max(normalizedProduct.length, normalizedAnchor.length);
        
        // For Amazon links, use more lenient matching (50% instead of 75%)
        // For other links, require stricter matching (75%)
        const requiredMatchRatio = isAmazonLink ? 0.5 : 0.75;
        const requiredWords = isAmazonLink ? 1 : 2; // Amazon: at least 1 word, others: at least 2 words
        
        // Require significant words to match (not counting common words)
        anchorMatch = matchingWords.length >= requiredWords && 
                      matchRatio >= requiredMatchRatio && 
                      (anchorMatchRatio >= 0.3 || lengthSimilarity >= 0.7);
      }
    }
    
    // Final check: product name must be substantial (at least 3 chars after normalization)
    if (normalizedProduct.length < 3) {
      anchorMatch = false;
    }
    
    // Reject matches if anchor text is too short or empty (unreliable)
    if (anchorMatch && (!anchorLower || anchorLower.trim().length < 3)) {
      anchorMatch = false;
    }
    
    // CRITICAL SAFEGUARD: If domain doesn't match, require even stronger anchor text evidence
    // This prevents false matches like "Wix" matching to "thecritterdepot.com" with unrelated anchor text
    // EXCEPTION: For Amazon links, be more lenient since Amazon short links don't contain product names in domain
    if (!domainMatch && anchorMatch && !isAmazonLink) {
      if (isSingleWordProduct) {
        // For single-word products without domain match, require anchor to be exactly the product
        // or the product to be the primary/only word in the anchor
        const productWord = normalizedProduct.replace(/[^\w]/g, '');
        const anchorWords = normalizedAnchor.split(/\s+/).filter(w => w.length > 0);
        
        // Anchor should be exactly the product, or the product should be the only significant word
        const isExactMatch = normalizedAnchor.trim() === normalizedProduct.trim();
        const isPrimaryWord = anchorWords.length <= 3 && anchorWords.some(w => w.replace(/[^\w]/g, '') === productWord);
        
        if (!isExactMatch && !isPrimaryWord) {
          anchorMatch = false;
        }
      } else {
        // For multi-word products without domain match, require the product name to appear
        // as a clear, contiguous phrase in the anchor text
        const significantProductWords = normalizedProduct.split(/\s+/).filter(w => {
          const lower = w.toLowerCase();
          const commonWords = ['help', 'a', 'an', 'the', 'out', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'and', 'or', 'but'];
          return w.length > 0 && !commonWords.includes(lower);
        });
        
        if (significantProductWords.length >= 2) {
          // Check if the significant product words appear as a phrase (in order) in the anchor
          const productPhrase = significantProductWords.join(' ');
          const anchorPhrase = normalizedAnchor.replace(/\s+/g, ' ');
          
          // The phrase should appear in the anchor text
          // This is stricter than word overlap - requires the words to appear together
          if (!anchorPhrase.includes(productPhrase)) {
            // If not as exact phrase, check if words appear in order (allowing small gaps)
            const wordsInOrder = significantProductWords.every((word, idx) => {
              if (idx === 0) {
                return anchorPhrase.includes(word);
              }
              const prevWord = significantProductWords[idx - 1];
              const prevIndex = anchorPhrase.indexOf(prevWord);
              const currIndex = anchorPhrase.indexOf(word, prevIndex);
              // Current word should appear after previous word
              return currIndex > prevIndex;
            });
            
            if (!wordsInOrder) {
              anchorMatch = false;
            }
          }
        }
      }
    }
    
    // For Amazon links, use more lenient matching since domain won't match product names
    // But still require anchor text to contain significant product words
    if (isAmazonLink && !domainMatch && anchorMatch) {
      const significantProductWords = normalizedProduct.split(/\s+/).filter(w => {
        const lower = w.toLowerCase();
        const commonWords = ['help', 'a', 'an', 'the', 'out', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'and', 'or', 'but'];
        return w.length > 0 && !commonWords.includes(lower);
      });
      
      if (significantProductWords.length > 0) {
        // For Amazon links, require at least one significant word to appear in anchor
        // This is more lenient than the strict phrase matching above
        const anchorWords = normalizedAnchor.split(/\s+/).filter(w => w.length > 0);
        const hasSignificantMatch = significantProductWords.some(word => 
          anchorWords.some(anchorWord => anchorWord.includes(word) || word.includes(anchorWord))
        );
        
        if (!hasSignificantMatch) {
          anchorMatch = false;
        }
      }
    }
    
    // Only use domain or anchor matches - context matching is too error-prone
    // and causes incorrect associations between products and links
    if (domainMatch) {
      matches.push({ link, score: 3, matchType: 'domain' });
    } else if (anchorMatch) {
      matches.push({ link, score: 2, matchType: 'anchor' });
    }
  }
  
  // Return the best match (highest score)
  if (matches.length > 0) {
    // Sort by score (descending), then by match type priority
    matches.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score; // Higher score first
      }
      // If same score, prefer domain > anchor > context
      const typePriority = { domain: 3, anchor: 2, context: 1 };
      return typePriority[b.matchType] - typePriority[a.matchType];
    });
    
    const bestMatch = matches[0];
    return {
      isLinked: true,
      linkedUrl: bestMatch.link.url,
      anchorText: bestMatch.link.anchorText,
    };
  }
  
  return { isLinked: false };
}

/**
 * Extract root domain from URL (e.g., "findapotteryclass.com" from "https://findapotteryclass.com/article")
 */
function extractRootDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    // Remove www. prefix
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Check if a product matches the root domain (user's own site)
 */
function isOwnDomain(productName: string, rootDomain: string | null): boolean {
  if (!rootDomain) return false;
  
  const productLower = productName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const domainClean = rootDomain.replace(/[^a-z0-9]/g, '');
  
  // Check if product name contains domain or vice versa
  return productLower.includes(domainClean) || domainClean.includes(productLower);
}

/**
 * Step 1: Use AI to detect products mentioned in content
 */
export async function detectProducts(
  content: string,
  existingLinks: string[],
  linkDetails: LinkInfo[] = [],
  articleTitle?: string,
  articleUrl?: string
): Promise<DetectedProduct[]> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key is not configured');
  }

  // Extract root domain to filter out own site
  const rootDomain = articleUrl ? extractRootDomain(articleUrl) : null;

  // More proactive prompt that emphasizes relevance
  const articleTopic = articleTitle || 'this article';
  
  const prompt = `Your task is to find products, services, or tools mentioned in this page that are RELEVANT to the main topic and could potentially have affiliate programs.

ARTICLE TOPIC: ${articleTopic}

CRITICAL: Only include products that are RELEVANT to the article's main topic. For example:
- If the article is about pottery, include pottery wheels, clay, tools, but NOT incidental items like "water bottle" mentioned in passing
- If the article is about web design, include design software, hosting, but NOT unrelated products
- Focus on products that readers would genuinely want to buy related to the topic

Look for RELEVANT products:
- Tools/software directly related to the topic: "I use X for [topic]", "We switched to Y for [topic]"
- Brands/services central to the content: "I bought X for [topic]", "Check out Y for [topic]"
- Physical products that are part of the main subject (not incidental mentions)
- Platforms/services that help with the topic

SKIP products that are:
- Mentioned only incidentally (e.g., "bring a water bottle" in a pottery article)
- Completely unrelated to the article's main topic
- Generic everyday items with no connection to the topic

For each RELEVANT product/service found:
1. product: Exact brand/product name (e.g., "Canva", "Bluehost", "Notion", "Canon EOS R5")
2. category: software, physical_product, service, hosting, course, email_marketing, design_tool, etc.
3. context: The exact sentence or paragraph where mentioned (copy from content)
4. confidence: 0.0-1.0 
   - 0.8-1.0: Highly relevant to topic, clearly a branded product
   - 0.6-0.7: Moderately relevant, branded but less central
   - 0.5: Somewhat relevant but borderline
   - Below 0.5: Skip it - not relevant enough
5. relevance: 0.0-1.0 score for how relevant this product is to the article's main topic
   - 1.0: Directly related to the topic (e.g., pottery wheel in pottery article)
   - 0.7-0.9: Highly relevant (e.g., pottery tools)
   - 0.5-0.6: Somewhat relevant (e.g., related equipment)
   - Below 0.5: Not relevant - SKIP these
6. estimatedValue: Estimated item price in USD (REQUIRED for physical products, optional for others)
   - For physical products: Research typical price range (e.g., "Canon EOS R5" = ~$3000, "all-purpose flour" = ~$5)
   - For software/services: Can estimate subscription cost or one-time fee
   - For courses: Estimate course price
   - This helps prioritize high-value affiliate opportunities
   - Low-value items (under $10-15) are often not worth linking
   - Use null or omit if you truly cannot estimate

IMPORTANT: The article is about "${articleTopic}". Only suggest products that make sense for this topic.

Return as JSON:
{
  "products": [
    {
      "product": "Exact Product Name",
      "category": "category",
      "context": "full sentence from content",
      "confidence": 0.7,
      "relevance": 0.9,
      "estimatedValue": 299.99
    }
  ]
}

Only include:
- Specific brands/products (not generic terms like "a microphone")
- Products that are RELEVANT to the article topic
- Products that could have affiliate programs
- Be thorough but accurate - don't invent products that aren't mentioned
- SKIP products with relevance < 0.5 (they're not relevant enough)

CONTENT:
${content.substring(0, 12000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at finding monetization opportunities. Be thorough and find ALL branded products, tools, and services mentioned in content - even casual mentions. Return valid JSON only. Format your response as: {"products": [array of detected products]}.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.4, // Slightly higher for more creative detection
      response_format: { type: 'json_object' },
      max_tokens: 3000, // Increased to handle more products
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    // Clean markdown if present
    let cleanedResult = result.trim();
    if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(cleanedResult);
    } catch (parseError: any) {
      console.error('[AI Detection] JSON Parse Error:', parseError.message);
      console.error('[AI Detection] Raw response:', result);
      throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
    }
    
    // Handle both direct array and wrapped object
    let products: DetectedProduct[] = [];
    if (Array.isArray(parsed)) {
      products = parsed;
    } else if (parsed.products && Array.isArray(parsed.products)) {
      products = parsed.products;
    } else if (typeof parsed === 'object') {
      // Try to find array values
      const arrayKey = Object.keys(parsed).find((key) => Array.isArray(parsed[key]));
      if (arrayKey) {
        products = parsed[arrayKey];
      }
    }

    console.log(`[AI Detection] Found ${products.length} products before filtering`);

    // Validate and normalize products
    const normalizedProducts = products
      .filter((p: any) => {
        const isValid = p.product && p.category && typeof p.confidence === 'number';
        if (!isValid) {
          console.warn('[AI Detection] Skipping invalid product entry:', p);
          return false;
        }
        
        const productName = String(p.product).trim();
        
        // Filter out user's own domain
        if (rootDomain && isOwnDomain(productName, rootDomain)) {
          console.log(`[AI Detection] Filtering out own domain product: ${productName}`);
          return false;
        }
        
        // Filter out low relevance products
        const relevance = typeof p.relevance === 'number' ? Number(p.relevance) : 0.7; // Default to 0.7 if not provided
        if (relevance < 0.5) {
          console.log(`[AI Detection] Filtering out low relevance product: ${productName} (relevance: ${relevance})`);
          return false;
        }
        
        return true;
      })
      .map((p: any) => {
        const productName = String(p.product).trim();
        
        return {
          product: productName,
          category: String(p.category).trim(),
          context: String(p.context || '').trim(),
          confidence: Math.max(0, Math.min(1, Number(p.confidence))),
          relevance: typeof p.relevance === 'number' ? Math.max(0, Math.min(1, Number(p.relevance))) : 0.7,
          isAlreadyLinked: false, // Always false - we don't check for existing links anymore
          estimatedValue: typeof p.estimatedValue === 'number' && p.estimatedValue > 0 ? Number(p.estimatedValue) : undefined,
        };
      });
    
    console.log(`[AI Detection] Returning ${normalizedProducts.length} normalized products`);
    return normalizedProducts;
  } catch (error: any) {
    console.error('[AI Detection] Error detecting products:', error);
    console.error('[AI Detection] Error stack:', error.stack);
    // Preserve original error structure for rate limit detection
    const wrappedError: any = new Error(`Failed to detect products: ${error.message}`);
    wrappedError.originalError = error;
    wrappedError.status = error?.status || error?.statusCode;
    wrappedError.code = error?.code;
    throw wrappedError;
  }
}

/**
 * Step 2: Match detected products against curated affiliate programs
 */
export function matchAffiliatePrograms(
  detectedProducts: DetectedProduct[]
): AffiliateOpportunity[] {
  return detectedProducts.map((product) => {
    const matchingPrograms: Array<{
      name: string;
      url: string;
      commission: string;
      isPrimary: boolean;
      note?: string;
    }> = [];

    const productLower = product.product.toLowerCase();
    const categoryLower = product.category.toLowerCase();

    // First, check for exact matches
    for (const program of CURATED_PROGRAMS) {
      const appliesTo = Array.isArray(program.applies_to)
        ? program.applies_to
        : [program.applies_to];

      // Check for exact product name match
      const exactMatch = appliesTo.some((term) => {
        const termLower = term.toLowerCase();
        return productLower.includes(termLower) || termLower.includes(productLower);
      });

      // Check for category match
      const categoryMatch = program.category.some((cat) =>
        categoryLower.includes(cat.toLowerCase())
      );

      // Check if program applies to all physical products
      const isPhysicalProductMatch =
        program.applies_to === 'all_physical_products' &&
        (categoryLower.includes('physical') ||
          categoryLower.includes('product') ||
          categoryLower.includes('electronics') ||
          categoryLower.includes('book'));

      if (exactMatch || (categoryMatch && !isPhysicalProductMatch) || isPhysicalProductMatch) {
        matchingPrograms.push({
          name: program.name,
          url: program.url,
          commission: program.commission,
          isPrimary: exactMatch, // Exact matches are primary
        });
      }
    }

    // Sort: primary matches first, then by relevance
    matchingPrograms.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1;
      }
      return 0;
    });

    // If no matches found, add default suggestion
    if (matchingPrograms.length === 0) {
      matchingPrograms.push({
        name: DEFAULT_SUGGESTION.name,
        url: DEFAULT_SUGGESTION.url,
        commission: DEFAULT_SUGGESTION.commission,
        isPrimary: false,
        note: DEFAULT_SUGGESTION.note.replace('[product]', product.product),
      });
    }

    return {
      product: product.product,
      category: product.category,
      context: product.context,
      confidence: product.confidence,
      relevance: product.relevance,
      isAlreadyLinked: product.isAlreadyLinked,
      linkedUrl: product.linkedUrl,
      linkAnchorText: product.linkAnchorText,
      estimatedValue: product.estimatedValue,
      affiliatePrograms: matchingPrograms,
    };
  });
}

/**
 * Main function: Detect products and match with affiliate programs
 */
export async function detectAffiliateOpportunities(
  content: string,
  existingLinks: string[],
  linkDetails: LinkInfo[] = [],
  articleTitle?: string,
  articleUrl?: string
): Promise<AffiliateOpportunity[]> {
  // Step 1: AI detection (now with link details, title, and URL)
  const detectedProducts = await detectProducts(
    content,
    existingLinks,
    linkDetails,
    articleTitle,
    articleUrl
  );

  // Step 2: Match with affiliate programs
  const opportunities = matchAffiliatePrograms(detectedProducts);

  // Filter out low-confidence results (keep threshold at 0.5)
  // Note: relevance filtering already happened in detectProducts
  const filtered = opportunities.filter((opp) => opp.confidence >= 0.5);

  // Step 3: Sort by estimated value (descending), then by confidence/relevance
  // High-value items are more worthwhile for affiliate links
  filtered.sort((a, b) => {
    // First sort by estimated value (if available), highest first
    const valueA = a.estimatedValue ?? 0;
    const valueB = b.estimatedValue ?? 0;
    if (valueA !== valueB) {
      return valueB - valueA; // Descending order
    }
    
    // If same value (or both missing), sort by combined confidence + relevance
    const scoreA = (a.confidence || 0) * 0.7 + (a.relevance || 0) * 0.3;
    const scoreB = (b.confidence || 0) * 0.7 + (b.relevance || 0) * 0.3;
    return scoreB - scoreA; // Descending order
  });

  return filtered;
}

