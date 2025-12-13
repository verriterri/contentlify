import type { AuditCheck, StructuredContent } from '../types';

/**
 * Tier 1 AEO Checks (Critical)
 */

export function checkAnswerFirstStructure(structured: StructuredContent): AuditCheck {
  const { firstSentence } = structured;
  
  if (!firstSentence) {
    return {
      id: 'aeo-answer-first-missing',
      name: 'Answer-First Structure Missing',
      category: 'aeo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: 'Your content doesn\'t start with a clear answer to a question. Answer Engine Optimization (AEO) requires answering questions directly.',
      recommendation: 'Start your content with a direct answer to the main question. The first sentence should immediately address what readers are looking for.',
      example: 'Instead of: "In this article, we will explore..."\nBetter: "The best coffee maker for 2024 is the [Product Name] because..."',
      impact: {
        aeo: 'Answer-first content is more likely to be featured in answer boxes and voice search results, driving more traffic.',
      },
    };
  }
  
  // Check if first sentence answers a question (contains question words or is declarative)
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'best', 'top'];
  const firstSentenceLower = firstSentence.toLowerCase();
  const containsQuestionWord = questionWords.some(word => firstSentenceLower.includes(word));
  const isDeclarative = firstSentence.match(/^[A-Z][^.!?]*[.!?]$/);
  
  // Check if it's a direct answer (not just an introduction)
  const introPhrases = ['in this article', 'this guide', 'we will', 'let\'s explore', 'welcome to'];
  const isIntro = introPhrases.some(phrase => firstSentenceLower.includes(phrase));
  
  if (isIntro && !containsQuestionWord) {
    return {
      id: 'aeo-answer-first-intro',
      name: 'Answer-First Structure Missing',
      category: 'aeo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: 'Your first sentence is an introduction rather than a direct answer. AEO requires immediate answers to questions.',
      recommendation: 'Replace the introduction with a direct answer. Start with the answer, then provide context.',
      example: `Instead of: "${firstSentence}"\nBetter: "The best [topic] is [answer] because [reason]."`,
      impact: {
        aeo: 'Answer-first content performs better in answer boxes, featured snippets, and voice search results.',
      },
    };
  }
  
  return {
    id: 'aeo-answer-first-ok',
    name: 'Answer-First Structure',
    category: 'aeo',
    tier: 1,
    passed: true,
    severity: 'info',
  };
}

export function checkFaqSection(structured: StructuredContent): AuditCheck {
  const { faqSections } = structured;
  
  if (faqSections.length === 0) {
    return {
      id: 'aeo-faq-missing',
      name: 'FAQ Section Missing',
      category: 'aeo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: 'Your content has no FAQ section. FAQs are essential for Answer Engine Optimization and often appear in featured snippets.',
      recommendation: 'Add an FAQ section with 3-5 common questions related to your topic. Use H3 or H4 tags for questions.',
      example: '<h3>What is the best coffee maker?</h3>\n<p>The best coffee maker is...</p>',
      impact: {
        aeo: 'FAQ sections frequently appear in Google\'s featured snippets and answer boxes, driving significant organic traffic.',
      },
    };
  }
  
  return {
    id: 'aeo-faq-ok',
    name: 'FAQ Section',
    category: 'aeo',
    tier: 1,
    passed: true,
    severity: 'info',
  };
}

export function checkStructuredContent(structured: StructuredContent): AuditCheck {
  const { contentStructure } = structured;
  const { hasBullets, hasNumberedLists, hasTables } = contentStructure;
  
  if (!hasBullets && !hasNumberedLists && !hasTables) {
    return {
      id: 'aeo-structured-content-missing',
      name: 'Structured Content Missing',
      category: 'aeo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: 'Your content has no structured elements (bullets, numbered lists, or tables). Structured content is essential for AEO.',
      recommendation: 'Add structured content: bullet points for key features, numbered lists for steps, or tables for comparisons.',
      example: 'Add: <ul><li>Feature 1</li><li>Feature 2</li></ul> or <ol><li>Step 1</li><li>Step 2</li></ol>',
      impact: {
        aeo: 'Structured content (lists, tables) is more likely to be featured in answer boxes and is easier for AI to extract and present.',
      },
    };
  }
  
  return {
    id: 'aeo-structured-content-ok',
    name: 'Structured Content',
    category: 'aeo',
    tier: 1,
    passed: true,
    severity: 'info',
  };
}

export function checkTextWalls(structured: StructuredContent): AuditCheck {
  const { paragraphs } = structured;
  
  // Check for paragraphs over 150 words without breaks
  const longParagraphs = paragraphs.filter(p => p.wordCount > 150);
  
  if (longParagraphs.length > 0) {
    return {
      id: 'aeo-text-walls',
      name: 'Text Walls Detected',
      category: 'aeo',
      tier: 1,
      passed: false,
      severity: 'critical',
      issue: `${longParagraphs.length} paragraph${longParagraphs.length > 1 ? 's' : ''} exceed${longParagraphs.length > 1 ? '' : 's'} 150 words without breaks. This creates "text walls" that hurt readability and AEO.`,
      recommendation: 'Break up long paragraphs with line breaks, bullet points, subheadings, or shorter paragraphs (50-100 words each).',
      example: 'Split 200-word paragraphs into 2-3 shorter paragraphs with clear transitions or use bullet points for key points.',
      impact: {
        aeo: 'Text walls are harder for answer engines to parse and extract information from, reducing chances of appearing in answer boxes.',
      },
    };
  }
  
  return {
    id: 'aeo-text-walls-ok',
    name: 'Text Walls',
    category: 'aeo',
    tier: 1,
    passed: true,
    severity: 'info',
  };
}

/**
 * Tier 2 AEO Checks (Warnings)
 */

export function checkFaqQuality(structured: StructuredContent): AuditCheck {
  const { faqSections } = structured;
  
  if (faqSections.length === 0) {
    // This is already caught by Tier 1 check
    return {
      id: 'aeo-faq-quality-ok',
      name: 'FAQ Quality',
      category: 'aeo',
      tier: 2,
      passed: true,
      severity: 'info',
    };
  }
  
  // Count total questions across all FAQ sections
  const totalQuestions = faqSections.reduce((sum, section) => sum + section.questions.length, 0);
  
  if (totalQuestions < 3) {
    return {
      id: 'aeo-faq-too-few',
      name: 'FAQ Has Too Few Questions',
      category: 'aeo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: `Your FAQ section has only ${totalQuestions} question${totalQuestions > 1 ? 's' : ''}. Aim for at least 3-5 questions for better AEO performance.`,
      recommendation: 'Add more FAQ questions. Think about common questions readers have about your topic.',
      example: 'Add questions like: "How do I choose...?", "What are the best...?", "What should I avoid...?"',
      impact: {
        aeo: 'More FAQ questions increase chances of appearing in answer boxes and featured snippets.',
      },
    };
  }
  
  // Check if FAQs are properly formatted with headers
  const improperlyFormatted = faqSections.filter(section => !section.formattedWithHeaders);
  
  if (improperlyFormatted.length > 0) {
    return {
      id: 'aeo-faq-formatting',
      name: 'FAQ Questions Not Properly Formatted',
      category: 'aeo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: 'Some FAQ questions are not formatted with H3 or H4 headers. Proper formatting helps answer engines identify FAQs.',
      recommendation: 'Format all FAQ questions as H3 or H4 headers. This makes them easier for answer engines to identify and feature.',
      example: '<h3>What is the best coffee maker?</h3>\n<p>Answer here...</p>',
      impact: {
        aeo: 'Properly formatted FAQs (with H3/H4 headers) are more likely to be extracted and featured in answer boxes.',
      },
    };
  }
  
  return {
    id: 'aeo-faq-quality-ok',
    name: 'FAQ Quality',
    category: 'aeo',
    tier: 2,
    passed: true,
    severity: 'info',
  };
}

export function checkSectionIndependence(structured: StructuredContent): AuditCheck {
  const { headers, paragraphs } = structured;
  
  if (headers.length < 2) {
    // Not enough sections to check independence
    return {
      id: 'aeo-section-independence-ok',
      name: 'Section Independence',
      category: 'aeo',
      tier: 2,
      passed: true,
      severity: 'info',
    };
  }
  
  // Heuristic: Check if sections have enough context to stand alone
  // Look for sections that might depend on previous context
  // This is a simplified check - in practice, this would require more sophisticated NLP
  
  // Check if there are very short sections (might indicate dependency)
  const h2Headers = headers.filter(h => h.level === 2);
  let dependentSections = 0;
  
  // For each H2, check if the following content is substantial
  // This is a simplified heuristic
  for (let i = 0; i < h2Headers.length; i++) {
    // Count paragraphs between this H2 and next H2 (or end)
    const nextH2Index = headers.findIndex((h, idx) => idx > i && h.level === 2);
    const sectionParagraphs = paragraphs.slice(i, nextH2Index > 0 ? nextH2Index : paragraphs.length);
    
    // If section has very few paragraphs, it might be dependent
    if (sectionParagraphs.length < 2) {
      dependentSections++;
    }
  }
  
  if (dependentSections > 0 && headers.length > 3) {
    return {
      id: 'aeo-section-independence-issues',
      name: 'Section Independence Issues',
      category: 'aeo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: 'Some sections may lack independence and require context from previous sections. Independent sections perform better for AEO.',
      recommendation: 'Ensure each major section can stand alone. Add brief context at the start of each section so it makes sense independently.',
      example: 'Instead of: "This feature is better."\nBetter: "The [Product Name] feature is better because..."',
      impact: {
        aeo: 'Independent sections are more likely to be extracted and featured in answer boxes, as they provide complete answers without context.',
      },
    };
  }
  
  return {
    id: 'aeo-section-independence-ok',
    name: 'Section Independence',
    category: 'aeo',
    tier: 2,
    passed: true,
    severity: 'info',
  };
}

export function checkContextDepth(structured: StructuredContent): AuditCheck {
  const { headers, paragraphs } = structured;
  
  if (headers.length < 2) {
    return {
      id: 'aeo-context-depth-ok',
      name: 'Context Depth',
      category: 'aeo',
      tier: 2,
      passed: true,
      severity: 'info',
    };
  }
  
  // Check if main points have sufficient explanation (2-3 paragraphs after)
  // This is a simplified heuristic
  const h2Headers = headers.filter(h => h.level === 2);
  let shallowSections = 0;
  
  for (let i = 0; i < h2Headers.length; i++) {
    const nextH2Index = headers.findIndex((h, idx) => idx > i && h.level === 2);
    const sectionParagraphs = paragraphs.slice(i, nextH2Index > 0 ? nextH2Index : paragraphs.length);
    
    // If section has fewer than 2 paragraphs of explanation, it's shallow
    if (sectionParagraphs.length < 2) {
      shallowSections++;
    }
  }
  
  if (shallowSections > 0 && h2Headers.length > 2) {
    return {
      id: 'aeo-context-depth-shallow',
      name: 'Insufficient Context Depth',
      category: 'aeo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: `${shallowSections} section${shallowSections > 1 ? 's' : ''} lack${shallowSections > 1 ? '' : 's'} sufficient context depth. Main points should have 2-3 paragraphs of explanation.`,
      recommendation: 'Expand sections with more context, examples, and explanations. Each main point should have 2-3 paragraphs of supporting content.',
      example: 'Add: detailed explanations, examples, use cases, comparisons, and related information to each main point.',
      impact: {
        aeo: 'Deeper context helps answer engines provide more comprehensive answers, increasing chances of being featured.',
      },
    };
  }
  
  return {
    id: 'aeo-context-depth-ok',
    name: 'Context Depth',
    category: 'aeo',
    tier: 2,
    passed: true,
    severity: 'info',
  };
}

export function checkOriginalInsights(structured: StructuredContent): AuditCheck {
  const { wordCount, paragraphs } = structured;
  
  // Heuristic: Check for indicators of original insights
  // Look for: statistics, data references, specific numbers, research citations
  // This is a simplified check - in practice, this would require more sophisticated analysis
  
  const contentText = paragraphs.map(p => p.text).join(' ');
  const contentLower = contentText.toLowerCase();
  
  // Look for indicators of original content
  const hasStatistics = /\d+%|\d+\s*(percent|million|billion|thousand)|according to|research shows|study found|survey|data shows/i.test(contentText);
  const hasSpecificNumbers = (contentText.match(/\d+/g) || []).length > 5;
  const hasCitations = /source:|according to|research|study|survey|report/i.test(contentText);
  const hasPersonalExperience = /i (found|discovered|tested|tried)|in my experience|personally|my own/i.test(contentText);
  
  const hasOriginalInsights = hasStatistics || (hasSpecificNumbers && hasCitations) || hasPersonalExperience;
  
  if (!hasOriginalInsights && wordCount > 1000) {
    return {
      id: 'aeo-original-insights-missing',
      name: 'No Original Insights/Stats/Data',
      category: 'aeo',
      tier: 2,
      passed: false,
      severity: 'warning',
      issue: 'Your content lacks original insights, statistics, or data references. Original data and insights improve AEO performance.',
      recommendation: 'Add original insights: statistics, research data, personal experience, case studies, or unique analysis.',
      example: 'Add: "According to a 2024 study, 73% of users prefer..." or "In my testing, I found that..."',
      impact: {
        aeo: 'Content with original insights, statistics, and data is more likely to be featured in answer boxes and considered authoritative.',
      },
    };
  }
  
  return {
    id: 'aeo-original-insights-ok',
    name: 'Original Insights/Stats/Data',
    category: 'aeo',
    tier: 2,
    passed: true,
    severity: 'info',
  };
}




