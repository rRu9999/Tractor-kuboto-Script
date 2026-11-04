import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const SESSION_COOKIE = 'kubota_session'
const SESSION_DAYS = 30

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, 64)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex') }

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString('hex')
  await prisma.session.create({ data: { tokenHash: tokenHash(token), userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) } })
  const jar = await cookies()
  const isProduction = process.env.NODE_ENV === 'production'
  const isV0Preview = Boolean(process.env.V0_RUNTIME_URL || process.env.V0_DEV_APP_URL || process.env.V0_BUILD_URL || process.env.V0_SANDBOX_URL)
  const crossSitePreview = isProduction || isV0Preview
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: crossSitePreview, sameSite: crossSitePreview ? 'none' : 'lax', path: '/', maxAge: SESSION_DAYS * 86400 })
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: true } })
  if (!session || session.expiresAt < new Date() || session.user.status === 'BANNED') return null
  return session.user
}

export async function clearUserSession() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } })
  jar.delete(SESSION_COOKIE)
}
