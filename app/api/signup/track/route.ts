import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';
import { getClientIP, hashIPAddress, hashFingerprint, createUsageKey, recordSignupAttempt } from '@/lib/utils/abuse-prevention';

export const dynamic = 'force-dynamic';

/**
 * POST /api/signup/track
 * Record a signup attempt with device/IP tracking
 * Body: { userId: string, email: string, fingerprint?: string }
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
    const { userId, email, fingerprint } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId and email are required' },
        { status: 400 }
      );
    }

    // Get IP address
    const clientIP = getClientIP(req);
    const ipHash = hashIPAddress(clientIP);
    const fingerprintHash = fingerprint ? hashFingerprint(fingerprint) : undefined;
    const usageKey = createUsageKey(clientIP, fingerprint || null);

    // Record signup attempt
    await recordSignupAttempt(
      supabase,
      userId,
      email,
      usageKey,
      ipHash,
      fingerprintHash
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('[Track Signup] Error:', error);
    // Don't fail the signup if tracking fails
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track signup attempt',
      },
      { status: 200 } // Return 200 so signup can continue
    );
  }
}
