import 'next-auth'
import { type DefaultSession } from 'next-auth'

declare module 'next-auth' {
  /**
   * Extended session interface to include GitHub access token and username.
   */
  interface Session {
    accessToken?: string
    user: {
      id: string
      /** GitHub username (login) */
      username?: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extended JWT interface to include GitHub access token and username.
   */
  interface JWT {
    accessToken?: string
    /** GitHub username (login) */
    username?: string
  }
}
