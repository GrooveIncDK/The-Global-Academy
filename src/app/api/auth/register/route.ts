import { generatePayloadCookie } from 'payload'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import config from '@/payload.config'

/**
 * Public self-registration for researchers: creates the Users account (always
 * role: 'researcher' — the role field itself refuses any other value unless
 * an admin is making the request, see collections/Users.ts), creates a blank,
 * unpublished Researchers profile linked to that account, logs the new user
 * in, and sets the same auth cookie Payload's own /api/users/login endpoint
 * would — so the browser is already authenticated when this responds.
 */
export async function POST(req: Request) {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })

  let body: { email?: string; password?: string; fullName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''
  const fullName = (body.fullName || '').trim()

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  try {
    const user = await payload.create({
      collection: 'users',
      data: { email, password, role: 'researcher' },
    })

    const baseSlug =
      (fullName || email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'researcher'
    const slug = `${baseSlug}-${user.id}`

    await payload.create({
      collection: 'researchers',
      data: {
        user: user.id,
        slug,
        fullName: fullName || email.split('@')[0],
        isPublished: false,
      },
    })

    const { token } = await payload.login({ collection: 'users', data: { email, password } })
    const usersCollection = payload.collections.users.config
    const cookie = generatePayloadCookie({
      collectionAuthConfig: usersCollection.auth,
      cookiePrefix: payload.config.cookiePrefix,
      token: token as string,
    })

    return NextResponse.json({ success: true }, { status: 201, headers: { 'Set-Cookie': cookie } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed.'
    // Payload throws a validation error whose message already says "email"
    // when the address is already taken — pass it through as-is.
    return NextResponse.json({ message }, { status: 400 })
  }
}
