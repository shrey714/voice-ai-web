'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // next-themes suppresses transitions for one frame on toggle, so the
      // theme flips instantly instead of animating background-color on every
      // surface at once (a whole-page paint storm on low-end devices).
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
