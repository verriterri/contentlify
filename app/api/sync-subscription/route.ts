import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * POST /api/sync-subscription
 * Manually syncs the current user's subscription from Stripe to Supabase
 * Useful when webhook fails or for testing
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
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
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to continue' },
        { status: 401 }
      )
    }

    // Get user's Stripe customer ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      )
    }

    if (!userData.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer ID found. Please subscribe first.' },
        { status: 404 }
      )
    }

    // Get active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: userData.stripe_customer_id,
      status: 'all',
      limit: 10,
    })

    if (subscriptions.data.length === 0) {
      // No subscription found - set to free tier
      await supabase
        .from('users')
        .update({
          subscription_tier: 'free',
          subscription_status: 'canceled',
        })
        .eq('id', user.id)

      return NextResponse.json({
        success: true,
        tier: 'free',
        status: 'canceled',
        message: 'No active subscription found. Set to free tier.',
      })
    }

    // Get the most recent active subscription (or first subscription if none active)
    const activeSubscription =
      subscriptions.data.find((sub) => sub.status === 'active') ||
      subscriptions.data[0]

    const priceId = activeSubscription.items.data[0].price.id

    // Determine tier from product name
    let tier: string = 'free'
    try {
      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] })
      const product =
        typeof price.product === 'object' && price.product !== null
          ? price.product
          : await stripe.products.retrieve(price.product as string)

      const productName = product.name?.toLowerCase() || ''
      if (productName.includes('starter')) {
        tier = 'starter'
      } else if (productName.includes('pro')) {
        tier = 'pro'
      } else if (productName.includes('agency')) {
        tier = 'agency'
      }
    } catch (error) {
      console.error('[Sync] Error retrieving price/product:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve subscription details from Stripe' },
        { status: 500 }
      )
    }

    // Update user subscription in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        subscription_status:
          activeSubscription.status === 'active' ? 'active' : 'canceled',
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Sync] Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Failed to update subscription in database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tier,
      status: activeSubscription.status === 'active' ? 'active' : 'canceled',
      message: `Successfully synced subscription to ${tier} tier`,
    })
  } catch (error: any) {
    console.error('[Sync] Error syncing subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync subscription' },
      { status: 500 }
    )
  }
}

