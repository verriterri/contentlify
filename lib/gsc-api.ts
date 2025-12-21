import { createClient } from '@supabase/supabase-js';

/**
 * Refresh Google OAuth access token using refresh token
 */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[GSC API] Token refresh failed:', error);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error('[GSC API] Error refreshing token:', error);
    return null;
  }
}

/**
 * Get valid access token for user's GSC connection
 * Automatically refreshes if expired
 */
export async function getValidAccessToken(
  userId: string
): Promise<{ accessToken: string; connectionId: string } | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get user's GSC connection
  const { data: connection, error } = await supabase
    .from('gsc_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !connection) {
    console.error('[GSC API] No GSC connection found for user:', userId);
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    // Token is still valid
    return {
      accessToken: connection.access_token,
      connectionId: connection.id,
    };
  }

  // Token expired or about to expire - refresh it
  console.log('[GSC API] Refreshing expired token for user:', userId);
  const refreshed = await refreshGoogleToken(connection.refresh_token);

  if (!refreshed) {
    console.error('[GSC API] Failed to refresh token for user:', userId);
    return null;
  }

  // Update token in database
  const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
  const { error: updateError } = await supabase
    .from('gsc_connections')
    .update({
      access_token: refreshed.accessToken,
      token_expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id);

  if (updateError) {
    console.error('[GSC API] Failed to update token in database:', updateError);
    return null;
  }

  return {
    accessToken: refreshed.accessToken,
    connectionId: connection.id,
  };
}

/**
 * Fetch GSC data for a site property
 */
export async function fetchGSCData(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
) {
  try {
    // Fetch query-level data (top 100 queries)
    const queryResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        siteUrl
      )}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 100,
        }),
      }
    );

    if (!queryResponse.ok) {
      const error = await queryResponse.json();
      console.error('[GSC API] Query data fetch failed:', error);
      throw new Error('Failed to fetch GSC query data');
    }

    const queryData = await queryResponse.json();

    // Fetch page-level data (top 100 pages)
    const pageResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        siteUrl
      )}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: 100,
        }),
      }
    );

    if (!pageResponse.ok) {
      const error = await pageResponse.json();
      console.error('[GSC API] Page data fetch failed:', error);
      throw new Error('Failed to fetch GSC page data');
    }

    const pageData = await pageResponse.json();

    // Calculate summary stats
    const totalClicks = queryData.rows?.reduce(
      (sum: number, row: any) => sum + row.clicks,
      0
    ) || 0;
    const totalImpressions = queryData.rows?.reduce(
      (sum: number, row: any) => sum + row.impressions,
      0
    ) || 0;
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPosition = queryData.rows?.length
      ? queryData.rows.reduce((sum: number, row: any) => sum + row.position, 0) /
        queryData.rows.length
      : 0;

    return {
      queries: queryData.rows || [],
      pages: pageData.rows || [],
      summary: {
        totalClicks,
        totalImpressions,
        avgCtr,
        avgPosition,
      },
    };
  } catch (error) {
    console.error('[GSC API] Error fetching GSC data:', error);
    throw error;
  }
}

/**
 * Get list of GSC properties (sites) for user
 */
export async function fetchGSCProperties(accessToken: string) {
  try {
    const response = await fetch(
      'https://www.googleapis.com/webmasters/v3/sites',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[GSC API] Properties fetch failed:', error);
      throw new Error('Failed to fetch GSC properties');
    }

    const data = await response.json();
    return data.siteEntry || [];
  } catch (error) {
    console.error('[GSC API] Error fetching GSC properties:', error);
    throw error;
  }
}
