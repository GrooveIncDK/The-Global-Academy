import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Institutions } from './collections/Institutions'
import { ResearchGroups } from './collections/ResearchGroups'
import { Researchers } from './collections/Researchers'
import { SDGGoals } from './collections/SDGGoals'
import { SDGTargets } from './collections/SDGTargets'
import { Jobs } from './collections/Jobs'
import { PricingTiers } from './collections/PricingTiers'
import { PostCategories } from './collections/PostCategories'
import { Posts } from './collections/Posts'
import { TeamMembers } from './collections/TeamMembers'
import { Pages } from './collections/Pages'
import { GalleryEvents } from './collections/GalleryEvents'
import { jobsBoardStripePlugin } from './plugins/stripe'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    // Auth / media
    Users,
    Media,
    // Directory
    Researchers,
    Institutions,
    ResearchGroups,
    // SDG reference data (seed via src/seed/sdgs.ts)
    SDGGoals,
    SDGTargets,
    // Jobs board
    Jobs,
    PricingTiers,
    // Content
    Posts,
    PostCategories,
    TeamMembers,
    Pages,
    GalleryEvents,
  ],
  editor: lexicalEditor(),
  // Wide open for local development so the static frontend (opened straight from
  // disk, or served from any port) can call the read-only public endpoints —
  // researchers/jobs/posts already gate what's returned via each collection's own
  // access control, so this doesn't expose anything private. Narrow this to your
  // real frontend's origin(s) before this ever goes on the public internet.
  cors: '*',
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      // max:1 was wrong. It assumed the old serverless model — one request
      // per instance, many isolated instances — where a tiny pool per
      // instance keeps total connections low. Vercel's current default
      // execution model (Fluid Compute) lets ONE warm instance serve several
      // concurrent requests, all sharing this same pool. With max:1, the
      // second concurrent request has to wait for the first query to finish
      // and release the connection; if that wait exceeds
      // connectionTimeoutMillis, pg throws the exact "timeout exceeded when
      // trying to connect" error this was doing in production — not a real
      // network/DB problem, just every request serializing through one
      // connection. A transaction-mode pooler (Supabase Supavisor on port
      // 6543 — NOT the session-mode pooler on 5432) is built to handle many
      // short-lived connections cheaply, so a small-but-not-1 pool per
      // instance is the correct fit here.
      max: process.env.VERCEL ? 5 : 10,
      // pg's default is 0 (wait forever). If Postgres is ever slow to accept
      // a connection — a cold/paused database, a pooler under load, a network
      // hiccup — this makes it fail fast with a clear error instead of hanging
      // until something else's timeout (e.g. Vercel's 60s per-page build
      // timeout) kills it after minutes of silence.
      connectionTimeoutMillis: 10_000,
    },
  }),
  sharp,
  localization: {
    locales: ['en'],
    fallback: true,
    defaultLocale: 'en',
  },
  // Registers POST /api/stripe/webhooks and syncs pricing-tiers to Stripe
  // Products — see src/plugins/stripe.ts for the fulfillment logic. The
  // POST /api/jobs/:id/checkout endpoint (src/endpoints/createJobCheckout.ts)
  // is registered directly on the Jobs collection — see collections/Jobs.ts.
  plugins: [jobsBoardStripePlugin],
})
