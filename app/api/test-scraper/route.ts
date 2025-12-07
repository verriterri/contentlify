import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '../../../lib/scrapers/url-scraper';
import { detectAffiliateOpportunities } from '../../../lib/ai/affiliate-detector';
import { generateProductIdeas } from '../../../lib/ai/product-ideas-generator';

/**
 * Test endpoint for scraping and affiliate detection
 * POST /api/test-scraper
 * Body: { url: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Step 1: Scrape the URL
    console.log('Scraping URL:', url);
    const scrapeResult = await scrapeUrl(url);

    if (scrapeResult.error) {
      return NextResponse.json(
        {
          error: scrapeResult.error,
          scrapeResult,
        },
        { status: 400 }
      );
    }

    // Step 2: Detect affiliate opportunities
    console.log('Detecting affiliate opportunities...');
    let affiliateOpportunities = [];
    
    try {
      affiliateOpportunities = await detectAffiliateOpportunities(
        scrapeResult.content,
        scrapeResult.existingLinks,
        scrapeResult.linkDetails || [],
        scrapeResult.title,
        scrapeResult.url
      );
    } catch (error: any) {
      console.error('[Test Scraper] Error detecting affiliates:', error);
      console.error('[Test Scraper] Content length:', scrapeResult.content.length);
      console.error('[Test Scraper] Content preview:', scrapeResult.content.substring(0, 500));
      console.error('[Test Scraper] Link details count:', scrapeResult.linkDetails?.length || 0);
      
      // Return scrape results even if affiliate detection fails
      return NextResponse.json({
        scrapeResult,
        affiliateError: error.message,
        affiliateOpportunities: [],
        productIdeas: [],
        debug: {
          contentLength: scrapeResult.content.length,
          contentPreview: scrapeResult.content.substring(0, 500),
          linkCount: scrapeResult.linkDetails?.length || 0,
        },
      });
    }

    // Step 3: Generate product ideas
    console.log('Generating product ideas...');
    let productIdeas = [];
    
    try {
      productIdeas = await generateProductIdeas(
        scrapeResult.content,
        scrapeResult.title
      );
    } catch (error: any) {
      console.error('[Test Scraper] Error generating product ideas:', error);
      // Don't fail the whole request if product ideas fail
      productIdeas = [];
    }

    return NextResponse.json({
      success: true,
      scrapeResult: {
        url: scrapeResult.url,
        title: scrapeResult.title,
        contentLength: scrapeResult.content.length,
        wordCount: scrapeResult.wordCount,
        existingLinksCount: scrapeResult.existingLinks.length,
        existingLinks: scrapeResult.existingLinks.slice(0, 10), // First 10 links
      },
      linkDetails: scrapeResult.linkDetails || [],
      affiliateOpportunities: affiliateOpportunities.map((opp) => ({
        product: opp.product,
        category: opp.category,
        context: opp.context.substring(0, 200), // First 200 chars of context
        confidence: opp.confidence,
        relevance: opp.relevance,
        isAlreadyLinked: opp.isAlreadyLinked,
        linkedUrl: opp.linkedUrl,
        linkAnchorText: opp.linkAnchorText,
        affiliatePrograms: opp.affiliatePrograms.map((prog) => ({
          name: prog.name,
          url: prog.url,
          commission: prog.commission,
          isPrimary: prog.isPrimary,
          note: prog.note,
        })),
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
      fullContent: scrapeResult.content.substring(0, 1000), // First 1000 chars for preview
    });
  } catch (error: any) {
    console.error('Test scraper error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

