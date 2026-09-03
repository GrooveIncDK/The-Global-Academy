'use client'

import React, { useState, isValidElement, cloneElement } from 'react'

/** Wraps the primary <nav> (passed as a single child) so the hamburger button
 * can toggle it open on small screens, matching the original static site's
 * behavior. The nav itself is server-rendered — this only injects the
 * open/closed inline style and renders the toggle button next to it. */
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const nav =
    isValidElement(children) && open
      ? cloneElement(children as React.ReactElement<{ style?: React.CSSProperties }>, {
          style: { display: 'flex', flexDirection: 'column', width: '100%' },
        })
      : children

  return (
    <>
      {nav}
      <button
        className="menu-btn"
        aria-label="Toggle menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
      </button>
    </>
  )
}
