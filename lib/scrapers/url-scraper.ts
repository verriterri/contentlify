import * as cheerio from 'cheerio';

export interface LinkInfo {
  url: string;
  anchorText: string;
  context?: string; // Text around the link
}

interface ScrapeResult {
  url: string;
  title: string;
  content: string;
  existingLinks: string[];
  linkDetails: LinkInfo[];
  wordCount: number;
  error?: string;
}

// In-memory cache with TTL (5 minutes)
const cache = new Map<string, { data: ScrapeResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting: track requests per URL (max 1 per 10 seconds per URL)
const rateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW = 10 * 1000; // 10 seconds

/**
 * Scrapes a URL to extract content, title, and links
 * @param url - The URL to scrape
 * @returns ScrapeResult with extracted data
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    return {
      url,
      title: '',
      content: '',
      existingLinks: [],
      wordCount: 0,
      error: 'Invalid URL format',
    };
  }

  // Check cache first
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Check rate limit
  const lastRequest = rateLimit.get(url);
  const now = Date.now();
  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW) {
    return {
      url,
      title: '',
      content: '',
      existingLinks: [],
      wordCount: 0,
      error: 'Rate limit exceeded. Please wait a few seconds before scraping this URL again.',
    };
  }

  rateLimit.set(url, now);

  try {
    // Fetch the URL with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          url,
          title: '',
          content: '',
          existingLinks: [],
          wordCount: 0,
          error: 'URL not found (404)',
        };
      }
      if (response.status === 403) {
        return {
          url,
          title: '',
          content: '',
          existingLinks: [],
          wordCount: 0,
          error: 'Access forbidden (403). The website may be blocking automated requests.',
        };
      }
      return {
        url,
        title: '',
        content: '',
        existingLinks: [],
        wordCount: 0,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();

    // Parse HTML with cheerio
    const $ = cheerio.load(html);

    // Extract title
    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text() ||
      '';

    // Extract meta description
    const metaDescription =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';

    // Remove unwanted elements (navigation, footer, ads, scripts, styles)
    $('nav, footer, header, aside, .sidebar, .navigation, .menu, .ad, .advertisement, .ads, script, style, iframe, noscript').remove();

    // Remove common ad and widget classes
    $('.advertisement, .ad-banner, .widget, .popup, .modal, .cookie-banner, .newsletter-signup').remove();

    // Extract main content
    // Try common content selectors
    let content = '';
    const contentSelectors = [
      'article',
      'main',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '[role="main"]',
      '.main-content',
      '.post-body',
      '#content',
    ];

    for (const selector of contentSelectors) {
      const $content = $(selector).first();
      if ($content.length > 0) {
        content = $content.text();
        if (content.trim().length > 100) {
          // Found substantial content
          break;
        }
      }
    }

    // Fallback: get all paragraph text if no main content found
    if (!content || content.trim().length < 100) {
      const paragraphs: string[] = [];
      $('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) {
          // Filter out very short paragraphs (likely navigation/ads)
          paragraphs.push(text);
        }
      });
      content = paragraphs.join('\n\n');
    }

    // Extract all links with anchor text and context
    const existingLinks: string[] = [];
    const linkDetails: LinkInfo[] = [];
    
    $('a[href]').each((_, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      const anchorText = $link.text().trim();
      
      if (href) {
        try {
          // Convert relative URLs to absolute
          const absoluteUrl = new URL(href, url).toString();
          existingLinks.push(absoluteUrl);
          
          // Get context around the link (parent element or paragraph)
          let context = '';
          const $parent = $link.parent();
          if ($parent.is('p')) {
            context = $parent.text().substring(0, 200);
          } else {
            // Try to get surrounding text
            const $paragraph = $link.closest('p');
            if ($paragraph.length > 0) {
              context = $paragraph.text().substring(0, 200);
            } else {
              context = anchorText;
            }
          }
          
          linkDetails.push({
            url: absoluteUrl,
            anchorText,
            context: context.trim(),
          });
        } catch {
          // Skip invalid URLs
        }
      }
    });

    // Clean content
    content = content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .trim();

    // Calculate word count
    const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length;

    // Remove duplicate links while preserving linkDetails
    const uniqueLinks = Array.from(new Set(existingLinks));
    const uniqueLinkDetails: LinkInfo[] = [];
    const seenUrls = new Set<string>();
    
    linkDetails.forEach((link) => {
      if (!seenUrls.has(link.url)) {
        seenUrls.add(link.url);
        uniqueLinkDetails.push(link);
      }
    });
    
    const result: ScrapeResult = {
      url,
      title: title.trim(),
      content,
      existingLinks: uniqueLinks,
      linkDetails: uniqueLinkDetails,
      wordCount,
    };

    // Cache the result
    cache.set(url, { data: result, timestamp: Date.now() });

    // Clean up old cache entries periodically
    if (cache.size > 100) {
      const cutoff = Date.now() - CACHE_TTL;
      Array.from(cache.entries()).forEach(([key, value]) => {
        if (value.timestamp < cutoff) {
          cache.delete(key);
        }
      });
    }

    // Clean up old rate limit entries
    if (rateLimit.size > 1000) {
      const cutoff = Date.now() - RATE_LIMIT_WINDOW;
      Array.from(rateLimit.entries()).forEach(([key, timestamp]) => {
        if (timestamp < cutoff) {
          rateLimit.delete(key);
        }
      });
    }

    return result;
  } catch (error: any) {
    // Handle various error types
    if (error.name === 'AbortError') {
      return {
        url,
        title: '',
        content: '',
        existingLinks: [],
        wordCount: 0,
        error: 'Request timeout. The website took too long to respond.',
      };
    }

    if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
      return {
        url,
        title: '',
        content: '',
        existingLinks: [],
        wordCount: 0,
        error: 'Could not connect to the website. Please check if the URL is accessible.',
      };
    }

    return {
      url,
      title: '',
      content: '',
      existingLinks: [],
      wordCount: 0,
      error: error.message || 'Unknown error occurred while scraping the URL',
    };
  }
}

/**
 * Clears the cache for a specific URL or all URLs
 * @param url - Optional URL to clear. If not provided, clears all cache.
 */
export function clearCache(url?: string): void {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
}

/**
 * Gets cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: cache.size,
    entries: Array.from(cache.keys()),
  };
}

