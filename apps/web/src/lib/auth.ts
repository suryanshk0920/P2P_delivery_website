import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN!
      
      // Allow specific test emails in development
      const testEmails = ['suryanshkumar0903@gmail.com']
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      if (!user.email?.endsWith(`@${allowedDomain}`) && !(isDevelopment && testEmails.includes(user.email || ''))) {
        return '/auth/error?error=DomainNotAllowed'
      }
      
      // Create or update user in database
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name || '',
          avatarUrl: user.image
        },
        create: {
          email: user.email,
          name: user.name || '',
          avatarUrl: user.image,
          isAdmin: testEmails.includes(user.email || '') // Make test emails admin
        }
      })
      
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      
      // Fetch fresh user data from database
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string }
        })
        
        if (dbUser) {
          token.id = dbUser.id
          token.hostelId = dbUser.hostelId || ''
          token.roomNumber = dbUser.roomNumber || ''
          token.hostelBlock = dbUser.hostelBlock || ''
          token.isVerified = dbUser.isVerified
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.hostelId = token.hostelId as string
        session.user.roomNumber = token.roomNumber as string
        session.user.hostelBlock = token.hostelBlock as string
        session.user.isVerified = token.isVerified as boolean
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt'
  },
  cookies: {
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    state: {
      name: 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
}
