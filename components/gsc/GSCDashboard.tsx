'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

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

export function GSCDashboard({ hasUnusedReport, isConnected, googleEmail, reportStatus }: GSCDashboardProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<GSCProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [gscData, setGscData] = useState<GSCData | null>(null);

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

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gsc/analyze?action=list');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch properties');
      }

      setProperties(data.properties || []);
      if (data.properties?.length > 0) {
        setSelectedProperty(data.properties[0].siteUrl);
      }
    } catch (err: any) {
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
    } catch (err: any) {
      setError(err.message);
    } finally {
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
        <p className="text-green-800">
          Connected as: <strong>{googleEmail}</strong>
        </p>
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
          {/* Summary Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Summary (Last 28 Days)</h2>
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
          {!hasUnusedReport && (
            <div className="bg-gradient-to-br from-primary-50 to-purple-50 border border-primary-200 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Want Deeper Insights?
              </h3>
              <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                Upgrade to AI-powered analysis to get actionable recommendations, SEO insights, and strategic advice tailored to your data.
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-green-800 font-semibold mb-2">
                You have 1 AI analysis credit available!
              </p>
              <p className="text-sm text-green-700">
                Your AI-powered analysis report will be generated soon. Check back shortly for your insights.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
