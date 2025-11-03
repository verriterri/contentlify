import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateProduct } from '@/lib/ai/product-generator';
import { generatePDF, uploadPDFToStorage } from '@/lib/generators/pdf-generator';
import { getTemplate, getDefaultTemplate } from '@/lib/templates';
import { ProductIdea } from '@/lib/ai/product-ideas-generator';
import { AffiliateOpportunity } from '@/lib/ai/affiliate-detector';

/**
 * POST /api/generate-product
 * Generates a digital product from a product idea
 * 
 * Body: {
 *   productIdea: ProductIdea,
 *   analysisId: string,
 *   templateId: string,
 *   productTitle?: string,
 *   includeAffiliateLinks?: boolean,
 *   userBranding?: { name: string, colors?: { primary: string, secondary: string } }
 * }
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
      templateId,
      productTitle,
      includeAffiliateLinks = true,
      userBranding,
    } = body;

    if (!productIdea || !analysisId || !templateId) {
      return NextResponse.json(
        { error: 'Missing required fields: productIdea, analysisId, templateId' },
        { status: 400 }
      );
    }

    // Get user subscription tier
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single();

    const subscriptionTier = (userData?.subscription_tier || 'free') as 'free' | 'starter' | 'pro' | 'agency';

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

    // Get template
    const template = getTemplate(productIdea.type, templateId) || getDefaultTemplate(productIdea.type);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Prepare affiliate opportunities
    const affiliateOpportunities: AffiliateOpportunity[] = includeAffiliateLinks
      ? (analysis.affiliate_opportunities || [])
      : [];

    // Generate product content
    try {
      const generatedContent = await generateProduct({
        productIdea: productIdea as ProductIdea,
        originalContent: analysis.content || '',
        affiliateOpportunities,
        template: templateId,
      });

      // Override title if provided
      if (productTitle) {
        generatedContent.title = productTitle;
      }

      // Generate PDF
      const pdfResult = await generatePDF({
        content: generatedContent,
        template,
        userBranding,
        subscriptionTier,
        userId: user.id,
      });

      // Upload PDF to storage
      const pdfFileName = `${sanitizeFileName(generatedContent.title)}.pdf`;
      let fileUrl: string | null = null;

      try {
        fileUrl = await uploadPDFToStorage(pdfResult.buffer, pdfFileName, user.id);
      } catch (uploadError) {
        console.error('[Generate Product] Failed to upload PDF:', uploadError);
        // Continue without file URL
      }

      // Save product to database
      const productData = {
        user_id: user.id,
        analysis_id: analysisId,
        product_type: productIdea.type,
        title: generatedContent.title,
        content: JSON.stringify(generatedContent), // Store as JSON
        template_used: templateId,
        file_url: fileUrl,
      };

      const { data: savedProduct, error: saveError } = await supabase
        .from('generated_products')
        .insert(productData)
        .select()
        .single();

      if (saveError) {
        console.error('[Generate Product] Error saving product:', saveError);
        // Return product even if save fails
      }

      return NextResponse.json({
        success: true,
        product: generatedContent,
        productId: savedProduct?.id,
        fileUrl,
        pdfSize: pdfResult.size,
      });
    } catch (error: any) {
      console.error('[Generate Product] Error:', error);
      return NextResponse.json(
        { error: `Failed to generate product: ${error.message}` },
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

