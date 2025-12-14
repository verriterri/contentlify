import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';

/**
 * GET /api/analyze/bulk/[jobId]
 * Get bulk analysis job status and progress
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get job
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Get completed analyses for this job
    const { data: analyses } = await supabase
      .from('content_analyses')
      .select('id, url, title, status, created_at')
      .eq('user_id', user.id)
      .gte('created_at', job.created_at)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: {
        completed: job.completed_pages || 0,
        total: job.total_pages,
        failed: job.failed_pages || 0,
      },
      results: analyses?.map((analysis) => ({
        pageUrl: analysis.url,
        status: analysis.status,
        analysisId: analysis.id,
      })) || [],
      createdAt: job.created_at,
      completedAt: job.completed_at,
    });
  } catch (error: any) {
    console.error('[Get Bulk Job] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

