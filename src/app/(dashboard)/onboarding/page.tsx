'use client'
import{useState,useEffect}from'react'
import{createClient}from'@/lib/supabase/client'
import{ClipboardList,UserPlus,CheckCircle2,Clock,AlertCircle,ChevronRight,Search,RefreshCw,Send}from'lucide-react'
import Link from'next/link'

const REQUIRED_DOCS=['w4','mw507','ssn_card','drivers_license','diploma','cpr_cert','tb_test','hipaa','handbook','background_consent','personal_data','payroll_schedule','emergency_contact','background_re']

export default function OnboardingPage(){
  const[employees,setEmployees]=useState<any[]>([])
  const[submissions,setSubmissions]=useState<any[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const supabase=createClient()

  useEffect(()=>{load()},[]) 

  async function load(){
    const[{data:emps},{data:subs}]=await Promise.all([
      supabase.from('employees').select('id,first_name,last_name,position,status,created_at,department_id').order('created_at',{ascending:false}),
      supabase.from('document_submissions').select('employee_id,document_type,status')
    ])
    setEmployees(emps||[])
    setSubmissions(subs||[])
    setLoading(false)
  }

  function getStats(empId:string){
    const subs=submissions.filter(s=>s.employee_id===empId)
    const verified=REQUIRED_DOCS.filter(d=>subs.find(s=>s.document_type===d&&s.status==='verified')).length
    const uploaded=REQUIRED_DOCS.filter(d=>subs.find(s=>s.document_type===d&&s.status==='uploaded')).length
    const rejected=REQUIRED_DOCS.filter(d=>subs.find(s=>s.document_type===d&&s.status==='rejected')).length
    const pending=REQUIRED_DOCS.length-verified-uploaded-rejected
    const pct=Math.round(verified/REQUIRED_DOCS.length*100)
    return{verified,uploaded,rejected,pending,pct,total:REQUIRED_DOCS.length}
  }

  const filtered=employees.filter(e=>(e.first_name+' '+e.last_name).toLowerCase().includes(search.toLowerCase()))
  const active=filtered.filter(e=>e.status==='active')
  const stats={total:employees.length,complete:employees.filter(e=>getStats(e.id).pct===100).length,pending:employees.filter(e=>getStats(e.id).uploaded>0).length,notStarted:employees.filter(e=>getStats(e.id).pct===0).length}

  if(loading)return(<div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 text-emerald-500 animate-spin"/></div>)

  return(
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Onboarding</h1>
          <p className="text-sm text-slate-500 mt-1">Track document completion for all employees</p>
        </div>
        <Link href="/documents" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
          <ClipboardList className="w-4 h-4"/>Document Vault
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{label:'Total Employees',val:stats.total,color:'text-slate-700',bg:'bg-slate-50',border:'border-slate-200'},
          {label:'Fully Onboarded',val:stats.complete,color:'text-emerald-700',bg:'bg-emerald-50',border:'border-emerald-200'},
          {label:'Docs Pending Review',val:stats.pending,color:'text-blue-700',bg:'bg-blue-50',border:'border-blue-200'},
          {label:'Not Started',val:stats.notStarted,color:'text-amber-700',bg:'bg-amber-50',border:'border-amber-200'},
        ].map(s=>(
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employees..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
      </div>

      {/* Employee table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Position</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {active.map((emp,i)=>{
              const s=getStats(emp.id)
              const statusLabel=s.pct===100?'Complete':s.uploaded>0?'Pending Review':s.pct>0?'In Progress':'Not Started'
              const statusColor=s.pct===100?'text-emerald-600 bg-emerald-50 border-emerald-200':s.rejected>0?'text-red-600 bg-red-50 border-red-200':s.uploaded>0?'text-blue-600 bg-blue-50 border-blue-200':s.pct>0?'text-amber-600 bg-amber-50 border-amber-200':'text-slate-500 bg-slate-50 border-slate-200'
              return(
                <tr key={emp.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i%2===0?'':'bg-slate-50/30'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-semibold">{emp.first_name[0]}{emp.last_name[0]}</div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{emp.first_name} {emp.last_name}</div>
                        <div className="text-xs text-slate-400">Added {new Date(emp.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{emp.position||'—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${s.pct===100?'bg-emerald-500':s.rejected>0?'bg-red-400':'bg-emerald-400'}`} style={{width:s.pct+'%'}}/>
                      </div>
                      <span className="text-xs font-medium text-slate-600 w-10 text-right">{s.verified}/{s.total}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium border px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/documents?emp=${emp.id}`} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                      Review<ChevronRight className="w-3 h-3"/>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {active.length===0&&<div className="py-12 text-center text-slate-400 text-sm">No employees found</div>}
      </div>
    </div>
  )
}
