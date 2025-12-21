import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/gsc/checkout
 * Creates a Stripe checkout session for GSC analysis ($4.99 one-time)
 * NOW SUPPORTS ANONYMOUS PURCHASES - no authentication required
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Use service role to create payment record (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create pending payment record with email (no user_id yet)
    const { data: payment, error: paymentError } = await supabase
      .from('gsc_payments')
      .insert({
        email: email.toLowerCase().trim(),
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
      customer_email: email.toLowerCase().trim(),
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
      success_url: `${sessionUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${sessionUrl}/?payment=canceled`,
      metadata: {
        email: email.toLowerCase().trim(),
        payment_id: payment.id,
        payment_type: 'gsc_analysis',
        is_anonymous_purchase: 'true',
      },
    });

    // Update payment with session ID
    await supabase
      .from('gsc_payments')
      .update({ stripe_session_id: checkoutSession.id })
      .eq('id', payment.id);

    console.log('[GSC Checkout] Created anonymous checkout session:', {
      email,
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
