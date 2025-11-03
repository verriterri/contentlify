/**
 * Detect if a URL appears to be an affiliate link based on common patterns
 */
export function isAffiliateLink(url: string): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    
    // Check for common affiliate query parameters
    const affiliateParams = [
      'ref', 'ref_id', 'refid', 'referrer', 'referral',
      'aff', 'affiliate', 'aff_id', 'affid',
      'tag', 'tags',
      'source', 'source_id',
      'partner', 'partner_id',
      'campaign', 'campaign_id',
      'tracking', 'tracking_id',
      'clickid', 'click_id',
      'linkCode', 'link_code',
      'tid', 'tid1', 'tid2',
      'utm_source', 'utm_medium', 'utm_campaign', // Can indicate affiliate
      'awc', // Amazon Associates
      'anid', // Amazon Native Shopping Ads
      'linkId', // Some programs
      'pid', // Product ID / Partner ID
      'aid', // Affiliate ID
      'subid', // Sub ID
      'clickref', // Click reference
    ];
    
    // Check query parameters
    for (const param of affiliateParams) {
      if (urlObj.searchParams.has(param)) {
        return true;
      }
    }
    
    // Check path for affiliate patterns
    const pathLower = urlObj.pathname.toLowerCase();
    const affiliatePaths = [
      '/ref/', '/refs/',
      '/affiliate/',
      '/a/', '/aff/',
      '/r/', '/refer/',
      '/track/', '/tracking/',
      '/partner/',
    ];
    
    for (const path of affiliatePaths) {
      if (pathLower.includes(path)) {
        return true;
      }
    }
    
    // Check for known affiliate URL patterns
    const hostname = urlObj.hostname.toLowerCase();
    
    // Amazon Associates - tag parameter is a strong indicator
    if (hostname.includes('amazon.') && urlObj.searchParams.has('tag')) {
      return true;
    }
    
    // Check for URL shorteners that are often used for affiliate links
    const shortenerDomains = [
      'amzn.to', 'amzn.com',
      'bit.ly', 'tinyurl.com',
      'goo.gl', 't.co',
      'ow.ly', 'buff.ly',
    ];
    
    if (shortenerDomains.some(domain => hostname.includes(domain))) {
      return true; // Likely an affiliate link if it's a shortener
    }
    
    // Check for known affiliate network domains in the URL
    const affiliateNetworkPatterns = [
      'shareasale',
      'cj.com',
      'commissionjunction',
      'rakuten',
      'impact',
      'awin',
      'partnerstack',
      'tapfiliate',
    ];
    
    const fullUrl = url.toLowerCase();
    if (affiliateNetworkPatterns.some(pattern => fullUrl.includes(pattern))) {
      return true;
    }
    
    return false;
  } catch {
    // If URL parsing fails, return false
    return false;
  }
}

/**
 * Get affiliate link type/network if detectable
 */
export function getAffiliateLinkInfo(url: string): { type: string; confidence: 'high' | 'medium' | 'low' } | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const fullUrl = url.toLowerCase();
    
    // Amazon Associates
    if (hostname.includes('amazon.') && urlObj.searchParams.has('tag')) {
      return { type: 'Amazon Associates', confidence: 'high' };
    }
    
    if (hostname.includes('amzn.to')) {
      return { type: 'Amazon Associates (Short Link)', confidence: 'high' };
    }
    
    // ShareASale
    if (fullUrl.includes('shareasale')) {
      return { type: 'ShareASale', confidence: 'high' };
    }
    
    // Commission Junction / CJ Affiliate
    if (fullUrl.includes('cj.com') || fullUrl.includes('commissionjunction')) {
      return { type: 'CJ Affiliate', confidence: 'high' };
    }
    
    // Rakuten
    if (fullUrl.includes('rakuten')) {
      return { type: 'Rakuten', confidence: 'high' };
    }
    
    // Impact
    if (fullUrl.includes('impact')) {
      return { type: 'Impact', confidence: 'high' };
    }
    
    // Awin
    if (fullUrl.includes('awin')) {
      return { type: 'Awin', confidence: 'high' };
    }
    
    // Generic affiliate parameters (medium confidence)
    const strongAffiliateParams = ['tag', 'ref', 'aff', 'affiliate', 'refid'];
    if (strongAffiliateParams.some(param => urlObj.searchParams.has(param))) {
      return { type: 'Affiliate Link (Unknown Network)', confidence: 'medium' };
    }
    
    // Weak indicators (low confidence)
    const weakAffiliateParams = ['source', 'campaign', 'partner', 'tracking'];
    if (weakAffiliateParams.some(param => urlObj.searchParams.has(param))) {
      return { type: 'Possible Affiliate Link', confidence: 'low' };
    }
    
    return null;
  } catch {
    return null;
  }
}

