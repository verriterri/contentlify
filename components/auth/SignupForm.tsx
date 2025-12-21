'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getBrowserFingerprint } from '@/lib/utils/fingerprint'

interface SignupFormProps {
  redirect?: string
}

export function SignupForm({ redirect }: SignupFormProps = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fingerprint, setFingerprint] = useState<string | null>(null)
  const router = useRouter()

  // Collect browser fingerprint on component mount
  useEffect(() => {
    getBrowserFingerprint().then(setFingerprint).catch((err) => {
      console.warn('Failed to get browser fingerprint:', err)
      // Continue without fingerprint - rate limiting will use IP only
    })
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // Check rate limits before allowing signup
      try {
        const rateLimitResponse = await fetch('/api/signup/check-rate-limit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fingerprint: fingerprint || null }),
        })

        if (rateLimitResponse.ok) {
          const rateLimitData = await rateLimitResponse.json()
          if (!rateLimitData.allowed) {
            setError(rateLimitData.reason || 'Signup rate limit exceeded. Please try again later.')
            setLoading(false)
            return
          }
        }
      } catch (rateLimitError) {
        // If rate limit check fails, log but continue with signup (fail open)
        console.warn('Rate limit check failed, proceeding with signup:', rateLimitError)
      }

      // Check if email already exists via server-side API
      try {
        const checkResponse = await fetch('/api/check-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })

        if (checkResponse.ok) {
          const checkData = await checkResponse.json()
          if (checkData.exists) {
            setError('An account with this email already exists. Please sign in instead.')
            setLoading(false)
            return
          }
        }
      } catch (checkError) {
        // If check fails, continue with signup - Supabase will catch duplicates
        console.warn('Email check failed, proceeding with signup:', checkError)
      }
      
      // Proceed with signup
      // Use redirect parameter if provided, otherwise default to dashboard
      const redirectPath = redirect ? decodeURIComponent(redirect) : '/dashboard'
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectPath}`,
        },
      })

      if (error) {
        // Handle specific error cases
        const errorMessage = error.message.toLowerCase()
        if (
          errorMessage.includes('already registered') ||
          errorMessage.includes('already exists') ||
          errorMessage.includes('already been registered') ||
          errorMessage.includes('user already registered') ||
          errorMessage.includes('email address is already registered') ||
          errorMessage.includes('user with this email already exists')
        ) {
          setError('An account with this email already exists. Please sign in instead.')
        } else if (errorMessage.includes('invalid email')) {
          setError('Please enter a valid email address.')
        } else {
          // Log the actual error to help debug
          console.error('Supabase signup error:', error)
          setError(error.message || 'An error occurred during signup')
        }
        setLoading(false)
        return
      }

      // Check if user was created successfully
      if (!data.user) {
        setError('Failed to create account. Please try again.')
        setLoading(false)
        return
      }

      // Track signup attempt with device/IP (non-blocking)
      try {
        await fetch('/api/signup/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: data.user.id,
            email: email,
            fingerprint: fingerprint || null,
          }),
        })
      } catch (trackError) {
        // Don't fail signup if tracking fails
        console.warn('Failed to track signup attempt:', trackError)
      }

      // Check if this is an existing user by checking email_confirmed_at
      // If email_confirmed_at is already set, this is an existing account
      if (data.user.email_confirmed_at) {
        setError('An account with this email already exists. Please sign in instead.')
        setLoading(false)
        return
      }

      // Check if email confirmation is required (no session returned)
      if (data.user && !data.session) {
        // Email confirmation required - show success message
        setSuccess(true)
        setError(null)
        setLoading(false)
        return
      }

      // If session exists, user is logged in immediately (email confirmation disabled)
      if (data.session) {
        setSuccess(true)
        setLoading(false)
        // Validate user with server - getUser() ensures session is validated
        await supabase.auth.getUser()
        
        // Small delay to ensure cookies are set
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Use window.location for a full page reload to ensure middleware picks up cookies
        // Redirect to specified path or default to dashboard
        const redirectPath = redirect ? decodeURIComponent(redirect) : '/dashboard'
        window.location.href = redirectPath
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      const errorMessage = error.message?.toLowerCase() || ''
      if (
        errorMessage.includes('already registered') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('invalid login')
      ) {
        setError('An account with this email already exists. Please sign in instead.')
      } else {
        setError(error.message || 'An error occurred during signup')
      }
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-center">
          <p className="font-medium">Account created successfully!</p>
          <p className="text-sm mt-1">
            Please check your email to confirm your account. You can sign in after confirmation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSignup} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="you@example.com"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="••••••••"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="••••••••"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-primary hover:text-primary-600 font-medium">
            Sign in
          </a>
        </p>
      </form>
    </div>
  )
}
