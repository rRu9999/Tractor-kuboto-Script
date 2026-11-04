import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  try {
    const [totalUsers, activeUsers, bannedUsers, deposits, withdrawals, pendingDeposits, pendingWithdrawals, activePlans] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'BANNED' } }),
      prisma.transaction.aggregate({ where: { type: 'RECHARGE', status: 'SUCCESS' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'WITHDRAWAL', status: 'SUCCESS' }, _sum: { amount: true } }),
      prisma.transaction.count({ where: { type: 'RECHARGE', status: 'PENDING' } }),
      prisma.transaction.count({ where: { type: 'WITHDRAWAL', status: 'PENDING' } }),
      prisma.investment.count({ where: { status: 'ACTIVE' } }),
    ])

    return NextResponse.json({
      totalUsers,
      activeUsers,
      bannedUsers,
      totalDeposits: Number(deposits._sum.amount ?? 0),
      totalWithdrawals: Number(withdrawals._sum.amount ?? 0),
      pendingDeposits,
      pendingWithdrawals,
      activePlans,
    })
  } catch {
    return NextResponse.json({ error: 'Admin metrics are temporarily unavailable.' }, { status: 503 })
  }
}
