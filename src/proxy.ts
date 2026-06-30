import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD
  const authCookie = request.cookies.get('lead_scouter_auth')
  
  // If no password is set in .env, just allow all access (e.g. for development if forgotten)
  if (!password) {
    return NextResponse.next()
  }

  // Check if we are on the login page or API route
  if (request.nextUrl.pathname.startsWith('/login')) {
    if (authCookie?.value === 'authenticated') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Protect all other routes
  if (authCookie?.value !== 'authenticated') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
