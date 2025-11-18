'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface PurchaseSuccessHandlerProps {
  initialCredits: number
}

export function PurchaseSuccessHandler({ initialCredits }: PurchaseSuccessHandlerProps) {
  const router = useRouter()
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
    const maxPolls = 20 // Poll for up to 20 seconds (20 attempts * 1 second)
    
    const pollCredits = async () => {
      try {
        const response = await fetch('/api/user/credits')
        if (response.ok) {
          const data = await response.json()
          const newCredits = data.credits || 0
          
          // If credits have increased, stop polling and refresh page after a moment
          if (newCredits > initialCredits) {
            setPolling(false)
            // Wait a moment to show success message, then refresh
            setTimeout(() => {
              router.refresh()
            }, 2000)
            return
          }
        }
      } catch (error) {
        console.error('Error polling credits:', error)
      }
      
      pollCount++
      if (pollCount < maxPolls && polling) {
        // Poll every second
        setTimeout(pollCredits, 1000)
      } else {
        setPolling(false)
        // If we've polled max times, refresh anyway (webhook might have processed)
        setTimeout(() => {
          router.refresh()
        }, 1000)
      }
    }

    // Start polling after a short delay to allow webhook to process
    const timeout = setTimeout(() => {
      pollCredits()
    }, 1000)

    return () => {
      clearTimeout(timeout)
    }
  }, [initialCredits, polling, router, purchaseSuccess])

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

