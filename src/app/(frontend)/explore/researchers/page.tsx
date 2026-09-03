import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { Researcher, SdgGoal, SdgTarget } from '@/payload-types'
import { PLACEHOLDER_PHOTO, contrastTextColor, countryName } from '../../lib/display'

export const metadata: Metadata = {
  title: 'Researchers — The Global Academy',
  description: 'Search the directory of researchers and academics working on the UN Sustainable Development Goals.',
}
// See the comment on this line in the homepage (src/app/(frontend)/page.tsx) —
// this route queries Postgres too, so it gets the same build-time-hang fix.
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

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
    <Link className="researcher-card" href={`/explore/researchers/${r.slug}`}>
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
    </Link>
  )
}

function buildPageLink(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params)
  next.set('page', String(page))
  return `/explore/researchers?${next.toString()}`
}

export default async function ResearchersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; goal?: string; sort?: string; page?: string }>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() || ''
  const country = sp.country || ''
  const goal = sp.goal || ''
  const sort = sp.sort === 'newest' ? 'newest' : 'name'
  const page = Math.max(1, Number(sp.page) || 1)

  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const goalsResult = await payload.find({ collection: 'sdg-goals', sort: 'number', limit: 20, depth: 0 })
  const goalId = goal ? goalsResult.docs.find((g) => String(g.number) === goal)?.id : undefined

  const countryRows = await payload.find({
    collection: 'researchers',
    where: { isPublished: { equals: true } },
    limit: 5000,
    depth: 0,
    select: { countryCode: true, additionalCountry1: true, additionalCountry2: true },
  })
  const countrySet = new Set<string>()
  for (const r of countryRows.docs) {
    for (const code of [r.countryCode, r.additionalCountry1, r.additionalCountry2]) {
      if (code) countrySet.add(code.toUpperCase())
    }
  }
  const countryOptions = [...countrySet]
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const and: Where[] = [{ isPublished: { equals: true } }]
  if (q) and.push({ fullName: { contains: q } })
  if (country) {
    and.push({
      or: [
        { countryCode: { equals: country } },
        { additionalCountry1: { equals: country } },
        { additionalCountry2: { equals: country } },
      ],
    })
  }
  if (goalId) and.push({ 'sdgTargets.goal': { equals: goalId } })

  const researchers = await payload.find({
    collection: 'researchers',
    where: { and },
    sort: sort === 'newest' ? '-id' : 'fullName',
    page,
    limit: PAGE_SIZE,
    depth: 2,
  })

  const activeParams = new URLSearchParams()
  if (q) activeParams.set('q', q)
  if (country) activeParams.set('country', country)
  if (goal) activeParams.set('goal', goal)
  if (sort !== 'name') activeParams.set('sort', sort)

  return (
    <div className="researchers-page">
      <div className="wrap">
        <h1>Researchers</h1>
        <p className="researchers-sub">
          Search {countryRows.docs.length} researchers and academics by name, country, or SDG.
        </p>

        <form className="researchers-filters" method="get">
          <input type="text" name="q" placeholder="Search by name" defaultValue={q} />
          <select name="country" defaultValue={country}>
            <option value="">All countries</option>
            {countryOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="goal" defaultValue={goal}>
            <option value="">All SDGs</option>
            {goalsResult.docs.map((g) => (
              <option key={g.id} value={g.number}>
                Goal {g.number}: {g.title}
              </option>
            ))}
          </select>
          <select name="sort" defaultValue={sort}>
            <option value="name">Sort: Name (A–Z)</option>
            <option value="newest">Sort: Newest first</option>
          </select>
          <button type="submit" className="btn-outline blue">
            Search
          </button>
        </form>

        <div className="researchers-grid">
          {researchers.docs.length > 0 ? (
            researchers.docs.map((r) => <ResearcherCard key={r.id} r={r} />)
          ) : (
            <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
              No researchers match those filters.
            </p>
          )}
        </div>

        {researchers.totalPages > 1 && (
          <nav className="researchers-pagination" aria-label="Pagination">
            {researchers.hasPrevPage && (
              <Link href={buildPageLink(activeParams, page - 1)} className="btn-outline">
                ← Previous
              </Link>
            )}
            <span>
              Page {researchers.page} of {researchers.totalPages}
            </span>
            {researchers.hasNextPage && (
              <Link href={buildPageLink(activeParams, page + 1)} className="btn-outline">
                Next →
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  )
}
