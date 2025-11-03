import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { scrapeUrl } from '@/lib/scrapers/url-scraper';
import { detectAffiliateOpportunities } from '@/lib/ai/affiliate-detector';
import { generateProductIdeas } from '@/lib/ai/product-ideas-generator';
import { PRICING_PLANS, PricingTier } from '@/lib/pricing';
import { chunkContent, combineAnalysisResults, sortProductIdeasBySellability } from '@/lib/utils/content-chunker';

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

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to continue' },
        { status: 401 }
      );
    }

    // Get user data including subscription tier
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, subscription_tier, subscription_status')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('[Analyze] Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    // Handle free tier (not in PRICING_PLANS, use starter limits)
    const subscriptionTier = userData.subscription_tier || 'free';
    const plan =
      subscriptionTier === 'free'
        ? { ...PRICING_PLANS.starter, analysesLimit: 1, productsLimit: 3 } // Free tier limits
        : PRICING_PLANS[subscriptionTier as PricingTier] || PRICING_PLANS.starter;

    // Check analysis limits for non-unlimited tiers
    if (plan.analysesLimit !== null) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Count all analyses in current month, including deleted ones (they consumed quota)
      const { count, error: countError } = await supabase
        .from('content_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if (countError) {
        console.error('[Analyze] Error counting analyses:', countError);
        return NextResponse.json(
          { error: 'Failed to check usage limits' },
          { status: 500 }
        );
      }

      const currentCount = count || 0;
      if (currentCount >= plan.analysesLimit) {
        return NextResponse.json(
          {
            error: `Analysis limit reached. You've used ${currentCount} of ${plan.analysesLimit} analyses this month. Upgrade to Pro for unlimited analyses.`,
            limitReached: true,
            currentCount,
            limit: plan.analysesLimit,
          },
          { status: 403 }
        );
      }
    }

    // Parse request body
    const body = await req.json();
    const { url, forceRecrawl } = body;

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
    if (!forceRecrawl) {
      // Check for existing non-deleted analysis (cache check - no expiration)
      const { data: recentAnalysis, error: recentError } = await supabase
        .from('content_analyses')
        .select('*')
        .eq('user_id', user.id)
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
      console.log(`[Analyze] User ${user.id} analyzing URL: ${url} (force re-crawl requested - will create new analysis entry)`);
    } else {
      console.log(`[Analyze] User ${user.id} analyzing URL: ${url} (no cached analysis found - creating new entry)`);
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

    // Step 2: Check if content needs chunking (>8000 chars)
    const needsChunking = scrapeResult.content.length > 8000;
    const chunks = needsChunking ? chunkContent(scrapeResult.content, 8000) : null;

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
          }
        }
        
        // Combine results from all chunks
        affiliateOpportunities = combineAnalysisResults(chunkResults);
      } else {
        affiliateOpportunities = await detectAffiliateOpportunities(
          scrapeResult.content,
          scrapeResult.existingLinks,
          scrapeResult.linkDetails || [],
          scrapeResult.title,
          scrapeResult.url
        );
      }
    } catch (error: any) {
      console.error('[Analyze] Error detecting affiliates:', error);
      affiliateError = error.message;
      // Continue with other steps even if affiliate detection fails
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
          scrapeResult.content,
          scrapeResult.title
        );
      }
    } catch (error: any) {
      console.error('[Analyze] Error generating product ideas:', error);
      productIdeasError = error.message;
      // Continue even if product ideas fail
    }

    // Step 5: Save analysis to database
    const analysisData = {
      user_id: user.id,
      url: scrapeResult.url,
      title: scrapeResult.title,
      content: scrapeResult.content.substring(0, 50000), // Limit content size
      affiliate_opportunities: affiliateOpportunities.map((opp) => ({
        product: opp.product,
        category: opp.category,
        context: opp.context,
        confidence: opp.confidence,
        relevance: opp.relevance,
        isAlreadyLinked: opp.isAlreadyLinked,
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

    const { data: savedAnalysis, error: saveError } = await supabase
      .from('content_analyses')
      .insert(analysisData)
      .select('id')
      .single();

    if (saveError) {
      console.error('[Analyze] Error saving analysis:', saveError);
      // Continue and return results even if save fails
    }

    // Step 6: Return results
    return NextResponse.json({
      success: true,
      analysisId: savedAnalysis?.id || null,
      url: scrapeResult.url,
      title: scrapeResult.title,
      wordCount: scrapeResult.wordCount,
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
        ...(!savedAnalysis ? ['Analysis saved locally but not to database'] : []),
      ].filter(Boolean),
    });
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

