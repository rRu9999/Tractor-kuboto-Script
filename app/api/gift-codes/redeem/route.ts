import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/user-auth'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 })
  const { code } = await request.json().catch(() => ({})) as { code?: string }
  const normalized = code?.trim().toUpperCase()
  if (!normalized) return NextResponse.json({ error: 'Enter a gift code.' }, { status: 400 })
  const gift = await prisma.giftCode.findUnique({ where: { code: normalized } })
  if (!gift || !gift.isActive || gift.claims >= gift.maxClaims || (gift.expiresAt && gift.expiresAt < new Date())) return NextResponse.json({ error: 'Gift code is invalid or expired.' }, { status: 400 })
  const result = await prisma.$transaction(async (tx) => {
    const alreadyClaimed = await tx.giftCodeClaim.findUnique({ where: { giftCodeId_userId: { giftCodeId: gift.id, userId: user.id } } })
    if (alreadyClaimed) throw new Error('Gift code already claimed by this account')
    const updated = await tx.giftCode.updateMany({ where: { id: gift.id, isActive: true, claims: { lt: gift.maxClaims } }, data: { claims: { increment: 1 } } })
    if (updated.count !== 1) throw new Error('Gift code is no longer available')
    await tx.giftCodeClaim.create({ data: { giftCodeId: gift.id, userId: user.id } })
    await tx.user.update({ where: { id: user.id }, data: { walletBalance: { increment: gift.reward } } })
    await tx.transaction.create({ data: { orderId: `GIFT-${gift.id}-${user.id}-${Date.now()}`, userId: user.id, type: 'COMMISSION', amount: gift.reward, status: 'SUCCESS', metadata: { giftCode: normalized } } })
    return gift.reward
  }).catch(() => null)
  if (result === null) return NextResponse.json({ error: 'Gift code could not be redeemed.' }, { status: 409 })
  return NextResponse.json({ reward: Number(result), message: `₹${Number(result).toLocaleString('en-IN')} added to your wallet.` })
}
