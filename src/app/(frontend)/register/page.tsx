import { redirect } from 'next/navigation'
import Link from 'next/link'
import React from 'react'

import { getCurrentUser } from '../lib/getCurrentUser'
import { RegisterForm } from './RegisterForm'

export const metadata = { title: 'Register — The Global Academy' }

export default async function RegisterPage() {
  const user = await getCurrentUser()
  if (user) redirect(user.role === 'admin' ? '/admin' : '/dashboard')

  return (
    <div className="auth-page">
      <h1>Get your own researcher page</h1>
      <p className="auth-sub">It&rsquo;s free — create an account, then fill in your profile.</p>
      <RegisterForm />
      <p className="auth-switch">
        Already registered? <Link href="/login">Log in</Link>
      </p>
    </div>
  )
}
