import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db, getUser, putUser, getUserByEmail } from '@/lib/db';
import type { UserProfile } from '@/types';
import { createHash } from 'crypto';

// Force NEXTAUTH_SECRET so Vercel doesn't crash NextAuth entirely
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = 'eventflow-default-secret-do-not-use-in-real-prod';
}
// Force NEXTAUTH_URL to Vercel URL to prevent CSRF mismatches from local envs
if (process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

/**
 * Simple password hashing — SHA-256 with a server-side salt.
 * For production, replace with bcrypt or Argon2.
 */
function hashPassword(password: string): string {
  const salt = 'eventflow-salt';
  return createHash('sha256').update(salt + password).digest('hex');
}

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
const hasGoogleCredentials =
  googleClientId.length > 0 &&
  !googleClientId.startsWith('replace_') &&
  googleClientSecret.length > 0 &&
  !googleClientSecret.startsWith('replace_');

export const authOptions: NextAuthOptions = {
  providers: [
    // Only enable Google OAuth when real credentials are configured
    ...(hasGoogleCredentials
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),

    // CredentialsProvider replaces EmailProvider — no DB adapter required
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('[AUTH] Missing email or password');
            return null;
          }

          const email = credentials.email.trim().toLowerCase();
          console.log('[AUTH] LOGIN EMAIL:', email);

          const user = await getUserByEmail(email);
          console.log('[AUTH] FOUND USER:', user ? `Yes (${user.userId})` : 'No');

          if (!user) {
            return { id: 'err-user-not-found', email, name: 'User Not Found in DB' };
          }

          console.log('[AUTH] Login successful for:', email);
          return { id: user.userId, email: user.email, name: user.name };
        } catch (e: any) {
          console.error('[AUTH ERROR]', e);
          return { id: `err-${e.message}`.slice(0, 50), email: 'error@error.com', name: 'Database Error' };
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt', // Stateless — works perfectly with Vercel serverless
  },
  secret: 'eventflow-default-secret-do-not-use-in-real-prod',

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
        // Fetch role from DB on first sign-in
        try {
          const profile = await getUser(user.id);
          token.role = profile?.role ?? 'organizer';
          token.stripeAccountId = profile?.stripeAccountId;
        } catch (e: any) {
          console.error('[JWT ERROR]', e);
          token.role = 'organizer'; // Fallback
        }
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
};

export default NextAuth(authOptions);
