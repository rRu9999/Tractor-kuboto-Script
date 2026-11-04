import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/plans', '/invite', '/account', '/recharge', '/records', '/withdraw', '/portfolio', '/income-records', '/bank-account']

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const requiresUser = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  if (!requiresUser) return NextResponse.next()

  const session = request.cookies.get('kubota_session')?.value
  if (session) return NextResponse.next()

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/plans/:path*', '/invite/:path*', '/account/:path*', '/recharge/:path*', '/records/:path*', '/withdraw/:path*', '/portfolio/:path*', '/income-records/:path*', '/bank-account/:path*'],
}
