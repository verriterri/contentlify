import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabaseUrl = getSupabaseUrl()
    const supabaseServiceRoleKey = getSupabaseServiceRoleKey()

    // If no service role key, skip check - signup will handle it
    if (!supabaseServiceRoleKey) {
      console.warn('SUPABASE_SECRET_KEY not set, skipping email check')
      return NextResponse.json({ exists: false })
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check public.users table first (this is the source of truth)
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)
      .limit(1)

    if (!usersError && usersData && usersData.length > 0) {
      // Email exists in users table
      return NextResponse.json({ exists: true })
    }

    // Also check auth.users using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (!authError && authData?.users) {
      const userExists = authData.users.some(user => 
        user.email?.toLowerCase() === email.toLowerCase()
      )
      
      if (userExists) {
        return NextResponse.json({ exists: true })
      }
    }

    // Email doesn't exist
    return NextResponse.json({ exists: false })
  } catch (error: any) {
    console.error('Error checking email:', error)
    // If error occurs, return false to allow signup attempt
    // Supabase Auth will handle duplicate checking as fallback
    return NextResponse.json({ exists: false })
  }
}

