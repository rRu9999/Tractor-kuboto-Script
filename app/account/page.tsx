import { CalendarCheck, ChevronRight, CreditCard, FileText, Gift, Headphones, Landmark, LockKeyhole, Plus, Tractor, WalletCards } from 'lucide-react'
import { MobileShell } from '@/components/mobile-shell'
import { getCurrentUser } from '@/lib/user-auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const groups = [
  { title: 'FINANCIAL', items: [['Recharge', 'Add funds to your wallet', '/recharge', Plus, ''], ['Recharge History', 'Add funds Record', '/records', WalletCards, ''], ['Withdraw', 'Transfer to bank account', '/withdraw', CreditCard, ''], ['Bank Account', 'Add or update bank details', '/bank-account', Landmark, '']] },
  { title: 'INVESTMENT', items: [['My Portfolio', 'Active investment plans', '/portfolio', Tractor, ''], ['Income Records', 'Daily profit history', '/income-records', FileText, ''], ['Gift Code', 'Redeem reward codes', '/gift-code', Gift, '']] },
  { title: 'SETTINGS', items: [['Change Password', 'Update login password', '/account?password=1', LockKeyhole, ''], ['About Us', 'Platform information', '/about', FileText, ''], ['Customer Support', '24/7 assistance', 'https://wa.me/910000000000', Headphones, '']] },
] as const

export default async function AccountPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/account')
  const mobile = user.mobile.length >= 5 ? `+91 ${user.mobile.slice(0, 3)}*****${user.mobile.slice(-2)}` : `+91 ${user.mobile}`
  const supportSetting = await prisma.setting.findUnique({ where: { key: 'whatsapp' } })
  const supportUrl = typeof supportSetting?.value === 'string' && supportSetting.value ? supportSetting.value : 'https://wa.me/910000000000'
  const groupsWithSupport = groups.map((group) => group.title === 'SETTINGS' ? { ...group, items: group.items.map((item) => item[0] === 'Customer Support' ? [item[0], item[1], supportUrl, item[3], item[4]] as const : item) } : group)
  return <MobileShell title="My Account">
    <section className="relative -mx-4 -mt-5 overflow-hidden bg-[#d98219] px-4 pb-4 pt-6 text-white">
      <div className="absolute inset-0 bg-[url('/tractor-hero.png')] bg-cover bg-center opacity-80" /><div className="absolute inset-0 bg-gradient-to-b from-[#0b2517]/65 via-[#7c4217]/35 to-[#de8018]/90" />
      <div className="relative"><div className="flex justify-between text-sm font-bold"><span>My Account</span><span>↪</span></div><div className="mt-5 text-center"><div className="mx-auto grid size-16 place-items-center rounded-full border-4 border-white/80 bg-white text-3xl font-black text-[#f07a12]">K</div><h2 className="mt-2 text-lg font-black">Kubota Invest User</h2><p className="text-xs text-white/90">{mobile}</p><span className="mt-1 inline-block rounded-full bg-black/20 px-3 py-1 text-[10px] font-bold">UID: {user.uid}</span></div><div className="mt-5 grid grid-cols-3 gap-2"><GlassMetric value={`₹${Number(user.walletBalance).toLocaleString('en-IN')}.00`} label="BALANCE"/><GlassMetric value="₹0" label="DEPOSITED"/><GlassMetric value="₹0" label="WITHDRAWN"/></div></div>
    </section>
    <div className="-mx-1 mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-white/70 bg-white/80 p-3 text-center shadow-sm backdrop-blur-md"><SummaryMetric value="₹0" label="TOTAL RECHARGE" icon={<FacetedDiamond />} /><SummaryMetric value="₹0" label="TOTAL WITHDRAW" icon={<CalendarCheck size={19} strokeWidth={1.8}/>} /></div>
    {groupsWithSupport.map(group => <section key={group.title} className="mt-5"><p className="mb-2 px-1 text-[11px] font-bold tracking-widest text-slate-400">{group.title}</p><div className="overflow-hidden rounded-2xl border border-white/80 bg-white/75 shadow-sm backdrop-blur-md">{group.items.map(([label, sub, href, Icon]) => <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className="flex items-center gap-3 border-b border-slate-100/80 px-4 py-3 last:border-0"><span className="grid size-8 place-items-center rounded-lg bg-[#fff3e3] text-[#ef7814]"><Icon size={16}/></span><span className="flex-1"><strong className="block text-sm font-bold">{label}</strong><small className="block text-[11px] text-slate-400">{sub}</small></span><ChevronRight size={16} className="text-slate-300"/></a>)}</div></section>)}
  </MobileShell>
}
function GlassMetric({ value, label }: { value: string; label: string }) { return <div className="rounded-xl border border-white/25 bg-black/15 px-1.5 py-2 backdrop-blur-sm"><p className="text-sm font-black">{value}</p><p className="mt-0.5 text-[8px] font-bold tracking-wide text-white/75">{label}</p></div> }
function FacetedDiamond() { return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 8.2 8.1 4h7.8L19 8.2 12 20 5 8.2Z" fill="#F59A23"/><path d="M5 8.2h14M8.1 4 12 8.2 15.9 4M8.1 4 12 20M15.9 4 12 20" stroke="#FFF2D8" strokeWidth="1.15" strokeLinejoin="round"/><path d="m12 2.4.45 1.05 1.05.45-1.05.45L12 5.4l-.45-1.05-1.05-.45 1.05-.45L12 2.4Z" fill="#F59A23"/></svg> }
function SummaryMetric({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) { return <div><div className="mb-1 flex justify-center text-[#ee8716]">{icon}</div><p className="text-base font-black text-slate-900">{value}</p><p className="mt-1 text-[9px] font-bold tracking-wide text-slate-400">{label}</p></div> }
