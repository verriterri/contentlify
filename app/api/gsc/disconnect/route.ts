import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/gsc/disconnect
 * Disconnect user's GSC connection (allows reconnecting with different scopes)
 */
export async function POST(req: NextRequest) {
  try {
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

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in first.' },
        { status: 401 }
      );
    }

    console.log('[GSC Disconnect] Deleting connection for user:', user.id);

    // Delete the GSC connection
    const { error: deleteError } = await supabase
      .from('gsc_connections')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[GSC Disconnect] Error deleting connection:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect GSC account' },
        { status: 500 }
      );
    }

    console.log('[GSC Disconnect] Successfully disconnected for user:', user.id);

    return NextResponse.json({
      success: true,
      message: 'GSC account disconnected successfully',
    });
  } catch (error: any) {
    console.error('[GSC Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect GSC account' },
      { status: 500 }
    );
  }
}
