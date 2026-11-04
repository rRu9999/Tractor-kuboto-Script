import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, verifyPassword } from '@/lib/user-auth'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  const { amount, password } = await request.json()
  const value = Number(amount)
  const settings = await prisma.setting.findMany({ where: { key: { in: ['withdrawalOrderRequirementEnabled', 'withdrawalMinAmount', 'withdrawalRequiredOrders'] } } })
  const settingMap = Object.fromEntries(settings.map((item) => [item.key, item.value])) as Record<string, unknown>
  const minimum = Math.max(1, Number(settingMap.withdrawalMinAmount ?? 500))
  const orderRequirementEnabled = settingMap.withdrawalOrderRequirementEnabled === true
  const requiredOrders = Math.max(1, Number(settingMap.withdrawalRequiredOrders ?? 1))
  if (!Number.isInteger(value) || value < minimum) return NextResponse.json({ error: `Minimum withdrawal is ₹${minimum.toLocaleString('en-IN')}.` }, { status: 400 })
  if (orderRequirementEnabled) {
    const orders = await prisma.investment.count({ where: { userId: user.id } })
    if (orders < requiredOrders) return NextResponse.json({ error: `Buy ${requiredOrders - orders} more order${requiredOrders - orders === 1 ? '' : 's'} before withdrawing.` }, { status: 400 })
  }
  if (!verifyPassword(String(password || ''), user.passwordHash)) return NextResponse.json({ error: 'Incorrect login password.' }, { status: 403 })
  const bank = await prisma.bankAccount.findUnique({ where: { userId: user.id } })
  if (!bank) return NextResponse.json({ error: 'Bind your bank account before withdrawing.' }, { status: 400 })
  try {
    const transaction = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { walletBalance: true, bonusBalance: true } })
      const withdrawable = fresh ? Number(fresh.walletBalance) - Number(fresh.bonusBalance) : 0
      if (!fresh || withdrawable < value) throw new Error('BALANCE')
      await tx.user.update({ where: { id: user.id }, data: { walletBalance: { decrement: value } } })
      return tx.transaction.create({ data: { userId: user.id, orderId: `WD-${Date.now().toString(36).toUpperCase()}`, type: 'WITHDRAWAL', amount: value, status: 'PENDING', metadata: { bankAccountId: bank.id, bankLast4: bank.accountNumber.slice(-4) } } })
    })
    return NextResponse.json({ ok: true, orderId: transaction.orderId, status: transaction.status })
  } catch { return NextResponse.json({ error: 'Insufficient available balance.' }, { status: 402 }) }
}
