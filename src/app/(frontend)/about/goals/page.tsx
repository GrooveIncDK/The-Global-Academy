import type { Metadata } from 'next'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { SdgGoal, SdgTarget } from '@/payload-types'
import { contrastTextColor } from '../../lib/display'

export const metadata: Metadata = {
  title: 'Goals and targets — The Global Academy',
  description:
    'The UN Sustainable Development Goals and their targets, as tracked by The Global Academy.',
}
// See the comment on this line in the homepage (src/app/(frontend)/page.tsx) —
// this route queries Postgres too, so it gets the same build-time-hang fix.
export const dynamic = 'force-dynamic'

function GoalAccordion({ goal, targets }: { goal: SdgGoal; targets: SdgTarget[] }) {
  return (
    <details className="goal-accordion">
      <summary>
        <span
          className="goal-dot goal-dot-lg"
          style={{ background: goal.colorHex ?? '#888', color: contrastTextColor(goal.colorHex) }}
        >
          {String(goal.number).padStart(2, '0')}
        </span>
        <span className="goal-accordion-title">{goal.title}</span>
      </summary>
      <div className="goal-targets">
        {targets.length > 0 ? (
          targets.map((t) => (
            <div key={t.id} className="goal-target">
              <span className="goal-target-code">{t.code}</span>
              <div>
                <h4>{t.title}</h4>
                <p>{t.description}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="goal-target-empty">No targets recorded for this goal yet.</p>
        )}
      </div>
    </details>
  )
}

export default async function GoalsPage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const [goals, targets] = await Promise.all([
    payload.find({ collection: 'sdg-goals', sort: 'number', limit: 100, depth: 0 }),
    payload.find({ collection: 'sdg-targets', sort: 'sortOrder', limit: 500, depth: 0 }),
  ])

  const targetsByGoal = new Map<number, SdgTarget[]>()
  for (const t of targets.docs) {
    const goalId = typeof t.goal === 'object' ? t.goal.id : t.goal
    if (!targetsByGoal.has(goalId)) targetsByGoal.set(goalId, [])
    targetsByGoal.get(goalId)!.push(t)
  }

  return (
    <div className="goals-page">
      <div className="wrap">
        <h1>Goals and targets</h1>
        <p className="goals-sub">
          The 17 UN Sustainable Development Goals, and the specific targets our researchers&rsquo;
          work maps to. Select a goal to see its targets.
        </p>

        <div className="goals-list">
          {goals.docs.map((goal) => (
            <GoalAccordion key={goal.id} goal={goal} targets={targetsByGoal.get(goal.id) || []} />
          ))}
        </div>
      </div>
    </div>
  )
}
