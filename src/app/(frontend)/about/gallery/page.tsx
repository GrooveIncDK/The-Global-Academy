import type { Metadata } from 'next'
import React from 'react'
import { getPayload } from 'payload'

import config from '@/payload.config'
import type { GalleryEvent, Media } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Gallery — The Global Academy',
  description: 'Photos from The Global Academy’s SDGs simulation workshops and events.',
}
// See the comment on this line in the homepage (src/app/(frontend)/page.tsx) —
// this route queries Postgres too, so it gets the same build-time-hang fix.
export const dynamic = 'force-dynamic'

function GalleryEventBlock({ event }: { event: GalleryEvent }) {
  const photos = (event.photos || []).map((p) => ({
    url: p.image && typeof p.image === 'object' ? (p.image as Media).url : null,
    sourceUrl: p.sourceUrl,
    caption: p.caption,
  }))

  return (
    <div className="gallery-event">
      <h3>{event.title}</h3>
      {event.description && (
        <div className="gallery-event-description">
          {event.description.split('\n').filter(Boolean).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <div className="gallery-photo-grid">
          {photos.map((photo, i) => {
            const src = photo.url || photo.sourceUrl
            if (!src) return null
            return (
              <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="gallery-photo">
                <img src={src} alt={photo.caption || ''} loading="lazy" />
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default async function GalleryPage() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const events = await payload.find({
    collection: 'gallery-events',
    sort: 'sortOrder',
    limit: 200,
    depth: 1,
  })

  const categories: { name: string; events: GalleryEvent[] }[] = []
  const indexByCategory = new Map<string, number>()
  for (const event of events.docs) {
    const key = event.category || ''
    if (!indexByCategory.has(key)) {
      indexByCategory.set(key, categories.length)
      categories.push({ name: key, events: [] })
    }
    categories[indexByCategory.get(key)!].events.push(event)
  }

  return (
    <div className="gallery-page">
      <div className="wrap">
        <h1>Gallery</h1>

        {categories.length > 0 ? (
          categories.map((cat, i) => (
            <section key={i} className="gallery-category">
              {cat.name && <h2>{cat.name}</h2>}
              {cat.events.map((event) => (
                <GalleryEventBlock key={event.id} event={event} />
              ))}
            </section>
          ))
        ) : (
          <p style={{ textAlign: 'center' }}>No gallery events yet.</p>
        )}
      </div>
    </div>
  )
}
