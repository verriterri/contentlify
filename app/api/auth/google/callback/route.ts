import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback, exchanges code for tokens, and stores in database
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('[Google OAuth Callback] OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/gsc?error=oauth_denied`
      );
    }

    if (!code || !state) {
      console.error('[Google OAuth Callback] Missing code or state');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/gsc?error=invalid_callback`
      );
    }

    // Verify state parameter (CSRF protection)
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      console.error('[Google OAuth Callback] Invalid state parameter');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/gsc?error=invalid_state`
      );
    }

    // Check state timestamp (prevent replay attacks - valid for 10 minutes)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 10 * 60 * 1000) {
      console.error('[Google OAuth Callback] State parameter expired');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/gsc?error=expired_state`
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[Google OAuth Callback] Token exchange failed:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/gsc?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const {
      access_token,
      refresh_token,
      expires_in,
      scope,
    } = tokenData;

    if (!refresh_token) {
      console.error('[Google OAuth Callback] No refresh token received');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/gsc?error=no_refresh_token`
      );
    }

    // Get user email from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      console.error('[Google OAuth Callback] Failed to get user info');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/gsc?error=userinfo_failed`
      );
    }

    const userInfo = await userInfoResponse.json();
    const googleEmail = userInfo.email;

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    // Store tokens in database using service role (bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upsert GSC connection (replace if exists for this user)
    const { error: dbError } = await supabase
      .from('gsc_connections')
      .upsert(
        {
          user_id: stateData.userId,
          google_account_email: googleEmail,
          access_token,
          refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          scopes: scope.split(' '),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id', // Update if user already has a connection
        }
      );

    if (dbError) {
      console.error('[Google OAuth Callback] Database error:', dbError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/gsc?error=database_error`
      );
    }

    console.log('[Google OAuth Callback] Successfully stored GSC connection:', {
      userId: stateData.userId,
      googleEmail,
    });

    // Redirect to dashboard with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/gsc?success=true`
    );
  } catch (error: any) {
    console.error('[Google OAuth Callback] Unexpected error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/gsc?error=unexpected_error`
    );
  }
}
