import { NextRequest, NextResponse } from 'next/server';
import { scanSite, getPageMetadata } from '@/lib/scrapers/site-scanner';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * POST /api/site/scan
 * Scans a site to discover all pages and get metadata
 * Costs 1 credit per scan
 * Anonymous users get 2 free credits (1 for scanning, 1 for analyzing)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { siteUrl, fingerprint } = body;

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

    // Step 1: Check authentication and credits BEFORE scanning
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
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
    const SCAN_COST = 1;
    let creditsRemaining: number | null = null;

    if (user) {
      // Logged-in user: check and deduct credits
      const { data: userData, error: userError } = await supabaseAuth
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: 'Failed to retrieve user account. Please try again.' },
          { status: 500 }
        );
      }

      const userCredits = userData.credits || 0;

      // Check if user has enough credits
      if (userCredits < SCAN_COST) {
        return NextResponse.json(
          { 
            error: `Insufficient credits. Site scanning costs ${SCAN_COST} credit. You have ${userCredits} credits. Please purchase more credits to continue.`,
            insufficientCredits: true,
            creditsNeeded: SCAN_COST,
            currentCredits: userCredits,
          },
          { status: 402 } // 402 Payment Required
        );
      }

      // Deduct credits BEFORE scanning
      const newCredits = userCredits - SCAN_COST;
      const { error: creditError } = await supabaseAuth
        .from('users')
        .update({ credits: newCredits })
        .eq('id', user.id);

      if (creditError) {
        console.error('[Blog Scan] Error deducting credits:', creditError);
        return NextResponse.json(
          { error: 'Failed to process payment. Please try again.' },
          { status: 500 }
        );
      }

      creditsRemaining = newCredits;
      console.log(`[Site Scan] Deducted ${SCAN_COST} credit from user ${user.id}. New balance: ${newCredits}`);
    } else {
      // Anonymous user: check free credits (2 total: 1 scan + 1 analysis)
      const { getClientIP, hashIPAddress, hashFingerprint, createUsageKey } = await import('@/lib/utils/abuse-prevention');
      
      const clientIP = getClientIP(req);
      const ipHash = hashIPAddress(clientIP);
      const fingerprintHash = fingerprint ? hashFingerprint(fingerprint) : null;
      const usageKey = createUsageKey(clientIP, fingerprint || null);

      // Check anonymous usage
      const { data: usageData } = await supabaseAuth
        .from('anonymous_usage')
        .select('scan_count, analysis_count')
        .eq('usage_key', usageKey)
        .single();

      const scanCount = usageData?.scan_count || 0;
      const analysisCount = usageData?.analysis_count || 0;
      const totalUsage = scanCount + analysisCount;

      // Anonymous users get 2 free credits total (1 scan + 1 analysis)
      if (scanCount >= 1) {
        return NextResponse.json(
          { 
            error: 'You have already used your free site scan. Sign up to get more credits and unlimited scans.',
            insufficientCredits: true,
            requiresAuth: true,
          },
          { status: 402 }
        );
      }

      if (totalUsage >= 2) {
        return NextResponse.json(
          { 
            error: 'You have used all your free credits (2 total: 1 scan + 1 analysis). Sign up to get more credits.',
            insufficientCredits: true,
            requiresAuth: true,
          },
          { status: 402 }
        );
      }

      // Record scan usage BEFORE scanning
      if (usageData) {
        await supabaseAuth
          .from('anonymous_usage')
          .update({
            scan_count: scanCount + 1,
            last_analysis_at: new Date().toISOString(),
          })
          .eq('usage_key', usageKey);
      } else {
        await supabaseAuth
          .from('anonymous_usage')
          .insert({
            usage_key: usageKey,
            ip_hash: ipHash,
            fingerprint_hash: fingerprintHash || null,
            scan_count: 1,
            analysis_count: 0,
            last_analysis_at: new Date().toISOString(),
          });
      }

      creditsRemaining = 2 - (totalUsage + 1); // Remaining free credits
      console.log(`[Site Scan] Recorded free scan for anonymous user. Usage: ${scanCount + 1} scans, ${analysisCount} analyses`);
    }

    // Step 2: Scan site to find all pages
    console.log(`[Site Scan] Scanning site: ${siteUrl}`);
    const scanResult = await scanSite(siteUrl);
    
    if (scanResult.pages.length === 0) {
      // Refund the credit if no posts found
      if (user) {
        const { data: userData } = await supabaseAuth
          .from('users')
          .select('credits')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          await supabaseAuth
            .from('users')
            .update({ credits: (userData.credits || 0) + SCAN_COST })
            .eq('id', user.id);
          console.log(`[Site Scan] No pages found, refunded ${SCAN_COST} credit to user ${user.id}`);
        }
      } else {
        // Refund anonymous scan
        const { getClientIP, createUsageKey } = await import('@/lib/utils/abuse-prevention');
        const clientIP = getClientIP(req);
        const usageKey = createUsageKey(clientIP, fingerprint || null);
        
        const { data: usageData } = await supabaseAuth
          .from('anonymous_usage')
          .select('scan_count')
          .eq('usage_key', usageKey)
          .single();
        
        if (usageData && usageData.scan_count > 0) {
          await supabaseAuth
            .from('anonymous_usage')
            .update({ scan_count: usageData.scan_count - 1 })
            .eq('usage_key', usageKey);
          console.log(`[Site Scan] No pages found, refunded free scan for anonymous user`);
        }
      }
      
      return NextResponse.json(
        { error: 'No pages found. Make sure the site URL is correct and accessible.' },
        { status: 404 }
      );
    }

    const hasCredits = creditsRemaining !== null && creditsRemaining > 0;

    // Step 3: Get metadata for each page
    // For users with credits: process all pages
    // For users without credits: limit to 100 pages (free scan)
    const pagesToScan = hasCredits ? scanResult.pages : scanResult.pages.slice(0, 100);
    const pageMetadata: Array<{
      url: string;
      title: string;
      wordCount?: number;
      affiliateLinkCount?: number;
      publishedDate: string | null;
    }> = [];

    // Process pages in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < pagesToScan.length; i += batchSize) {
      const batch = pagesToScan.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map((page) => getPageMetadata(page.url, hasCredits))
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

          if (hasCredits) {
            pageMetadata.push({
              url: normalizedUrl,
              title: result.value.title,
              wordCount: result.value.wordCount,
              affiliateLinkCount: result.value.affiliateLinkCount,
              publishedDate: result.value.publishedDate?.toISOString() || null,
            });
          } else {
            // For users without credits, only return basic info
            pageMetadata.push({
              url: normalizedUrl,
              title: result.value.title,
              publishedDate: result.value.publishedDate?.toISOString() || null,
            });
          }
        } else {
          console.error('[Site Scan] Error fetching page metadata:', result.reason);
          // Continue with other pages even if one fails
        }
      }
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
        // Include it with basic info only
        allPages.push({
          url: normalized,
          title: page.title || 'Untitled Page',
          publishedDate: page.publishedDate?.toISOString() || null,
          // wordCount and affiliateLinkCount will be undefined (not fetched)
        });
      }
    }
    
    const uniquePages = allPages;

    // Step 4: Calculate summary statistics (only for users with credits)
    let totalWords = 0;
    let avgWordsPerPage = 0;
    let totalAffiliateLinks = 0;
    let underMonetizedCount = 0;
    let pagesWithNoAffiliateLinks = 0;
    
    if (hasCredits) {
      totalWords = uniquePages.reduce((sum, page) => sum + (page.wordCount || 0), 0);
      avgWordsPerPage = uniquePages.length > 0 ? Math.round(totalWords / uniquePages.length) : 0;
      totalAffiliateLinks = uniquePages.reduce((sum, page) => sum + (page.affiliateLinkCount || 0), 0);
      underMonetizedCount = uniquePages.filter(
        (page) => (page.wordCount || 0) >= 1500 && (page.affiliateLinkCount || 0) <= 2
      ).length;
      pagesWithNoAffiliateLinks = uniquePages.filter(
        (page) => (page.affiliateLinkCount || 0) === 0
      ).length;
    }

    // Step 5: Store scan in database
    let scanId: string | null = null;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
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
              totalAffiliateLinks,
              underMonetizedCount,
              pagesWithNoAffiliateLinks,
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
          console.warn('[Site Scan] Consider setting SUPABASE_SERVICE_ROLE_KEY for reliable server-side inserts');
        }
      }
    } catch (error) {
      console.error('[Site Scan] Error saving scan to database:', error);
      // Continue even if save fails - we'll return data without scanId
    }

    // Step 6: Return results
    const response: any = {
      scanId,
      siteUrl: scanResult.siteUrl,
      totalPages: scanResult.totalPages,
      scannedPages: uniquePages.length,
      pages: uniquePages,
      method: scanResult.method,
      scannedAt: scanResult.scannedAt.toISOString(),
      creditsRemaining: creditsRemaining,
      isAnonymous,
      summary: {
        totalWords,
        avgWordsPerPage,
        totalAffiliateLinks,
        underMonetizedCount,
        pagesWithNoAffiliateLinks,
      },
    };

    return NextResponse.json(response);
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

