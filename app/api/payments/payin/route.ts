import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/user-auth'

const gatewayBase = 'https://api.gpay.one'

function origin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` || new URL(request.url).origin
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { amount?: number; orderId?: string }
  const amount = Number(body.amount)
  if (!Number.isInteger(amount) || amount < 100) return NextResponse.json({ error: 'Minimum deposit is ₹100.' }, { status: 400 })
  if (!process.env.Key_2 || !process.env.API_KEY_2) return NextResponse.json({ error: 'Payment gateway is not configured yet.' }, { status: 503 })
  const orderId = body.orderId?.trim() || `PAYIN-${Date.now().toString(36).toUpperCase()}-${user.uid}`
  const existing = await prisma.transaction.findUnique({ where: { orderId }, select: { orderId: true, amount: true, status: true, metadata: true } })
  if (existing) return NextResponse.json({ orderId: existing.orderId, amount: Number(existing.amount), status: existing.status, paymentUrl: typeof existing.metadata === 'object' && existing.metadata ? (existing.metadata as { paymentUrl?: string }).paymentUrl : undefined })
  const callbackUrl = `${origin(request)}/api/payments/webhook`
  const returnUrl = `${origin(request)}/account?payment=${encodeURIComponent(orderId)}`
  try {
    const gatewayResponse = await fetch(`${gatewayBase}/v1/payins/create`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ merchantKey: process.env.Key_2, secretKey: process.env.API_KEY_2, orderId, amount, currency: 'INR', callbackUrl, returnUrl, customer: { name: user.name, mobile: user.mobile }, name: user.name, email: `user${user.uid}@example.com`, phone: user.mobile, mobile: user.mobile, customerName: user.name, customerMobile: user.mobile }) })
    const gateway = await gatewayResponse.json().catch(() => null) as Record<string, unknown> | null
    if (!gatewayResponse.ok || Number(gateway?.code) !== 1000) return NextResponse.json({ error: String(gateway?.msg || 'Gateway rejected the payment request.') }, { status: 502 })
    const data = (gateway?.data && typeof gateway.data === 'object' ? gateway.data : gateway) as Record<string, unknown>
    const paymentUrl = [data.paymentUrl, data.payUrl, data.pay_url, data.checkoutUrl, data.redirectUrl, data.url].find((value): value is string => typeof value === 'string' && value.startsWith('http'))
    if (!paymentUrl) return NextResponse.json({ error: 'Gateway did not return a payment link.' }, { status: 502 })
    await prisma.transaction.create({ data: { orderId, userId: user.id, type: 'RECHARGE', amount, status: 'PENDING', metadata: { gateway: 'gpay', paymentUrl, gatewayOrderId: data.orderId || data.order_id || data.payOrderId || null } } })
    return NextResponse.json({ orderId, amount, status: 'PENDING', paymentUrl })
  } catch {
    return NextResponse.json({ error: 'Unable to connect to the payment gateway.' }, { status: 502 })
  }
}
