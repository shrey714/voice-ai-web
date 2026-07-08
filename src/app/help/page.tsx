import type { Metadata } from 'next'
import { HelpCircle } from 'lucide-react'
import { StaticPageShell, StaticSection } from '@/components/StaticPageShell'

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'Answers to common questions about ordering, delivery, payments, and returns.',
  alternates: { canonical: '/help' },
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
    a: "A new order stays 'pending' until the shop confirms it. If it isn't confirmed within the shop's time window it's cancelled automatically — and since payment is Cash on Delivery or Pay at Store, nothing is charged. Once a shop confirms an order they've already started preparing it, so it can't be changed from here; just place a fresh order for anything you missed.",
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
          Every order has a live tracking page that updates on its own as the shop moves it from
          received to confirmed, ready, and delivered — so you can always see exactly where things
          stand. The shop fulfilling your order is closest to the details, and for anything else
          we&apos;re always working on making this easier.
        </p>
      </StaticSection>
    </StaticPageShell>
  )
}
