import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';
import { getClientIP, hashIPAddress, hashFingerprint, createUsageKey, checkSignupAllowed } from '@/lib/utils/abuse-prevention';

export const dynamic = 'force-dynamic';

/**
 * POST /api/signup/check-rate-limit
 * Check if signup is allowed based on device/IP rate limits
 * Body: { fingerprint?: string }
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

    const body = await req.json();
    const { fingerprint } = body;

    // Get IP address
    const clientIP = getClientIP(req);
    const ipHash = hashIPAddress(clientIP);
    const fingerprintHash = fingerprint ? hashFingerprint(fingerprint) : undefined;
    const usageKey = createUsageKey(clientIP, fingerprint || null);

    // Check if signup is allowed
    const checkResult = await checkSignupAllowed(
      supabase,
      usageKey,
      ipHash,
      fingerprintHash
    );

    if (!checkResult.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          reason: checkResult.reason || 'Signup rate limit exceeded',
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      allowed: true,
    });
  } catch (error: any) {
    console.error('[Check Rate Limit] Error:', error);
    // On error, allow signup (fail open) but log the error
    return NextResponse.json(
      {
        allowed: true,
        error: 'Rate limit check failed, proceeding with signup',
      },
      { status: 200 }
    );
  }
}

