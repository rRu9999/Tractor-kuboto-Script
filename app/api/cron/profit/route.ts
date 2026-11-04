import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  const admin = await isAdminAuthenticated()
  if (!admin && process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!admin && !process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const today = new Date().toISOString().slice(0, 10)
  const active = await prisma.investment.findMany({ where: { status: 'ACTIVE' }, select: { id: true, userId: true, dailyReturn: true, earned: true, remainingDays: true, purchasePrice: true } })
  let processed = 0
  for (const item of active) {
    const already = await prisma.transaction.findFirst({ where: { userId: item.userId, type: 'PROFIT', metadata: { path: ['investmentId'], equals: item.id }, createdAt: { gte: new Date(`${today}T00:00:00.000Z`) }, NOT: { metadata: { path: ['kind'], equals: 'INVESTMENT_PURCHASE' } } } })
    if (already) continue
    const profit = Math.min(Number(item.dailyReturn), Number(item.purchasePrice) - Number(item.earned))
    if (profit <= 0) continue
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: item.userId }, data: { walletBalance: { increment: profit } } })
      await tx.investment.update({ where: { id: item.id }, data: { earned: { increment: profit }, remainingDays: { decrement: 1 }, status: item.remainingDays <= 1 ? 'COMPLETED' : 'ACTIVE', completedAt: item.remainingDays <= 1 ? new Date() : null } })
      await tx.transaction.create({ data: { userId: item.userId, orderId: `PF-${item.id}-${today}`, type: 'PROFIT', amount: profit, status: 'SUCCESS', metadata: { investmentId: item.id, date: today } } })
    })
    processed++
  }
  return NextResponse.json({ ok: true, processed, processedAt: new Date().toISOString() })
}
export async function GET(request: Request) { return POST(request) }
