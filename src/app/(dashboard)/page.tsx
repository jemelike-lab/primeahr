import { createClient } from '@/lib/supabase/server'
import { Bell, Search, Plus, Inbox, ClipboardList, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { ApplicationsChart } from '@/components/dashboard/applications-chart'
import { DashboardCalendar, type CalEvent } from '@/components/dashboard/dashboard-calendar'

export const dynamic = 'force-dynamic'

const WK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const OFFER = new Set(['offer', 'offer_sent', 'offer_accepted', 'onboarding', 'hired'])

function dayKey(d: Date) { return d.toISOString().slice(0, 10) }
function initials(a?: string | null, b?: string | null) { return `${(a || '?')[0] || ''}${(b || '')[0] || ''}`.toUpperCase() }
function prettify(s?: string | null) { return (s || 'Role').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }
function relTime(iso?: string | null) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function statusPill(status?: string | null): { label: string; color: string; bg: string } {
  const s = (status || '').toLowerCase()
  if (OFFER.has(s)) return { label: 'Offer', color: '#1d4ed8', bg: '#e6edfd' }
  if (['submitted', 'review', 'screening', 'reviewing'].includes(s)) return { label: 'Review', color: '#a86a28', bg: '#fdeed9' }
  return { label: 'New', color: '#1d9e75', bg: '#e6f4ee' }
}

export default async function DashboardPage() {
  const s = await createClient()
  const { data: { user: authUser } } = await s.auth.getUser()
  const sixMoAgo = new Date(Date.now() - 186 * 86400000).toISOString()

  const [me, appRows, feed, roleTpls, onboard, emps, tasks, assignDue, appEvents, tokenRows] = await Promise.all([
    authUser ? s.from('employees').select('first_name,last_name').eq('auth_user_id', authUser.id).single() : Promise.resolve({ data: null } as any),
    s.from('applications').select('created_at,status').gte('created_at', sixMoAgo),
    s.from('applications').select('id,status,current_step,total_steps,role_slug,created_at,submitted_at,candidates(first_name,last_name,email),requisitions(title)').order('created_at', { ascending: false }).limit(6),
    s.from('role_templates').select('slug,display_name'),
    s.from('onboarding_assignments').select('id,status,progress_pct,target_completion_date,employees(first_name,last_name)').neq('status', 'completed').order('progress_pct', { ascending: true }).limit(6),
    s.from('employees').select('first_name,last_name,start_date').not('start_date', 'is', null),
    s.from('onboarding_tasks').select('title,due_date,is_completed').not('due_date', 'is', null).eq('is_completed', false),
    s.from('onboarding_assignments').select('target_completion_date,employees(first_name,last_name)').not('target_completion_date', 'is', null),
    s.from('application_events').select('event_type,created_at').ilike('event_type', '%interview%'),
    s.from('tokens').select('kind,expires_at,status').not('expires_at', 'is', null),
  ])

  const meName = me?.data ? `${me.data.first_name} ${me.data.last_name}` : (authUser?.email?.split('@')[0] || 'there')
  const meInitials = me?.data ? initials(me.data.first_name, me.data.last_name) : (authUser?.email?.[0]?.toUpperCase() || 'U')
  const greet = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  // ---- Chart series ----
  const apps = (appRows.data || []) as { created_at: string; status: string | null }[]
  const daily: Record<string, number> = {}
  const monthly: Record<string, number> = {}
  for (const a of apps) {
    const k = dayKey(new Date(a.created_at))
    daily[k] = (daily[k] || 0) + 1
    const mk = k.slice(0, 7)
    monthly[mk] = (monthly[mk] || 0) + 1
  }
  const now = new Date()
  const s7 = Array.from({ length: 7 }, (_, idx) => { const i = 6 - idx; const dt = new Date(now); dt.setUTCDate(now.getUTCDate() - i); return { label: WK[dt.getUTCDay()], count: daily[dayKey(dt)] || 0 } })
  const s30 = Array.from({ length: 30 }, (_, idx) => { const i = 29 - idx; const dt = new Date(now); dt.setUTCDate(now.getUTCDate() - i); return { label: `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`, count: daily[dayKey(dt)] || 0 } })
  const s6 = Array.from({ length: 6 }, (_, idx) => { const i = 5 - idx; const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)); const mk = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`; return { label: MON[dt.getUTCMonth()], count: monthly[mk] || 0 } })
  const cut7 = Date.now() - 7 * 86400000, cut30 = Date.now() - 30 * 86400000
  const within = (cut: number) => apps.filter((a) => new Date(a.created_at).getTime() >= cut)
  const offersIn = (cut: number) => within(cut).filter((a) => OFFER.has((a.status || '').toLowerCase())).length
  const series = { '7d': s7, '30d': s30, '6mo': s6 }
  const applications = { '7d': within(cut7).length, '30d': within(cut30).length, '6mo': apps.length }
  const movedToOffer = { '7d': offersIn(cut7), '30d': offersIn(cut30), '6mo': apps.filter((a) => OFFER.has((a.status || '').toLowerCase())).length }

  // ---- Feed ----
  const roleMap: Record<string, string> = {}
  for (const r of (roleTpls.data || []) as any[]) roleMap[r.slug] = r.display_name
  const feedRows = ((feed.data || []) as any[]).map((a) => {
    const c = a.candidates || {}
    const role = roleMap[a.role_slug] || a.requisitions?.title || prettify(a.role_slug)
    return { id: a.id, name: `${c.first_name || 'Unknown'} ${c.last_name || ''}`.trim(), email: c.email || '', role, pill: statusPill(a.status), when: relTime(a.created_at), ini: initials(c.first_name, c.last_name) }
  })

  // ---- Onboarding bars ----
  const bars = ((onboard.data || []) as any[]).map((o) => {
    const e = o.employees || {}
    const pct = Math.round(Number(o.progress_pct) || 0)
    const overdue = o.status === 'overdue' || (o.target_completion_date && new Date(o.target_completion_date) < new Date() && pct < 100)
    return { id: o.id, name: `${e.first_name || 'New hire'} ${e.last_name || ''}`.trim(), pct, overdue, due: o.target_completion_date }
  })

  // ---- Calendar events ----
  const events: CalEvent[] = []
  const inMonth = (iso: string) => iso?.slice(0, 10)
  for (const e of (emps.data || []) as any[]) if (e.start_date) events.push({ date: inMonth(e.start_date), type: 'start', label: `${e.first_name} starts` })
  for (const t of (tasks.data || []) as any[]) if (t.due_date) events.push({ date: inMonth(t.due_date), type: 'deadline', label: t.title || 'Task due' })
  for (const a of (assignDue.data || []) as any[]) if (a.target_completion_date) events.push({ date: inMonth(a.target_completion_date), type: 'deadline', label: `${a.employees?.first_name || 'Onboarding'} due` })
  for (const ev of (appEvents.data || []) as any[]) if (ev.created_at) events.push({ date: inMonth(ev.created_at), type: 'interview', label: 'Interview' })
  for (const tk of (tokenRows.data || []) as any[]) if (tk.expires_at && tk.status === 'active') events.push({ date: inMonth(tk.expires_at), type: 'deadline', label: `${tk.kind === 'onboarding' ? 'Onboarding' : 'Apply'} link expires` })

  const card: React.CSSProperties = { background: '#fbf9f4', borderRadius: 12, border: '1px solid #e4ddcd', padding: 24 }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f1ea', padding: '24px 28px 48px' }}>
      {/* ===== Header ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#2c2c2a', letterSpacing: '-0.025em', margin: 0 }}>{greet}, {meName.split(' ')[0]}</h1>
          <p style={{ fontSize: 13, color: '#8a8475', marginTop: 3 }}>Here&rsquo;s the hiring picture at Beatrice Loving Heart today</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fbf9f4', border: '1px solid #e4ddcd', borderRadius: 999, padding: '8px 14px', minWidth: 220 }}>
            <Search style={{ width: 15, height: 15, color: '#a39d8e' }} />
            <input placeholder="Search PrimeaHR" style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#2c2c2a', width: '100%', fontFamily: 'inherit' }} />
          </div>
          <button aria-label="Notifications" style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid #e4ddcd', background: '#fbf9f4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8475' }}>
            <Bell style={{ width: 17, height: 17 }} />
          </button>
          <Link href="/recruiting/new" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e08a3c', color: '#fff', fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 2px 8px rgba(224,138,60,0.35)' }}>
            <Plus style={{ width: 16, height: 16 }} /> New
          </Link>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1c2b2a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{meInitials}</div>
        </div>
      </div>

      {/* ===== Top: Chart + Onboarding ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.45fr) minmax(280px,1fr)', gap: 18, marginTop: 20 }}>
        <ApplicationsChart series={series} applications={applications} movedToOffer={movedToOffer} />
        {/* Onboarding progress */}
        <div style={{ ...card, animation: 'fadeUp 0.4s ease-out 0.05s both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: '#e6f4ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ClipboardList style={{ width: 15, height: 15, color: '#1d9e75' }} /></div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#2c2c2a' }}>Onboarding progress</span>
            </div>
            <Link href="/onboarding" style={{ fontSize: 12, fontWeight: 700, color: '#e08a3c', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>All<ChevronRight style={{ width: 14, height: 14 }} /></Link>
          </div>
          {bars.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#f4f1ea', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}><ClipboardList style={{ width: 22, height: 22, color: '#bcb5a4' }} /></div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#8a8475' }}>No active onboarding</p>
              <p style={{ fontSize: 11, color: '#bcb5a4', marginTop: 2 }}>New hires appear here once an offer is accepted</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {bars.map((b) => (
                <div key={b.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a' }}>{b.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: b.overdue ? '#d85a30' : '#1d9e75' }}>{b.pct}%{b.overdue ? ' · stalling' : ''}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 6, background: '#efe9db', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 6, width: `${b.pct}%`, background: b.overdue ? '#d85a30' : '#1d9e75', animation: 'fillBar 1s ease-out 0.3s both' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Bottom: Applicants + Calendar ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.45fr) minmax(280px,1fr)', gap: 18, marginTop: 18 }}>
        {/* New applicants feed */}
        <div style={{ ...card, animation: 'fadeUp 0.4s ease-out 0.1s both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: '#fdeed9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Inbox style={{ width: 15, height: 15, color: '#e08a3c' }} /></div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#2c2c2a' }}>New applicants</span>
            </div>
            <Link href="/recruiting" style={{ fontSize: 12, fontWeight: 700, color: '#e08a3c', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>Pipeline<ChevronRight style={{ width: 14, height: 14 }} /></Link>
          </div>
          {feedRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#f4f1ea', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}><Inbox style={{ width: 22, height: 22, color: '#bcb5a4' }} /></div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#8a8475' }}>No applications yet</p>
              <p style={{ fontSize: 11, color: '#bcb5a4', marginTop: 2 }}>Share your <span style={{ color: '#e08a3c', fontWeight: 600 }}>/apply</span> links on Indeed and primeahr.com</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {feedRows.map((r, i) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid #efe9db' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#1c2b2a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{r.ini}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#2c2c2a' }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: '#8a8475', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.role}{r.email ? ` · ${r.email}` : ''}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: r.pill.bg, color: r.pill.color, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{r.pill.label}</span>
                  <span style={{ fontSize: 11, color: '#a39d8e', flexShrink: 0, width: 56, textAlign: 'right' }}>{r.when}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <DashboardCalendar events={events} />
      </div>
    </div>
  )
}
