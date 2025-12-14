'use client'

import { useEffect, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
  const searchParams = useSearchParams()
  const sessionExpired = searchParams?.get('sessionExpired') === 'true'

  useEffect(() => {
    // Only clear stale session data if we're here because of an actual expiration
    // Don't clear sessions if the user is just visiting the login page normally
    const clearStaleSession = async () => {
      // Only clear if sessionExpired is true in the URL
      if (!sessionExpired) {
        return
      }
      
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
        
        // Clear any stale tracking cookies
        document.cookie = 'session_started_at=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'last_activity=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      } catch (error) {
        // Silently fail - just try to clear
        console.error('Error clearing stale session:', error)
      }
    }
    
    clearStaleSession()
  }, [sessionExpired])

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
          <div className="flex justify-center mb-4">
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt="Contentlify"
                width={150}
                height={50}
                className="h-12 w-auto"
                priority
              />
            </Link>
          </div>
          <h2 className="text-center text-2xl font-semibold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Start monetizing your content today
          </p>
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-primary hover:text-primary-600 font-medium"
            >
              ← Back to home
            </Link>
          </div>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  )
}

