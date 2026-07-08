import type { Metadata } from 'next'
import { FileText } from 'lucide-react'
import { StaticPageShell, StaticSection } from '@/components/StaticPageShell'
import { SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The terms that govern your use of ${SITE_NAME}.`,
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <StaticPageShell title="Terms of Service" icon={<FileText size={17} className="text-primary" />}>
      <p className="text-xs text-muted-foreground">Last updated: July 2026</p>
      <StaticSection title="1. Using the platform">
        <p>
          {SITE_NAME} lets you browse and order from independent local shops. Each shop is
          responsible for its own product listings, pricing, and stock — we connect you, but the
          order itself is between you and the shop.
        </p>
      </StaticSection>
      <StaticSection title="2. Orders and payment">
        <p>
          Placing an order is a request to purchase, which the shop can accept or decline (for
          example, if an item just sold out). Payment is collected by the shop at delivery or
          pickup, according to the payment method you choose at checkout.
        </p>
      </StaticSection>
      <StaticSection title="3. Delivery and pickup">
        <p>
          Delivery availability, radius, and fees are set by each shop individually. Estimated
          delivery times are estimates, not guarantees.
        </p>
      </StaticSection>
      <StaticSection title="4. Account responsibilities">
        <p>
          You&apos;re responsible for keeping your account details accurate and for any activity
          under your account. Please provide a working phone number so shops can reach you about
          your order.
        </p>
      </StaticSection>
    </StaticPageShell>
  )
}
