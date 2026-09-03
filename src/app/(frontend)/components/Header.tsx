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

              <details className="nav-dropdown">
                <summary>About</summary>
                <div className="nav-dropdown-panel">
                  <Link href="/news">News</Link>
                  <Link href="/about/gallery">Gallery</Link>
                  <Link href="/about/team">Meet the team</Link>
                  <Link href="/about/goals">Goals and targets</Link>
                </div>
              </details>

              <details className="nav-dropdown">
                <summary>Explore</summary>
                <div className="nav-dropdown-panel">
                  <Link href="/explore/researchers">Researchers</Link>
                  <Link href="/explore/research-groups">Research groups</Link>
                  <Link href="/about/goals">Goals and targets</Link>
                  <Link href="/about/sdgs-workshops">SDGs Workshops</Link>
                </div>
              </details>

              <div className="nav-item">
                <Link href="/#jobs" className="top-link">
                  Jobs
                </Link>
              </div>

              <div className="nav-item">
                <Link href="/contact" className="top-link">
                  Contact
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
