import type { AuditCheck, StructuredContent } from '../types';
import { checkLinkHealth } from '@/lib/utils/link-health-checker';

/**
 * Tier 1 SEO Checks (Critical)
 */

export async function checkTitleTag(structured: StructuredContent): Promise<AuditCheck> {
  const { titleTag, titleTagLength, primaryKeyword } = structured;
  
  if (!titleTag || titleTag.trim().length === 0) {
    return {
      id: 'seo-title-missing',
      name: 'Title Tag Missing',
      category: 'seo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: 'Your page is missing a title tag. This is critical for SEO as search engines use it as the primary title in search results.',
      recommendation: 'Add a <title> tag in the <head> section of your HTML. The title should be 30-60 characters and include your primary keyword.',
      example: '<title>Best Coffee Makers 2024: Top Picks and Reviews</title>',
      impact: {
        seo: 'Missing title tags significantly hurt search rankings and click-through rates from search results.',
      },
    };
  }
  
  if (titleTagLength > 60) {
    return {
      id: 'seo-title-too-long',
      name: 'Title Tag Too Long',
      category: 'seo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: `Your title tag is ${titleTagLength} characters, which exceeds the recommended 60 characters. Search engines may truncate it in results.`,
      recommendation: 'Shorten your title tag to 60 characters or less. Focus on the most important keywords and value proposition.',
      example: `Current: "${titleTag.substring(0, 70)}..." → Better: "${titleTag.substring(0, 60)}"`,
      impact: {
        seo: 'Long titles get truncated in search results, reducing click-through rates.',
      },
    };
  }
  
  if (titleTagLength < 30) {
    return {
      id: 'seo-title-too-short',
      name: 'Title Tag Too Short',
      category: 'seo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: `Your title tag is only ${titleTagLength} characters, which is below the recommended 30 characters. You're missing opportunities to include keywords.`,
      recommendation: 'Expand your title tag to at least 30 characters. Include your primary keyword and a compelling value proposition.',
      example: `Current: "${titleTag}" → Better: "${titleTag} - Complete Guide and Reviews"`,
      impact: {
        seo: 'Short titles miss opportunities to include keywords and may rank lower for target searches.',
      },
    };
  }
  
  if (primaryKeyword && !titleTag.toLowerCase().includes(primaryKeyword.toLowerCase())) {
    return {
      id: 'seo-title-no-keyword',
      name: 'Primary Keyword Missing from Title',
      category: 'seo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: `Your title tag doesn't include your primary keyword "${primaryKeyword}". This significantly reduces your chances of ranking for that term.`,
      recommendation: `Include "${primaryKeyword}" in your title tag naturally. Place it near the beginning for maximum impact.`,
      example: `Current: "${titleTag}" → Better: "${primaryKeyword}: ${titleTag}"`,
      impact: {
        seo: 'Title tags without primary keywords rank significantly lower for target searches.',
      },
    };
  }
  
  return {
    id: 'seo-title-ok',
    name: 'Title Tag',
    category: 'seo',
    tier: 1,
    passed: true,
    severity: 'info',
  };
}

export function checkH1(structured: StructuredContent): AuditCheck {
  const { h1Count, h1Text } = structured;
  
  if (h1Count === 0) {
    return {
      id: 'seo-h1-missing',
      name: 'H1 Tag Missing',
      category: 'seo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: 'Your page has no H1 tag. H1 tags are the most important heading for SEO and should contain your primary keyword.',
      recommendation: 'Add exactly one H1 tag to your page. It should be the main heading and include your primary keyword.',
      example: '<h1>Best Coffee Makers 2024: Complete Buying Guide</h1>',
      impact: {
        seo: 'Pages without H1 tags rank lower in search results. H1s are a strong ranking signal.',
      },
    };
  }
  
  if (h1Count > 1) {
    return {
      id: 'seo-h1-multiple',
      name: 'Multiple H1 Tags',
      category: 'seo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: `Your page has ${h1Count} H1 tags. There should be exactly one H1 per page for optimal SEO.`,
      recommendation: 'Keep only one H1 tag (the main heading) and convert the others to H2 or H3 tags.',
      example: 'Keep: <h1>Main Title</h1>, Change others to: <h2>Section Title</h2>',
      impact: {
        seo: 'Multiple H1s dilute the importance signal and confuse search engines about the page topic.',
      },
    };
  }
  
  return {
    id: 'seo-h1-ok',
    name: 'H1 Tag',
    category: 'seo',
    tier: 1,
    passed: true,
    severity: 'info',
  };
}

export function checkPrimaryKeywordInFirst100Words(structured: StructuredContent): AuditCheck {
  const { primaryKeyword, first100Words } = structured;
  
  if (!primaryKeyword) {
    // If no keyword inferred, this check passes (keyword inference is handled separately)
    return {
      id: 'seo-keyword-first100-ok',
      name: 'Primary Keyword in First 100 Words',
      category: 'seo',
      tier: 1,
      passed: true,
      severity: 'info',
    };
  }
  
  const keywordLower = primaryKeyword.toLowerCase().trim();
  const first100Lower = first100Words.toLowerCase();
  
  // Check if keyword appears (handle multi-word keywords)
  // For multi-word keywords, check if all words appear (in order if possible, but allow flexibility)
  const keywordWords = keywordLower.split(/\s+/).filter(w => w.length > 0);
  let keywordFound = false;
  
  if (keywordWords.length === 1) {
    // Single word: simple contains check
    keywordFound = first100Lower.includes(keywordWords[0]);
  } else {
    // Multi-word: check if all words appear (prefer exact phrase, but allow if all words present)
    const exactPhrase = keywordLower;
    if (first100Lower.includes(exactPhrase)) {
      keywordFound = true;
    } else {
      // Check if all words appear (even if not as exact phrase)
      const allWordsPresent = keywordWords.every(word => first100Lower.includes(word));
      if (allWordsPresent) {
        // Verify words appear relatively close together (within 50 characters of each other)
        const firstWordIndex = first100Lower.indexOf(keywordWords[0]);
        if (firstWordIndex >= 0) {
          const substring = first100Lower.substring(firstWordIndex, firstWordIndex + 200);
          const otherWordsPresent = keywordWords.slice(1).every(word => substring.includes(word));
          keywordFound = otherWordsPresent;
        }
      }
    }
  }
  
  if (!keywordFound) {
    return {
      id: 'seo-keyword-first100-missing',
      name: 'Primary Keyword Missing from First 100 Words',
      category: 'seo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: `Your primary keyword "${primaryKeyword}" doesn't appear in the first 100 words of your content. Early keyword placement is important for SEO.`,
      recommendation: `Include "${primaryKeyword}" naturally in your opening paragraph. Don't stuff it, but make sure it appears early.`,
      example: `Instead of: "This guide covers everything you need to know..."\nBetter: "This ${primaryKeyword} guide covers everything you need to know..."`,
      impact: {
        seo: 'Keywords in the first 100 words signal topic relevance to search engines and improve rankings.',
      },
    };
  }
  
  return {
    id: 'seo-keyword-first100-ok',
    name: 'Primary Keyword in First 100 Words',
    category: 'seo',
    tier: 1,
    passed: true,
    severity: 'info',
  };
}

export function checkWordCount(structured: StructuredContent): AuditCheck {
  const { wordCount } = structured;
  
  if (wordCount < 800) {
    return {
      id: 'seo-word-count-low',
      name: 'Word Count Too Low',
      category: 'seo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: `Your content is only ${wordCount} words, which is below the recommended minimum of 800 words for SEO.`,
      recommendation: 'Expand your content to at least 800 words. Add more detail, examples, and comprehensive coverage of your topic.',
      example: 'Add sections like: detailed explanations, step-by-step guides, examples, case studies, FAQs, and related topics.',
      impact: {
        seo: 'Short content (under 800 words) typically ranks lower than comprehensive, in-depth content.',
      },
    };
  }
  
  return {
    id: 'seo-word-count-ok',
    name: 'Word Count',
    category: 'seo',
    tier: 1,
    passed: true,
    severity: 'info',
  };
}

export function checkImageAltText(structured: StructuredContent): AuditCheck {
  const { images, imagesWithoutAlt } = structured;
  
  if (images.length === 0) {
    // No images, so this check passes
    return {
      id: 'seo-image-alt-ok',
      name: 'Image Alt Text',
      category: 'seo',
      tier: 1,
      passed: true,
      severity: 'info',
    };
  }
  
  if (imagesWithoutAlt > 0) {
    return {
      id: 'seo-image-alt-missing',
      name: 'Missing Image Alt Text',
      category: 'seo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: `${imagesWithoutAlt} of ${images.length} images are missing alt text. Alt text is essential for SEO and accessibility.`,
      recommendation: 'Add descriptive alt text to all images. Describe what the image shows, and include keywords when natural.',
      example: '<img src="coffee-maker.jpg" alt="Best coffee maker with programmable timer">',
      impact: {
        seo: 'Images without alt text miss opportunities for image search rankings and hurt overall page SEO.',
      },
    };
  }
  
  return {
    id: 'seo-image-alt-ok',
    name: 'Image Alt Text',
    category: 'seo',
    tier: 1,
    passed: true,
    severity: 'info',
  };
}

export function checkInternalLinks(structured: StructuredContent): AuditCheck {
  const { internalLinkCount } = structured;
  
  if (internalLinkCount === 0) {
    return {
      id: 'seo-internal-links-missing',
      name: 'No Internal Links',
      category: 'seo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: 'Your page has no internal links to other pages on your site. Internal linking is crucial for SEO and user experience.',
      recommendation: 'Add 3-5 internal links to related content on your site. Link to relevant articles, guides, or product pages.',
      example: 'Link to related topics: "For more tips, see our guide on <a href="/coffee-brewing">coffee brewing methods</a>."',
      impact: {
        seo: 'Internal links help search engines discover and index your content, distribute page authority, and improve rankings.',
      },
    };
  }
  
  return {
    id: 'seo-internal-links-ok',
    name: 'Internal Links',
    category: 'seo',
    tier: 1,
    passed: true,
    severity: 'info',
  };
}

/**
 * Tier 2 SEO Checks (Warnings)
 */

export function checkHeaderStructure(structured: StructuredContent): AuditCheck {
  const { headers, wordCount } = structured;
  
  if (headers.length === 0) {
    return {
      id: 'seo-header-structure-none',
      name: 'No Header Structure',
      category: 'seo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: 'Your content has no header structure (H1-H6). Headers help organize content and improve SEO.',
      recommendation: 'Add headers to organize your content. Use H2 for main sections, H3 for subsections, and so on.',
      impact: {
        seo: 'Well-structured headers help search engines understand content hierarchy and improve rankings.',
      },
    };
  }
  
  // Check for skipped levels (e.g., H1 → H3 without H2)
  let previousLevel = 0;
  let hasSkippedLevels = false;
  
  for (const header of headers) {
    if (previousLevel > 0 && header.level > previousLevel + 1) {
      hasSkippedLevels = true;
      break;
    }
    previousLevel = header.level;
  }
  
  if (hasSkippedLevels) {
    return {
      id: 'seo-header-structure-skipped',
      name: 'Header Structure Issues',
      category: 'seo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: 'Your headers skip levels (e.g., H1 followed by H3). Headers should follow a logical hierarchy.',
      recommendation: 'Fix header hierarchy: H1 → H2 → H3. Don\'t skip levels. Each header should be one level below the previous.',
      example: 'Correct: <h1>Main</h1> → <h2>Section</h2> → <h3>Subsection</h3>',
      impact: {
        seo: 'Skipped header levels confuse search engines about content structure and hierarchy.',
      },
    };
  }
  
  // Check if there are enough headers for content length
  // Rough guideline: 1 header per 300-500 words
  const recommendedHeaders = Math.ceil(wordCount / 400);
  if (headers.length < recommendedHeaders && wordCount > 1000) {
    return {
      id: 'seo-header-structure-few',
      name: 'Insufficient Headers',
      category: 'seo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: `Your ${wordCount}-word content has only ${headers.length} headers. Consider adding more headers to break up long sections.`,
      recommendation: `Add more headers to organize your content. Aim for roughly 1 header per 300-500 words (about ${recommendedHeaders} total).`,
      impact: {
        seo: 'More headers improve content scannability and help search engines understand your content structure.',
      },
    };
  }
  
  return {
    id: 'seo-header-structure-ok',
    name: 'Header Structure',
    category: 'seo',
    tier: 2,
    passed: true,
    severity: 'info',
  };
}

export function checkPrimaryKeywordInUrl(structured: StructuredContent): AuditCheck {
  const { primaryKeyword, urlSlug } = structured;
  
  if (!primaryKeyword) {
    return {
      id: 'seo-keyword-url-ok',
      name: 'Primary Keyword in URL',
      category: 'seo',
      tier: 2,
      passed: true,
      severity: 'info',
    };
  }
  
  const keywordLower = primaryKeyword.toLowerCase().replace(/\s+/g, '-');
  const slugLower = urlSlug.toLowerCase();
  
  // Check if keyword appears in URL slug (allowing for variations)
  const keywordWords = keywordLower.split('-');
  const hasKeyword = keywordWords.some(word => slugLower.includes(word)) || slugLower.includes(keywordLower);
  
  if (!hasKeyword) {
    return {
      id: 'seo-keyword-url-missing',
      name: 'Primary Keyword Not in URL',
      category: 'seo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: `Your primary keyword "${primaryKeyword}" doesn't appear in your URL slug. Keywords in URLs provide a small but valuable SEO boost.`,
      recommendation: `If possible, include "${primaryKeyword}" in your URL. For example: "/${keywordLower.replace(/\s+/g, '-')}"`,
      example: `Current: "/blog/post-123" → Better: "/blog/${keywordLower}"`,
      impact: {
        seo: 'Keywords in URLs provide a small ranking boost and improve click-through rates from search results.',
      },
    };
  }
  
  return {
    id: 'seo-keyword-url-ok',
    name: 'Primary Keyword in URL',
    category: 'seo',
    tier: 2,
    passed: true,
    severity: 'info',
  };
}

export function checkParagraphLength(structured: StructuredContent): AuditCheck {
  const { paragraphs } = structured;
  
  const longParagraphs = paragraphs.filter(p => p.wordCount > 150);
  
  if (longParagraphs.length > 0) {
    return {
      id: 'seo-paragraph-length',
      name: 'Long Paragraphs',
      category: 'seo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: `${longParagraphs.length} paragraph${longParagraphs.length > 1 ? 's' : ''} exceed${longParagraphs.length > 1 ? '' : 's'} 150 words. Long paragraphs are harder to read and may hurt engagement.`,
      recommendation: 'Break long paragraphs into shorter ones (50-150 words each). Use line breaks, bullet points, or subheadings to improve readability.',
      example: 'Split a 200-word paragraph into 2-3 shorter paragraphs with clear transitions.',
      impact: {
        seo: 'Shorter paragraphs improve readability, reduce bounce rates, and increase time on page—all positive SEO signals.',
      },
    };
  }
  
  return {
    id: 'seo-paragraph-length-ok',
    name: 'Paragraph Length',
    category: 'seo',
    tier: 2,
    passed: true,
    severity: 'info',
  };
}

export function checkMetaDescription(structured: StructuredContent): AuditCheck {
  const { metaDescription, metaDescriptionLength } = structured;
  
  if (!metaDescription || metaDescription.trim().length === 0) {
    return {
      id: 'seo-meta-description-missing',
      name: 'Meta Description Missing',
      category: 'seo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: 'Your page is missing a meta description. While not a direct ranking factor, it affects click-through rates from search results.',
      recommendation: 'Add a meta description tag (150-160 characters) that summarizes your content and includes a call to action.',
      example: '<meta name="description" content="Discover the best coffee makers of 2024. Our comprehensive guide reviews top models, features, and buying tips.">',
      impact: {
        seo: 'Meta descriptions appear in search results and significantly impact click-through rates, which indirectly affects rankings.',
      },
    };
  }
  
  if (metaDescriptionLength > 160) {
    return {
      id: 'seo-meta-description-long',
      name: 'Meta Description Too Long',
      category: 'seo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: `Your meta description is ${metaDescriptionLength} characters, which exceeds the recommended 160 characters. It may be truncated in search results.`,
      recommendation: 'Shorten your meta description to 150-160 characters to ensure it displays fully in search results.',
      example: `Current: "${metaDescription.substring(0, 170)}..." → Better: "${metaDescription.substring(0, 160)}"`,
      impact: {
        seo: 'Truncated meta descriptions reduce click-through rates from search results.',
      },
    };
  }
  
  return {
    id: 'seo-meta-description-ok',
    name: 'Meta Description',
    category: 'seo',
    tier: 2,
    passed: true,
    severity: 'info',
  };
}

export async function checkBrokenInternalLinks(structured: StructuredContent, baseUrl: string): Promise<AuditCheck> {
  const { internalLinks } = structured;
  
  if (internalLinks.length === 0) {
    return {
      id: 'seo-broken-links-ok',
      name: 'Broken Internal Links',
      category: 'seo',
      tier: 2,
      passed: true,
      severity: 'info',
    };
  }
  
  // Check first 10 internal links (to avoid performance issues)
  const linksToCheck = internalLinks.slice(0, 10);
  const brokenLinks: string[] = [];
  
  for (const link of linksToCheck) {
    try {
      const health = await checkLinkHealth(link.url);
      if (health.status === 'broken' || health.status === 'timeout') {
        brokenLinks.push(link.url);
      }
    } catch (error) {
      // If check fails, assume link might be broken
      brokenLinks.push(link.url);
    }
  }
  
  if (brokenLinks.length > 0) {
    return {
      id: 'seo-broken-links-found',
      name: 'Broken Internal Links',
      category: 'seo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: `Found ${brokenLinks.length} broken internal link${brokenLinks.length > 1 ? 's' : ''} out of ${linksToCheck.length} checked. Broken links hurt SEO and user experience.`,
      recommendation: 'Fix or remove broken internal links. Update URLs that have changed, or remove links to deleted content.',
      example: `Broken link: ${brokenLinks[0]} - Update to correct URL or remove if content no longer exists.`,
      impact: {
        seo: 'Broken links create poor user experience, increase bounce rates, and waste crawl budget—all negative SEO signals.',
      },
    };
  }
  
  return {
    id: 'seo-broken-links-ok',
    name: 'Broken Internal Links',
    category: 'seo',
    tier: 2,
    passed: true,
    severity: 'info',
  };
}

