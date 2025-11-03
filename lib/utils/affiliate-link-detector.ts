/**
 * Utility functions to detect if a URL is an affiliate link
 */

export interface AffiliateLinkInfo {
  isAffiliate: boolean;
  confidence: 'high' | 'medium' | 'low';
  detectedParams?: string[];
  network?: string;
}

/**
 * Common affiliate link parameters
 */
const AFFILIATE_PARAMS = [
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
  'awc', // Amazon Associates
  'anid', // Amazon Native Shopping Ads
  'linkId', // Some programs
];

/**
 * Common affiliate URL path patterns
 */
const AFFILIATE_PATH_PATTERNS = [
  '/ref/', '/refs/',
  '/affiliate/',
  '/a/', '/aff/',
  '/r/', '/refer/',
  '/track/', '/tracking/',
];

/**
 * Known affiliate networks and their patterns
 */
const AFFILIATE_NETWORKS: Record<string, { params: string[]; paths?: string[] }> = {
  'Amazon Associates': {
    params: ['tag', 'awc', 'anid'],
    paths: ['/gp/product/'],
  },
  'ShareASale': {
    params: ['u', 'mdata'],
  },
  'CJ Affiliate': {
    params: ['pid'],
  },
  'Impact': {
    params: ['ref'],
  },
  'Rakuten': {
    params: ['site_id'],
  },
};

/**
 * Check if a URL is likely an affiliate link
 */
export function isAffiliateLink(url: string): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();

    // Check for affiliate query parameters
    for (const param of AFFILIATE_PARAMS) {
      if (urlObj.searchParams.has(param)) {
        return true;
      }
    }

    // Check for affiliate path patterns
    for (const pattern of AFFILIATE_PATH_PATTERNS) {
      if (pathname.includes(pattern)) {
        return true;
      }
    }

    // Check specific affiliate networks
    for (const [network, patterns] of Object.entries(AFFILIATE_NETWORKS)) {
      // Check params
      if (patterns.params.some(param => urlObj.searchParams.has(param))) {
        return true;
      }
      // Check paths if defined
      if (patterns.paths && patterns.paths.some(path => pathname.includes(path))) {
        return true;
      }
    }

    // Amazon-specific check
    if (hostname.includes('amazon.') && urlObj.searchParams.has('tag')) {
      return true;
    }

    // Check for URL shorteners that are often used for affiliate links
    const shortenerDomains = [
      'amzn.to', 'amzn.com',
      'bit.ly', 'tinyurl.com',
      'goo.gl', 't.co',
    ];

    if (shortenerDomains.some(domain => hostname.includes(domain))) {
      return true; // Likely an affiliate link if it's a shortener
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get detailed information about whether a URL is an affiliate link
 */
export function getAffiliateLinkInfo(url: string): AffiliateLinkInfo {
  if (!url) {
    return { isAffiliate: false, confidence: 'low' };
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    const detectedParams: string[] = [];
    let detectedNetwork: string | undefined;
    let confidence: 'high' | 'medium' | 'low' = 'low';

    // Check for affiliate query parameters
    for (const param of AFFILIATE_PARAMS) {
      if (urlObj.searchParams.has(param)) {
        detectedParams.push(param);
        confidence = 'high';
      }
    }

    // Check for affiliate path patterns
    let hasAffiliatePath = false;
    for (const pattern of AFFILIATE_PATH_PATTERNS) {
      if (pathname.includes(pattern)) {
        hasAffiliatePath = true;
        confidence = confidence === 'low' ? 'medium' : 'high';
      }
    }

    // Check specific affiliate networks
    for (const [network, patterns] of Object.entries(AFFILIATE_NETWORKS)) {
      const hasNetworkParam = patterns.params.some(param => {
        if (urlObj.searchParams.has(param)) {
          detectedParams.push(param);
          detectedNetwork = network;
          confidence = 'high';
          return true;
        }
        return false;
      });
      
      if (hasNetworkParam) break;

      // Check paths if defined
      if (patterns.paths && patterns.paths.some(path => pathname.includes(path))) {
        detectedNetwork = network;
        confidence = confidence === 'low' ? 'medium' : 'high';
      }
    }

    // Amazon-specific check
    if (hostname.includes('amazon.') && urlObj.searchParams.has('tag')) {
      detectedParams.push('tag');
      detectedNetwork = 'Amazon Associates';
      confidence = 'high';
    }

    // Check for URL shorteners
    const shortenerDomains = [
      'amzn.to', 'amzn.com',
      'bit.ly', 'tinyurl.com',
      'goo.gl', 't.co',
    ];

    const isShortener = shortenerDomains.some(domain => hostname.includes(domain));
    if (isShortener && detectedParams.length === 0 && !hasAffiliatePath) {
      confidence = 'medium'; // Shorteners are often affiliate links but can't be sure
    }

    const isAffiliate = detectedParams.length > 0 || hasAffiliatePath || isShortener || detectedNetwork !== undefined;

    return {
      isAffiliate,
      confidence,
      detectedParams: detectedParams.length > 0 ? detectedParams : undefined,
      network: detectedNetwork,
    };
  } catch {
    return { isAffiliate: false, confidence: 'low' };
  }
}

