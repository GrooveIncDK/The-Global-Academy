import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { Job, Post, Researcher, SdgGoal, SdgTarget } from '@/payload-types'
import { PLACEHOLDER_PHOTO, contrastTextColor, countryName } from './lib/display'

// This page queries Postgres on every request (researchers/jobs/posts change
// often, so a stale build-time snapshot isn't acceptable). Without this,
// Next.js still tries to prerender it once during `next build` to check
// whether it CAN be static — that trial render runs the real Payload query
// against production Postgres, and if that connection is ever slow (a
// paused/cold database, a pooler under load, network hiccup between the
// build machine and Supabase), the build hangs until Vercel's per-page
// timeout kills it, retries twice more, then fails the whole deployment.
// force-dynamic skips that build-time attempt entirely — this route is
// server-rendered per-request only, which is what it already behaved like
// at runtime (see the route table: `ƒ /`), just without the risky preview.
export const dynamic = 'force-dynamic'

function ResearcherCard({ r }: { r: Researcher }) {
  const photo = r.photoSourceUrl || PLACEHOLDER_PHOTO
  const goals = new Map<number, string | null | undefined>()
  for (const target of r.sdgTargets || []) {
    if (target && typeof target === 'object') {
      const t = target as SdgTarget
      const goal = typeof t.goal === 'object' ? (t.goal as SdgGoal) : null
      if (goal) goals.set(goal.number, goal.colorHex)
    }
  }
  const badges = [...goals.entries()].sort((a, b) => a[0] - b[0])

  return (
    <div className="researcher-card">
      <div className="researcher-photo-wrap">
        <img src={photo} alt={r.fullName} loading="lazy" />
      </div>
      <h3>{r.fullName}</h3>
      <div className="country">{countryName(r.countryCode)}</div>
      <div className="goal-badges">
        {badges.map(([number, hex]) => (
          <div
            key={number}
            className="goal-dot"
            style={{ background: hex ?? '#888', color: contrastTextColor(hex) }}
          >
            {String(number).padStart(2, '0')}
          </div>
        ))}
      </div>
    </div>
  )
}

function JobCard({ j }: { j: Job }) {
  const location = j.isRemote ? 'Remote' : j.location || ''
  return (
    <a className="article-card" href={j.applicationUrl || '#'} target="_blank" rel="noopener noreferrer">
      <h3>{j.title}</h3>
      <time>
        {j.companyName}
        {location ? ` — ${location}` : ''}
      </time>
    </a>
  )
}

function ArticleCard({ p, index }: { p: Post; index: number }) {
  const date = p.publishedAt
    ? new Date(p.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const placeholderImg = `/images/article-${(index % 3) + 1}.png`
  return (
    <a className="article-card" href="#">
      <figure>
        <img src={placeholderImg} alt="" />
      </figure>
      <h3>{p.title}</h3>
      <time>{date}</time>
    </a>
  )
}

export default async function HomePage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const [researchers, jobs, posts] = await Promise.all([
    payload.find({
      collection: 'researchers',
      where: { isPublished: { equals: true } },
      sort: '-id',
      limit: 3,
      depth: 2,
    }),
    payload.find({
      collection: 'jobs',
      where: { isPublished: { equals: true } },
      sort: '-expiresAt',
      limit: 3,
      depth: 0,
    }),
    payload.find({ collection: 'posts', sort: '-publishedAt', limit: 3, depth: 0 }),
  ])

  return (
    <>
      <img className="hero-image" src="/images/hero-banner.png" alt="" />

      <div className="mission-band">
        <p>
          The Global Academy are the researchers and academics working internationally to make the
          world a better place. Together they are helping us achieve the UN Sustainable Development
          Goals
        </p>
        <p>
          <strong>Where does your research fit?</strong>
        </p>
      </div>

      <section className="section-cream" id="explore">
        <div className="wrap">
          <h2>Explore</h2>
          <div className="explore-row">
            <a href="#researchers" className="btn-outline blue">
              Researchers
            </a>
            <a href="/about/sdgs-workshops" className="btn-outline blue">
              SDGs Workshops
            </a>
            <a href="#jobs" className="btn-outline blue">
              SDGs Jobs
            </a>
          </div>
        </div>
      </section>

      <section id="researchers">
        <div className="wrap">
          <h2>New Researchers</h2>
          <div className="researchers-grid">
            {researchers.docs.length > 0 ? (
              researchers.docs.map((r) => <ResearcherCard key={r.id} r={r} />)
            ) : (
              <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
                No published researcher profiles yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <section id="jobs">
        <div className="wrap">
          {jobs.docs.length > 0 ? (
            <>
              <h2>Latest Jobs</h2>
              <div className="articles-grid">
                {jobs.docs.map((j) => (
                  <JobCard key={j.id} j={j} />
                ))}
              </div>
            </>
          ) : (
            <>
              <h2>Latest Jobs</h2>
              <div className="jobs-empty">There are currently no vacancies.</div>
            </>
          )}
          <div className="center-btn">
            <a href="#" className="btn-solid-white">
              See and search all jobs
            </a>
          </div>
        </div>
      </section>

      <section id="news" className="section-cream">
        <div className="wrap">
          <h2>Recent Articles</h2>
          <div className="articles-grid">
            {posts.docs.length > 0 ? (
              posts.docs.map((p, i) => <ArticleCard key={p.id} p={p} index={i} />)
            ) : (
              <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>No articles yet.</p>
            )}
          </div>
          <div className="center-btn">
            <a href="#" className="btn-solid-white">
              See all articles
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
