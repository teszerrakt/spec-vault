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
    async jwt({ token, account, profile }) {
      // Persist the GitHub access token and username to the JWT
      if (account) {
        token.accessToken = account.access_token
      }
      // GitHub profile contains the login (username)
      if (profile) {
        token.username = (profile as { login?: string }).login
      }
      return token
    },
    async session({ session, token }) {
      // Make access token and username available to the client session
      session.accessToken = token.accessToken as string
      if (token.username) {
        session.user.username = token.username as string
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
})
