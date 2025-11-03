'use client';

import { useState } from 'react';

export default function TestPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/test-scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape URL');
      }

      setResults(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Test URL Scraper & Affiliate Detector
          </h1>

          <div className="mb-6">
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Enter Blog URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                id="url"
                name="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/blog-post"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                disabled={loading}
                autoComplete="off"
                data-form-type="other"
              />
              <button
                onClick={handleTest}
                disabled={loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Testing...' : 'Test'}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-gray-600">
                Scraping URL and detecting affiliate opportunities...
              </p>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              {/* Scrape Results */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Scrape Results
                </h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Title:</span>{' '}
                    {results.scrapeResult?.title || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Word Count:</span>{' '}
                    {results.scrapeResult?.wordCount || 0}
                  </div>
                  <div>
                    <span className="font-medium">Content Length:</span>{' '}
                    {results.scrapeResult?.contentLength || 0} characters
                  </div>
                  <div>
                    <span className="font-medium">Existing Links Found:</span>{' '}
                    {results.scrapeResult?.existingLinksCount || 0}
                  </div>
                  {results.scrapeResult?.existingLinks &&
                    results.scrapeResult.existingLinks.length > 0 && (
                      <div className="mt-3">
                        <span className="font-medium">Sample Links:</span>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {results.scrapeResult.existingLinks.map(
                            (link: string, idx: number) => (
                              <li key={idx} className="text-xs break-all">
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-600 hover:underline"
                                >
                                  {link}
                                </a>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  {results.fullContent && (
                    <div className="mt-3">
                      <span className="font-medium">Content Preview:</span>
                      <p className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-40 overflow-y-auto">
                        {results.fullContent}...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Affiliate Opportunities */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Affiliate Opportunities (
                  {results.affiliateOpportunities?.length || 0} found)
                </h2>

                {results.affiliateError && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <strong>Error:</strong> {results.affiliateError}
                  </div>
                )}

                {results.affiliateOpportunities &&
                results.affiliateOpportunities.length > 0 ? (
                  <div className="space-y-4">
                    {results.affiliateOpportunities.map(
                      (opp: any, idx: number) => (
                        <div
                          key={idx}
                          className="border border-gray-200 rounded p-4 bg-gray-50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {opp.product}
                              </h3>
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                {opp.category}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-700">
                                Confidence: {(opp.confidence * 100).toFixed(0)}%
                              </div>
                              {opp.relevance && (
                                <div className="text-xs text-gray-600 mt-1">
                                  Relevance: {(opp.relevance * 100).toFixed(0)}%
                                </div>
                              )}
                              {opp.isAlreadyLinked ? (
                                <div className="space-y-1">
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded block">
                                    Already Linked
                                  </span>
                                  {opp.linkAnchorText && (
                                    <div className="text-xs text-gray-600">
                                      Linked as: "{opp.linkAnchorText}"
                                    </div>
                                  )}
                                  {opp.linkedUrl && (
                                    <a
                                      href={opp.linkedUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-purple-600 hover:underline break-all block"
                                    >
                                      {opp.linkedUrl}
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Not Linked
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 mb-3 italic">
                            "{opp.context}"
                          </p>

                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">
                              Affiliate Programs:
                            </div>
                            <div className="space-y-2">
                              {opp.affiliatePrograms.map(
                                (prog: any, progIdx: number) => (
                                  <div
                                    key={progIdx}
                                    className={`flex items-center justify-between p-2 rounded ${
                                      prog.isPrimary
                                        ? 'bg-purple-50 border border-purple-200'
                                        : 'bg-white border border-gray-200'
                                    }`}
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <a
                                          href={prog.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-medium text-purple-600 hover:underline"
                                        >
                                          {prog.name}
                                        </a>
                                        {prog.isPrimary && (
                                          <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                                            Primary
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        Commission: {prog.commission}
                                        {prog.note && (
                                          <span className="ml-2 text-gray-500">
                                            ({prog.note})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No affiliate opportunities detected.
                  </p>
                )}
              </div>

              {/* Product Ideas */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Digital Product Ideas (
                  {results.productIdeas?.length || 0} found)
                </h2>

                {results.productIdeas && results.productIdeas.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {results.productIdeas.map((idea: any, idx: number) => (
                      <div
                        key={idx}
                        className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-white hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {idea.name}
                          </h3>
                          <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded whitespace-nowrap ml-2">
                            {idea.type}
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 mb-3">
                          {idea.description}
                        </p>

                        <div className="border-t border-gray-200 pt-3 space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-600">
                              Value Proposition:
                            </span>
                            <p className="text-sm text-gray-800 mt-1">
                              {idea.valueProposition}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-xs font-medium text-gray-600 block">
                                Suggested Price:
                              </span>
                              <span className="text-purple-700 font-semibold">
                                {idea.suggestedPrice}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-600 block">
                                Time to Create:
                              </span>
                              <span className="text-gray-700">
                                {idea.estimatedTime}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-xs font-medium text-gray-600 block mb-1">
                              Target Audience:
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded inline-block">
                              {idea.targetAudience}
                            </span>
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

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <strong>Note:</strong> This is a test endpoint. Make sure you have
            OPENAI_API_KEY set in your environment variables for affiliate
            detection to work.
          </div>
        </div>
      </div>
    </div>
  );
}

