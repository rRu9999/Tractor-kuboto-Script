'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Copy, CreditCard, ExternalLink, QrCode, ShieldCheck } from 'lucide-react'
import { MobileShell, SectionCard } from '@/components/mobile-shell'

type Settings = { upi: string; minDeposit: string; manualUpi: boolean; telegram: string; whatsapp: string; supportUrl: string }

type DepositResponse = { orderId: string; amount: number; upi: string; qrUrl: string; paymentUrl?: string; status: string }

export default function RechargePage() {
  const [amount, setAmount] = useState('720')
  const [utr, setUtr] = useState('')
  const [settings, setSettings] = useState<Settings>({ upi: 'kubotainvest@upi', minDeposit: '250', manualUpi: true, telegram: 'https://t.me/kubotainvest', whatsapp: 'https://wa.me/910000000000', supportUrl: 'https://wa.me/910000000000' })
  const [checkout, setCheckout] = useState<DepositResponse | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const required = new URLSearchParams(window.location.search).get('required')
    if (required && Number(required) > 0) {
      setAmount(required)
      setMessage(`Your balance is insufficient. Recharge at least ₹${Number(required).toLocaleString('en-IN')} to purchase this plan.`)
    }
    fetch('/api/platform/settings').then((response) => response.ok ? response.json() : null).then((data) => data && setSettings((current) => ({ ...current, ...data }))).catch(() => undefined)
  }, [])

  const numericAmount = Number(amount || 0)
  const upiUri = useMemo(() => `upi://pay?pa=${encodeURIComponent(settings.upi)}&pn=Kubota%20Invest&am=${numericAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Wallet deposit')}`, [numericAmount, settings.upi])
  const qrUrl = useMemo(() => `https://quickchart.io/qr?size=280&margin=2&text=${encodeURIComponent(upiUri)}`, [upiUri])

  const openCheckout = async () => {
    const gatewayWindow = window.self !== window.top ? window.open('about:blank', '_blank', 'noopener,noreferrer') : null
    const minimum = Number(settings.minDeposit || 100)
    if (!Number.isInteger(numericAmount) || numericAmount < minimum) return setMessage(`Minimum deposit is ₹${minimum.toLocaleString('en-IN')}.`)
    setMessage('Connecting secure payment gateway…')
    const response = await fetch('/api/payments/payin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: numericAmount }) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return setMessage(data.error || 'Unable to start payment.')
    setCheckout({ orderId: data.orderId, amount: data.amount, upi: settings.upi, qrUrl, paymentUrl: data.paymentUrl, status: data.status })
    setMessage('Secure payment opened. Complete payment in the gateway; wallet credit is automatic after confirmation.')
    if (gatewayWindow) gatewayWindow.location.href = data.paymentUrl
    else window.location.assign(data.paymentUrl)
  }

  const submitUtr = async () => {
    if (!checkout || utr.trim().length < 6) return setMessage('Enter a valid UTR / reference number.')
    setSubmitting(true)
    try {
      const response = await fetch('/api/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: checkout.orderId, amount: checkout.amount, utr: utr.trim(), gateway: 'UPI' }) })
      const data = await response.json()
      setMessage(response.ok ? `Deposit ${data.orderId} submitted. Admin approval is pending.` : data.error || 'Unable to submit deposit.')
    } catch { setMessage('Unable to submit deposit. Please try again.') } finally { setSubmitting(false) }
  }

  const copyUpi = async () => { await navigator.clipboard?.writeText(settings.upi); setMessage('UPI ID copied.') }

  return <MobileShell title="Deposit Wallet">
    <SectionCard title="Enter deposit amount"><div className="flex items-center rounded-xl border border-slate-200 px-4"><span className="font-black text-[#ef6b12]">₹</span><input value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className="h-12 w-full bg-transparent px-2 font-bold outline-none" aria-label="Deposit amount" /></div><div className="mt-3 rounded-2xl border border-orange-100 bg-gradient-to-br from-[#fff8f1] to-white p-3"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ef6b12]">Quick deposit</p><button onClick={() => setAmount(String(Math.floor((Math.random() * 4900 + 100) / 10) * 10))} className="rounded-full bg-[#181d1d] px-3 py-1.5 text-[10px] font-bold text-white">Random amount</button></div><div className="grid grid-cols-3 gap-2">{['100', '250', '500', '1000', '1500', '5000', '10000', '25000', '50000'].map((value) => <button key={value} onClick={() => setAmount(value)} className="rounded-xl border border-orange-100 bg-white px-2 py-2.5 text-xs font-bold text-[#ef6b12] shadow-sm">₹{Number(value).toLocaleString('en-IN')}</button>)}</div><p className="mt-2 text-[10px] text-slate-400">Choose any amount from ₹100 to ₹50,000.</p></div><button onClick={openCheckout} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ef6b12] font-bold text-white"><QrCode size={18} /> Proceed to payment</button></SectionCard>
    {checkout && <SectionCard title={`Pay ₹${checkout.amount.toLocaleString('en-IN')} to continue`}><div className="flex flex-col items-center rounded-2xl bg-[#fff8f2] p-4"><img src={checkout.qrUrl} alt={`UPI QR code for ₹${checkout.amount}`} className="h-56 w-56 rounded-xl bg-white p-2" />{checkout.paymentUrl && <a href={checkout.paymentUrl} target="_blank" rel="noreferrer" className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ef6b12] font-black text-white"><ExternalLink size={16} /> Open secure payment page</a>}<p className="mt-3 text-xs font-semibold text-slate-500">{checkout.paymentUrl ? 'Gateway payment · wallet auto-credit after success' : 'Admin-configured UPI'}</p><button onClick={copyUpi} className="mt-1 flex items-center gap-2 font-black text-[#ef6b12]">{checkout.upi}<Copy size={15} /></button><a href={upiUri} className="mt-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#ef6b12]"><ExternalLink size={14} /> Open UPI app</a></div>{!checkout.paymentUrl && settings.manualUpi && <div className="mt-4"><label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="utr">UTR / reference number</label><input id="utr" value={utr} onChange={(event) => setUtr(event.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24))} placeholder="Enter 6–24 digit UTR" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 font-semibold outline-none focus:border-[#ef6b12]" /><button disabled={submitting} onClick={submitUtr} className="mt-3 h-12 w-full rounded-xl bg-[#181d1d] font-bold text-white disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit for admin approval'}</button></div>}<div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700"><ShieldCheck size={16} /> Your deposit stays pending until an admin verifies the UTR.</div></SectionCard>}
    {message && <p className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm font-semibold text-slate-700"><CheckCircle2 size={16} className="text-[#ef6b12]" />{message}</p>}
  </MobileShell>
}
