import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  // Create a response object
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        request.cookies.set({
          name,
          value,
          ...options,
        })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        response.cookies.set({
          name,
          value,
          ...options,
        })
      },
      remove(name: string, options: any) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        response.cookies.set({
          name,
          value: '',
          ...options,
        })
      },
    },
  })

  // Get authenticated user and session - getUser() validates the session server-side
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get session to check expiration
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if session exists and enforce inactivity timeout (1 hour) and maximum session age (7 days)
  if (session) {
    const now = Math.floor(Date.now() / 1000) // Current time in seconds (Unix timestamp)
    const inactivityTimeout = 60 * 60 // 1 hour in seconds
    const maxSessionAge = 7 * 24 * 60 * 60 // 7 days in seconds
    
    // Check if session has expired (expires_at is in seconds)
    const isExpired = session.expires_at && session.expires_at < now
    
    // Check inactivity timeout using last_activity cookie
    const lastActivityCookie = request.cookies.get('last_activity')
    const sessionStartedCookie = request.cookies.get('session_started_at')
    
    let inactivityExceeded = false
    let sessionAgeExceeded = false
    
    // Check inactivity (1 hour of no activity)
    if (lastActivityCookie?.value) {
      const lastActivity = parseInt(lastActivityCookie.value, 10)
      const inactivitySeconds = now - lastActivity
      inactivityExceeded = inactivitySeconds > inactivityTimeout
    } else {
      // If no last_activity cookie exists, this is a new session or very old session
      // Set it now, but if session_started_at exists and is old, expire it
      if (sessionStartedCookie?.value) {
        const sessionStartedAt = parseInt(sessionStartedCookie.value, 10)
        const ageInSeconds = now - sessionStartedAt
        // If session is older than inactivity timeout and we don't have last_activity, expire it
        if (ageInSeconds > inactivityTimeout) {
          inactivityExceeded = true
        }
      }
    }
    
    // Check maximum session age (7 days)
    if (sessionStartedCookie?.value) {
      const sessionStartedAt = parseInt(sessionStartedCookie.value, 10)
      const ageInSeconds = now - sessionStartedAt
      sessionAgeExceeded = ageInSeconds > maxSessionAge
    } else {
      // If no cookie exists, set it now (for new sessions)
      // But also check if expires_at suggests the session is too old
      if (session.expires_at) {
        // If expires_at is more than 8 days from now, it's suspiciously long
        const suspiciousExpiration = session.expires_at > (now + 8 * 24 * 60 * 60)
        if (suspiciousExpiration) {
          sessionAgeExceeded = true
        }
      }
    }
    
    // If session is expired, inactive too long, or too old, sign out
    if (isExpired || inactivityExceeded || sessionAgeExceeded) {
      await supabase.auth.signOut()
      // Clear session tracking cookies
      response.cookies.delete('session_started_at')
      response.cookies.delete('last_activity')
      
      const { pathname } = request.nextUrl
      if (pathname.startsWith('/dashboard')) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirectedFrom', pathname)
        redirectUrl.searchParams.set('sessionExpired', 'true')
        return NextResponse.redirect(redirectUrl)
      }
    } else {
      // Update last activity time on every request
      response.cookies.set('last_activity', now.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: inactivityTimeout,
        path: '/',
      })
      
      // Set session start time cookie if it doesn't exist
      if (!sessionStartedCookie?.value) {
        response.cookies.set('session_started_at', now.toString(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: maxSessionAge,
          path: '/',
        })
      }
    }
  }

  const { pathname } = request.nextUrl

  // Protect dashboard routes (except /dashboard/analyze which allows anonymous free trial)
  if (pathname.startsWith('/dashboard')) {
    // Allow anonymous access to /dashboard/analyze for free trial
    if (pathname === '/dashboard/analyze' || pathname.startsWith('/dashboard/analyze/')) {
      // Allow anonymous users to access analyze page
      return response
    }
    
    if (!user || !session) {
      // Only redirect if not already going to login (prevents loops)
      if (!pathname.includes('/login')) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirectedFrom', pathname)
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  // Redirect authenticated users away from auth pages
  // getUser() already validates the session, so if user exists, session is valid
  // But only redirect if we have a valid session (not just a user object)
  if ((pathname === '/login' || pathname === '/signup') && user && session) {
    // Double-check session is not expired
    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at && session.expires_at > now) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

