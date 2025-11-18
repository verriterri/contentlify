'use client'

import { useEffect, Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
  const searchParams = useSearchParams()
  const sessionExpired = searchParams?.get('sessionExpired') === 'true'

  useEffect(() => {
    // Clear any stale session data when landing on login page
    // This helps if there are expired sessions causing issues
    const clearStaleSession = async () => {
      try {
        // Check if there's a session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const now = Math.floor(Date.now() / 1000)
          // If session is expired, clear it
          if (session.expires_at && session.expires_at < now) {
            await supabase.auth.signOut()
          }
        }
      } catch (error) {
        // Silently fail - just try to clear
        console.error('Error clearing stale session:', error)
      }
    }
    
    clearStaleSession()
  }, [])

  return (
    <>
      {sessionExpired && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          Your session has expired for security reasons. Please sign in again.
        </div>
      )}
      <LoginForm />
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-4xl font-bold text-primary mb-2">
            ContentMaxer
          </h1>
          <h2 className="text-center text-2xl font-semibold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Start monetizing your content today
          </p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  )
}

