import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { Media, Researcher, SdgGoal } from '@/payload-types'
import { PLACEHOLDER_PHOTO, contrastTextColor, countryName } from '../../../lib/display'
import { lexicalToPlainText } from '../../../lib/richtext'

// See the comment on this line in the homepage (src/app/(frontend)/page.tsx) —
// this route queries Postgres too, so it gets the same build-time-hang fix.
export const dynamic = 'force-dynamic'

async function getGroup(slug: string) {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const result = await payload.find({
    collection: 'research-groups',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })
  return result.docs[0] || null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const group = await getGroup(slug)
  if (!group) return { title: 'Research group not found — The Global Academy' }
  return {
    title: `${group.name} — The Global Academy`,
    description: group.description || undefined,
  }
}

function GoalBadges({ goals }: { goals: (number | SdgGoal)[] | null | undefined }) {
  const list = (goals || []).filter((g): g is SdgGoal => typeof g === 'object' && g !== null)
  if (list.length === 0) return null
  return (
    <div className="goal-badges">
      {list
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
  )
}

export default async function ResearchGroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const group = await getGroup(slug)
  if (!group) notFound()

  const photo = group.groupPhoto && typeof group.groupPhoto === 'object' ? (group.groupPhoto as Media).url : null
  const universityLogo =
    group.universityLogo && typeof group.universityLogo === 'object' ? (group.universityLogo as Media).url : null
  const focus = lexicalToPlainText(group.focus as never)
  const researchers = (group.researchers || []).filter(
    (r): r is Researcher => typeof r === 'object' && r !== null,
  )
  const socialLinks = [
    group.facebook && { label: 'Facebook', href: group.facebook },
    group.twitter && { label: 'Twitter / X', href: group.twitter },
    group.linkedin && { label: 'LinkedIn', href: group.linkedin },
    group.wikipedia && { label: 'Wikipedia', href: group.wikipedia },
  ].filter((l): l is { label: string; href: string } => Boolean(l))

  return (
    <div className="group-detail-page">
      <div className="wrap">
        <Link href="/explore/research-groups" className="news-back-link">
          ← Back to Research groups
        </Link>

        <div className="group-detail-header">
          {photo && (
            <div className="group-detail-photo">
              <img src={photo} alt={group.name} />
            </div>
          )}
          <div>
            <h1>{group.name}</h1>
            {group.mainCountry && <div className="country">{countryName(group.mainCountry)}</div>}
            <GoalBadges goals={group.sdgGoals} />
          </div>
          {universityLogo && (
            <div className="group-detail-logo">
              <img src={universityLogo} alt="" />
            </div>
          )}
        </div>

        {group.description && <p className="group-detail-description">{group.description}</p>}

        {focus && (
          <div className="group-detail-body">
            {focus.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        {group.video && (
          <div className="group-detail-video-link">
            <a href={group.video} target="_blank" rel="noopener noreferrer" className="btn-outline">
              Watch overview video
            </a>
          </div>
        )}

        {group.currentResearch && group.currentResearch.length > 0 && (
          <section className="group-current-research">
            <h2>Current research</h2>
            <div className="goal-targets">
              {group.currentResearch.map((item, i) => (
                <div key={item.id ?? i} className="goal-target">
                  <div>
                    {item.title && <h4>{item.title}</h4>}
                    {item.description && <p>{item.description}</p>}
                    <GoalBadges goals={item.sdgGoals} />
                    {item.videos && item.videos.length > 0 && (
                      <ul className="team-social-row" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
                        {item.videos.map((v, vi) => (
                          <li key={v.id ?? vi}>
                            <a href={v.url ?? '#'} target="_blank" rel="noopener noreferrer">
                              {v.title || 'Watch video'}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {researchers.length > 0 && (
          <section className="group-researchers">
            <h2>Researchers in this group</h2>
            <div className="team-grid">
              {researchers.map((r) => (
                <Link key={r.id} href={`/explore/researchers/${r.slug}`} className="team-card">
                  <div className="team-photo-wrap">
                    <img src={r.photoSourceUrl || PLACEHOLDER_PHOTO} alt={r.fullName} loading="lazy" />
                  </div>
                  <h3>{r.fullName}</h3>
                </Link>
              ))}
            </div>
          </section>
        )}

        {socialLinks.length > 0 && (
          <div className="contact-social-list" style={{ marginTop: 32 }}>
            {socialLinks.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
