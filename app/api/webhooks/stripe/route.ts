import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase'
import Stripe from 'stripe'
import { sendEmail } from '@/lib/email/sender'
import { getWelcomeEmail } from '@/lib/email/templates'

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
        
        console.log('[Webhook] checkout.session.completed received:', {
          sessionId: session.id,
          mode: session.mode,
          metadata: session.metadata,
        })
        
        // Handle GSC analysis payment (one-time $9.99)
        if (session.mode === 'payment' && session.metadata?.payment_type === 'gsc_analysis') {
          const paymentId = session.metadata.payment_id
          const isAnonymousPurchase = session.metadata.is_anonymous_purchase === 'true'
          const email = session.metadata.email

          console.log('[Webhook] Processing GSC analysis payment:', {
            paymentId,
            isAnonymousPurchase,
            email,
          })

          // ANONYMOUS PURCHASE - Create account automatically
          if (isAnonymousPurchase && email) {
            try {
              console.log('[Webhook] Creating account for anonymous purchase:', email)

              // 1. Create Supabase auth user
              const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                email_confirm: true, // Skip email verification
                user_metadata: {
                  created_via: 'gsc_purchase',
                  purchase_date: new Date().toISOString(),
                },
              })

              if (authError || !authData.user) {
                console.error('[Webhook] Failed to create auth user:', authError)
                // Still update payment but log error
                await supabase
                  .from('gsc_payments')
                  .update({
                    status: 'completed',
                    stripe_payment_intent_id: session.payment_intent as string,
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', paymentId)
                break
              }

              const userId = authData.user.id

              // 2. Create public.users record
              const { error: userInsertError } = await supabase
                .from('users')
                .insert({
                  id: userId,
                  email,
                  credits: 0, // No free credits for purchase-first users
                  email_verified: true,
                  free_trial_used: false,
                  has_made_first_purchase: false,
                })

              if (userInsertError) {
                console.error('[Webhook] Failed to create user record:', userInsertError)
              }

              // 3. Update payment with user_id
              await supabase
                .from('gsc_payments')
                .update({
                  user_id: userId,
                  status: 'completed',
                  stripe_payment_intent_id: session.payment_intent as string,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', paymentId)

              // 4. Generate magic link
              const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email,
              })

              if (magicLinkError || !magicLinkData) {
                console.error('[Webhook] Failed to generate magic link:', magicLinkError)
              } else {
                // 5. Send welcome email with magic link
                const emailTemplate = getWelcomeEmail(email, magicLinkData.properties.action_link)
                await sendEmail({
                  to: email,
                  subject: emailTemplate.subject,
                  html: emailTemplate.html,
                })
              }

              console.log('[Webhook] Successfully created account for:', email)
            } catch (error) {
              console.error('[Webhook] Error in anonymous purchase flow:', error)
            }
          } else {
            // AUTHENTICATED PURCHASE - Just update payment
            const userId = session.metadata.supabase_user_id

            if (!userId || !paymentId) {
              console.error('[Webhook] Missing user ID or payment ID for authenticated purchase')
              break
            }

            await supabase
              .from('gsc_payments')
              .update({
                status: 'completed',
                stripe_payment_intent_id: session.payment_intent as string,
                completed_at: new Date().toISOString(),
              })
              .eq('id', paymentId)

            console.log(`[Webhook] GSC analysis payment completed for user ${userId}`)
          }

          break
        }

        // Handle credit purchases (one-time payments)
        if (session.mode === 'payment' && session.metadata?.purchase_id) {
          const purchaseId = session.metadata.purchase_id
          const credits = parseInt(session.metadata.credits || '0', 10)
          const userId = session.metadata.supabase_user_id

          console.log('[Webhook] Processing credit purchase:', {
            purchaseId,
            credits,
            userId,
          })

          if (!userId || !credits) {
            console.error('[Webhook] Missing user ID or credits in metadata', {
              userId,
              credits,
              metadata: session.metadata,
            })
            break
          }

          // Update purchase status
          const { error: purchaseError } = await supabase
            .from('credit_purchases')
            .update({
              status: 'completed',
              stripe_payment_intent_id: session.payment_intent as string,
            })
            .eq('id', purchaseId)

          if (purchaseError) {
            console.error('[Webhook] Error updating purchase:', purchaseError)
          }

          // Get user data and check if this is their first purchase
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('credits, has_made_first_purchase')
            .eq('id', userId)
            .single()

          if (userError || !user) {
            console.error('[Webhook] Error finding user:', userError)
            break
          }

          // Check if this is the first purchase (first purchase bonus: 20% more credits)
          const isFirstPurchase = !user.has_made_first_purchase
          const creditsToAdd = isFirstPurchase ? Math.floor(credits * 1.2) : credits

          const newCredits = (user.credits || 0) + creditsToAdd

          // Update user credits and mark first purchase as completed
          const { error: creditError } = await supabase
            .from('users')
            .update({
              credits: newCredits,
              has_made_first_purchase: true
            })
            .eq('id', userId)

          if (creditError) {
            console.error('[Webhook] Error updating credits:', creditError)
          } else {
            if (isFirstPurchase) {
              console.log(`[Webhook] First purchase bonus! Added ${creditsToAdd} credits (${credits} + 20%) to user ${userId}. New balance: ${newCredits}`)
            } else {
              console.log(`[Webhook] Added ${creditsToAdd} credits to user ${userId}. New balance: ${newCredits}`)
            }
          }

          break
        }
        
        // Handle subscriptions (legacy support)
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
        
        // Subscription tier no longer tracked (credit-based system)
        // Just log the subscription update for reference
        console.log(`[Webhook] Subscription updated for customer ${customerId}, status: ${subscription.status}`)
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
          // Subscription tier no longer tracked (credit-based system)
          console.log(`[Webhook] Subscription deleted for user ${user.id}`)
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

