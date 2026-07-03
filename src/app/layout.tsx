import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Footer } from '@/components/Footer'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: { default: 'ShopNear — Order from local shops', template: '%s · ShopNear' },
  description: 'Browse products and order from local shops near you. Fast, fresh, and delivered.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'ShopNear' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased flex flex-col')}>
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>
            <a
              href="#content"
              className="sr-only focus:not-sr-only focus:fixed focus:z-100 focus:top-3 focus:left-3 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-premium"
            >
              Skip to content
            </a>
            <div id="content" className="flex-1">{children}</div>
            <Footer />
            <Toaster position="top-center" closeButton gap={10} />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
