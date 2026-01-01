'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';

interface GSCDashboardProps {
  hasUnusedReport: boolean;
  isConnected: boolean;
  googleEmail?: string;
  reportStatus?: {
    totalPurchased: number;
    reportsGenerated: number;
    reportsAvailable: number;
  };
}

interface GSCProperty {
  siteUrl: string;
  permissionLevel: string;
}

interface GSCData {
  queries: any[];
  pages: any[];
  summary: {
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    avgPosition: number;
  };
}

interface AnalysisData {
  // Query-level analysis
  lowHangingFruit: any;
  almostThere: any;
  clickDeserts: any;
  lowVolumeWins: any;
  ctrUnderperformers: any;
  topOpportunities: any[];

  // Page-level analysis
  pageLowHangingFruit: any;
  pageAlmostThere: any;
  pageClickDeserts: any;
  pageCTRUnderperformers: any;
  topPageOpportunities: any[];

  summary: any;
}

interface TrendAlert {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  startDate?: string;
  percentChange?: number;
  metric: string;
}

interface PeriodComparison {
  metric: string;
  current: number;
  previous: number;
  change: number;
  percentChange: number;
  trend: 'up' | 'down' | 'stable';
}

interface TrendAnalysisData {
  alerts: TrendAlert[];
  weekOverWeek: PeriodComparison[];
  monthOverMonth: PeriodComparison[];
  overallTrend: {
    direction: 'improving' | 'declining' | 'stable';
    strength: 'strong' | 'moderate' | 'weak';
  };
  dailyData: Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

export function GSCDashboard({ hasUnusedReport, isConnected, googleEmail, reportStatus }: GSCDashboardProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<GSCProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [gscData, setGscData] = useState<GSCData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysisData | null>(null);

  // Handle OAuth callback success
  useEffect(() => {
    const success = searchParams.get('success');
    const oauthError = searchParams.get('error');

    if (success === 'true') {
      window.history.replaceState({}, '', '/dashboard/gsc');
      window.location.reload();
    }

    if (oauthError) {
      setError(`OAuth error: ${oauthError}`);
      window.history.replaceState({}, '', '/dashboard/gsc');
    }
  }, [searchParams]);

  // Handle payment callback
  useEffect(() => {
    const payment = searchParams.get('payment');

    if (payment === 'success') {
      window.history.replaceState({}, '', '/dashboard/gsc');
      window.location.reload();
    }

    if (payment === 'canceled') {
      setError('Payment was canceled');
      window.history.replaceState({}, '', '/dashboard/gsc');
    }
  }, [searchParams]);

  // Fetch properties when connected (free for all users)
  useEffect(() => {
    if (isConnected && properties.length === 0 && !loading) {
      fetchProperties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gsc/checkout', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleConnectGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const handleReconnect = async () => {
    if (!confirm('This will disconnect and reconnect your Google account. Continue?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Delete existing connection
      const res = await fetch('/api/gsc/disconnect', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to disconnect');
      }

      console.log('[GSC Dashboard] Disconnected successfully, redirecting to OAuth...');

      // Redirect to OAuth
      window.location.href = '/api/auth/google';
    } catch (err: any) {
      console.error('[GSC Dashboard] Reconnect error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gsc/analyze?action=list');
      const data = await res.json();

      if (!res.ok) {
        console.error('[GSC Dashboard] Properties fetch failed:', {
          status: res.status,
          error: data.error,
          message: data.message,
          requiresConnection: data.requiresConnection,
        });

        // Detect scope permission error
        if (res.status === 403 && data.error?.includes('insufficient authentication scopes')) {
          throw new Error(
            'Missing permissions. Please click "Reconnect" above and make sure to authorize Search Console access.'
          );
        }

        throw new Error(data.message || data.error || 'Failed to fetch properties');
      }

      console.log('[GSC Dashboard] Properties loaded:', data.properties?.length || 0);
      setProperties(data.properties || []);
      if (data.properties?.length > 0) {
        setSelectedProperty(data.properties[0].siteUrl);
      }
    } catch (err: any) {
      console.error('[GSC Dashboard] Properties fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    if (!selectedProperty) {
      setError('Please select a property');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/gsc/analyze?siteUrl=${encodeURIComponent(selectedProperty)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch GSC data');
      }

      setGscData(data.data);
      setAnalysis(data.analysis); // Store free analysis insights
      setTrendAnalysis(data.trendAnalysis); // Store trend analysis
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAIAnalysis = async () => {
    if (!selectedProperty) {
      setError('Please select a property first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gsc/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteUrl: selectedProperty }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI analysis');
      }

      // Redirect to analysis results page
      window.location.href = `/dashboard/gsc/analysis/${data.analysisId}`;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Connect Google required (always free)
  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Google Search Console
          </h2>
          <p className="text-gray-600 mb-6">
            Connect your Google account to access your Search Console data
          </p>

          <button
            onClick={handleConnectGoogle}
            className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-600"
          >
            Connect Google Account
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main dashboard - free for all connected users
  return (
    <div className="space-y-6">
      {/* Connection status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-green-800">
            Connected as: <strong>{googleEmail}</strong>
          </p>
          <button
            onClick={handleReconnect}
            disabled={loading}
            className="text-sm text-green-700 hover:text-green-900 underline disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reconnect if you're experiencing permission issues"
          >
            Reconnect
          </button>
        </div>
        {!hasUnusedReport && (
          <a
            href="/pricing"
            className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-600 transition-colors text-sm"
          >
            Get AI Analysis - $4.99
          </a>
        )}
      </div>

      {/* Property selector */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Select Property</h2>

        {loading && properties.length === 0 ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-gray-600">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <button
            onClick={fetchProperties}
            className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-600"
          >
            Load Properties
          </button>
        ) : (
          <div className="space-y-4">
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Select a property...</option>
              {properties.map((prop) => (
                <option key={prop.siteUrl} value={prop.siteUrl}>
                  {prop.siteUrl}
                </option>
              ))}
            </select>

            <button
              onClick={fetchAnalysis}
              disabled={!selectedProperty || loading}
              className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Fetch GSC Data'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* GSC Data Display */}
      {gscData && (
        <div className="space-y-6">
          {/* Trend Alerts */}
          {trendAnalysis && trendAnalysis.alerts.length > 0 && (
            <div className="space-y-3">
              {trendAnalysis.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`rounded-lg p-4 border-l-4 ${
                    alert.severity === 'critical'
                      ? 'bg-red-50 border-red-500'
                      : alert.severity === 'warning'
                      ? 'bg-yellow-50 border-yellow-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <div className="flex-1">
                      <h3 className={`font-bold mb-1 ${
                        alert.severity === 'critical'
                          ? 'text-red-900'
                          : alert.severity === 'warning'
                          ? 'text-yellow-900'
                          : 'text-blue-900'
                      }`}>
                        {alert.title}
                      </h3>
                      <p className={`text-sm ${
                        alert.severity === 'critical'
                          ? 'text-red-700'
                          : alert.severity === 'warning'
                          ? 'text-yellow-700'
                          : 'text-blue-700'
                      }`}>
                        {alert.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Traffic Trends Chart */}
          {trendAnalysis && trendAnalysis.dailyData && trendAnalysis.dailyData.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Traffic Trends (Last 90 Days)</h2>

              {/* Clicks & Impressions Chart */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Clicks & Impressions</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendAnalysis.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="clicks"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      name="Clicks"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="impressions"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Impressions"
                    />
                    {/* Mark anomaly points */}
                    {trendAnalysis.alerts.filter(a => a.startDate).map((alert, idx) => {
                      const dataPoint = trendAnalysis.dailyData.find(d => d.date === alert.startDate);
                      if (!dataPoint) return null;
                      return (
                        <ReferenceDot
                          key={idx}
                          x={alert.startDate}
                          y={dataPoint.clicks}
                          yAxisId="left"
                          r={6}
                          fill={alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#f59e0b' : '#3b82f6'}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* CTR & Position Chart */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">CTR & Average Position</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendAnalysis.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(date) => {
                        const d = new Date(date);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      reversed
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                      formatter={(value: any, name?: string) => {
                        if (name === 'CTR') return [(value * 100).toFixed(2) + '%', name];
                        return [value.toFixed(1), name || ''];
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="ctr"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      name="CTR"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="position"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      name="Avg Position"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Week-over-Week Comparison */}
          {trendAnalysis && trendAnalysis.weekOverWeek.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Week-over-Week Trends</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {trendAnalysis.weekOverWeek.map((comparison, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">{comparison.metric}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-gray-900">
                        {comparison.metric === 'Ctr'
                          ? (comparison.current * 100).toFixed(2) + '%'
                          : comparison.metric === 'Position'
                          ? comparison.current.toFixed(1)
                          : Math.round(comparison.current).toLocaleString()}
                      </p>
                      <span className={`text-sm font-semibold ${
                        comparison.trend === 'up' ? 'text-green-600' : comparison.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {comparison.trend === 'up' ? '↑' : comparison.trend === 'down' ? '↓' : '→'}
                        {Math.abs(comparison.percentChange).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Summary (Last 90 Days)</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-primary-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Clicks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {gscData.summary.totalClicks.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Impressions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {gscData.summary.totalImpressions.toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Avg CTR</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(gscData.summary.avgCtr * 100).toFixed(2)}%
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Avg Position</p>
                <p className="text-2xl font-bold text-gray-900">
                  {gscData.summary.avgPosition.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {/* FREE Analysis Insights - Top Search Phrase Opportunities */}
          {analysis && analysis.topOpportunities.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  🎯 Your Top Search Phrase Opportunities (FREE)
                </h2>
                <p className="text-gray-700">
                  Search queries that need immediate attention - prioritize these for maximum impact
                </p>
              </div>
              <div className="space-y-4">
                {analysis.topOpportunities.map((queryData: any, index: number) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">{queryData.query}</h3>

                        {/* Query Stats */}
                        <div className="flex items-center gap-4 text-xs text-gray-600 mb-3 pb-3 border-b border-gray-200">
                          <span>Position: #{Math.round(queryData.position)}</span>
                          <span>Impressions: {queryData.impressions.toLocaleString()}</span>
                          <span>CTR: {(queryData.ctr * 100).toFixed(1)}%</span>
                          <span>Clicks: {queryData.clicks}</span>
                        </div>

                        {/* All Issues for this Query */}
                        <div className="space-y-2">
                          {queryData.issues.map((issue: any, issueIdx: number) => (
                            <div key={issueIdx} className="bg-green-50 rounded p-3">
                              <div className="flex items-start gap-2 mb-1">
                                <span className="text-xs font-semibold text-green-700 uppercase">{issue.category}</span>
                              </div>
                              <p className="text-sm text-gray-700 mb-1">{issue.issue}</p>
                              <p className="text-sm text-green-700 font-medium">
                                💡 {issue.recommendation}
                              </p>
                              {issue.potentialGain && (
                                <p className="text-xs text-green-600 font-semibold mt-1">{issue.potentialGain}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Analysis Sections */}
          {analysis && (
            <>
              {analysis.lowHangingFruit.items.filter((item: any) =>
                !analysis.topOpportunities.some((top: any) => top.query === item.query)
              ).length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {analysis.lowHangingFruit.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{analysis.lowHangingFruit.description}</p>
                  <div className="space-y-3">
                    {analysis.lowHangingFruit.items
                      .filter((item: any) => !analysis.topOpportunities.some((top: any) => top.query === item.query))
                      .slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 hover:border-primary-200 transition-colors">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.query}</h3>
                        <p className="text-xs text-gray-600 mb-2">{item.issue}</p>
                        <p className="text-xs text-primary font-medium mb-2">💡 {item.recommendation}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>Pos: #{Math.round(item.position)}</span>
                          <span>Impr: {item.impressions.toLocaleString()}</span>
                          <span>CTR: {(item.ctr * 100).toFixed(1)}%</span>
                          {item.potentialGain && (
                            <span className="text-green-600 font-semibold">{item.potentialGain}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.almostThere.items.filter((item: any) =>
                !analysis.topOpportunities.some((top: any) => top.query === item.query)
              ).length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {analysis.almostThere.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{analysis.almostThere.description}</p>
                  <div className="space-y-3">
                    {analysis.almostThere.items
                      .filter((item: any) => !analysis.topOpportunities.some((top: any) => top.query === item.query))
                      .slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 hover:border-primary-200 transition-colors">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.query}</h3>
                        <p className="text-xs text-gray-600 mb-2">{item.issue}</p>
                        <p className="text-xs text-primary font-medium mb-2">💡 {item.recommendation}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>Pos: #{Math.round(item.position)}</span>
                          <span>Impr: {item.impressions.toLocaleString()}</span>
                          <span>CTR: {(item.ctr * 100).toFixed(1)}%</span>
                          {item.potentialGain && (
                            <span className="text-green-600 font-semibold">{item.potentialGain}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.clickDeserts.items.filter((item: any) =>
                !analysis.topOpportunities.some((top: any) => top.query === item.query)
              ).length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {analysis.clickDeserts.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{analysis.clickDeserts.description}</p>
                  <div className="space-y-3">
                    {analysis.clickDeserts.items
                      .filter((item: any) => !analysis.topOpportunities.some((top: any) => top.query === item.query))
                      .slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 hover:border-primary-200 transition-colors">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.query}</h3>
                        <p className="text-xs text-gray-600 mb-2">{item.issue}</p>
                        <p className="text-xs text-primary font-medium mb-2">💡 {item.recommendation}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>Pos: #{Math.round(item.position)}</span>
                          <span>Impr: {item.impressions.toLocaleString()}</span>
                          <span>CTR: {(item.ctr * 100).toFixed(1)}%</span>
                          {item.potentialGain && (
                            <span className="text-green-600 font-semibold">{item.potentialGain}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.ctrUnderperformers.items.filter((item: any) =>
                !analysis.topOpportunities.some((top: any) => top.query === item.query)
              ).length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {analysis.ctrUnderperformers.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{analysis.ctrUnderperformers.description}</p>
                  <div className="space-y-3">
                    {analysis.ctrUnderperformers.items
                      .filter((item: any) => !analysis.topOpportunities.some((top: any) => top.query === item.query))
                      .slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 hover:border-primary-200 transition-colors">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.query}</h3>
                        <p className="text-xs text-gray-600 mb-2">{item.issue}</p>
                        <p className="text-xs text-primary font-medium mb-2">💡 {item.recommendation}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>Pos: #{Math.round(item.position)}</span>
                          <span>Impr: {item.impressions.toLocaleString()}</span>
                          <span>CTR: {(item.ctr * 100).toFixed(1)}%</span>
                          {item.potentialGain && (
                            <span className="text-green-600 font-semibold">{item.potentialGain}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.lowVolumeWins.items.filter((item: any) =>
                !analysis.topOpportunities.some((top: any) => top.query === item.query)
              ).length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {analysis.lowVolumeWins.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{analysis.lowVolumeWins.description}</p>
                  <div className="space-y-3">
                    {analysis.lowVolumeWins.items
                      .filter((item: any) => !analysis.topOpportunities.some((top: any) => top.query === item.query))
                      .slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 hover:border-primary-200 transition-colors">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.query}</h3>
                        <p className="text-xs text-gray-600 mb-2">{item.issue}</p>
                        <p className="text-xs text-primary font-medium mb-2">💡 {item.recommendation}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>Pos: #{Math.round(item.position)}</span>
                          <span>Impr: {item.impressions.toLocaleString()}</span>
                          <span>CTR: {(item.ctr * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PAGE-LEVEL ANALYSIS SECTIONS */}
              {/* Divider between Query and Page Analysis */}
              <div className="border-t-4 border-gray-300 my-8 pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Page-Level Opportunities</h2>
                <p className="text-gray-600 mb-6">Which URLs on your site need optimization</p>
              </div>

              {/* Top Page Opportunities */}
              {analysis.topPageOpportunities && analysis.topPageOpportunities.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      📄 Your Top Page Opportunities (FREE)
                    </h2>
                    <p className="text-gray-700">
                      Pages that need immediate attention - prioritize these for maximum impact
                    </p>
                  </div>
                  <div className="space-y-4">
                    {analysis.topPageOpportunities.map((pageData: any, index: number) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm font-bold flex-shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-2 text-sm break-all">{pageData.page}</h3>

                            {/* Page Stats */}
                            <div className="flex items-center gap-4 text-xs text-gray-600 mb-3 pb-3 border-b border-gray-200">
                              <span>Position: #{Math.round(pageData.position)}</span>
                              <span>Impressions: {pageData.impressions.toLocaleString()}</span>
                              <span>CTR: {(pageData.ctr * 100).toFixed(1)}%</span>
                              <span>Clicks: {pageData.clicks}</span>
                            </div>

                            {/* All Issues for this Page */}
                            <div className="space-y-2">
                              {pageData.issues.map((issue: any, issueIdx: number) => (
                                <div key={issueIdx} className="bg-blue-50 rounded p-3">
                                  <div className="flex items-start gap-2 mb-1">
                                    <span className="text-xs font-semibold text-blue-700 uppercase">{issue.category}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-1">{issue.issue}</p>
                                  <p className="text-sm text-blue-700 font-medium">
                                    💡 {issue.recommendation}
                                  </p>
                                  {issue.potentialGain && (
                                    <p className="text-xs text-green-600 font-semibold mt-1">{issue.potentialGain}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Page Low-Hanging Fruit */}
              {analysis.pageLowHangingFruit && analysis.pageLowHangingFruit.items.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {analysis.pageLowHangingFruit.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{analysis.pageLowHangingFruit.description}</p>
                  <div className="space-y-3">
                    {analysis.pageLowHangingFruit.items.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 hover:border-primary-200 transition-colors">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 break-all">{item.page}</h3>
                        <p className="text-xs text-gray-600 mb-2">{item.issue}</p>
                        <p className="text-xs text-primary font-medium mb-2">💡 {item.recommendation}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>Pos: #{Math.round(item.position)}</span>
                          <span>Impr: {item.impressions.toLocaleString()}</span>
                          <span>CTR: {(item.ctr * 100).toFixed(1)}%</span>
                          {item.potentialGain && (
                            <span className="text-green-600 font-semibold">{item.potentialGain}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Page Almost There */}
              {analysis.pageAlmostThere && analysis.pageAlmostThere.items.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {analysis.pageAlmostThere.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{analysis.pageAlmostThere.description}</p>
                  <div className="space-y-3">
                    {analysis.pageAlmostThere.items.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 hover:border-primary-200 transition-colors">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 break-all">{item.page}</h3>
                        <p className="text-xs text-gray-600 mb-2">{item.issue}</p>
                        <p className="text-xs text-primary font-medium mb-2">💡 {item.recommendation}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>Pos: #{Math.round(item.position)}</span>
                          <span>Impr: {item.impressions.toLocaleString()}</span>
                          <span>CTR: {(item.ctr * 100).toFixed(1)}%</span>
                          {item.potentialGain && (
                            <span className="text-green-600 font-semibold">{item.potentialGain}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Page Click Deserts */}
              {analysis.pageClickDeserts && analysis.pageClickDeserts.items.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {analysis.pageClickDeserts.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{analysis.pageClickDeserts.description}</p>
                  <div className="space-y-3">
                    {analysis.pageClickDeserts.items.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 hover:border-primary-200 transition-colors">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 break-all">{item.page}</h3>
                        <p className="text-xs text-gray-600 mb-2">{item.issue}</p>
                        <p className="text-xs text-primary font-medium mb-2">💡 {item.recommendation}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>Pos: #{Math.round(item.position)}</span>
                          <span>Impr: {item.impressions.toLocaleString()}</span>
                          <span>CTR: {(item.ctr * 100).toFixed(1)}%</span>
                          {item.potentialGain && (
                            <span className="text-green-600 font-semibold">{item.potentialGain}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Page CTR Underperformers */}
              {analysis.pageCTRUnderperformers && analysis.pageCTRUnderperformers.items.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {analysis.pageCTRUnderperformers.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{analysis.pageCTRUnderperformers.description}</p>
                  <div className="space-y-3">
                    {analysis.pageCTRUnderperformers.items.slice(0, 5).map((item: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 hover:border-primary-200 transition-colors">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 break-all">{item.page}</h3>
                        <p className="text-xs text-gray-600 mb-2">{item.issue}</p>
                        <p className="text-xs text-primary font-medium mb-2">💡 {item.recommendation}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>Pos: #{Math.round(item.position)}</span>
                          <span>Impr: {item.impressions.toLocaleString()}</span>
                          <span>CTR: {(item.ctr * 100).toFixed(1)}%</span>
                          {item.potentialGain && (
                            <span className="text-green-600 font-semibold">{item.potentialGain}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Top Queries */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Queries</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Query</th>
                    <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700">Clicks</th>
                    <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700">Impressions</th>
                    <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700">CTR</th>
                    <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {gscData.queries.slice(0, 20).map((query: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm text-gray-900">{query.keys[0]}</td>
                      <td className="py-2 px-4 text-sm text-gray-900 text-right">{query.clicks}</td>
                      <td className="py-2 px-4 text-sm text-gray-900 text-right">{query.impressions}</td>
                      <td className="py-2 px-4 text-sm text-gray-900 text-right">
                        {(query.ctr * 100).toFixed(2)}%
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-900 text-right">
                        {query.position.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Pages */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Pages</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-sm font-semibold text-gray-700">Page</th>
                    <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700">Clicks</th>
                    <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700">Impressions</th>
                    <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700">CTR</th>
                    <th className="text-right py-2 px-4 text-sm font-semibold text-gray-700">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {gscData.pages.slice(0, 20).map((page: any, index: number) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm text-gray-900 truncate max-w-md">
                        {page.keys[0]}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-900 text-right">{page.clicks}</td>
                      <td className="py-2 px-4 text-sm text-gray-900 text-right">{page.impressions}</td>
                      <td className="py-2 px-4 text-sm text-gray-900 text-right">
                        {(page.ctr * 100).toFixed(2)}%
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-900 text-right">
                        {page.position.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upgrade to AI Analysis CTA */}
          {!hasUnusedReport && analysis && (
            <div className="bg-gradient-to-br from-primary-50 to-purple-50 border border-primary-200 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Want AI-Enhanced Recommendations?
              </h3>
              <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                Upgrade to GPT-4 powered analysis for specific title suggestions, content strategy, and personalized action plans tailored to your data.
              </p>
              <div className="bg-white rounded-lg p-6 mb-6 max-w-md mx-auto">
                <h4 className="font-semibold text-gray-900 mb-3">AI Analysis includes:</h4>
                <ul className="text-left text-gray-700 space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Personalized SEO recommendations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Content improvement suggestions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Keyword opportunity identification</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>CTR optimization strategies</span>
                  </li>
                </ul>
              </div>
              <a
                href="/pricing"
                className="inline-block bg-primary text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-600 transition-colors shadow-lg"
              >
                Get AI Analysis for $4.99
              </a>
            </div>
          )}

          {hasUnusedReport && (
            <div className="bg-gradient-to-br from-green-50 to-primary-50 border border-primary-200 rounded-xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Ready to Get AI Insights?
              </h3>
              <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                You have 1 AI analysis credit available! Generate your personalized SEO recommendations and actionable insights now.
              </p>
              <button
                onClick={generateAIAnalysis}
                disabled={loading}
                className="inline-block bg-primary text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating Analysis...' : 'Generate AI Analysis Now'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
