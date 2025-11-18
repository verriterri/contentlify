import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { scrapeUrl } from '@/lib/scrapers/url-scraper';
import { detectAffiliateOpportunities } from '@/lib/ai/affiliate-detector';
import { generateProductIdeas } from '@/lib/ai/product-ideas-generator';
import { calculateCreditsForAnalysis, getAnalyzedWordCount } from '@/lib/utils/credit-calculator';
import { chunkContent, combineAnalysisResults, sortProductIdeasBySellability } from '@/lib/utils/content-chunker';

/**
 * POST /api/analyze/bulk
 * Analyze multiple posts in bulk
 * Body: { scanId: string, postUrls: string[], preferences: Record<string, boolean> }
 */
export async function POST(req: NextRequest) {
  try {
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

    const globalChargeExtra = userSettings?.preferences?.chargeExtraForLongPosts ?? false;

    // Parse request body
    const body = await req.json();
    const { scanId, postUrls, preferences } = body;

    if (!postUrls || !Array.isArray(postUrls) || postUrls.length === 0) {
      return NextResponse.json(
        { error: 'postUrls array is required' },
        { status: 400 }
      );
    }

    if (postUrls.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 posts per bulk analysis' },
        { status: 400 }
      );
    }

    // Get scan data if scanId provided
    let scanData: any = null;
    if (scanId) {
      const { data: scan } = await supabase
        .from('blog_scans')
        .select('scan_data')
        .eq('id', scanId)
        .single();

      if (scan) {
        scanData = scan.scan_data;
      }
    }

    // Calculate total credits needed
    let totalCreditsNeeded = 0;
    const postMetadata: Array<{ url: string; wordCount: number }> = [];

    // If we have scan data, use word counts from there
    if (scanData?.posts) {
      for (const url of postUrls) {
        const post = scanData.posts.find((p: any) => p.url === url);
        if (post) {
          const chargeExtra = preferences?.[url] ?? globalChargeExtra;
          const credits = calculateCreditsForAnalysis(post.wordCount, chargeExtra);
          totalCreditsNeeded += credits;
          postMetadata.push({ url, wordCount: post.wordCount });
        } else {
          // Post not in scan data, will need to scrape
          postMetadata.push({ url, wordCount: 0 });
        }
      }
    } else {
      // No scan data, estimate 1 credit per post (will be recalculated during analysis)
      totalCreditsNeeded = postUrls.length;
      postUrls.forEach((url) => {
        postMetadata.push({ url, wordCount: 0 });
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
        total_posts: postUrls.length,
        completed_posts: 0,
        failed_posts: 0,
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

    // Process posts in background (for now, process sequentially)
    // In production, you'd want to use a job queue like Bull or similar
    processBulkAnalysis(job.id, user.id, postUrls, preferences || {}, globalChargeExtra, supabase).catch(
      (error) => {
        console.error('[Bulk Analysis] Background processing error:', error);
      }
    );

    return NextResponse.json({
      jobId: job.id,
      totalPosts: postUrls.length,
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
  postUrls: string[],
  preferences: Record<string, boolean>,
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

    // Process each post sequentially
    for (const url of postUrls) {
      try {
        // Get user's current credits
        const { data: userData } = await supabase
          .from('users')
          .select('credits')
          .eq('id', userId)
          .single();

        const currentCredits = userData?.credits || 0;

        // Scrape post
        const scrapeResult = await scrapeUrl(url);
        if (scrapeResult.error) {
          failedCount++;
          await supabase
            .from('analysis_jobs')
            .update({
              failed_posts: failedCount,
              completed_posts: completedCount,
            })
            .eq('id', jobId);
          continue;
        }

        // Determine charge preference
        const chargeExtra = preferences[url] ?? globalChargeExtra;

        // Calculate credits needed
        const creditsNeeded = calculateCreditsForAnalysis(scrapeResult.wordCount, chargeExtra);

        // Check if user still has enough credits
        if (currentCredits < creditsNeeded) {
          console.log(`[Bulk Analysis] Insufficient credits for ${url}. Skipping.`);
          failedCount++;
          await supabase
            .from('analysis_jobs')
            .update({
              failed_posts: failedCount,
              completed_posts: completedCount,
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
            completed_posts: completedCount,
            failed_posts: failedCount,
          })
          .eq('id', jobId);
      } catch (error: any) {
        console.error(`[Bulk Analysis] Error processing ${url}:`, error);
        failedCount++;
        await supabase
          .from('analysis_jobs')
          .update({
            failed_posts: failedCount,
            completed_posts: completedCount,
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

