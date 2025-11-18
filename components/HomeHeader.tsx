import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { CreditBalance } from '@/components/dashboard/CreditBalance'

export async function HomeHeader() {
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

  // Get user credits and email (only if user exists)
  let credits = 0
  let userEmail = ''
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('credits, email')
      .eq('id', user.id)
      .single()

    credits = userData?.credits || 0
    userEmail = userData?.email || user.email || ''
  }

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              ContentMaxer
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user && <CreditBalance credits={credits} />}
            {user && (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-sm text-gray-600">{userEmail}</span>
                <LogoutButton />
              </div>
            )}
            {!user && (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



