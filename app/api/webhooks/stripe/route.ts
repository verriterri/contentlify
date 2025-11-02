import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  const supabase = createServerClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            { expand: ['items.data.price.product'] }
          )

          const customerId = subscription.customer as string
          const priceId = subscription.items.data[0].price.id
          
          // Determine tier from price ID
          let tier: string = 'free'
          const prices = await stripe.prices.list({ limit: 100 })
          
          for (const price of prices.data) {
            if (price.id === priceId) {
              const productId = price.product as string
              const product = await stripe.products.retrieve(productId)
              
              if (product.name?.toLowerCase().includes('starter')) {
                tier = 'starter'
              } else if (product.name?.toLowerCase().includes('pro')) {
                tier = 'pro'
              } else if (product.name?.toLowerCase().includes('agency')) {
                tier = 'agency'
              }
              break
            }
          }

          // Update user subscription in database
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()

          if (user) {
            await supabase
              .from('users')
              .update({
                subscription_tier: tier,
                subscription_status: 'active',
                stripe_customer_id: customerId,
              })
              .eq('id', user.id)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0].price.id
        
        // Determine tier from price ID
        let tier: string = 'free'
        const prices = await stripe.prices.list({ limit: 100 })
        
        for (const price of prices.data) {
          if (price.id === priceId) {
            const productId = price.product as string
            const product = await stripe.products.retrieve(productId)
            
            if (product.name?.toLowerCase().includes('starter')) {
              tier = 'starter'
            } else if (product.name?.toLowerCase().includes('pro')) {
              tier = 'pro'
            } else if (product.name?.toLowerCase().includes('agency')) {
              tier = 'agency'
            }
            break
          }
        }

        // Update user subscription
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (user) {
          await supabase
            .from('users')
            .update({
              subscription_tier: tier,
              subscription_status: subscription.status === 'active' ? 'active' : 'canceled',
            })
            .eq('id', user.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Set user back to free tier
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (user) {
          await supabase
            .from('users')
            .update({
              subscription_tier: 'free',
              subscription_status: 'canceled',
            })
            .eq('id', user.id)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

