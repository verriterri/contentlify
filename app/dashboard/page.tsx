import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Suspense } from 'react'
import { CreditBalance } from '@/components/dashboard/CreditBalance'
import { PurchaseSuccessHandler } from '@/components/dashboard/PurchaseSuccessHandler'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options)
      },
      remove(name: string, options: any) {
        cookieStore.set(name, '', options)
      },
    },
  })
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('credits')
    .eq('id', user.id)
    .single()

  const credits = userData?.credits || 0

  // Get recent analyses
  const { data: recentAnalyses } = await supabase
    .from('content_analyses')
    .select('id, url, title, status, created_at, credits_used')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get total stats
  const { count: totalAnalyses } = await supabase
    .from('content_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('deleted_at', null)

  const { count: totalProducts } = await supabase
    .from('generated_products')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Calculate credits used this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: thisMonthAnalyses } = await supabase
    .from('content_analyses')
    .select('credits_used')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('created_at', startOfMonth.toISOString())

  const creditsUsedThisMonth = thisMonthAnalyses?.reduce((sum, a) => sum + (a.credits_used || 0), 0) || 0

  return (
    <div>
      {/* Handle purchase success - refresh credits after webhook processes */}
      <Suspense fallback={null}>
        <PurchaseSuccessHandler initialCredits={credits} />
      </Suspense>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here's your content monetization summary.</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/dashboard/analyze"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary"
        >
          <div className="flex items-center gap-4">
            <div className="bg-primary-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Analyze New Blog</h3>
              <p className="text-sm text-gray-600">Scan and analyze blog posts</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/products"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary"
        >
          <div className="flex items-center gap-4">
            <div className="bg-primary-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">View Products</h3>
              <p className="text-sm text-gray-600">See your generated outlines</p>
            </div>
          </div>
        </Link>

        <Link
          href="/pricing"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary"
        >
          <div className="flex items-center gap-4">
            <div className="bg-primary-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Buy Credits</h3>
              <p className="text-sm text-gray-600">Purchase analysis credits</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Credit Balance</p>
              <p className="text-2xl font-bold text-gray-900">{credits}</p>
            </div>
            <div className="bg-primary-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Analyses</p>
              <p className="text-2xl font-bold text-gray-900">{totalAnalyses || 0}</p>
            </div>
            <div className="bg-blue-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Products Created</p>
              <p className="text-2xl font-bold text-gray-900">{totalProducts || 0}</p>
            </div>
            <div className="bg-green-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Credits Used (This Month)</p>
              <p className="text-2xl font-bold text-gray-900">{creditsUsedThisMonth}</p>
            </div>
            <div className="bg-purple-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Analyses */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Analyses</h2>
        </div>
        {recentAnalyses && recentAnalyses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentAnalyses.map((analysis) => (
                  <tr key={analysis.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {analysis.title || analysis.url}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {analysis.url}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        analysis.status === 'completed' ? 'bg-green-100 text-green-800' :
                        analysis.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {analysis.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {analysis.credits_used || 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/analyze?analysisId=${analysis.id}`}
                        className="text-primary hover:text-primary-600"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No analyses yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by analyzing your first blog post.</p>
            <div className="mt-6">
              <Link
                href="/dashboard/analyze"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-600"
              >
                Analyze New Blog
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

