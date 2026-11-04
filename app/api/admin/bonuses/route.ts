import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { amount?: number }
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Bonus amount must be greater than zero.' }, { status: 400 })
  const users = await prisma.user.findMany({ select: { id: true } })
  let applied = 0
  for (const user of users) {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({ where: { userId: user.id, metadata: { path: ['kind'], equals: 'EXISTING_MEMBER_BONUS' } }, select: { id: true } })
      if (existing) return false
      await tx.user.update({ where: { id: user.id }, data: { walletBalance: { increment: amount }, bonusBalance: { increment: amount } } })
      await tx.transaction.create({ data: { userId: user.id, orderId: `BONUS-EXISTING-${user.id}`, type: 'COMMISSION', amount, status: 'SUCCESS', metadata: { kind: 'EXISTING_MEMBER_BONUS', amount } } })
      return true
    })
    if (result) applied += 1
  }
  return NextResponse.json({ ok: true, applied, amount })
}
