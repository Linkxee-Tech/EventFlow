import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'EventFlow', template: '%s | EventFlow' },
  description:
    'Fair-trade ticketing for independent creators. Flat 2.5% + $0.30. Atomic inventory. Direct payouts.',
  keywords: ['ticketing', 'events', 'tickets', 'organizer', 'Lagos', 'Africa'],
  authors: [{ name: 'EventFlow' }],
  creator: 'EventFlow',
  openGraph: {
    type: 'website',
    siteName: 'EventFlow',
    title: 'EventFlow — Fair-Trade Ticketing',
    description: 'Sell tickets without losing 10%+ to fees.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EventFlow — Fair-Trade Ticketing',
    description: 'Sell tickets without losing 10%+ to fees.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  // Phase 9: Font size >= 16px on mobile prevents iOS zoom on inputs
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F0F1A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="bg-[#0F0F1A] text-white antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          {/* Phase 9: Sonner toasts — all states wired */}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              style: {
                background: '#1A1A2E',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#F1F5F9',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
