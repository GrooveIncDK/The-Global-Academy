/**
 * Seeds the 17 SDG goals and their full target list.
 *
 * Run with: npm run seed
 * (requires DATABASE_URL / PAYLOAD_SECRET in .env, same as `npm run dev`)
 */
import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../payload.config'
import { sdgGoals, sdgTargets } from './sdgs'

async function run() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  payload.logger.info('Seeding SDG goals...')
  const goalIdByNumber = new Map<number, number | string>()

  for (const goal of sdgGoals) {
    const existing = await payload.find({
      collection: 'sdg-goals',
      where: { code: { equals: goal.code } },
      limit: 1,
    })

    const doc = existing.docs[0]
      ? await payload.update({
          collection: 'sdg-goals',
          id: existing.docs[0].id,
          data: goal,
        })
      : await payload.create({
          collection: 'sdg-goals',
          data: goal,
        })

    goalIdByNumber.set(goal.number, doc.id)
  }

  payload.logger.info(`Seeded ${sdgGoals.length} goals. Seeding targets...`)

  let created = 0
  let updated = 0

  for (const target of sdgTargets) {
    const goalId = goalIdByNumber.get(target.goalNumber)
    if (!goalId) {
      payload.logger.warn(`No goal found for target ${target.code} (goal ${target.goalNumber}) — skipping`)
      continue
    }

    const existing = await payload.find({
      collection: 'sdg-targets',
      where: { code: { equals: target.code } },
      limit: 1,
    })

    const data = {
      code: target.code,
      goal: goalId,
      title: target.title,
      description: target.description,
    }

    if (existing.docs[0]) {
      await payload.update({ collection: 'sdg-targets', id: existing.docs[0].id, data })
      updated += 1
    } else {
      await payload.create({ collection: 'sdg-targets', data })
      created += 1
    }
  }

  payload.logger.info(`Targets seeded: ${created} created, ${updated} updated.`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
