import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { Media, Post, PostCategory } from '@/payload-types'

export const metadata: Metadata = {
  title: 'News — The Global Academy',
  description: 'Latest news and articles from The Global Academy for Global Goals CIC.',
}
// See the comment on this line in the homepage (src/app/(frontend)/page.tsx) —
// this route queries Postgres too, so it gets the same build-time-hang fix.
export const dynamic = 'force-dynamic'

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function NewsCard({ post, index }: { post: Post; index: number }) {
  const image = post.featuredImage && typeof post.featuredImage === 'object' ? (post.featuredImage as Media).url : null
  const placeholderImg = `/images/article-${(index % 3) + 1}.png`

  return (
    <Link className="article-card" href={`/news/${post.slug}`}>
      <figure>
        <img src={image || placeholderImg} alt="" />
      </figure>
      <h3>{post.title}</h3>
      <time>{formatDate(post.publishedAt)}</time>
    </Link>
  )
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams

  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const now = new Date().toISOString()
  const andConditions: Where[] = [
    { publishedAt: { exists: true } },
    { publishedAt: { less_than_equal: now } },
  ]
  if (category) {
    andConditions.push({ 'categories.slug': { equals: category } })
  }
  const where: Where = { and: andConditions }

  const [categories, posts] = await Promise.all([
    payload.find({ collection: 'post-categories', sort: 'name', limit: 100, depth: 0 }),
    payload.find({ collection: 'posts', where, sort: '-publishedAt', limit: 60, depth: 1 }),
  ])

  return (
    <div className="news-page">
      <div className="wrap">
        <h1>News</h1>

        {categories.docs.length > 0 && (
          <div className="news-category-row">
            <Link href="/news" className={!category ? 'news-category active' : 'news-category'}>
              All
            </Link>
            {categories.docs.map((c: PostCategory) => (
              <Link
                key={c.id}
                href={`/news?category=${encodeURIComponent(c.slug)}`}
                className={category === c.slug ? 'news-category active' : 'news-category'}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        <div className="articles-grid">
          {posts.docs.length > 0 ? (
            posts.docs.map((p, i) => <NewsCard key={p.id} post={p} index={i} />)
          ) : (
            <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>No articles found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
