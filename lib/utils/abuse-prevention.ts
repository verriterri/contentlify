import { createHash } from 'crypto';

/**
 * Create a hash of the IP address for tracking anonymous usage
 * This prevents users from bypassing free trial limits by clearing cookies
 */
export function hashIPAddress(ipAddress: string): string {
  return createHash('sha256')
    .update(ipAddress)
    .digest('hex');
}

/**
 * Create a hash of the browser fingerprint
 * Fingerprints are more persistent than IPs (survive VPN changes)
 */
export function hashFingerprint(fingerprint: string): string {
  return createHash('sha256')
    .update(fingerprint)
    .digest('hex');
}

/**
 * Create a combined usage key from IP and fingerprint
 * This is the primary tracking mechanism - even if IP changes, fingerprint persists
 */
export function createUsageKey(ipAddress: string, fingerprint: string | null): string {
  const ipHash = hashIPAddress(ipAddress);
  const fingerprintHash = fingerprint ? hashFingerprint(fingerprint) : 'no-fingerprint';
  
  // Combine both for primary tracking
  // If fingerprint exists, it's the primary signal (more persistent)
  // If not, fall back to IP-only
  return createHash('sha256')
    .update(`${ipHash}_${fingerprintHash}`)
    .digest('hex');
}

/**
 * Get client IP address from request headers
 * Handles various proxy scenarios (Vercel, Cloudflare, etc.)
 */
export function getClientIP(request: { headers: Headers | { get: (name: string) => string | null } }): string {
  const headers = request.headers;
  
  // Helper to get header value
  const getHeader = (name: string): string | null => {
    if ('get' in headers) {
      return headers.get(name);
    }
    return null;
  };
  
  // Check various headers that proxies use
  const forwardedFor = getHeader('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0] || 'unknown';
  }
  
  const realIP = getHeader('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = getHeader('cf-connecting-ip'); // Cloudflare
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback - in production this should never happen
  return 'unknown';
}

/**
 * Check if a user has already used the free trial
 * Uses combined usage key (IP + fingerprint) as primary check
 * Falls back to fingerprint-only or IP-only if needed
 */
export async function hasUsedFreeTrial(
  supabase: any,
  usageKey: string,
  ipHash?: string,
  fingerprintHash?: string
): Promise<boolean> {
  try {
    // Primary check: combined usage key (IP + fingerprint)
    const { data: primaryCheck, error: primaryError } = await supabase
      .from('anonymous_usage')
      .select('analysis_count, blocked_attempts')
      .eq('usage_key', usageKey)
      .single();
    
    if (primaryCheck) {
      // If they've used it, return true
      if (primaryCheck.analysis_count > 0) {
        return true;
      }
      // If they have many blocked attempts, they're likely abusing
      if (primaryCheck.blocked_attempts > 5) {
        return true;
      }
    }
    
    // Secondary check: fingerprint-only (if provided)
    // This catches users who change IPs but keep same device
    if (fingerprintHash) {
      const { data: fingerprintCheck } = await supabase
        .from('anonymous_usage')
        .select('analysis_count')
        .eq('fingerprint_hash', fingerprintHash)
        .gt('analysis_count', 0)
        .limit(1);
      
      if (fingerprintCheck && fingerprintCheck.length > 0) {
        return true;
      }
    }
    
    // Tertiary check: IP-only (if provided, less reliable due to VPNs)
    // Only use this if we don't have fingerprint
    if (ipHash && !fingerprintHash) {
      const { data: ipCheck } = await supabase
        .from('anonymous_usage')
        .select('analysis_count')
        .eq('ip_hash', ipHash)
        .gt('analysis_count', 0)
        .limit(1);
      
      if (ipCheck && ipCheck.length > 0) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('[Abuse Prevention] Exception checking free trial:', error);
    // On exception, be conservative
    return true;
  }
}

/**
 * Record that a user has used the free trial
 * Uses combined usage key (IP + fingerprint) as primary identifier
 */
export async function recordFreeTrialUsage(
  supabase: any,
  usageKey: string,
  ipHash: string,
  fingerprintHash?: string | null
): Promise<void> {
  try {
    // First, try to get existing record by usage key
    const { data: existing } = await supabase
      .from('anonymous_usage')
      .select('analysis_count')
      .eq('usage_key', usageKey)
      .single();
    
    if (existing) {
      // Update existing record - increment count
      const { error: updateError } = await supabase
        .from('anonymous_usage')
        .update({
          analysis_count: (existing.analysis_count || 0) + 1,
          last_analysis_at: new Date().toISOString(),
        })
        .eq('usage_key', usageKey);
      
      if (updateError) {
        console.error('[Abuse Prevention] Error updating free trial usage:', updateError);
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('anonymous_usage')
        .insert({
          usage_key: usageKey,
          ip_hash: ipHash,
          fingerprint_hash: fingerprintHash || null,
          analysis_count: 1,
          last_analysis_at: new Date().toISOString(),
        });
      
      if (insertError) {
        console.error('[Abuse Prevention] Error inserting free trial usage:', insertError);
      }
    }
  } catch (error) {
    console.error('[Abuse Prevention] Exception recording free trial usage:', error);
  }
}

/**
 * Increment blocked attempts counter (for rate limiting abuse detection)
 */
export async function incrementBlockedAttempts(
  supabase: any,
  usageKey: string
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('anonymous_usage')
      .select('blocked_attempts')
      .eq('usage_key', usageKey)
      .single();
    
    if (existing) {
      await supabase
        .from('anonymous_usage')
        .update({
          blocked_attempts: (existing.blocked_attempts || 0) + 1,
        })
        .eq('usage_key', usageKey);
    }
  } catch (error) {
    // Silently fail - not critical
    console.error('[Abuse Prevention] Error incrementing blocked attempts:', error);
  }
}

/**
 * Check if signup is allowed based on device/IP rate limits
 * Uses same multi-layer approach as hasUsedFreeTrial
 * Limits:
 * - Max 1 account per device (fingerprint) per 24 hours
 * - Max 3 accounts per IP address per 24 hours
 * - Max 5 accounts per IP address per 7 days
 */
export async function checkSignupAllowed(
  supabase: any,
  usageKey: string,
  ipHash: string,
  fingerprintHash?: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Primary check: combined usage key (IP + fingerprint) - 1 per 24h
    const { data: primaryCheck } = await supabase
      .from('signup_attempts')
      .select('created_at')
      .eq('usage_key', usageKey)
      .gte('created_at', oneDayAgo.toISOString())
      .limit(1);
    
    if (primaryCheck && primaryCheck.length > 0) {
      return {
        allowed: false,
        reason: 'You have already created an account from this device in the last 24 hours. Please wait before creating another account.'
      };
    }

    // Secondary check: fingerprint-only - 1 per 24h (catches device changes with same fingerprint)
    if (fingerprintHash) {
      const { data: fingerprintCheck } = await supabase
        .from('signup_attempts')
        .select('created_at')
        .eq('fingerprint_hash', fingerprintHash)
        .gte('created_at', oneDayAgo.toISOString())
        .limit(1);
      
      if (fingerprintCheck && fingerprintCheck.length > 0) {
        return {
          allowed: false,
          reason: 'You have already created an account from this device in the last 24 hours. Please wait before creating another account.'
        };
      }
    }

    // Tertiary check: IP-only - 3 per 24h, 5 per 7 days
    const { data: ipCheck24h } = await supabase
      .from('signup_attempts')
      .select('id')
      .eq('ip_hash', ipHash)
      .gte('created_at', oneDayAgo.toISOString());
    
    if (ipCheck24h && ipCheck24h.length >= 3) {
      return {
        allowed: false,
        reason: 'Too many accounts have been created from this IP address in the last 24 hours. Please try again later.'
      };
    }

    const { data: ipCheck7d } = await supabase
      .from('signup_attempts')
      .select('id')
      .eq('ip_hash', ipHash)
      .gte('created_at', sevenDaysAgo.toISOString());
    
    if (ipCheck7d && ipCheck7d.length >= 5) {
      return {
        allowed: false,
        reason: 'Too many accounts have been created from this IP address in the last 7 days. Please try again later.'
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[Abuse Prevention] Exception checking signup allowed:', error);
    // On exception, be conservative - allow signup but log the error
    return { allowed: true };
  }
}

/**
 * Record a signup attempt with device/IP tracking
 * Uses same pattern as recordFreeTrialUsage
 */
export async function recordSignupAttempt(
  supabase: any,
  userId: string,
  email: string,
  usageKey: string,
  ipHash: string,
  fingerprintHash?: string | null
): Promise<void> {
  try {
    const { error: insertError } = await supabase
      .from('signup_attempts')
      .insert({
        user_id: userId,
        email: email,
        usage_key: usageKey,
        ip_hash: ipHash,
        fingerprint_hash: fingerprintHash || null,
        email_verified: false,
        credits_granted: false,
      });
    
    if (insertError) {
      console.error('[Abuse Prevention] Error recording signup attempt:', insertError);
    }
  } catch (error) {
    console.error('[Abuse Prevention] Exception recording signup attempt:', error);
  }
}

/**
 * Update signup attempt when email is verified and credits are granted
 */
export async function updateSignupAttemptOnVerification(
  supabase: any,
  userId: string
): Promise<void> {
  try {
    const { error: updateError } = await supabase
      .from('signup_attempts')
      .update({
        email_verified: true,
        credits_granted: true,
      })
      .eq('user_id', userId)
      .eq('email_verified', false);
    
    if (updateError) {
      console.error('[Abuse Prevention] Error updating signup attempt on verification:', updateError);
    }
  } catch (error) {
    console.error('[Abuse Prevention] Exception updating signup attempt on verification:', error);
  }
}

