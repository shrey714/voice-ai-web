import type { Metadata } from 'next'
import { Store } from 'lucide-react'
import { StaticPageShell, StaticSection } from '@/components/StaticPageShell'
import { SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: 'About Us',
  description: `${SITE_NAME} connects you with local shops near you — fresh products, fast delivery, and support for your neighbourhood.`,
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <StaticPageShell title="About Us" icon={<Store size={17} className="text-primary" />}>
      <StaticSection title={`Why ${SITE_NAME}?`}>
        <p>
          {SITE_NAME} was built on a simple idea: the shops down your street already have what
          you need — they just needed an easier way to reach you. We help local grocers,
          electronics stores, and everyday shops put their catalog online, so you can browse,
          order, and get it delivered (or pick it up) without leaving your neighbourhood behind.
        </p>
      </StaticSection>
      <StaticSection title="What we stand for">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Supporting local businesses instead of routing everything through a warehouse.</li>
          <li>Fast, honest delivery windows — no inflated ETAs.</li>
          <li>Transparent pricing with no hidden platform markups on the shops we work with.</li>
        </ul>
      </StaticSection>
      <StaticSection title="Our story">
        <p>
          What started as a way to help a handful of shopkeepers manage their inventory has grown
          into a marketplace connecting local stores with customers who&apos;d rather support
          their neighbourhood than wait for a warehouse three cities away.
        </p>
      </StaticSection>
    </StaticPageShell>
  )
}
