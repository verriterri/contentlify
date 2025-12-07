import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateProduct } from '@/lib/ai/product-generator';
import { ProductIdea } from '@/lib/ai/product-ideas-generator';
import { AffiliateOpportunity } from '@/lib/ai/affiliate-detector';

/**
 * POST /api/generate-product
 * Generates an outline for a digital product from a product idea
 * 
    const {
      productIdea,
      analysisId,
      productTitle,
      includeAffiliateLinks = true,
      userBranding,
    } = body;

    if (!productIdea || !analysisId) {
      return NextResponse.json(
        { error: 'Missing required fields: productIdea, analysisId' },
        { status: 400 }
      );
    }
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

    // Get request body
    const body = await req.json();
    const {
      productIdea,
      analysisId,
      productTitle,
      includeAffiliateLinks = true,
      userBranding,
    } = body;

    if (!productIdea || !analysisId) {
      return NextResponse.json(
        { error: 'Missing required fields: productIdea, analysisId' },
        { status: 400 }
      );
    }

    // Get user credits
    const { data: userData } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    const userCredits = userData.credits || 0;
    const creditsNeeded = 1;

    // Check if user has enough credits
    if (userCredits < creditsNeeded) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${creditsNeeded} credit(s) to generate an outline, but you only have ${userCredits}.` },
        { status: 402 }
      );
    }

    // Get analysis data to retrieve original content and affiliate opportunities
    const { data: analysis, error: analysisError } = await supabase
      .from('content_analyses')
      .select('content, affiliate_opportunities, url')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Prepare affiliate opportunities
    const affiliateOpportunities: AffiliateOpportunity[] = includeAffiliateLinks
      ? (analysis.affiliate_opportunities || [])
      : [];

    // Generate outline
    try {
      const generatedOutline = await generateProduct({
        productIdea: productIdea as ProductIdea,
        originalContent: analysis.content || '',
        affiliateOpportunities,
      });

      // Override title if provided
      if (productTitle) {
        generatedOutline.title = productTitle;
      }

      // Deduct credits from user account
      const newCredits = userCredits - creditsNeeded;
      const { error: creditError } = await supabase
        .from('users')
        .update({ credits: newCredits })
        .eq('id', user.id);

      if (creditError) {
        console.error('[Generate Outline] Error deducting credits:', creditError);
        return NextResponse.json(
          { error: `Failed to deduct credits: ${creditError.message}` },
          { status: 500 }
        );
      }

      console.log(`[Generate Outline] Deducted ${creditsNeeded} credit(s) from user ${user.id}. New balance: ${newCredits}`);

      // Save outline to database (still using generated_products table)
      const productData = {
        user_id: user.id,
        analysis_id: analysisId,
        product_type: productIdea.type,
        title: generatedOutline.title,
        content: JSON.stringify(generatedOutline), // Store as JSON
        template_used: null, // Templates not used for outlines
        file_url: null, // No PDF file URL
        credits_used: creditsNeeded,
      };

      const { data: savedProduct, error: saveError } = await supabase
        .from('generated_products')
        .insert(productData)
        .select()
        .single();

      if (saveError) {
        console.error('[Generate Outline] Error saving outline:', saveError);
        // If save fails, we should refund the credits
        const { error: refundError } = await supabase
          .from('users')
          .update({ credits: userCredits })
          .eq('id', user.id);
        
        if (refundError) {
          console.error('[Generate Outline] Error refunding credits:', refundError);
        }
        
        return NextResponse.json(
          { error: `Failed to save outline: ${saveError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        outline: generatedOutline,
        productId: savedProduct?.id,
      });
    } catch (error: any) {
      console.error('[Generate Outline] Error:', error);
      return NextResponse.json(
        { error: `Failed to generate outline: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Generate Product] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
    .toLowerCase();
}

