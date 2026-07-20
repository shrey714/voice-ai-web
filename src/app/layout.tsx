import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import './globals.css'
import { cn } from '@/lib/utils'
import { SITE_URL, SITE_NAME } from '@/lib/site'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Footer } from '@/components/Footer'
import { BottomNav } from '@/components/BottomNav'
import { DecorativeBlobs } from '@/components/DecorativeBlobs'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const DESCRIPTION = 'Browse products and order from local shops near you. Fast, fresh, and delivered.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Order from local shops`, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: SITE_NAME },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Order from local shops`,
    description: DESCRIPTION,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Order from local shops`,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Do NOT set maximumScale/userScalable — capping zoom is a WCAG 1.4.4 failure.
  // iOS auto-zoom on focus is already prevented via 16px+ input font-size, not a zoom lock.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    // Matches the resolved dark --background token (oklch(0.145 0 0)) so the mobile
    // browser chrome doesn't seam against the page. Was #0a0a0a (too dark).
    { media: '(prefers-color-scheme: dark)', color: '#242424' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(inter.variable, 'overflow-x-clip')} suppressHydrationWarning>
      {/* No bg-background here — DecorativeBlobs (below) provides the solid
          base fill itself, so there's no ambiguity between body's own
          background and a fixed, negative-z-index child fighting over which
          one is "the" page background. */}
      {/* overflow-x-clip: decorative bleed (blob gradients, the hero's blurred
          wash) can extend past a viewport-edge element without this —
          harmless in isolation, but it expands the document's own scrollable
          width, causing whole-page horizontal scroll and, downstream, a
          layout-shift glitch in sheet slide-in animations that assume the
          viewport width is stable. `clip` (not `hidden`) only clips paint —
          it doesn't create a new scroll container or touch overflow-y. */}
      <body className={cn('min-h-screen font-sans antialiased flex flex-col overflow-x-clip')}>
        <NuqsAdapter>
          <ThemeProvider>
            <TooltipProvider delayDuration={200}>
              <DecorativeBlobs />
              <a
                href="#content"
                className="sr-only focus:not-sr-only focus:fixed focus:z-100 focus:top-3 focus:left-3 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-premium"
              >
                Skip to content
              </a>
              <div id="content" className="flex-1">{children}</div>
              <Footer />
              <BottomNav />
              <Toaster position="top-center" closeButton gap={10} />
            </TooltipProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}
