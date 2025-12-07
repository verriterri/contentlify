import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { scrapeUrl } from '@/lib/scrapers/url-scraper';
import { detectAffiliateOpportunities } from '@/lib/ai/affiliate-detector';
import { generateProductIdeas } from '@/lib/ai/product-ideas-generator';
import { getUrlsFromSitemap, crawlSiteForUrls } from '@/lib/crawlers/site-crawler';
import { chunkContent, combineAnalysisResults, sortProductIdeasBySellability } from '@/lib/utils/content-chunker';
import { PRICING_PLANS, PricingTier } from '@/lib/pricing';

/**
 * POST /api/analyze-site
 * Site-wide audit: Crawls a site and analyzes all child URLs
 * Only available for Pro/Agency tiers
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

    // Verify user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { rootUrl, maxUrls = 20 } = body;

    if (!rootUrl || typeof rootUrl !== 'string') {
      return NextResponse.json(
        { error: 'Root URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(rootUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log(`[Analyze Site] User ${user.id} analyzing site: ${rootUrl}`);

    // Step 1: Get URLs from sitemap or crawl
    let urlsToAnalyze: string[] = [];

    // Try sitemap first (more efficient)
    const sitemapUrls = await getUrlsFromSitemap(rootUrl);
    if (sitemapUrls.length > 0) {
      urlsToAnalyze = sitemapUrls.slice(0, maxUrls);
      console.log(`[Analyze Site] Found ${urlsToAnalyze.length} URLs from sitemap`);
    } else {
      // Fallback to crawling
      console.log('[Analyze Site] No sitemap found, crawling site...');
      const crawlResult = await crawlSiteForUrls(rootUrl, maxUrls);
      urlsToAnalyze = crawlResult.urls;
      console.log(`[Analyze Site] Crawled ${urlsToAnalyze.length} URLs`);
    }

    if (urlsToAnalyze.length === 0) {
      return NextResponse.json(
        { error: 'No URLs found to analyze. Make sure the site is accessible.' },
        { status: 400 }
      );
    }

    // Step 2: Analyze each URL
    const allAffiliateOpportunities: any[][] = [];
    const allProductIdeas: any[][] = [];
    const analyzedUrls: any[] = [];

    for (let i = 0; i < urlsToAnalyze.length; i++) {
      const url = urlsToAnalyze[i];
      console.log(`[Analyze Site] Analyzing ${i + 1}/${urlsToAnalyze.length}: ${url}`);

      try {
        // Scrape the URL
        const scrapeResult = await scrapeUrl(url);

        if (scrapeResult.error) {
          analyzedUrls.push({
            url,
            status: 'failed',
            error: scrapeResult.error,
          });
          continue;
        }

        // Check if content needs chunking
        const chunks = chunkContent(scrapeResult.content, 8000);
        const chunkAffiliateOpportunities: any[][] = [];
        const chunkProductIdeas: any[][] = [];

        // Analyze each chunk
        for (const chunk of chunks) {
          try {
            const affiliateOpps = await detectAffiliateOpportunities(
              chunk.text,
              scrapeResult.existingLinks,
              scrapeResult.linkDetails || [],
              scrapeResult.title,
              scrapeResult.url
            );
            chunkAffiliateOpportunities.push(affiliateOpps);
          } catch (error: any) {
            console.error(`[Analyze Site] Error detecting affiliates for ${url}:`, error);
          }

          try {
            const productIdeas = await generateProductIdeas(chunk.text, scrapeResult.title);
            chunkProductIdeas.push(productIdeas);
          } catch (error: any) {
            console.error(`[Analyze Site] Error generating product ideas for ${url}:`, error);
          }
        }

        // Combine chunk results
        const combinedAffiliates = combineAnalysisResults(chunkAffiliateOpportunities);
        // Sort by sellability and limit to 5 per URL
        const combinedProducts = sortProductIdeasBySellability(
          combineAnalysisResults(chunkProductIdeas)
        ).slice(0, 5);

        allAffiliateOpportunities.push(combinedAffiliates);
        allProductIdeas.push(combinedProducts);

        analyzedUrls.push({
          url,
          title: scrapeResult.title,
          wordCount: scrapeResult.wordCount,
          status: 'completed',
          affiliateCount: combinedAffiliates.length,
          productIdeasCount: combinedProducts.length,
        });
      } catch (error: any) {
        console.error(`[Analyze Site] Error analyzing ${url}:`, error);
        analyzedUrls.push({
          url,
          status: 'failed',
          error: error.message || 'Unknown error',
        });
      }

      // Small delay to avoid overwhelming the server
      if (i < urlsToAnalyze.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Step 3: Combine all results across all URLs
    const finalAffiliateOpportunities = combineAnalysisResults(allAffiliateOpportunities);
    // For site-wide analysis, combine across URLs, sort by sellability, then limit to top 5
    // This ensures we get the most sellable/lucrative ideas across all analyzed pages
    const combinedSiteIdeas = combineAnalysisResults(allProductIdeas);
    const finalProductIdeas = sortProductIdeasBySellability(combinedSiteIdeas).slice(0, 5);

    // Step 4: Save to database (save as a single site-wide analysis)
    const analysisData = {
      user_id: user.id,
      url: rootUrl,
      title: `Site-wide audit of ${urlsToAnalyze.length} pages`,
      content: `Site-wide audit of ${urlsToAnalyze.length} pages`,
      affiliate_opportunities: finalAffiliateOpportunities.map((opp) => ({
        product: opp.product,
        category: opp.category,
        context: opp.context,
        confidence: opp.confidence,
        relevance: opp.relevance,
        isAlreadyLinked: opp.isAlreadyLinked,
        estimatedValue: opp.estimatedValue,
        affiliatePrograms: opp.affiliatePrograms,
      })),
      product_ideas: finalProductIdeas.map((idea) => ({
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
      console.error('[Analyze Site] Error saving analysis:', saveError);
    }

    return NextResponse.json({
      success: true,
      analysisId: savedAnalysis?.id || null,
      url: rootUrl,
      title: `Site-wide audit of ${urlsToAnalyze.length} pages`,
      wordCount: analyzedUrls.reduce((sum, u) => sum + (u.wordCount || 0), 0),
      totalUrlsAnalyzed: analyzedUrls.filter((u) => u.status === 'completed').length,
      totalUrls: urlsToAnalyze.length,
      analyzedUrls,
      affiliateOpportunities: finalAffiliateOpportunities.map((opp) => ({
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
      productIdeas: finalProductIdeas.map((idea) => ({
        name: idea.name,
        type: idea.type,
        description: idea.description,
        valueProposition: idea.valueProposition,
        suggestedPrice: idea.suggestedPrice,
        estimatedTime: idea.estimatedTime,
        targetAudience: idea.targetAudience,
      })),
      warnings: [],
    });
  } catch (error: any) {
    console.error('[Analyze Site] Unexpected error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

