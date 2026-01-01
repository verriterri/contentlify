import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';
import { getValidAccessToken, fetchGSCData, fetchGSCProperties, fetchGSCTimeSeriesData } from '@/lib/gsc-api';
import { analyzeGSCData } from '@/lib/gsc-analysis';
import { analyzeTimeSeriesData } from '@/lib/gsc-trend-analysis';
import { createClient } from '@supabase/supabase-js';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/gsc/analyze
 * Fetches GSC data for authenticated user (requires payment)
 * Query params:
 * - siteUrl: optional, the GSC property URL to fetch data for
 * - action: 'list' to get properties, default is to fetch data
 */
export async function GET(req: NextRequest) {
  try {
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

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in first.' },
        { status: 401 }
      );
    }

    // Get valid access token (refreshes if needed)
    console.log('[GSC Analyze] Looking for connection for user:', user.id);
    const tokenData = await getValidAccessToken(user.id);

    if (!tokenData) {
      console.error('[GSC Analyze] No connection found for user:', user.id);
      return NextResponse.json(
        {
          error: 'No GSC connection found',
          message: 'Please connect your Google Search Console account',
          requiresConnection: true,
        },
        { status: 403 }
      );
    }

    console.log('[GSC Analyze] Connection found for user:', user.id);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // If action is 'list', return available GSC properties (FREE - no payment required)
    if (action === 'list') {
      try {
        const properties = await fetchGSCProperties(tokenData.accessToken);
        return NextResponse.json({ properties });
      } catch (error: any) {
        // Check if this is a scope permission error
        if (error.message?.includes('insufficient authentication scopes')) {
          return NextResponse.json(
            {
              error: error.message,
              message: 'Missing Search Console permissions. Please reconnect your Google account.',
              requiresReconnect: true,
            },
            { status: 403 }
          );
        }
        throw error;
      }
    }

    // Fetch GSC data for a specific property (FREE - basic dashboard is free)
    // Payment is only required for AI analysis, which is handled separately
    const siteUrl = url.searchParams.get('siteUrl');

    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Missing siteUrl parameter' },
        { status: 400 }
      );
    }

    // Calculate date range (last 90 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    // Fetch GSC data
    const gscData = await fetchGSCData(
      tokenData.accessToken,
      siteUrl,
      formatDate(startDate),
      formatDate(endDate)
    );

    // Fetch time-series data for trend analysis
    const timeSeriesData = await fetchGSCTimeSeriesData(
      tokenData.accessToken,
      siteUrl,
      formatDate(startDate),
      formatDate(endDate)
    );

    // Run programmatic analysis (FREE - Phase 1)
    const analysis = analyzeGSCData(gscData.queries, gscData.pages);

    // Run trend analysis on time-series data
    const trendAnalysis = analyzeTimeSeriesData(timeSeriesData);

    // Log successful data fetch (free tier)
    console.log('[GSC Analyze] Successfully fetched GSC data with free analysis:', {
      userId: user.id,
      siteUrl,
      queriesCount: gscData.queries.length,
      pagesCount: gscData.pages.length,
      opportunitiesFound: {
        lowHangingFruit: analysis.lowHangingFruit.items.length,
        almostThere: analysis.almostThere.items.length,
        clickDeserts: analysis.clickDeserts.items.length,
      },
    });

    return NextResponse.json({
      siteUrl,
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      data: {
        queries: gscData.queries,
        pages: gscData.pages,
        summary: gscData.summary,
      },
      analysis, // FREE programmatic insights
      trendAnalysis, // FREE trend analysis (cliffs, patterns, comparisons)
    });
  } catch (error: any) {
    console.error('[GSC Analyze] Error:', error);

    // Handle specific GSC API errors
    if (error.message?.includes('Failed to fetch GSC')) {
      return NextResponse.json(
        {
          error: 'GSC API error',
          message: 'Failed to fetch data from Google Search Console. Please check your permissions.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze GSC data' },
      { status: 500 }
    );
  }
}
