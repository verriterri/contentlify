'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { CreditBalance } from './CreditBalance'
import { supabase } from '@/lib/supabase'

/**
 * Client component that fetches and updates credit balance
 * Listens for 'credits-updated' events to refresh the balance
 */
export function CreditBalanceUpdater() {
  const { user } = useAuth()
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadCredits = useCallback(async () => {
    if (user) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('credits')
          .eq('id', user.id)
          .single()

        setCredits(userData?.credits || 0)
      } catch (error) {
        console.error('Error loading credits:', error)
      }
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadCredits()
  }, [loadCredits])

  // Listen for credit update events
  useEffect(() => {
    const handleCreditsUpdate = () => {
      if (user) {
        loadCredits()
      }
    }

    window.addEventListener('credits-updated', handleCreditsUpdate)
    return () => {
      window.removeEventListener('credits-updated', handleCreditsUpdate)
    }
  }, [user, loadCredits])

  if (loading || !user) {
    return null
  }

  return <CreditBalance credits={credits} />
}

