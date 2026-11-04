'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileShell, SectionCard } from '@/components/mobile-shell'

export default function GiftCodePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function redeem() {
    if (!code.trim()) return setMessage('Enter a gift code.')
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/gift-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      })
      const data = await response.json()
      if (response.status === 401) return router.replace('/login?next=/gift-code')
      setMessage(response.ok ? data.message : data.error || 'Gift code could not be redeemed.')
      if (response.ok) setCode('')
    } catch {
      setMessage('Unable to redeem the gift code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <MobileShell title="Gift Code">
    <SectionCard title="Redeem reward code">
      <p className="mb-4 text-sm text-slate-500">Enter a valid code to add its reward directly to your wallet.</p>
      <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) redeem() }} placeholder="ENTER GIFT CODE" autoComplete="off" className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-[#ff7411]" />
      <button type="button" onClick={redeem} disabled={loading} className="mt-3 h-12 w-full rounded-xl bg-[#ff7411] text-sm font-black text-white disabled:opacity-60">{loading ? 'Checking code...' : 'Claim gift code'}</button>
      {message && <p role="status" aria-live="polite" className="mt-4 rounded-xl bg-orange-50 px-3 py-3 text-sm font-semibold text-orange-700">{message}</p>}
    </SectionCard>
  </MobileShell>
}
