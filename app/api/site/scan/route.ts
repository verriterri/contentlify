import { NextRequest, NextResponse } from 'next/server';
import { scanSite, getPageMetadata } from '@/lib/scrapers/site-scanner';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceRoleKey } from '@/lib/supabase';

/**
 * POST /api/site/scan
 * Scans a site to discover all pages and get metadata
 * Free - no credits charged (scanning doesn't use AI)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { siteUrl, maxPages } = body;

    if (!siteUrl || typeof siteUrl !== 'string') {
      return NextResponse.json(
        { error: 'siteUrl is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      let normalizedUrl = siteUrl.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid site URL format' },
        { status: 400 }
      );
    }

    // Step 1: Get user info for database storage (no credit checking needed)
    const cookieStore = await cookies();
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();
    
    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', options);
        },
      },
    });
    
    const { data: { user } } = await supabaseAuth.auth.getUser();
    const isAnonymous = !user;

    // Step 2: Scan site to find all pages
    console.log(`[Site Scan] Scanning site: ${siteUrl}${maxPages ? ` (limited to ${maxPages} pages)` : ''}`);
    const scanResult = await scanSite(siteUrl, maxPages);
    
    if (scanResult.pages.length === 0) {
      return NextResponse.json(
        { error: 'No pages found. Make sure the site URL is correct and accessible.' },
        { status: 404 }
      );
    }

    // Step 3: Get metadata for each page
    // Process all pages found (or up to maxPages if scan was limited)
    const pagesToScan = scanResult.pages;
    const pageMetadata: Array<{
      url: string;
      title: string;
      wordCount: number;
      publishedDate: string | null;
    }> = [];

    // Process pages in batches to avoid overwhelming the server
    const batchSize = 10;
    const totalPages = pagesToScan.length;
    
    // Create a streaming response for progress updates
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let cancelled = false;
        
        // Check for abort signal
        req.signal?.addEventListener('abort', () => {
          cancelled = true;
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'cancelled',
            message: 'Scan cancelled by user'
          }) + '\n'));
          controller.close();
        });
        
        // Send initial progress
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'progress',
          current: 0,
          total: totalPages,
          message: `Found ${totalPages} pages. Starting to process...`
        }) + '\n'));
        
        for (let i = 0; i < pagesToScan.length; i += batchSize) {
          if (cancelled || req.signal?.aborted) {
            break;
          }
          
          const batch = pagesToScan.slice(i, i + batchSize);
          
          // Always fetch full metadata including word counts
          const batchResults = await Promise.allSettled(
            batch.map((page) => getPageMetadata(page.url, true))
          );

          for (const result of batchResults) {
            if (result.status === 'fulfilled') {
              // Normalize URL to remove fragments
              const normalizedUrl = (() => {
                try {
                  const urlObj = new URL(result.value.url);
                  urlObj.hash = '';
                  let path = urlObj.pathname;
                  if (path.length > 1 && path.endsWith('/')) {
                    path = path.slice(0, -1);
                  }
                  urlObj.pathname = path;
                  return urlObj.toString();
                } catch {
                  return result.value.url;
                }
              })();

              // Always include word count for all users
              pageMetadata.push({
                url: normalizedUrl,
                title: result.value.title,
                wordCount: result.value.wordCount,
                publishedDate: result.value.publishedDate?.toISOString() || null,
              });
            } else {
              console.error('[Site Scan] Error fetching page metadata:', result.reason);
              // Continue with other pages even if one fails
            }
          }
          
          // Send progress update after each batch
          const processed = Math.min(i + batchSize, totalPages);
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'progress',
            current: processed,
            total: totalPages,
            message: `Processing page ${processed} of ${totalPages}...`
          }) + '\n'));
        }
        
        if (cancelled || req.signal?.aborted) {
          return;
        }

        // Step 4.5: Create a map of processed pages with metadata
        const processedPagesMap = new Map<string, typeof pageMetadata[0]>();
        for (const page of pageMetadata) {
          const normalized = (() => {
            try {
              const urlObj = new URL(page.url);
              urlObj.hash = '';
              let path = urlObj.pathname;
              if (path.length > 1 && path.endsWith('/')) {
                path = path.slice(0, -1);
              }
              urlObj.pathname = path;
              return urlObj.toString();
            } catch {
              return page.url;
            }
          })();
          
          // Keep the first occurrence (or merge if needed)
          if (!processedPagesMap.has(normalized)) {
            processedPagesMap.set(normalized, { ...page, url: normalized });
          }
        }

        // Step 4.6: Include ALL pages from scan, even if metadata wasn't fetched
        // For pages without metadata, use basic info from scan result
        const allPages: typeof pageMetadata = [];
        const seenUrls = new Set<string>();
        
        for (const page of scanResult.pages) {
          const normalized = (() => {
            try {
              const urlObj = new URL(page.url);
              urlObj.hash = '';
              let path = urlObj.pathname;
              if (path.length > 1 && path.endsWith('/')) {
                path = path.slice(0, -1);
              }
              urlObj.pathname = path;
              return urlObj.toString();
            } catch {
              return page.url;
            }
          })();
          
          // Skip duplicates
          if (seenUrls.has(normalized)) {
            continue;
          }
          seenUrls.add(normalized);
          
          // If we have metadata for this page, use it; otherwise use basic info
          if (processedPagesMap.has(normalized)) {
            allPages.push(processedPagesMap.get(normalized)!);
          } else {
            // Page wasn't processed (e.g., free user beyond first 100)
            // Try to fetch word count for this page
            let wordCount = 0;
            try {
              const metadata = await getPageMetadata(normalized, true);
              wordCount = metadata.wordCount;
            } catch (error) {
              console.error(`[Site Scan] Error fetching word count for ${normalized}:`, error);
              // Continue with wordCount = 0
            }
            
            allPages.push({
              url: normalized,
              title: page.title || 'Untitled Page',
              wordCount: wordCount,
              publishedDate: page.publishedDate?.toISOString() || null,
            });
          }
        }
        
        const uniquePages = allPages;

        // Step 4: Calculate summary statistics (always calculate, word counts are always available)
        const totalWords = uniquePages.reduce((sum, page) => sum + (page.wordCount || 0), 0);
        const avgWordsPerPage = uniquePages.length > 0 ? Math.round(totalWords / uniquePages.length) : 0;

        // Step 5: Store scan in database
        let scanId: string | null = null;
        try {
          const supabaseUrl = getSupabaseUrl();
          const serviceRoleKey = getSupabaseServiceRoleKey();
          
          // Use service role key if available (bypasses RLS), otherwise use anon key
          let supabase;
          const userId = user?.id || null; // null for anonymous users

          if (serviceRoleKey) {
            // Use service role key for reliable server-side inserts
            supabase = createClient(supabaseUrl, serviceRoleKey, {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            });
          } else {
            // Fallback to anon key with RLS
            supabase = supabaseAuth;
          }

          // Save scan to database
          // Only set expires_at for anonymous users (logged-in users' scans don't expire)
          const expiresAt = userId ? null : (() => {
            const date = new Date();
            date.setDate(date.getDate() + 7); // Expires in 7 days for anonymous users
            return date.toISOString();
          })();

          const { data: savedScan, error: saveError } = await supabase
            .from('site_scans')
            .insert({
              user_id: userId,
              site_url: siteUrl,
              total_pages: scanResult.totalPages,
              scanned_pages: uniquePages.length, // All pages (with or without metadata)
              scan_data: {
                pages: uniquePages, // Include all pages, not just those with metadata
                method: scanResult.method,
                summary: {
                  totalWords,
                  avgWordsPerPage,
                },
              },
              expires_at: expiresAt,
            })
            .select('id')
            .single();

          if (!saveError && savedScan) {
            scanId = savedScan.id;
          } else {
            console.error('[Site Scan] Error saving scan:', saveError);
            if (!serviceRoleKey) {
              console.warn('[Site Scan] Consider setting SUPABASE_SECRET_KEY for reliable server-side inserts');
            }
          }
        } catch (error) {
          console.error('[Site Scan] Error saving scan to database:', error);
          // Continue even if save fails - we'll return data without scanId
        }

        // Step 6: Send final results
        const response: any = {
          scanId,
          siteUrl: scanResult.siteUrl,
          totalPages: scanResult.totalPages,
          scannedPages: uniquePages.length,
          pages: uniquePages,
          method: scanResult.method,
          scannedAt: scanResult.scannedAt.toISOString(),
          isAnonymous,
          summary: {
            totalWords,
            avgWordsPerPage,
          },
        };

        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'complete',
          data: response
        }) + '\n'));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Site Scan] Error:', error);
    
    if (error.message?.includes('Invalid site URL')) {
      return NextResponse.json(
        { error: 'Invalid site URL format' },
        { status: 400 }
      );
    }
    
    if (error.message?.includes('Timeout')) {
      return NextResponse.json(
        { error: 'Request timeout. The site may be too large or slow to respond.' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to scan site',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

