import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/user-auth'

export default async function InviteCodePage({ params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser()
  const { code } = await params
  if (user) redirect('/')
  redirect(`/register?inviteCode=${encodeURIComponent(code)}`)
}
