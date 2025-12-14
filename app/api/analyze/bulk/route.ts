import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { scrapeUrl, extractStructuredContent } from '@/lib/scrapers/url-scraper';
import { detectAffiliateOpportunities } from '@/lib/ai/affiliate-detector';
import { generateProductIdeas } from '@/lib/ai/product-ideas-generator';
import { calculateCreditsForAnalysis, getAnalyzedWordCount } from '@/lib/utils/credit-calculator';
import { chunkContent, combineAnalysisResults, sortProductIdeasBySellability } from '@/lib/utils/content-chunker';
import { auditContent } from '@/lib/audit/content-auditor';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';

/**
 * POST /api/analyze/bulk
 * Analyze multiple pages in bulk
 * Body: { scanId: string, pageUrls: string[], preferences: Record<string, boolean> }
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

    // Get user data including credits
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    const userCredits = userData.credits || 0;

    // Get user's global preference
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('preferences')
      .eq('user_id', user.id)
      .single();

    const globalChargeExtra = userSettings?.preferences?.chargeExtraForLongPages ?? false;

    // Parse request body
    const body = await req.json();
    const { scanId, pageUrls, preferences } = body;

    if (!pageUrls || !Array.isArray(pageUrls) || pageUrls.length === 0) {
      return NextResponse.json(
        { error: 'pageUrls array is required' },
        { status: 400 }
      );
    }

    if (pageUrls.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 pages per bulk analysis' },
        { status: 400 }
      );
    }

    // Get scan data if scanId provided
    let scanData: any = null;
    if (scanId) {
      const { data: scan } = await supabase
        .from('site_scans')
        .select('scan_data')
        .eq('id', scanId)
        .single();

      if (scan) {
        scanData = scan.scan_data;
      }
    }

    // Calculate total credits needed
    let totalCreditsNeeded = 0;
    const pageMetadata: Array<{ url: string; wordCount: number }> = [];

    // If we have scan data, use word counts from there
    if (scanData?.pages) {
      for (const url of pageUrls) {
        const page = scanData.pages.find((p: any) => p.url === url);
        if (page) {
          // Handle both old format (boolean) and new format (object with chargeExtra and primaryKeyword)
          const pref = preferences?.[url];
          const chargeExtra = typeof pref === 'boolean' ? pref : (pref?.chargeExtra ?? globalChargeExtra);
          const credits = calculateCreditsForAnalysis(page.wordCount, chargeExtra);
          totalCreditsNeeded += credits;
          pageMetadata.push({ url, wordCount: page.wordCount });
        } else {
          // Page not in scan data, will need to scrape
          pageMetadata.push({ url, wordCount: 0 });
        }
      }
    } else {
      // No scan data, estimate 1 credit per page (will be recalculated during analysis)
      totalCreditsNeeded = pageUrls.length;
      pageUrls.forEach((url) => {
        pageMetadata.push({ url, wordCount: 0 });
      });
    }

    // Check if user has enough credits
    if (userCredits < totalCreditsNeeded) {
      return NextResponse.json(
        {
          error: `Insufficient credits. This analysis requires ${totalCreditsNeeded} credits, but you only have ${userCredits}.`,
          creditsNeeded: totalCreditsNeeded,
          userCredits,
          insufficientCredits: true,
        },
        { status: 403 }
      );
    }

    // Create analysis job
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .insert({
        user_id: user.id,
        scan_id: scanId || null,
        total_pages: pageUrls.length,
        completed_pages: 0,
        failed_pages: 0,
        status: 'queued',
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('[Bulk Analysis] Error creating job:', jobError);
      return NextResponse.json(
        { error: 'Failed to create analysis job' },
        { status: 500 }
      );
    }

    // Process pages in background (for now, process sequentially)
    // In production, you'd want to use a job queue like Bull or similar
    processBulkAnalysis(job.id, user.id, pageUrls, preferences || {}, globalChargeExtra, supabase).catch(
      (error) => {
        console.error('[Bulk Analysis] Background processing error:', error);
      }
    );

    return NextResponse.json({
      jobId: job.id,
      totalPages: pageUrls.length,
      creditsRequired: totalCreditsNeeded,
      status: 'queued',
    });
  } catch (error: any) {
    console.error('[Bulk Analysis] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Process bulk analysis in background
 */
async function processBulkAnalysis(
  jobId: string,
  userId: string,
  pageUrls: string[],
  preferences: Record<string, boolean | { chargeExtra: boolean; primaryKeyword?: string }>,
  globalChargeExtra: boolean,
  supabase: any
) {
  try {
    // Update job status to processing
    await supabase
      .from('analysis_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    let completedCount = 0;
    let failedCount = 0;
    let totalCreditsDeducted = 0;

    // Process each page sequentially
    for (const url of pageUrls) {
      try {
        // Get user's current credits
        const { data: userData } = await supabase
          .from('users')
          .select('credits')
          .eq('id', userId)
          .single();

        const currentCredits = userData?.credits || 0;

        // Scrape page
        const scrapeResult = await scrapeUrl(url);
        if (scrapeResult.error) {
          failedCount++;
          await supabase
            .from('analysis_jobs')
            .update({
              failed_pages: failedCount,
              completed_pages: completedCount,
            })
            .eq('id', jobId);
          continue;
        }

        // Determine charge preference and primary keyword
        // Handle both old format (boolean) and new format (object with chargeExtra and primaryKeyword)
        const pref = preferences[url];
        const chargeExtra = typeof pref === 'boolean' ? pref : (pref?.chargeExtra ?? globalChargeExtra);
        const primaryKeyword = typeof pref === 'object' && pref?.primaryKeyword ? pref.primaryKeyword : undefined;

        // Calculate credits needed
        const creditsNeeded = calculateCreditsForAnalysis(scrapeResult.wordCount, chargeExtra);

        // Check if user still has enough credits
        if (currentCredits < creditsNeeded) {
          console.log(`[Bulk Analysis] Insufficient credits for ${url}. Skipping.`);
          failedCount++;
          await supabase
            .from('analysis_jobs')
            .update({
              failed_pages: failedCount,
              completed_pages: completedCount,
            })
            .eq('id', jobId);
          continue;
        }

        // Truncate content if needed
        let contentToAnalyze = scrapeResult.content;
        const analyzedWordCount = getAnalyzedWordCount(scrapeResult.wordCount, chargeExtra);
        if (!chargeExtra && scrapeResult.wordCount > 5000) {
          const words = scrapeResult.content.split(/\s+/);
          contentToAnalyze = words.slice(0, 5000).join(' ');
        }

        // Detect affiliate opportunities
        let affiliateOpportunities: any[] = [];
        try {
          const needsChunking = contentToAnalyze.length > 8000;
          if (needsChunking) {
            const chunks = chunkContent(contentToAnalyze, 8000);
            const chunkResults: any[][] = [];
            for (const chunk of chunks) {
              const chunkOpps = await detectAffiliateOpportunities(
                chunk.text,
                scrapeResult.existingLinks,
                scrapeResult.linkDetails || [],
                scrapeResult.title,
                scrapeResult.url
              );
              chunkResults.push(chunkOpps);
            }
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
        } catch (error) {
          console.error(`[Bulk Analysis] Error detecting affiliates for ${url}:`, error);
        }

        // Generate product ideas
        let productIdeas: any[] = [];
        try {
          const needsChunking = contentToAnalyze.length > 8000;
          if (needsChunking) {
            const chunks = chunkContent(contentToAnalyze, 8000);
            const chunkResults: any[][] = [];
            for (const chunk of chunks) {
              const chunkIdeas = await generateProductIdeas(chunk.text, scrapeResult.title);
              chunkResults.push(chunkIdeas);
            }
            productIdeas = combineAnalysisResults(chunkResults);
            productIdeas = sortProductIdeasBySellability(productIdeas);
            productIdeas = productIdeas.slice(0, 5);
          } else {
            productIdeas = await generateProductIdeas(contentToAnalyze, scrapeResult.title);
          }
        } catch (error) {
          console.error(`[Bulk Analysis] Error generating product ideas for ${url}:`, error);
        }

        // Generate SEO/AEO audit
        let auditResult: any = null;
        try {
          // Fetch HTML for audit (separate from scraping)
          const htmlResponse = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(15000),
          });

          if (htmlResponse.ok) {
            const html = await htmlResponse.text();
            const structuredContent = await extractStructuredContent(url, html, primaryKeyword);

            // Run audit
            auditResult = await auditContent(structuredContent, url, {
              enabled: true,
              skipBrokenLinkCheck: false,
            });

            console.log(`[Bulk Analysis] Audit complete for ${url}. Score: ${auditResult.score}/100`);
          } else {
            console.log(`[Bulk Analysis] Failed to fetch HTML for audit for ${url}, skipping...`);
          }
        } catch (error: any) {
          console.error(`[Bulk Analysis] Error running audit for ${url}:`, error);
          // Don't fail the entire analysis if audit fails
        }

        // Save analysis
        const { error: saveError } = await supabase
          .from('content_analyses')
          .insert({
            user_id: userId,
            url: scrapeResult.url,
            title: scrapeResult.title,
            content: contentToAnalyze.substring(0, 50000),
            word_count: analyzedWordCount,
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
          });

        if (saveError) {
          console.error(`[Bulk Analysis] Error saving analysis for ${url}:`, saveError);
          failedCount++;
        } else {
          // Deduct credits
          const newCredits = currentCredits - creditsNeeded;
          await supabase
            .from('users')
            .update({ credits: newCredits })
            .eq('id', userId);

          totalCreditsDeducted += creditsNeeded;
          completedCount++;
        }

        // Update job progress
        await supabase
          .from('analysis_jobs')
          .update({
            completed_pages: completedCount,
            failed_pages: failedCount,
          })
          .eq('id', jobId);
      } catch (error: any) {
        console.error(`[Bulk Analysis] Error processing ${url}:`, error);
        failedCount++;
        await supabase
          .from('analysis_jobs')
          .update({
            failed_pages: failedCount,
            completed_pages: completedCount,
          })
          .eq('id', jobId);
      }
    }

    // Mark job as completed
    await supabase
      .from('analysis_jobs')
      .update({
        status: completedCount > 0 ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`[Bulk Analysis] Job ${jobId} completed. ${completedCount} succeeded, ${failedCount} failed.`);
  } catch (error) {
    console.error('[Bulk Analysis] Fatal error:', error);
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

