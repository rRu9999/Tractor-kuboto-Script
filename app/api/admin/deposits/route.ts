import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const deposits = await prisma.transaction.findMany({ where: { type: 'RECHARGE', status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 200, include: { user: { select: { uid: true, mobile: true } } } })
  return NextResponse.json(deposits.map((deposit) => ({ id: deposit.id, orderId: deposit.orderId, amount: Number(deposit.amount), createdAt: deposit.createdAt, user: deposit.user, metadata: deposit.metadata && typeof deposit.metadata === 'object' ? deposit.metadata : {} })))
}
