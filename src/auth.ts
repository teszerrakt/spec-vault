import NextAuth from 'next-auth'
import authConfig from './auth.config'

/**
 * Main NextAuth.js configuration.
 * Extends edge-compatible config with additional options.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account }) {
      // Persist the GitHub access token to the JWT
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Make access token available to the client session
      session.accessToken = token.accessToken as string
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
})
