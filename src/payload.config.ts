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
  ],
  editor: lexicalEditor(),
  cors: '*',
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
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
