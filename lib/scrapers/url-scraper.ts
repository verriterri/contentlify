import * as cheerio from 'cheerio';
import type { StructuredContent } from '@/lib/audit/types';

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
      linkDetails: [],
      wordCount: 0,
      error: 'Invalid URL format',
    };
  }

  // Check cache first
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Clean up old rate limit entries before checking (prevent stale entries)
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW;
  Array.from(rateLimit.entries()).forEach(([key, timestamp]) => {
    if (timestamp < cutoff) {
      rateLimit.delete(key);
    }
  });

  // Check rate limit (only if not using cache)
  const lastRequest = rateLimit.get(url);
  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW) {
    // Check if we have a cached result we can return instead (even if stale)
    const staleCache = cache.get(url);
    if (staleCache) {
      // Return stale cache if rate limited (better than error)
      console.log(`[Scraper] Rate limited for ${url}, returning cached result`);
      return staleCache.data;
    }
    // If no cache available, wait a moment and try again (better UX than error)
    const waitTime = RATE_LIMIT_WINDOW - (now - lastRequest);
    console.log(`[Scraper] Rate limited for ${url}, waiting ${waitTime}ms before retry`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    // After waiting, check cache again (in case another request populated it)
    const retryCache = cache.get(url);
    if (retryCache) {
      return retryCache.data;
    }
    // If still no cache, proceed with the request (rate limit window should be passed)
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
          linkDetails: [],
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
          linkDetails: [],
          wordCount: 0,
          error: 'Access forbidden (403). The website may be blocking automated requests.',
        };
      }
      return {
        url,
        title: '',
        content: '',
        existingLinks: [],
        linkDetails: [],
        wordCount: 0,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();

    // Parse HTML with cheerio
    const $ = cheerio.load(html);

    // Extract title - try multiple methods in order of preference
    let title = '';
    
    // Try og:title first (most reliable)
    title = $('meta[property="og:title"]').attr('content') || '';
    
    // Fall back to title tag
    if (!title || title.trim().length === 0) {
      title = $('title').text() || '';
    }
    
    // Fall back to meta name="title"
    if (!title || title.trim().length === 0) {
      title = $('meta[name="title"]').attr('content') || '';
    }
    
    // Last resort: H1
    if (!title || title.trim().length === 0) {
      title = $('h1').first().text() || '';
    }

    // Sanitize title: remove any HTML tags that might have slipped through
    // This handles cases where HTML is encoded or cheerio's .text() doesn't fully strip it
    title = title
      .replace(/<[^>]*>/g, '') // Remove any HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Decode &amp;
      .replace(/&lt;/g, '<') // Decode &lt;
      .replace(/&gt;/g, '>') // Decode &gt;
      .replace(/&quot;/g, '"') // Decode &quot;
      .replace(/&#39;/g, "'") // Decode &#39;
      .replace(/&apos;/g, "'") // Decode &apos;
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Check if title is actually a URL (starts with http/https)
    // Some websites incorrectly put URLs in their title tags
    if (title.startsWith('http://') || title.startsWith('https://')) {
      // Title is a URL, try to extract a better title from the URL path
      try {
        const urlObj = new URL(title);
        const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
        if (pathParts.length > 0) {
          // Use the last path segment, clean it up
          const lastPart = pathParts[pathParts.length - 1];
          title = lastPart
            .replace(/[-_]/g, ' ')
            .replace(/\.[^.]*$/, '') // Remove file extension
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        } else {
          // No path, try from the original URL
          title = '';
        }
      } catch {
        title = '';
      }
    }

    // If title is still empty or just whitespace, generate one from URL
    // (Content-based fallback will happen after content extraction)
    if (!title || title.trim().length === 0) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
        if (pathParts.length > 0) {
          // Create title from URL path segments
          const lastPart = pathParts[pathParts.length - 1];
          title = lastPart
            .replace(/[-_]/g, ' ')
            .replace(/\.[^.]*$/, '') // Remove file extension
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        } else {
          // Fallback to domain name
          title = urlObj.hostname.replace('www.', '');
        }
      } catch {
        title = ''; // Will be handled after content extraction
      }
    }

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

    // Final title fallback: if title is still empty or looks like a URL, use content
    if (!title || title.trim().length === 0 || title.startsWith('http')) {
      // Try to extract title from content
      const firstSentence = content.split(/[.!?]/).find(s => s.trim().length > 20);
      if (firstSentence) {
        title = firstSentence.trim().substring(0, 100);
      } else if (!title || title.trim().length === 0) {
        // Last resort: use URL path or domain
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
          if (pathParts.length > 0) {
            const lastPart = pathParts[pathParts.length - 1];
            title = lastPart
              .replace(/[-_]/g, ' ')
              .replace(/\.[^.]*$/, '')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          } else {
            title = urlObj.hostname.replace('www.', '').replace(/^./, (c) => c.toUpperCase());
          }
        } catch {
          title = 'Untitled Article';
        }
      }
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

    // Clean up old rate limit entries (always clean up, not just when >1000)
    const cleanupCutoff = Date.now() - RATE_LIMIT_WINDOW;
    Array.from(rateLimit.entries()).forEach(([key, timestamp]) => {
      if (timestamp < cleanupCutoff) {
        rateLimit.delete(key);
      }
    });

    return result;
  } catch (error: any) {
    // Handle various error types
    if (error.name === 'AbortError') {
      return {
        url,
        title: '',
        content: '',
        existingLinks: [],
        linkDetails: [],
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
        linkDetails: [],
        wordCount: 0,
        error: 'Could not connect to the website. Please check if the URL is accessible.',
      };
    }

    return {
      url,
      title: '',
      content: '',
      existingLinks: [],
      linkDetails: [],
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

/**
 * Extracts structured HTML data for SEO/AEO audit
 * This function parses the HTML to extract all elements needed for content auditing
 * @param url - The URL being analyzed
 * @param html - The HTML content to parse
 * @param providedPrimaryKeyword - Optional primary keyword provided by the user (if not provided, will not infer)
 */
export async function extractStructuredContent(url: string, html: string, providedPrimaryKeyword?: string): Promise<StructuredContent> {
  const $ = cheerio.load(html);
  
  // Extract title tag - try multiple methods
  let titleTag = $('title').text().trim() || null;
  
  // If title is empty, try og:title
  if (!titleTag || titleTag.length === 0) {
    titleTag = $('meta[property="og:title"]').attr('content')?.trim() || null;
  }
  
  // If still empty, try meta title
  if (!titleTag || titleTag.length === 0) {
    titleTag = $('meta[name="title"]').attr('content')?.trim() || null;
  }
  
  // Decode HTML entities in title
  if (titleTag) {
    titleTag = titleTag
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  const titleTagLength = titleTag ? titleTag.length : 0;
  
  // Extract meta description
  const metaDescription = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || 
                         null;
  const metaDescriptionLength = metaDescription ? metaDescription.length : 0;
  
  // Extract headers
  const h1Elements = $('h1');
  const h1Count = h1Elements.length;
  const h1Text = h1Elements.first().text().trim() || null;
  
  const h2Count = $('h2').length;
  const h3Count = $('h3').length;
  const h4Count = $('h4').length;
  const h5Count = $('h5').length;
  const h6Count = $('h6').length;
  
  // Collect all headers with their levels
  const headers: Array<{ level: number; text: string }> = [];
  for (let i = 1; i <= 6; i++) {
    $(`h${i}`).each((_, el) => {
      headers.push({
        level: i,
        text: $(el).text().trim(),
      });
    });
  }
  
  // Extract images
  const images: Array<{ src: string; alt: string | null; hasAlt: boolean }> = [];
  let imagesWithoutAlt = 0;
  
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || null;
    const hasAlt = !!alt && alt.trim().length > 0;
    
    if (!hasAlt) {
      imagesWithoutAlt++;
    }
    
    // Convert relative URLs to absolute
    try {
      const absoluteSrc = src ? new URL(src, url).toString() : '';
      if (absoluteSrc) {
        images.push({ src: absoluteSrc, alt, hasAlt });
      }
    } catch {
      // Skip invalid URLs
    }
  });
  
  // Extract links and separate internal vs external
  const baseUrl = new URL(url);
  const internalLinks: Array<{ url: string; anchorText: string }> = [];
  const externalLinks: Array<{ url: string; anchorText: string }> = [];
  
  $('a[href]').each((_, el) => {
    const $link = $(el);
    const href = $link.attr('href');
    const anchorText = $link.text().trim();
    
    if (href) {
      try {
        const absoluteUrl = new URL(href, url).toString();
        
        // Determine if internal or external
        const linkUrl = new URL(absoluteUrl);
        const isInternal = linkUrl.hostname === baseUrl.hostname || 
                          linkUrl.hostname.replace('www.', '') === baseUrl.hostname.replace('www.', '');
        
        if (isInternal && !absoluteUrl.startsWith('#') && !absoluteUrl.includes('mailto:') && !absoluteUrl.includes('tel:')) {
          internalLinks.push({ url: absoluteUrl, anchorText });
        } else if (!isInternal && !absoluteUrl.startsWith('#') && !absoluteUrl.includes('mailto:') && !absoluteUrl.includes('tel:')) {
          externalLinks.push({ url: absoluteUrl, anchorText });
        }
      } catch {
        // Skip invalid URLs
      }
    }
  });
  
  // Extract paragraphs with word counts
  const paragraphs: Array<{ text: string; wordCount: number }> = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 0) {
      const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
      paragraphs.push({ text, wordCount });
    }
  });
  
  // Extract lists
  const lists: Array<{ type: 'ul' | 'ol'; itemCount: number }> = [];
  $('ul, ol').each((_, el) => {
    if (el.type !== 'tag') return;
    const type = el.tagName.toLowerCase() === 'ul' ? 'ul' : 'ol';
    const itemCount = $(el).find('li').length;
    if (itemCount > 0) {
      lists.push({ type, itemCount });
    }
  });
  
  // Count tables
  const tables = $('table').length;
  
  // Extract FAQ sections (look for common FAQ patterns)
  const faqSections: Array<{ questions: string[]; formattedWithHeaders: boolean }> = [];
  
  // Pattern 1: FAQ sections with H3/H4 headers
  $('h3, h4').each((_, el) => {
    const headerText = $(el).text().trim();
    // Check if header looks like a question
    if (headerText.includes('?') || headerText.toLowerCase().includes('faq') || 
        headerText.toLowerCase().includes('question')) {
      const questions: string[] = [];
      let formattedWithHeaders = true;
      
      // Collect questions from this section
      let current = $(el).next();
      while (current.length > 0 && !current.is('h1, h2, h3, h4')) {
        if (current.is('h3, h4') && current.text().trim().includes('?')) {
          questions.push(current.text().trim());
        }
        current = current.next();
      }
      
      if (questions.length > 0) {
        faqSections.push({ questions, formattedWithHeaders: true });
      }
    }
  });
  
  // Pattern 2: FAQ sections with question/answer pairs (common FAQ plugins)
  $('.faq, .faq-item, [class*="faq"], [class*="question"]').each((_, el) => {
    const $faq = $(el);
    const question = $faq.find('h3, h4, .question, [class*="question"]').first().text().trim();
    if (question && question.length > 0) {
      const questions: string[] = [question];
      const formattedWithHeaders = $faq.find('h3, h4').length > 0;
      faqSections.push({ questions, formattedWithHeaders });
    }
  });
  
  // Extract first sentence and first 100 words
  // First, remove unwanted elements to get clean content
  const $clean = cheerio.load(html);
  $clean('nav, footer, header, aside, .sidebar, .navigation, .menu, .ad, .advertisement, .ads, script, style, iframe, noscript, .cookie-banner, .newsletter-signup').remove();
  
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '#main-content',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.main-content',
    '.post-body',
    '#content',
  ];
  
  let mainContent = '';
  for (const selector of contentSelectors) {
    const $content = $clean(selector).first();
    if ($content.length > 0) {
      mainContent = $content.text();
      if (mainContent.trim().length > 100) {
        break;
      }
    }
  }
  
  // If no main content found, try to find the first substantial paragraph or div
  if (!mainContent || mainContent.trim().length < 100) {
    // Try to find the first paragraph with substantial content
    const $firstParagraph = $clean('p').filter((_, el) => {
      const text = $clean(el).text().trim();
      return text.length > 50; // At least 50 characters
    }).first();
    
    if ($firstParagraph.length > 0) {
      // Get the paragraph and its siblings/children for context
      const $section = $firstParagraph.closest('section, div.content, div.post, article, main');
      if ($section.length > 0) {
        mainContent = $section.text();
      } else {
        mainContent = $firstParagraph.text();
      }
    }
  }
  
  // Last resort: use body but exclude common non-content elements
  if (!mainContent || mainContent.trim().length < 100) {
    $clean('nav, footer, header, aside, .sidebar, .navigation, .menu, .ad, .advertisement, .ads, script, style, iframe, noscript, .cookie-banner, .newsletter-signup, .breadcrumb, .breadcrumbs').remove();
    mainContent = $clean('body').text();
  }
  
  // Get first sentence
  const firstSentenceMatch = mainContent.match(/^[^.!?]+[.!?]/);
  const firstSentence = firstSentenceMatch ? firstSentenceMatch[0].trim() : null;
  
  // Get first 100 words
  const words = mainContent.split(/\s+/).filter(w => w.length > 0);
  const first100Words = words.slice(0, 100).join(' ');
  
  // Use provided primary keyword if available, otherwise don't infer
  let primaryKeyword: string | null = null;
  let primaryKeywordInferred = false;
  
  if (providedPrimaryKeyword && providedPrimaryKeyword.trim()) {
    // Use the keyword provided by the user
    primaryKeyword = providedPrimaryKeyword.trim();
    primaryKeywordInferred = false; // Not inferred, it was provided
  }
  // If no keyword provided, we don't infer it - leave it as null
  
  // Extract URL slug
  let urlSlug = '';
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
    urlSlug = pathParts[pathParts.length - 1] || '';
  } catch {
    urlSlug = '';
  }
  
  // Calculate word count
  const wordCount = mainContent.split(/\s+/).filter(w => w.length > 0).length;
  
  // Content structure flags
  const contentStructure = {
    hasBullets: lists.some(l => l.type === 'ul'),
    hasNumberedLists: lists.some(l => l.type === 'ol'),
    hasTables: tables > 0,
    hasFaq: faqSections.length > 0,
  };
  
  return {
    titleTag,
    titleTagLength,
    metaDescription,
    metaDescriptionLength,
    h1Count,
    h1Text,
    h2Count,
    h3Count,
    h4Count,
    h5Count,
    h6Count,
    headers,
    images,
    imagesWithoutAlt,
    internalLinks,
    internalLinkCount: internalLinks.length,
    externalLinks,
    externalLinkCount: externalLinks.length,
    paragraphs,
    lists,
    tables,
    faqSections,
    firstSentence,
    first100Words,
    primaryKeyword,
    primaryKeywordInferred,
    urlSlug,
    wordCount,
    contentStructure,
  };
}

