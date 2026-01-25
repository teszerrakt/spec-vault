import type { NextAuthConfig } from 'next-auth'
import GitHub from 'next-auth/providers/github'

/**
 * Edge-compatible NextAuth.js configuration.
 * This config is used by middleware and can run on the edge runtime.
 */
export default {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          // Request repo scope for read/write access to repositories
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/contracts') ||
        nextUrl.pathname.startsWith('/import') ||
        nextUrl.pathname.startsWith('/settings') ||
        nextUrl.pathname.startsWith('/edit')
      
      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect to login
      } else if (isLoggedIn && nextUrl.pathname === '/login') {
        return Response.redirect(new URL('/contracts', nextUrl))
      }
      return true
    },
  },
} satisfies NextAuthConfig
