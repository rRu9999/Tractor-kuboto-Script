import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/user-auth'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { orderId?: string; amount?: number; utr?: string; gateway?: string }
    const sessionUser = await getCurrentUser()
    const amount = Number(body.amount)
    const utr = body.utr?.trim() || ''
    if (!Number.isInteger(amount) || amount < 1) return NextResponse.json({ error: 'Enter a valid deposit amount.' }, { status: 400 })
    if (utr && (utr.length < 6 || utr.length > 24)) return NextResponse.json({ error: 'Enter a valid UTR / reference number.' }, { status: 400 })
    if (!sessionUser) return NextResponse.json({ error: 'Sign in is required before submitting a deposit.' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { id: true, status: true } })
    if (!user || user.status === 'BANNED') return NextResponse.json({ error: 'This account cannot submit deposits.' }, { status: 403 })
    const orderId = body.orderId || `DEP-${Date.now().toString(36).toUpperCase()}`
    const existing = await prisma.transaction.findUnique({ where: { orderId }, select: { id: true, userId: true, amount: true, status: true, metadata: true } })
    if (existing) {
      if (existing.userId !== user.id || existing.status !== 'PENDING') return NextResponse.json({ error: 'Deposit request cannot be updated.' }, { status: 409 })
      const metadata = { ...(existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}), ...(utr ? { utr } : {}), gateway: body.gateway || 'UPI' }
      const transaction = await prisma.transaction.update({ where: { id: existing.id }, data: { metadata } })
      return NextResponse.json({ orderId, status: transaction.status, utr: Boolean(utr) })
    }
    const transaction = await prisma.transaction.create({ data: { orderId, userId: user.id, type: 'RECHARGE', amount, status: 'PENDING', metadata: { ...(utr ? { utr } : {}), gateway: body.gateway || 'UPI' } } })
    return NextResponse.json({ orderId: transaction.orderId, status: transaction.status, utr: Boolean(utr) })
  } catch {
    return NextResponse.json({ error: 'Unable to create deposit request.' }, { status: 400 })
  }
}
