import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Contact — The Global Academy',
  description: 'Get in touch with The Global Academy for Global Goals CIC.',
}

const ADDRESS_LINES = [
  'First Floor Office',
  "Salters Brothers Yard",
  'Folly Bridge',
  'Oxford OX1 4LB',
  'United Kingdom',
]

const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(ADDRESS_LINES.join(', '))

const EMAIL = 'theteam@theglobalacademy.ac'

const SOCIAL_LINKS = [
  { label: 'Twitter / X', href: 'https://twitter.com/1globalacademy' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/global-academy-global-goals/' },
  { label: 'Facebook', href: 'https://www.facebook.com/GlobalAcademyGlobalGoals/' },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UCoDbgOIN9qq2cqCJWVzedsw/videos' },
]

export default function ContactPage() {
  return (
    <div className="contact-page">
      <div className="wrap">
        <h1>Contact us</h1>
        <p className="contact-sub">
          Questions about our researchers, joining as a member, or partnering with The Global
          Academy? We&rsquo;d love to hear from you.
        </p>

        <div className="contact-grid">
          <div className="contact-card">
            <h2>Email</h2>
            <p>
              <a className="contact-link" href={`mailto:${EMAIL}`}>
                {EMAIL}
              </a>
            </p>
          </div>

          <div className="contact-card">
            <h2>Address</h2>
            <p className="contact-address">
              {ADDRESS_LINES.map((line) => (
                <React.Fragment key={line}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </p>
            <a className="btn-outline" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              Open in Maps
            </a>
          </div>

          <div className="contact-card">
            <h2>Follow us</h2>
            <ul className="contact-social-list">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
