import * as cheerio from 'cheerio';
import { getUrlsFromSitemap, crawlSiteForUrls } from '@/lib/crawlers/site-crawler';

export interface SitePage {
  url: string;
  title: string | null;
  publishedDate: Date | null;
}

export interface SiteScanResult {
  siteUrl: string;
  totalPages: number;
  pages: SitePage[];
  scannedAt: Date;
  method: 'sitemap' | 'rss' | 'crawl';
}

export interface PageMetadata {
  url: string;
  title: string;
  wordCount: number;
  publishedDate: Date | null;
  contentPreview: string;
}

/**
 * Normalize a URL by removing fragments and normalizing trailing slashes
 * e.g., https://example.com/page#main-content -> https://example.com/page
 *       https://example.com/page/ -> https://example.com/page
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove fragment
    urlObj.hash = '';
    // Normalize path (remove trailing slash except for root)
    let path = urlObj.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    urlObj.pathname = path;
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Check if a URL is under the site URL path
 * e.g., https://example.com/site/page is under https://example.com/site/
 * but https://example.com/other is not
 */
function isUrlUnderSitePath(url: string, siteUrl: string): boolean {
  try {
    const urlObj = new URL(url);
    const siteObj = new URL(siteUrl);

    // Must be same domain and protocol
    if (urlObj.hostname !== siteObj.hostname || urlObj.protocol !== siteObj.protocol) {
      return false;
    }

    // Normalize paths (remove trailing slashes for comparison)
    let sitePath = siteObj.pathname;
    if (sitePath.length > 1 && sitePath.endsWith('/')) {
      sitePath = sitePath.slice(0, -1);
    }
    
    let urlPath = urlObj.pathname;
    if (urlPath.length > 1 && urlPath.endsWith('/')) {
      urlPath = urlPath.slice(0, -1);
    }

    // If site path is root (/), accept all URLs from that domain
    if (sitePath === '' || sitePath === '/') {
      return true;
    }

    // URL path must start with site path
    return urlPath === sitePath || urlPath.startsWith(sitePath + '/');
  } catch {
    return false;
  }
}

/**
 * Scan a site to discover all pages
 * Tries sitemap first, then RSS feed, then crawls homepage
 * Only includes URLs that are under the site URL path
 * @param maxPages - Optional limit on the number of pages to return
 */
export async function scanSite(siteUrl: string, maxPages?: number): Promise<SiteScanResult> {
  // Normalize URL (ensure it has protocol)
  let normalizedUrl = siteUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    new URL(normalizedUrl);
  } catch {
    throw new Error('Invalid site URL format');
  }

  const pages: SitePage[] = [];
  let method: 'sitemap' | 'rss' | 'crawl' = 'crawl';

  // Step 1: Try sitemap
  try {
    const sitemapUrls = await getUrlsFromSitemap(normalizedUrl);
    if (sitemapUrls.length > 0) {
      method = 'sitemap';
      const seenUrls = new Set<string>();
      for (const url of sitemapUrls) {
        // Only include URLs that are under the site path
        if (isUrlUnderSitePath(url, normalizedUrl)) {
          const normalized = normalizeUrl(url);
          // Deduplicate by normalized URL
          if (!seenUrls.has(normalized)) {
            seenUrls.add(normalized);
            pages.push({
              url: normalized, // Store normalized URL
              title: null, // Will be fetched in getPageMetadata
              publishedDate: null, // Will be fetched in getPageMetadata
            });
          }
        }
      }
      // Apply maxPages limit if specified
      const limitedPages = maxPages ? pages.slice(0, maxPages) : pages;
      console.log(`[Site Scanner] Found ${limitedPages.length} pages via sitemap (filtered and deduplicated from ${sitemapUrls.length} total URLs${maxPages ? `, limited to ${maxPages}` : ''})`);
      return {
        siteUrl: normalizedUrl,
        totalPages: limitedPages.length,
        pages: limitedPages,
        scannedAt: new Date(),
        method: 'sitemap',
      };
    }
  } catch (error) {
    console.log('[Site Scanner] Sitemap not found or error:', error);
  }

  // Step 2: Try RSS feed
  try {
    const rssUrls = [
      `${normalizedUrl}/feed`,
      `${normalizedUrl}/rss`,
      `${normalizedUrl}/rss.xml`,
      `${normalizedUrl}/feed.xml`,
      `${normalizedUrl}/atom.xml`,
    ];

    for (const rssUrl of rssUrls) {
      try {
        const response = await fetch(rssUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (response.ok) {
          const xml = await response.text();
          const $ = cheerio.load(xml, { xmlMode: true });

          // Parse RSS/Atom feed
          const allRssPages: SitePage[] = [];
          $('item > link, entry > link[rel="alternate"]').each((_, el) => {
            const url = $(el).text().trim() || $(el).attr('href');
            if (url) {
              let title = $(el).closest('item, entry').find('title').first().text().trim() || null;
              
              // Sanitize title: remove any HTML tags
              if (title) {
                title = title
                  .replace(/<[^>]*>/g, '') // Remove any HTML tags
                  .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
                  .replace(/&amp;/g, '&') // Decode &amp;
                  .replace(/&lt;/g, '<') // Decode &lt;
                  .replace(/&gt;/g, '>') // Decode &gt;
                  .replace(/&quot;/g, '"') // Decode &quot;
                  .replace(/&#39;/g, "'") // Decode &#39;
                  .replace(/\s+/g, ' ') // Normalize whitespace
                  .trim();
              }
              
              const pubDateText = $(el).closest('item, entry').find('pubDate, published, updated').first().text().trim();
              
              // Parse date with better error handling
              let publishedDate: Date | null = null;
              if (pubDateText) {
                const testDate = new Date(pubDateText);
                // Validate the date is reasonable
                if (!isNaN(testDate.getTime()) && testDate.getFullYear() > 2000 && testDate.getFullYear() <= new Date().getFullYear() + 1) {
                  publishedDate = testDate;
                }
              }
              
              // Only include URLs that are under the site path
              if (isUrlUnderSitePath(url, normalizedUrl)) {
                const normalized = normalizeUrl(url);
                allRssPages.push({
                  url: normalized, // Store normalized URL
                  title,
                  publishedDate,
                });
              }
            }
          });

          if (allRssPages.length > 0) {
            method = 'rss';
            // Deduplicate RSS pages by normalized URL
            const seenUrls = new Set<string>();
            for (const page of allRssPages) {
              const normalized = normalizeUrl(page.url);
              if (!seenUrls.has(normalized)) {
                seenUrls.add(normalized);
                pages.push({
                  ...page,
                  url: normalized,
                });
              }
            }
            // Apply maxPages limit if specified
            const limitedPages = maxPages ? pages.slice(0, maxPages) : pages;
            console.log(`[Site Scanner] Found ${limitedPages.length} pages via RSS feed (filtered and deduplicated${maxPages ? `, limited to ${maxPages}` : ''})`);
            return {
              siteUrl: normalizedUrl,
              totalPages: limitedPages.length,
              pages: limitedPages,
              scannedAt: new Date(),
              method: 'rss',
            };
          }
        }
      } catch {
        // Try next RSS URL
        continue;
      }
    }
  } catch (error) {
    console.log('[Site Scanner] RSS feed not found or error:', error);
  }

  // Step 3: Fallback to crawling homepage
  try {
    const crawlResult = await crawlSiteForUrls(normalizedUrl, 100); // Limit to 100 for free scan
    method = 'crawl';
    
    // Deduplicate crawled URLs by normalized URL
    const seenUrls = new Set<string>();
    for (const url of crawlResult.urls) {
      // Only include URLs that are under the site path
      if (isUrlUnderSitePath(url, normalizedUrl)) {
        const normalized = normalizeUrl(url);
        if (!seenUrls.has(normalized)) {
          seenUrls.add(normalized);
          pages.push({
            url: normalized, // Store normalized URL
            title: null,
            publishedDate: null,
          });
        }
      }
    }

    // Apply maxPages limit if specified
    const limitedPages = maxPages ? pages.slice(0, maxPages) : pages;
    console.log(`[Site Scanner] Found ${limitedPages.length} pages via crawling (filtered and deduplicated${maxPages ? `, limited to ${maxPages}` : ''})`);
    return {
      siteUrl: normalizedUrl,
      totalPages: limitedPages.length,
      pages: limitedPages,
      scannedAt: new Date(),
      method: 'crawl',
    };
  } catch (error) {
    throw new Error(`Failed to scan site: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get metadata for a single page
 * Fetches the page and extracts title, word count, affiliate links, and date
 * @param getUserMetadata - If false, only fetches title and date (saves resources for free users)
 */
export async function getPageMetadata(pageUrl: string, getUserMetadata: boolean = true): Promise<PageMetadata> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    let title =
      $('h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      'Untitled Page';
    
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
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Extract published date (always needed)
    let publishedDate: Date | null = null;
    
    // Helper function to parse and validate dates
    const parseDate = (dateString: string | null | undefined): Date | null => {
      if (!dateString || !dateString.trim()) return null;
      
      const trimmed = dateString.trim();
      
      // Try parsing the date
      let testDate = new Date(trimmed);
      
      // If that fails, try parsing common formats manually
      if (isNaN(testDate.getTime())) {
        // Try to parse "October 7, 2025" format manually
        const monthNameMatch = trimmed.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
        if (monthNameMatch) {
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                             'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIndex = monthNames.indexOf(monthNameMatch[1].toLowerCase());
          const day = parseInt(monthNameMatch[2], 10);
          const year = parseInt(monthNameMatch[3], 10);
          
          if (monthIndex >= 0 && day >= 1 && day <= 31 && year >= 1970) {
            testDate = new Date(year, monthIndex, day);
          }
        }
      }
      
      // Check if date is valid
      if (isNaN(testDate.getTime())) {
        return null;
      }
      
      // Additional validation: date should be between 1970 and 10 years from now
      const year = testDate.getFullYear();
      const maxYear = new Date().getFullYear() + 10;
      if (year < 1970 || year > maxYear) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Date Extraction] Date rejected (out of range): ${trimmed} -> year ${year}`);
        }
        return null;
      }
      
      return testDate;
    };
    
    // Try meta tags first (comprehensive list - ordered by likelihood)
    const metaDateSelectors = [
      'meta[property="article:published_time"]',
      'meta[property="article:published"]',
      'meta[property="og:published_time"]',
      'meta[name="date"]',
      'meta[name="publishdate"]',
      'meta[name="pubdate"]',
      'meta[name="DC.date"]',
      'meta[name="DC.Date"]',
      'meta[itemprop="datePublished"]',
      'meta[name="sailthru.date"]',
      'meta[name="parsely-pub-date"]',
      'meta[name="publish_date"]',
      'meta[name="publication_date"]',
      'meta[name="created"]',
      'meta[name="created_date"]',
    ];
    
    for (const selector of metaDateSelectors) {
      const dateValue = $(selector).attr('content');
      if (dateValue) {
        publishedDate = parseDate(dateValue);
        if (publishedDate) break;
      }
    }
    
    // Try time elements and check their text content too
    if (!publishedDate) {
      const timeSelectors = [
        'time[datetime]',
        'time[pubdate]',
        'time[itemprop="datePublished"]',
        'time',
      ];
      
      for (const selector of timeSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          // Try datetime attribute first
          const datetimeAttr = element.attr('datetime');
          if (datetimeAttr) {
            publishedDate = parseDate(datetimeAttr);
            if (publishedDate) break;
          }
          
          // Then try text content
          const timeText = element.text().trim();
          if (timeText) {
            publishedDate = parseDate(timeText);
            if (publishedDate) break;
          }
        }
      }
    }
    
    // Try itemprop elements
    if (!publishedDate) {
      const itempropSelectors = [
        '[itemprop="datePublished"]',
        '[itemprop="dateCreated"]',
        '[itemprop="date"]',
      ];
      
      for (const selector of itempropSelectors) {
        const dateValue = $(selector).first().attr('content') || $(selector).first().attr('datetime') || $(selector).first().text().trim();
        if (dateValue) {
          publishedDate = parseDate(dateValue);
          if (publishedDate) break;
        }
      }
    }

    // Try to find date in visible text even if getUserMetadata is false
    // This helps users without credits still get dates
    // Prioritize header elements where dates are commonly found
    if (!publishedDate) {
      // First, try to find dates near calendar icons (common pattern)
      // Look for SVG elements with calendar paths, then check sibling/child text
      $('svg').each((_, svgEl) => {
        if (publishedDate) return false; // Break loop if date found
        
        const $svg = $(svgEl);
        const svgPath = $svg.find('path').attr('d') || '';
        const svgViewBox = $svg.attr('viewBox') || '';
        // Check if this is a calendar icon (common calendar SVG path patterns)
        // Look for calendar icon patterns: M6 2 (common in Heroicons), viewBox="0 0 20 20", or calendar-related paths
        const isCalendarIcon = svgPath.includes('M6 2') || 
                              svgPath.includes('M6') && svgPath.includes('V6') ||
                              svgPath.includes('calendar') ||
                              (svgViewBox.includes('20 20') && svgPath.length > 50 && svgPath.includes('evenodd')) ||
                              ($svg.find('path[fill-rule="evenodd"]').length > 0 && svgPath.length > 50);
        
        if (isCalendarIcon) {
          // Check the parent container and siblings for date text
          const $parent = $svg.parent();
          const $container = $parent.parent();
          
          // Get text from parent, container, and siblings
          const searchText = [
            $parent.text(),
            $container.text(),
            $svg.next().text(),
            $svg.siblings('span').text(),
            $svg.siblings('div').text(),
          ].join(' ');
          
          // Try to find date in this text
          const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i;
          const match = searchText.match(datePattern);
          if (match && match[0]) {
            const testDate = parseDate(match[0]);
            if (testDate) {
              publishedDate = testDate;
              if (process.env.NODE_ENV === 'development') {
                console.log(`[Date Extraction] Found date near calendar icon: ${match[0]} -> ${testDate.toISOString()}`);
              }
              return false; // Break loop
            }
          }
        }
      });
      
      // Then try header elements specifically
      if (!publishedDate) {
        const headerSelectors = [
          'header .date',
          'header .published',
          'header .post-date',
          'header .entry-date',
          'header .publish-date',
          'header time',
          'article > header',
          'article header',
          '.post header',
          '.entry header',
          'header',
          '.post-meta',
          '.entry-meta',
          '.post-header',
          '.entry-header',
          '.article-header',
          '.date',
          '.published',
          '.publish-date',
          '.post-date',
          '.entry-date',
          // Add selectors for flex containers with dates (like the user's site)
          'main section div[class*="flex"]',
          'main section div[class*="meta"]',
          'section div[class*="flex"]',
        ];
        
        // Try each header selector individually to find dates
        for (const selector of headerSelectors) {
          if (publishedDate) break;
          
          const element = $(selector).first();
          if (element.length > 0) {
            const headerText = element.text().trim();
            if (headerText) {
              // Try date patterns in this specific header element
              const datePatterns = [
                // Full month name with comma: October 7, 2025 (most common format)
                /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
                // ISO format with time: 2024-01-15T10:30:00Z
                /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})?)/,
                // ISO format: 2024-01-15
                /(\d{4}-\d{2}-\d{2})/,
                // Short month: Jan 15, 2024 or Jan. 15, 2024
                /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/i,
                // Day first: 15 January 2024
                /(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
                // US format: 1/15/2024 or 01/15/2024
                /(\d{1,2}\/\d{1,2}\/\d{4})/,
                // With day name: Monday, January 15, 2024
                /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
              ];

              for (const pattern of datePatterns) {
                const match = headerText.match(pattern);
                if (match && match[0]) {
                  const testDate = parseDate(match[0]);
                  if (testDate) {
                    publishedDate = testDate;
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`[Date Extraction] Found date in header (${selector}): ${match[0]} -> ${testDate.toISOString()}`);
                    }
                    break;
                  }
                }
              }
            }
          }
        }
      }
      
      // If still not found, check main section specifically (common in modern sites)
      if (!publishedDate) {
        const mainSection = $('main section').first();
        if (mainSection.length > 0) {
          const sectionText = mainSection.text();
          const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i;
          const match = sectionText.match(datePattern);
          if (match && match[0]) {
            const testDate = parseDate(match[0]);
            if (testDate) {
              publishedDate = testDate;
              if (process.env.NODE_ENV === 'development') {
                console.log(`[Date Extraction] Found date in main section: ${match[0]} -> ${testDate.toISOString()}`);
              }
            }
          }
        }
      }
      
      // If still not found, try broader content areas
      if (!publishedDate) {
        const sampleSelectors = [
          'main',
          'article',
          '.post',
          '.entry',
          '.content',
        ];
        let sampleText = '';
        
        for (const selector of sampleSelectors) {
          const element = $(selector).first();
          if (element.length > 0) {
            sampleText = element.text().substring(0, 5000); // Increased to 5000 chars to catch dates further down
            if (sampleText.trim()) break;
          }
        }
        
        // If no specific content area, try body but remove scripts and styles
        if (!sampleText.trim()) {
          $('script, style, nav, footer, aside').remove();
          // Don't remove header - dates might be in page headers
          sampleText = $('body').text().substring(0, 5000);
        }

        // Try date patterns in the sample text
        if (sampleText) {
          const datePatterns = [
            // Full month name with comma: October 7, 2025 (prioritize this format)
            /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
            // ISO format with time: 2024-01-15T10:30:00Z
            /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})?)/,
            // ISO format: 2024-01-15
            /(\d{4}-\d{2}-\d{2})/,
            // Short month: Jan 15, 2024 or Jan. 15, 2024
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/i,
            // Day first: 15 January 2024
            /(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
            // US format: 1/15/2024 or 01/15/2024
            /(\d{1,2}\/\d{1,2}\/\d{4})/,
            // With day name: Monday, January 15, 2024
            /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
          ];

          for (const pattern of datePatterns) {
            const match = sampleText.match(pattern);
            if (match && match[0]) {
              const testDate = parseDate(match[0]);
              if (testDate) {
                publishedDate = testDate;
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[Date Extraction] Found date in content: ${match[0]} -> ${testDate.toISOString()}`);
                }
                break;
              }
            }
          }
        }
      }
    }

    // If getUserMetadata is false, skip expensive operations (word count, affiliate links, content preview)
    if (!getUserMetadata) {
      return {
        url: pageUrl,
        title,
        wordCount: 0,
        publishedDate,
        contentPreview: '',
      };
    }

    // Extract main content (only for users with credits)
    const contentSelectors = [
      'article',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.post',
      '.article-content',
    ];

    let mainContent = '';
    for (const selector of contentSelectors) {
      const content = $(selector).first();
      if (content.length > 0) {
        mainContent = content.text();
        break;
      }
    }

    // If no main content found, use body but remove nav, footer, etc.
    if (!mainContent) {
      $('nav, footer, header, aside, .sidebar, .menu').remove();
      mainContent = $('body').text();
    }

    // Count words
    const wordCount = mainContent
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    // Try to find date in content if not found in meta tags (for users with credits)
    if (!publishedDate && mainContent) {
      // Get first 5000 chars (should contain date if it's in the content)
      const contentSample = mainContent.substring(0, 5000);
      
      const datePatterns = [
        // ISO format with time: 2024-01-15T10:30:00Z or 2024-01-15T10:30:00+00:00
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})?)/,
        // ISO format: 2024-01-15
        /(\d{4}-\d{2}-\d{2})/,
        // Full month name: January 15, 2024 or January 15 2024
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
        // Short month: Jan 15, 2024 or Jan. 15, 2024
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/i,
        // Day first: 15 January 2024
        /(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
        // US format: 1/15/2024 or 01/15/2024
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        // With day name: Monday, January 15, 2024
        /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
      ];

      for (const pattern of datePatterns) {
        const match = contentSample.match(pattern);
        if (match && match[0]) {
          const testDate = parseDate(match[0]);
          if (testDate) {
            publishedDate = testDate;
            break;
          }
        }
      }
    }
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      if (!publishedDate) {
        console.log(`[Date Extraction] No date found for ${pageUrl}`);
      } else {
        console.log(`[Date Extraction] Found date for ${pageUrl}: ${publishedDate.toISOString()}`);
      }
    }

    // Get content preview (first 200 chars)
    const contentPreview = mainContent.substring(0, 200).trim() + (mainContent.length > 200 ? '...' : '');

    return {
      url: pageUrl,
      title,
      wordCount,
      publishedDate,
      contentPreview,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Timeout while fetching page');
    }
    throw new Error(`Failed to fetch page metadata: ${error.message || 'Unknown error'}`);
  }
}

