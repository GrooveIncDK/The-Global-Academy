import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import { getCurrentUser } from '../lib/getCurrentUser'
import { ProfileForm } from './ProfileForm'

export const metadata = { title: 'My dashboard — The Global Academy' }

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  if (user.role === 'admin') {
    return (
      <div className="dashboard-page">
        <h1>Admin</h1>
        <p className="dashboard-sub">Signed in as {user.email}.</p>
        <div className="dashboard-admin-note">
          Admin accounts manage the whole site — researchers, institutions, jobs, and articles — from
          the full admin panel rather than this lightweight dashboard.{' '}
          <a href="/admin" target="_blank" rel="noopener noreferrer">
            Go to the admin panel →
          </a>
        </div>
      </div>
    )
  }

  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  const existing = await payload.find({
    collection: 'researchers',
    where: { user: { equals: user.id } },
    limit: 1,
    depth: 1,
  })

  let researcher = existing.docs[0]

  if (!researcher) {
    // Accounts created before this dashboard existed won't have a linked
    // profile yet — create a blank one now so there's something to edit.
    const slug = `${user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${user.id}`
    researcher = await payload.create({
      collection: 'researchers',
      data: { user: user.id, slug, fullName: user.email, isPublished: false },
    })
  }

  const institutions = await payload.find({
    collection: 'institutions',
    limit: 2000,
    depth: 0,
    sort: 'name',
  })

  return (
    <div className="dashboard-page">
      <h1>My researcher profile</h1>
      <p className="dashboard-sub">Signed in as {user.email}.</p>
      <span className={`dashboard-status${researcher.isPublished ? ' published' : ''}`}>
        {researcher.isPublished ? 'Published — visible on the directory' : 'Not published yet'}
      </span>
      <ProfileForm researcher={researcher} institutions={institutions.docs} />
    </div>
  )
}
