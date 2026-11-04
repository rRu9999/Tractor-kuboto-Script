import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, uid: true, mobile: true, walletBalance: true, status: true, registrationIp: true, createdAt: true, _count: { select: { transactions: true, investments: true } } } })
  return NextResponse.json({ users: users.map((user) => ({ ...user, walletBalance: Number(user.walletBalance) })) })
}

export async function PATCH(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { id?: string; status?: 'ACTIVE' | 'BANNED'; adjustment?: number; remark?: string }
  if (!body.id || (body.status && !['ACTIVE', 'BANNED'].includes(body.status))) return NextResponse.json({ error: 'Invalid user update.' }, { status: 400 })
  const user = await prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({ where: { id: body.id }, select: { walletBalance: true } })
    if (!current) throw new Error('User not found')
    const adjustment = Number(body.adjustment || 0)
    const updated = await tx.user.update({ where: { id: body.id }, data: { ...(body.status ? { status: body.status } : {}), ...(adjustment ? { walletBalance: { increment: adjustment } } : {}) }, select: { id: true, uid: true, walletBalance: true, status: true } })
    if (adjustment) await tx.adminLog.create({ data: { userId: body.id, action: adjustment > 0 ? 'BALANCE_CREDIT' : 'BALANCE_DEBIT', remark: body.remark || null, metadata: { amount: adjustment } } })
    return updated
  })
  return NextResponse.json({ user: { ...user, walletBalance: Number(user.walletBalance) } })
}
