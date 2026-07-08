'use client'
import { useEffect } from 'react'

// Root layout itself failed — can't rely on globals.css/theme having loaded,
// so this stays inline-styled and dependency-free on purpose.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global-error]', error)
  }, [error])

  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F6F5F1', color: '#111' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>Please refresh the page or try again shortly.</p>
          {/* A plain anchor, not next/link — the root layout that provides
              the router context just crashed, so this can't depend on it.
              "Try again" alone was a dead end if the error keeps recurring. */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={reset}
              style={{ padding: '10px 20px', borderRadius: 10, background: '#215B66', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- deliberate: next/link needs router context from the very root layout that just crashed */}
            <a
              href="/"
              style={{ padding: '10px 20px', borderRadius: 10, background: 'transparent', color: '#215B66', fontWeight: 700, border: '1px solid #215B66', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
