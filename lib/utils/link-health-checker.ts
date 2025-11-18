import { isAffiliateLink } from './affiliate-link-detector';

export interface LinkHealth {
  status: 'healthy' | 'broken' | 'redirect' | 'timeout' | 'unknown';
  statusCode?: number;
  finalUrl?: string; // After following redirects
  isStillAffiliate?: boolean; // Check if final URL is still an affiliate link
  error?: string;
  checkedAt: Date;
}

/**
 * Check the health of a single link
 * @param url - The URL to check
 * @param options - Options for the check
 * @returns LinkHealth information
 */
export async function checkLinkHealth(
  url: string,
  options?: { timeout?: number; followRedirects?: boolean }
): Promise<LinkHealth> {
  const timeout = options?.timeout || 10000; // 10 second default
  const followRedirects = options?.followRedirects !== false;
  
  if (!url || !url.trim()) {
    return {
      status: 'broken',
      checkedAt: new Date(),
      error: 'Invalid URL',
    };
  }

  try {
    // Try HEAD first (more efficient), fall back to GET if HEAD fails
    let response: Response;
    let controller: AbortController;
    let timeoutId: NodeJS.Timeout;
    
    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeout);
      
      response = await fetch(url, {
        method: 'HEAD', // Use HEAD to avoid downloading full page
        signal: controller.signal,
        redirect: followRedirects ? 'follow' : 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      
      clearTimeout(timeoutId);
    } catch (headError: any) {
      // If HEAD fails (and not due to timeout), try GET (some servers don't support HEAD)
      if (headError.name === 'AbortError') {
        throw headError; // Timeout - don't retry
      }
      
      // Clear the HEAD timeout if it was set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Try GET as fallback
      controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          redirect: followRedirects ? 'follow' : 'manual',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        clearTimeout(timeoutId);
      } catch (getError) {
        clearTimeout(timeoutId);
        throw getError;
      }
    }
    
    const finalUrl = response.url; // Final URL after redirects
    const statusCode = response.status;
    
    // Check if final URL is still an affiliate link
    const isStillAffiliate = isAffiliateLink(finalUrl);
    
    if (statusCode >= 200 && statusCode < 300) {
      return {
        status: 'healthy',
        statusCode,
        finalUrl: finalUrl !== url ? finalUrl : undefined,
        isStillAffiliate,
        checkedAt: new Date(),
      };
    } else if (statusCode >= 300 && statusCode < 400) {
      return {
        status: 'redirect',
        statusCode,
        finalUrl: finalUrl !== url ? finalUrl : undefined,
        isStillAffiliate,
        checkedAt: new Date(),
      };
    } else if (statusCode >= 400) {
      return {
        status: 'broken',
        statusCode,
        finalUrl: finalUrl !== url ? finalUrl : undefined,
        checkedAt: new Date(),
        error: `HTTP ${statusCode}`,
      };
    }
    
    return {
      status: 'unknown',
      statusCode,
      checkedAt: new Date(),
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        status: 'timeout',
        checkedAt: new Date(),
        error: 'Request timed out',
      };
    }
    
    if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
      return {
        status: 'broken',
        checkedAt: new Date(),
        error: 'Could not connect to server',
      };
    }
    
    return {
      status: 'broken',
      checkedAt: new Date(),
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Batch check multiple links in parallel (with concurrency limit)
 * @param urls - Array of URLs to check
 * @param options - Options for batch checking
 * @returns Map of URL to LinkHealth
 */
export async function checkLinksHealth(
  urls: string[],
  options?: { concurrency?: number; timeout?: number }
): Promise<Map<string, LinkHealth>> {
  const concurrency = options?.concurrency || 5; // Check 5 links at a time
  const timeout = options?.timeout || 10000;
  const results = new Map<string, LinkHealth>();
  
  // Remove duplicates
  const uniqueUrls = Array.from(new Set(urls.filter(url => url && url.trim())));
  
  if (uniqueUrls.length === 0) {
    return results;
  }
  
  // Process in batches to avoid overwhelming the server
  for (let i = 0; i < uniqueUrls.length; i += concurrency) {
    const batch = uniqueUrls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(url => 
        checkLinkHealth(url, { timeout })
          .then(health => ({ url, health }))
          .catch(error => ({
            url,
            health: {
              status: 'broken' as const,
              checkedAt: new Date(),
              error: error.message || 'Unknown error',
            },
          }))
      )
    );
    
    batchResults.forEach(({ url, health }) => {
      results.set(url, health);
    });
    
    // Small delay between batches to be respectful
    if (i + concurrency < uniqueUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

