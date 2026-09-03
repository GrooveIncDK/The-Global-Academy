import { redirect } from 'next/navigation'
import Link from 'next/link'
import React from 'react'

import { getCurrentUser } from '../lib/getCurrentUser'
import { LoginForm } from './LoginForm'

export const metadata = { title: 'Log in — The Global Academy' }

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect(user.role === 'admin' ? '/admin' : '/dashboard')

  return (
    <div className="auth-page">
      <h1>Log in</h1>
      <p className="auth-sub">Access your researcher dashboard.</p>
      <LoginForm />
      <p className="auth-switch">
        Don&rsquo;t have a researcher page yet? <Link href="/register">Register for free</Link>
      </p>
    </div>
  )
}
