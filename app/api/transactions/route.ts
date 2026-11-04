import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/user-auth'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 })
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, ...(type && type !== 'ALL' ? { type: type === 'RECHARGE' ? 'RECHARGE' : 'WITHDRAWAL' } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, orderId: true, type: true, amount: true, status: true, metadata: true, createdAt: true },
  })
  return NextResponse.json(transactions.map((transaction) => ({ ...transaction, amount: Number(transaction.amount), metadata: transaction.metadata && typeof transaction.metadata === 'object' ? transaction.metadata : {} })))
}
