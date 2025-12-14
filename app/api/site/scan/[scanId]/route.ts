import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';
import { getPageMetadata } from '@/lib/scrapers/site-scanner';

/**
 * GET /api/site/scan/[scanId]
 * Get scan data by scan ID
 * No auth required (allows viewing anonymous scans)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const scanId = params.scanId;

    if (!scanId) {
      return NextResponse.json(
        { error: 'Scan ID is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

    // Get scan from database
    const { data: scan, error: scanError } = await supabase
      .from('site_scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (scanError || !scan) {
      return NextResponse.json(
        { error: 'Scan not found or expired' },
        { status: 404 }
      );
    }

    // Check if scan has expired
    if (scan.expires_at && new Date(scan.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This scan has expired. Please create a new scan.' },
        { status: 410 } // Gone
      );
    }

    // Get authenticated user to fetch analysis data and check credits
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pages = scan.scan_data.pages || [];
    
    // If user is authenticated, fetch latest analysis for each page
    let analysisMap = new Map<string, { id: string; created_at: string }>();
    if (user) {
      const pageUrls = pages.map((p: any) => p.url).filter(Boolean);
      
      if (pageUrls.length > 0) {
        // Fetch latest analysis for each URL (only completed analyses)
        const { data: analyses, error: analysesError } = await supabase
          .from('content_analyses')
          .select('id, url, created_at')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .in('url', pageUrls)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (!analysesError && analyses) {
          // Create a map of URL -> latest analysis
          // Since we ordered by created_at DESC, first occurrence is latest
          analyses.forEach((analysis) => {
            if (!analysisMap.has(analysis.url)) {
              analysisMap.set(analysis.url, {
                id: analysis.id,
                created_at: analysis.created_at,
              });
            }
          });
        }
      }
    }

    // Always fetch word counts if they're missing (undefined/null)
    // Word counts should always be available regardless of credits
    const pagesNeedingWordCount = pages.filter((p: any) => p.wordCount === undefined || p.wordCount === null);
    
    if (pagesNeedingWordCount.length > 0 && pagesNeedingWordCount.length <= 100) {
      // Fetch word counts for up to 100 pages to avoid performance issues
      // Process in small batches to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < Math.min(pagesNeedingWordCount.length, 100); i += batchSize) {
        const batch = pagesNeedingWordCount.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async (page: any) => {
            try {
              const metadata = await getPageMetadata(page.url, true);
              // Update the page in the pages array
              const pageIndex = pages.findIndex((p: any) => p.url === page.url);
              if (pageIndex !== -1) {
                pages[pageIndex].wordCount = metadata.wordCount;
              }
            } catch (error) {
              console.error(`[Get Scan] Error fetching word count for ${page.url}:`, error);
              // Set to 0 if fetch fails
              const pageIndex = pages.findIndex((p: any) => p.url === page.url);
              if (pageIndex !== -1) {
                pages[pageIndex].wordCount = 0;
              }
            }
          })
        );
      }
    }

    // Add analysis info to each page
    const pagesWithAnalysis = pages.map((page: any) => {
      const analysis = analysisMap.get(page.url);
      return {
        ...page,
        lastAnalyzedAt: analysis?.created_at || null,
        analysisId: analysis?.id || null,
        // Ensure wordCount is always a number (default to 0 if missing)
        wordCount: page.wordCount ?? 0,
      };
    });

    // Return scan data
    return NextResponse.json({
      scanId: scan.id,
      siteUrl: scan.site_url,
      totalPages: scan.total_pages,
      scannedPages: scan.scanned_pages,
      pages: pagesWithAnalysis,
      summary: scan.scan_data.summary || {
        totalWords: 0,
        avgWordsPerPage: 0,
        totalAffiliateLinks: 0,
        underMonetizedCount: 0,
        pagesWithNoAffiliateLinks: 0,
      },
      method: scan.scan_data.method || 'crawl',
      scannedAt: scan.created_at,
    });
  } catch (error: any) {
    console.error('[Get Scan] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch scan data',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

