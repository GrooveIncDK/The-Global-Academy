import type { CollectionConfig } from 'payload'

// Backs the live site's "Products and Pricing" page for paid job listings.
export const PricingTiers: CollectionConfig = {
  slug: 'pricing-tiers',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'e.g. "Standard listing", "Featured listing"' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'priceCents',
          type: 'number',
          required: true,
          admin: { width: '33%' },
        },
        {
          name: 'currency',
          type: 'text',
          defaultValue: 'gbp',
          admin: { width: '33%' },
        },
        {
          name: 'durationDays',
          type: 'number',
          defaultValue: 30,
          admin: { width: '34%' },
        },
      ],
    },
    {
      name: 'stripePriceId',
      type: 'text',
      admin: {
        description: 'Price ID from the Stripe dashboard — see plugins/stripe.ts',
      },
    },
  ],
}
