'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check session expiration on client side (basic check - full check happens in middleware)
    // Also update last activity by making a lightweight request
    const checkSessionExpiration = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const now = Math.floor(Date.now() / 1000)
        
        // Check if session has expired (expires_at is in seconds)
        const isExpired = session.expires_at && session.expires_at < now
        
        if (isExpired) {
          await supabase.auth.signOut()
          // Reload to trigger redirect
          window.location.href = '/login?sessionExpired=true'
          return
        }
      }
    }

    // Get initial user - getUser() validates with server for better security
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      // Get session for session-specific data if needed
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        checkSessionExpiration()
        setLoading(false)
      })
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session) {
        checkSessionExpiration()
      }
      setLoading(false)
    })

    // Check session expiration periodically (every hour)
    const expirationCheckInterval = setInterval(checkSessionExpiration, 60 * 60 * 1000)

    return () => {
      subscription.unsubscribe()
      clearInterval(expirationCheckInterval)
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

