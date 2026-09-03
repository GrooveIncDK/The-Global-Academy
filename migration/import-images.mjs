#!/usr/bin/env node
/**
 * Second migration pass: attaches real Media uploads to the Institutions /
 * Researchers / ResearchGroups documents already created by migrate.mjs.
 *
 * migrate.mjs deliberately left every *SourceUrl field pointing at the
 * original WordPress attachment URL instead of downloading anything (see the
 * comment at the top of that file). This script is the "images later" pass:
 * it reads the same extracted JSON, resolves each *SourceUrl to a local file
 * under migration/images/ (a WordPress wp-content/uploads/YYYY/MM/... export,
 * placed there ahead of time), uploads the matching file into Payload's
 * `media` collection, and points the corresponding upload field (photo /
 * logo / universityLogo / groupPhoto) at it.
 *
 * Idempotent: a document whose upload field is already set is left alone (so
 * re-running this after adding more images to migration/images/ only fills
 * in the gaps, it never re-uploads or duplicates Media docs).
 *
 * Usage: node migration/import-images.mjs   (from the project root; requires
 * .env + DATABASE_URL pointed at the Postgres you want updated)
 */
import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'

import config from '../src/payload.config.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXTRACTED = path.join(__dirname, 'extracted')
const IMAGES_ROOT = process.env.IMAGES_ROOT || path.join(__dirname, 'images')

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
}

async function loadJSON(name) {
  const raw = await readFile(path.join(EXTRACTED, `${name}.json`), 'utf-8')
  return JSON.parse(raw)
}

/** Turns a WordPress attachment URL into the relative path under
 * IMAGES_ROOT where the matching file should live, e.g.
 * "https://theglobalacademy.ac/wp-content/uploads/2022/05/x.jpg" ->
 * "2022/05/x.jpg". Returns null for anything that isn't a WP upload URL. */
function relPathFromSourceUrl(url) {
  if (!url) return null
  const marker = '/wp-content/uploads/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

/** WordPress (and various export/resize plugins) commonly save an image
 * under a different filename than the one referenced elsewhere on the site —
 * a "-150x150"/"-1024x682" generated thumbnail size, a "-scaled" downsize, or
 * an "-aspect-ratio-1-1" custom crop. If the exact relPath isn't present,
 * this looks in the same directory for another file whose name — once those
 * known suffixes are stripped — matches, and falls back to that. Returns the
 * relPath of the best match, or null if nothing in that directory matches. */
const dirListingCache = new Map()
function stripKnownSuffixes(stem) {
  const patterns = [
    /-aspect-ratio-\d+-\d+$/i,
    /-scaled$/i,
    /-\d+x\d+$/,
    /-e\d{10,}$/,
    /-copy$/i,
    /-\d+$/,
  ]
  let changed = true
  while (changed) {
    changed = false
    for (const p of patterns) {
      const next = stem.replace(p, '')
      if (next !== stem) {
        stem = next
        changed = true
      }
    }
  }
  return stem
}
function findFallback(relPath) {
  const dir = path.dirname(relPath)
  const base = path.basename(relPath)
  const ext = path.extname(base)
  const stem = base.slice(0, base.length - ext.length)
  const reduced = stripKnownSuffixes(stem)
  if (reduced.length <= 3) return null

  const dirAbs = path.join(IMAGES_ROOT, dir)
  if (!dirListingCache.has(dirAbs)) {
    try {
      dirListingCache.set(dirAbs, readdirSync(dirAbs))
    } catch {
      dirListingCache.set(dirAbs, [])
    }
  }
  const candidates = dirListingCache
    .get(dirAbs)
    .filter((fn) => fn.toLowerCase().startsWith(reduced.toLowerCase()))
  if (candidates.length === 0) return null
  // Prefer same extension, then the shortest name (closest to the original).
  candidates.sort((a, b) => {
    const aExt = path.extname(a).toLowerCase() === ext.toLowerCase() ? 0 : 1
    const bExt = path.extname(b).toLowerCase() === ext.toLowerCase() ? 0 : 1
    if (aExt !== bExt) return aExt - bExt
    return a.length - b.length
  })
  return path.join(dir, candidates[0])
}

/** Resolves a *SourceUrl to a relPath that actually exists on disk under
 * IMAGES_ROOT, trying the exact expected path first and a same-directory
 * fallback match second. Returns null if nothing usable is found. */
function resolveExistingRelPath(sourceUrl) {
  const relPath = relPathFromSourceUrl(sourceUrl)
  if (!relPath) return null
  if (existsSync(path.join(IMAGES_ROOT, relPath))) return relPath
  return findFallback(relPath)
}

const stats = { uploaded: 0, alreadySet: 0, missingFile: 0, noSourceUrl: 0, errors: 0 }

/** Reads a local file and creates a Media doc for it (no-op / cached per
 * relPath within a single run, in case several entities reference the exact
 * same source image). Returns the new Media doc's id, or null if the file
 * isn't present locally. */
const mediaIdCache = new Map()
async function ensureMediaForRelPath(payload, relPath, altText) {
  if (mediaIdCache.has(relPath)) return mediaIdCache.get(relPath)

  const localPath = path.join(IMAGES_ROOT, relPath)
  if (!existsSync(localPath)) {
    mediaIdCache.set(relPath, null)
    return null
  }

  const buffer = await readFile(localPath)
  const ext = path.extname(localPath).toLowerCase()
  const mimetype = MIME_BY_EXT[ext] || 'application/octet-stream'

  const doc = await payload.create({
    collection: 'media',
    data: { alt: altText },
    file: {
      data: buffer,
      mimetype,
      name: path.basename(localPath),
      size: buffer.length,
    },
  })
  mediaIdCache.set(relPath, doc.id)
  return doc.id
}

/** Attaches an image to one field on one document, if that field isn't
 * already set. sourceUrl comes from the extracted JSON (not the possibly
 * stale DB copy) so this stays correct even before migrate.mjs has run
 * again. */
async function attachImage(payload, { collection, where, field, sourceUrl, altText, label }) {
  if (!relPathFromSourceUrl(sourceUrl)) {
    stats.noSourceUrl += 1
    return
  }

  const existing = await payload.find({ collection, where, limit: 1, depth: 0 })
  const doc = existing.docs[0]
  if (!doc) {
    payload.logger.warn(`  [${label}] no matching ${collection} document — skipping`)
    return
  }
  if (doc[field]) {
    stats.alreadySet += 1
    return
  }

  let relPath
  try {
    relPath = resolveExistingRelPath(sourceUrl)
    const mediaId = relPath ? await ensureMediaForRelPath(payload, relPath, altText) : null
    if (!mediaId) {
      stats.missingFile += 1
      return
    }
    await payload.update({ collection, id: doc.id, data: { [field]: mediaId } })
    stats.uploaded += 1
  } catch (err) {
    stats.errors += 1
    payload.logger.error(`  [${label}] failed on ${relPath ?? sourceUrl}: ${err.message}`)
  }
}

async function main() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const log = (msg) => payload.logger.info(msg)

  log(`Reading images from ${IMAGES_ROOT}`)

  // --- Researchers: photoSourceUrl -> photo ---
  const researchers = await loadJSON('researchers')
  let rCount = 0
  for (const r of researchers) {
    await attachImage(payload, {
      collection: 'researchers',
      where: { slug: { equals: r.slug } },
      field: 'photo',
      sourceUrl: r.photoSourceUrl,
      altText: `${r.fullName || r.slug} photo`,
      label: `researcher:${r.slug}`,
    })
    rCount += 1
    if (rCount % 100 === 0) log(`  researchers: ${rCount}/${researchers.length}`)
  }

  // --- Institutions: logoSourceUrl -> logo ---
  const institutions = await loadJSON('institutions')
  for (const inst of institutions) {
    await attachImage(payload, {
      collection: 'institutions',
      where: { slug: { equals: inst.slug } },
      field: 'logo',
      sourceUrl: inst.logoSourceUrl,
      altText: `${inst.name || inst.slug} logo`,
      label: `institution:${inst.slug}`,
    })
  }

  // --- Research groups: universityLogoSourceUrl -> universityLogo, groupPhotoSourceUrl -> groupPhoto ---
  const researchGroups = await loadJSON('research-groups')
  for (const g of researchGroups) {
    await attachImage(payload, {
      collection: 'research-groups',
      where: { slug: { equals: g.slug } },
      field: 'universityLogo',
      sourceUrl: g.universityLogoSourceUrl,
      altText: `${g.name || g.slug} university logo`,
      label: `research-group:${g.slug}:universityLogo`,
    })
    await attachImage(payload, {
      collection: 'research-groups',
      where: { slug: { equals: g.slug } },
      field: 'groupPhoto',
      sourceUrl: g.groupPhotoSourceUrl,
      altText: `${g.name || g.slug} group photo`,
      label: `research-group:${g.slug}:groupPhoto`,
    })
  }

  log('Image import complete.')
  log(
    `  uploaded: ${stats.uploaded}, already set: ${stats.alreadySet}, ` +
      `missing local file: ${stats.missingFile}, no source url: ${stats.noSourceUrl}, errors: ${stats.errors}`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
