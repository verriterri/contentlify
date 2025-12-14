import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase'

/**
 * POST /api/admin/fix-subscription
 * Admin endpoint to manually process a purchase if webhook failed
 * This is a fallback for when webhooks don't process correctly
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()

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
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's most recent pending or completed purchase
    const { data: purchases, error: purchaseError } = await supabase
      .from('credit_purchases')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (purchaseError || !purchases || purchases.length === 0) {
      return NextResponse.json(
        { error: 'No purchases found' },
        { status: 404 }
      )
    }

    const purchase = purchases[0]

    // If purchase is already completed, just return current credits
    if (purchase.status === 'completed') {
      const { data: userData } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single()

      return NextResponse.json({
        message: 'Purchase already processed',
        credits: userData?.credits || 0,
      })
    }

    // Check Stripe session status
    if (!purchase.stripe_session_id) {
      return NextResponse.json(
        { error: 'No Stripe session ID found' },
        { status: 400 }
      )
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(purchase.stripe_session_id)

      // If session is completed but purchase is still pending, process it
      if (session.payment_status === 'paid' && purchase.status === 'pending') {
        const credits = purchase.amount
        const metadata = session.metadata || {}

        // Get user data
        const { data: userData } = await supabase
          .from('users')
          .select('credits, has_made_first_purchase')
          .eq('id', user.id)
          .single()

        if (!userData) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }

        // Check if this is the first purchase (first purchase bonus: 20% more credits)
        const isFirstPurchase = !userData.has_made_first_purchase
        const creditsToAdd = isFirstPurchase ? Math.floor(credits * 1.2) : credits
        const newCredits = (userData.credits || 0) + creditsToAdd

        // Update user credits
        const { error: creditError } = await supabase
          .from('users')
          .update({
            credits: newCredits,
            has_made_first_purchase: true,
          })
          .eq('id', user.id)

        if (creditError) {
          console.error('[Fix Purchase] Error updating credits:', creditError)
          return NextResponse.json(
            { error: 'Failed to update credits', details: creditError.message },
            { status: 500 }
          )
        }

        // Update purchase status
        await supabase
          .from('credit_purchases')
          .update({
            status: 'completed',
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq('id', purchase.id)

        return NextResponse.json({
          success: true,
          message: 'Purchase processed successfully',
          creditsAdded: creditsToAdd,
          newBalance: newCredits,
          isFirstPurchase,
        })
      }

      return NextResponse.json({
        message: 'Purchase not yet paid',
        paymentStatus: session.payment_status,
      })
    } catch (stripeError: any) {
      console.error('[Fix Purchase] Stripe error:', stripeError)
      return NextResponse.json(
        { error: 'Failed to check Stripe session', details: stripeError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[Fix Purchase] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
