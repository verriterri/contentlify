'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAffiliateLink, getAffiliateLinkInfo } from '@/lib/utils/affiliate-link-detector';

interface AnalysisResult {
  success: boolean;
  analysisId: string;
  url: string;
  title: string;
  wordCount: number;
  affiliateOpportunities: any[];
  productIdeas: any[];
  warnings?: string[];
}

interface AnalysisHistory {
  id: string;
  url: string;
  title?: string;
  created_at: string;
  status: string;
}

export default function AnalyzePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [analyzeChildren, setAnalyzeChildren] = useState(false);
  const [forceRecrawl, setForceRecrawl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string>('free');
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Get user tier and load history
  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user tier
        const { data: userData } = await supabase
          .from('users')
          .select('subscription_tier')
          .eq('id', user.id)
          .single();

        if (userData) {
          setUserTier(userData.subscription_tier || 'free');
        }

        // Load analysis history (exclude deleted analyses)
        const { data: analyses } = await supabase
          .from('content_analyses')
          .select('id, url, title, status, created_at')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (analyses) {
          setHistory(analyses as AnalysisHistory[]);
        }
      }
      setLoadingHistory(false);
    }

    loadUserData();
  }, []);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgressMessage('Initializing analysis...');

    try {
      let response: Response;
      let data: any;

      if (analyzeChildren) {
        // Site-wide audit - check tier first
        if (userTier !== 'pro' && userTier !== 'agency') {
          throw new Error(
            'Site-wide audit is only available for Pro and Agency subscribers. Please upgrade to unlock this feature.'
          );
        }

        setProgressMessage('Discovering pages on site...');
        response = await fetch('/api/analyze-site', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rootUrl: url, maxUrls: 20 }),
        });

        data = await response.json();

        if (!response.ok) {
          if (data.upgradeRequired) {
            throw new Error(data.error);
          }
          throw new Error(data.error || 'Failed to analyze site');
        }

        // Reload history after successful analysis
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: analyses } = await supabase
            .from('content_analyses')
            .select('id, url, status, created_at')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(20);

          if (analyses) {
            setHistory(analyses as AnalysisHistory[]);
          }
        }
      } else {
        // Single URL analysis
        setProgressMessage('Scraping URL and extracting content...');
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, forceRecrawl }),
        });

        data = await response.json();

        if (!response.ok) {
          if (data.limitReached) {
            throw new Error(data.error);
          }
          throw new Error(data.error || 'Failed to analyze URL');
        }

        // Update progress during analysis
        setProgressMessage('Finding affiliate opportunities...');
        await new Promise((resolve) => setTimeout(resolve, 500));
        setProgressMessage('Generating product ideas...');

        // Reload history
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: analyses } = await supabase
            .from('content_analyses')
            .select('id, url, status, created_at')
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(20);

          if (analyses) {
            setHistory(analyses as AnalysisHistory[]);
          }
        }
      }

      setProgressMessage('Analysis complete!');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
      setProgressMessage('');
    }
  };

  const handleLoadHistory = async (analysisId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: analysis, error: fetchError } = await supabase
        .from('content_analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (fetchError || !analysis) {
        throw new Error('Analysis not found');
      }

      setResult({
        success: true,
        analysisId: analysis.id,
        url: analysis.url,
        title: analysis.url, // Title might not be saved
        wordCount: 0,
        affiliateOpportunities: analysis.affiliate_opportunities || [],
        productIdeas: analysis.product_ideas || [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (analysisId: string) => {
    if (!confirm('Are you sure you want to delete this analysis? It will be hidden from your history but will still count toward your monthly limit.')) {
      return;
    }

    // Soft delete - mark as deleted instead of actually deleting
    // This preserves quota usage and historical data
    const { error } = await supabase
      .from('content_analyses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', analysisId);

    if (error) {
      setError('Failed to delete analysis');
    } else {
      // Reload history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: analyses } = await supabase
          .from('content_analyses')
          .select('id, url, status, created_at')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (analyses) {
          setHistory(analyses as AnalysisHistory[]);
        }
      }

      if (result?.analysisId === analysisId) {
        setResult(null);
      }
    }
  };

  const isProUser = userTier === 'pro' || userTier === 'agency';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Analyze Content
            </h1>

            {/* Input Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="url"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Enter URL to Analyze
                  </label>
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/blog-post"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                    disabled={loading}
                  />
                </div>

                {isProUser && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="analyzeChildren"
                      checked={analyzeChildren}
                      onChange={(e) => setAnalyzeChildren(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      disabled={loading}
                    />
                    <label
                      htmlFor="analyzeChildren"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      <span className="font-medium">
                        Analyze all child URLs under this URL
                      </span>
                      <span className="text-xs text-gray-500 block mt-1">
                        Site-wide audit (Pro feature) - Crawls and analyzes all pages
                        under this root URL
                      </span>
                    </label>
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="forceRecrawl"
                    checked={forceRecrawl}
                    onChange={(e) => setForceRecrawl(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    disabled={loading}
                  />
                  <label
                    htmlFor="forceRecrawl"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    <span className="font-medium">
                      Force Re-crawl
                    </span>
                    <span className="text-xs text-gray-500 block mt-1">
                      Ignore cached results and re-analyze the URL (creates a new analysis while keeping all history)
                    </span>
                  </label>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Analyzing...' : 'Analyze Content'}
                </button>

                {loading && progressMessage && (
                  <div className="text-sm text-gray-600 text-center">
                    {progressMessage}
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Results Section */}
            {result && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Analysis Results
                  </h2>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">URL:</span>
                      <p className="font-medium text-gray-900 break-all">
                        {result.url}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Word Count:</span>
                      <p className="font-medium text-gray-900">
                        {result.wordCount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Title:</span>
                      <p className="font-medium text-gray-900">
                        {result.title || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Affiliate Opportunities */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Affiliate Opportunities ({result.affiliateOpportunities.length} found)
                  </h2>

                  {result.affiliateOpportunities.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product/Service
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Context
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Best Program
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Est. Value
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Commission
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {result.affiliateOpportunities.map((opp, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">
                                  {opp.product}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {opp.category}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                  {opp.context.substring(0, 100)}...
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {opp.affiliatePrograms[0] && (
                                  <a
                                    href={opp.affiliatePrograms[0].url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-purple-600 hover:underline"
                                  >
                                    {opp.affiliatePrograms[0].name}
                                  </a>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {opp.estimatedValue ? `$${opp.estimatedValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {opp.affiliatePrograms[0]?.commission || 'N/A'}
                              </td>
                              <td className="px-6 py-4">
                                {opp.isAlreadyLinked ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      {opp.linkedUrl && isAffiliateLink(opp.linkedUrl) ? (
                                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-medium">
                                          ✓ Affiliate Link
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded font-medium">
                                          Link Found
                                        </span>
                                      )}
                                    </div>
                                    {opp.linkedUrl && (
                                      <details className="text-xs">
                                        <summary className="cursor-pointer text-purple-600 hover:text-purple-800 font-medium">
                                          View link details
                                        </summary>
                                        <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
                                          {(() => {
                                            const linkInfo = getAffiliateLinkInfo(opp.linkedUrl);
                                            return (
                                              <>
                                                {linkInfo && (
                                                  <div>
                                                    <strong className="text-gray-700">Network:</strong>{' '}
                                                    <span className="text-gray-900">{linkInfo.type}</span>
                                                    {' '}
                                                    <span className={`text-xs ${
                                                      linkInfo.confidence === 'high' ? 'text-green-600' :
                                                      linkInfo.confidence === 'medium' ? 'text-yellow-600' :
                                                      'text-gray-500'
                                                    }`}>
                                                      ({linkInfo.confidence} confidence)
                                                    </span>
                                                  </div>
                                                )}
                                                {opp.linkAnchorText && (
                                                  <div>
                                                    <strong className="text-gray-700">Anchor text:</strong>{' '}
                                                    <span className="text-gray-900 italic">&quot;{opp.linkAnchorText}&quot;</span>
                                                  </div>
                                                )}
                                                <div>
                                                  <strong className="text-gray-700">URL:</strong>{' '}
                                                  <a
                                                    href={opp.linkedUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-purple-600 hover:text-purple-800 hover:underline break-all"
                                                  >
                                                    {opp.linkedUrl}
                                                  </a>
                                                </div>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                ) : (
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                    Not Linked
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No affiliate opportunities found.
                    </p>
                  )}
                </div>

                {/* Product Ideas */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Digital Product Ideas ({result.productIdeas.length} found)
                  </h2>

                  {result.productIdeas.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {result.productIdeas.map((idea, idx) => (
                        <div
                          key={idx}
                          className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-white hover:border-purple-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {idea.name}
                            </h3>
                            <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded">
                              {idea.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">
                            {idea.description}
                          </p>
                          <div className="border-t border-gray-200 pt-3 space-y-2">
                            <div>
                              <span className="text-xs font-medium text-gray-600">
                                Value:
                              </span>
                              <p className="text-sm text-gray-800 mt-1">
                                {idea.valueProposition}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-xs text-gray-600">Price:</span>
                                <span className="text-purple-700 font-semibold ml-2">
                                  {idea.suggestedPrice}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-600">Time:</span>
                                <span className="text-gray-700 ml-2">
                                  {idea.estimatedTime}
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-xs text-gray-600">
                                Target: {idea.targetAudience}
                              </span>
                            </div>
                            <div className="pt-3 border-t border-gray-200">
                              <button
                                onClick={() => {
                                  router.push(
                                    `/dashboard/generate?analysisId=${result.analysisId}&productId=${idx}`
                                  );
                                }}
                                className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                                <span>Generate This Product</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No product ideas generated.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* History Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Analysis History
              </h2>

              {loadingHistory ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleLoadHistory(item.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.url}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.created_at).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="ml-2 text-red-600 hover:text-red-800 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No analysis history yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

