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

  // Get session and user
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const now = Math.floor(Date.now() / 1000)
  const inactivityTimeout = 60 * 60 // 1 hour in seconds
  const maxSessionAge = 7 * 24 * 60 * 60 // 7 days in seconds

  // Protect dashboard routes (except /dashboard/analyze which allows anonymous free trial)
  if (pathname.startsWith('/dashboard')) {
    // Allow anonymous access to /dashboard/analyze for free trial
    if (pathname === '/dashboard/analyze' || pathname.startsWith('/dashboard/analyze/')) {
      return response
    }
    
    // FIRST: Check if we have a session - if yes, allow access immediately
    // This ensures new logins work without any blocking
    if (session) {
      // Check if this is a new session (no session_id cookie)
      const sessionIdCookie = request.cookies.get('session_id')
      const isNewSession = !sessionIdCookie?.value
      
      // For new sessions, set up tracking cookies but don't check expiration
      if (isNewSession) {
        // Set up tracking cookies for new sessions
        // Use user ID from session if getUser() hasn't completed yet
        const userId = user?.id || session.user?.id || 'unknown'
        const sessionIdentifier = `${userId}-${now}`
        
        response.cookies.set('session_id', sessionIdentifier, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: maxSessionAge,
          path: '/',
        })
        response.cookies.set('session_started_at', now.toString(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: maxSessionAge,
          path: '/',
        })
        response.cookies.set('last_activity', now.toString(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: inactivityTimeout,
          path: '/',
        })
      } else if (!isNewSession) {
        // Existing session - check for expiration and inactivity
        const lastActivityCookie = request.cookies.get('last_activity')
        const sessionStartedCookie = request.cookies.get('session_started_at')
        
        // If tracking cookies don't exist, this might be a session that was just set up
        // but cookies haven't propagated yet - set them up now and allow access
        if (!sessionStartedCookie?.value || !lastActivityCookie?.value) {
          // Missing tracking cookies - set them up now (likely cookie propagation delay)
          const userId = user?.id || session.user?.id || 'unknown'
          const sessionIdentifier = `${userId}-${now}`
          
          response.cookies.set('session_id', sessionIdentifier, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: maxSessionAge,
            path: '/',
          })
          response.cookies.set('session_started_at', now.toString(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: maxSessionAge,
            path: '/',
          })
          response.cookies.set('last_activity', now.toString(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: inactivityTimeout,
            path: '/',
          })
        } else {
          // We have tracking cookies - check for expiration
          // Check Supabase session expiration
          const isExpired = session.expires_at && session.expires_at < now
          
          let inactivityExceeded = false
          let sessionAgeExceeded = false
          
          // Check inactivity (1 hour) - use last_activity if available
          if (lastActivityCookie?.value) {
            const lastActivity = parseInt(lastActivityCookie.value, 10)
            // Add a 5-minute grace period to account for cookie propagation delays
            const gracePeriod = 5 * 60 // 5 minutes
            inactivityExceeded = (now - lastActivity) > (inactivityTimeout + gracePeriod)
          }
          
          // Check max session age (7 days)
          if (sessionStartedCookie?.value) {
            const sessionStartedAt = parseInt(sessionStartedCookie.value, 10)
            sessionAgeExceeded = (now - sessionStartedAt) > maxSessionAge
          }
          
          // If expired, inactive, or too old, sign out and redirect
          if (isExpired || inactivityExceeded || sessionAgeExceeded) {
            await supabase.auth.signOut()
            response.cookies.delete('session_started_at')
            response.cookies.delete('last_activity')
            response.cookies.delete('session_id')
            
            const redirectUrl = new URL('/login', request.url)
            redirectUrl.searchParams.set('redirectedFrom', pathname)
            redirectUrl.searchParams.set('sessionExpired', 'true')
            return NextResponse.redirect(redirectUrl)
          } else {
            // Update last activity
            response.cookies.set('last_activity', now.toString(), {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: inactivityTimeout,
              path: '/',
            })
          }
        }
      }
      
      // Allow access - new sessions are always allowed, existing sessions are checked above
      return response
    }
    
    // No session - redirect to login
    if (!pathname.includes('/login')) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirect authenticated users away from auth pages
  if ((pathname === '/login' || pathname === '/signup') && user && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
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
