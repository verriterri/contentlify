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

