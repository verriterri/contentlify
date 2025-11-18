import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GET /api/blog/scan/[scanId]
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
      .from('blog_scans')
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

    // Return scan data
    return NextResponse.json({
      scanId: scan.id,
      blogUrl: scan.blog_url,
      totalPosts: scan.total_posts,
      scannedPosts: scan.scanned_posts,
      posts: scan.scan_data.posts || [],
      summary: scan.scan_data.summary || {
        totalWords: 0,
        avgWordsPerPost: 0,
        totalAffiliateLinks: 0,
        underMonetizedCount: 0,
        postsWithNoAffiliateLinks: 0,
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

