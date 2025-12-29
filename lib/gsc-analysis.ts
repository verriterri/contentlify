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
 * 1. Low-Hanging Fruit: High impressions but low CTR
 * These are pages showing up in search but not getting clicks
 */
export function findLowHangingFruit(queries: GSCRow[]): AnalysisResult {
  const opportunities = queries
    .filter(q => q.impressions >= 100 && q.ctr < 0.02) // More than 100 impressions, less than 2% CTR
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
        issue: `CTR is ${(q.ctr * 100).toFixed(1)}% but should be ~${(expectedCTR * 100).toFixed(1)}% for position ${Math.round(q.position)}`,
        recommendation: 'Improve your title tag and meta description to make them more compelling',
        potentialGain: `+${potentialClicks} clicks/month with better CTR`,
      };
    });

  return {
    type: 'low_hanging_fruit',
    title: 'Low-Hanging Fruit 🍎',
    description: 'High visibility but low clicks - quick wins with better titles and descriptions',
    impact: opportunities.length > 0 ? 'high' : 'low',
    items: opportunities,
  };
}

/**
 * 2. Almost There: Ranking 4-10 (bottom of page 1)
 * Small improvements could move these to top 3
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
        issue: `Ranking at position ${Math.round(q.position)} - so close to top 3!`,
        recommendation: 'Improve content quality, add more depth, update with fresh information',
        potentialGain: `Could gain +${potentialClicks} clicks/month by reaching top 3`,
      };
    });

  return {
    type: 'almost_there',
    title: 'Almost There 🎯',
    description: 'Bottom of page 1 - small improvements could yield big traffic gains',
    impact: opportunities.length > 0 ? 'high' : 'low',
    items: opportunities,
  };
}

/**
 * 3. Click Deserts: Ranking but getting almost no clicks
 */
export function findClickDeserts(queries: GSCRow[]): AnalysisResult {
  const opportunities = queries
    .filter(q => q.position <= 20 && q.impressions >= 50 && q.clicks < 5)
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
        issue: `Ranking at position ${Math.round(q.position)} but only ${q.clicks} clicks from ${q.impressions} impressions`,
        recommendation: 'Your title/description may not match search intent. Review and rewrite to be more compelling.',
        potentialGain: `Should be getting ~${expectedClicks} clicks/month`,
      };
    });

  return {
    type: 'click_deserts',
    title: 'Click Deserts 🏜️',
    description: 'Ranking but not getting clicks - major CTR optimization opportunity',
    impact: opportunities.length > 0 ? 'medium' : 'low',
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
 * 5. CTR Underperformers: CTR significantly below expected for position
 */
export function findCTRUnderperformers(queries: GSCRow[]): AnalysisResult {
  const opportunities = queries
    .filter(q => {
      const expectedCTR = getExpectedCTR(q.position);
      const ctrGap = expectedCTR - q.ctr;
      return q.impressions >= 100 && ctrGap > 0.05; // 5% gap
    })
    .sort((a, b) => {
      const gapA = getExpectedCTR(a.position) - a.ctr;
      const gapB = getExpectedCTR(b.position) - b.ctr;
      return (b.impressions * gapB) - (a.impressions * gapA); // Sort by potential impact
    })
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
        issue: `CTR is ${(q.ctr * 100).toFixed(1)}% vs expected ${(expectedCTR * 100).toFixed(1)}% for position ${Math.round(q.position)}`,
        recommendation: 'Your search result isn\'t compelling enough. Test new titles and descriptions.',
        potentialGain: `+${potentialClicks} potential clicks/month`,
      };
    });

  return {
    type: 'ctr_underperformers',
    title: 'CTR Underperformers 📉',
    description: 'Getting impressions but CTR is below benchmark for your rankings',
    impact: opportunities.length > 0 ? 'high' : 'low',
    items: opportunities,
  };
}

/**
 * 6. Top Opportunities Summary
 */
export function getTopOpportunities(queries: GSCRow[]): AnalysisItem[] {
  const allOpportunities: AnalysisItem[] = [];

  // Combine all analyses
  const analyses = [
    findLowHangingFruit(queries),
    findAlmostThere(queries),
    findClickDeserts(queries),
    findCTRUnderperformers(queries),
  ];

  analyses.forEach(analysis => {
    allOpportunities.push(...analysis.items);
  });

  // Calculate potential impact and sort
  const scored = allOpportunities.map(item => {
    // Simple scoring: impressions × CTR gap
    const expectedCTR = getExpectedCTR(item.position);
    const ctrGap = Math.max(0, expectedCTR - item.ctr);
    const score = item.impressions * ctrGap;

    return { ...item, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/**
 * Main analysis function
 */
export function analyzeGSCData(queries: GSCRow[], pages: GSCRow[]) {
  return {
    lowHangingFruit: findLowHangingFruit(queries),
    almostThere: findAlmostThere(queries),
    clickDeserts: findClickDeserts(queries),
    lowVolumeWins: findLowVolumeWins(queries),
    ctrUnderperformers: findCTRUnderperformers(queries),
    topOpportunities: getTopOpportunities(queries),
    summary: {
      totalQueries: queries.length,
      totalPages: pages.length,
      avgCTR: queries.reduce((sum, q) => sum + q.ctr, 0) / queries.length,
      avgPosition: queries.reduce((sum, q) => sum + q.position, 0) / queries.length,
    },
  };
}
