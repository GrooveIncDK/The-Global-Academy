import type { Endpoint } from 'payload'
import Stripe from 'stripe'

/**
 * POST /api/jobs/:id/checkout
 * Body: { priceTierId: string }
 *
 * Creates a Stripe Checkout Session for publishing one job listing, matching
 * the live site's "Products and Pricing" flow. On completion, the
 * `checkout.session.completed` webhook (src/plugins/stripe.ts) flips the
 * job to paymentStatus: 'paid' + isPublished: true.
 *
 * Registered on the Jobs collection itself (see collections/Jobs.ts) —
 * collection-level endpoints are mounted under /api/<collection-slug>/...,
 * so the path here is relative to /api/jobs/.
 */
export const createJobCheckoutEndpoint: Endpoint = {
  path: '/:id/checkout',
  method: 'post',
  handler: async (req) => {
    const { payload, routeParams } = req
    const jobId = routeParams?.id as string

    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'STRIPE_SECRET_KEY is not configured' }, { status: 500 })
    }

    const body = (await req.json?.()) as { priceTierId?: string } | undefined
    const priceTierId = body?.priceTierId

    if (!priceTierId) {
      return Response.json({ error: 'priceTierId is required' }, { status: 400 })
    }

    const [job, priceTier] = await Promise.all([
      payload.findByID({ collection: 'jobs', id: jobId }),
      payload.findByID({ collection: 'pricing-tiers', id: priceTierId }),
    ])

    if (!job || !priceTier) {
      return Response.json({ error: 'Job or pricing tier not found' }, { status: 404 })
    }

    if (!priceTier.stripePriceId) {
      return Response.json(
        { error: `Pricing tier "${priceTier.name}" has no stripePriceId set yet` },
        { status: 400 },
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceTier.stripePriceId, quantity: 1 }],
      metadata: { jobId: String(job.id) },
      success_url: `${siteUrl}/jobs/${job.slug}?checkout=success`,
      cancel_url: `${siteUrl}/jobs/${job.slug}?checkout=cancelled`,
    })

    await payload.update({
      collection: 'jobs',
      id: jobId,
      data: { priceTier: priceTier.id, paymentStatus: 'pending' },
    })

    return Response.json({ checkoutUrl: session.url })
  },
}
