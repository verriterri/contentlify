/**
 * Count affiliate links in HTML content
 * Detects common affiliate link patterns
 */
export function countAffiliateLinks(html: string): number {
  if (!html) return 0;

  // Patterns to detect affiliate links
  const affiliatePatterns = [
    // Amazon
    /amazon\.com\/[^"'\s]*[?&]tag=/gi,
    /amzn\.to\//gi,
    /amazon\.(com|co\.uk|de|fr|it|es|ca|com\.au)\/[^"'\s]*[?&]tag=/gi,
    
    // ShareASale
    /shareasale\.com/gi,
    
    // CJ Affiliate (Commission Junction)
    /anrdoezrs\.net/gi,
    /dpbolvw\.net/gi,
    /jdoqocy\.com/gi,
    /kqzyfj\.com/gi,
    /emjcd\.com/gi,
    
    // Rakuten
    /qksrv\.net/gi,
    
    // AvantLink
    /avantlink\.com/gi,
    
    // Partnerize
    /pntrs\.com/gi,
    
    // Impact
    /impact\.com/gi,
    /impactradius\.com/gi,
    
    // Awin
    /awin1\.com/gi,
    
    // Partner Links
    /partnerlinks\.io/gi,
    
    // URL parameters that indicate affiliate links
    /[?&](affiliate|aff_id|affid|ref|referral|partner|pid|rid|source|utm_source=affiliate)=/gi,
  ];

  let count = 0;
  const foundUrls = new Set<string>(); // Track unique URLs to avoid double counting

  // Extract all href attributes from links
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = hrefPattern.exec(html)) !== null) {
    const url = match[1];
    
    // Check if URL matches any affiliate pattern
    for (const pattern of affiliatePatterns) {
      if (pattern.test(url)) {
        // Normalize URL to avoid counting same link multiple times
        const normalizedUrl = url.toLowerCase().split('?')[0].split('#')[0];
        if (!foundUrls.has(normalizedUrl)) {
          foundUrls.add(normalizedUrl);
          count++;
        }
        break; // Found a match, no need to check other patterns
      }
    }
  }

  return count;
}

/**
 * Check if a specific URL is an affiliate link
 */
export function isAffiliateLink(url: string): boolean {
  if (!url) return false;

  const affiliatePatterns = [
    /amazon\.com\/[^"'\s]*[?&]tag=/gi,
    /amzn\.to\//gi,
    /shareasale\.com/gi,
    /anrdoezrs\.net/gi,
    /dpbolvw\.net/gi,
    /jdoqocy\.com/gi,
    /kqzyfj\.com/gi,
    /qksrv\.net/gi,
    /avantlink\.com/gi,
    /pntrs\.com/gi,
    /impact\.com/gi,
    /awin1\.com/gi,
    /partnerlinks\.io/gi,
    /[?&](affiliate|aff_id|affid|ref|referral|partner|pid|rid|source|utm_source=affiliate)=/gi,
  ];

  for (const pattern of affiliatePatterns) {
    if (pattern.test(url)) {
      return true;
    }
  }

  return false;
}

