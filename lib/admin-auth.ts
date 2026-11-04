import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE = 'kubota_admin_session'
const secret = () => process.env.ADMIN_SESSION_SECRET || process.env.BETTER_AUTH_SECRET || 'kubota-admin-session-change-me'
const configuredId = () => process.env.ADMIN_ID || 'admin@123'
const configuredPassword = () => process.env.ADMIN_PASSWORD || 'admin@123'

export function verifyAdminCredentials(id: string, password: string) {
  return id === configuredId() && password === configuredPassword()
}

function sign(value: string) { return createHmac('sha256', secret()).update(value).digest('hex') }

export async function createAdminSession() {
  const value = `${Date.now()}.${sign('admin')}`
  const jar = await cookies()
  jar.set(COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/', maxAge: 60 * 60 * 12 })
}

export async function clearAdminSession() { (await cookies()).delete(COOKIE) }

export async function isAdminAuthenticated() {
  const value = (await cookies()).get(COOKIE)?.value || ''
  const [timestamp, signature] = value.split('.')
  if (!timestamp || !signature || Date.now() - Number(timestamp) > 12 * 60 * 60 * 1000) return false
  const expected = sign('admin')
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
