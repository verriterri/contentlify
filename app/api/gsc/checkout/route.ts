import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/gsc/checkout
 * Creates a Stripe checkout session for GSC analysis ($9.99 one-time)
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = await cookies();
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', options);
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to continue' },
        { status: 401 }
      );
    }

    // Check if user already paid for GSC analysis
    const { data: existingPayment } = await supabase
      .from('gsc_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single();

    if (existingPayment) {
      return NextResponse.json(
        { error: 'You have already purchased GSC analysis access' },
        { status: 400 }
      );
    }

    // Get user from database
    const { data: userData } = await supabase
      .from('users')
      .select('email, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create or retrieve Stripe customer
    let customerId = userData.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email || user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Update user with customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create pending payment record
    const { data: payment, error: paymentError } = await supabase
      .from('gsc_payments')
      .insert({
        user_id: user.id,
        amount: 9.99,
        status: 'pending',
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('[GSC Checkout] Error creating payment record:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    // Create checkout session
    const sessionUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'GSC Analysis Access',
              description: 'One-time payment for Google Search Console analysis access',
            },
            unit_amount: 999, // $9.99 in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${sessionUrl}/dashboard/gsc?payment=success`,
      cancel_url: `${sessionUrl}/dashboard/gsc?payment=canceled`,
      metadata: {
        supabase_user_id: user.id,
        payment_id: payment.id,
        payment_type: 'gsc_analysis',
      },
    });

    // Update payment with session ID
    await supabase
      .from('gsc_payments')
      .update({ stripe_session_id: checkoutSession.id })
      .eq('id', payment.id);

    console.log('[GSC Checkout] Created checkout session:', {
      userId: user.id,
      paymentId: payment.id,
      sessionId: checkoutSession.id,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('[GSC Checkout] Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
