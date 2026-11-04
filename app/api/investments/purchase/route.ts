import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/user-auth'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  const { planId } = await request.json()
  if (!planId) return NextResponse.json({ error: 'Plan is required.' }, { status: 400 })
  try {
    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.plan.findFirst({ where: { id: planId, isActive: true } })
      if (!plan) throw new Error('PLAN_NOT_FOUND')
      const active = await tx.investment.count({ where: { userId: user.id, planId, status: 'ACTIVE' } })
      if (active >= plan.purchaseLimit) throw new Error('PLAN_LIMIT')
      const account = await tx.user.findUnique({ where: { id: user.id }, select: { walletBalance: true, bonusBalance: true } })
      if (!account || Number(account.walletBalance) < Number(plan.price)) throw new Error('INSUFFICIENT_BALANCE')
      const bonusUsed = Math.min(Number(account.bonusBalance), Number(plan.price))
      const investment = await tx.investment.create({ data: { userId: user.id, planId: plan.id, purchasePrice: plan.price, dailyReturn: plan.dailyFixed ?? (Number(plan.price) * Number(plan.dailyPercent ?? 0) / 100), remainingDays: plan.durationDays } })
      await tx.user.update({ where: { id: user.id }, data: { walletBalance: { decrement: plan.price }, bonusBalance: { decrement: bonusUsed } } })
      await tx.transaction.create({ data: { userId: user.id, orderId: `INV-${Date.now().toString(36).toUpperCase()}`, type: 'PROFIT', amount: plan.price, status: 'SUCCESS', metadata: { kind: 'INVESTMENT_PURCHASE', investmentId: investment.id, plan: plan.name } } })
      return investment
    })
    return NextResponse.json({ ok: true, investmentId: result.id })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    const messages: Record<string, string> = { PLAN_NOT_FOUND: 'This plan is unavailable.', PLAN_LIMIT: 'You already purchased this plan.', INSUFFICIENT_BALANCE: 'Go to Recharge Your Balance.' }
    return NextResponse.json({ error: messages[code] || 'Purchase failed.' }, { status: code === 'INSUFFICIENT_BALANCE' ? 402 : 400 })
  }
}
