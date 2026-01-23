import 'next-auth'
import { type DefaultSession } from 'next-auth'

declare module 'next-auth' {
  /**
   * Extended session interface to include GitHub access token.
   */
  interface Session {
    accessToken?: string
    user: {
      id: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extended JWT interface to include GitHub access token.
   */
  interface JWT {
    accessToken?: string
  }
}
