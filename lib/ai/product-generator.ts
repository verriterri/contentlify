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
}

/**
 * Generate product outline based on product idea, original content, and affiliate opportunities
 */
export async function generateProduct(
  params: GenerateProductParams
): Promise<GeneratedProductContent> {
  const { productIdea, originalContent, affiliateOpportunities } = params;

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
      : 'No affiliate opportunities available.';

  // Get product type specific prompt for outlines
  const typeSpecificPrompt = getOutlineTypePrompt(productIdea.type);

  // Content limit for context (no need for as much since we're just creating an outline)
  const contentLimit = 10000;
  const contentToUse = originalContent.substring(0, contentLimit);

  const fullPrompt = `You are creating an OUTLINE for a ${productIdea.type.toUpperCase()} called "${productIdea.name}".

PRODUCT DETAILS:
- Name: ${productIdea.name}
- Type: ${productIdea.type}
- Description: ${productIdea.description}
- Value Proposition: ${productIdea.valueProposition}
- Target Audience: ${productIdea.targetAudience}
- Suggested Price: ${productIdea.suggestedPrice}

ORIGINAL BLOG CONTENT (use this as source material):
${contentToUse}

AFFILIATE OPPORTUNITIES (note where these could be included):
${affiliateContext}

${typeSpecificPrompt}

OUTLINE REQUIREMENTS:

1. **STRUCTURE**: Create a clear, logical outline that guides product development
   - Each section should have a title and brief description (1-2 sentences)
   - Include key points or subtopics for each section
   - Show the flow and organization of the product

2. **DEPTH**: Provide enough detail to guide development, but keep it as an outline
   - Section descriptions should explain WHAT needs to be covered (not the full content)
   - Key points should indicate WHAT topics to include (not full explanations)
   - Make it actionable - someone should know what to write/create in each section

3. **ORGANIZATION**:
   - Logical flow from introduction to conclusion
   - Clear hierarchy: Main sections → Subsections → Key points
   - Appropriate structure for the product type

4. **AFFILIATE INTEGRATION NOTES**:
   - Note where affiliate opportunities could naturally fit
   - Don't force them, just suggest placement opportunities

REMEMBER: This is an OUTLINE - a guide for developing the product. It should show structure, organization, and key points to cover, not the full content.

Return as JSON:
{
  "title": "Product title",
  "sections": [
    {
      "title": "Section title",
      "type": "heading|list|exercise|worksheet|chapter",
      "content": "Brief description of what should be covered in this section (1-2 sentences)",
      "items": ["Key point 1", "Key point 2", "Key point 3"] // Main topics/subtopics to cover in this section
    }
  ],
  "affiliateLinks": [
    {
      "product": "Product name",
      "context": "Brief context",
      "affiliateProgram": {
        "name": "Program name",
        "url": "Program URL"
      },
      "placementNote": "Suggested placement (e.g., 'In the tools/resources section')"
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a content strategist specializing in creating OUTLINES for digital products. Your outlines help creators develop valuable products by providing clear structure and guidance.

OUTLINE QUALITY STANDARDS:
- Well-organized: Clear structure showing logical flow
- Comprehensive: Covers all important aspects needed for the product
- Actionable: Each section description guides what content should be created
- Balanced: Appropriate depth for an outline (not too detailed, not too sparse)
- Professional: Shows thought and planning

OUTLINE REQUIREMENTS:
- Each section needs a clear title and brief description (1-2 sentences) of what should be covered
- Include key points/items that indicate what topics or content should be included
- Show the structure and organization, not the full content
- Make it easy for someone to follow the outline and develop the actual product

STRUCTURE:
- Clear hierarchy: Main sections → Subsections → Key points
- Logical flow from introduction through to conclusion
- Appropriate for the product type (checklist, workbook, ebook, newsletter)

Return only valid JSON. Each section should have a title, brief description, and key points/topics to cover.`,
        },
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
      temperature: 0.7, // Slightly higher for creative outline generation
      response_format: { type: 'json_object' },
      max_tokens: 4000, // Less tokens needed for outlines vs full content
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

    // Quality validation for outline structure
    const qualityIssues: string[] = [];

    // Check that sections have descriptions
    generatedContent.sections.forEach((section, idx) => {
      if (!section.content || section.content.trim().length < 20) {
        qualityIssues.push(
          `Section "${section.title || `Section ${idx + 1}`}" needs a better description (at least 20 characters)`
        );
      }
      // For outlines, items are key points/topics to cover
      if (section.type === 'list' && (!section.items || section.items.length === 0)) {
        qualityIssues.push(
          `Section "${section.title || `Section ${idx + 1}`}" should include key points/topics`
        );
      }
    });

    // Log quality metrics
    console.log(`[Product Generator] Generated outline with ${generatedContent.sections.length} sections`);
    const totalKeyPoints = generatedContent.sections.reduce((sum, s) => sum + (s.items?.length || 0), 0);
    console.log(`[Product Generator] Total key points: ${totalKeyPoints}`);

    if (qualityIssues.length > 0) {
      console.warn('[Product Generator] Quality issues detected:');
      qualityIssues.forEach(issue => console.warn(`  - ${issue}`));
    }

    return generatedContent;
  } catch (error: any) {
    console.error('[Product Generator] Error generating product:', error);
    console.error('[Product Generator] Error stack:', error.stack);
    throw new Error(`Failed to generate product: ${error.message}`);
  }
}

/**
 * Get product type specific prompt instructions for outlines
 */
function getOutlineTypePrompt(type: ProductIdea['type']): string {
  switch (type) {
    case 'checklist':
      return `CREATE A CHECKLIST OUTLINE:

Outline Requirements:
- Structure the checklist with logical sections
- Each section should outline:
  * Section title and purpose
  * Key checklist items that should be included (10-20 items per section)
  * Brief notes on what each item should cover
- Organize by phases/stages of the process
- Include an introduction section outline
- Include a completion/review section outline
- Note where affiliate opportunities could be mentioned

For each section, provide:
- Section title
- Brief description (1-2 sentences) of what this section covers
- List of key checklist items that should be included (just the item topics, not full explanations)

Outline Structure:
1. Introduction section (describe what should be covered)
2. Preparation section (key items to include)
3. Main action sections (group by theme/phases)
4. Review/completion section (key items)
5. Resources section (note affiliate opportunities)`;

    case 'workbook':
      return `CREATE A WORKBOOK OUTLINE:

Outline Requirements:
- Structure the workbook with an introduction section
- Outline 5-8 exercises/worksheets
- For each exercise, provide:
  * Exercise title
  * Brief description of what the exercise should cover (1-2 sentences)
  * Key components that should be included (fill-in sections, questions, templates, etc.)
  * Topics or prompts that should be part of the exercise
- Include a resources section outline
- Include a conclusion/next steps section outline

For each exercise section, provide:
- Exercise title
- Description of what the exercise should accomplish
- Key points/components to include (instructions, questions, templates, etc.)

Outline Structure:
1. Introduction section (describe what should be covered)
2. Exercise 1: [Theme] (describe exercise structure and components)
3. Exercise 2: [Theme]
4. Exercise 3: [Theme]
... (continue for 5-8 exercises)
N. Resources & Recommendations (note affiliate opportunities)
N+1. Conclusion & Action Plan (describe what should be included)`;

    case 'ebook':
      return `CREATE AN EBOOK OUTLINE:

Outline Requirements:
- Structure as chapters (5-8 content chapters plus intro/conclusion)
- For each chapter, provide:
  * Chapter title (descriptive, no "Chapter X:" prefix)
  * Brief description of what the chapter should cover (1-2 sentences)
  * Key topics/points that should be included in the chapter
  * Suggested structure (subheadings, examples, case studies, etc.)
- Logical flow and progression through chapters
- Include introduction and conclusion chapters

For each chapter section, provide:
- Chapter title (just the descriptive name)
- Description of what the chapter should accomplish
- Key topics/points to cover in the chapter

Outline Structure:
1. Introduction Chapter (describe what should be covered)
2. Chapter: [Topic] (describe content and key points)
3. Chapter: [Related Topic] (describe content and key points)
... (continue for 5-8 chapters)
N. Resource Recommendations Chapter (note affiliate opportunities)
N+1. Conclusion Chapter (describe what should be included)`;

    case 'newsletter':
      return `CREATE A NEWSLETTER OUTLINE:

Outline Requirements:
- Structure the newsletter with key sections
- For each section, provide:
  * Section title/type
  * Brief description of what should be covered
  * Key points or topics to include
- Note tone and formatting considerations

For each section, provide:
- Section name/type
- Description of what should be included (1-2 sentences)
- Key points/topics to cover

Outline Structure:
1. Subject Line (describe what it should convey)
2. Preview Text (describe what it should convey)
3. Introduction/Greeting (describe tone and content)
4. Main Content Sections (describe topics and structure)
5. Key Takeaways (note key points to include)
6. Recommended Products (note affiliate opportunities)
7. Call to Action (describe what it should be)
8. Closing/P.S. (describe what should be included)`;

    case 'video_series':
      return `CREATE A VIDEO SERIES OUTLINE:

Outline Requirements:
- Structure as episodes/lessons (6-12 episodes organized into modules)
- For each episode, provide:
  * Episode title (descriptive, no "Episode X:" prefix)
  * Brief description of what the episode should cover (1-2 sentences)
  * Key topics/points that should be included in the episode
  * Suggested structure (intro, main content, demonstration, practice, outro)
  * Learning objectives for the episode
- Logical flow and progression through episodes
- Include introduction episode and conclusion episode
- Organize episodes into modules/themes where appropriate

For each episode section, provide:
- Episode title (just the descriptive name)
- Description of what the episode should accomplish
- Key topics/points to cover in the episode
- Learning objectives
- Suggested structure (intro, main content, demonstration, practice, outro)

Outline Structure:
1. Introduction Episode (describe what should be covered - series overview, learning path, prerequisites)
2. Episode: [Topic] (describe content, key points, and learning objectives)
3. Episode: [Related Topic] (describe content, key points, and learning objectives)
... (continue for 6-12 episodes, organized into modules if appropriate)
N. Resource Recommendations Episode (note affiliate opportunities for tools/software)
N+1. Conclusion Episode (describe what should be included - recap, next steps, call to action)`;

    default:
      return `Create an outline for a ${type} based on the blog content. The outline should show the structure, organization, and key points to cover. Include notes on where affiliate opportunities could be mentioned.`;
  }
}

