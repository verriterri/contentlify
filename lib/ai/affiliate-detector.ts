import { openai, isOpenAIConfigured } from '../openai';
import { CURATED_PROGRAMS, DEFAULT_SUGGESTION } from '../data/affiliate-programs';

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

export interface AffiliateOpportunity {
  product: string;
  category: string;
  context: string;
  confidence: number;
  relevance?: number; // How relevant to the article topic
  isAlreadyLinked: boolean;
  linkedUrl?: string;
  linkAnchorText?: string;
  estimatedValue?: number; // Estimated item price in USD (for sorting high-value items first)
  affiliatePrograms: Array<{
    name: string;
    url: string;
    commission: string;
    isPrimary: boolean;
    note?: string;
  }>;
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
  
  for (const link of linkDetails) {
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
    
    const anchorLower = link.anchorText.toLowerCase();
    const urlLower = link.url.toLowerCase();
    const contextLower = (link.context || '').toLowerCase();
    
    // Check if product name appears in anchor text or near it
    if (
      anchorLower.includes(productLower) ||
      productLower.includes(anchorLower) ||
      contextLower.includes(productLower)
    ) {
      // Also check if URL domain might match the product
      let urlDomain = '';
      try {
        urlDomain = new URL(link.url).hostname.toLowerCase();
      } catch {
        // Skip URL parsing errors
      }
      
      const productWords = productLower.split(/\s+/);
      
      // Check if any product word appears in domain
      const domainMatch = urlDomain
        ? productWords.some(
            (word) => word.length > 3 && urlDomain.includes(word.replace(/[^a-z0-9]/g, ''))
          )
        : false;
      
      if (domainMatch || anchorLower.includes(productLower) || productLower.includes(anchorLower)) {
        return {
          isLinked: true,
          linkedUrl: link.url,
          anchorText: link.anchorText,
        };
      }
    }
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

  // Prepare link information for the AI
  const linkInfoForAI = linkDetails
    .slice(0, 30) // Increased from 20
    .map((link, idx) => `${idx + 1}. "${link.anchorText}" → ${link.url}`)
    .join('\n');

  // More proactive prompt that emphasizes relevance
  const articleTopic = articleTitle || 'this article';
  
  const prompt = `Your task is to find products, services, or tools mentioned in this blog post that are RELEVANT to the main topic and could potentially have affiliate programs.

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
7. isAlreadyLinked: true ONLY if you see this exact product linked in the links below

IMPORTANT: The article is about "${articleTopic}". Only suggest products that make sense for this topic.

EXISTING LINKS IN CONTENT:
${linkInfoForAI || 'No links found - all products are potential opportunities!'}

IMPORTANT FOR isAlreadyLinked:
- Compare the product name to the anchor text and URLs above
- IGNORE internal links (links to the same domain as this article) - only count external links to other websites
- If product "Notion" appears and there's an EXTERNAL link with anchor "Notion" or URL contains "notion.so" → isAlreadyLinked = true
- If product is only linked internally (same domain) or not linked at all → isAlreadyLinked = false
- Internal links don't count as affiliate links - only external links to other websites
- When in doubt, mark as false (not linked) - it's better to show an opportunity

Return as JSON:
{
  "products": [
    {
      "product": "Exact Product Name",
      "category": "category",
      "context": "full sentence from content",
      "confidence": 0.7,
      "relevance": 0.9,
      "estimatedValue": 299.99,
      "isAlreadyLinked": false
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

    // Validate and normalize products, then cross-check with actual links
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
        const aiSaysLinked = Boolean(p.isAlreadyLinked);
        
        // Double-check with actual link data (pass rootDomain to filter internal links)
        const linkCheck = checkIfProductIsLinked(productName, linkDetails, rootDomain);
        
        // Only consider it linked if our checker confirms AND it's not an internal link
        // If AI says it's linked but our checker says it's only internal links, mark as not linked
        const isActuallyLinked = linkCheck.isLinked || (aiSaysLinked && !rootDomain);
        
        return {
          product: productName,
          category: String(p.category).trim(),
          context: String(p.context || '').trim(),
          confidence: Math.max(0, Math.min(1, Number(p.confidence))),
          relevance: typeof p.relevance === 'number' ? Math.max(0, Math.min(1, Number(p.relevance))) : 0.7,
          isAlreadyLinked: isActuallyLinked,
          linkedUrl: linkCheck.linkedUrl,
          linkAnchorText: linkCheck.anchorText,
          estimatedValue: typeof p.estimatedValue === 'number' && p.estimatedValue > 0 ? Number(p.estimatedValue) : undefined,
        };
      });
    
    console.log(`[AI Detection] Returning ${normalizedProducts.length} normalized products`);
    return normalizedProducts;
  } catch (error: any) {
    console.error('[AI Detection] Error detecting products:', error);
    console.error('[AI Detection] Error stack:', error.stack);
    throw new Error(`Failed to detect products: ${error.message}`);
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

