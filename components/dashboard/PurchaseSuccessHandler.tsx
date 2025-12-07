'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface PurchaseSuccessHandlerProps {
  initialCredits: number
}

export function PurchaseSuccessHandler({ initialCredits }: PurchaseSuccessHandlerProps) {
  const searchParams = useSearchParams()
  const purchaseSuccess = searchParams?.get('purchase') === 'success'
  
  const [showSuccess, setShowSuccess] = useState(purchaseSuccess)
  const [polling, setPolling] = useState(purchaseSuccess)

  useEffect(() => {
    // Only poll if we have a purchase success parameter
    if (!purchaseSuccess) {
      return
    }
    let pollCount = 0
    const maxPolls = 30 // Poll for up to 30 seconds (30 attempts * 1 second)
    let pollTimeout: NodeJS.Timeout | null = null
    
    const pollCredits = async () => {
      try {
        const response = await fetch('/api/user/credits')
        if (response.ok) {
          const data = await response.json()
          const newCredits = data.credits || 0
          
          // If credits have changed (increased), stop polling and reload page immediately
          // Check for any change, not just increase, in case of edge cases
          if (newCredits !== initialCredits) {
            setPolling(false)
            if (pollTimeout) clearTimeout(pollTimeout)
            // Reload page to show updated credits everywhere (remove query param first)
            const url = new URL(window.location.href)
            url.searchParams.delete('purchase')
            window.location.href = url.toString()
            return
          }
        }
      } catch (error) {
        console.error('Error polling credits:', error)
      }
      
      pollCount++
      if (pollCount < maxPolls && polling) {
        // Poll every second
        pollTimeout = setTimeout(pollCredits, 1000)
      } else {
        setPolling(false)
        // If we've polled max times, reload anyway (webhook might have processed)
        // Remove the purchase parameter so we don't poll again
        const url = new URL(window.location.href)
        url.searchParams.delete('purchase')
        window.location.href = url.toString()
      }
    }

    // Start polling immediately (webhook should be fast)
    pollTimeout = setTimeout(pollCredits, 500)

    return () => {
      if (pollTimeout) clearTimeout(pollTimeout)
    }
  }, [initialCredits, polling, purchaseSuccess])

  if (!showSuccess || !purchaseSuccess) {
    return null
  }

  return (
    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium text-green-900">Purchase Successful!</p>
          </div>
        </div>
        <button
          onClick={() => setShowSuccess(false)}
          className="text-green-600 hover:text-green-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

