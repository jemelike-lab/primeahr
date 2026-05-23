import { createClient } from '@/lib/supabase/server'
import { Users, Briefcase, FileCheck, AlertTriangle, Clock, TrendingUp, ChevronRight, Shield, ClipboardList, ArrowUpRight, CalendarClock, Bell, Activity } from 'lucide-react'
import Link from 'next/link'

const DOC_KEYS = ['w4','mw507','ssn_card','drivers_license','diploma','cpr_cert','tb_test','hipaa','handbook','background_consent','personal_data','payroll_schedule','emergency_contact','background_re']

function daysUntil(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000*60*60*24))
}

export default async function DashboardPage() {
  const s = await createClient()
  const [{data:emps},{data:depts},{data:roles},{data:docs},{data:reqs},{data:cands}] = await Promise.all([
    s.from('employees').select('id,first_name,last_name,department_id,is_active,nursing_license_expiry,cpr_cert_expiry,tb_test_expiry,hipaa_training_expiry,background_check_status,created_at').eq('is_active',true),
    s.from('departments').select('id',{count:'exact',head:true}).eq('is_active',true),
    s.from('roles').select('id',{count:'exact',head:true}).eq('is_active',true),
    s.from('employee_documents').select('employee_id,name,status'),
    s.from('requisitions').select('id,title,status,department_id,departments(name),number_of_openings,positions_filled').eq('status','open'),
    s.from('candidates').select('id,first_name,last_name,stage,applied_at,requisitions(title)').order('applied_at',{ascending:false}).limit(5),
  ])

  const empCount = emps?.length || 0
  const deptCount = depts?.length || 0
  const roleCount = roles?.length || 0
  const openReqs = reqs?.length || 0

  // Onboarding %
  const fullyOnboarded = (emps||[]).filter(e => {
    const d = (docs||[]).filter(x => x.employee_id === e.id)
    return DOC_KEYS.every(k => d.find((x:any) => x.name === k && x.status === 'approved'))
  }).length
  const onboardPct = empCount > 0 ? Math.round(fullyOnboarded / empCount * 100) : 0

  // Compliance alerts
  const credAlerts = (emps||[]).flatMap(e => [
    {emp:e, type:'Nursing License', expiry:e.nursing_license_expiry},
    {emp:e, type:'CPR Cert', expiry:e.cpr_cert_expiry},
    {emp:e, type:'TB Test', expiry:e.tb_test_expiry},
    {emp:e, type:'HIPAA', expiry:e.hipaa_training_expiry},
  ]).filter(r => r.expiry && daysUntil(r.expiry) !== null && daysUntil(r.expiry)! <= 90)
    .sort((a,b) => (daysUntil(a.expiry)||999) - (daysUntil(b.expiry)||999))
    .slice(0,5)

  // Recent hires (last 5 employees by created_at)
  const recentHires = [...(emps||[])].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0,4)

  // Background check stats
  const bgCleared = (emps||[]).filter(e => e.background_check_status === 'cleared').length
  const bgPending = (emps||[]).filter(e => !e.background_check_status || e.background_check_status === 'pending').length

  const stats = [
    { label: 'Active Employees', value: empCount, sub: deptCount + ' departments', icon: Users, gradient: 'grad-emerald', trend: '+3 this month' },
    { label: 'Onboarding Rate', value: onboardPct + '%', sub: fullyOnboarded + ' of ' + empCount + ' complete', icon: ClipboardList, gradient: 'grad-blue', trend: 'Target: 100%' },
    { label: 'Open Requisitions', value: openReqs, sub: (cands?.length||0) + ' candidates active', icon: Briefcase, gradient: 'grad-violet', trend: 'Hiring pipeline' },
    { label: 'Compliance Score', value: credAlerts.length === 0 ? '100%' : (100 - credAlerts.length * 5) + '%', sub: credAlerts.length + ' alerts active', icon: Shield, gradient: credAlerts.length > 0 ? 'grad-amber' : 'grad-emerald', trend: credAlerts.length > 0 ? 'Needs attention' : 'All clear' },
  ]

  const circumference = 2 * Math.PI * 45
  const compliancePct = credAlerts.length === 0 ? 100 : Math.max(0, 100 - credAlerts.length * 5)
  const dashOffset = circumference - (compliancePct / 100) * circumference

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-8 anim-fade-up">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome to PrimeaHR — your HR command center</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((s, i) => (
          <div key={s.label} className={`stat-card rounded-2xl p-5 text-white relative overflow-hidden ${s.gradient} anim-fade-up-${i+1}`}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -mr-8 -mt-8" />
            <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 -ml-6 -mb-6" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                  <s.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">{s.trend}</span>
              </div>
              <div className="text-3xl font-extrabold tracking-tight">{s.value}</div>
              <div className="text-sm font-medium text-white/70 mt-1">{s.label}</div>
              <div className="text-xs text-white/50 mt-0.5">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Compliance Ring + Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 anim-fade-up-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500"/>Compliance Overview</h2>
            <Link href="/compliance" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5">View All<ChevronRight className="w-3 h-3"/></Link>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="progress-ring w-28 h-28" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="45" stroke={compliancePct >= 80 ? '#10b981' : compliancePct >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} style={{animation:'ringFill 1.5s ease-out'}} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-extrabold ${compliancePct >= 80 ? 'text-emerald-600' : compliancePct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{compliancePct}%</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">Score</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-500">BG Cleared</span><span className="font-bold text-emerald-600">{bgCleared}</span></div>
              <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full anim-progress" style={{width: empCount > 0 ? (bgCleared/empCount*100)+'%' : '0%'}} /></div>
              <div className="flex items-center justify-between text-sm mt-2"><span className="text-slate-500">BG Pending</span><span className="font-bold text-amber-600">{bgPending}</span></div>
              <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-amber-400 h-1.5 rounded-full anim-progress" style={{width: empCount > 0 ? (bgPending/empCount*100)+'%' : '0%'}} /></div>
            </div>
          </div>
        </div>

        {/* Upcoming Expirations */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 anim-fade-up-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500"/>Expiring Credentials</h2>
          </div>
          {credAlerts.length === 0 ? (
            <div className="py-6 text-center"><div className="text-3xl mb-2">✅</div><p className="text-sm text-slate-500">All credentials current</p></div>
          ) : (
            <div className="space-y-3">
              {credAlerts.map((a, i) => {
                const days = daysUntil(a.expiry)
                const expired = days !== null && days < 0
                return (
                  <div key={a.emp.id + a.type + i} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${expired ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                      {a.emp.first_name[0]}{a.emp.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{a.emp.first_name} {a.emp.last_name}</div>
                      <div className="text-[10px] text-slate-400">{a.type}</div>
                    </div>
                    <div className={`text-xs font-bold ${expired ? 'text-red-600' : days !== null && days <= 30 ? 'text-red-500' : 'text-amber-500'}`}>
                      {expired ? Math.abs(days!)+'d overdue' : days+'d left'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Open Reqs */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 anim-fade-up-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Briefcase className="w-4 h-4 text-violet-500"/>Open Positions</h2>
            <Link href="/recruiting" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5">View All<ChevronRight className="w-3 h-3"/></Link>
          </div>
          {!reqs || reqs.length === 0 ? (
            <div className="py-6 text-center"><p className="text-sm text-slate-400">No open requisitions</p><Link href="/recruiting/new" className="text-xs text-emerald-600 font-semibold mt-2 inline-block">Create one →</Link></div>
          ) : (
            <div className="space-y-3">
              {(reqs||[]).slice(0,4).map(r => (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center"><Briefcase className="w-4 h-4 text-violet-500"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">{r.title}</div>
                    <div className="text-[10px] text-slate-400">{(r as any).departments?.name || 'No dept'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-violet-600">{r.positions_filled}/{r.number_of_openings}</div>
                    <div className="text-[10px] text-slate-400">filled</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Candidates */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 anim-fade-up-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500"/>Recent Candidates</h2>
            <Link href="/recruiting" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5">Pipeline<ChevronRight className="w-3 h-3"/></Link>
          </div>
          {!cands || cands.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No candidates yet</p>
          ) : (
            <div className="space-y-2">
              {cands.map(c => {
                const stageColor = c.stage==='new'?'bg-slate-100 text-slate-600':c.stage==='screening'?'bg-blue-100 text-blue-600':c.stage==='interviewing'?'bg-violet-100 text-violet-600':c.stage==='offer'?'bg-amber-100 text-amber-700':c.stage==='hired'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-600'
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">{c.first_name[0]}{c.last_name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800">{c.first_name} {c.last_name}</div>
                      <div className="text-[10px] text-slate-400">{(c as any).requisitions?.title || 'No position'}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stageColor}`}>{c.stage}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 anim-fade-up-6">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-emerald-500"/>Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {label:'New Requisition',href:'/recruiting/new',icon:Briefcase,color:'bg-violet-50 text-violet-600 hover:bg-violet-100 border-violet-200'},
              {label:'Document Vault',href:'/documents',icon:FileCheck,color:'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200'},
              {label:'Create Offer',href:'/offers/new',icon:FileCheck,color:'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'},
              {label:'Compliance',href:'/compliance',icon:Shield,color:'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200'},
              {label:'Onboarding',href:'/onboarding',icon:ClipboardList,color:'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200'},
              {label:'Analytics',href:'/analytics',icon:TrendingUp,color:'bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border-cyan-200'},
            ].map(a => (
              <Link key={a.label} href={a.href} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm ${a.color}`}>
                <a.icon className="w-4 h-4" />
                <span className="text-xs font-semibold">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
