import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { scrapeUrl } from '@/lib/scrapers/url-scraper';
import { extractStructuredContent } from '@/lib/scrapers/url-scraper';
import { detectAffiliateOpportunities } from '@/lib/ai/affiliate-detector';
import { generateProductIdeas } from '@/lib/ai/product-ideas-generator';
import { chunkContent, combineAnalysisResults, sortProductIdeasBySellability } from '@/lib/utils/content-chunker';
import { calculateCreditsForAnalysis, getAnalyzedWordCount } from '@/lib/utils/credit-calculator';
import { auditContent, generateCrossInsights } from '@/lib/audit/content-auditor';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';

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

    // Require authentication - no anonymous analysis
    if (authError || !user) {
      return NextResponse.json(
        { 
          error: 'Authentication required. Please sign up to analyze content.',
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const userId = user.id;
    
    // Get user data including credits
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('[Analyze] Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    const userCredits = userData.credits || 0;

    // Get user's global preference for charging extra for long pages
    let globalChargeExtra = false;
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('preferences')
      .eq('user_id', user.id)
      .single();

    globalChargeExtra = userSettings?.preferences?.chargeExtraForLongPages ?? false;

    // Parse request body
    const body = await req.json();
    const { url, chargeExtraForLongPages, primaryKeyword } = body;

    // Use per-page preference if provided, otherwise use global preference
    const chargeExtra = chargeExtraForLongPages !== undefined 
      ? chargeExtraForLongPages 
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

    // Step 1: Scrape the URL (always create a new analysis - no caching)
    console.log(`[Analyze] User ${userId} analyzing URL: ${url} (creating new analysis entry)`);
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

    // Step 1.5: Fetch HTML for structured content extraction (for SEO/AEO audit)
    let structuredContent = null;
    let auditResult = null;
    let crossInsights: string[] = [];
    
    try {
      // Check user preference for audit (default: enabled)
      const auditEnabled = userSettings?.preferences?.seoAuditEnabled !== false; // Default to true
      
      if (auditEnabled) {
        console.log('[Analyze] Running SEO/AEO content audit...');
        const htmlResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(15000),
        });
        
        if (htmlResponse.ok) {
          const html = await htmlResponse.text();
          structuredContent = await extractStructuredContent(url, html, primaryKeyword);
          
          // Run audit
          auditResult = await auditContent(structuredContent, url, {
            enabled: true,
            skipBrokenLinkCheck: false, // Can be made configurable
          });
          
          console.log(`[Analyze] Audit complete. Score: ${auditResult.score}/100`);
        } else {
          console.log('[Analyze] Failed to fetch HTML for audit, skipping...');
        }
      }
    } catch (error: any) {
      console.error('[Analyze] Error running audit:', error);
      // Don't fail the entire analysis if audit fails
    }

    // Calculate credits needed (always 1 credit per page)
    const creditsNeeded = calculateCreditsForAnalysis(scrapeResult.wordCount, chargeExtra);
    
    // Determine how many words will actually be analyzed
    const analyzedWordCount = getAnalyzedWordCount(scrapeResult.wordCount, chargeExtra);
    
    // Check if user has enough credits (authentication required - no free trials)
    if (userCredits < creditsNeeded) {
      return NextResponse.json(
        {
          error: `Insufficient credits. This analysis requires ${creditsNeeded} credit${creditsNeeded > 1 ? 's' : ''}, but you only have ${userCredits} credit${userCredits !== 1 ? 's' : ''}. Please sign up to get 3 free credits or purchase more credits.`,
          creditsNeeded,
          userCredits,
          wordCount: scrapeResult.wordCount,
          insufficientCredits: true,
        },
        { status: 403 }
      );
    }

    // Always analyze full content (simplified pricing: 1 credit per page)
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

    // Step 4.5: Generate cross-insights if audit and affiliate data are available
    if (auditResult && structuredContent && affiliateOpportunities.length > 0) {
      try {
        crossInsights = generateCrossInsights(auditResult, structuredContent, affiliateOpportunities);
      } catch (error: any) {
        console.error('[Analyze] Error generating cross-insights:', error);
      }
    }

    // Step 5: Save analysis to database (only for logged-in users)
    // Only save and deduct credits if analysis completed successfully
    let savedAnalysis = null;
    let creditsDeducted = false;
    
    try {
      // Save analysis (authentication required)
      const analysisData = {
        user_id: userId,
        url: scrapeResult.url,
        title: scrapeResult.title,
        content: contentToAnalyze.substring(0, 50000), // Limit content size
        word_count: analyzedWordCount, // Save the actual word count analyzed
        credits_used: creditsNeeded,
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
          seo_audit: auditResult ? {
            score: auditResult.score,
            tier1Passed: auditResult.tier1Passed,
            tier1Total: auditResult.tier1Total,
            tier2Passed: auditResult.tier2Passed,
            tier2Total: auditResult.tier2Total,
            criticalIssues: auditResult.criticalIssues,
            warnings: auditResult.warnings,
            optimizations: auditResult.optimizations,
            recommendations: auditResult.recommendations,
            checks: auditResult.checks,
            analyzedAt: auditResult.analyzedAt,
          } : null,
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

        // Deduct credits from user account
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
    } catch (saveOrCreditError: any) {
      // If we deducted credits but then failed to save, refund the credits
      if (creditsDeducted && userId) {
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
      creditsUsed: creditsNeeded,
      remainingCredits: userCredits,
      chargeExtraForLongPages: chargeExtra,
      linkDetails: scrapeResult.linkDetails || [],
      seoAudit: auditResult ? {
        score: auditResult.score,
        tier1Passed: auditResult.tier1Passed,
        tier1Total: auditResult.tier1Total,
        tier2Passed: auditResult.tier2Passed,
        tier2Total: auditResult.tier2Total,
        criticalIssues: auditResult.criticalIssues,
        warnings: auditResult.warnings,
        optimizations: auditResult.optimizations,
        recommendations: auditResult.recommendations,
        checks: auditResult.checks,
        analyzedAt: auditResult.analyzedAt,
      } : null,
      crossInsights,
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
      ].filter(Boolean),
    });

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

