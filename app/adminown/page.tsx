'use client'

import { FormEvent, useState } from 'react'
import AdminPortal from '../admin-portal/page'

export default function AdminOwnPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (authenticated) return <AdminPortal />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const response = await fetch('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, password }) })
    if (response.ok) { setAuthenticated(true); setError('') } else setError((await response.json()).error || 'Invalid admin credentials.')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#171a1c] p-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
        <div className="mb-7 text-center">
          <p className="text-[10px] font-bold tracking-[.28em] text-[#ff7411]">KUBOTA</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Admin Control Room</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage the platform</p>
        </div>
        <label className="block text-sm font-bold text-slate-700">Admin ID<input value={id} onChange={(event) => setId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff7411]" placeholder="admin@123" autoComplete="username" /></label>
        <label className="mt-4 block text-sm font-bold text-slate-700">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#ff7411]" placeholder="••••••••" autoComplete="current-password" /></label>
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button type="submit" className="mt-6 w-full rounded-xl bg-[#ff7411] px-4 py-3 font-bold text-white shadow-lg shadow-orange-200">Sign in</button>
        <p className="mt-5 text-center text-xs text-slate-400">Admin access only</p>
      </form>
    </main>
  )
}
