import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createUserSession, hashPassword, verifyPassword } from '@/lib/user-auth'

function cleanMobile(value: unknown) { return String(value ?? '').replace(/\D/g, '').slice(-10) }
function fail(message: string, status = 400) { return NextResponse.json({ error: message }, { status }) }

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
  const mode = body.mode === 'register' ? 'register' : 'login'
  const mobile = cleanMobile(body.mobile)
  const password = String(body.password ?? '')
  if (mobile.length !== 10 || password.length < 6) return fail('Enter a valid 10-digit mobile number and password of at least 6 characters.')

  if (mode === 'register') {
    const existing = await prisma.user.findUnique({ where: { mobile } })
    if (existing) return fail('This mobile number is already registered.', 409)
    const inviteCode = String(body.inviteCode ?? '').trim()
    if (!inviteCode) return fail('Invite code is required to register.')
    const inviter = await prisma.user.findUnique({ where: { uid: inviteCode } })
    if (!inviter) return fail('Invite code not found.')
    const name = String(body.name ?? '').trim()
    if (name.length < 2 || name.length > 80) return fail('Enter a valid name.')
    const uid = String(Math.floor(10000 + Math.random() * 90000))
    const bonusRows = await prisma.setting.findMany({ where: { key: { in: ['registrationBonusEnabled', 'registrationBonusAmount'] } } })
    const bonusSettings = Object.fromEntries(bonusRows.map((item) => [item.key, item.value])) as Record<string, unknown>
    const registrationBonus = bonusSettings.registrationBonusEnabled === true ? Math.max(0, Number(bonusSettings.registrationBonusAmount ?? 0)) : 0
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { uid, name, mobile, passwordHash: hashPassword(password), referredById: inviter.id, walletBalance: registrationBonus, bonusBalance: registrationBonus } })
      if (registrationBonus > 0) await tx.transaction.create({ data: { userId: created.id, orderId: `BONUS-REG-${created.id}`, type: 'COMMISSION', amount: registrationBonus, status: 'SUCCESS', metadata: { kind: 'REGISTRATION_BONUS', amount: registrationBonus } } })
      return created
    })
    await createUserSession(user.id)
    return NextResponse.json({ ok: true, uid: user.uid })
  }

  const user = await prisma.user.findUnique({ where: { mobile } })
  if (!user || !verifyPassword(password, user.passwordHash)) return fail('Mobile number or password is incorrect.', 401)
  if (user.status === 'BANNED') return fail('This account is blocked. Please contact support.', 403)
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null } })
  await createUserSession(user.id)
  return NextResponse.json({ ok: true, uid: user.uid })
  } catch (error) {
    console.error('[v0] phone auth failed', error)
    return fail('Authentication service is temporarily unavailable. Please try again.', 500)
  }
}

export async function DELETE() {
  const { clearUserSession } = await import('@/lib/user-auth')
  await clearUserSession()
  return NextResponse.json({ ok: true })
}
