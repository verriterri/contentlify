import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';
import { getValidAccessToken, fetchGSCData, fetchGSCProperties } from '@/lib/gsc-api';
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
    const tokenData = await getValidAccessToken(user.id);

    if (!tokenData) {
      return NextResponse.json(
        {
          error: 'No GSC connection found',
          message: 'Please connect your Google Search Console account',
          requiresConnection: true,
        },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // If action is 'list', return available GSC properties (FREE - no payment required)
    if (action === 'list') {
      const properties = await fetchGSCProperties(tokenData.accessToken);
      return NextResponse.json({ properties });
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

    // Calculate date range (last 28 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);

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

    // Log successful data fetch (free tier)
    console.log('[GSC Analyze] Successfully fetched GSC data (free tier):', {
      userId: user.id,
      siteUrl,
      queriesCount: gscData.queries.length,
      pagesCount: gscData.pages.length,
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
