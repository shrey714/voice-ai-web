import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'
import { StaticPageShell, StaticSection } from '@/components/StaticPageShell'
import { SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE_NAME} collects, uses, and protects your data.`,
}

export default function PrivacyPage() {
  return (
    <StaticPageShell title="Privacy Policy" icon={<ShieldCheck size={17} className="text-primary" />}>
      <p className="text-xs text-muted-foreground">Last updated: 2026</p>
      <StaticSection title="What we collect">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Your phone number, used only for order verification and delivery updates.</li>
          <li>Delivery addresses you save, so you don&apos;t have to re-enter them each time.</li>
          <li>Order history, so you can track past and current orders.</li>
        </ul>
      </StaticSection>
      <StaticSection title="How we use it">
        <p>
          Your information is used to process orders and connect you with the shops you order
          from. We don&apos;t sell your data, and we only share the details a shop needs to
          fulfil your order — your name, phone number, and delivery address.
        </p>
      </StaticSection>
      <StaticSection title="Your choices">
        <p>
          You can remove saved addresses at any time from your account, and your phone number is
          used only for order verification — we never share it for marketing purposes.
        </p>
      </StaticSection>
    </StaticPageShell>
  )
}
