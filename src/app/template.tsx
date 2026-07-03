// Re-mounts on every route change, so the fade re-triggers per navigation.
// Opacity-only (see .animate-page) to avoid breaking position:fixed bars.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>
}
