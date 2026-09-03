import React from 'react'

import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { getCurrentUser } from './lib/getCurrentUser'
import './styles.css'

export const metadata = {
  description:
    'The Global Academy — researchers and academics working internationally on the UN Sustainable Development Goals.',
  title: 'The Global Academy',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const user = await getCurrentUser()

  return (
    <html lang="en-GB">
      <body>
        <div className="construction-banner" role="alert">
          <p>
            <strong>🚧 UNDER CONSTRUCTION</strong> — This is a preview of an upcoming redesign and is
            not the live site. For the current, live version of The Global Academy, please visit{' '}
            <a href="https://theglobalacademy.ac/">theglobalacademy.ac</a>.
          </p>
        </div>
        <Header user={user} />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
