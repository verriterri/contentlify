import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';

// Mark route as dynamic since it uses cookies
export const dynamic = 'force-dynamic';

/**
 * GET /api/user/credits
 * Get current user's credit balance
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // Anonymous user - check free trial via combined IP + fingerprint tracking
      // Note: fingerprint is optional (sent from client), falls back to IP-only if not provided
      const { getClientIP, hashIPAddress, hashFingerprint, createUsageKey, hasUsedFreeTrial } = await import('@/lib/utils/abuse-prevention');
      
      // Try to get fingerprint from query params (optional)
      const url = new URL(req.url);
      const fingerprint = url.searchParams.get('fingerprint') || null;
      
      const clientIP = getClientIP(req);
      const ipHash = hashIPAddress(clientIP);
      const fingerprintHash = fingerprint ? hashFingerprint(fingerprint) : null;
      const usageKey = createUsageKey(clientIP, fingerprint);
      
      // Check database for free trial usage (checks combined key, fingerprint, and IP)
      const ipBasedFreeTrialUsed = await hasUsedFreeTrial(
        supabase,
        usageKey,
        ipHash,
        fingerprintHash || undefined
      );
      
      // Also check cookie for UX (but database tracking is the source of truth)
      const freeTrialCookie = cookieStore.get('free_trial_used');
      const cookieBasedFreeTrialUsed = freeTrialCookie?.value === 'true';
      
      // Use database tracking as source of truth
      const freeTrialUsed = ipBasedFreeTrialUsed;
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('[Get Credits] Anonymous user:', {
          clientIP: clientIP.substring(0, 10) + '...',
          hasFingerprint: !!fingerprint,
          ipBasedFreeTrialUsed,
          cookieBasedFreeTrialUsed,
          finalFreeTrialUsed: freeTrialUsed,
        });
      }
      
      return NextResponse.json(
        { 
          credits: null,
          freeTrialUsed,
        },
        { status: 200 }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credits, free_trial_used')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      // User exists in auth but not in public.users table
      // This can happen if the trigger didn't run - create the user record with 3 free credits
      console.warn(`[Get Credits] User ${user.id} not found in users table, creating record with 3 free credits`);
      
      // Try to create the user record with 3 free credits
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || '',
          email_verified: user.email_confirmed_at !== null,
          credits: 3, // Grant 3 free credits
        })
        .select()
        .single();
      
      if (insertError) {
        // If insert fails (e.g., race condition), try to fetch again
        const { data: retryData } = await supabase
          .from('users')
          .select('credits, free_trial_used')
          .eq('id', user.id)
          .single();
        
        if (retryData) {
          return NextResponse.json({
            credits: retryData.credits || 0,
            freeTrialUsed: retryData.free_trial_used || false,
          });
        }
      } else {
        // Successfully created user record with 3 free credits
        return NextResponse.json({
          credits: 3,
          freeTrialUsed: false,
        });
      }
      
      // Fallback: return 0 credits if we can't create the record
      return NextResponse.json(
        { 
          credits: 0,
          freeTrialUsed: false,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      credits: userData.credits ?? 0, // Use ?? instead of || to handle 0 correctly
      freeTrialUsed: userData.free_trial_used || false,
    });
  } catch (error: any) {
    console.error('[Get Credits] Error:', error);
    return NextResponse.json(
      { 
        credits: 0,
        freeTrialUsed: false,
      },
      { status: 200 }
    );
  }
}

