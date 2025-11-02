import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { LogoutButton } from '@/components/auth/LogoutButton'

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <LogoutButton />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">
            Welcome to your dashboard! This is a protected route.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Email: {user.email}
          </p>
        </div>
      </div>
    </div>
  )
}

