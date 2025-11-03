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
          
          // Determine tier - prefer metadata, fallback to product name parsing
          let tier: string = 'free'
          
          // First try metadata from checkout session
          if (session.metadata?.tier) {
            tier = session.metadata.tier.toLowerCase()
            console.log(`[Webhook] Using tier from metadata: ${tier}`)
          } else {
            // Fallback: Determine tier from product name
            const prices = await stripe.prices.list({ limit: 100 })
            
            for (const price of prices.data) {
              if (price.id === priceId) {
                const productId = price.product as string
                const product = await stripe.products.retrieve(productId)
                
                const productName = product.name?.toLowerCase() || ''
                if (productName.includes('starter')) {
                  tier = 'starter'
                } else if (productName.includes('pro')) {
                  tier = 'pro'
                } else if (productName.includes('agency')) {
                  tier = 'agency'
                }
                console.log(`[Webhook] Determined tier from product name "${product.name}": ${tier}`)
                break
              }
            }
          }

          // Update user subscription in database
          // Try to find user by customer ID first
          let user = await supabase
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single()

          // If not found by customer ID, try by metadata user ID
          if (!user.data && session.metadata?.supabase_user_id) {
            console.log(`[Webhook] User not found by customer ID, trying user ID from metadata`)
            user = await supabase
              .from('users')
              .select('id')
              .eq('id', session.metadata.supabase_user_id)
              .single()
          }

          if (user.data) {
            const updateResult = await supabase
              .from('users')
              .update({
                subscription_tier: tier,
                subscription_status: 'active',
                stripe_customer_id: customerId,
              })
              .eq('id', user.data.id)

            if (updateResult.error) {
              console.error('[Webhook] Error updating user:', updateResult.error)
            } else {
              console.log(`[Webhook] Updated user ${user.data.id} to tier: ${tier}`)
            }
          } else {
            console.error(`[Webhook] User not found for customer ${customerId}`)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        console.log(`[Webhook] Subscription updated event received for subscription: ${subscription.id}`)
        
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0].price.id
        
        console.log(`[Webhook] Customer ID: ${customerId}, Price ID: ${priceId}`)
        
        // Determine tier from product name - retrieve price and product directly
        let tier: string = 'free'
        
        try {
          const price = await stripe.prices.retrieve(priceId, { expand: ['product'] })
          const product = typeof price.product === 'object' && price.product !== null
            ? price.product
            : await stripe.products.retrieve(price.product as string)
          
          const productName = product.name?.toLowerCase() || ''
          console.log(`[Webhook] Product name: "${product.name}"`)
          
          if (productName.includes('starter')) {
            tier = 'starter'
          } else if (productName.includes('pro')) {
            tier = 'pro'
          } else if (productName.includes('agency')) {
            tier = 'agency'
          }
          
          console.log(`[Webhook] Determined tier: ${tier}`)
        } catch (error) {
          console.error('[Webhook] Error retrieving price/product:', error)
        }

        // Update user subscription
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .single()

        if (userError) {
          console.error(`[Webhook] Error finding user:`, userError)
        }

        if (user) {
          console.log(`[Webhook] Found user: ${user.id} (${user.email})`)
          
          const updateResult = await supabase
            .from('users')
            .update({
              subscription_tier: tier,
              subscription_status: subscription.status === 'active' ? 'active' : 'canceled',
            })
            .eq('id', user.id)

          if (updateResult.error) {
            console.error('[Webhook] Error updating user subscription:', updateResult.error)
          } else {
            console.log(`[Webhook] Successfully updated user ${user.id} subscription to tier: ${tier}, status: ${subscription.status === 'active' ? 'active' : 'canceled'}`)
          }
        } else {
          console.error(`[Webhook] User not found for customer ${customerId}`)
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

