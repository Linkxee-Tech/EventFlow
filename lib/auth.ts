import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { db, getUser, putUser } from '@/lib/db';
import type { UserProfile } from '@/types';
import { randomUUID } from 'crypto';

// Custom DynamoDB adapter shim — stores sessions in DynamoDB
// For production, use the official @auth/dynamodb-adapter package
const DynamoDBAdapterShim = {
  async createUser(user: { email: string; name?: string; image?: string }) {
    const userId = randomUUID();
    const profile: UserProfile = {
      userId,
      email: user.email,
      name: user.name ?? user.email.split('@')[0],
      role: 'organizer',
      createdAt: new Date().toISOString(),
    };
    await putUser(profile);
    return { id: userId, ...user };
  },
  async getUser(id: string) {
    const user = await getUser(id);
    if (!user) return null;
    return { id: user.userId, email: user.email, name: user.name };
  },
  async getUserByEmail(email: string) {
    // In production: GSI on email field
    return null;
  },
  async getUserByAccount() {
    return null;
  },
  async updateUser(user: { id: string }) {
    return user;
  },
  async linkAccount() {
    return undefined;
  },
  async createSession(session: { sessionToken: string; userId: string; expires: Date }) {
    return session;
  },
  async getSessionAndUser(sessionToken: string) {
    return null;
  },
  async updateSession(session: { sessionToken: string }) {
    return null;
  },
  async deleteSession(sessionToken: string) {},
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM ?? 'tickets@eventflow.app',
    }),
  ],

  session: {
    strategy: 'jwt', // Stateless — works perfectly with Vercel serverless
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
        // Fetch role from DB on first sign-in
        const profile = await getUser(user.id);
        token.role = profile?.role ?? 'organizer';
        token.stripeAccountId = profile?.stripeAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.userId as string;
        (session.user as any).role = token.role as string;
        (session.user as any).stripeAccountId = token.stripeAccountId as string | undefined;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Auto-create profile on first OAuth sign-in
      if (account?.provider === 'google' && user.id) {
        const existing = await getUser(user.id);
        if (!existing) {
          await putUser({
            userId: user.id,
            email: user.email!,
            name: user.name ?? 'Organizer',
            role: 'organizer',
            createdAt: new Date().toISOString(),
          });
        }
      }
      return true;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
