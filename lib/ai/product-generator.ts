import { openai, isOpenAIConfigured } from '../openai';
import { ProductIdea } from './product-ideas-generator';
import { AffiliateOpportunity } from './affiliate-detector';

export interface GeneratedProductContent {
  title: string;
  sections: ProductSection[];
  affiliateLinks: AffiliateLinkReference[];
}

export interface ProductSection {
  title: string;
  type: 'heading' | 'paragraph' | 'list' | 'exercise' | 'worksheet' | 'chapter';
  content: string;
  items?: string[]; // For checklists and lists
  metadata?: {
    pageNumber?: number;
    chapterNumber?: number;
  };
}

export interface AffiliateLinkReference {
  product: string;
  context: string;
  affiliateProgram: {
    name: string;
    url: string;
  };
  placementNote: string; // Where/how to include this link
}

interface GenerateProductParams {
  productIdea: ProductIdea;
  originalContent: string;
  affiliateOpportunities: AffiliateOpportunity[];
  template: string;
}

/**
 * Generate product content based on product idea, original content, and affiliate opportunities
 */
export async function generateProduct(
  params: GenerateProductParams
): Promise<GeneratedProductContent> {
  const { productIdea, originalContent, affiliateOpportunities, template } = params;

  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key is not configured');
  }

  // Select relevant affiliate opportunities (top 3-5)
  const relevantAffiliates = affiliateOpportunities
    .filter((opp) => !opp.isAlreadyLinked)
    .slice(0, 5);

  // Build affiliate context for the prompt
  const affiliateContext =
    relevantAffiliates.length > 0
      ? relevantAffiliates
          .map((opp, idx) => {
            const primaryProgram = opp.affiliatePrograms.find((p) => p.isPrimary) || opp.affiliatePrograms[0];
            return `${idx + 1}. ${opp.product} (${opp.category})
   - Program: ${primaryProgram?.name || 'Search for affiliate program'}
   - Commission: ${primaryProgram?.commission || 'Unknown'}
   - Context from article: "${opp.context.substring(0, 150)}..."
   - How to include: Mention naturally when discussing ${opp.category} or tools related to this topic`;
          })
          .join('\n\n')
      : 'No affiliate opportunities available - focus on creating valuable content without affiliate links.';

  // Get product type specific prompt
  const typeSpecificPrompt = getProductTypePrompt(productIdea.type, template);

  // Increase content limit for better context
  const contentLimit = productIdea.type === 'ebook' ? 20000 : 15000;
  const contentToUse = originalContent.substring(0, contentLimit);

  const fullPrompt = `You are creating a PREMIUM ${productIdea.type.toUpperCase()} called "${productIdea.name}".

PRODUCT DETAILS:
- Name: ${productIdea.name}
- Type: ${productIdea.type}
- Description: ${productIdea.description}
- Value Proposition: ${productIdea.valueProposition}
- Target Audience: ${productIdea.targetAudience}
- Suggested Price: ${productIdea.suggestedPrice}

TEMPLATE: ${template}

ORIGINAL BLOG CONTENT (use this as source material - EXPAND significantly beyond this):
${contentToUse}

AFFILIATE OPPORTUNITIES (weave these in naturally where relevant):
${affiliateContext}

${typeSpecificPrompt}

CRITICAL QUALITY REQUIREMENTS - THESE ARE NON-NEGOTIABLE:

1. **DO NOT just rewrite or summarize** the blog post. You MUST add significant NEW value.

2. **MINIMUM CONTENT DEPTH** (strictly enforced):
   - Each section/chapter must have AT LEAST 300-500 words of substantive content
   - For ebooks: Each chapter needs 2-4 FULL pages of content (800-1600 words minimum)
   - For checklists: Each item needs explanation (not just a single sentence)
   - For workbooks: Each exercise needs multiple paragraphs of instruction PLUS questions

3. **EXPANSION REQUIREMENTS**:
   - Add REAL examples and case studies (create realistic scenarios)
   - Include step-by-step frameworks or processes
   - Provide templates, worksheets, or fillable sections
   - Explain the "why" behind each concept, not just the "what"
   - Add actionable implementation strategies

4. **WRITING QUALITY**:
   - Use SPECIFIC, CONCRETE language (avoid vague statements like "consider", "think about")
   - Use ACTION verbs and direct instructions ("Do this", "Follow these steps", "Complete this exercise")
   - Write in active voice
   - Break up text with bullets, numbered lists, and subheadings
   - Each paragraph should be 2-4 sentences maximum

5. **STRUCTURE REQUIREMENTS**:
   - Logical flow from one section to the next
   - Clear transitions between concepts
   - Comprehensive coverage - don't leave gaps
   - Professional formatting with proper headings and subheadings

6. **VALUE CHECK**: Ask yourself - "Would someone actually pay ${productIdea.suggestedPrice} for this?" If not, ADD MORE VALUE:
   - More examples
   - More detailed explanations
   - More actionable steps
   - More templates or frameworks
   - More depth and insight

7. **AFFILIATE INTEGRATION**:
   - Only mention affiliate products when naturally relevant
   - Don't force them into every section
   - Provide context for WHY the product helps (not just a name-drop)

FORMATTING REQUIREMENTS:
- Use proper section/chapter titles
- Include subheadings to break up content
- Use bullet points and numbered lists for readability
- Format checklists with clear checkboxes and descriptions
- Structure content for easy scanning and navigation

REMEMBER: This is a PREMIUM digital product. It must be comprehensive, valuable, and professionally written. Sparse or shallow content is unacceptable.

Return as JSON:
{
  "title": "Full product title",
  "sections": [
    {
      "title": "Section title (for chapters: just descriptive name, NO 'Chapter X:' prefix)",
      "type": "heading|paragraph|list|exercise|worksheet|chapter",
      "content": "Main content text (can be multi-paragraph for ebooks/chapters)",
      "items": ["item1", "item2"] // Only for lists/checklists
    }
  ],
  "affiliateLinks": [
    {
      "product": "Product name",
      "context": "Brief context of where this appears",
      "affiliateProgram": {
        "name": "Program name",
        "url": "Program URL"
      },
      "placementNote": "Where/how to include this link naturally"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a PREMIUM content creator specializing in creating high-value digital products that people actually pay for. Your products must be:

QUALITY STANDARDS (NON-NEGOTIABLE):
- Professional grade: Ready to sell immediately, no edits needed
- Deep value: Adds significant depth beyond source material (NOT a summary)
- Actionable: Every section has clear, specific, implementable steps
- Comprehensive: Thorough coverage with 300-500+ words per section/chapter minimum
- Engaging: Uses examples, case studies, real-world scenarios, and storytelling
- Well-structured: Logical flow with clear sections, subheadings, and transitions

CONTENT REQUIREMENTS:
- NEVER just summarize or rewrite the original content
- ALWAYS expand significantly: add examples, frameworks, templates, step-by-step guides
- Include real-world scenarios and use cases (create realistic examples if needed)
- Provide actionable takeaways readers can implement immediately
- Create content that stands alone as valuable, even without reading the source

WRITING STYLE:
- Professional but approachable and engaging
- Specific and concrete (avoid vague language like "consider" or "think about")
- Use action verbs and direct instructions
- Active voice throughout
- Short paragraphs (2-4 sentences max)
- Use bullets, numbered lists, and subheadings for readability

STRUCTURE:
- Clear hierarchy: Main sections → Subsections → Detailed content
- Smooth transitions between sections
- Logical progression from concept to implementation
- Professional formatting that's easy to scan

Return only valid JSON. Ensure each section has substantial content (minimum 300 words for major sections, 150+ words for subsections).`,
        },
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
      temperature: 0.5, // Lower for more focused, consistent quality output
      response_format: { type: 'json_object' },
      max_tokens: 12000, // Significantly increased for comprehensive content (was 4000)
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
      console.error('[Product Generator] JSON Parse Error:', parseError.message);
      console.error('[Product Generator] Raw response:', result);
      throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
    }

    // Validate and normalize the response
    if (!parsed.title || !parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('Invalid response structure: missing title or sections');
    }

    const generatedContent: GeneratedProductContent = {
      title: String(parsed.title).trim() || productIdea.name,
      sections: parsed.sections.map((section: any) => {
        // Clean up chapter titles - remove "Chapter X:" prefixes if AI added them
        let cleanTitle = String(section.title || '').trim();
        if (section.type === 'chapter') {
          // Remove patterns like "Chapter 1:", "Chapter 1 ", etc.
          cleanTitle = cleanTitle.replace(/^Chapter\s+\d+:?\s*/i, '');
          // Also handle if AI put chapter number at end
          cleanTitle = cleanTitle.replace(/\s*\(Chapter\s+\d+\)$/i, '');
        }
        
        return {
          title: cleanTitle,
          type: (section.type || 'paragraph') as ProductSection['type'],
          content: String(section.content || '').trim(),
          items: Array.isArray(section.items) ? section.items.map((item: any) => String(item).trim()) : undefined,
          metadata: section.metadata,
        };
      }),
      affiliateLinks: Array.isArray(parsed.affiliateLinks)
        ? parsed.affiliateLinks.map((link: any) => ({
            product: String(link.product || '').trim(),
            context: String(link.context || '').trim(),
            affiliateProgram: {
              name: String(link.affiliateProgram?.name || '').trim(),
              url: String(link.affiliateProgram?.url || '#').trim(),
            },
            placementNote: String(link.placementNote || '').trim(),
          }))
        : [],
    };

    // Quality validation - check minimum content depth
    const qualityIssues: string[] = [];
    let totalWords = 0;

    generatedContent.sections.forEach((section, idx) => {
      const sectionWords = 
        (section.content || '').split(/\s+/).length +
        (section.items || []).reduce((sum, item) => sum + item.split(/\s+/).length, 0);
      
      totalWords += sectionWords;

      // Check minimum content based on type
      if (productIdea.type === 'ebook' && section.type === 'chapter') {
        if (sectionWords < 500) {
          qualityIssues.push(
            `Chapter "${section.title || `Chapter ${idx + 1}`}" is too short (${sectionWords} words, minimum 500)`
          );
        }
      } else if (productIdea.type === 'workbook' && section.type === 'exercise') {
        if (sectionWords < 150) {
          qualityIssues.push(
            `Exercise "${section.title || `Exercise ${idx + 1}`}" is too short (${sectionWords} words, minimum 150)`
          );
        }
      } else if (section.content && sectionWords < 100) {
        // General minimum for major sections
        qualityIssues.push(
          `Section "${section.title || `Section ${idx + 1}`}" is too short (${sectionWords} words, minimum 100)`
        );
      }
    });

    // Log quality metrics
    console.log(`[Product Generator] Generated ${generatedContent.sections.length} sections`);
    console.log(`[Product Generator] Total word count: ${totalWords}`);
    console.log(`[Product Generator] Average words per section: ${Math.round(totalWords / generatedContent.sections.length)}`);

    if (qualityIssues.length > 0) {
      console.warn('[Product Generator] Quality issues detected:');
      qualityIssues.forEach(issue => console.warn(`  - ${issue}`));
      // Note: We still return the content, but log the issues for monitoring
      // In production, you might want to retry or flag these for review
    }

    // Check overall word count minimum
    const minimumWords = productIdea.type === 'ebook' ? 5000 : 
                        productIdea.type === 'workbook' ? 2000 :
                        productIdea.type === 'checklist' ? 1500 : 1000;

    if (totalWords < minimumWords) {
      console.warn(
        `[Product Generator] WARNING: Total word count (${totalWords}) is below recommended minimum (${minimumWords}) for ${productIdea.type}`
      );
    }

    return generatedContent;
  } catch (error: any) {
    console.error('[Product Generator] Error generating product:', error);
    console.error('[Product Generator] Error stack:', error.stack);
    throw new Error(`Failed to generate product: ${error.message}`);
  }
}

/**
 * Get product type specific prompt instructions
 */
function getProductTypePrompt(type: ProductIdea['type'], template: string): string {
  switch (type) {
    case 'checklist':
      return `CREATE A COMPREHENSIVE CHECKLIST:

Requirements:
- Include 15-25 actionable items (no fewer than 15, no more than 25)
- Group items into logical sections with clear headings and explanations
- Each item should have:
  * A clear, specific, actionable statement (not vague)
  * Detailed explanation (2-3 sentences explaining WHY and HOW)
  * Context or tips when helpful
  * Checkbox format: "[ ] Item description"
- Each section should have:
  * Section introduction (2-3 paragraphs explaining the phase/stage)
  * All checklist items with explanations
  * Notes or tips for that section
- Organize by phases/stages of the process
- Add comprehensive introduction (300-400 words) explaining:
  * How to use this checklist
  * What they'll achieve by completing it
  * Best practices for using checklists
- Include completion section at the end with:
  * Summary of what they've accomplished
  * Next steps or follow-up actions
  * Reflection questions
- Where relevant tools/products are mentioned, note affiliate opportunities
- Make it printable and fillable (format for PDF)
- Use clear, scannable formatting with adequate spacing

CRITICAL: Each checklist item must be substantial and valuable, not just a single sentence. Provide explanations and context.

Template Style: ${template}
- Minimal: Simple, clean list with minimal explanations
- Detailed: Includes tips, notes, and expanded explanations
- Visual: Uses icons, color coding, and visual hierarchy

Structure:
1. Introduction (how to use this checklist)
2. Preparation section (items to prepare before starting)
3. Main action items (grouped by logical sections)
4. Review/completion section
5. Resources section (with affiliate links if relevant)`;

    case 'workbook':
      return `CREATE AN INTERACTIVE WORKBOOK:

Requirements:
- Include comprehensive introduction (400-500 words) explaining:
  * How to use this workbook
  * What they'll gain from completing it
  * How to track progress
  * Tips for getting the most value
- Create 5-8 distinct exercises/worksheets, each FULLY DEVELOPED:
  * Each exercise needs 200-300 words of instruction and context
  * Fill-in-the-blank sections with prompts and examples
  * Reflection questions (3-5 per exercise, not just 1-2)
  * Action planning templates with guided sections
  * Progress tracking sections with clear metrics
  * Self-assessment areas with scoring or rating systems
- Each exercise MUST include:
  * Clear instructions (2-3 paragraphs)
  * Why this exercise matters (context and purpose)
  * Step-by-step guidance on how to complete it
  * Examples or sample answers where helpful
  * Space indicators for writing (format for PDF)
  * Follow-up questions or next steps
- Exercises should:
  * Build progressively on concepts from the blog post
  * Be immediately actionable with clear outcomes
  * Include multiple components (not just one question)
  * Have adequate space for detailed responses
- Add comprehensive resource list section (200-300 words) including:
  * Recommended tools and why
  * Affiliate products where relevant
  * Additional reading or resources
- Include conclusion with next steps (300-400 words):
  * Summary of progress
  * Implementation plan
  * Ongoing practice recommendations
- Format for printing (adequate spacing, lines for writing, clear sections)
- Make it engaging and motivating with encouraging language

CRITICAL: Each exercise must be substantial (200-300 words of content) with multiple components. Simple one-question exercises are insufficient.

Template Style: ${template}
- Professional: Corporate style, lots of whitespace, formal tone
- Creative: Colorful, hand-drawn elements, casual tone
- Practical: Dense, information-focused, straightforward

Structure:
1. Introduction & How to Use This Workbook
2. Exercise 1: [Theme] (fill-in sections, questions)
3. Exercise 2: [Theme]
4. Exercise 3: [Theme]
... (continue for 5-8 exercises)
N. Resources & Recommendations (affiliate links here)
N+1. Conclusion & Action Plan`;

    case 'ebook':
      return `EXPAND INTO A COMPREHENSIVE EBOOK:

Requirements:
- Transform the blog post into a FULL ebook (20-30 pages of SUBSTANTIVE content)
- Each chapter MUST be comprehensive - MINIMUM 800-1200 words per chapter
- Add significant depth and detail beyond the original post:
  * Expand concepts with detailed explanations and examples
  * Add realistic case studies or real-world application scenarios
  * Include detailed step-by-step instructions with multiple steps
  * Provide downloadable templates, frameworks, or worksheets
  * Explain concepts in depth with context and background
- Structure as chapters:
  * Introduction chapter: 600-800 words setting up the book
  * Each content chapter: 800-1200 words minimum (2-3 full pages)
  * Conclusion chapter: 400-600 words with action items
  * Clear chapter titles that describe the content (DO NOT include "Chapter X:" - just the title)
  * Logical flow with smooth transitions between chapters
- Each chapter must include:
  * Opening hook or story (2-3 paragraphs)
  * Main content with subheadings breaking up sections
  * Real examples and case studies
  * Actionable takeaways (3-5 per chapter)
  * Closing summary or transition to next chapter
- Include:
  * Table of contents
  * Introduction chapter (why this matters, what they'll learn)
  * 5-8 content chapters (each fully developed)
  * Conclusion chapter (recap, action plan, next steps)
  * Resource recommendations chapter (with affiliate links)
- Add descriptions for images/diagrams (use [IMAGE: description] format)
- Professional tone but engaging - use stories and examples
- NO short or sparse chapters - every chapter must be substantial

CRITICAL: Each chapter section must be FULLY DEVELOPED with examples, explanations, and actionable content. Short or sparse chapters are unacceptable.

Template Style: ${template}
- Modern: Sans-serif fonts, image-heavy, contemporary design
- Classic: Serif fonts, traditional book layout, formal tone
- Magazine: Multi-column sections, editorial style, visual breaks

Structure:
1. Cover Page / Title Page
2. Table of Contents
3. Introduction Chapter
4. [Topic from blog, expanded] (just the topic name, no "Chapter X:" prefix)
5. [Related topic, expanded] (just the topic name, no "Chapter X:" prefix)
... (continue for 5-8 chapters)
N. Resource Recommendations Chapter (affiliate links here)
N+1. Conclusion & Action Items

CRITICAL: Section/chapter titles should be descriptive names only (e.g., "The Psychology of Confidence in Sports") - DO NOT include "Chapter 1:", "Chapter 2:", etc. in the title field. We will add chapter numbers programmatically.`;

    case 'newsletter':
      return `CREATE A NEWSLETTER EDITION:

Requirements:
- Engaging subject line (compelling, 50 characters max)
- Preview text (100 characters max - appears in email client)
- Personal introduction (2-3 paragraphs, conversational tone)
- Main content (formatted for email):
  * Break into short paragraphs (2-3 sentences each)
  * Use subheadings to break up content
  * Include key takeaways in bullet points
  * Make it scannable and easy to read on mobile
- Key Takeaways section (3-5 main points)
- Recommended Tools/Products section (2-3 affiliate products):
  * Brief description of each
  * Why the reader should check it out
  * Natural affiliate link placement
- Call to action (relevant to the content)
- P.S. section (personal touch, teaser for next newsletter)
- Keep total length reasonable for email (1000-2000 words)

Template Style: ${template}
- Plain Text: No formatting, email-safe, works everywhere
- Styled: HTML template with brand colors, proper formatting
- Digest: Bullet points, quick reads, link roundup format

Structure:
1. Subject Line
2. Preview Text
3. Greeting / Introduction
4. Main Content (with subheadings)
5. Key Takeaways (bulleted)
6. Recommended Products (2-3 with affiliate links)
7. Call to Action
8. Closing / P.S.`;

    default:
      return `Create a comprehensive ${type} based on the blog content. Make it valuable, actionable, and professionally formatted. Include affiliate opportunities naturally where relevant.`;
  }
}

