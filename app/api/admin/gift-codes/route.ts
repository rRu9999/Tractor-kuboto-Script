import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'

function code() {
  return `GIFT-${randomBytes(4).toString('hex').toUpperCase()}`
}

export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const giftCodes = await prisma.giftCode.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ giftCodes: giftCodes.map((gift) => ({ ...gift, reward: Number(gift.reward) })) })
}

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { code?: string; reward?: number; maxClaims?: number; expiresAt?: string | null }
  const reward = Number(body.reward)
  const maxClaims = Number(body.maxClaims)
  if (!Number.isFinite(reward) || reward <= 0) return NextResponse.json({ error: 'Reward must be greater than zero.' }, { status: 400 })
  if (!Number.isInteger(maxClaims) || maxClaims < 1) return NextResponse.json({ error: 'Max claims must be at least 1.' }, { status: 400 })
  const normalized = (body.code?.trim().toUpperCase() || code()).replace(/[^A-Z0-9-]/g, '')
  if (normalized.length < 4) return NextResponse.json({ error: 'Enter a valid gift code.' }, { status: 400 })
  try {
    const gift = await prisma.giftCode.create({ data: { code: normalized, reward, maxClaims, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null } })
    return NextResponse.json({ giftCode: { ...gift, reward: Number(gift.reward) } })
  } catch {
    return NextResponse.json({ error: 'That gift code already exists.' }, { status: 409 })
  }
}

export async function PATCH(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { id?: string; isActive?: boolean }
  if (!body.id || typeof body.isActive !== 'boolean') return NextResponse.json({ error: 'Invalid gift code update.' }, { status: 400 })
  const gift = await prisma.giftCode.update({ where: { id: body.id }, data: { isActive: body.isActive } })
  return NextResponse.json({ giftCode: { ...gift, reward: Number(gift.reward) } })
}
