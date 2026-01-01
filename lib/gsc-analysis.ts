/**
 * Programmatic GSC Data Analysis
 * Extracts actionable insights from Google Search Console data
 */

interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface AnalysisResult {
  type: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  items: AnalysisItem[];
}

interface AnalysisItem {
  query?: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  issue: string;
  recommendation: string;
  potentialGain?: string;
}

/**
 * Expected CTR by position (industry benchmarks)
 */
const EXPECTED_CTR_BY_POSITION: { [key: number]: number } = {
  1: 0.28,  // 28%
  2: 0.15,  // 15%
  3: 0.10,  // 10%
  4: 0.07,  // 7%
  5: 0.05,  // 5%
  6: 0.04,  // 4%
  7: 0.03,  // 3%
  8: 0.025, // 2.5%
  9: 0.02,  // 2%
  10: 0.015, // 1.5%
};

/**
 * Get expected CTR for a given position
 */
function getExpectedCTR(position: number): number {
  const roundedPosition = Math.round(position);
  if (roundedPosition <= 10) {
    return EXPECTED_CTR_BY_POSITION[roundedPosition] || 0.01;
  }
  // For positions beyond 10, use declining rate
  return Math.max(0.005, 0.01 / (roundedPosition - 9));
}

/**
 * ACTION 1: Optimize Title & Meta Description
 * Queries where CTR is significantly below expected - indicates poor title/meta
 */
export function findLowHangingFruit(queries: GSCRow[]): AnalysisResult {
  const opportunities = queries
    .filter(q => {
      const expectedCTR = getExpectedCTR(q.position);
      const ctrGap = expectedCTR - q.ctr;
      // CTR is at least 50% below expected AND has decent impressions
      return q.impressions >= 50 && ctrGap > (expectedCTR * 0.5);
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(q => {
      const expectedCTR = getExpectedCTR(q.position);
      const ctrGap = expectedCTR - q.ctr;
      const potentialClicks = Math.round(q.impressions * ctrGap);

      return {
        query: q.keys[0],
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: q.ctr,
        position: q.position,
        issue: `Low click-through rate: ${(q.ctr * 100).toFixed(1)}% (expected ~${(expectedCTR * 100).toFixed(1)}%)`,
        recommendation: 'Rewrite title tag to be more compelling and include the search phrase naturally. Update meta description to clearly answer the search intent.',
        potentialGain: `+${potentialClicks} clicks/month`,
      };
    });

  return {
    type: 'optimize_title_meta',
    title: 'Optimize Title & Meta Description 📝',
    description: 'Rewrite titles and descriptions to improve click-through rates',
    impact: opportunities.length > 0 ? 'high' : 'low',
    items: opportunities,
  };
}

/**
 * ACTION 2: Improve Content Depth & Quality
 * Queries ranking 4-10 - need better content to reach top 3
 */
export function findAlmostThere(queries: GSCRow[]): AnalysisResult {
  const opportunities = queries
    .filter(q => q.position >= 4 && q.position <= 10 && q.impressions >= 50)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(q => {
      const topThreeCTR = 0.18; // Average CTR for positions 1-3
      const potentialClicks = Math.round(q.impressions * (topThreeCTR - q.ctr));

      return {
        query: q.keys[0],
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: q.ctr,
        position: q.position,
        issue: `Ranking position ${Math.round(q.position)} - needs content boost to reach top 3`,
        recommendation: 'Expand content with more comprehensive information, add FAQ section, improve internal links from related pages, and ensure content fully addresses user questions.',
        potentialGain: `+${potentialClicks} clicks/month if reaching top 3`,
      };
    });

  return {
    type: 'improve_content',
    title: 'Improve Content Depth & Quality 📚',
    description: 'Expand and enhance content to move from bottom of page 1 to top 3',
    impact: opportunities.length > 0 ? 'high' : 'low',
    items: opportunities,
  };
}

/**
 * ACTION 3: Fix Search Intent Mismatch
 * High impressions but very low clicks - content doesn't match what users want
 */
export function findClickDeserts(queries: GSCRow[]): AnalysisResult {
  const opportunities = queries
    .filter(q => {
      // High impressions but extremely low absolute clicks suggests content mismatch
      return q.impressions >= 100 && q.clicks < 5;
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(q => {
      const expectedClicks = Math.round(q.impressions * getExpectedCTR(q.position));

      return {
        query: q.keys[0],
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: q.ctr,
        position: q.position,
        issue: `${q.impressions} impressions but only ${q.clicks} clicks - content may not match search intent`,
        recommendation: 'Analyze what users actually want when they search this phrase. Rewrite your content to directly address their specific need or question. Consider the search intent type (informational, navigational, transactional).',
        potentialGain: `+${expectedClicks - q.clicks} clicks/month with better intent match`,
      };
    });

  return {
    type: 'fix_search_intent',
    title: 'Fix Search Intent Mismatch 🎯',
    description: 'Content doesn\'t match what searchers are looking for - needs rewrite',
    impact: opportunities.length > 0 ? 'high' : 'low',
    items: opportunities,
  };
}

/**
 * 4. High Position, Low Volume: Ranking well but for low-traffic terms
 */
export function findLowVolumeWins(queries: GSCRow[]): AnalysisResult {
  const opportunities = queries
    .filter(q => q.position <= 5 && q.impressions < 20)
    .sort((a, b) => a.position - b.position)
    .slice(0, 10)
    .map(q => {
      return {
        query: q.keys[0],
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: q.ctr,
        position: q.position,
        issue: `Ranking #${Math.round(q.position)} but only ${q.impressions} impressions/month`,
        recommendation: 'Consider if this is the right keyword to target. Might want to optimize for higher-volume related terms.',
      };
    });

  return {
    type: 'low_volume_wins',
    title: 'Low Volume Keywords 🔍',
    description: 'Ranking well but for low-traffic terms - consider targeting better keywords',
    impact: opportunities.length > 0 ? 'medium' : 'low',
    items: opportunities,
  };
}

/**
 * ACTION 4: Build Authority & Backlinks
 * Ranking beyond page 1 but has potential - needs authority boost
 */
export function findCTRUnderperformers(queries: GSCRow[]): AnalysisResult {
  const opportunities = queries
    .filter(q => {
      // Position > 10 (beyond page 1) with decent impressions
      return q.position > 10 && q.position <= 30 && q.impressions >= 50;
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(q => {
      const page1CTR = 0.10; // Average CTR for page 1
      const potentialClicks = Math.round(q.impressions * (page1CTR - q.ctr));

      return {
        query: q.keys[0],
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: q.ctr,
        position: q.position,
        issue: `Ranking position ${Math.round(q.position)} - needs authority signals to reach page 1`,
        recommendation: 'Build high-quality backlinks from relevant sites, improve internal linking structure, add original research or data, and establish topical authority.',
        potentialGain: `+${potentialClicks} clicks/month if reaching page 1`,
      };
    });

  return {
    type: 'build_authority',
    title: 'Build Authority & Backlinks 🔗',
    description: 'Beyond page 1 - needs backlinks and authority signals to climb rankings',
    impact: opportunities.length > 0 ? 'medium' : 'low',
    items: opportunities,
  };
}

/**
 * 6. Top Opportunities Summary
 */
export function getTopOpportunities(queries: GSCRow[]): any[] {
  const analyses = [
    { category: 'Optimize Title & Meta', analysis: findLowHangingFruit(queries) },
    { category: 'Improve Content Depth', analysis: findAlmostThere(queries) },
    { category: 'Fix Search Intent', analysis: findClickDeserts(queries) },
    { category: 'Build Authority', analysis: findCTRUnderperformers(queries) },
  ];

  // Group issues by search query
  const queryIssuesMap = new Map<string, {
    query: string;
    position: number;
    impressions: number;
    ctr: number;
    clicks: number;
    issues: Array<{
      category: string;
      issue: string;
      recommendation: string;
      potentialGain?: string;
    }>;
    totalScore: number;
  }>();

  analyses.forEach(({ category, analysis }) => {
    analysis.items.forEach((item: any) => {
      const query = item.query;

      if (!queryIssuesMap.has(query)) {
        // Calculate score for prioritization
        const expectedCTR = getExpectedCTR(item.position);
        const ctrGap = Math.max(0, expectedCTR - item.ctr);
        const score = item.impressions * ctrGap;

        queryIssuesMap.set(query, {
          query: item.query,
          position: item.position,
          impressions: item.impressions,
          ctr: item.ctr,
          clicks: item.clicks,
          issues: [],
          totalScore: score,
        });
      }

      // Add this issue to the query's issues list
      const queryData = queryIssuesMap.get(query)!;
      queryData.issues.push({
        category,
        issue: item.issue,
        recommendation: item.recommendation,
        potentialGain: item.potentialGain,
      });
    });
  });

  // Convert map to array and sort by total score
  const topQueries = Array.from(queryIssuesMap.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);

  return topQueries;
}

/**
 * PAGE-LEVEL ANALYSIS FUNCTIONS
 * Analyze which URLs/pages need optimization
 */

/**
 * Page ACTION 1: Optimize Title & Meta Description
 */
export function findPageLowHangingFruit(pages: GSCRow[]): AnalysisResult {
  const opportunities = pages
    .filter(p => {
      const expectedCTR = getExpectedCTR(p.position);
      const ctrGap = expectedCTR - p.ctr;
      return p.impressions >= 50 && ctrGap > (expectedCTR * 0.5);
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(p => {
      const expectedCTR = getExpectedCTR(p.position);
      const ctrGap = expectedCTR - p.ctr;
      const potentialClicks = Math.round(p.impressions * ctrGap);

      return {
        page: p.keys[0],
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: p.ctr,
        position: p.position,
        issue: `Low click-through rate: ${(p.ctr * 100).toFixed(1)}% (expected ~${(expectedCTR * 100).toFixed(1)}%)`,
        recommendation: 'Rewrite page title to be more compelling. Update meta description to clearly answer search intent. Optimize H1 heading.',
        potentialGain: `+${potentialClicks} clicks/month`,
      };
    });

  return {
    type: 'page_optimize_title_meta',
    title: 'Optimize Title & Meta Description 📝',
    description: 'Rewrite titles and descriptions to improve click-through rates',
    impact: opportunities.length > 0 ? 'high' : 'low',
    items: opportunities,
  };
}

/**
 * Page ACTION 2: Improve Content Depth & Quality
 */
export function findPageAlmostThere(pages: GSCRow[]): AnalysisResult {
  const opportunities = pages
    .filter(p => p.position >= 4 && p.position <= 10 && p.impressions >= 50)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(p => {
      const topThreeCTR = 0.18;
      const potentialClicks = Math.round(p.impressions * (topThreeCTR - p.ctr));

      return {
        page: p.keys[0],
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: p.ctr,
        position: p.position,
        issue: `Ranking position ${Math.round(p.position)} - needs content boost to reach top 3`,
        recommendation: 'Expand content with more comprehensive information, add FAQ section, improve internal links from related pages, and ensure content fully addresses user questions.',
        potentialGain: `+${potentialClicks} clicks/month if reaching top 3`,
      };
    });

  return {
    type: 'page_improve_content',
    title: 'Improve Content Depth & Quality 📚',
    description: 'Expand and enhance content to move from bottom of page 1 to top 3',
    impact: opportunities.length > 0 ? 'high' : 'low',
    items: opportunities,
  };
}

/**
 * Page ACTION 3: Fix Search Intent Mismatch
 */
export function findPageClickDeserts(pages: GSCRow[]): AnalysisResult {
  const opportunities = pages
    .filter(p => p.impressions >= 100 && p.clicks < 5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(p => {
      const expectedClicks = Math.round(p.impressions * getExpectedCTR(p.position));

      return {
        page: p.keys[0],
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: p.ctr,
        position: p.position,
        issue: `${p.impressions} impressions but only ${p.clicks} clicks - content may not match search intent`,
        recommendation: 'Analyze what users actually want when they land on this page. Rewrite content to directly address their specific need or question. Consider the search intent type (informational, navigational, transactional).',
        potentialGain: `+${expectedClicks - p.clicks} clicks/month with better intent match`,
      };
    });

  return {
    type: 'page_fix_search_intent',
    title: 'Fix Search Intent Mismatch 🎯',
    description: 'Content doesn\'t match what searchers are looking for - needs rewrite',
    impact: opportunities.length > 0 ? 'high' : 'low',
    items: opportunities,
  };
}

/**
 * Page ACTION 4: Build Authority & Backlinks
 */
export function findPageCTRUnderperformers(pages: GSCRow[]): AnalysisResult {
  const opportunities = pages
    .filter(p => {
      return p.position > 10 && p.position <= 30 && p.impressions >= 50;
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(p => {
      const page1CTR = 0.10;
      const potentialClicks = Math.round(p.impressions * (page1CTR - p.ctr));

      return {
        page: p.keys[0],
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: p.ctr,
        position: p.position,
        issue: `Ranking position ${Math.round(p.position)} - needs authority signals to reach page 1`,
        recommendation: 'Build high-quality backlinks from relevant sites, improve internal linking structure, add original research or data, and establish topical authority.',
        potentialGain: `+${potentialClicks} clicks/month if reaching page 1`,
      };
    });

  return {
    type: 'page_build_authority',
    title: 'Build Authority & Backlinks 🔗',
    description: 'Beyond page 1 - needs backlinks and authority signals to climb rankings',
    impact: opportunities.length > 0 ? 'medium' : 'low',
    items: opportunities,
  };
}

/**
 * Top Page Opportunities - Groups all issues by page
 */
export function getTopPageOpportunities(pages: GSCRow[]): any[] {
  const analyses = [
    { category: 'Optimize Title & Meta', analysis: findPageLowHangingFruit(pages) },
    { category: 'Improve Content Depth', analysis: findPageAlmostThere(pages) },
    { category: 'Fix Search Intent', analysis: findPageClickDeserts(pages) },
    { category: 'Build Authority', analysis: findPageCTRUnderperformers(pages) },
  ];

  // Group issues by page URL
  const pageIssuesMap = new Map<string, {
    page: string;
    position: number;
    impressions: number;
    ctr: number;
    clicks: number;
    issues: Array<{
      category: string;
      issue: string;
      recommendation: string;
      potentialGain?: string;
    }>;
    totalScore: number;
  }>();

  analyses.forEach(({ category, analysis }) => {
    analysis.items.forEach((item: any) => {
      const pageUrl = item.page;

      if (!pageIssuesMap.has(pageUrl)) {
        // Calculate score for prioritization
        const expectedCTR = getExpectedCTR(item.position);
        const ctrGap = Math.max(0, expectedCTR - item.ctr);
        const score = item.impressions * ctrGap;

        pageIssuesMap.set(pageUrl, {
          page: item.page,
          position: item.position,
          impressions: item.impressions,
          ctr: item.ctr,
          clicks: item.clicks,
          issues: [],
          totalScore: score,
        });
      }

      // Add this issue to the page's issues list
      const pageData = pageIssuesMap.get(pageUrl)!;
      pageData.issues.push({
        category,
        issue: item.issue,
        recommendation: item.recommendation,
        potentialGain: item.potentialGain,
      });
    });
  });

  // Convert map to array and sort by total score
  const topPages = Array.from(pageIssuesMap.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);

  return topPages;
}

/**
 * Main analysis function
 */
export function analyzeGSCData(queries: GSCRow[], pages: GSCRow[]) {
  // Query-level analysis (existing logic)
  const queryAnalysis = {
    lowHangingFruit: findLowHangingFruit(queries),
    almostThere: findAlmostThere(queries),
    clickDeserts: findClickDeserts(queries),
    lowVolumeWins: findLowVolumeWins(queries),
    ctrUnderperformers: findCTRUnderperformers(queries),
    topOpportunities: getTopOpportunities(queries),
  };

  // Page-level analysis with deduplication
  // Build all categories first
  const allPageCategories = {
    pageLowHangingFruit: findPageLowHangingFruit(pages),
    pageAlmostThere: findPageAlmostThere(pages),
    pageClickDeserts: findPageClickDeserts(pages),
    pageCTRUnderperformers: findPageCTRUnderperformers(pages),
  };

  // Get top opportunities (already deduplicated internally)
  const topPageOpportunities = getTopPageOpportunities(pages);
  const topPageUrls = new Set(topPageOpportunities.map((item: any) => item.page));

  // Deduplicate each category: remove pages that appear in higher-priority categories
  const seenPages = new Set<string>(topPageUrls);

  // Priority order: lowHangingFruit > almostThere > clickDeserts > ctrUnderperformers
  const deduplicatedPages = {
    topPageOpportunities,
    pageLowHangingFruit: {
      ...allPageCategories.pageLowHangingFruit,
      items: allPageCategories.pageLowHangingFruit.items.filter((item: any) => {
        if (seenPages.has(item.page)) return false;
        seenPages.add(item.page);
        return true;
      }),
    },
    pageAlmostThere: {
      ...allPageCategories.pageAlmostThere,
      items: allPageCategories.pageAlmostThere.items.filter((item: any) => {
        if (seenPages.has(item.page)) return false;
        seenPages.add(item.page);
        return true;
      }),
    },
    pageClickDeserts: {
      ...allPageCategories.pageClickDeserts,
      items: allPageCategories.pageClickDeserts.items.filter((item: any) => {
        if (seenPages.has(item.page)) return false;
        seenPages.add(item.page);
        return true;
      }),
    },
    pageCTRUnderperformers: {
      ...allPageCategories.pageCTRUnderperformers,
      items: allPageCategories.pageCTRUnderperformers.items.filter((item: any) => {
        if (seenPages.has(item.page)) return false;
        seenPages.add(item.page);
        return true;
      }),
    },
  };

  return {
    ...queryAnalysis,
    ...deduplicatedPages,
    summary: {
      totalQueries: queries.length,
      totalPages: pages.length,
      avgCTR: queries.reduce((sum, q) => sum + q.ctr, 0) / queries.length,
      avgPosition: queries.reduce((sum, q) => sum + q.position, 0) / queries.length,
    },
  };
}
