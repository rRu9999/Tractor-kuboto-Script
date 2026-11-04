import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/user-auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  return NextResponse.json({ bank: await prisma.bankAccount.findUnique({ where: { userId: user.id }, select: { holderName: true, accountNumber: true, ifscCode: true, bankName: true, verified: true } }) })
}
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  const body = await request.json()
  const holderName = String(body.holderName || '').trim(), accountNumber = String(body.accountNumber || '').replace(/\D/g, ''), ifscCode = String(body.ifscCode || '').trim().toUpperCase()
  if (holderName.length < 2 || accountNumber.length < 8 || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) return NextResponse.json({ error: 'Enter valid bank details.' }, { status: 400 })
  const bank = await prisma.bankAccount.upsert({ where: { userId: user.id }, create: { userId: user.id, holderName, accountNumber, ifscCode, bankName: body.bankName || null, verified: true }, update: { holderName, accountNumber, ifscCode, bankName: body.bankName || null, verified: true } })
  return NextResponse.json({ ok: true, bank: { holderName: bank.holderName, accountNumber: bank.accountNumber, ifscCode: bank.ifscCode } })
}
