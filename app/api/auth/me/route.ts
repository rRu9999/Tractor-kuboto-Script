import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/user-auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ authenticated: false })
  return NextResponse.json({
    authenticated: true,
    user: { uid: user.uid, mobile: user.mobile, walletBalance: user.walletBalance.toString(), bonusBalance: user.bonusBalance.toString() },
  })
}
