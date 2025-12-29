/**
 * Time-Series Trend Analysis for GSC Data
 * Detects patterns, anomalies, and traffic changes over time
 */

interface DailyMetric {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface TrendAlert {
  type: 'cliff_drop' | 'cliff_spike' | 'gradual_decline' | 'gradual_improvement' | 'recovery' | 'anomaly';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  startDate?: string;
  percentChange?: number;
  metric: 'clicks' | 'impressions' | 'ctr' | 'position';
}

interface PeriodComparison {
  metric: string;
  current: number;
  previous: number;
  change: number;
  percentChange: number;
  trend: 'up' | 'down' | 'stable';
}

interface TrendAnalysisResult {
  alerts: TrendAlert[];
  weekOverWeek: PeriodComparison[];
  monthOverMonth: PeriodComparison[];
  overallTrend: {
    direction: 'improving' | 'declining' | 'stable';
    strength: 'strong' | 'moderate' | 'weak';
  };
  dailyData: DailyMetric[];
}

/**
 * Detect sudden traffic cliffs (drops or spikes)
 */
function detectTrafficCliffs(dailyData: DailyMetric[]): TrendAlert[] {
  const alerts: TrendAlert[] = [];

  if (dailyData.length < 14) return alerts; // Need at least 2 weeks

  // Calculate 7-day rolling averages
  for (let i = 14; i < dailyData.length; i++) {
    const previousWeek = dailyData.slice(i - 14, i - 7);
    const currentWeek = dailyData.slice(i - 7, i);

    const prevAvgClicks = previousWeek.reduce((sum, d) => sum + d.clicks, 0) / 7;
    const currAvgClicks = currentWeek.reduce((sum, d) => sum + d.clicks, 0) / 7;

    const prevAvgImpressions = previousWeek.reduce((sum, d) => sum + d.impressions, 0) / 7;
    const currAvgImpressions = currentWeek.reduce((sum, d) => sum + d.impressions, 0) / 7;

    // Detect cliff drop in clicks (>30% drop)
    if (prevAvgClicks > 10 && currAvgClicks < prevAvgClicks * 0.7) {
      const percentDrop = ((prevAvgClicks - currAvgClicks) / prevAvgClicks) * 100;
      alerts.push({
        type: 'cliff_drop',
        severity: percentDrop > 50 ? 'critical' : 'warning',
        title: `Traffic Cliff Detected`,
        description: `Clicks dropped ${percentDrop.toFixed(0)}% starting ${currentWeek[0].date}`,
        startDate: currentWeek[0].date,
        percentChange: -percentDrop,
        metric: 'clicks',
      });
    }

    // Detect cliff drop in impressions (>40% drop)
    if (prevAvgImpressions > 100 && currAvgImpressions < prevAvgImpressions * 0.6) {
      const percentDrop = ((prevAvgImpressions - currAvgImpressions) / prevAvgImpressions) * 100;
      alerts.push({
        type: 'cliff_drop',
        severity: percentDrop > 60 ? 'critical' : 'warning',
        title: `Impressions Cliff Detected`,
        description: `Impressions dropped ${percentDrop.toFixed(0)}% starting ${currentWeek[0].date}`,
        startDate: currentWeek[0].date,
        percentChange: -percentDrop,
        metric: 'impressions',
      });
    }

    // Detect sudden spike (>50% increase)
    if (prevAvgClicks > 10 && currAvgClicks > prevAvgClicks * 1.5) {
      const percentIncrease = ((currAvgClicks - prevAvgClicks) / prevAvgClicks) * 100;
      alerts.push({
        type: 'cliff_spike',
        severity: 'info',
        title: `Traffic Spike Detected`,
        description: `Clicks increased ${percentIncrease.toFixed(0)}% starting ${currentWeek[0].date}`,
        startDate: currentWeek[0].date,
        percentChange: percentIncrease,
        metric: 'clicks',
      });
    }
  }

  // Deduplicate alerts (keep the most severe/recent)
  const uniqueAlerts = alerts.reduce((acc, alert) => {
    const existing = acc.find(a => a.type === alert.type && a.metric === alert.metric);
    if (!existing || (alert.severity === 'critical' && existing.severity !== 'critical')) {
      return [...acc.filter(a => !(a.type === alert.type && a.metric === alert.metric)), alert];
    }
    return acc;
  }, [] as TrendAlert[]);

  return uniqueAlerts;
}

/**
 * Detect gradual trends (improving or declining)
 */
function detectGradualTrends(dailyData: DailyMetric[]): TrendAlert[] {
  const alerts: TrendAlert[] = [];

  if (dailyData.length < 30) return alerts; // Need at least 30 days

  // Compare first 30 days vs last 30 days
  const firstMonth = dailyData.slice(0, 30);
  const lastMonth = dailyData.slice(-30);

  const firstMonthAvgClicks = firstMonth.reduce((sum, d) => sum + d.clicks, 0) / 30;
  const lastMonthAvgClicks = lastMonth.reduce((sum, d) => sum + d.clicks, 0) / 30;

  const clicksChange = ((lastMonthAvgClicks - firstMonthAvgClicks) / firstMonthAvgClicks) * 100;

  // Gradual decline (15-30% drop over time)
  if (firstMonthAvgClicks > 10 && clicksChange < -15 && clicksChange > -30) {
    alerts.push({
      type: 'gradual_decline',
      severity: 'warning',
      title: `Gradual Traffic Decline`,
      description: `Clicks trending down ${Math.abs(clicksChange).toFixed(0)}% over the last 30 days`,
      percentChange: clicksChange,
      metric: 'clicks',
    });
  }

  // Gradual improvement (>15% increase over time)
  if (firstMonthAvgClicks > 10 && clicksChange > 15) {
    alerts.push({
      type: 'gradual_improvement',
      severity: 'info',
      title: `Gradual Traffic Improvement`,
      description: `Clicks trending up ${clicksChange.toFixed(0)}% over the last 30 days`,
      percentChange: clicksChange,
      metric: 'clicks',
    });
  }

  return alerts;
}

/**
 * Detect if traffic is recovering from a previous drop
 */
function detectRecovery(dailyData: DailyMetric[]): TrendAlert[] {
  const alerts: TrendAlert[] = [];

  if (dailyData.length < 21) return alerts; // Need at least 3 weeks

  // Look for pattern: drop followed by recovery
  const firstWeek = dailyData.slice(0, 7);
  const middleWeek = dailyData.slice(Math.floor(dailyData.length / 2) - 3, Math.floor(dailyData.length / 2) + 4);
  const lastWeek = dailyData.slice(-7);

  const firstWeekAvg = firstWeek.reduce((sum, d) => sum + d.clicks, 0) / 7;
  const middleWeekAvg = middleWeek.reduce((sum, d) => sum + d.clicks, 0) / 7;
  const lastWeekAvg = lastWeek.reduce((sum, d) => sum + d.clicks, 0) / 7;

  // If middle was significantly lower than first, and last is recovering
  if (firstWeekAvg > 10 && middleWeekAvg < firstWeekAvg * 0.8 && lastWeekAvg > middleWeekAvg * 1.2) {
    const recoveryPercent = ((lastWeekAvg - middleWeekAvg) / middleWeekAvg) * 100;
    alerts.push({
      type: 'recovery',
      severity: 'info',
      title: `Traffic Recovery Detected`,
      description: `Clicks recovering ${recoveryPercent.toFixed(0)}% from previous low`,
      percentChange: recoveryPercent,
      metric: 'clicks',
    });
  }

  return alerts;
}

/**
 * Compare time periods (week-over-week, month-over-month)
 */
function compareTimePeriods(dailyData: DailyMetric[]): {
  weekOverWeek: PeriodComparison[];
  monthOverMonth: PeriodComparison[];
} {
  const weekOverWeek: PeriodComparison[] = [];
  const monthOverMonth: PeriodComparison[] = [];

  if (dailyData.length < 14) {
    return { weekOverWeek, monthOverMonth };
  }

  // Week-over-week (last 7 days vs previous 7 days)
  const lastWeek = dailyData.slice(-7);
  const previousWeek = dailyData.slice(-14, -7);

  const metrics = ['clicks', 'impressions', 'ctr', 'position'] as const;

  metrics.forEach(metric => {
    const lastWeekAvg = lastWeek.reduce((sum, d) => sum + d[metric], 0) / 7;
    const previousWeekAvg = previousWeek.reduce((sum, d) => sum + d[metric], 0) / 7;
    const change = lastWeekAvg - previousWeekAvg;
    const percentChange = previousWeekAvg > 0 ? (change / previousWeekAvg) * 100 : 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(percentChange) > 5) {
      trend = percentChange > 0 ? 'up' : 'down';
      // Note: For position, lower is better, so invert the trend
      if (metric === 'position') {
        trend = trend === 'up' ? 'down' : 'up';
      }
    }

    weekOverWeek.push({
      metric: metric.charAt(0).toUpperCase() + metric.slice(1),
      current: lastWeekAvg,
      previous: previousWeekAvg,
      change,
      percentChange,
      trend,
    });
  });

  // Month-over-month (last 30 days vs previous 30 days)
  if (dailyData.length >= 60) {
    const lastMonth = dailyData.slice(-30);
    const previousMonth = dailyData.slice(-60, -30);

    metrics.forEach(metric => {
      const lastMonthAvg = lastMonth.reduce((sum, d) => sum + d[metric], 0) / 30;
      const previousMonthAvg = previousMonth.reduce((sum, d) => sum + d[metric], 0) / 30;
      const change = lastMonthAvg - previousMonthAvg;
      const percentChange = previousMonthAvg > 0 ? (change / previousMonthAvg) * 100 : 0;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(percentChange) > 5) {
        trend = percentChange > 0 ? 'up' : 'down';
        if (metric === 'position') {
          trend = trend === 'up' ? 'down' : 'up';
        }
      }

      monthOverMonth.push({
        metric: metric.charAt(0).toUpperCase() + metric.slice(1),
        current: lastMonthAvg,
        previous: previousMonthAvg,
        change,
        percentChange,
        trend,
      });
    });
  }

  return { weekOverWeek, monthOverMonth };
}

/**
 * Calculate overall trend direction and strength
 */
function calculateOverallTrend(dailyData: DailyMetric[]): {
  direction: 'improving' | 'declining' | 'stable';
  strength: 'strong' | 'moderate' | 'weak';
} {
  if (dailyData.length < 14) {
    return { direction: 'stable', strength: 'weak' };
  }

  // Compare first third vs last third
  const chunkSize = Math.floor(dailyData.length / 3);
  const firstChunk = dailyData.slice(0, chunkSize);
  const lastChunk = dailyData.slice(-chunkSize);

  const firstAvg = firstChunk.reduce((sum, d) => sum + d.clicks, 0) / chunkSize;
  const lastAvg = lastChunk.reduce((sum, d) => sum + d.clicks, 0) / chunkSize;

  const percentChange = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

  let direction: 'improving' | 'declining' | 'stable' = 'stable';
  let strength: 'strong' | 'moderate' | 'weak' = 'weak';

  if (Math.abs(percentChange) > 25) {
    strength = 'strong';
  } else if (Math.abs(percentChange) > 10) {
    strength = 'moderate';
  }

  if (percentChange > 5) {
    direction = 'improving';
  } else if (percentChange < -5) {
    direction = 'declining';
  }

  return { direction, strength };
}

/**
 * Main function: Analyze time-series data for trends and anomalies
 */
export function analyzeTimeSeriesData(dailyData: DailyMetric[]): TrendAnalysisResult {
  const cliffAlerts = detectTrafficCliffs(dailyData);
  const gradualAlerts = detectGradualTrends(dailyData);
  const recoveryAlerts = detectRecovery(dailyData);

  const alerts = [...cliffAlerts, ...gradualAlerts, ...recoveryAlerts];

  // Sort alerts by severity (critical first)
  alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const { weekOverWeek, monthOverMonth } = compareTimePeriods(dailyData);
  const overallTrend = calculateOverallTrend(dailyData);

  return {
    alerts,
    weekOverWeek,
    monthOverMonth,
    overallTrend,
    dailyData,
  };
}
