'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
    } finally {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <button className="btn-outline" onClick={handleLogout} disabled={loading}>
      {loading ? 'Logging out…' : 'Log out'}
    </button>
  )
}
