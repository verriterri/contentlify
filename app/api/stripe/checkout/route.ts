import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { CREDIT_PACKAGES, CreditPackageKey } from '@/lib/pricing'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * POST /api/stripe/checkout
 * Creates a Stripe checkout session for credit purchases
 */
export async function POST(req: NextRequest) {
  try {
    const { packageKey }: { packageKey: CreditPackageKey } = await req.json()

    if (!packageKey || !CREDIT_PACKAGES[packageKey]) {
      return NextResponse.json(
        { error: 'Invalid credit package' },
        { status: 400 }
      )
    }

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
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to continue' },
        { status: 401 }
      )
    }

    // Get user from database (including first purchase status)
    // Try to select all fields, but handle missing columns gracefully
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, stripe_customer_id, has_made_first_purchase')
      .eq('id', user.id)
      .single()

    // If query fails due to missing columns, try with just basic fields
    if (userError && (userError.message?.includes('column') || userError.code === '42703')) {
      console.warn('[Checkout] Missing columns detected, trying basic query...')
      const { data: basicUserData, error: basicError } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single()
      
      if (!basicError && basicUserData) {
        // User exists, but missing some columns - use defaults
        userData = {
          email: basicUserData.email,
          stripe_customer_id: null,
          has_made_first_purchase: false,
        }
        userError = null
      }
    }

    // Log the error if query failed
    if (userError) {
      console.error('[Checkout] Error fetching user:', {
        error: userError,
        code: userError?.code,
        message: userError?.message,
        details: userError?.details,
        hint: userError?.hint,
        userId: user.id,
      })
    }

    // If user doesn't exist in database, create it (fallback if trigger didn't fire)
    if (userError || !userData) {
      console.warn(`[Checkout] User ${user.id} not found in users table, creating record...`)
      
      // Get email confirmation status from the user object we already have
      const emailVerified = user.email_confirmed_at !== null
      
      // Use database function to create user (bypasses RLS with SECURITY DEFINER)
      const { data: newUserData, error: createError } = await supabase
        .rpc('create_user_if_missing', {
          p_user_id: user.id,
          p_email: user.email!,
          p_email_verified: emailVerified,
        })

      if (createError || !newUserData || newUserData.length === 0) {
        // Log the full error for debugging
        console.error('[Checkout] Create user function failed:', {
          error: createError,
          code: createError?.code,
          message: createError?.message,
          details: createError?.details,
          hint: createError?.hint,
        })
        
        // Try direct insert as fallback (if function doesn't exist or has issues)
        console.warn('[Checkout] Trying direct insert as fallback...')
        const { data: directInsertData, error: directInsertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            email_verified: emailVerified,
            credits: 1,
          })
          .select('email, stripe_customer_id, has_made_first_purchase')
          .single()
        
        if (directInsertError || !directInsertData) {
          // If direct insert also fails, retry fetching (might have been created by another request)
          console.warn('[Checkout] Direct insert failed, retrying fetch...', {
            directInsertError,
          })
          const { data: retryData, error: retryError } = await supabase
            .from('users')
            .select('email, stripe_customer_id, has_made_first_purchase')
            .eq('id', user.id)
            .single()
          
          if (retryError || !retryData) {
            console.error('[Checkout] All methods failed to create/fetch user:', {
              functionError: createError,
              directInsertError: directInsertError,
              fetchError: retryError,
              userId: user.id,
              userEmail: user.email,
            })
            return NextResponse.json(
              { 
                error: 'Failed to initialize user account. Please contact support.',
                details: createError?.message || directInsertError?.message || retryError?.message || 'Unknown error',
                debug: {
                  functionError: createError?.message,
                  insertError: directInsertError?.message,
                  fetchError: retryError?.message,
                }
              },
              { status: 500 }
            )
          }
          
          userData = retryData
        } else {
          userData = directInsertData
        }
      } else {
        // Function returns an array, get first result
        userData = newUserData[0]
      }
    }

    // Ensure userData exists (should never happen after all fallbacks, but TypeScript needs this)
    if (!userData) {
      console.error('[Checkout] userData is null after all fallback attempts')
      return NextResponse.json(
        { error: 'Failed to retrieve user data. Please contact support.' },
        { status: 500 }
      )
    }

    // Check if this is the first purchase
    const isFirstPurchase = !userData.has_made_first_purchase

    const creditPackage = CREDIT_PACKAGES[packageKey]
    const priceId = creditPackage.stripePriceId

    if (!priceId) {
      console.error(`Missing Stripe Price ID for package ${packageKey}. Set STRIPE_PRICE_${packageKey}_ANALYSES environment variable.`)
      return NextResponse.json(
        { error: 'Price configuration missing. Please contact support.' },
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

    // Store pending purchase in database
    const { data: purchase, error: purchaseError } = await supabase
      .from('credit_purchases')
      .insert({
        user_id: user.id,
        amount: creditPackage.credits,
        price: creditPackage.price,
        status: 'pending',
      })
      .select()
      .single()

    if (purchaseError || !purchase) {
      console.error('[Checkout] Error creating purchase record:', purchaseError)
      return NextResponse.json(
        { error: 'Failed to create purchase record' },
        { status: 500 }
      )
    }

    // Create checkout session
    const sessionUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${sessionUrl}/dashboard?purchase=success`,
      cancel_url: `${sessionUrl}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        purchase_id: purchase.id,
        credits: creditPackage.credits.toString(),
        package_key: packageKey,
        isFirstPurchase: isFirstPurchase.toString(),
      },
    })

    // Update purchase with session ID
    await supabase
      .from('credit_purchases')
      .update({ stripe_session_id: checkoutSession.id })
      .eq('id', purchase.id)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('[Checkout] Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

