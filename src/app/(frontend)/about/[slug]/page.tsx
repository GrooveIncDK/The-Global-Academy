import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import { lexicalToPlainText } from '../../lib/richtext'

// See the comment on this line in the homepage (src/app/(frontend)/page.tsx) —
// this route queries Postgres too, so it gets the same build-time-hang fix.
export const dynamic = 'force-dynamic'

// Generic renderer for the `pages` collection — editable copies of otherwise
// static About-menu content (e.g. "SDGs Workshops") that doesn't warrant its
// own bespoke component. Sibling folders like about/team and about/goals are
// bespoke pages and always take precedence over this [slug] route for their
// exact paths, so this only ever handles slugs that don't match one of those.

async function getPage(slug: string) {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  return result.docs[0] || null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) return { title: 'Page not found — The Global Academy' }
  return { title: `${page.title} — The Global Academy` }
}

export default async function GenericAboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  const body = lexicalToPlainText(page.content as never)

  return (
    <div className="generic-page">
      <div className="wrap">
        <Link href="/" className="news-back-link">
          ← Back to Home
        </Link>
        <h1>{page.title}</h1>
        <div className="group-detail-body">
          {body.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
