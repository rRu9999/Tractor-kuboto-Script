import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'

const defaults = {
  heroImageUrl: '/tractor-hero.png',
  logoUrl: '',
  marquee: 'Welcome to Kubota Invest — withdrawals processed within 24 hours.',
  minWithdrawal: '120',
  minDeposit: '100',
  tax: '10',
  tier1: '25',
  tier2: '3',
  tier3: '2',
  upi: 'kubotainvest@upi',
  support: '+910000000000',
  supportUrl: 'https://wa.me/910000000000',
  telegram: 'https://t.me/KubotaInvestment00',
  whatsapp: 'https://wa.me/910000000000',
  welcomeModal: true,
  manualUpi: false,
  requireUtr: true,
  enableProfitCron: true,
  requireBankVerification: true,
  withdrawalOrderRequirementEnabled: false,
  withdrawalMinAmount: '500',
  withdrawalRequiredOrders: '1',
  registrationBonusEnabled: false,
  registrationBonusAmount: '0',
  existingMemberBonusEnabled: false,
  existingMemberBonusAmount: '0',
}

async function readSettings() {
  const rows = await prisma.setting.findMany()
  const settings = rows.reduce<Record<string, unknown>>((result, row) => {
    result[row.key] = row.value
    return result
  }, { ...defaults })
  for (const key of ['support', 'supportUrl', 'whatsapp']) {
    if (settings[key] === '+91 98765 43210' || settings[key] === 'https://wa.me/919259700000') settings[key] = key === 'support' ? '+910000000000' : 'https://wa.me/910000000000'
  }
  return settings
}

export async function GET() {
  try {
    return NextResponse.json(await readSettings(), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json(defaults, { headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function PUT(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  try {
    const payload = await request.json() as Record<string, unknown>
    const allowed = new Set(Object.keys(defaults))
    const updates = Object.entries(payload).filter(([key]) => allowed.has(key))
    await prisma.$transaction(updates.map(([key, value]) => prisma.setting.upsert({ where: { key }, update: { value: value as never }, create: { key, value: value as never } })))
    return NextResponse.json(await readSettings())
  } catch {
    return NextResponse.json({ error: 'Unable to save platform settings.' }, { status: 400 })
  }
}
