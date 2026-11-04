import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const { id } = await params
  const { action } = await request.json()
  if (!['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  try {
    const tx = await prisma.$transaction(async (db) => {
      const item = await db.transaction.findUnique({ where: { id } })
      if (!item || item.type !== 'WITHDRAWAL' || item.status !== 'PENDING') throw new Error('NOT_PENDING')
      if (action === 'reject') await db.user.update({ where: { id: item.userId }, data: { walletBalance: { increment: item.amount } } })
      return db.transaction.update({ where: { id }, data: { status: action === 'approve' ? 'SUCCESS' : 'REJECTED', metadata: { ...(item.metadata && typeof item.metadata === 'object' ? item.metadata : {}), reviewedAt: new Date().toISOString() } } })
    })
    return NextResponse.json({ ok: true, status: tx.status })
  } catch { return NextResponse.json({ error: 'Withdrawal is no longer pending.' }, { status: 409 }) }
}
