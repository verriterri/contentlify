'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { PostSelectionTable } from '@/components/scanner/PostSelectionTable'
import { SmartFilters } from '@/components/scanner/SmartFilters'
import { SelectionSummary } from '@/components/scanner/SelectionSummary'
import { calculateCreditsForAnalysis } from '@/lib/utils/credit-calculator'
import { ClientHeader } from '@/components/ClientHeader'
import { BlogUrlInput } from '@/components/scanner/BlogUrlInput'

interface Post {
  url: string
  title: string
  wordCount: number
  affiliateLinkCount: number
  publishedDate: string | null
  estimatedValue?: number // Total estimated value from analysis
  category?: string // Primary category from analysis
}

interface ScanData {
  blogUrl: string
  totalPosts: number
  scannedPosts: number
  posts: Post[]
  summary: {
    totalWords: number
    avgWordsPerPost: number
    totalAffiliateLinks: number
    underMonetizedCount: number
    postsWithNoAffiliateLinks: number
  }
  method: string
  scannedAt: string
}

export default function ScanResultsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const scanId = params.scanId as string

  const [scanData, setScanData] = useState<ScanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())
  const [chargeExtraPreferences, setChargeExtraPreferences] = useState<Map<string, boolean>>(new Map()) // url -> chargeExtra
  const [globalChargeExtra, setGlobalChargeExtra] = useState<boolean | null>(null) // null = not loaded yet
  const [filters, setFilters] = useState({
    wordCount: 'all' as 'all' | '<500' | '500-1000' | '1000-2000' | '2000+',
    affiliateLinks: 'all' as 'all' | '0-2' | '3-9' | '10+',
    date: 'all' as 'all' | 'last-month' | 'last-6-months' | 'last-year',
    status: 'all' as 'all' | 'not-analyzed' | 'analyzed',
    name: '' as string,
  })
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'most-words' | 'fewest-links' | 'most-links' | 'name-asc' | 'name-desc'>('fewest-links')
  const [userCredits, setUserCredits] = useState<number | null>(null)
  const [freeTrialUsed, setFreeTrialUsed] = useState<boolean>(false)
  const [isUnlockExpanded, setIsUnlockExpanded] = useState<boolean>(false)
  const [isExamplesExpanded, setIsExamplesExpanded] = useState<boolean>(false)

  useEffect(() => {
    loadScanData()
    loadUserCredits()
    loadGlobalPreference()
  }, [scanId, searchParams])

  const loadGlobalPreference = async () => {
    try {
      const response = await fetch('/api/settings/preferences')
      if (response.ok) {
        const data = await response.json()
        setGlobalChargeExtra(data.preferences?.chargeExtraForLongPosts ?? false)
      } else {
        // If not authenticated (401), just use default - this is fine for anonymous users
        setGlobalChargeExtra(false) // Default
      }
    } catch {
      // Silently fail for anonymous users - use default
      setGlobalChargeExtra(false) // Default
    }
  }

  const loadScanData = async () => {
    try {
      // Check if this is a temp scan with data in query params
      if (scanId === 'temp') {
        const dataParam = searchParams?.get('data')
        if (dataParam) {
          try {
            const decodedData = JSON.parse(decodeURIComponent(dataParam))
            setScanData(decodedData)
            setLoading(false)
            return
          } catch (parseError) {
            throw new Error('Invalid scan data')
          }
        } else {
          throw new Error('No scan data provided')
        }
      }

      // Otherwise, fetch from API using scanId
      const response = await fetch(`/api/blog/scan/${scanId}`)
      if (!response.ok) {
        throw new Error('Failed to load scan data')
      }
      const data = await response.json()
      setScanData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load scan data')
    } finally {
      setLoading(false)
    }
  }

  const loadUserCredits = async () => {
    try {
      const response = await fetch('/api/user/credits')
      if (response.ok) {
        const data = await response.json()
        // API returns null for anonymous users, number for logged-in users
        // Important: logged-in users should always get a number (0 or more), never null
        if (data.credits === null) {
          // Anonymous user
          setUserCredits(null)
          setFreeTrialUsed(data.freeTrialUsed || false)
          
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            console.log('[Scan Page] Anonymous user credits loaded:', {
              freeTrialUsed: data.freeTrialUsed,
            })
          }
        } else {
          // Logged-in user - always use a number (0 or more)
          setUserCredits(typeof data.credits === 'number' ? data.credits : 0)
          setFreeTrialUsed(data.freeTrialUsed || false)
        }
      } else {
        // If response is not ok, user is not logged in (anonymous)
        setUserCredits(null)
        setFreeTrialUsed(false)
      }
    } catch (error) {
      // User not logged in or error - set to null to indicate anonymous
      console.error('[Scan Page] Error loading credits:', error)
      setUserCredits(null)
      setFreeTrialUsed(false)
    }
  }

  const handleAnalyzeSelected = async () => {
    if (selectedUrls.size === 0) {
      alert('Please select at least one post to analyze')
      return
    }

    const selectedPosts = scanData?.posts.filter((p) => selectedUrls.has(p.url)) || []
    const isAnonymous = userCredits === null
    const isSinglePost = selectedUrls.size === 1

    // For single post analysis, always use the single post endpoint (better UX - immediate results)
    // This works for both free trial users and users with credits
    if (isSinglePost) {
      const postUrl = Array.from(selectedUrls)[0]
      
      // Check if user can analyze (has credits or can use free trial)
      if (isAnonymous || userCredits === 0) {
        // Free trial: Anonymous users OR logged-in users with 0 credits can analyze 1 post for free
        if (freeTrialUsed) {
          // Free trial already used, require signup
          router.push(`/login?redirect=/scan/${scanId}`)
          return
        }
      } else if (userCredits < 1) {
        // User has credits but less than 1 (shouldn't happen, but handle it)
        router.push(`/pricing?needed=1&have=${userCredits}`)
        return
      }
      
      // Redirect to analyze page - single post analysis shows results immediately
      router.push(`/dashboard/analyze?url=${encodeURIComponent(postUrl)}`)
      return
    }

    // Anonymous user trying to analyze multiple posts - require signup
    if (isAnonymous) {
      router.push(`/login?redirect=/scan/${scanId}`)
      return
    }

    // Logged-in users with credits: Check if they have enough credits

    // Calculate credits needed using per-post preferences
    const totalCredits = selectedPosts.reduce((sum, post) => {
      // Use per-post preference if set, otherwise use global preference
      const chargeExtra = chargeExtraPreferences.has(post.url)
        ? chargeExtraPreferences.get(post.url)!
        : (globalChargeExtra ?? false)
      return sum + calculateCreditsForAnalysis(post.wordCount || 0, chargeExtra)
    }, 0)

    if (userCredits < totalCredits) {
      router.push(`/pricing?needed=${totalCredits}&have=${userCredits}`)
      return
    }

    // Build preferences object for bulk analysis
    const preferences: Record<string, boolean> = {}
    selectedPosts.forEach((post) => {
      const chargeExtra = chargeExtraPreferences.has(post.url)
        ? chargeExtraPreferences.get(post.url)!
        : (globalChargeExtra ?? false)
      preferences[post.url] = chargeExtra
    })

    // Start bulk analysis
    // For temp scans, don't include scanId (it will be null in the API)
    const params = new URLSearchParams()
    if (scanId !== 'temp') {
      params.set('scanId', scanId)
    }
    params.set('posts', Array.from(selectedUrls).join(','))
    params.set('preferences', JSON.stringify(preferences))
    router.push(`/dashboard/analyze/bulk?${params.toString()}`)
  }

  if (loading) {
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

  // Check if user has credits (needed for filtering logic)
  const hasCredits = userCredits !== null && userCredits > 0

  // Apply filters and sorting
  let filteredPosts = [...scanData.posts]

  // Apply name/title filter (works for all users)
  if (filters.name.trim()) {
    const searchTerm = filters.name.toLowerCase().trim()
    filteredPosts = filteredPosts.filter((p) =>
      p.title.toLowerCase().includes(searchTerm) ||
      p.url.toLowerCase().includes(searchTerm)
    )
  }

  // Apply filters (only if user has credits and metadata is available)
  if (hasCredits && filters.wordCount !== 'all') {
    if (filters.wordCount === '<500') {
      filteredPosts = filteredPosts.filter((p) => (p.wordCount || 0) < 500)
    } else if (filters.wordCount === '500-1000') {
      filteredPosts = filteredPosts.filter((p) => (p.wordCount || 0) >= 500 && (p.wordCount || 0) <= 1000)
    } else if (filters.wordCount === '1000-2000') {
      filteredPosts = filteredPosts.filter((p) => (p.wordCount || 0) >= 1000 && (p.wordCount || 0) <= 2000)
    } else if (filters.wordCount === '2000+') {
      filteredPosts = filteredPosts.filter((p) => (p.wordCount || 0) >= 2000)
    }
  }

  if (hasCredits && filters.affiliateLinks !== 'all') {
    if (filters.affiliateLinks === '0-2') {
      filteredPosts = filteredPosts.filter((p) => (p.affiliateLinkCount || 0) <= 2)
    } else if (filters.affiliateLinks === '3-9') {
      filteredPosts = filteredPosts.filter((p) => (p.affiliateLinkCount || 0) >= 3 && (p.affiliateLinkCount || 0) <= 9)
    } else if (filters.affiliateLinks === '10+') {
      filteredPosts = filteredPosts.filter((p) => (p.affiliateLinkCount || 0) >= 10)
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

    filteredPosts = filteredPosts.filter((p) => {
      if (!p.publishedDate) return false
      return new Date(p.publishedDate) >= cutoffDate
    })
  }

  // Apply sorting
  filteredPosts.sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        if (!a.publishedDate || !b.publishedDate) return 0
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
      case 'oldest':
        if (!a.publishedDate || !b.publishedDate) return 0
        return new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
      case 'most-words':
        return (b.wordCount || 0) - (a.wordCount || 0)
      case 'fewest-links':
        return (a.affiliateLinkCount || 0) - (b.affiliateLinkCount || 0)
      case 'most-links':
        return (b.affiliateLinkCount || 0) - (a.affiliateLinkCount || 0)
      case 'name-asc':
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      case 'name-desc':
        return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' })
      default:
        return 0
    }
  })

  // Calculate credits needed for selected posts using per-post preferences
  const selectedPosts = filteredPosts.filter((p) => selectedUrls.has(p.url))
  const creditsNeeded = selectedPosts.reduce((sum, post) => {
    const chargeExtra = chargeExtraPreferences.has(post.url)
      ? chargeExtraPreferences.get(post.url)!
      : (globalChargeExtra ?? false)
    return sum + calculateCreditsForAnalysis(post.wordCount || 0, chargeExtra)
  }, 0)

  // Calculate stats (only if user has credits and data is available)
  const underMonetized = hasCredits ? filteredPosts.filter((p) => (p.wordCount || 0) >= 1500 && (p.affiliateLinkCount || 0) <= 2) : []
  const partiallyMonetized = hasCredits ? filteredPosts.filter((p) => (p.affiliateLinkCount || 0) >= 3 && (p.affiliateLinkCount || 0) <= 9) : []
  const wellMonetized = hasCredits ? filteredPosts.filter((p) => (p.affiliateLinkCount || 0) >= 10) : []
  const shortPosts = hasCredits ? filteredPosts.filter((p) => (p.wordCount || 0) < 800) : []

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientHeader />
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Scan Another Site Box */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Scan Another Site
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Discover all blog posts from another site. Free to scan - see titles, URLs, and dates instantly.
          </p>
          <BlogUrlInput />
          <div className="mt-4">
            <button
              onClick={() => setIsExamplesExpanded(!isExamplesExpanded)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="font-medium">Example URLs</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${isExamplesExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isExamplesExpanded && (
              <div className="mt-2 text-sm text-gray-600 animate-in slide-in-from-top-2 duration-200">
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li>yourblog.com</li>
                  <li>www.yourblog.com</li>
                  <li>https://yourblog.com</li>
                  <li>yourblog.com/posts</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  You can use subdirectories (e.g., /posts) to focus the search on a specific section of your site.
                </p>
              </div>
            )}
          </div>
        </div>

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
                  <li>Word counts for each post</li>
                  <li>Affiliate link analysis</li>
                  <li>Opportunity scores</li>
                  <li>Smart filters (under-monetized, etc)</li>
                  <li>Batch post selection</li>
                </ul>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <p className="text-green-800 font-medium flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    Get 2x credits on your first purchase!
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

        {/* Blog Summary Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{scanData.blogUrl}</h1>
          <div className={`grid grid-cols-2 ${hasCredits ? 'md:grid-cols-6' : 'md:grid-cols-2'} gap-4`}>
            <div>
              <p className="text-sm text-gray-600">Total Posts</p>
              <p className="text-2xl font-bold text-gray-900">{scanData.totalPosts}</p>
            </div>
            {hasCredits && scanData.summary && (
              <>
                <div>
                  <p className="text-sm text-gray-600">Total Words</p>
                  <p className="text-2xl font-bold text-gray-900">{scanData.summary.totalWords.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Words</p>
                  <p className="text-2xl font-bold text-gray-900">{scanData.summary.avgWordsPerPost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Affiliate Links</p>
                  <p className="text-2xl font-bold text-gray-900">{scanData.summary.totalAffiliateLinks}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">No Affiliate Links</p>
                  <p className="text-2xl font-bold text-gray-900">{scanData.summary.postsWithNoAffiliateLinks || 0}</p>
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

        {/* Quick Stats Breakdown (only for users with credits) */}
        {hasCredits && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p className="font-semibold text-gray-900">Under-Monetized</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{underMonetized.length}</p>
            <p className="text-sm text-gray-600">1500+ words, 0-2 links</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="font-semibold text-gray-900">Partially Monetized</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{partiallyMonetized.length}</p>
            <p className="text-sm text-gray-600">3-9 affiliate links</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-semibold text-gray-900">Well Monetized</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{wellMonetized.length}</p>
            <p className="text-sm text-gray-600">10+ affiliate links</p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="font-semibold text-gray-900">Short Posts</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{shortPosts.length}</p>
            <p className="text-sm text-gray-600">&lt;800 words</p>
          </div>

          {scanData.summary && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="font-semibold text-gray-900">No Affiliate Links</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{scanData.summary.postsWithNoAffiliateLinks || 0}</p>
            <p className="text-sm text-gray-600">Posts with 0 links</p>
          </div>
          )}
        </div>
        )}

        {/* Smart Selection Buttons (only for users with credits) */}
        {hasCredits && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => {
              const urls = new Set(underMonetized.map((p) => p.url))
              setSelectedUrls(urls)
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            Select Under-Monetized ({underMonetized.length} posts)
          </button>
          <button
            onClick={() => {
              const sixMonthsAgo = new Date()
              sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
              const recent = filteredPosts.filter((p) => {
                if (!p.publishedDate) return false
                return new Date(p.publishedDate) >= sixMonthsAgo
              })
              setSelectedUrls(new Set(recent.map((p) => p.url)))
            }}
            className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Select Recent Posts (Last 6 Months)
          </button>
          <button
            onClick={() => {
              const long = filteredPosts.filter((p) => p.wordCount >= 1500)
              setSelectedUrls(new Set(long.map((p) => p.url)))
            }}
            className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Select Long Posts (1500+ words)
          </button>
          <button
            onClick={() => {
              const unmonetized = filteredPosts.filter((p) => p.affiliateLinkCount === 0)
              setSelectedUrls(new Set(unmonetized.map((p) => p.url)))
            }}
            className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Select All Unmonetized (0 links)
          </button>
          <button
            onClick={() => setSelectedUrls(new Set(filteredPosts.map((p) => p.url)))}
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

        {/* Filters & Sorting */}
        <SmartFilters
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          hasCredits={hasCredits}
        />

        {/* Post Selection Table */}
        <PostSelectionTable
          posts={filteredPosts}
          selectedUrls={selectedUrls}
          onSelectionChange={setSelectedUrls}
          chargeExtraPreferences={chargeExtraPreferences}
          onChargeExtraChange={setChargeExtraPreferences}
          globalChargeExtra={globalChargeExtra ?? false}
          hasCredits={hasCredits}
        />

        {/* Selection Summary (Sticky Footer) - show for all users */}
        {selectedUrls.size > 0 && (
        <SelectionSummary
          selectedCount={selectedUrls.size}
          selectedPosts={selectedPosts}
          chargeExtraPreferences={chargeExtraPreferences}
          globalChargeExtra={globalChargeExtra ?? false}
          userCredits={userCredits}
          freeTrialUsed={freeTrialUsed}
          onAnalyze={handleAnalyzeSelected}
        />
        )}
        </div>
      </div>
    </div>
  )
}

