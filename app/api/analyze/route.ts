import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { scrapeUrl } from '@/lib/scrapers/url-scraper';
import { detectAffiliateOpportunities } from '@/lib/ai/affiliate-detector';
import { generateProductIdeas } from '@/lib/ai/product-ideas-generator';
import { chunkContent, combineAnalysisResults, sortProductIdeasBySellability } from '@/lib/utils/content-chunker';
import { calculateCreditsForAnalysis, getAnalyzedWordCount } from '@/lib/utils/credit-calculator';
import { getClientIP, hashIPAddress, hashFingerprint, createUsageKey, hasUsedFreeTrial, recordFreeTrialUsage } from '@/lib/utils/abuse-prevention';

/**
 * POST /api/analyze
 * Analyzes content from a URL for affiliate opportunities and product ideas
 * 
 * Body: { url: string }
 * Returns: Analysis results with affiliate opportunities and product ideas
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const isAnonymous = authError || !user;
    let userCredits = 0;
    let freeTrialUsed = false;
    let userId: string | null = null;
    
    // Store abuse tracking info for anonymous users (will be populated after body parsing)
    let abuseTracking: {
      usageKey: string;
      ipHash: string;
      fingerprintHash: string | null;
      clientIP: string;
    } | null = null;

    if (!isAnonymous && user) {
      userId = user.id;
      
      // Get user data including credits and free trial status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('credits, free_trial_used')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        console.error('[Analyze] Error fetching user data:', userError);
        return NextResponse.json(
          { error: 'User data not found' },
          { status: 404 }
        );
      }

      userCredits = userData.credits || 0;
      freeTrialUsed = userData.free_trial_used || false;
      
      // If user has 0 credits, they can still use free trial (abuse prevention handled separately)
      // This allows logged-in users to analyze 1 post for free even without credits
    }

    // Get user's global preference for charging extra for long posts (only for logged-in users)
    let globalChargeExtra = false;
    if (!isAnonymous && user) {
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .single();

      globalChargeExtra = userSettings?.preferences?.chargeExtraForLongPosts ?? false;
    }

    // Parse request body
    const body = await req.json();
    const { url, forceRecrawl, chargeExtraForLongPosts, fingerprint } = body;
    
    // For anonymous users, set up abuse tracking after we have the fingerprint
    if (isAnonymous) {
      const clientIP = getClientIP(req);
      const ipHash = hashIPAddress(clientIP);
      const fingerprintHash = fingerprint ? hashFingerprint(fingerprint) : null;
      
      // Create combined usage key (IP + fingerprint)
      // Fingerprint is more persistent than IP (survives VPN changes)
      const usageKey = createUsageKey(clientIP, fingerprint || null);
      
      // Check database for free trial usage (checks combined key, fingerprint, and IP)
      freeTrialUsed = await hasUsedFreeTrial(
        supabase,
        usageKey,
        ipHash,
        fingerprintHash || undefined
      );
      
      // Store tracking info for later use when recording
      abuseTracking = {
        usageKey,
        ipHash,
        fingerprintHash,
        clientIP,
      };
      
      // Also check cookie for UX (but database tracking is the source of truth)
      const freeTrialCookie = cookieStore.get('free_trial_used');
      const cookieBasedFreeTrialUsed = freeTrialCookie?.value === 'true';
      
      // Log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analyze] Anonymous user free trial check:', {
          clientIP: clientIP.substring(0, 10) + '...',
          hasFingerprint: !!fingerprint,
          ipBasedFreeTrialUsed: freeTrialUsed,
          cookieBasedFreeTrialUsed,
        });
      }
    }

    // Use per-post preference if provided, otherwise use global preference
    const chargeExtra = chargeExtraForLongPosts !== undefined 
      ? chargeExtraForLongPosts 
      : globalChargeExtra;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check for existing analysis (cache check - no expiration)
    // Skip cache if forceRecrawl is true
    // Only check cache for logged-in users (anonymous users can't access cached results)
    if (!forceRecrawl && !isAnonymous && userId) {
      // Check for existing non-deleted analysis (cache check - no expiration)
      const { data: recentAnalysis, error: recentError } = await supabase
        .from('content_analyses')
        .select('*')
        .eq('user_id', userId)
        .eq('url', url)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentAnalysis && !recentError) {
        console.log(`[Analyze] Found recent analysis for ${url} (created ${recentAnalysis.created_at}), returning cached result`);
        
        // Calculate word count from content if available
        const wordCount = recentAnalysis.content
          ? recentAnalysis.content.split(/\s+/).filter((w: string) => w.length > 0).length
          : 0;

        return NextResponse.json({
          success: true,
          analysisId: recentAnalysis.id,
          url: recentAnalysis.url,
          title: recentAnalysis.title || recentAnalysis.content?.substring(0, 100) || 'Previous Analysis',
          wordCount,
        affiliateOpportunities: Array.isArray(recentAnalysis.affiliate_opportunities)
          ? recentAnalysis.affiliate_opportunities.map((opp: any) => ({
              product: opp.product,
              category: opp.category,
              context: opp.context,
              confidence: opp.confidence,
              relevance: opp.relevance,
              isAlreadyLinked: opp.isAlreadyLinked,
              linkedUrl: opp.linkedUrl,
              linkAnchorText: opp.linkAnchorText,
              estimatedValue: opp.estimatedValue,
              affiliatePrograms: opp.affiliatePrograms || [],
            }))
          : [],
          productIdeas: Array.isArray(recentAnalysis.product_ideas)
            ? recentAnalysis.product_ideas.map((idea: any) => ({
                name: idea.name,
                type: idea.type,
                description: idea.description,
                valueProposition: idea.valueProposition,
                suggestedPrice: idea.suggestedPrice,
                estimatedTime: idea.estimatedTime,
                targetAudience: idea.targetAudience,
              }))
            : [],
          warnings: ['This is a cached result from a previous analysis (cached indefinitely - use Force Re-crawl to refresh)'],
          cached: true,
        });
      }
    }

    // Step 1: Scrape the URL (if no existing analysis found or forceRecrawl is true)
    // Note: When forceRecrawl is true, we create a new analysis entry, preserving all history
    if (forceRecrawl) {
      console.log(`[Analyze] ${isAnonymous ? 'Anonymous user' : `User ${userId}`} analyzing URL: ${url} (force re-crawl requested - will create new analysis entry)`);
    } else {
      console.log(`[Analyze] ${isAnonymous ? 'Anonymous user' : `User ${userId}`} analyzing URL: ${url} (no cached analysis found - creating new entry)`);
    }
    const scrapeResult = await scrapeUrl(url);

    if (scrapeResult.error) {
      return NextResponse.json(
        {
          error: `Failed to scrape URL: ${scrapeResult.error}`,
          urlError: scrapeResult.error,
        },
        { status: 400 }
      );
    }

    // Calculate credits needed (always 1 credit per post)
    const creditsNeeded = calculateCreditsForAnalysis(scrapeResult.wordCount, chargeExtra);
    
    // Determine how many words will actually be analyzed
    const analyzedWordCount = getAnalyzedWordCount(scrapeResult.wordCount, chargeExtra);
    
    // Check free trial eligibility
    // Free trial available if: not used yet, analyzing 1 post, and (anonymous OR logged-in with 0 credits)
    const canUseFreeTrial = !freeTrialUsed && creditsNeeded === 1 && (isAnonymous || userCredits === 0);
    const isFreeTrial = canUseFreeTrial;
    
    // Check if user has enough credits (or is using free trial)
    if (!isFreeTrial && userCredits < creditsNeeded) {
      if (isAnonymous) {
        return NextResponse.json(
          {
            error: `Free trial already used. Please sign up to purchase credits and continue analyzing.`,
            creditsNeeded,
            userCredits: 0,
            wordCount: scrapeResult.wordCount,
            freeTrialUsed: true,
            requiresSignup: true,
            insufficientCredits: true,
          },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          {
            error: `Insufficient credits. This analysis requires ${creditsNeeded} credit${creditsNeeded > 1 ? 's' : ''}, but you only have ${userCredits} credit${userCredits !== 1 ? 's' : ''}.`,
            creditsNeeded,
            userCredits,
            wordCount: scrapeResult.wordCount,
            insufficientCredits: true,
          },
          { status: 403 }
        );
      }
    }

    // Always analyze full content (simplified pricing: 1 credit per post)
    const contentToAnalyze = scrapeResult.content;

    // Step 2: Check if content needs chunking (>8000 chars)
    const needsChunking = contentToAnalyze.length > 8000;
    const chunks = needsChunking ? chunkContent(contentToAnalyze, 8000) : null;

    // Helper function to check if error is a rate limit error
    const isRateLimitError = (error: any): boolean => {
      // Check original error first (if preserved by AI functions)
      const originalError = error?.originalError || error;
      
      // Check HTTP status codes first (most reliable)
      const status = originalError?.status || originalError?.statusCode || originalError?.response?.status || originalError?.error?.status || error?.status || error?.statusCode;
      if (status === 429) {
        return true;
      }
      
      // Check OpenAI-specific error codes
      const code = originalError?.code || originalError?.error?.code || error?.code || '';
      if (typeof code === 'string') {
        const codeLower = code.toLowerCase();
        if (codeLower.includes('rate_limit') || codeLower === 'rate_limit_exceeded') {
          return true;
        }
      }
      
      // Check error messages (but be more specific to avoid false positives)
      const errorMessage = originalError?.message || originalError?.error?.message || error?.message || '';
      if (typeof errorMessage === 'string') {
        const messageLower = errorMessage.toLowerCase();
        // Only match specific rate limit phrases, not generic "too many requests"
        if (
          messageLower.includes('rate limit exceeded') ||
          messageLower.includes('rate_limit_exceeded') ||
          messageLower.includes('you exceeded your current quota') ||
          messageLower.includes('quota exceeded') ||
          (messageLower.includes('rate limit') && messageLower.includes('exceeded'))
        ) {
          return true;
        }
      }
      
      return false;
    };

    // Step 3: Detect affiliate opportunities (with chunking support)
    let affiliateOpportunities = [];
    let affiliateError = null;

    try {
      console.log('[Analyze] Detecting affiliate opportunities...');
      
      if (needsChunking && chunks) {
        console.log(`[Analyze] Content is ${scrapeResult.content.length} chars, chunking into ${chunks.length} pieces`);
        const chunkResults: any[][] = [];
        
        for (let i = 0; i < chunks.length; i++) {
          console.log(`[Analyze] Processing chunk ${i + 1}/${chunks.length}...`);
          try {
            const chunkOpps = await detectAffiliateOpportunities(
              chunks[i].text,
              scrapeResult.existingLinks,
              scrapeResult.linkDetails || [],
              scrapeResult.title,
              scrapeResult.url
            );
            chunkResults.push(chunkOpps);
          } catch (error: any) {
            console.error(`[Analyze] Error in chunk ${i + 1}:`, error);
            if (isRateLimitError(error)) {
              throw error; // Re-throw rate limit errors to stop analysis
            }
          }
        }
        
        // Combine results from all chunks
        affiliateOpportunities = combineAnalysisResults(chunkResults);
      } else {
        affiliateOpportunities = await detectAffiliateOpportunities(
          contentToAnalyze,
          scrapeResult.existingLinks,
          scrapeResult.linkDetails || [],
          scrapeResult.title,
          scrapeResult.url
        );
      }
    } catch (error: any) {
      console.error('[Analyze] Error detecting affiliates:', error);
      if (isRateLimitError(error)) {
        // Rate limit error - stop analysis and don't charge credits
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Please wait a few minutes before trying again. Your credits were not charged.',
            rateLimitExceeded: true,
          },
          { status: 429 }
        );
      }
      affiliateError = error.message;
      // Continue with other steps only if it's not a rate limit error
    }

    // Step 4: Generate product ideas (with chunking support)
    let productIdeas = [];
    let productIdeasError = null;

    try {
      console.log('[Analyze] Generating product ideas...');
      
      if (needsChunking && chunks) {
        const chunkResults: any[][] = [];
        
        for (let i = 0; i < chunks.length; i++) {
          try {
            const chunkIdeas = await generateProductIdeas(chunks[i].text, scrapeResult.title);
            chunkResults.push(chunkIdeas);
          } catch (error: any) {
            console.error(`[Analyze] Error generating ideas for chunk ${i + 1}:`, error);
            if (isRateLimitError(error)) {
              throw error; // Re-throw rate limit errors to stop analysis
            }
          }
        }
        
        // Combine results from all chunks
        productIdeas = combineAnalysisResults(chunkResults);
        // Sort by sellability (most sellable/lucrative first) before limiting
        productIdeas = sortProductIdeasBySellability(productIdeas);
        // Enforce limit of 5 product ideas after combining chunks
        productIdeas = productIdeas.slice(0, 5);
      } else {
        productIdeas = await generateProductIdeas(
          contentToAnalyze,
          scrapeResult.title
        );
      }
    } catch (error: any) {
      console.error('[Analyze] Error generating product ideas:', error);
      if (isRateLimitError(error)) {
        // Rate limit error - stop analysis and don't charge credits
        return NextResponse.json(
          {
            error: 'Rate limit exceeded. Please wait a few minutes before trying again. Your credits were not charged.',
            rateLimitExceeded: true,
          },
          { status: 429 }
        );
      }
      productIdeasError = error.message;
      // Continue only if it's not a rate limit error
    }

    // Step 5: Save analysis to database (only for logged-in users)
    // Only save and deduct credits if analysis completed successfully
    let savedAnalysis = null;
    let creditsDeducted = false;
    
    try {
      if (!isAnonymous && userId) {
        const analysisData = {
          user_id: userId,
          url: scrapeResult.url,
          title: scrapeResult.title,
          content: contentToAnalyze.substring(0, 50000), // Limit content size
          word_count: analyzedWordCount, // Save the actual word count analyzed
          credits_used: isFreeTrial ? 0 : creditsNeeded, // Free trial uses 0 credits
          affiliate_opportunities: affiliateOpportunities.map((opp) => ({
            product: opp.product,
            category: opp.category,
            context: opp.context,
            confidence: opp.confidence,
            relevance: opp.relevance,
            isAlreadyLinked: opp.isAlreadyLinked,
            linkedUrl: opp.linkedUrl,
            linkAnchorText: opp.linkAnchorText,
            estimatedValue: opp.estimatedValue,
            affiliatePrograms: opp.affiliatePrograms,
          })),
          product_ideas: productIdeas.map((idea) => ({
            name: idea.name,
            type: idea.type,
            description: idea.description,
            valueProposition: idea.valueProposition,
            suggestedPrice: idea.suggestedPrice,
            estimatedTime: idea.estimatedTime,
            targetAudience: idea.targetAudience,
          })),
          status: 'completed',
        };

        const { data: saved, error: saveError } = await supabase
          .from('content_analyses')
          .insert(analysisData)
          .select('id')
          .single();

        if (saveError) {
          console.error('[Analyze] Error saving analysis:', saveError);
          throw new Error(`Failed to save analysis: ${saveError.message}`);
        }
        
        savedAnalysis = saved;

        // Mark free trial as used if this was a free trial (for logged-in users only)
        if (isFreeTrial) {
          // Logged-in user: update users table
          const { error: trialError } = await supabase
            .from('users')
            .update({ free_trial_used: true })
            .eq('id', userId);
          
          if (trialError) {
            console.error('[Analyze] Error marking free trial as used:', trialError);
            throw new Error(`Failed to mark free trial as used: ${trialError.message}`);
          }
          console.log(`[Analyze] Marked free trial as used for user ${userId}`);
        } else {
          // Deduct credits from user account (only if not free trial)
          // Only deduct if we successfully saved the analysis
          const newCredits = userCredits - creditsNeeded;
          const { error: creditError } = await supabase
            .from('users')
            .update({ credits: newCredits })
            .eq('id', userId);

          if (creditError) {
            console.error('[Analyze] Error deducting credits:', creditError);
            throw new Error(`Failed to deduct credits: ${creditError.message}`);
          }
          
          console.log(`[Analyze] Deducted ${creditsNeeded} credits from user ${userId}. New balance: ${newCredits}`);
          userCredits = newCredits; // Update for response
          creditsDeducted = true;
        }
      } else if (isAnonymous && isFreeTrial) {
        // For anonymous users, record free trial usage in database (IP + fingerprint tracking)
        if (abuseTracking) {
          await recordFreeTrialUsage(
            supabase,
            abuseTracking.usageKey,
            abuseTracking.ipHash,
            abuseTracking.fingerprintHash
          );
          console.log(`[Analyze] Recorded free trial usage for anonymous user (IP: ${abuseTracking.clientIP.substring(0, 10)}..., has fingerprint: ${!!abuseTracking.fingerprintHash})`);
        } else {
          console.error('[Analyze] Warning: Anonymous user used free trial but abuseTracking is null');
        }
      }
    } catch (saveOrCreditError: any) {
      // If we deducted credits but then failed to save, refund the credits
      if (creditsDeducted && !isAnonymous && userId) {
        console.error('[Analyze] Error after credit deduction, refunding credits...');
        const { error: refundError } = await supabase
          .from('users')
          .update({ credits: userCredits + creditsNeeded })
          .eq('id', userId);
        
        if (refundError) {
          console.error('[Analyze] CRITICAL: Failed to refund credits after error:', refundError);
        } else {
          console.log(`[Analyze] Refunded ${creditsNeeded} credits to user ${userId}`);
        }
      }
      
      // Re-throw the error so it's caught by the outer catch block
      throw saveOrCreditError;
    }

    // Step 6: Return results
    const response = NextResponse.json({
      success: true,
      analysisId: savedAnalysis?.id || null,
      url: scrapeResult.url,
      title: scrapeResult.title,
      wordCount: analyzedWordCount,
      totalWordCount: scrapeResult.wordCount, // Original word count
      creditsUsed: isFreeTrial ? 0 : creditsNeeded,
      remainingCredits: isAnonymous ? 0 : userCredits,
      isFreeTrial,
      isAnonymous,
      chargeExtraForLongPosts: chargeExtra,
      affiliateOpportunities: affiliateOpportunities.map((opp) => ({
        product: opp.product,
        category: opp.category,
        context: opp.context,
        confidence: opp.confidence,
        relevance: opp.relevance,
        isAlreadyLinked: opp.isAlreadyLinked,
        linkedUrl: opp.linkedUrl,
        linkAnchorText: opp.linkAnchorText,
        estimatedValue: opp.estimatedValue,
        affiliatePrograms: opp.affiliatePrograms,
      })),
      productIdeas: productIdeas.map((idea) => ({
        name: idea.name,
        type: idea.type,
        description: idea.description,
        valueProposition: idea.valueProposition,
        suggestedPrice: idea.suggestedPrice,
        estimatedTime: idea.estimatedTime,
        targetAudience: idea.targetAudience,
      })),
      warnings: [
        ...(affiliateError ? [`Affiliate detection: ${affiliateError}`] : []),
        ...(productIdeasError ? [`Product ideas: ${productIdeasError}`] : []),
        ...(isAnonymous ? ['This is a free trial analysis. Sign up to save your results and analyze more posts.'] : []),
        ...(isFreeTrial && !isAnonymous ? ['You used your free trial! Purchase credits to analyze more posts.'] : []),
      ].filter(Boolean),
    });

    // Set cookie for anonymous users who used free trial (for UX, but IP tracking is source of truth)
    if (isAnonymous && isFreeTrial) {
      response.cookies.set('free_trial_used', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    console.error('[Analyze] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

