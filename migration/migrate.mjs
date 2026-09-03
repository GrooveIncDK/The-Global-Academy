#!/usr/bin/env node
/**
 * Reads the JSON produced by extract.py (in migration/extracted/) and creates the
 * matching Institutions / Researchers / ResearchGroups / Jobs / Posts / PostCategories
 * documents in Payload, via its local API — no HTTP round trip.
 *
 * Idempotent: every collection is upserted by a stable key (slug, or wpPostId stored
 * in a hidden-from-UI field pattern via slug fallback), so running this twice updates
 * rather than duplicates.
 *
 * Images are NOT downloaded — every *SourceUrl field carries the original WordPress
 * attachment URL for a later image-import pass. This matches the "migrate data now,
 * images later" approach.
 *
 * Rich text fields are populated with a minimal HTML→Lexical flattening (tags are
 * stripped, paragraph breaks are preserved) rather than full fidelity conversion —
 * good enough to read and edit in the admin UI; a follow-up pass could re-parse the
 * source HTML for full bold/link/list fidelity if that turns out to matter.
 *
 * Usage: npm run migrate   (from the project root; requires .env + a running Postgres)
 */
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'

import config from '../src/payload.config.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTRACTED = path.join(__dirname, 'extracted')

async function loadJSON(name) {
  const raw = await readFile(path.join(EXTRACTED, `${name}.json`), 'utf-8')
  return JSON.parse(raw)
}

/** Minimal HTML → Lexical flattening: strip tags, keep paragraph breaks as separate
 * paragraph nodes. Good enough for a data migration; not a full HTML parser. */
function textToLexical(input) {
  const html = (input || '').toString()
  const withBreaks = html
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
  const stripped = withBreaks.replace(/<[^>]+>/g, '')
  const decoded = stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&quot;/g, '"')
  const paragraphs = decoded
    .split(/\n{2,}/)
    .map((p) => p.replace(/\r/g, '').trim())
    .filter(Boolean)

  const children =
    paragraphs.length > 0
      ? paragraphs.map((text) => ({
          type: 'paragraph',
          version: 1,
          children: [{ type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' }],
          direction: 'ltr',
          format: '',
          indent: 0,
        }))
      : [{ type: 'paragraph', version: 1, children: [], direction: 'ltr', format: '', indent: 0 }]

  return {
    root: {
      type: 'root',
      version: 1,
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
    },
  }
}

/** WordPress datetimes come as "YYYY-MM-DD HH:MM:SS" — make them parse reliably. */
function toISO(value) {
  if (!value) return undefined
  return value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
}

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

  // --- Reference maps: SDG goals/targets (already seeded — see `npm run seed`) ---
  const goalDocs = (await payload.find({ collection: 'sdg-goals', limit: 100, depth: 0 })).docs
  const goalIdByNumber = new Map(goalDocs.map((g) => [g.number, g.id]))
  if (goalDocs.length === 0) {
    throw new Error('No sdg-goals found — run `npm run seed` before migrating.')
  }
  const targetDocs = (await payload.find({ collection: 'sdg-targets', limit: 500, depth: 0 })).docs
  const targetIdByCode = new Map(targetDocs.map((t) => [t.code, t.id]))

  // --- Institutions ---
  const institutions = await loadJSON('institutions')
  const institutionIdByWpTermId = new Map()
  let instCount = 0
  for (const inst of institutions) {
    const doc = await upsert(
      payload,
      'institutions',
      { slug: { equals: inst.slug } },
      {
        name: inst.name,
        slug: inst.slug,
        motto: inst.motto,
        logoSourceUrl: inst.logoSourceUrl,
        location: inst.location,
        websiteUrl: inst.websiteUrl,
        awards: inst.awards,
        rankings: inst.rankings,
        keyFacts: inst.keyFacts ? textToLexical(inst.keyFacts) : undefined,
        mainText: inst.mainText ? textToLexical(inst.mainText) : undefined,
        searchShortcode: inst.searchShortcode,
      },
    )
    institutionIdByWpTermId.set(inst.wpTermId, doc.id)
    instCount += 1
    if (instCount % 100 === 0) log(`  institutions: ${instCount}/${institutions.length}`)
  }
  log(`Institutions migrated: ${instCount}`)

  // --- Researchers ---
  const researchers = await loadJSON('researchers')
  const researcherIdByWpPostId = new Map()
  const researcherIdBySlug = new Map()
  let researcherCount = 0
  for (const r of researchers) {
    const sdgTargetIds = []
    for (const sel of r.sdgSelections) {
      for (const code of sel.targets) {
        const id = targetIdByCode.get(code)
        if (id) sdgTargetIds.push(id)
      }
    }

    const doc = await upsert(
      payload,
      'researchers',
      { slug: { equals: r.slug } },
      {
        slug: r.slug,
        title: r.title,
        firstNames: r.firstNames,
        lastName: r.lastName,
        abbreviations: r.abbreviations,
        fullName: r.fullName,
        position: r.position,
        additionalJobTitles: r.additionalJobTitles.map((title) => ({ title })),
        institution: institutionIdByWpTermId.get(r.institutionTermId) ?? undefined,
        currentPlaceOfWork: r.currentPlaceOfWork,
        photoSourceUrl: r.photoSourceUrl,
        countryCode: r.countryCode,
        additionalCountry1: r.additionalCountry1,
        additionalCountry2: r.additionalCountry2,
        languages: r.languages,
        researchFocus: r.researchFocus ? textToLexical(r.researchFocus) : undefined,
        sdgTargets: sdgTargetIds,
        projects: r.mainProject
          ? [{ title: r.mainProject }, ...r.additionalProjects.map((title) => ({ title }))]
          : r.additionalProjects.map((title) => ({ title })),
        researchGroupName: r.researchGroupName,
        researchGroupUrl: r.researchGroupUrl,
        additionalResearchGroups: r.additionalResearchGroups,
        citations: r.citations,
        phdsSupervised: r.phdsSupervised ? Number(r.phdsSupervised) : undefined,
        phdSupervisorName: r.phdSupervisorName,
        phdCompletionDate: r.phdCompletionDate,
        professionalOrganisation: r.professionalOrganisation,
        additionalOrganisations: r.additionalOrganisations.map((name) => ({ name })),
        facebook: r.facebook,
        twitter: r.twitter,
        linkedin: r.linkedin,
        googleScholar: r.googleScholar,
        researchGate: r.researchGate,
        mendeley: r.mendeley,
        wikipedia: r.wikipedia,
        bluesky: r.bluesky,
        mastodon: r.mastodon,
        threads: r.threads,
        otherSocialLinks: r.otherSocialLinks,
        videoUrl: r.videoUrl,
        location: r.location,
        trailblazer: r.trailblazer,
        isPublished: r.isPublished,
      },
    )
    researcherIdByWpPostId.set(r.wpPostId, doc.id)
    researcherIdBySlug.set(r.slug, doc.id)
    researcherCount += 1
    if (researcherCount % 100 === 0) log(`  researchers: ${researcherCount}/${researchers.length}`)
  }
  log(`Researchers migrated: ${researcherCount}`)

  // --- Research groups ---
  const researchGroups = await loadJSON('research-groups')
  let groupCount = 0
  for (const g of researchGroups) {
    const researcherIds = g.researcherWpIds
      .map((wpId) => researcherIdByWpPostId.get(wpId))
      .filter(Boolean)
    const sdgGoalIds = g.sdgGoals.map((n) => goalIdByNumber.get(n)).filter(Boolean)

    await upsert(
      payload,
      'research-groups',
      { slug: { equals: g.slug } },
      {
        name: g.name,
        slug: g.slug,
        description: g.description,
        focus: g.focus ? textToLexical(g.focus) : undefined,
        researchers: researcherIds,
        mainCountry: g.mainCountry,
        sdgGoals: sdgGoalIds,
        currentResearch: g.currentResearch.map((cr) => ({
          title: cr.title,
          description: cr.description,
          sdgGoals: cr.sdgGoals.map((n) => goalIdByNumber.get(n)).filter(Boolean),
          videos: cr.videos,
        })),
        video: g.video,
        universityLogoSourceUrl: g.universityLogoSourceUrl,
        groupPhotoSourceUrl: g.groupPhotoSourceUrl,
        groupMap: g.groupMap,
        facebook: g.facebook,
        twitter: g.twitter,
        linkedin: g.linkedin,
        wikipedia: g.wikipedia,
      },
    )
    groupCount += 1
  }
  log(`Research groups migrated: ${groupCount}`)

  // --- Jobs ---
  const jobs = await loadJSON('jobs')
  let jobCount = 0
  for (const j of jobs) {
    const sdgGoalIds = j.sdgGoals.map((n) => goalIdByNumber.get(n)).filter(Boolean)
    await upsert(
      payload,
      'jobs',
      { slug: { equals: j.slug } },
      {
        title: j.title,
        slug: j.slug,
        companyName: j.companyName,
        employerType: j.employerType,
        employerPage: j.employerPage,
        location: j.location,
        isRemote: j.isRemote,
        jobTypes: j.jobTypes.map((t) => t.toLowerCase().replace(/\s+/g, '_')),
        academicStaffFacultyRoles: j.academicStaffFacultyRoles.map((r) =>
          r.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        ),
        sector: j.sector.map((s) => s.toLowerCase().replace(/\s+/g, '_')),
        sdgGoals: sdgGoalIds,
        description: textToLexical(j.description),
        applicationUrl: j.applicationUrl,
        applicationEmail: j.applicationEmail,
        jobReference: j.jobReference,
        salaryText: j.salaryText,
        salaryCurrency: j.salaryCurrency,
        salaryUnit: j.salaryUnit,
        expiresAt: j.expiresAt || undefined,
        isPublished: j.isPublished,
      },
    )
    jobCount += 1
    if (jobCount % 50 === 0) log(`  jobs: ${jobCount}/${jobs.length}`)
  }
  log(`Jobs migrated: ${jobCount}`)

  // --- Blog posts + categories ---
  const posts = await loadJSON('posts')
  const categoryNames = [...new Set(posts.flatMap((p) => p.categories))]
  const categoryIdByName = new Map()
  for (const name of categoryNames) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const doc = await upsert(payload, 'post-categories', { slug: { equals: slug } }, { name, slug })
    categoryIdByName.set(name, doc.id)
  }
  let postCount = 0
  for (const p of posts) {
    await upsert(
      payload,
      'posts',
      { slug: { equals: p.slug } },
      {
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        content: textToLexical(p.content),
        categories: p.categories.map((c) => categoryIdByName.get(c)).filter(Boolean),
        // Posts has no separate isPublished flag — access control gates on publishedAt
        // itself (see Posts.ts), so only stamp it for posts that were actually live.
        publishedAt: p.isPublished ? toISO(p.publishedAt) : undefined,
      },
    )
    postCount += 1
  }
  log(`Post categories migrated: ${categoryNames.length}`)
  log(`Posts migrated: ${postCount}`)

  log('Migration complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
