// TypeScript types for SEO/AEO content audit

export type AuditSeverity = 'critical' | 'warning' | 'info';

export interface AuditCheck {
  id: string;
  name: string;
  category: 'seo' | 'aeo';
  tier: 1 | 2;
  passed: boolean;
  severity: AuditSeverity;
  issue?: string;
  recommendation?: string;
  example?: string;
  impact?: {
    seo?: string;
    aeo?: string;
  };
}

export interface StructuredContent {
  titleTag: string | null;
  titleTagLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1Count: number;
  h1Text: string | null;
  h2Count: number;
  h3Count: number;
  h4Count: number;
  h5Count: number;
  h6Count: number;
  headers: Array<{ level: number; text: string }>;
  images: Array<{ src: string; alt: string | null; hasAlt: boolean }>;
  imagesWithoutAlt: number;
  internalLinks: Array<{ url: string; anchorText: string }>;
  internalLinkCount: number;
  externalLinks: Array<{ url: string; anchorText: string }>;
  externalLinkCount: number;
  paragraphs: Array<{ text: string; wordCount: number }>;
  lists: Array<{ type: 'ul' | 'ol'; itemCount: number }>;
  tables: number;
  faqSections: Array<{ questions: string[]; formattedWithHeaders: boolean }>;
  firstSentence: string | null;
  first100Words: string;
  primaryKeyword: string | null;
  primaryKeywordInferred: boolean;
  urlSlug: string;
  wordCount: number;
  contentStructure: {
    hasBullets: boolean;
    hasNumberedLists: boolean;
    hasTables: boolean;
    hasFaq: boolean;
  };
}

export interface AuditResult {
  score: number; // 0-100
  tier1Passed: number;
  tier1Total: number;
  tier2Passed: number;
  tier2Total: number;
  criticalIssues: AuditCheck[];
  warnings: AuditCheck[];
  optimizations: AuditCheck[];
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'seo' | 'aeo' | 'both';
    issue: string;
    fix: string;
    example?: string;
  }>;
  checks: AuditCheck[];
  analyzedAt: string;
}

export interface ContentAuditOptions {
  enabled?: boolean;
  skipBrokenLinkCheck?: boolean; // For performance, can skip expensive checks
  customKeyword?: string; // Override keyword inference
}




