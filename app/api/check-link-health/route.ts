import { NextRequest, NextResponse } from 'next/server';
import { checkLinksHealth } from '@/lib/utils/link-health-checker';

/**
 * POST /api/check-link-health
 * Check the health of multiple links
 * Body: { urls: string[] }
 * Returns: Map of URL to LinkHealth
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'urls array is required' },
        { status: 400 }
      );
    }

    if (urls.length === 0) {
      return NextResponse.json({ results: {} });
    }

    if (urls.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 URLs per request' },
        { status: 400 }
      );
    }

    // Check link health with reasonable concurrency
    const healthResults = await checkLinksHealth(urls, {
      concurrency: 5, // Check 5 links at a time
      timeout: 10000, // 10 second timeout per link
    });

    // Convert Map to object for JSON response
    const results: Record<string, any> = {};
    healthResults.forEach((health, url) => {
      results[url] = {
        status: health.status,
        statusCode: health.statusCode,
        finalUrl: health.finalUrl,
        isStillAffiliate: health.isStillAffiliate,
        error: health.error,
        checkedAt: health.checkedAt.toISOString(),
      };
    });

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('[Check Link Health] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}




