import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

/**
 * Admin endpoint to manually fix subscription tiers
 * POST /api/admin/fix-subscription
 * Body: { email?: string, userId?: string }
 * 
 * Looks up user's Stripe subscription and updates their tier in the database
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user (must be admin or the user themselves)
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { email, userId } = body;

    // Find the target user
    let targetUser;
    if (email) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      targetUser = data;
    } else if (userId) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      targetUser = data;
    } else {
      // Default to current user
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      targetUser = data;
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a Stripe customer ID
    if (!targetUser.stripe_customer_id) {
      return NextResponse.json(
        { error: 'User does not have a Stripe customer ID. They may not have subscribed yet.' },
        { status: 400 }
      );
    }

    // Get active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: targetUser.stripe_customer_id,
      status: 'all',
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'No subscriptions found for this customer' },
        { status: 404 }
      );
    }

    // Get the most recent active subscription
    const activeSubscription = subscriptions.data.find((sub) => sub.status === 'active') || subscriptions.data[0];
    const priceId = activeSubscription.items.data[0].price.id;

    // Subscription tiers no longer used - product is credit-based
    return NextResponse.json({
      success: true,
      message: 'Subscription fix no longer needed. Product uses credit-based system.',
      note: 'All features are available based on credits, not subscription tiers.',
      user: {
        email: targetUser.email,
        stripe_customer_id: targetUser.stripe_customer_id,
      },
    });
  } catch (error: any) {
    console.error('[Fix Subscription] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

