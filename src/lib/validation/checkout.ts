import { z } from 'zod'

/**
 * Validates the checkout form before it's sent to Supabase. This is
 * defense-in-depth alongside the DB CHECK constraints on online_orders
 * (non-negative amounts, non-empty items) — those catch anything that
 * bypasses the UI entirely; this catches bad input at the form, with a
 * clear message, before a request is even made.
 */
export const checkoutSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name.').max(80, 'Name is too long.'),
  phone: z.string().trim()
    .transform(v => v.replace(/\D/g, ''))
    .refine(v => v.length === 10, 'Enter a valid 10-digit phone number.'),
  wantsDelivery: z.boolean(),
  address: z.string().trim().max(500, 'Address is too long.'),
  note: z.string().trim().max(300, 'Note is too long (max 300 characters).').optional(),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
    totalPrice: z.number().nonnegative(),
  })).min(1, 'Your cart is empty.'),
  subtotal: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  total: z.number().nonnegative(),
}).superRefine((data, ctx) => {
  if (data.wantsDelivery && !data.address) {
    ctx.addIssue({ code: 'custom', path: ['address'], message: 'Please enter your delivery address.' })
  }
})

export type CheckoutInput = z.input<typeof checkoutSchema>
