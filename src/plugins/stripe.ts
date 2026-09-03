import { stripePlugin } from '@payloadcms/plugin-stripe'
import type { StripeWebhookHandler } from '@payloadcms/plugin-stripe/types'

/**
 * Backs the live site's "Products and Pricing" / paid job-listing flow.
 *
 * Two pieces work together:
 *  1. This plugin — syncs `pricing-tiers` docs to Stripe Products, and
 *     listens for `checkout.session.completed` to mark the paid Job
 *     published. Auto-registers POST /api/stripe/webhooks.
 *  2. src/endpoints/createJobCheckout.ts — a custom Payload endpoint that
 *     creates the actual Stripe Checkout Session for a given job + tier
 *     (the plugin itself only handles product/customer sync and webhooks,
 *     not creating one-off checkout sessions).
 *
 * Local testing:
 *   stripe listen --forward-to localhost:3000/api/stripe/webhooks
 *   stripe trigger checkout.session.completed
 */

const handleCheckoutCompleted: StripeWebhookHandler = async ({ event, payload }) => {
  const session = event.data.object as {
    id: string
    metadata?: { jobId?: string }
    payment_intent?: string | { id: string }
  }

  const jobId = session.metadata?.jobId
  if (!jobId) {
    payload.logger.warn(`checkout.session.completed (${session.id}) had no jobId in metadata — skipping`)
    return
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id

  await payload.update({
    collection: 'jobs',
    id: jobId,
    data: {
      paymentStatus: 'paid',
      isPublished: true,
      stripePaymentIntentId: paymentIntentId,
    },
  })

  payload.logger.info(`Job ${jobId} marked paid + published from Stripe session ${session.id}`)
}

export const jobsBoardStripePlugin = stripePlugin({
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhooksEndpointSecret: process.env.STRIPE_WEBHOOK_SECRET,
  isTestKey: (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test_'),
  logs: true,
  sync: [
    {
      collection: 'pricing-tiers',
      stripeResourceType: 'products',
      stripeResourceTypeSingular: 'product',
      fields: [
        { fieldPath: 'name', stripeProperty: 'name' },
        { fieldPath: 'stripePriceId', stripeProperty: 'default_price' },
      ],
    },
  ],
  webhooks: {
    'checkout.session.completed': handleCheckoutCompleted,
  },
})
