import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Not onboarded yet
    if (token && !token.hostelId && path !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }

    // Not verified yet
    if (token && !token.isVerified && path !== '/pending-verification' && path !== '/onboarding') {
      return NextResponse.redirect(new URL('/pending-verification', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/request/:path*', '/runner/:path*']
}
