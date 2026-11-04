import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function isSuccess(value: unknown) { return Number(value) === 10 || value === 'SUCCESS' || value === 'success' }
function isFailed(value: unknown) { return Number(value) === 9 || value === 'FAILED' || value === 'failed' }

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const providedSecret = String(body.secretKey || request.headers.get('x-secret-key') || '')
  if (!process.env.API_KEY_2 || providedSecret !== process.env.API_KEY_2) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orderId = String(body.orderId || body.orderNo || body.outOrderId || '')
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  const status = body.status ?? body.orderStatus
  const statusValue = String(status ?? '')
  const transaction = await prisma.transaction.findUnique({ where: { orderId }, select: { id: true, userId: true, amount: true, status: true } })
  if (!transaction) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (transaction.status === 'SUCCESS' || transaction.status === 'FAILED') return NextResponse.json({ ok: true, duplicate: true })
  if (isFailed(status)) {
    await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'FAILED', metadata: { gateway: 'gpay', status: statusValue } } })
    return NextResponse.json({ ok: true })
  }
  if (!isSuccess(status)) return NextResponse.json({ ok: true, pending: true })
  await prisma.$transaction(async (tx) => {
    const updated = await tx.transaction.updateMany({ where: { id: transaction.id, status: 'PENDING' }, data: { status: 'SUCCESS', metadata: { gateway: 'gpay', status: statusValue } } })
    if (updated.count !== 1) return
    await tx.user.update({ where: { id: transaction.userId }, data: { walletBalance: { increment: transaction.amount } } })
  })
  return NextResponse.json({ ok: true })
}
