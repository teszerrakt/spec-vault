import NextAuth from 'next-auth'
import authConfig from './auth.config'

const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  // Match all routes except static files and API routes (except auth)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
