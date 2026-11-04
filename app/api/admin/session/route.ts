import { NextResponse } from 'next/server'
import { clearAdminSession, createAdminSession, verifyAdminCredentials } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { id?: string; password?: string }
  if (!verifyAdminCredentials(body.id || '', body.password || '')) return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 })
  await createAdminSession()
  return NextResponse.json({ authenticated: true })
}

export async function DELETE() { await clearAdminSession(); return NextResponse.json({ authenticated: false }) }
