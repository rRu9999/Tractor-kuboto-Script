import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/user-auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const referrals = await prisma.user.findMany({
    where: { referredById: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      uid: true,
      mobile: true,
      createdAt: true,
      transactions: { where: { type: 'RECHARGE', status: 'SUCCESS' }, select: { amount: true } },
    },
  })
  const deposits = referrals.flatMap((member) => member.transactions.map((transaction) => Number(transaction.amount)))
  const teamDeposit = deposits.reduce((total, amount) => total + amount, 0)
  const commission = await prisma.transaction.aggregate({ where: { userId: user.id, type: 'COMMISSION', status: 'SUCCESS', metadata: { path: ['kind'], equals: 'REFERRAL_DEPOSIT' } }, _sum: { amount: true } })

  return NextResponse.json({
    inviteCode: user.uid,
    inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ko-ecru.vercel.app'}/invite-code/${encodeURIComponent(user.uid)}`,
    commission: Number(commission._sum.amount || 0),
    teamDeposit,
    members: referrals.length,
    levels: [{ level: 1, percent: 1, amount: Number(commission._sum.amount || 0) }, { level: 2, percent: 0, amount: 0 }, { level: 3, percent: 0, amount: 0 }],
    referrals: referrals.map((member) => ({ uid: member.uid, mobile: member.mobile, joinedAt: member.createdAt, deposit: member.transactions.reduce((total, transaction) => total + Number(transaction.amount), 0) })),
  })
}
