import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICING_PLANS, PricingTier } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
    const price = billingInterval === 'year' ? plan.annualPrice : plan.monthlyPrice
    const interval = billingInterval === 'year' ? 'year' : 'month'

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

    // Create checkout session
    // Note: In production, you'll need to create Price objects in Stripe Dashboard
    // and use their price IDs here. For now, we're using a placeholder approach.
    const sessionUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} Plan`,
              description: `ContentMaxer ${plan.name} subscription`,
            },
            unit_amount: price * 100, // Convert to cents
            recurring: {
              interval: interval as 'month' | 'year',
            },
          },
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
