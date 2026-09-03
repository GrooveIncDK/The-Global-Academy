import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { Institution, Media, SdgGoal, SdgTarget } from '@/payload-types'
import { PLACEHOLDER_PHOTO, contrastTextColor, countryName } from '../../../lib/display'
import { lexicalToPlainText } from '../../../lib/richtext'

// See the comment on this line in the homepage (src/app/(frontend)/page.tsx) —
// this route queries Postgres too, so it gets the same build-time-hang fix.
export const dynamic = 'force-dynamic'

async function getResearcher(slug: string) {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const result = await payload.find({
    collection: 'researchers',
    where: { and: [{ slug: { equals: slug } }, { isPublished: { equals: true } }] },
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
  const researcher = await getResearcher(slug)
  if (!researcher) return { title: 'Researcher not found — The Global Academy' }
  return {
    title: `${researcher.fullName} — The Global Academy`,
    description: researcher.position || undefined,
  }
}

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  twitter: 'Twitter / X',
  linkedin: 'LinkedIn',
  googleScholar: 'Google Scholar',
  researchGate: 'ResearchGate',
  mendeley: 'Mendeley',
  wikipedia: 'Wikipedia',
  bluesky: 'BlueSky',
  mastodon: 'Mastodon',
  threads: 'Threads',
}

export default async function ResearcherDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const researcher = await getResearcher(slug)
  if (!researcher) notFound()

  const photo =
    (researcher.photo && typeof researcher.photo === 'object' ? (researcher.photo as Media).url : null) ||
    researcher.photoSourceUrl ||
    PLACEHOLDER_PHOTO
  const institution =
    researcher.institution && typeof researcher.institution === 'object'
      ? (researcher.institution as Institution)
      : null

  const countries = [researcher.countryCode, researcher.additionalCountry1, researcher.additionalCountry2]
    .filter((c): c is string => Boolean(c))
    .map((c) => countryName(c))

  const goalsMap = new Map<number, SdgGoal>()
  const targets = (researcher.sdgTargets || []).filter(
    (t): t is SdgTarget => typeof t === 'object' && t !== null,
  )
  for (const t of targets) {
    if (typeof t.goal === 'object' && t.goal) goalsMap.set(t.goal.number, t.goal)
  }
  const goals = [...goalsMap.values()].sort((a, b) => a.number - b.number)

  const researchFocus = lexicalToPlainText(researcher.researchFocus as never)

  const researchGroups: { name: string; url?: string | null }[] = []
  if (researcher.researchGroupName) {
    researchGroups.push({ name: researcher.researchGroupName, url: researcher.researchGroupUrl })
  }
  for (const g of researcher.additionalResearchGroups || []) {
    if (g.name) researchGroups.push({ name: g.name, url: g.url })
  }

  const organisations = [
    researcher.professionalOrganisation,
    ...((researcher.additionalOrganisations || []).map((o) => o.name).filter(Boolean) as string[]),
  ].filter((o): o is string => Boolean(o))

  const otherSocialLinks = (researcher.otherSocialLinks || []).filter((l) => l?.url)
  const socialLinks = [
    ...Object.keys(SOCIAL_LABELS)
      .map((key) => {
        const value = (researcher as unknown as Record<string, string | null | undefined>)[key]
        return value ? { label: SOCIAL_LABELS[key], href: value } : null
      })
      .filter((l): l is { label: string; href: string } => Boolean(l)),
    ...otherSocialLinks.map((l) => ({ label: l.label || 'Link', href: l.url as string })),
  ]

  return (
    <div className="researcher-detail-page">
      <div className="wrap">
        <Link href="/explore/researchers" className="news-back-link">
          ← Back to Researchers
        </Link>

        <div className="researcher-detail-header">
          <div className="researcher-detail-photo">
            <img src={photo} alt={researcher.fullName} />
          </div>
          <div>
            <h1>
              {[researcher.title, researcher.fullName, researcher.abbreviations].filter(Boolean).join(' ')}
            </h1>
            {researcher.position && <div className="researcher-detail-position">{researcher.position}</div>}
            {(researcher.additionalJobTitles || []).map((j, i) => (
              <div key={i} className="researcher-detail-position">
                {j.title}
              </div>
            ))}
            <div className="researcher-detail-meta-row">
              {institution && <span>{institution.name}</span>}
              {!institution && researcher.currentPlaceOfWork && <span>{researcher.currentPlaceOfWork}</span>}
              {countries.length > 0 && <span>{countries.join(', ')}</span>}
            </div>
            {researcher.trailblazer && <span className="researcher-trailblazer-badge">Trailblazer</span>}
          </div>
        </div>

        {goals.length > 0 && (
          <div className="goal-badges" style={{ justifyContent: 'flex-start', marginBottom: 32 }}>
            {goals.map((g) => (
              <div
                key={g.id}
                className="goal-dot"
                style={{ background: g.colorHex ?? '#888', color: contrastTextColor(g.colorHex) }}
                title={g.title}
              >
                {String(g.number).padStart(2, '0')}
              </div>
            ))}
          </div>
        )}

        {researchFocus && (
          <section className="researcher-detail-section">
            <h2>Research focus</h2>
            <div className="group-detail-body">
              {researchFocus.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        )}

        {targets.length > 0 && (
          <section className="researcher-detail-section">
            <h2>SDG targets</h2>
            <div className="goal-targets">
              {targets.map((t) => (
                <div key={t.id} className="goal-target">
                  <span className="goal-target-code">{t.code}</span>
                  <div>
                    <h4>{t.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {researcher.projects && researcher.projects.length > 0 && (
          <section className="researcher-detail-section">
            <h2>Projects</h2>
            <div className="goal-targets">
              {researcher.projects.map((p, i) => (
                <div key={p.id ?? i} className="goal-target">
                  <div>
                    <h4>{p.title}</h4>
                    {p.description && <p>{p.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {researchGroups.length > 0 && (
          <section className="researcher-detail-section">
            <h2>Research group{researchGroups.length > 1 ? 's' : ''}</h2>
            <ul className="researcher-detail-list">
              {researchGroups.map((g, i) => (
                <li key={i}>{g.url ? <a href={g.url} target="_blank" rel="noopener noreferrer">{g.name}</a> : g.name}</li>
              ))}
            </ul>
          </section>
        )}

        {(researcher.citations ||
          researcher.phdsSupervised ||
          researcher.phdSupervisorName ||
          organisations.length > 0) && (
          <section className="researcher-detail-section">
            <h2>Academic background</h2>
            {organisations.length > 0 && (
              <p>
                <strong>Professional organisations:</strong> {organisations.join(', ')}
              </p>
            )}
            {typeof researcher.phdsSupervised === 'number' && researcher.phdsSupervised > 0 && (
              <p>
                <strong>PhDs supervised:</strong> {researcher.phdsSupervised}
              </p>
            )}
            {researcher.phdSupervisorName && (
              <p>
                <strong>PhD supervisor:</strong> {researcher.phdSupervisorName}
                {researcher.phdCompletionDate ? ` (${researcher.phdCompletionDate})` : ''}
              </p>
            )}
            {researcher.citations && (
              <div className="group-detail-body" style={{ marginTop: 12 }}>
                {researcher.citations.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
          </section>
        )}

        {researcher.videoUrl && (
          <div className="group-detail-video-link">
            <a href={researcher.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
              Watch profile video
            </a>
          </div>
        )}

        {socialLinks.length > 0 && (
          <section className="researcher-detail-section">
            <h2>Links</h2>
            <div className="contact-social-list" style={{ alignItems: 'flex-start' }}>
              {socialLinks.map((link, i) => (
                <a key={i} href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
