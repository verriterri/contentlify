'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { SiteUrlInput } from '@/components/scanner/SiteUrlInput';
import { Results } from '@/components/analysis/Results';
import { PostSelectionTable } from '@/components/scanner/PostSelectionTable';
import { SmartFilters } from '@/components/scanner/SmartFilters';
import { SelectionSummary } from '@/components/scanner/SelectionSummary';
import { calculateCreditsForAnalysis } from '@/lib/utils/credit-calculator';
import { useAuth } from '@/components/auth/AuthProvider';

interface AnalysisResult {
  success: boolean;
  analysisId: string | null;
  url: string;
  title: string;
  wordCount: number;
  creditsUsed?: number;
  linkDetails?: any[];
  affiliateOpportunities: any[];
  productIdeas: any[];
  seoAudit?: any;
  crossInsights?: string[];
  warnings?: string[];
  isAnonymous?: boolean;
  isFreeTrial?: boolean;
}

interface Page {
  url: string;
  title: string;
  wordCount: number;
  publishedDate: string | null;
  estimatedValue?: number;
  category?: string;
  lastAnalyzedAt?: string | null;
  analysisId?: string | null;
}

interface ScanData {
  siteUrl: string;
  totalPages: number;
  scannedPages: number;
  pages: Page[];
  summary: {
    totalWords: number;
    avgWordsPerPage: number;
  };
  method: string;
  scannedAt: string;
}

export default function AnalyzePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  // Get scanId from query params
  const scanIdParam = searchParams?.get('scanId');
  const urlParam = searchParams?.get('url');
  const analysisIdParam = searchParams?.get('analysisId');
  const forceReanalyze = searchParams?.get('force') === 'true';

  // Single page analysis state
  const [url, setUrl] = useState('');
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  const [isManualAnalyze, setIsManualAnalyze] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSinglePageExpanded, setIsSinglePageExpanded] = useState(false);
  const [isSiteScanExpanded, setIsSiteScanExpanded] = useState(false);

  // Scan results state
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [loadingScan, setLoadingScan] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [chargeExtraPreferences, setChargeExtraPreferences] = useState<Map<string, boolean>>(new Map());
  const [primaryKeywords, setPrimaryKeywords] = useState<Map<string, string>>(new Map());
  const [globalChargeExtra, setGlobalChargeExtra] = useState<boolean | null>(null);
  const [filters, setFilters] = useState({
    wordCount: 'all' as 'all' | '<500' | '500-1000' | '1000-2000' | '2000+' | '<800' | '1500+',
    date: 'all' as 'all' | 'last-month' | 'last-6-months' | 'last-year',
    status: 'all' as 'all' | 'not-analyzed' | 'analyzed',
    name: '' as string,
  });
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'most-words' | 'least-words' | 'name-asc' | 'name-desc'>('recent');
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [isUnlockExpanded, setIsUnlockExpanded] = useState<boolean>(false);

  // Determine if we're in scan mode
  const isScanMode = !!scanIdParam;

  // Reset state when navigating to analyze page without query params
  useEffect(() => {
    if (!scanIdParam && !analysisIdParam && !urlParam) {
      // Reset all state when navigating to clean analyze page
      setResult(null);
      setError(null);
      setHasAutoTriggered(false);
      setScanData(null);
      setSelectedUrls(new Set());
      setChargeExtraPreferences(new Map());
      setPrimaryKeywords(new Map());
      setUrl('');
      setPrimaryKeyword('');
      setIsManualAnalyze(false);
    }
  }, [scanIdParam, analysisIdParam, urlParam]);

  // Load scan data if scanId is present
  useEffect(() => {
    if (scanIdParam) {
      loadScanData();
      loadUserCredits();
      loadGlobalPreference();
    } else {
      // Clear scan data when scanId is removed
      setScanData(null);
      setSelectedUrls(new Set());
      setChargeExtraPreferences(new Map());
      setPrimaryKeywords(new Map());
    }
  }, [scanIdParam]);

  const loadGlobalPreference = async () => {
    try {
      const response = await fetch('/api/settings/preferences');
      if (response.ok) {
        const data = await response.json();
        setGlobalChargeExtra(data.preferences?.chargeExtraForLongPages ?? false);
      } else {
        setGlobalChargeExtra(false);
      }
    } catch {
      setGlobalChargeExtra(false);
    }
  };

  const loadScanData = async () => {
    setLoadingScan(true);
    try {
      if (scanIdParam === 'temp') {
        const dataParam = searchParams?.get('data');
        if (dataParam) {
          try {
            const decodedData = JSON.parse(decodeURIComponent(dataParam));
            setScanData(decodedData);
            setLoadingScan(false);
            return;
          } catch (parseError) {
            throw new Error('Invalid scan data');
          }
        } else {
          throw new Error('No scan data provided');
        }
      }

      const response = await fetch(`/api/site/scan/${scanIdParam}`);
      if (!response.ok) {
        throw new Error('Failed to load scan data');
      }
      const data = await response.json();
      setScanData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load scan data');
    } finally {
      setLoadingScan(false);
    }
  };

  const loadUserCredits = async () => {
    try {
      const response = await fetch('/api/user/credits');
      if (response.ok) {
        const data = await response.json();
        if (data.credits === null) {
          setUserCredits(null);
        } else {
          setUserCredits(typeof data.credits === 'number' ? data.credits : 0);
        }
      } else {
        setUserCredits(null);
      }
    } catch (error) {
      console.error('[Analyze] Error loading credits:', error);
      setUserCredits(null);
    }
  };

  // Get user tier and load history for single page analysis
  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAnonymous(false);
      } else {
        setIsAnonymous(true);
        try {
          const creditsResponse = await fetch('/api/user/credits');
          if (creditsResponse.ok) {
            const creditsData = await creditsResponse.json();
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
        seoAudit: analysis.seo_audit || null,
        crossInsights: [],
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
      if (isScanMode) return; // Don't auto-trigger if we're in scan mode
      
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
          const { data: { user } } = await supabase.auth.getUser();
          const userIsAnonymous = !user;
          const isFromScan = !!scanIdParam;
          
          if (result && result.url === decodedUrl && !forceReanalyze && !isFromScan) {
            return;
          }
          
          const sessionKey = `analyzed_${decodedUrl}`;
          const alreadyAnalyzed = sessionStorage.getItem(sessionKey);
          
          if (!userIsAnonymous && user && !isManualAnalyze && !forceReanalyze && !isFromScan) {
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
                return;
              }
            } catch (error) {
              console.error('[Analyze] Error checking for existing analysis:', error);
            }
          }
          
          if (userIsAnonymous) {
            const cacheKey = `analysis_${decodedUrl}`;
            const cachedResult = sessionStorage.getItem(cacheKey);
            
            if (cachedResult) {
              try {
                const parsedResult = JSON.parse(cachedResult);
                setResult(parsedResult);
                return;
              } catch (error) {
                console.error('Error parsing cached result:', error);
              }
            }
            
            try {
              const creditsResponse = await fetch('/api/user/credits');
              if (creditsResponse.ok) {
                const creditsData = await creditsResponse.json();
                if (creditsData.credits === 0) {
                  setError('Insufficient credits. Please purchase credits to continue analyzing.');
                  return;
                }
              }
            } catch (error) {
              console.error('Error checking free trial status:', error);
            }
          }
          
          if (isFromScan || forceReanalyze || (!alreadyAnalyzed && !result)) {
            setTimeout(() => {
              handleAnalyze(decodedUrl).catch((error) => {
                console.error('[Analyze] Error in auto-triggered handleAnalyze:', error);
                setError(error.message || 'Failed to start analysis');
                setLoading(false);
              });
            }, 100);
          }
        }
      }
    }
    
    if (!isScanMode) {
      autoTriggerAnalysis();
    }
  }, [searchParams, hasAutoTriggered, result, isScanMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnalyze = async (urlOverride?: string, isManual: boolean = false) => {
    const urlToAnalyze = urlOverride || url;
    if (!urlToAnalyze.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (isManual) {
      setIsManualAnalyze(true);
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgressMessage('Initializing analysis...');

    try {
      setProgressMessage('Scraping URL and extracting content...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5 * 60 * 1000);
      
      let response: Response;
      try {
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url: urlToAnalyze,
            primaryKeyword: primaryKeyword.trim() || undefined,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. The analysis may still be processing. Please check your History page in a few moments.');
        }
        throw fetchError;
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          const text = await response.text();
          throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
        }
        
        if (errorData.limitReached) {
          throw new Error(errorData.error);
        }
        if (errorData.requiresAuth || errorData.requiresSignup) {
          // User needs to sign up
        }
        throw new Error(errorData.error || 'Failed to analyze URL');
      }

      const data = await response.json();

      if (!data || !data.success) {
        throw new Error('Invalid response from server');
      }
      
      // Dispatch event to update credits in header
      window.dispatchEvent(new CustomEvent('credits-updated'))
      
      if (data.isAnonymous !== undefined) {
        setIsAnonymous(data.isAnonymous);
      }
      
      setProgressMessage('Finding affiliate opportunities...');
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgressMessage('Generating product ideas...');

      const analysisResult = {
        success: data.success,
        analysisId: data.analysisId || null,
        url: data.url,
        title: data.title || 'Untitled',
        wordCount: data.wordCount || 0,
        creditsUsed: data.creditsUsed || 0,
        linkDetails: data.linkDetails || [],
        seoAudit: data.seoAudit || null,
        crossInsights: data.crossInsights || [],
        affiliateOpportunities: data.affiliateOpportunities || [],
        productIdeas: data.productIdeas || [],
        warnings: data.warnings || [],
        isAnonymous: data.isAnonymous ?? isAnonymous,
        isFreeTrial: data.isFreeTrial ?? false,
      };
      
      setError(null);
      setResult(analysisResult);
      setLoading(false);
      setProgressMessage('');
      
      try {
        const sessionKey = `analyzed_${urlToAnalyze}`;
        sessionStorage.setItem(sessionKey, 'true');
      } catch (error) {
        console.error('Error marking URL as analyzed:', error);
      }
      
      if (data.isAnonymous || isAnonymous) {
        try {
          const cacheKey = `analysis_${urlToAnalyze}`;
          sessionStorage.setItem(cacheKey, JSON.stringify(analysisResult));
        } catch (error) {
          console.error('Error caching analysis result:', error);
        }
      }
    } catch (err: any) {
      let errorMessage = err.message || 'An error occurred';
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        errorMessage = 'Request was cancelled. Please try again.';
      } else if (err.message?.includes('timeout') || err.message?.includes('Timeout')) {
        errorMessage = 'Request timed out. The analysis may still be processing. Checking for completed analysis...';
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
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
              return;
            }
          }
        } catch (dbError) {
          console.error('[Analyze] Error checking database for completed analysis:', dbError);
        }
      } else if (err.message?.includes('JSON')) {
        errorMessage = 'Invalid response from server. The analysis may still be processing. Please check your History page.';
      }
      
      setError(errorMessage);
      setLoading(false);
      setProgressMessage('');
    }
  };

  const handleAnalyzeSelected = async () => {
    if (selectedUrls.size === 0) {
      alert('Please select at least one page to analyze');
      return;
    }

    const selectedPages = scanData?.pages.filter((p) => selectedUrls.has(p.url)) || [];
    const isAnonymous = userCredits === null;
    const isSinglePage = selectedUrls.size === 1;

    if (isSinglePage) {
      const pageUrl = Array.from(selectedUrls)[0];
      
      if (isAnonymous || userCredits === 0) {
        router.push(`/login?redirect=/dashboard/analyze?scanId=${scanIdParam}`)
        return;
      } else if (userCredits < 1) {
        router.push(`/pricing?needed=1&have=${userCredits}`)
        return;
      }
      
      router.push(`/dashboard/analyze?url=${encodeURIComponent(pageUrl)}&scanId=${scanIdParam}`)
      return;
    }

    if (isAnonymous) {
      router.push(`/login?redirect=/dashboard/analyze?scanId=${scanIdParam}`)
      return;
    }

    const totalCredits = selectedPages.reduce((sum, page) => {
      const chargeExtra = chargeExtraPreferences.has(page.url)
        ? chargeExtraPreferences.get(page.url)!
        : (globalChargeExtra ?? false)
      return sum + calculateCreditsForAnalysis(page.wordCount || 0, chargeExtra)
    }, 0)

    if (userCredits < totalCredits) {
      router.push(`/pricing?needed=${totalCredits}&have=${userCredits}`)
      return
    }

    const preferences: Record<string, { chargeExtra: boolean; primaryKeyword?: string }> = {}
    selectedPages.forEach((page) => {
      const chargeExtra = chargeExtraPreferences.has(page.url)
        ? chargeExtraPreferences.get(page.url)!
        : (globalChargeExtra ?? false)
      const primaryKeyword = primaryKeywords.get(page.url)?.trim() || undefined
      preferences[page.url] = { chargeExtra, primaryKeyword }
    })

    const params = new URLSearchParams()
    if (scanIdParam !== 'temp') {
      params.set('scanId', scanIdParam!)
    }
    params.set('pages', Array.from(selectedUrls).join(','))
    params.set('preferences', JSON.stringify(preferences))
    router.push(`/dashboard/analyze/bulk?${params.toString()}`)
  };

  // Filter and sort pages for scan results
  const hasCredits = userCredits !== null && userCredits > 0;
  let filteredPages = scanData ? [...scanData.pages] : [];

  if (scanData) {
    if (filters.name.trim()) {
      const searchTerm = filters.name.toLowerCase().trim();
      filteredPages = filteredPages.filter((p) =>
        p.title.toLowerCase().includes(searchTerm) ||
        p.url.toLowerCase().includes(searchTerm)
      );
    }

    if (hasCredits && filters.wordCount !== 'all') {
      if (filters.wordCount === '<500') {
        filteredPages = filteredPages.filter((p) => (p.wordCount || 0) < 500)
      } else if (filters.wordCount === '<800') {
        filteredPages = filteredPages.filter((p) => (p.wordCount || 0) < 800)
      } else if (filters.wordCount === '500-1000') {
        filteredPages = filteredPages.filter((p) => (p.wordCount || 0) >= 500 && (p.wordCount || 0) <= 1000)
      } else if (filters.wordCount === '1000-2000') {
        filteredPages = filteredPages.filter((p) => (p.wordCount || 0) >= 1000 && (p.wordCount || 0) <= 2000)
      } else if (filters.wordCount === '1500+') {
        filteredPages = filteredPages.filter((p) => (p.wordCount || 0) >= 1500)
      } else if (filters.wordCount === '2000+') {
        filteredPages = filteredPages.filter((p) => (p.wordCount || 0) >= 2000)
      }
    }

    if (filters.date !== 'all') {
      const now = new Date()
      let cutoffDate: Date
      if (filters.date === 'last-month') {
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      } else if (filters.date === 'last-6-months') {
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      } else {
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      }

      filteredPages = filteredPages.filter((p) => {
        if (!p.publishedDate) return false
        return new Date(p.publishedDate) >= cutoffDate
      })
    }

    if (filters.status !== 'all') {
      if (filters.status === 'analyzed') {
        filteredPages = filteredPages.filter((p) => p.analysisId !== null && p.analysisId !== undefined)
      } else if (filters.status === 'not-analyzed') {
        filteredPages = filteredPages.filter((p) => !p.analysisId || p.analysisId === null)
      }
    }

    filteredPages.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          if (!a.publishedDate || !b.publishedDate) return 0
          return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
        case 'oldest':
          if (!a.publishedDate || !b.publishedDate) return 0
          return new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
        case 'most-words':
          return (b.wordCount || 0) - (a.wordCount || 0)
        case 'least-words':
          return (a.wordCount || 0) - (b.wordCount || 0)
        case 'name-asc':
          return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        case 'name-desc':
          return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' })
        default:
          return 0
      }
    })
  }

  const selectedPages = filteredPages.filter((p) => selectedUrls.has(p.url))
  const creditsNeeded = selectedPages.reduce((sum, page) => {
    const chargeExtra = chargeExtraPreferences.has(page.url)
      ? chargeExtraPreferences.get(page.url)!
      : (globalChargeExtra ?? false)
    return sum + calculateCreditsForAnalysis(page.wordCount || 0, chargeExtra)
  }, 0)

  const allPages = scanData?.pages || []
  const shortPages = hasCredits ? allPages.filter((p) => (p.wordCount || 0) < 800) : []

  // Render scan results view
  if (isScanMode) {
    if (loadingScan) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Loading scan results...</p>
          </div>
        </div>
      )
    }

    if (error || !scanData) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Scan not found'}</p>
            <button
              onClick={() => router.push('/dashboard/analyze')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600"
            >
              Start New Scan
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={`${selectedUrls.size > 0 ? 'pb-40' : ''}`}>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Scan Results
        </h1>

        {/* Upgrade Prompt for Users Without Credits */}
        {!hasCredits && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg mb-6 overflow-hidden">
            <button
              onClick={() => setIsUnlockExpanded(!isUnlockExpanded)}
              className="w-full p-6 flex items-center gap-4 hover:bg-blue-100 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-xl font-bold text-blue-900">Unlock Full Analysis</h2>
              </div>
              <div className="flex-shrink-0">
                <svg
                  className={`w-6 h-6 text-blue-600 transition-transform duration-200 ${isUnlockExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {isUnlockExpanded && (
              <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                <p className="text-blue-800 mb-3">
                  Purchase credits to see:
                </p>
                <ul className="list-disc list-inside text-blue-700 mb-4 space-y-1">
                  <li>Word counts for each page</li>
                  <li>Opportunity scores</li>
                  <li>Smart filters</li>
                  <li>Batch page selection</li>
                </ul>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <p className="text-green-800 font-medium flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    Get 20% more credits on your first purchase!
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    One-time offer
                  </p>
                </div>
                <a
                  href="/pricing"
                  className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
                >
                  View Pricing
                </a>
              </div>
            )}
          </div>
        )}

        {/* Site Summary Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{scanData.siteUrl}</h1>
          <div className={`grid grid-cols-2 ${hasCredits ? 'md:grid-cols-5' : 'md:grid-cols-2'} gap-4`}>
            <div>
              <p className="text-sm text-gray-600">Total Pages</p>
              <p className="text-2xl font-bold text-gray-900">{scanData.totalPages}</p>
            </div>
            {hasCredits && scanData.summary && (
              <>
                <div>
                  <p className="text-sm text-gray-600">Total Words</p>
                  <p className="text-2xl font-bold text-gray-900">{scanData.summary.totalWords.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Words</p>
                  <p className="text-2xl font-bold text-gray-900">{scanData.summary.avgWordsPerPage.toLocaleString()}</p>
                </div>
              </>
            )}
            <div>
              <p className="text-sm text-gray-600">Scan Date</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(scanData.scannedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Sorting */}
        <SmartFilters
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          hasCredits={hasCredits}
          categoryCounts={hasCredits ? {
            shortPages: shortPages.length,
          } : undefined}
        />

        {/* Smart Selection Buttons (only for users with credits) */}
        {hasCredits && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => {
                const sixMonthsAgo = new Date()
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
                const recent = filteredPages.filter((p) => {
                  if (!p.publishedDate) return false
                  return new Date(p.publishedDate) >= sixMonthsAgo
                })
                setSelectedUrls(new Set(recent.map((p) => p.url)))
              }}
              className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Select Recent Pages (Last 6 Months)
            </button>
            <button
              onClick={() => {
                const long = filteredPages.filter((p) => p.wordCount >= 1500)
                setSelectedUrls(new Set(long.map((p) => p.url)))
              }}
              className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Select Long Pages (1500+ words)
            </button>
            <button
              onClick={() => setSelectedUrls(new Set(filteredPages.map((p) => p.url)))}
              className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedUrls(new Set())}
              className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Deselect All
            </button>
          </div>
        )}

        {/* Page Selection Table */}
        <PostSelectionTable
          posts={filteredPages}
          selectedUrls={selectedUrls}
          onSelectionChange={setSelectedUrls}
          chargeExtraPreferences={chargeExtraPreferences}
          onChargeExtraChange={setChargeExtraPreferences}
          globalChargeExtra={globalChargeExtra ?? false}
          hasCredits={hasCredits}
          primaryKeywords={primaryKeywords}
          onPrimaryKeywordsChange={setPrimaryKeywords}
        />

        {/* Selection Summary (Sticky Footer) */}
        {selectedUrls.size > 0 && (
          <SelectionSummary
            selectedCount={selectedUrls.size}
            selectedPosts={selectedPages}
            chargeExtraPreferences={chargeExtraPreferences}
            globalChargeExtra={globalChargeExtra ?? false}
            userCredits={userCredits}
            onAnalyze={handleAnalyzeSelected}
          />
        )}
      </div>
    )
  }

  // Render single page analysis view
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Analyze Content
      </h1>

      {/* Site Scanner Section - Only show when not viewing an existing analysis */}
      {!result && !analysisIdParam && (
        <>
          <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
            <button
              onClick={() => setIsSiteScanExpanded(!isSiteScanExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  Scan Your Entire Site
                </h2>
              </div>
              <svg
                className={`w-6 h-6 text-gray-600 transition-transform duration-200 ${isSiteScanExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isSiteScanExpanded && (
              <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                <p className="text-sm text-gray-600 mb-4">
                  Discover all your pages with titles, URLs, and dates. Purchase credits to unlock word counts, affiliate links, and opportunity scores, then choose which ones to analyze.
                </p>
                <SiteUrlInput />
              </div>
            )}
          </div>

          {/* Single Page Analysis Section */}
          <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
            <button
              onClick={() => setIsSinglePageExpanded(!isSinglePageExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  Analyze a Single Page
                </h2>
              </div>
              <svg
                className={`w-6 h-6 text-gray-600 transition-transform duration-200 ${isSinglePageExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isSinglePageExpanded && (
              <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                <p className="text-sm text-gray-600 mb-4">
                  Enter a URL and optionally specify your primary keyword for SEO optimization analysis.
                </p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                      Page URL
                    </label>
                    <input
                      type="text"
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/page"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label htmlFor="primaryKeyword" className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Keyword (Optional)
                    </label>
                    <input
                      type="text"
                      id="primaryKeyword"
                      value={primaryKeyword}
                      onChange={(e) => setPrimaryKeyword(e.target.value)}
                      placeholder="e.g., pottery classes, ceramics studio"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={loading}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      The main keyword you want this page to rank for. Used for SEO audit checks.
                    </p>
                  </div>
                  <button
                    onClick={() => handleAnalyze(undefined, true)}
                    disabled={loading || !url.trim()}
                    className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Analyzing...' : 'Analyze Page'}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Costs 1 credit • Larger pages will take longer to process.
                </p>
              </div>
            )}
          </div>
        </>
      )}

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
                    Your analysis results are not saved. Sign up now to save this analysis permanently, access it anytime, and get 3 free credits to analyze more pages!
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

          {/* Results Component with Tabs */}
          <Results
            analysis={{
              analysisId: result.analysisId || '',
              url: result.url,
              title: result.title,
              wordCount: result.wordCount,
              creditsUsed: result.creditsUsed || 0,
              linkDetails: result.linkDetails || [],
              affiliateOpportunities: result.affiliateOpportunities || [],
              productIdeas: result.productIdeas || [],
              seoAudit: result.seoAudit,
              crossInsights: result.crossInsights,
            }}
          />
        </div>
      )}
    </div>
  );
}
