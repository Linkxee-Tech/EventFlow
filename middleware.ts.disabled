import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Already authenticated — allow through
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

// Protect all dashboard routes + organizer API routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/events/:path*',
    '/api/stripe/:path*',
    '/api/ai/:path*',
    '/api/user/:path*',
  ],
};
