import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { Media, ResearchGroup, SdgGoal } from '@/payload-types'
import { PLACEHOLDER_PHOTO, contrastTextColor, countryName } from '../../lib/display'

export const metadata: Metadata = {
  title: 'Research groups — The Global Academy',
  description: 'Research groups working across institutions towards the UN Sustainable Development Goals.',
}
// See the comment on this line in the homepage (src/app/(frontend)/page.tsx) —
// this route queries Postgres too, so it gets the same build-time-hang fix.
export const dynamic = 'force-dynamic'

function GroupCard({ group }: { group: ResearchGroup }) {
  const photo = group.groupPhoto && typeof group.groupPhoto === 'object' ? (group.groupPhoto as Media).url : null
  const goals = (group.sdgGoals || []).filter((g): g is SdgGoal => typeof g === 'object' && g !== null)

  return (
    <Link className="group-card" href={`/explore/research-groups/${group.slug}`}>
      <div className="group-photo-wrap">
        <img src={photo || PLACEHOLDER_PHOTO} alt={group.name} loading="lazy" />
      </div>
      <h3>{group.name}</h3>
      {group.mainCountry && <div className="country">{countryName(group.mainCountry)}</div>}
      {goals.length > 0 && (
        <div className="goal-badges">
          {goals
            .sort((a, b) => a.number - b.number)
            .map((g) => (
              <div
                key={g.id}
                className="goal-dot"
                style={{ background: g.colorHex ?? '#888', color: contrastTextColor(g.colorHex) }}
              >
                {String(g.number).padStart(2, '0')}
              </div>
            ))}
        </div>
      )}
    </Link>
  )
}

export default async function ResearchGroupsPage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const groups = await payload.find({
    collection: 'research-groups',
    sort: 'name',
    limit: 100,
    depth: 1,
  })

  return (
    <div className="groups-page">
      <div className="wrap">
        <h1>Research groups</h1>
        <p className="groups-sub">
          Teams of researchers working together across institutions and countries.
        </p>

        <div className="groups-grid">
          {groups.docs.length > 0 ? (
            groups.docs.map((g) => <GroupCard key={g.id} group={g} />)
          ) : (
            <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>No research groups listed yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
