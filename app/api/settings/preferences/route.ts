import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase'

/**
 * GET /api/settings/preferences
 * Get user preferences
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()

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

    // Allow anonymous access - return default preferences
    if (authError || !user) {
      return NextResponse.json({
        preferences: {
          chargeExtraForLongPages: false, // Default for anonymous users
        },
      })
    }

    // Get or create user settings
    let { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('preferences')
      .eq('user_id', user.id)
      .single()

    if (settingsError && settingsError.code === 'PGRST116') {
      // Settings don't exist, create them
      const { data: newSettings, error: createError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          preferences: {
            chargeExtraForLongPages: false, // Default: don't charge extra
          },
        })
        .select('preferences')
        .single()

      if (createError) {
        console.error('[Settings] Error creating settings:', createError)
        return NextResponse.json(
          { error: 'Failed to create settings' },
          { status: 500 }
        )
      }

      return NextResponse.json({ preferences: newSettings.preferences })
    }

    if (settingsError) {
      console.error('[Settings] Error fetching settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Ensure chargeExtraForLongPages exists (default to false)
    const preferences = {
      chargeExtraForLongPages: false,
      ...userSettings?.preferences,
    }

    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error('[Settings] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/settings/preferences
 * Update user preferences
 */
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()

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
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { chargeExtraForLongPages } = body

    // Validate input
    if (chargeExtraForLongPages !== undefined && typeof chargeExtraForLongPages !== 'boolean') {
      return NextResponse.json(
        { error: 'chargeExtraForLongPages must be a boolean' },
        { status: 400 }
      )
    }

    // Get existing settings
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('preferences')
      .eq('user_id', user.id)
      .single()

    // Merge with existing preferences
    const updatedPreferences = {
      ...existingSettings?.preferences,
      ...(chargeExtraForLongPages !== undefined && { chargeExtraForLongPages }),
    }

    // Upsert settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        preferences: updatedPreferences,
        updated_at: new Date().toISOString(),
      })
      .select('preferences')
      .single()

    if (updateError) {
      console.error('[Settings] Error updating preferences:', updateError)
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({ preferences: updatedSettings.preferences })
  } catch (error: any) {
    console.error('[Settings] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

