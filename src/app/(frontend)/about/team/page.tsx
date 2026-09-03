import type { Metadata } from 'next'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { Media, TeamMember } from '@/payload-types'
import { PLACEHOLDER_PHOTO } from '../../lib/display'
import { lexicalToPlainText } from '../../lib/richtext'

export const metadata: Metadata = {
  title: 'Meet the team — The Global Academy',
  description: 'The team behind The Global Academy for Global Goals CIC.',
}
// See the comment on this line in the homepage (src/app/(frontend)/page.tsx) —
// this route queries Postgres too, so it gets the same build-time-hang fix.
export const dynamic = 'force-dynamic'

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'Twitter / X',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  youtube: 'YouTube',
  mastodon: 'Mastodon',
  bluesky: 'BlueSky',
}

function TeamMemberCard({ member }: { member: TeamMember }) {
  const photo = member.photo && typeof member.photo === 'object' ? (member.photo as Media).url : null
  const bio = lexicalToPlainText(member.bio as never)
  const links = (member.socialLinks || []).filter((l) => l?.url)

  return (
    <div className="team-card">
      <div className="team-photo-wrap">
        <img src={photo || PLACEHOLDER_PHOTO} alt={member.fullName} loading="lazy" />
      </div>
      <h3>{member.fullName}</h3>
      <div className="team-role">{member.role}</div>
      {bio && (
        <div className="team-bio">
          {bio.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}
      {links.length > 0 && (
        <div className="team-social-row">
          {links.map((link, i) => (
            <a key={i} href={link.url ?? '#'} target="_blank" rel="noopener noreferrer">
              {PLATFORM_LABELS[link.platform ?? ''] ?? link.platform}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default async function TeamPage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const members = await payload.find({
    collection: 'team-members',
    sort: 'sortOrder',
    limit: 100,
    depth: 1,
  })

  return (
    <div className="team-page">
      <div className="wrap">
        <h1>Meet the team</h1>
        <p className="team-sub">
          The people running The Global Academy for Global Goals CIC day to day.
        </p>

        <div className="team-grid">
          {members.docs.length > 0 ? (
            members.docs.map((member) => <TeamMemberCard key={member.id} member={member} />)
          ) : (
            <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>No team members listed yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
