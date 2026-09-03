#!/usr/bin/env node
/**
 * Seeds the `gallery-events` collection with the content from the live site's
 * /gallery/ page (theglobalacademy.ac/gallery/) — that page isn't backed by a
 * WordPress custom post type (it's a plain page with embedded gallery blocks),
 * so it was never part of extract.py / migrate.mjs. This script was written
 * from a direct read of the live page instead.
 *
 * Idempotent: upserts each event by its `slug`, so re-running this is safe.
 *
 * Images are NOT downloaded here — every photo's `sourceUrl` carries the
 * original WordPress attachment URL for import-images.mjs to resolve later,
 * matching the "migrate data now, images later" approach used everywhere else
 * in this project.
 *
 * Usage: npm run migrate:gallery   (from the project root; requires .env +
 * DATABASE_URL pointed at the Postgres you want seeded)
 */
import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../src/payload.config.ts'

const EVENTS = [
  {
    slug: 'edinburgh-online-workshop-december-2021',
    title: 'University of Edinburgh Online workshop December 2021',
    category: '2030 SDGs simulation workshops',
    description:
      'An online workshop as part of ‘SDGs Week’ organised by the SDGs Network of post graduate reseachers.\n' +
      'The workshop was sponsored by the School of Social and Political Science at the University of Edinburgh, UK.',
    sortOrder: 10,
    photos: [
      {
        sourceUrl: 'https://theglobalacademy.ac/wp-content/uploads/2022/04/Edinburgh_SDGs_finalscore_2021-1.png',
      },
      {
        sourceUrl: 'https://theglobalacademy.ac/wp-content/uploads/2022/04/feedback-for-gallery.png',
        caption: 'Feedback comments from workshop participants',
      },
    ],
  },
  {
    slug: 'outdoors-and-unplugged-workshop-may-2021',
    title: "'Outdoors and Unplugged' SDGs workshop May 2021",
    category: '2030 SDGs simulation workshops',
    description:
      'We had hoped for spring weather for our first outdoor workshop. Instead it was colder than expected ' +
      'and we were very glad of our campfires!\n' +
      'Nonetheless, our first ‘unplugged’ SDGs simulation was great fun. Fat Squirrel Outdoors is a unique ' +
      'workspace in North Oxfordshire and the 5 teams created a world they were pleased with.\n' +
      'Being in woodland made our discussions around the environment, economy and society very immediate. ' +
      'We’re heading back to Fat Squirrel for our next outdoor workshop in June 2022.',
    sortOrder: 20,
    photos: [
      { sourceUrl: 'https://theglobalacademy.ac/wp-content/uploads/2022/04/Always-better-outdoors-2-2.png' },
      {
        sourceUrl: 'https://theglobalacademy.ac/wp-content/uploads/2022/04/Team-working-to-change-their-world-2-1.png',
      },
      {
        sourceUrl:
          'https://theglobalacademy.ac/wp-content/uploads/2022/04/The-SDGs-exchange-office-Outdoors-and-Unplugged-2-2.png',
      },
      {
        sourceUrl: 'https://theglobalacademy.ac/wp-content/uploads/2022/04/lunchtime.png',
        caption: 'Team having camp lunch',
      },
    ],
  },
  {
    slug: 'makespace-oxford-workshop-february-2020',
    title: "Community workshop at 'Makespace' in Oxford, February 2020",
    category: '2030 SDGs simulation workshops',
    description:
      'A busy, pre-pandemic, workshop in one of Oxford’s community workspaces.\n' +
      '7 teams worked hard to achieve the SDGs and a balanced world before 2030.\n' +
      '6 of the teams achieved their team objectives and the final outcome was a strong economy, healthy ' +
      'society and improving environment.',
    sortOrder: 30,
    photos: [
      {
        sourceUrl: 'https://theglobalacademy.ac/wp-content/uploads/2022/04/Makespace-February-2020-scaled.jpeg',
        caption: 'Many workshop participants in a large room learning about the 2030 SDGs simulation',
      },
      {
        sourceUrl: 'https://theglobalacademy.ac/wp-content/uploads/2022/04/Collaboration-concern-and-cake-scaled.jpg',
        caption: 'Collaborating workshop participants planning their next projects',
      },
      {
        sourceUrl:
          'https://theglobalacademy.ac/wp-content/uploads/2022/04/0BD61127-D2CB-4EA4-92BB-D9A2AD73E554-scaled.jpeg',
        caption: 'Workshop participants around a table looking at cards and materials',
      },
      {
        sourceUrl: 'https://theglobalacademy.ac/wp-content/uploads/2022/04/Bhanu-Dave-and-Kim-scaled.jpg',
        caption: 'Participants considering strategy to achieve a balanced world by 2030',
      },
      {
        sourceUrl: 'https://theglobalacademy.ac/wp-content/uploads/2022/04/Carole-Karen-and-Nicola-scaled.jpg',
        caption: 'Participants reviewing completed projects as they work towards a balanced world by 2030',
      },
      {
        sourceUrl:
          'https://theglobalacademy.ac/wp-content/uploads/2022/04/10E11B71-1AAC-401D-BEF3-255D121F402A-scaled.jpeg',
        caption: "The 'World Condition Meter' scorecard showing the progress made towards a balanced world in 2030.",
      },
    ],
  },
]

async function upsert(payload, collection, where, data) {
  const existing = await payload.find({ collection, where, limit: 1, depth: 0 })
  if (existing.docs[0]) {
    return payload.update({ collection, id: existing.docs[0].id, data })
  }
  return payload.create({ collection, data })
}

async function main() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const log = (msg) => payload.logger.info(msg)

  for (const event of EVENTS) {
    await upsert(payload, 'gallery-events', { slug: { equals: event.slug } }, event)
    log(`  seeded: ${event.title}`)
  }

  log(`Gallery seed complete. ${EVENTS.length} events upserted.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
