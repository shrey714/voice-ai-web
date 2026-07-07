import type { Metadata } from 'next'
import { HelpCircle } from 'lucide-react'
import { StaticPageShell, StaticSection } from '@/components/StaticPageShell'

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'Answers to common questions about ordering, delivery, payments, and returns.',
}

const FAQS = [
  {
    q: 'How does delivery work?',
    a: "Each shop sets its own delivery radius and fee. If you're outside a shop's delivery range, you can still place an order for pickup at the store.",
  },
  {
    q: 'What payment methods are accepted?',
    a: 'Right now every shop supports Cash on Delivery and Pay at Store. Online payments are on our roadmap.',
  },
  {
    q: 'Can I cancel or change my order?',
    a: 'Contact the shop directly using the phone number on your order tracking page — orders are fulfilled by the shop, so they have the fastest way to help.',
  },
  {
    q: 'How do I track my order?',
    a: 'Open "My Orders" from the account menu — each order has a live status page that updates automatically as the shop prepares it.',
  },
  {
    q: 'A shop shows as closed — can I still browse?',
    a: "Yes, you can browse a closed shop's full catalog and add items to your wishlist, but you won't be able to place an order until it reopens.",
  },
]

export default function HelpPage() {
  return (
    <StaticPageShell title="Help Center" icon={<HelpCircle size={17} className="text-primary" />}>
      <StaticSection title="Frequently asked questions">
        <div className="divide-y divide-border -mx-1">
          {FAQS.map(f => (
            <details key={f.q} className="group py-3 px-1 first:pt-0 last:pb-0">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none font-semibold text-sm text-foreground">
                {f.q}
                <span className="text-muted-foreground transition-transform group-open:rotate-45 text-lg leading-none">+</span>
              </summary>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">{f.a}</p>
            </details>
          ))}
        </div>
      </StaticSection>
      <StaticSection title="Still need help?">
        <p>
          Reach out to the shop directly for order-specific questions — their contact details are
          on your order tracking page. For anything else, we&apos;re always working on making
          this easier.
        </p>
      </StaticSection>
    </StaticPageShell>
  )
}
