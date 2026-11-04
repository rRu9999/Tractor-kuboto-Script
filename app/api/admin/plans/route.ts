import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function GET() {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const plans = await prisma.plan.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ plans: plans.map((plan) => ({ ...plan, price: Number(plan.price), dailyFixed: plan.dailyFixed == null ? null : Number(plan.dailyFixed), dailyPercent: plan.dailyPercent == null ? null : Number(plan.dailyPercent), commissionPercent: Number(plan.commissionPercent), totalReturn: Number(plan.totalReturn), imageUrl: plan.imageUrl })) })
}

export async function POST(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body.name || Number(body.price) <= 0 || Number(body.durationDays) <= 0) return NextResponse.json({ error: 'Name, price and duration are required.' }, { status: 400 })
  const countdownEndsAt = Number(body.offerMinutes) > 0 ? new Date(Date.now() + Number(body.offerMinutes) * 60_000) : null
  const plan = await prisma.plan.create({ data: { name: String(body.name), category: body.category === 'VIP' ? 'VIP' : 'DAILY', price: Number(body.price), dailyFixed: body.dailyFixed ? Number(body.dailyFixed) : null, dailyPercent: body.dailyPercent ? Number(body.dailyPercent) : null, commissionPercent: Number(body.commissionPercent || 0), durationDays: Number(body.durationDays), totalReturn: Number(body.totalReturn || body.price), purchaseLimit: Number(body.purchaseLimit || 1), isActive: body.isActive !== false, isLimited: Boolean(body.isLimited), countdownEndsAt, imageUrl: body.imageUrl ? String(body.imageUrl) : null } })
  return NextResponse.json({ plan }, { status: 201 })
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'Plan id is required.' }, { status: 400 })
  await prisma.plan.update({ where: { id: body.id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  if (!await isAdminAuthenticated()) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ error: 'Plan id is required.' }, { status: 400 })
  const plan = await prisma.plan.update({ where: { id: body.id }, data: { ...(body.isActive === undefined ? {} : { isActive: Boolean(body.isActive) }), ...(body.price === undefined ? {} : { price: Number(body.price) }), ...(body.durationDays === undefined ? {} : { durationDays: Number(body.durationDays) }), ...(body.dailyPercent === undefined ? {} : { dailyPercent: body.dailyPercent == null ? null : Number(body.dailyPercent) }), ...(body.dailyFixed === undefined ? {} : { dailyFixed: body.dailyFixed == null ? null : Number(body.dailyFixed) }), ...(body.commissionPercent === undefined ? {} : { commissionPercent: Number(body.commissionPercent) }), ...(body.totalReturn === undefined ? {} : { totalReturn: Number(body.totalReturn) }), ...(body.name === undefined ? {} : { name: String(body.name) }), ...(body.category === undefined ? {} : { category: body.category === 'VIP' ? 'VIP' : 'DAILY' }), ...(body.imageUrl === undefined ? {} : { imageUrl: body.imageUrl ? String(body.imageUrl) : null }), ...(body.isLimited === undefined ? {} : { isLimited: Boolean(body.isLimited) }), ...(body.offerMinutes === undefined ? {} : { countdownEndsAt: Number(body.offerMinutes) > 0 ? new Date(Date.now() + Number(body.offerMinutes) * 60_000) : null }) } })
  return NextResponse.json({ plan })
}
