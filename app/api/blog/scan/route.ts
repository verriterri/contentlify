import { NextRequest, NextResponse } from 'next/server';
import { scanBlog, getPostMetadata } from '@/lib/scrapers/blog-scanner';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * POST /api/blog/scan
 * Scans a blog to discover all posts and get metadata
 * Costs 1 credit per scan
 * Anonymous users get 2 free credits (1 for scanning, 1 for analyzing)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { blogUrl, fingerprint } = body;

    if (!blogUrl || typeof blogUrl !== 'string') {
      return NextResponse.json(
        { error: 'blogUrl is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      let normalizedUrl = blogUrl.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid blog URL format' },
        { status: 400 }
      );
    }

    // Step 1: Check authentication and credits BEFORE scanning
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
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
    
    const { data: { user } } = await supabaseAuth.auth.getUser();
    const isAnonymous = !user;
    const SCAN_COST = 1;
    let creditsRemaining: number | null = null;

    if (user) {
      // Logged-in user: check and deduct credits
      const { data: userData, error: userError } = await supabaseAuth
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: 'Failed to retrieve user account. Please try again.' },
          { status: 500 }
        );
      }

      const userCredits = userData.credits || 0;

      // Check if user has enough credits
      if (userCredits < SCAN_COST) {
        return NextResponse.json(
          { 
            error: `Insufficient credits. Blog scanning costs ${SCAN_COST} credit. You have ${userCredits} credits. Please purchase more credits to continue.`,
            insufficientCredits: true,
            creditsNeeded: SCAN_COST,
            currentCredits: userCredits,
          },
          { status: 402 } // 402 Payment Required
        );
      }

      // Deduct credits BEFORE scanning
      const newCredits = userCredits - SCAN_COST;
      const { error: creditError } = await supabaseAuth
        .from('users')
        .update({ credits: newCredits })
        .eq('id', user.id);

      if (creditError) {
        console.error('[Blog Scan] Error deducting credits:', creditError);
        return NextResponse.json(
          { error: 'Failed to process payment. Please try again.' },
          { status: 500 }
        );
      }

      creditsRemaining = newCredits;
      console.log(`[Blog Scan] Deducted ${SCAN_COST} credit from user ${user.id}. New balance: ${newCredits}`);
    } else {
      // Anonymous user: check free credits (2 total: 1 scan + 1 analysis)
      const { getClientIP, hashIPAddress, hashFingerprint, createUsageKey } = await import('@/lib/utils/abuse-prevention');
      
      const clientIP = getClientIP(req);
      const ipHash = hashIPAddress(clientIP);
      const fingerprintHash = fingerprint ? hashFingerprint(fingerprint) : null;
      const usageKey = createUsageKey(clientIP, fingerprint || null);

      // Check anonymous usage
      const { data: usageData } = await supabaseAuth
        .from('anonymous_usage')
        .select('scan_count, analysis_count')
        .eq('usage_key', usageKey)
        .single();

      const scanCount = usageData?.scan_count || 0;
      const analysisCount = usageData?.analysis_count || 0;
      const totalUsage = scanCount + analysisCount;

      // Anonymous users get 2 free credits total (1 scan + 1 analysis)
      if (scanCount >= 1) {
        return NextResponse.json(
          { 
            error: 'You have already used your free blog scan. Sign up to get more credits and unlimited scans.',
            insufficientCredits: true,
            requiresAuth: true,
          },
          { status: 402 }
        );
      }

      if (totalUsage >= 2) {
        return NextResponse.json(
          { 
            error: 'You have used all your free credits (2 total: 1 scan + 1 analysis). Sign up to get more credits.',
            insufficientCredits: true,
            requiresAuth: true,
          },
          { status: 402 }
        );
      }

      // Record scan usage BEFORE scanning
      if (usageData) {
        await supabaseAuth
          .from('anonymous_usage')
          .update({
            scan_count: scanCount + 1,
            last_analysis_at: new Date().toISOString(),
          })
          .eq('usage_key', usageKey);
      } else {
        await supabaseAuth
          .from('anonymous_usage')
          .insert({
            usage_key: usageKey,
            ip_hash: ipHash,
            fingerprint_hash: fingerprintHash || null,
            scan_count: 1,
            analysis_count: 0,
            last_analysis_at: new Date().toISOString(),
          });
      }

      creditsRemaining = 2 - (totalUsage + 1); // Remaining free credits
      console.log(`[Blog Scan] Recorded free scan for anonymous user. Usage: ${scanCount + 1} scans, ${analysisCount} analyses`);
    }

    // Step 2: Scan blog to find all posts
    console.log(`[Blog Scan] Scanning blog: ${blogUrl}`);
    const scanResult = await scanBlog(blogUrl);
    
    if (scanResult.posts.length === 0) {
      // Refund the credit if no posts found
      if (user) {
        const { data: userData } = await supabaseAuth
          .from('users')
          .select('credits')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          await supabaseAuth
            .from('users')
            .update({ credits: (userData.credits || 0) + SCAN_COST })
            .eq('id', user.id);
          console.log(`[Blog Scan] No posts found, refunded ${SCAN_COST} credit to user ${user.id}`);
        }
      } else {
        // Refund anonymous scan
        const { getClientIP, createUsageKey } = await import('@/lib/utils/abuse-prevention');
        const clientIP = getClientIP(req);
        const usageKey = createUsageKey(clientIP, fingerprint || null);
        
        const { data: usageData } = await supabaseAuth
          .from('anonymous_usage')
          .select('scan_count')
          .eq('usage_key', usageKey)
          .single();
        
        if (usageData && usageData.scan_count > 0) {
          await supabaseAuth
            .from('anonymous_usage')
            .update({ scan_count: usageData.scan_count - 1 })
            .eq('usage_key', usageKey);
          console.log(`[Blog Scan] No posts found, refunded free scan for anonymous user`);
        }
      }
      
      return NextResponse.json(
        { error: 'No posts found. Make sure the blog URL is correct and accessible.' },
        { status: 404 }
      );
    }

    const hasCredits = creditsRemaining !== null && creditsRemaining > 0;

    // Step 3: Get metadata for each post
    // For users with credits: process all posts
    // For users without credits: limit to 100 posts (free scan)
    const postsToScan = hasCredits ? scanResult.posts : scanResult.posts.slice(0, 100);
    const postMetadata: Array<{
      url: string;
      title: string;
      wordCount?: number;
      affiliateLinkCount?: number;
      publishedDate: string | null;
    }> = [];

    // Process posts in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < postsToScan.length; i += batchSize) {
      const batch = postsToScan.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map((post) => getPostMetadata(post.url, hasCredits))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          // Normalize URL to remove fragments
          const normalizedUrl = (() => {
            try {
              const urlObj = new URL(result.value.url);
              urlObj.hash = '';
              let path = urlObj.pathname;
              if (path.length > 1 && path.endsWith('/')) {
                path = path.slice(0, -1);
              }
              urlObj.pathname = path;
              return urlObj.toString();
            } catch {
              return result.value.url;
            }
          })();

          if (hasCredits) {
            postMetadata.push({
              url: normalizedUrl,
              title: result.value.title,
              wordCount: result.value.wordCount,
              affiliateLinkCount: result.value.affiliateLinkCount,
              publishedDate: result.value.publishedDate?.toISOString() || null,
            });
          } else {
            // For users without credits, only return basic info
            postMetadata.push({
              url: normalizedUrl,
              title: result.value.title,
              publishedDate: result.value.publishedDate?.toISOString() || null,
            });
          }
        } else {
          console.error('[Blog Scan] Error fetching post metadata:', result.reason);
          // Continue with other posts even if one fails
        }
      }
    }

    // Step 4.5: Create a map of processed posts with metadata
    const processedPostsMap = new Map<string, typeof postMetadata[0]>();
    for (const post of postMetadata) {
      const normalized = (() => {
        try {
          const urlObj = new URL(post.url);
          urlObj.hash = '';
          let path = urlObj.pathname;
          if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
          }
          urlObj.pathname = path;
          return urlObj.toString();
        } catch {
          return post.url;
        }
      })();
      
      // Keep the first occurrence (or merge if needed)
      if (!processedPostsMap.has(normalized)) {
        processedPostsMap.set(normalized, { ...post, url: normalized });
      }
    }

    // Step 4.6: Include ALL posts from scan, even if metadata wasn't fetched
    // For posts without metadata, use basic info from scan result
    const allPosts: typeof postMetadata = [];
    const seenUrls = new Set<string>();
    
    for (const post of scanResult.posts) {
      const normalized = (() => {
        try {
          const urlObj = new URL(post.url);
          urlObj.hash = '';
          let path = urlObj.pathname;
          if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
          }
          urlObj.pathname = path;
          return urlObj.toString();
        } catch {
          return post.url;
        }
      })();
      
      // Skip duplicates
      if (seenUrls.has(normalized)) {
        continue;
      }
      seenUrls.add(normalized);
      
      // If we have metadata for this post, use it; otherwise use basic info
      if (processedPostsMap.has(normalized)) {
        allPosts.push(processedPostsMap.get(normalized)!);
      } else {
        // Post wasn't processed (e.g., free user beyond first 100)
        // Include it with basic info only
        allPosts.push({
          url: normalized,
          title: post.title || 'Untitled Post',
          publishedDate: post.publishedDate?.toISOString() || null,
          // wordCount and affiliateLinkCount will be undefined (not fetched)
        });
      }
    }
    
    const uniquePosts = allPosts;

    // Step 4: Calculate summary statistics (only for users with credits)
    let totalWords = 0;
    let avgWordsPerPost = 0;
    let totalAffiliateLinks = 0;
    let underMonetizedCount = 0;
    let postsWithNoAffiliateLinks = 0;
    
    if (hasCredits) {
      totalWords = uniquePosts.reduce((sum, post) => sum + (post.wordCount || 0), 0);
      avgWordsPerPost = uniquePosts.length > 0 ? Math.round(totalWords / uniquePosts.length) : 0;
      totalAffiliateLinks = uniquePosts.reduce((sum, post) => sum + (post.affiliateLinkCount || 0), 0);
      underMonetizedCount = uniquePosts.filter(
        (post) => (post.wordCount || 0) >= 1500 && (post.affiliateLinkCount || 0) <= 2
      ).length;
      postsWithNoAffiliateLinks = uniquePosts.filter(
        (post) => (post.affiliateLinkCount || 0) === 0
      ).length;
    }

    // Step 5: Store scan in database
    let scanId: string | null = null;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      // Use service role key if available (bypasses RLS), otherwise use anon key
      let supabase;
      const userId = user?.id || null; // null for anonymous users

      if (serviceRoleKey) {
        // Use service role key for reliable server-side inserts
        supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
      } else {
        // Fallback to anon key with RLS
        supabase = supabaseAuth;
      }

      // Save scan to database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const { data: savedScan, error: saveError } = await supabase
        .from('blog_scans')
        .insert({
          user_id: userId,
          blog_url: blogUrl,
          total_posts: scanResult.totalPosts,
          scanned_posts: uniquePosts.length, // All posts (with or without metadata)
          scan_data: {
            posts: uniquePosts, // Include all posts, not just those with metadata
            method: scanResult.method,
            summary: {
              totalWords,
              avgWordsPerPost,
              totalAffiliateLinks,
              underMonetizedCount,
              postsWithNoAffiliateLinks,
            },
          },
          expires_at: expiresAt.toISOString(),
        })
        .select('id')
        .single();

      if (!saveError && savedScan) {
        scanId = savedScan.id;
      } else {
        console.error('[Blog Scan] Error saving scan:', saveError);
        if (!serviceRoleKey) {
          console.warn('[Blog Scan] Consider setting SUPABASE_SERVICE_ROLE_KEY for reliable server-side inserts');
        }
      }
    } catch (error) {
      console.error('[Blog Scan] Error saving scan to database:', error);
      // Continue even if save fails - we'll return data without scanId
    }

    // Step 6: Return results
    const response: any = {
      scanId,
      blogUrl: scanResult.blogUrl,
      totalPosts: scanResult.totalPosts,
      scannedPosts: uniquePosts.length,
      posts: uniquePosts,
      method: scanResult.method,
      scannedAt: scanResult.scannedAt.toISOString(),
      creditsRemaining: creditsRemaining,
      isAnonymous,
      summary: {
        totalWords,
        avgWordsPerPost,
        totalAffiliateLinks,
        underMonetizedCount,
        postsWithNoAffiliateLinks,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Blog Scan] Error:', error);
    
    if (error.message?.includes('Invalid blog URL')) {
      return NextResponse.json(
        { error: 'Invalid blog URL format' },
        { status: 400 }
      );
    }
    
    if (error.message?.includes('Timeout')) {
      return NextResponse.json(
        { error: 'Request timeout. The blog may be too large or slow to respond.' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to scan blog',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

