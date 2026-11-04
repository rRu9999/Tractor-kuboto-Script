import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'
export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const withdrawals = await prisma.transaction.findMany({ where: { type: 'WITHDRAWAL', status: 'PENDING' }, include: { user: { select: { uid: true, mobile: true } } }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ withdrawals: withdrawals.map((item) => ({ id: item.id, orderId: item.orderId, amount: Number(item.amount), createdAt: item.createdAt, user: item.user, metadata: item.metadata })) })
}
