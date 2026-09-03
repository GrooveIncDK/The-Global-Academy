import Link from 'next/link'
import React from 'react'

import { MobileMenu } from './MobileMenu'
import { LogoutButton } from './LogoutButton'

export type CurrentUser = {
  id: number
  email: string
  role: 'admin' | 'researcher' | 'employer'
} | null

export function Header({ user }: { user: CurrentUser }) {
  return (
    <>
      <div className="top-row">
        <Link href="/">
          <img src="/images/logo-header.png" alt="The Global Academy - Home" />
        </Link>
      </div>

      <div className="nav-row">
        <div className="nav-inner">
          <MobileMenu>
            <nav className="primary" aria-label="Main menu">
              <div className="nav-item">
                <Link href="/" className="top-link">
                  Home
                </Link>
              </div>
              <div className="nav-item">
                <Link href="/#researchers" className="top-link">
                  Researchers
                </Link>
              </div>
              <div className="nav-item">
                <Link href="/#jobs" className="top-link">
                  Jobs
                </Link>
              </div>
              <div className="nav-item">
                <Link href="/#news" className="top-link">
                  News
                </Link>
              </div>
              {!user && (
                <div className="nav-item">
                  <Link href="/login" className="top-link">
                    Log in
                  </Link>
                </div>
              )}
            </nav>
          </MobileMenu>

          <div className="account-links">
            {user ? (
              <>
                <span className="who">{user.email}</span>
                {user.role === 'admin' ? (
                  <a className="btn-outline" href="/admin" target="_blank" rel="noopener noreferrer">
                    Admin panel
                  </a>
                ) : (
                  <Link href="/dashboard" className="btn-outline">
                    My dashboard
                  </Link>
                )}
                <LogoutButton />
              </>
            ) : (
              <Link href="/register" className="btn-outline">
                Get your own researcher page here (it&rsquo;s free!)
              </Link>
            )}
          </div>
        </div>
      </div>
      <img className="menu-divider" src="/images/menu-divider.png" alt="" />
    </>
  )
}
