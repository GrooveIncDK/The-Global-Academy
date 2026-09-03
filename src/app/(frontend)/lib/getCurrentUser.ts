import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'
import type { User } from '@/payload-types'
import type { CurrentUser } from '../components/Header'

/** Server-side helper: resolves the logged-in user (if any) from the request's
 * cookies, for use in layout/page/route-handler server components. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })
  if (!user || !('email' in user)) return null
  const u = user as User
  return { id: u.id, email: u.email, role: u.role }
}
