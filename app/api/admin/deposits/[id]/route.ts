import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => ({})) as { action?: 'approve' | 'reject' }
  const transaction = await prisma.transaction.findUnique({ where: { id } })
  if (!transaction || transaction.type !== 'RECHARGE') return NextResponse.json({ error: 'Deposit not found.' }, { status: 404 })
  if (transaction.status !== 'PENDING') return NextResponse.json({ error: 'Deposit is already processed.' }, { status: 409 })
  if (body.action === 'reject') {
    await prisma.transaction.update({ where: { id }, data: { status: 'REJECTED' } })
    return NextResponse.json({ status: 'REJECTED' })
  }
  if (body.action !== 'approve') return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.transaction.update({ where: { id }, data: { status: 'SUCCESS' } })
    await tx.user.update({ where: { id: transaction.userId }, data: { walletBalance: { increment: transaction.amount } } })
    const referredUser = await tx.user.findUnique({ where: { id: transaction.userId }, select: { referredById: true } })
    if (referredUser?.referredById) {
      const commission = Number(transaction.amount) * 0.01
      await tx.user.update({ where: { id: referredUser.referredById }, data: { walletBalance: { increment: commission } } })
      await tx.transaction.create({ data: { userId: referredUser.referredById, orderId: `REF-${transaction.id}`, type: 'COMMISSION', amount: commission, status: 'SUCCESS', metadata: { kind: 'REFERRAL_DEPOSIT', sourceTransactionId: transaction.id, rate: 1 } } })
    }
    return updated
  })
  return NextResponse.json({ status: result.status, amount: Number(transaction.amount) })
}
