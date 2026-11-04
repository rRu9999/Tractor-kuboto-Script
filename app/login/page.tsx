'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#f47616] focus:ring-4 focus:ring-orange-100'

export default function LoginPage() {
  const router = useRouter()
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage(''); setLoading(true)
    const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetch('/api/auth/phone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'login', mobile: mobile.replace(/\D/g, '').slice(-10), password }), signal: controller.signal })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) return setMessage(data.error || 'Login failed. Please try again.')
      const next = new URLSearchParams(window.location.search).get('next') || '/'; router.replace(next)
    } catch (error) { setMessage(error instanceof DOMException && error.name === 'AbortError' ? 'Server took too long to respond. Please try again.' : 'Unable to connect. Please check your internet and try again.') } finally { window.clearTimeout(timeout); setLoading(false) }
  }
  return <main className="min-h-screen bg-[#f7f8fc] text-slate-900"><header className="flex items-center justify-between bg-white px-6 py-4 shadow-sm"><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-xl bg-[#f47616] text-2xl text-white">K</div><div className="leading-none"><p className="text-lg font-black tracking-[0.14em] text-[#f47616]">KUBOTA</p><p className="text-xl font-black tracking-wide text-[#17243a]">INVEST</p></div></div><span className="text-3xl font-bold text-slate-700">☰</span></header><section className="relative overflow-hidden bg-[#17251f] px-7 py-16"><div className="absolute inset-0 bg-[url('/investments/daily-tractor.jpg')] bg-cover bg-center opacity-60"/><div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent"/><div className="relative"><h1 className="text-4xl font-black tracking-tight text-white">Welcome <span className="text-[#ff7516]">back</span></h1><p className="mt-3 text-lg font-medium text-white/90">Continue with Kubota Invest</p><div className="mt-6 h-1.5 w-32 rounded-full bg-[#ff7516]"/></div></section><form onSubmit={submit} className="relative mx-5 -mt-7 rounded-[2rem] bg-white p-6 shadow-xl sm:mx-auto sm:max-w-lg"><p className="mb-5 text-center text-sm font-semibold text-slate-500">Login with your mobile number and password</p><input required inputMode="numeric" autoComplete="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="Mobile Number" className={inputClass}/><input required minLength={6} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className={`mt-3 ${inputClass}`}/>{message && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{message}</p>}<button type="submit" disabled={loading} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#ff7b0b] to-[#f05d0d] py-4 text-lg font-black text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Signing in…' : 'LOGIN'}</button><p className="mt-5 text-center font-medium text-slate-700">New customer? <Link className="font-bold text-[#f47616]" href="/register">Create account</Link></p></form><p className="mx-auto flex max-w-lg items-center justify-center gap-2 px-6 py-7 text-sm font-semibold text-slate-500">◆ Your details are protected</p></main>
}
