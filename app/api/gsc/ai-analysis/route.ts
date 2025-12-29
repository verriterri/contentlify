import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';
import { getValidAccessToken, fetchGSCData } from '@/lib/gsc-api';
import { createClient } from '@supabase/supabase-js';
import { analyzeGSCData } from '@/lib/gsc-analysis';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/gsc/ai-analysis
 * Generates AI-powered analysis for a GSC property (requires payment)
 * Body: { siteUrl: string }
 */
export async function POST(req: NextRequest) {
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
      .eq('report_generated', false)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (!unusedPayment) {
      return NextResponse.json(
        {
          error: 'No available reports',
          message: 'Purchase a new report to continue. Each $4.99 payment allows one AI analysis.',
          requiresPayment: true,
        },
        { status: 402 }
      );
    }

    // Get valid access token
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

    // Get siteUrl from request body
    const body = await req.json();
    const { siteUrl } = body;

    if (!siteUrl) {
      return NextResponse.json(
        { error: 'Missing siteUrl in request body' },
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

    // Run programmatic analysis
    const analysis = analyzeGSCData(gscData.queries, gscData.pages);

    // Store analysis results in database using secret key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    // Insert analysis results linked to payment
    const { data: analysisRecord, error: insertError } = await supabaseAdmin
      .from('gsc_analysis_results')
      .insert({
        user_id: user.id,
        connection_id: tokenData.connectionId,
        payment_id: unusedPayment.id,
        site_url: siteUrl,
        data_period_start: formatDate(startDate),
        data_period_end: formatDate(endDate),
        queries_data: gscData.queries,
        pages_data: gscData.pages,
        summary_stats: gscData.summary,
        analysis_results: analysis,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[AI Analysis] Failed to store results:', insertError);
      throw new Error('Failed to store analysis results');
    }

    // MARK PAYMENT AS USED (one-time access enforcement)
    await supabaseAdmin
      .from('gsc_payments')
      .update({
        report_generated: true,
        report_generated_at: new Date().toISOString(),
      })
      .eq('id', unusedPayment.id);

    console.log('[AI Analysis] Successfully generated analysis and marked payment as used:', {
      userId: user.id,
      paymentId: unusedPayment.id,
      siteUrl,
      analysisId: analysisRecord.id,
      opportunitiesFound: {
        lowHangingFruit: analysis.lowHangingFruit.items.length,
        almostThere: analysis.almostThere.items.length,
        clickDeserts: analysis.clickDeserts.items.length,
        ctrUnderperformers: analysis.ctrUnderperformers.items.length,
      },
    });

    return NextResponse.json({
      success: true,
      analysisId: analysisRecord.id,
      siteUrl,
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      analysis,
    });
  } catch (error: any) {
    console.error('[AI Analysis] Error:', error);

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
      { error: 'Failed to generate analysis', details: error.message },
      { status: 500 }
    );
  }
}
