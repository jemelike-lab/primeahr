import { validateToken } from '@/lib/tokens'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { CheckCircle2, Circle, Calendar, User, Mail, FileText, Sparkles, AlertCircle } from 'lucide-react'
import { DocumentsPanel } from './_components/DocumentsPanel'
import { getFormCodeForDocName } from '@/lib/forms/registry'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ token: string }> }

const BLH_DEFAULT_DOCS = [
  { name: 'W-4 (Federal tax)',           category: 'tax' },
  { name: 'Maryland MW-507 (State tax)', category: 'tax' },
  { name: 'Social Security card (copy)', category: 'identity' },
  { name: "Driver's license (copy)",     category: 'identity' },
  { name: "Bachelor's diploma",          category: 'credential' },
  { name: 'College transcript',          category: 'credential' },
  { name: 'Auto insurance proof',        category: 'employment' },
  { name: 'Direct deposit authorization', category: 'employment' },
  { name: 'Emergency contact form',      category: 'employment' },
  { name: 'HIPAA acknowledgment',        category: 'compliance' },
]

function relStart(date: string | null): string {
  if (!date) return 'TBD'
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 30) return `In ${days} days`
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

export default async function WelcomeTokenPage({ params }: PageProps) {
  const { token } = await params
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ua = hdrs.get('user-agent') ?? undefined
  const tokenRow = await validateToken(token, 'onboarding', ip, ua)
  if (!tokenRow || !tokenRow.employee_id) notFound()

  const supabase = createAdminClient()
  const { data: emp } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, start_date, hire_date, role_id, department_id, supervisor_id')
    .eq('id', tokenRow.employee_id)
    .single()
  if (!emp) notFound()

  const [{ data: role }, { data: dept }, { data: supervisor }, { data: assignment }, { data: docs }] = await Promise.all([
    emp.role_id ? supabase.from('roles').select('title').eq('id', emp.role_id).maybeSingle() : Promise.resolve({ data: null } as any),
    emp.department_id ? supabase.from('departments').select('name').eq('id', emp.department_id).maybeSingle() : Promise.resolve({ data: null } as any),
    emp.supervisor_id ? supabase.from('employees').select('first_name,last_name,email').eq('id', emp.supervisor_id).maybeSingle() : Promise.resolve({ data: null } as any),
    supabase.from('onboarding_assignments').select('id, status, progress_pct, total_documents, completed_documents, target_completion_date, coordinator_id, manager_id').eq('employee_id', emp.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('employee_documents').select('id, name, category, status, uploaded_at, rejection_reason').eq('employee_id', emp.id),
  ])

  const tasks = assignment
    ? (await supabase.from('onboarding_tasks').select('id, title, description, is_completed, due_date, assignee_role, sort_order').eq('assignment_id', assignment.id).order('sort_order', { ascending: true })).data ?? []
    : []
  const newHireTasks = tasks.filter((t: any) => !t.assignee_role || t.assignee_role === 'new_hire' || t.assignee_role === 'employee')

  let coordinator: any = null
  let manager: any = null
  if (assignment?.coordinator_id) coordinator = (await supabase.from('employees').select('first_name,last_name,email').eq('id', assignment.coordinator_id).maybeSingle()).data
  if (assignment?.manager_id) manager = (await supabase.from('employees').select('first_name,last_name,email').eq('id', assignment.manager_id).maybeSingle()).data

  const progress = assignment ? Math.round(Number(assignment.progress_pct) || 0) : 0
  const circ = 2 * Math.PI * 56
  const dashOff = circ - (progress / 100) * circ
  const ringColor = progress >= 80 ? '#10b981' : progress >= 40 ? '#14b8a6' : '#0d9488'

  const docMap = new Map<string, any>()
  for (const d of (docs ?? []) as any[]) docMap.set(d.name.toLowerCase(), d)
  const docList = BLH_DEFAULT_DOCS.map((d) => {
    const real = docMap.get(d.name.toLowerCase())
    const formCode = getFormCodeForDocName(d.name)
    return {
      id: real?.id ?? null,
      name: d.name,
      category: d.category,
      status: real?.status ?? 'pending',
      uploaded_at: real?.uploaded_at ?? null,
      rejection_reason: real?.rejection_reason ?? null,
      form_code: formCode,
    }
  })
  const realExtra = (docs ?? []).filter((d: any) => !BLH_DEFAULT_DOCS.find((x) => x.name.toLowerCase() === d.name.toLowerCase()))
  for (const r of realExtra as any[]) {
    docList.push({
      id: r.id,
      name: r.name,
      category: r.category || 'upload_required',
      status: r.status,
      uploaded_at: r.uploaded_at ?? null,
      rejection_reason: r.rejection_reason ?? null,
      form_code: getFormCodeForDocName(r.name),
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 sm:py-14">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 rounded-3xl p-8 sm:p-10 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />Welcome to Beatrice Loving Heart
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">You&apos;re in, {emp.first_name}.</h1>
            <p className="text-emerald-50 text-lg max-w-xl leading-relaxed">
              We&apos;re thrilled to have you joining the team{role?.title ? <> as <strong>{role.title}</strong></> : ''}{dept?.name ? <> on the <strong>{dept.name}</strong> team</> : ''}. Here&apos;s everything you need to get set up.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 text-sm text-emerald-50/90">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />Start date: <strong className="text-white">{relStart(emp.start_date || emp.hire_date)}</strong></span>
              {assignment?.target_completion_date && <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />Onboarding due: <strong className="text-white">{new Date(assignment.target_completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong></span>}
            </div>
          </div>

          {/* Progress ring */}
          <div className="relative w-36 h-36 mx-auto md:mx-0 flex-shrink-0">
            <svg viewBox="0 0 144 144" className="w-full h-full -rotate-90">
              <circle cx="72" cy="72" r="56" stroke="rgba(255,255,255,0.18)" strokeWidth="10" fill="none" />
              <circle cx="72" cy="72" r="56" stroke="#fff" strokeWidth="10" fill="none" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={dashOff}
                style={{ animation: 'ringDraw 1.5s ease-out 0.4s both', filter: `drop-shadow(0 0 12px ${ringColor})` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{progress}%</span>
              <span className="text-xs text-emerald-100 font-semibold tracking-wider mt-0.5">COMPLETE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasks complete</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">{newHireTasks.filter((t: any) => t.is_completed).length}<span className="text-slate-300 text-xl"> / {newHireTasks.length || 0}</span></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Documents collected</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">{(docs ?? []).filter((d: any) => d.status === 'approved' || d.status === 'verified').length}<span className="text-slate-300 text-xl"> / {docList.length}</span></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</div>
          <div className="text-base font-bold text-slate-900 mt-1 capitalize">{assignment?.status?.replace(/_/g, ' ') ?? 'Just getting started'}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mt-6">
        {/* Tasks */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-emerald-700" /></div>
            <h2 className="text-base font-bold text-slate-900">Your onboarding tasks</h2>
          </div>
          {newHireTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm font-medium">Your tasks will appear here once HR sets up your onboarding packet.</p>
              <p className="text-xs mt-1">In the meantime, you can start gathering the documents listed →</p>
            </div>
          ) : (
            <div className="space-y-2">
              {newHireTasks.map((t: any) => {
                const done = t.is_completed
                return (
                  <div key={t.id} className={`flex items-start gap-3 p-3 rounded-xl ${done ? 'bg-emerald-50/50' : 'bg-slate-50'}`}>
                    {done ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${done ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{t.title}</div>
                      {t.description && <div className="text-xs text-slate-500 mt-0.5">{t.description}</div>}
                      {t.due_date && !done && <div className="text-xs text-amber-700 font-medium mt-1">Due {new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center"><FileText className="w-4 h-4 text-teal-700" /></div>
            <h2 className="text-base font-bold text-slate-900">Documents you&apos;ll need</h2>
          </div>
          <DocumentsPanel token={token} initialDocs={docList} />
        </div>
      </div>

      {/* Contact rail */}
      {(coordinator || manager || supervisor) && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center"><User className="w-4 h-4 text-violet-700" /></div>
            <h2 className="text-base font-bold text-slate-900">Your team</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {coordinator && <ContactCard role="Onboarding coordinator" person={coordinator} />}
            {manager && <ContactCard role="Manager" person={manager} />}
            {supervisor && <ContactCard role="Supervisor" person={supervisor} />}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center mt-8">
        Questions? Email <a href="mailto:hr@beatricelovingheart.com" className="text-emerald-700 font-medium hover:underline">hr@beatricelovingheart.com</a> · Your magic link expires {new Date(tokenRow.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  )
}

function ContactCard({ role, person }: { role: string; person: any }) {
  const initials = `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase()
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{initials}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500 font-medium">{role}</div>
        <div className="text-sm font-semibold text-slate-900 truncate">{person.first_name} {person.last_name}</div>
        {person.email && <a href={`mailto:${person.email}`} className="text-xs text-emerald-700 hover:underline flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{person.email}</a>}
      </div>
    </div>
  )
}
