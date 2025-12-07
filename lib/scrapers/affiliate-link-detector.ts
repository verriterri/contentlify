/**
 * Count affiliate links in HTML content
 * Detects common affiliate link patterns
 */
export function countAffiliateLinks(html: string): number {
  if (!html) return 0;

  // Social sharing domains that should never be considered affiliate links
  const SOCIAL_SHARING_DOMAINS = [
    'facebook.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'pinterest.com',
    'reddit.com',
    'tumblr.com',
    'whatsapp.com',
    'telegram.org',
    'vk.com',
    'weibo.com',
    'line.me',
  ];

  // Known affiliate network domains
  const AFFILIATE_NETWORK_DOMAINS = [
    'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.es', 'amazon.ca', 'amazon.com.au',
    'shareasale.com', 'shareasale.net',
    'anrdoezrs.net', 'dpbolvw.net', 'jdoqocy.com', 'kqzyfj.com', 'emjcd.com', // CJ Affiliate
    'qksrv.net', // Rakuten
    'avantlink.com',
    'pntrs.com', // Partnerize
    'impact.com', 'impactradius.com',
    'awin1.com', // Awin
    'partnerlinks.io',
  ];

  // URL shorteners often used for affiliate links
  const AFFILIATE_SHORTENERS = [
    'amzn.to', 'amzn.com',
    'bit.ly', 'tinyurl.com',
    'goo.gl', 't.co',
  ];

  // High-confidence affiliate parameters (always indicate affiliate links)
  const HIGH_CONFIDENCE_PARAMS = [
    'tag', // Amazon Associates
    'awc', // Amazon Associates
    'anid', // Amazon Native Shopping Ads
    'pid', // CJ Affiliate
    'affiliate', 'aff_id', 'affid', 'aff',
    'partner', 'partner_id',
    'site_id', // Rakuten
    'u', // ShareASale (only on ShareASale domains)
    'mdata', // ShareASale
  ];

  // Medium-confidence parameters (only count on known affiliate domains)
  const MEDIUM_CONFIDENCE_PARAMS = [
    'ref', 'ref_id', 'refid', 'referral',
    'source', 'source_id',
    'rid',
  ];

  let count = 0;
  const foundUrls = new Set<string>(); // Track unique URLs to avoid double counting

  // Extract all href attributes from links
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = hrefPattern.exec(html)) !== null) {
    const url = match[1];
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Skip social sharing domains
      if (SOCIAL_SHARING_DOMAINS.some(domain => hostname.includes(domain))) {
        continue;
      }

      // Check for known affiliate network domains
      const isAffiliateDomain = AFFILIATE_NETWORK_DOMAINS.some(domain => hostname.includes(domain));
      const isShortener = AFFILIATE_SHORTENERS.some(domain => hostname.includes(domain));

      // Check for high-confidence parameters (always count)
      const hasHighConfidenceParam = HIGH_CONFIDENCE_PARAMS.some(param => urlObj.searchParams.has(param));
      
      // Check for medium-confidence parameters (only count on affiliate domains)
      const hasMediumConfidenceParam = MEDIUM_CONFIDENCE_PARAMS.some(param => 
        urlObj.searchParams.has(param) && isAffiliateDomain
      );

      // Check for Amazon tag parameter (specific pattern)
      const isAmazonWithTag = hostname.includes('amazon.') && urlObj.searchParams.has('tag');

      // Check for ShareASale 'u' parameter (only on ShareASale domains)
      const isShareASaleWithU = (hostname.includes('shareasale.com') || hostname.includes('shareasale.net')) 
        && urlObj.searchParams.has('u');

      // Count if it matches any affiliate criteria
      if (isAffiliateDomain || isShortener || hasHighConfidenceParam || hasMediumConfidenceParam || 
          isAmazonWithTag || isShareASaleWithU) {
        // Normalize URL to avoid counting same link multiple times
        const normalizedUrl = url.toLowerCase().split('?')[0].split('#')[0];
        if (!foundUrls.has(normalizedUrl)) {
          foundUrls.add(normalizedUrl);
          count++;
        }
      }
    } catch {
      // Skip invalid URLs
      continue;
    }
  }

  return count;
}

/**
 * Check if a specific URL is an affiliate link
 */
export function isAffiliateLink(url: string): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Social sharing domains that should never be considered affiliate links
    const SOCIAL_SHARING_DOMAINS = [
      'facebook.com',
      'twitter.com',
      'x.com',
      'linkedin.com',
      'pinterest.com',
      'reddit.com',
      'tumblr.com',
      'whatsapp.com',
      'telegram.org',
      'vk.com',
      'weibo.com',
      'line.me',
    ];

    // Skip social sharing domains
    if (SOCIAL_SHARING_DOMAINS.some(domain => hostname.includes(domain))) {
      return false;
    }

    // Known affiliate network domains
    const AFFILIATE_NETWORK_DOMAINS = [
      'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.es', 'amazon.ca', 'amazon.com.au',
      'shareasale.com', 'shareasale.net',
      'anrdoezrs.net', 'dpbolvw.net', 'jdoqocy.com', 'kqzyfj.com', 'emjcd.com', // CJ Affiliate
      'qksrv.net', // Rakuten
      'avantlink.com',
      'pntrs.com', // Partnerize
      'impact.com', 'impactradius.com',
      'awin1.com', // Awin
      'partnerlinks.io',
    ];

    // URL shorteners often used for affiliate links
    const AFFILIATE_SHORTENERS = [
      'amzn.to', 'amzn.com',
      'bit.ly', 'tinyurl.com',
      'goo.gl', 't.co',
    ];

    // High-confidence affiliate parameters (always indicate affiliate links)
    const HIGH_CONFIDENCE_PARAMS = [
      'tag', // Amazon Associates
      'awc', // Amazon Associates
      'anid', // Amazon Native Shopping Ads
      'pid', // CJ Affiliate
      'affiliate', 'aff_id', 'affid', 'aff',
      'partner', 'partner_id',
      'site_id', // Rakuten
      'u', // ShareASale (only on ShareASale domains)
      'mdata', // ShareASale
    ];

    // Medium-confidence parameters (only count on known affiliate domains)
    const MEDIUM_CONFIDENCE_PARAMS = [
      'ref', 'ref_id', 'refid', 'referral',
      'source', 'source_id',
      'rid',
    ];

    // Check for known affiliate network domains
    const isAffiliateDomain = AFFILIATE_NETWORK_DOMAINS.some(domain => hostname.includes(domain));
    const isShortener = AFFILIATE_SHORTENERS.some(domain => hostname.includes(domain));

    // Check for high-confidence parameters (always count)
    const hasHighConfidenceParam = HIGH_CONFIDENCE_PARAMS.some(param => urlObj.searchParams.has(param));
    
    // Check for medium-confidence parameters (only count on affiliate domains)
    const hasMediumConfidenceParam = MEDIUM_CONFIDENCE_PARAMS.some(param => 
      urlObj.searchParams.has(param) && isAffiliateDomain
    );

    // Check for Amazon tag parameter (specific pattern)
    const isAmazonWithTag = hostname.includes('amazon.') && urlObj.searchParams.has('tag');

    // Check for ShareASale 'u' parameter (only on ShareASale domains)
    const isShareASaleWithU = (hostname.includes('shareasale.com') || hostname.includes('shareasale.net')) 
      && urlObj.searchParams.has('u');

    // Return true if it matches any affiliate criteria
    return isAffiliateDomain || isShortener || hasHighConfidenceParam || hasMediumConfidenceParam || 
           isAmazonWithTag || isShareASaleWithU;
  } catch {
    return false;
  }
}

