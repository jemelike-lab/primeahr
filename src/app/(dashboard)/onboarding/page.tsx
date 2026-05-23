'use client'
import{useState,useEffect}from'react'
import{createClient}from'@/lib/supabase/client'
import{ClipboardList,ChevronRight,Search,RefreshCw,CheckCircle,Clock,AlertCircle,XCircle}from'lucide-react'
import Link from'next/link'
const REQ=['w4','mw507','ssn_card','drivers_license','diploma','cpr_cert','tb_test','hipaa','handbook','background_consent','personal_data','payroll_schedule','emergency_contact','background_re']
export default function OnboardingPage(){
  const[emps,setEmps]=useState<any[]>([])
  const[docs,setDocs]=useState<any[]>([])
  const[loading,setLoading]=useState(true)
  const[search,setSearch]=useState('')
  const supabase=createClient()
  useEffect(()=>{load()},[]) 
  async function load(){
    const[{data:e},{data:d}]=await Promise.all([
      supabase.from('employees').select('id,first_name,last_name,role_id,roles(title),employment_status,is_active,created_at').eq('is_active',true).order('created_at',{ascending:false}),
      supabase.from('employee_documents').select('employee_id,name,status')
    ])
    setEmps(e||[]);setDocs(d||[]);setLoading(false)
  }
  function stats(id:string){
    const d=docs.filter(x=>x.employee_id===id)
    const approved=REQ.filter(k=>d.find((x:any)=>x.name===k&&x.status==='approved')).length
    const uploaded=REQ.filter(k=>d.find((x:any)=>x.name===k&&x.status==='uploaded')).length
    const rejected=REQ.filter(k=>d.find((x:any)=>x.name===k&&x.status==='rejected')).length
    const pct=Math.round(approved/REQ.length*100)
    return{approved,uploaded,rejected,pct,total:REQ.length}
  }
  const filtered=emps.filter(e=>(e.first_name+' '+e.last_name).toLowerCase().includes(search.toLowerCase()))
  const totals={all:emps.length,done:emps.filter(e=>stats(e.id).pct===100).length,review:emps.filter(e=>stats(e.id).uploaded>0).length,none:emps.filter(e=>stats(e.id).approved===0&&stats(e.id).uploaded===0).length}
  if(loading)return(<div className="flex h-64 items-center justify-center"><RefreshCw className="w-6 h-6 text-emerald-500 animate-spin"/></div>)
  return(
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-semibold text-slate-900">Onboarding</h1><p className="text-sm text-slate-500 mt-0.5">Track document completion for all employees</p></div>
        <Link href="/documents" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700">
          <ClipboardList className="w-4 h-4"/>Document Vault
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{l:'Total',v:totals.all,c:'text-slate-700',bg:'bg-white',b:'border-slate-200'},{l:'Fully Onboarded',v:totals.done,c:'text-emerald-700',bg:'bg-emerald-50',b:'border-emerald-200'},{l:'Pending Review',v:totals.review,c:'text-blue-700',bg:'bg-blue-50',b:'border-blue-200'},{l:'Not Started',v:totals.none,c:'text-amber-700',bg:'bg-amber-50',b:'border-amber-200'}].map(s=>(
          <div key={s.l} className={`${s.bg} border ${s.b} rounded-xl p-4`}><div className={`text-3xl font-bold ${s.c}`}>{s.v}</div><div className="text-xs text-slate-500 mt-1">{s.l}</div></div>
        ))}
      </div>
      <div className="relative mb-4"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employees..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/></div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-200 bg-slate-50">{['Employee','Role','Progress','Status',''].map(h=>(<th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>))}</tr></thead>
          <tbody>
            {filtered.map((emp,i)=>{
              const s=stats(emp.id)
              const label=s.pct===100?'Complete':s.uploaded>0?'Pending Review':s.approved>0?'In Progress':'Not Started'
              const color=s.pct===100?'text-emerald-600 bg-emerald-50 border-emerald-200':s.rejected>0?'text-red-600 bg-red-50 border-red-200':s.uploaded>0?'text-blue-600 bg-blue-50 border-blue-200':s.approved>0?'text-amber-600 bg-amber-50 border-amber-200':'text-slate-500 bg-slate-50 border-slate-200'
              return(
                <tr key={emp.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${i%2===0?'':'bg-slate-50/20'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">{emp.first_name[0]}{emp.last_name[0]}</div>
                      <div><div className="text-sm font-medium text-slate-900">{emp.first_name} {emp.last_name}</div><div className="text-xs text-slate-400">{new Date(emp.created_at).toLocaleDateString()}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{emp.roles?.title||'—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-28 bg-slate-200 rounded-full h-2"><div className={`h-2 rounded-full ${s.pct===100?'bg-emerald-500':s.rejected>0?'bg-red-400':'bg-emerald-400'}`} style={{width:s.pct+'%'}}/></div>
                      <span className="text-xs text-slate-500 tabular-nums">{s.approved}/{s.total}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${color}`}>{label}</span></td>
                  <td className="px-4 py-3 text-right"><Link href={`/documents?emp=${emp.id}`} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5 justify-end">Review<ChevronRight className="w-3 h-3"/></Link></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length===0&&<div className="py-12 text-center text-slate-400">No employees found</div>}
      </div>
    </div>
  )
}
