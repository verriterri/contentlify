import * as cheerio from 'cheerio';

export interface CrawlResult {
  urls: string[];
  errors: Array<{ url: string; error: string }>;
}

/**
 * Normalize URL to ensure consistent path comparison
 * Removes trailing slash and normalizes the path
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove trailing slash from pathname (except for root)
    let pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    urlObj.pathname = pathname;
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Check if a URL is under the root URL path
 * e.g., https://example.com/blog/page is under https://example.com/blog
 * but https://example.com/other is not
 */
function isUrlUnderRoot(absoluteUrl: string, rootUrl: string): boolean {
  try {
    const normalizedUrl = normalizeUrl(absoluteUrl);
    const normalizedRoot = normalizeUrl(rootUrl);

    // URLs must match exactly or the URL must start with the root URL
    if (normalizedUrl === normalizedRoot) {
      return true;
    }

    // Check if the URL path starts with the root URL path
    const urlObj = new URL(normalizedUrl);
    const rootObj = new URL(normalizedRoot);

    // Must be same domain
    if (urlObj.hostname !== rootObj.hostname) {
      return false;
    }

    // Must be same protocol
    if (urlObj.protocol !== rootObj.protocol) {
      return false;
    }

    // Check if path starts with root path
    const rootPath = rootObj.pathname === '/' ? '' : rootObj.pathname;
    const urlPath = urlObj.pathname;

    // Exact match or URL path starts with root path + /
    return urlPath === rootPath || urlPath.startsWith(rootPath + '/');
  } catch {
    return false;
  }
}

/**
 * Extract all links from a page that are under the root URL path
 * Only crawls URLs that start with the root URL path
 */
export async function crawlSiteForUrls(
  rootUrl: string,
  maxUrls: number = 50
): Promise<CrawlResult> {
  const visited = new Set<string>();
  const toVisit: string[] = [rootUrl];
  const urls: string[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  try {
    const rootUrlObj = new URL(rootUrl);
    const rootDomain = rootUrlObj.hostname;
    const normalizedRoot = normalizeUrl(rootUrl);

    while (toVisit.length > 0 && urls.length < maxUrls) {
      const currentUrl = toVisit.shift()!;

      if (visited.has(currentUrl)) {
        continue;
      }

      visited.add(currentUrl);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout per page

        const response = await fetch(currentUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          errors.push({ url: currentUrl, error: `HTTP ${response.status}` });
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract all links
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (!href) return;

          try {
            // Convert relative URLs to absolute
            const absoluteUrl = new URL(href, currentUrl).toString();

            // Only include URLs that are under the root URL path
            if (
              isUrlUnderRoot(absoluteUrl, normalizedRoot) &&
              !visited.has(absoluteUrl) &&
              !toVisit.includes(absoluteUrl) &&
              urls.length < maxUrls
            ) {
              const urlObj = new URL(absoluteUrl);
              // Filter out common non-content URLs
              const path = urlObj.pathname.toLowerCase();
              const excluded = [
                '/wp-admin',
                '/wp-content',
                '/wp-includes',
                '/feed',
                '/rss',
                '/atom',
                '.xml',
                '.pdf',
                '.jpg',
                '.png',
                '.gif',
                '#',
              ];

              const shouldExclude = excluded.some((ex) => path.includes(ex));

              if (!shouldExclude && urlObj.protocol.startsWith('http')) {
                toVisit.push(absoluteUrl);
              }
            }
          } catch {
            // Skip invalid URLs
          }
        });

        urls.push(currentUrl);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          errors.push({ url: currentUrl, error: 'Timeout' });
        } else {
          errors.push({ url: currentUrl, error: error.message || 'Unknown error' });
        }
      }
    }

    return { urls, errors };
  } catch (error: any) {
    return {
      urls: [],
      errors: [{ url: rootUrl, error: error.message || 'Failed to crawl site' }],
    };
  }
}

/**
 * Try to get URLs from sitemap.xml first (more efficient)
 * Only returns URLs that are under the root URL path
 */
export async function getUrlsFromSitemap(rootUrl: string): Promise<string[]> {
  const sitemapUrls = [
    `${rootUrl}/sitemap.xml`,
    `${rootUrl}/sitemap_index.xml`,
    `${rootUrl}/wp-sitemap.xml`,
  ];

  const normalizedRoot = normalizeUrl(rootUrl);

  for (const sitemapUrl of sitemapUrls) {
    try {
      const response = await fetch(sitemapUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (response.ok) {
        const xml = await response.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        const urls: string[] = [];
        $('url > loc, sitemap > loc').each((_, el) => {
          const url = $(el).text().trim();
          if (url) {
            // Only include URLs that are under the root URL path
            if (isUrlUnderRoot(url, normalizedRoot)) {
              urls.push(url);
            }
          }
        });

        if (urls.length > 0) {
          return urls;
        }
      }
    } catch {
      // Try next sitemap
      continue;
    }
  }

  return [];
}

