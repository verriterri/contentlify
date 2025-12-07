import type { AuditResult, StructuredContent, ContentAuditOptions } from './types';
import * as seoChecks from './checks/seo-checks';
import * as aeoChecks from './checks/aeo-checks';

/**
 * Main content audit engine
 * Runs all SEO and AEO checks and generates a comprehensive audit report
 */
export async function auditContent(
  structured: StructuredContent,
  baseUrl: string,
  options: ContentAuditOptions = {}
): Promise<AuditResult> {
  const { enabled = true, skipBrokenLinkCheck = false } = options;
  
  if (!enabled) {
    // Return empty audit if disabled
    return {
      score: 0,
      tier1Passed: 0,
      tier1Total: 0,
      tier2Passed: 0,
      tier2Total: 0,
      criticalIssues: [],
      warnings: [],
      optimizations: [],
      recommendations: [],
      checks: [],
      analyzedAt: new Date().toISOString(),
    };
  }
  
  const checks: Array<Awaited<ReturnType<typeof seoChecks.checkTitleTag>>> = [];
  
  // Run Tier 1 SEO Checks
  checks.push(await seoChecks.checkTitleTag(structured));
  checks.push(seoChecks.checkH1(structured));
  checks.push(seoChecks.checkPrimaryKeywordInFirst100Words(structured));
  checks.push(seoChecks.checkWordCount(structured));
  checks.push(seoChecks.checkImageAltText(structured));
  checks.push(seoChecks.checkInternalLinks(structured));
  
  // Run Tier 1 AEO Checks
  checks.push(aeoChecks.checkAnswerFirstStructure(structured));
  checks.push(aeoChecks.checkFaqSection(structured));
  checks.push(aeoChecks.checkStructuredContent(structured));
  checks.push(aeoChecks.checkTextWalls(structured));
  
  // Run Tier 2 SEO Checks
  checks.push(seoChecks.checkHeaderStructure(structured));
  checks.push(seoChecks.checkPrimaryKeywordInUrl(structured));
  checks.push(seoChecks.checkParagraphLength(structured));
  checks.push(seoChecks.checkMetaDescription(structured));
  
  if (!skipBrokenLinkCheck) {
    checks.push(await seoChecks.checkBrokenInternalLinks(structured, baseUrl));
  } else {
    // Add a placeholder check that passes
    checks.push({
      id: 'seo-broken-links-skipped',
      name: 'Broken Internal Links',
      category: 'seo',
      tier: 2,
      passed: true,
      severity: 'info',
    });
  }
  
  // Run Tier 2 AEO Checks
  checks.push(aeoChecks.checkFaqQuality(structured));
  checks.push(aeoChecks.checkSectionIndependence(structured));
  checks.push(aeoChecks.checkContextDepth(structured));
  checks.push(aeoChecks.checkOriginalInsights(structured));
  
  // Separate checks by tier and passed status
  const tier1Checks = checks.filter(c => c.tier === 1);
  const tier2Checks = checks.filter(c => c.tier === 2);
  
  const tier1Passed = tier1Checks.filter(c => c.passed).length;
  const tier1Total = tier1Checks.length;
  const tier2Passed = tier2Checks.filter(c => c.passed).length;
  const tier2Total = tier2Checks.length;
  
  // Calculate weighted score
  // Tier 1 weight: 2x, Tier 2 weight: 1x
  const tier1Weight = 2;
  const tier2Weight = 1;
  
  const totalWeightedPoints = (tier1Total * tier1Weight) + (tier2Total * tier2Weight);
  const earnedWeightedPoints = (tier1Passed * tier1Weight) + (tier2Passed * tier2Weight);
  
  const score = totalWeightedPoints > 0 
    ? Math.round((earnedWeightedPoints / totalWeightedPoints) * 100)
    : 0;
  
  // Categorize issues
  const criticalIssues = checks.filter(c => !c.passed && c.tier === 1);
  const warnings = checks.filter(c => !c.passed && c.tier === 2);
  const optimizations = checks.filter(c => c.passed && c.severity === 'info');
  
  // Generate recommendations
  const recommendations: AuditResult['recommendations'] = [];
  
  // Add recommendations for critical issues
  for (const issue of criticalIssues) {
    if (issue.recommendation) {
      recommendations.push({
        priority: 'high',
        category: issue.category,
        issue: issue.issue || issue.name,
        fix: issue.recommendation,
        example: issue.example,
      });
    }
  }
  
  // Add recommendations for warnings
  for (const warning of warnings) {
    if (warning.recommendation) {
      recommendations.push({
        priority: 'medium',
        category: warning.category,
        issue: warning.issue || warning.name,
        fix: warning.recommendation,
        example: warning.example,
      });
    }
  }
  
  // Add some general optimizations if score is high
  if (score >= 80 && optimizations.length > 0) {
    recommendations.push({
      priority: 'low',
      category: 'both',
      issue: 'Your content is already well-optimized! Consider these additional improvements:',
      fix: 'Continue monitoring and improving. Consider adding more internal links, expanding content depth, and updating regularly.',
    });
  }
  
  return {
    score,
    tier1Passed,
    tier1Total,
    tier2Passed,
    tier2Total,
    criticalIssues,
    warnings,
    optimizations,
    recommendations,
    checks,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Generate cross-insights connecting audit findings with affiliate opportunities
 */
export function generateCrossInsights(
  auditResult: AuditResult,
  structured: StructuredContent,
  affiliateOpportunities: Array<{ product: string; category: string }>
): string[] {
  const insights: string[] = [];
  
  // Check if keyword is missing and word count is low
  const keywordMissing = auditResult.criticalIssues.some(c => c.id === 'seo-keyword-first100-missing');
  const wordCountLow = auditResult.criticalIssues.some(c => c.id === 'seo-word-count-low');
  
  if (keywordMissing && wordCountLow && structured.primaryKeyword) {
    const wordCountNeeded = 800 - structured.wordCount;
    insights.push(
      `To rank for "${structured.primaryKeyword}", you need ${wordCountNeeded} more words. ` +
      `Consider adding sections on related topics. ` +
      (affiliateOpportunities.length > 0 
        ? `Also, you're missing affiliate links for ${affiliateOpportunities.slice(0, 3).map(o => o.product).join(', ')}.`
        : '')
    );
  }
  
  // Check if internal links are missing and affiliate opportunities exist
  const internalLinksMissing = auditResult.criticalIssues.some(c => c.id === 'seo-internal-links-missing');
  if (internalLinksMissing && affiliateOpportunities.length > 0) {
    insights.push(
      `Add internal links to improve SEO. Consider linking to related content about ${affiliateOpportunities.slice(0, 2).map(o => o.product).join(' and ')}.`
    );
  }
  
  // Check if FAQ is missing and affiliate opportunities exist
  const faqMissing = auditResult.criticalIssues.some(c => c.id === 'aeo-faq-missing');
  if (faqMissing && affiliateOpportunities.length > 0) {
    insights.push(
      `Add an FAQ section to improve AEO. Include questions like "What is the best ${affiliateOpportunities[0]?.product}?" to target answer boxes.`
    );
  }
  
  return insights;
}

