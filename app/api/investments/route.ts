import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/user-auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  const investments = await prisma.investment.findMany({ where: { userId: user.id }, include: { plan: true }, orderBy: { purchasedAt: 'desc' } })
  return NextResponse.json({ investments: investments.map((item) => ({ ...item, purchasePrice: Number(item.purchasePrice), dailyReturn: Number(item.dailyReturn), earned: Number(item.earned) })) })
}
