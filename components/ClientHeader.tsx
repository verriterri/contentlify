'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { CreditBalance } from '@/components/dashboard/CreditBalance'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { supabase } from '@/lib/supabase'

export function ClientHeader() {
  const { user } = useAuth()
  const [credits, setCredits] = useState(0)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUserData() {
      if (user) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('credits, email')
            .eq('id', user.id)
            .single()

          setCredits(userData?.credits || 0)
          setUserEmail(userData?.email || user.email || '')
        } catch (error) {
          console.error('Error loading user data:', error)
        }
      }
      setLoading(false)
    }

    loadUserData()
  }, [user])

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
            {!loading && user && <CreditBalance credits={credits} />}
            {!loading && user && (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-700 hover:text-primary transition-colors font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/analyze"
                  className="text-sm text-gray-700 hover:text-primary transition-colors font-medium"
                >
                  Analyze Blog
                </Link>
                <Link
                  href="/dashboard/products"
                  className="text-sm text-gray-700 hover:text-primary transition-colors font-medium"
                >
                  My Products
                </Link>
                <span className="text-sm text-gray-600">{userEmail}</span>
                <LogoutButton />
              </div>
            )}
            {!loading && !user && (
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

