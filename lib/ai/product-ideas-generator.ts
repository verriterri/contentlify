import { openai, isOpenAIConfigured } from '../openai';

export type ProductType = 'checklist' | 'workbook' | 'ebook' | 'newsletter' | 'template';

export interface ProductIdea {
  name: string;
  type: ProductType;
  description: string;
  valueProposition: string;
  suggestedPrice: string;
  estimatedTime: string;
  targetAudience: string;
}

/**
 * Generate digital product ideas based on blog content
 * @param content - The blog post content
 * @param title - The blog post title
 * @returns Array of product ideas (exactly 5 best suggestions)
 */
export async function generateProductIdeas(
  content: string,
  title: string
): Promise<ProductIdea[]> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key is not configured');
  }

  const prompt = `Based on this page, suggest the TOP 5 BEST digital products the author could create and sell.

ARTICLE TITLE: ${title}

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. You MUST return EXACTLY 5 product ideas - no more, no less. This is not optional.
2. Do NOT return 6, 7, 8, or more ideas. Stop at 5.
3. Before generating ideas, think of 10-15 potential products, then RANK them by quality and sellability
4. Only return the TOP 5 ranked products - discard the rest
5. Prioritize ONLY the highest quality, most sellable ideas
6. Focus on products that ADD SIGNIFICANT VALUE beyond the free blog post
7. Be selective - quality over quantity. If there aren't 5 strong ideas, think harder about creative extensions of the content.

The product should provide something the blog post doesn't:
- Blog has tips → Product is implementation system with step-by-step framework
- Blog has overview → Product is deep dive guide with detailed instructions
- Blog explains concept → Product is done-for-you templates or worksheets
- Blog has examples → Product is complete resource library or toolkit

For each product idea, provide:
1. name: Creative, compelling product name (e.g., "Pottery Wheel Mastery Checklist", "Complete Web Design Starter Kit")
2. type: One of: checklist, workbook, ebook, template, newsletter
3. description: 2-3 sentence description of what the product contains
4. valueProposition: Clear explanation of why someone would buy this (what problem it solves, what it helps them achieve)
5. suggestedPrice: Realistic price range (e.g., "$9-$19", "$29-$49", "$99+")
6. estimatedTime: Estimate for how long it would take to create (e.g., "2-3 hours", "1-2 days", "1 week")
7. targetAudience: Who this product is for (e.g., "Beginner potters", "Small business owners", "Content creators")

Product Types:
- checklist: Actionable checklist of steps/tasks
- workbook: Interactive workbook with exercises and fill-in sections
- ebook: Comprehensive guide or resource (longer format)
- template: Reusable templates, frameworks, or done-for-you resources
- newsletter: Email newsletter series or subscription content

CRITERIA for TOP 5 selection (MUST rank ideas by this order):
1. HIGHEST potential to actually sell (solve a real pain point) - MOST IMPORTANT
2. BEST alignment with the article's topic and audience
3. MOST valuable extension beyond the free content
4. STRONGEST value proposition (clear why someone would pay)
5. MOST realistic and achievable for the author

PROCESS YOU MUST FOLLOW:
Step 1: Brainstorm 10-15 potential product ideas
Step 2: Rank ALL ideas by the criteria above
Step 3: Select ONLY the top 5 ranked ideas
Step 4: Return EXACTLY those 5 - no more, no less

Rank ideas from best to worst and return ONLY the top 5. If you return more than 5, the response will be rejected.

Return as JSON:
{
  "products": [
    {
      "name": "Product Name",
      "type": "checklist|workbook|ebook|template|newsletter",
      "description": "What the product contains",
      "valueProposition": "Why people would buy it",
      "suggestedPrice": "$X-$Y",
      "estimatedTime": "time estimate",
      "targetAudience": "who it's for"
    }
  ]
}

CRITICAL FINAL REMINDER:
- The "products" array MUST contain EXACTLY 5 items
- Count your items before returning
- If you have 6 or more, remove the lowest ranked ones until you have exactly 5
- If you have fewer than 5, think harder to come up with more viable options
- This is a hard requirement - returning more or fewer than 5 will cause the system to fail

BLOG CONTENT:
${content.substring(0, 10000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at identifying monetization opportunities. Your task is to suggest EXACTLY 5 (not 4, not 6, EXACTLY 5) practical, sellable digital products that add real value beyond free content. You MUST return exactly 5 products in the JSON response. Count them. If you return more or fewer than 5, you have failed. Return only valid JSON with exactly 5 products.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5, // Lower temperature for better instruction following while maintaining creativity
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    // Clean markdown if present
    let cleanedResult = result.trim();
    if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(cleanedResult);
    } catch (parseError: any) {
      console.error('[Product Ideas] JSON Parse Error:', parseError.message);
      console.error('[Product Ideas] Raw response:', result);
      throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
    }

    // Extract products array
    let products: ProductIdea[] = [];
    if (Array.isArray(parsed)) {
      products = parsed;
    } else if (parsed.products && Array.isArray(parsed.products)) {
      products = parsed.products;
    } else if (typeof parsed === 'object') {
      // Try to find array values
      const arrayKey = Object.keys(parsed).find((key) => Array.isArray(parsed[key]));
      if (arrayKey) {
        products = parsed[arrayKey];
      }
    }

    console.log(`[Product Ideas] Found ${products.length} product ideas`);

    // Validate and normalize products
    const normalizedProducts = products
      .filter((p: any) => {
        const isValid =
          p.name &&
          p.type &&
          p.description &&
          p.valueProposition &&
          p.suggestedPrice &&
          p.estimatedTime &&
          p.targetAudience;

        if (!isValid) {
          console.warn('[Product Ideas] Skipping invalid product entry:', p);
        }

        // Validate product type
        const validTypes: ProductType[] = ['checklist', 'workbook', 'ebook', 'template', 'newsletter'];
        if (!validTypes.includes(p.type)) {
          console.warn(`[Product Ideas] Invalid product type "${p.type}", defaulting to template`);
          p.type = 'template';
        }

        return isValid;
      })
      .map((p: any) => ({
        name: String(p.name).trim(),
        type: (p.type as ProductType) || 'template',
        description: String(p.description).trim(),
        valueProposition: String(p.valueProposition).trim(),
        suggestedPrice: String(p.suggestedPrice).trim(),
        estimatedTime: String(p.estimatedTime).trim(),
        targetAudience: String(p.targetAudience).trim(),
      }));

    // Enforce exactly 5 best ideas
    // If AI returned more, take top 5; if fewer, log warning
    if (normalizedProducts.length > 5) {
      console.warn(
        `[Product Ideas] WARNING: AI returned ${normalizedProducts.length} ideas (expected 5). Taking top 5.`
      );
    } else if (normalizedProducts.length < 5) {
      console.warn(
        `[Product Ideas] WARNING: AI returned ${normalizedProducts.length} ideas (expected 5). This indicates the AI didn't follow instructions properly.`
      );
    }

    // Always return exactly 5 (or fewer if that's all we got)
    const limitedProducts = normalizedProducts.slice(0, 5);
    console.log(`[Product Ideas] Returning ${limitedProducts.length} product ideas`);
    return limitedProducts;
  } catch (error: any) {
    console.error('[Product Ideas] Error generating product ideas:', error);
    console.error('[Product Ideas] Error stack:', error.stack);
    // Preserve original error structure for rate limit detection
    const wrappedError: any = new Error(`Failed to generate product ideas: ${error.message}`);
    wrappedError.originalError = error;
    wrappedError.status = error?.status || error?.statusCode;
    wrappedError.code = error?.code;
    throw wrappedError;
  }
}

