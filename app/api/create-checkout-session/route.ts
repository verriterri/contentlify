import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICING_PLANS, PricingTier } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { tier, billingInterval = 'month' }: { tier: PricingTier; billingInterval?: 'month' | 'year' } = await req.json()

    if (!tier || !PRICING_PLANS[tier]) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      )
    }

    // Get authenticated user using cookies
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
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to continue' },
        { status: 401 }
      )
    }

    // Get user from database
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const plan = PRICING_PLANS[tier]
    
    // Get Price ID from environment variables
    // Format: STRIPE_PRICE_[TIER]_[INTERVAL] (e.g., STRIPE_PRICE_STARTER_MONTHLY)
    // Convert billing interval: "month" -> "MONTHLY", "year" -> "YEARLY"
    const intervalKey = billingInterval === 'month' ? 'MONTHLY' : 'YEARLY'
    const priceIdKey = `STRIPE_PRICE_${tier.toUpperCase()}_${intervalKey}` as keyof typeof process.env
    const priceId = process.env[priceIdKey]
    
    if (!priceId) {
      console.error(`Missing Price ID for ${tier} ${billingInterval} plan. Set ${priceIdKey} environment variable.`)
      return NextResponse.json(
        { error: `Price configuration missing for ${plan.name} ${billingInterval} plan. Please contact support.` },
        { status: 500 }
      )
    }

    // Create or retrieve Stripe customer
    let customerId = userData.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email || user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Update user with customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Check if user already has an active subscription
    // If they do, redirect to Customer Portal for upgrades/downgrades
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    if (existingSubscriptions.data.length > 0) {
      // User has existing subscription - redirect to Customer Portal
      const sessionUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${sessionUrl}/dashboard`,
      })

      return NextResponse.json({ url: portalSession.url })
    }

    // Create checkout session (for new subscriptions only)
    // Uses Price IDs from Stripe Dashboard (configured via environment variables)
    const sessionUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId, // Use Price ID from Stripe Dashboard
          quantity: 1,
        },
      ],
      success_url: `${sessionUrl}/dashboard?success=true`,
      cancel_url: `${sessionUrl}/pricing?canceled=true`,
      metadata: {
        tier,
        supabase_user_id: user.id,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
