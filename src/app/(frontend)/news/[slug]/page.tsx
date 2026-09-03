import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { Media, PostCategory } from '@/payload-types'
import { lexicalToPlainText } from '../../lib/richtext'

// See the comment on this line in the homepage (src/app/(frontend)/page.tsx) —
// this route queries Postgres too, so it gets the same build-time-hang fix.
export const dynamic = 'force-dynamic'

async function getPost(slug: string) {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const result = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  return result.docs[0] || null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Article not found — The Global Academy' }
  return {
    title: `${post.title} — The Global Academy`,
    description: post.excerpt || undefined,
  }
}

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const image = post.featuredImage && typeof post.featuredImage === 'object' ? (post.featuredImage as Media).url : null
  const categories = (post.categories || []).filter(
    (c): c is PostCategory => typeof c === 'object' && c !== null,
  )
  const body = lexicalToPlainText(post.content as never)

  return (
    <div className="news-detail-page">
      <div className="wrap">
        <Link href="/news" className="news-back-link">
          ← Back to News
        </Link>

        <h1>{post.title}</h1>
        <div className="news-detail-meta">
          <time>{formatDate(post.publishedAt)}</time>
          {categories.length > 0 && (
            <div className="news-detail-categories">
              {categories.map((c) => (
                <span key={c.id} className="news-category">
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {image && (
          <figure className="news-detail-image">
            <img src={image} alt="" />
          </figure>
        )}

        <div className="news-detail-body">
          {body.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
