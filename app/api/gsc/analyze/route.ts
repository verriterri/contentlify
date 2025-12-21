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

    // Check for UNUSED payment (one-time access enforcement)
    const { data: unusedPayment } = await supabase
      .from('gsc_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .eq('report_generated', false) // KEY: Only unused payments
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (!unusedPayment) {
      return NextResponse.json(
        {
          error: 'No available reports',
          message: 'Purchase a new report to continue. Each $4.99 payment allows one report generation.',
          requiresPayment: true,
        },
        { status: 402 }
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

    // If action is 'list', return available GSC properties
    if (action === 'list') {
      const properties = await fetchGSCProperties(tokenData.accessToken);
      return NextResponse.json({ properties });
    }

    // Otherwise, fetch GSC data for a specific property
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

    // Store analysis results in database using service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Insert analysis results linked to payment
    await supabaseAdmin.from('gsc_analysis_results').insert({
      user_id: user.id,
      connection_id: tokenData.connectionId,
      payment_id: unusedPayment.id, // Link to payment
      site_url: siteUrl,
      data_period_start: formatDate(startDate),
      data_period_end: formatDate(endDate),
      queries_data: gscData.queries,
      pages_data: gscData.pages,
      summary_stats: gscData.summary,
    });

    // MARK PAYMENT AS USED (one-time access enforcement)
    await supabaseAdmin
      .from('gsc_payments')
      .update({
        report_generated: true,
        report_generated_at: new Date().toISOString(),
      })
      .eq('id', unusedPayment.id);

    console.log('[GSC Analyze] Successfully generated report and marked payment as used:', {
      userId: user.id,
      paymentId: unusedPayment.id,
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
