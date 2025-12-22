import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/gsc/checkout
 * Creates a Stripe checkout session for GSC analysis ($4.99 one-time)
 * Requires authentication
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createSSRClient(getSupabaseUrl(), getSupabaseAnonKey(), {
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

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user email
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    const email = userData?.email || user.email;

    if (!email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Create pending payment record
    const { data: payment, error: paymentError } = await supabase
      .from('gsc_payments')
      .insert({
        user_id: user.id,
        email: email,
        amount: 4.99,
        status: 'pending',
        report_generated: false,
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

    // Create Stripe checkout session
    const sessionUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: email,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'GSC Diagnostic Report',
              description: 'One-time Google Search Console analysis report',
            },
            unit_amount: 499, // $4.99 in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${sessionUrl}/dashboard/gsc?payment=success`,
      cancel_url: `${sessionUrl}/pricing?payment=canceled`,
      metadata: {
        payment_id: payment.id,
        payment_type: 'gsc_analysis',
        supabase_user_id: user.id,
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
