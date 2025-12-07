'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { isAffiliateLink, getAffiliateLinkInfo } from '@/lib/utils/affiliate-link-detector';
import { SiteUrlInput } from '@/components/scanner/SiteUrlInput';
import { mapToStandardCategory } from '@/lib/utils/category-mapper';

interface AnalysisResult {
  success: boolean;
  analysisId: string | null;
  url: string;
  title: string;
  wordCount: number;
  affiliateOpportunities: any[];
  productIdeas: any[];
  warnings?: string[];
  isAnonymous?: boolean;
  isFreeTrial?: boolean;
}

export default function AnalyzePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState('');
  const [analyzeChildren, setAnalyzeChildren] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<string>('free');
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  const [isManualAnalyze, setIsManualAnalyze] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [freeTrialUsed, setFreeTrialUsed] = useState(false);

  // Debug: Log when result state changes
  useEffect(() => {
    if (result) {
      console.log('[Analyze] Result state updated:', {
        url: result.url,
        title: result.title,
        hasAffiliateOpportunities: !!result.affiliateOpportunities,
        hasProductIdeas: !!result.productIdeas,
      });
    } else {
      console.log('[Analyze] Result state is null');
    }
  }, [result]);

  // Get user tier and load history
  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAnonymous(false);
        // User is authenticated, no tier needed (credit-based system)
        setUserTier('free');
      } else {
        setIsAnonymous(true);
        // Check free trial status for anonymous users
        try {
          const creditsResponse = await fetch('/api/user/credits');
          if (creditsResponse.ok) {
            const creditsData = await creditsResponse.json();
            setFreeTrialUsed(creditsData.freeTrialUsed || false);
          }
        } catch (error) {
          console.error('Error checking free trial status:', error);
        }
      }
    }

    loadUserData();
  }, []);

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
        title: analysis.title || analysis.url,
        wordCount: analysis.word_count || 0,
        affiliateOpportunities: analysis.affiliate_opportunities || [],
        productIdeas: analysis.product_ideas || [],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  // Load URL or analysisId from query params and auto-trigger analysis if present
  useEffect(() => {
    async function autoTriggerAnalysis() {
      const analysisIdParam = searchParams?.get('analysisId');
      const urlParam = searchParams?.get('url');
      const forceReanalyze = searchParams?.get('force') === 'true';
      
      // If analysisId is present, load that analysis
      if (analysisIdParam && !hasAutoTriggered) {
        setHasAutoTriggered(true);
        handleLoadHistory(analysisIdParam);
        return;
      }
      
      if (urlParam && !hasAutoTriggered) {
        const decodedUrl = decodeURIComponent(urlParam);
        setUrl(decodedUrl);
        setHasAutoTriggered(true);
        
        if (decodedUrl.trim()) {
        // Check if user is anonymous (check both state and auth)
        const { data: { user } } = await supabase.auth.getUser();
        const userIsAnonymous = !user;
        
        // Check if this is coming from scan results (has scanId) - if so, always create new analysis
        const scanIdParam = searchParams?.get('scanId');
        const isFromScan = !!scanIdParam;
        
        console.log('[Analyze] Auto-trigger check:', {
          scanId: scanIdParam,
          isFromScan,
          forceReanalyze,
          isManualAnalyze,
          userIsAnonymous,
        });
        
        // Check if we already have a result for this URL (prevents re-analysis on refresh)
        if (result && result.url === decodedUrl && !forceReanalyze && !isFromScan) {
          console.log('[Analyze] Already have result for this URL, not re-analyzing');
          return;
        }
        
        // Check sessionStorage to prevent re-triggering on refresh
        const sessionKey = `analyzed_${decodedUrl}`;
        const alreadyAnalyzed = sessionStorage.getItem(sessionKey);
        if (alreadyAnalyzed && !forceReanalyze && !isFromScan) {
          console.log('[Analyze] Already analyzed this URL in this session, checking for existing result...');
          // Still try to load from database/cache if available, but don't trigger new analysis
          // The existing analysis check below will handle loading the result
        }
        
        // For logged-in users: Check if analysis already exists before re-analyzing
        // Skip this check if:
        // - ?force=true is in the URL (allows forcing re-analysis)
        // - Coming from scan results (scanId present) - always create new when analyzing from scan
        // - Manual analyze flag is set
        // IMPORTANT: If coming from scan results, NEVER check for existing - always create new
        if (!userIsAnonymous && user && !isManualAnalyze && !forceReanalyze && !isFromScan) {
          console.log('[Analyze] Checking for existing analysis...');
          try {
            const { data: existingAnalysis } = await supabase
              .from('content_analyses')
              .select('*')
              .eq('user_id', user.id)
              .eq('url', decodedUrl)
              .eq('status', 'completed')
              .is('deleted_at', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (existingAnalysis) {
              console.log('[Analyze] Found existing analysis on page load, loading it instead of re-analyzing');
              setResult({
                success: true,
                analysisId: existingAnalysis.id,
                url: existingAnalysis.url,
                title: existingAnalysis.title || existingAnalysis.url,
                wordCount: existingAnalysis.word_count || 0,
                creditsUsed: existingAnalysis.credits_used || 0,
                affiliateOpportunities: existingAnalysis.affiliate_opportunities || [],
                productIdeas: existingAnalysis.product_ideas || [],
                isAnonymous: false,
                isFreeTrial: false,
              });
              setLoading(false);
              return; // Don't trigger new analysis on page load
            }
          } catch (error) {
            console.error('[Analyze] Error checking for existing analysis:', error);
            // Continue to analyze if check fails
          }
        }
        
        // For anonymous users: check if we have cached result in sessionStorage
        if (userIsAnonymous) {
            const cacheKey = `analysis_${decodedUrl}`;
            const cachedResult = sessionStorage.getItem(cacheKey);
            
            if (cachedResult) {
              try {
                const parsedResult = JSON.parse(cachedResult);
                setResult(parsedResult);
                return; // Don't re-analyze, use cached result
              } catch (error) {
                console.error('Error parsing cached result:', error);
                // Fall through to analyze if cache is corrupted
              }
            }
            
            // Check free trial status from API before analyzing
            try {
              const creditsResponse = await fetch('/api/user/credits');
              if (creditsResponse.ok) {
                const creditsData = await creditsResponse.json();
                if (creditsData.freeTrialUsed) {
                  setFreeTrialUsed(true);
                  setError('Free trial already used. Please sign up to continue analyzing.');
                  return;
                }
              }
            } catch (error) {
              console.error('Error checking free trial status:', error);
              // Continue if check fails (will be caught by API)
            }
          }
          
          // Only auto-trigger analysis if:
          // 1. Coming from scan results (isFromScan) - always create new
          // 2. Force reanalyze is requested
          // 3. No existing result found and not already analyzed in this session
          if (isFromScan || forceReanalyze || (!alreadyAnalyzed && !result)) {
            // Auto-trigger analysis after a short delay to ensure component is ready
            setTimeout(() => {
              if (isFromScan) {
                console.log('[Analyze] Coming from scan results - always creating new analysis for URL:', decodedUrl);
              } else {
                console.log('[Analyze] Auto-triggering analysis for URL:', decodedUrl);
              }
              handleAnalyze(decodedUrl).catch((error) => {
                console.error('[Analyze] Error in auto-triggered handleAnalyze:', error);
                setError(error.message || 'Failed to start analysis');
                setLoading(false);
              });
            }, 100);
          } else {
            console.log('[Analyze] Skipping auto-trigger - already analyzed or result exists');
          }
        }
      }
    }
    
    autoTriggerAnalysis();
  }, [searchParams, hasAutoTriggered, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = async (urlOverride?: string, isManual: boolean = false) => {
    const urlToAnalyze = urlOverride || url;
    if (!urlToAnalyze.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Set flag to indicate this is a manual analyze (not auto-triggered)
    if (isManual) {
      setIsManualAnalyze(true);
    }

    console.log('[Analyze] Starting handleAnalyze for URL:', urlToAnalyze);
    console.log('[Analyze] Manual analyze:', isManual, '- will always create new analysis');
    console.log('[Analyze] Current result state before clearing:', result ? 'has result' : 'null');
    
    setLoading(true);
    setError(null);
    setResult(null); // Clear previous result
    setProgressMessage('Initializing analysis...');
    
    console.log('[Analyze] State cleared, starting API call...');

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
          body: JSON.stringify({ rootUrl: urlToAnalyze, maxUrls: 20 }),
        });

        data = await response.json();

        if (!response.ok) {
          if (data.upgradeRequired) {
            throw new Error(data.error);
          }
          throw new Error(data.error || 'Failed to analyze site');
        }

      } else {
        // Single URL analysis
        setProgressMessage('Scraping URL and extracting content...');
        
        console.log('[Analyze] Starting analysis request for:', urlToAnalyze);
        const startTime = Date.now();
        
        // Create an AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.warn('[Analyze] Request timeout after 5 minutes');
        }, 5 * 60 * 1000); // 5 minute timeout
        
        try {
          console.log('[Analyze] About to make fetch request to /api/analyze');
          console.log('[Analyze] Request body:', { url: urlToAnalyze });
          
          response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: urlToAnalyze }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          const requestTime = Date.now() - startTime;
          console.log('[Analyze] API response received after', requestTime, 'ms. Status:', response.status);
          console.log('[Analyze] Response headers:', Object.fromEntries(response.headers.entries()));
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          console.error('[Analyze] Fetch error:', fetchError);
          console.error('[Analyze] Fetch error name:', fetchError.name);
          console.error('[Analyze] Fetch error message:', fetchError.message);
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timed out. The analysis may still be processing. Please check your History page in a few moments.');
          }
          throw fetchError;
        }

        // Check if response is ok before trying to parse JSON
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (jsonError) {
            // If JSON parsing fails, use the response text or status
            const text = await response.text();
            console.error('[Analyze] Non-JSON error response:', text);
            throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
          }
          
          if (errorData.limitReached) {
            throw new Error(errorData.error);
          }
          // If free trial was used, update local state
          if (errorData.freeTrialUsed || errorData.requiresSignup) {
            setFreeTrialUsed(true);
          }
          throw new Error(errorData.error || 'Failed to analyze URL');
        }

        // Parse JSON response
        try {
          data = await response.json();
          console.log('[Analyze] Response received:', {
            success: data.success,
            hasUrl: !!data.url,
            hasAffiliateOpportunities: !!data.affiliateOpportunities,
            hasProductIdeas: !!data.productIdeas,
            analysisId: data.analysisId,
          });
        } catch (jsonError) {
          console.error('[Analyze] Error parsing JSON response:', jsonError);
          const text = await response.text();
          console.error('[Analyze] Response text:', text.substring(0, 500));
          throw new Error('Invalid response from server. Please try again.');
        }

        // Validate response has required fields
        if (!data.success) {
          console.error('[Analyze] API returned success: false', data);
          throw new Error(data.error || 'Analysis failed. Please try again.');
        }

        if (!data.url) {
          console.error('[Analyze] Response missing URL field', data);
          throw new Error('Invalid response: missing URL');
        }

        // Update progress during analysis
        setProgressMessage('Finding affiliate opportunities...');
        await new Promise((resolve) => setTimeout(resolve, 500));
        setProgressMessage('Generating product ideas...');

      }

      setProgressMessage('Analysis complete!');
      console.log('[Analyze] Setting result in state...', {
        hasData: !!data,
        url: data?.url,
        title: data?.title,
        success: data?.success,
      });
      
      // Validate we have the data we need
      if (!data || !data.success) {
        console.error('[Analyze] Invalid data received:', data);
        throw new Error('Invalid response from server');
      }
      
      // Store result with anonymous flags from API
      // Update local anonymous state if API indicates anonymous
      if (data.isAnonymous !== undefined) {
        setIsAnonymous(data.isAnonymous);
      }
      
      const analysisResult = {
        success: data.success,
        analysisId: data.analysisId || null,
        url: data.url,
        title: data.title || 'Untitled',
        wordCount: data.wordCount || 0,
        totalWordCount: data.totalWordCount || data.wordCount || 0,
        creditsUsed: data.creditsUsed || 0,
        remainingCredits: data.remainingCredits,
        affiliateOpportunities: data.affiliateOpportunities || [],
        productIdeas: data.productIdeas || [],
        warnings: data.warnings || [],
        isAnonymous: data.isAnonymous ?? isAnonymous,
        isFreeTrial: data.isFreeTrial ?? false,
        chargeExtraForLongPages: data.chargeExtraForLongPages,
      };
      
      console.log('[Analyze] Calling setResult with:', {
        url: analysisResult.url,
        title: analysisResult.title,
        affiliateCount: analysisResult.affiliateOpportunities?.length || 0,
        productIdeasCount: analysisResult.productIdeas?.length || 0,
        success: analysisResult.success,
      });
      
      // Clear any previous errors
      setError(null);
      
      // Set the result
      setResult(analysisResult);
      
      // Stop loading and clear progress message
      setLoading(false);
      setProgressMessage('');
      
      console.log('[Analyze] setResult() called. Waiting for state update...');
      
      // Force a small delay to ensure state update is processed
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      console.log('[Analyze] State update should be complete. Check useEffect logs.');
      
      // Mark as analyzed in sessionStorage to prevent re-triggering on refresh
      try {
        const sessionKey = `analyzed_${urlToAnalyze}`;
        sessionStorage.setItem(sessionKey, 'true');
      } catch (error) {
        console.error('Error marking URL as analyzed:', error);
      }
      
      // For anonymous users: cache the result in sessionStorage to prevent re-analysis on reload
      if (data.isAnonymous || isAnonymous) {
        try {
          const cacheKey = `analysis_${urlToAnalyze}`;
          sessionStorage.setItem(cacheKey, JSON.stringify(analysisResult));
        } catch (error) {
          console.error('Error caching analysis result:', error);
          // Continue even if caching fails
        }
      }
    } catch (err: any) {
      console.error('[Analyze] Error in handleAnalyze:', err);
      console.error('[Analyze] Error name:', err.name);
      console.error('[Analyze] Error message:', err.message);
      console.error('[Analyze] Error stack:', err.stack);
      
      // Provide more specific error messages
      let errorMessage = err.message || 'An error occurred';
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        errorMessage = 'Request was cancelled. Please try again.';
      } else if (err.message?.includes('timeout') || err.message?.includes('Timeout')) {
        errorMessage = 'Request timed out. The analysis may still be processing. Checking for completed analysis...';
        
        // Try to load the analysis from database if it completed
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Look for the most recent analysis for this URL
            const { data: recentAnalysis } = await supabase
              .from('content_analyses')
              .select('*')
              .eq('user_id', user.id)
              .eq('url', urlToAnalyze)
              .eq('status', 'completed')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (recentAnalysis) {
              console.log('[Analyze] Found completed analysis in database, loading it...');
              setResult({
                success: true,
                analysisId: recentAnalysis.id,
                url: recentAnalysis.url,
                title: recentAnalysis.title || recentAnalysis.url,
                wordCount: recentAnalysis.word_count || 0,
                creditsUsed: recentAnalysis.credits_used || 0,
                affiliateOpportunities: recentAnalysis.affiliate_opportunities || [],
                productIdeas: recentAnalysis.product_ideas || [],
                isAnonymous: false,
                isFreeTrial: false,
              });
              setError(null);
              setLoading(false);
              setProgressMessage('');
              return; // Exit early, we loaded the result
            }
          }
        } catch (dbError) {
          console.error('[Analyze] Error checking database for completed analysis:', dbError);
        }
      } else if (err.message?.includes('JSON')) {
        errorMessage = 'Invalid response from server. The analysis may still be processing. Please check your History page.';
      }
      
      setError(errorMessage);
      // Make sure loading state is cleared even if there's an error
      setLoading(false);
      setProgressMessage('');
      
      // Don't clear result if it exists - user might want to see previous results
      // setResult(null);
    }
  };

  const isProUser = userTier === 'pro' || userTier === 'agency';

  // Get scanId from query params for back button
  const scanId = searchParams?.get('scanId');

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        {scanId && (
          <Link
            href={`/scan/${scanId}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">Back to Scan Results</span>
          </Link>
        )}
        <h1 className="text-3xl font-bold text-gray-900">
          Analyze Content
        </h1>
      </div>

      {/* Site Scanner Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Scan Your Entire Site (1 Credit)
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Discover all your pages with titles, URLs, and dates. Purchase credits to unlock word counts, affiliate links, and opportunity scores, then choose which ones to analyze.
        </p>
        <SiteUrlInput />
      </div>


      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-medium text-red-900 mb-1">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Analyzing Content</h3>
              <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: progressMessage.includes('complete') ? '100%' : 
                         progressMessage.includes('Generating') ? '80%' :
                         progressMessage.includes('Finding') ? '60%' :
                         progressMessage.includes('Scraping') ? '40%' :
                         progressMessage.includes('Initializing') ? '20%' : '10%'
                }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{progressMessage || 'Processing...'}</p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Signup Prompt for Anonymous Users */}
          {(result.isAnonymous || isAnonymous) && (
            <div className="bg-gradient-to-r from-primary to-purple-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <h3 className="text-xl font-bold">Save Your Results</h3>
                        </div>
                        <p className="text-primary-100 mb-4">
                          Your analysis results are not saved. Sign up now to save this analysis permanently, access it anytime, and get 1 free credit to analyze another page!
                        </p>
                        <div className="flex items-center gap-4">
                          <Link
                            href={`/signup?redirect=${encodeURIComponent(`/dashboard/analyze?url=${encodeURIComponent(result.url)}`)}`}
                            className="px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Sign Up Free
                          </Link>
                          <Link
                            href="/login?redirect=/dashboard/analyze"
                            className="px-6 py-3 bg-white/20 text-white border-2 border-white rounded-lg font-semibold hover:bg-white/30 transition-colors"
                          >
                            Already have an account? Sign In
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Analysis Results
                  </h2>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">URL:</span>
                      <div className="flex items-center gap-2">
                        <a
                          href={result.url.startsWith('http') ? result.url : `https://${result.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-gray-900 break-all hover:text-primary transition-colors"
                        >
                          {result.url}
                        </a>
                        <a
                          href={result.url.startsWith('http') ? result.url : `https://${result.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-600 transition-colors flex-shrink-0"
                          title="Open in new tab"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
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
                              Category
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
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                  {opp.context.substring(0, 100)}...
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {opp.category ? (
                                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                    {mapToStandardCategory(opp.category)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
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
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
                                </svg>
                                <span>Generate Outline</span>
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
  );
}

