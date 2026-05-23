'use client'
import{useState,useEffect}from'react'
import{createClient}from'@/lib/supabase/client'
import{BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,PieChart,Pie,Cell,LineChart,Line,Legend}from'recharts'
import{Users,ClipboardList,Briefcase,TrendingUp,RefreshCw,Download}from'lucide-react'

const STAGE_LABELS:Record<string,string>={new:'New',screening:'Screening',interviewing:'Interviewing',offer:'Offer',hired:'Hired',dispositioned:'Declined'}
const DOC_KEYS=['w4','mw507','ssn_card','drivers_license','diploma','cpr_cert','tb_test','hipaa','handbook','background_consent','personal_data','payroll_schedule','emergency_contact','background_re']
const PIE_COLORS=['#6ee7b7','#34d399','#6366f1','#f59e0b','#ef4444']

export default function AnalyticsPage(){
  const[loading,setLoading]=useState(true)
  const[emps,setEmps]=useState<any[]>([])
  const[docs,setDocs]=useState<any[]>([])
  const[cands,setCands]=useState<any[]>([])
  const[reqs,setReqs]=useState<any[]>([])
  const[depts,setDepts]=useState<any[]>([])
  const supabase=createClient()

  useEffect(()=>{load()},[]) 

  async function load(){
    const[{data:e},{data:d},{data:c},{data:r},{data:dep}]=await Promise.all([
      supabase.from('employees').select('id,first_name,last_name,department_id,employment_status,is_active,onboarding_status,created_at').eq('is_active',true),
      supabase.from('employee_documents').select('employee_id,name,status'),
      supabase.from('candidates').select('id,stage,applied_at,created_at'),
      supabase.from('requisitions').select('id,status,days_open,created_at,opened_at'),
      supabase.from('departments').select('id,name').eq('is_active',true)
    ])
    setEmps(e||[]);setDocs(d||[]);setCands(c||[]);setReqs(r||[]);setDepts(dep||[])
    setLoading(false)
  }

  // Compute KPIs
  const totalEmps=emps.length
  const fullyOnboarded=emps.filter(e=>{
    const d=docs.filter(x=>x.employee_id===e.id)
    return DOC_KEYS.every(k=>d.find((x:any)=>x.name===k&&x.status==='approved'))
  }).length
  const onboardingPct=totalEmps>0?Math.round(fullyOnboarded/totalEmps*100):0
  const openReqs=reqs.filter(r=>r.status==='open').length
  const activeCandsCount=cands.filter(c=>!['hired','dispositioned'].includes(c.stage)).length

  // Onboarding by dept
  const deptData=depts.map(dep=>{
    const depEmps=emps.filter(e=>e.department_id===dep.id)
    if(!depEmps.length)return null
    const complete=depEmps.filter(e=>{
      const d=docs.filter(x=>x.employee_id===e.id)
      return DOC_KEYS.every(k=>d.find((x:any)=>x.name===k&&x.status==='approved'))
    }).length
    const pct=Math.round(complete/depEmps.length*100)
    return{name:dep.name.replace('Department of ','').replace('Community ','').slice(0,20),pct,total:depEmps.length,complete}
  }).filter(Boolean).sort((a:any,b:any)=>b.pct-a.pct)

  // Recruiting funnel
  const stageData=['new','screening','interviewing','offer','hired','dispositioned'].map(s=>({name:STAGE_LABELS[s],value:cands.filter(c=>c.stage===s).length,key:s}))

  // Doc status distribution
  const allDocStatuses=docs.reduce((acc:any,d:any)=>{
    acc[d.status]=(acc[d.status]||0)+1;return acc
  },{pending:0,uploaded:0,approved:0,rejected:0})
  const docPieData=[
    {name:'Approved',value:allDocStatuses.approved||0},
    {name:'Under Review',value:allDocStatuses.uploaded||0},
    {name:'Pending',value:allDocStatuses.pending||0},
    {name:'Rejected',value:allDocStatuses.rejected||0},
  ].filter(d=>d.value>0)

  // Document heatmap (top 10 employees x 14 docs)
  const heatEmps=emps.slice(0,12)

  const kpis=[
    {label:'Total Employees',val:totalEmps,sub:'Active staff',icon:Users,color:'text-slate-700',bg:'bg-white'},
    {label:'Onboarding Complete',val:onboardingPct+'%',sub:`${fullyOnboarded} of ${totalEmps} fully onboarded`,icon:ClipboardList,color:'text-emerald-600',bg:'bg-emerald-50'},
    {label:'Open Requisitions',val:openReqs,sub:`${reqs.length} total reqs`,icon:Briefcase,color:'text-blue-600',bg:'bg-blue-50'},
    {label:'Active Candidates',val:activeCandsCount,sub:`${cands.length} total in pipeline`,icon:TrendingUp,color:'text-violet-600',bg:'bg-violet-50'},
  ]

  const docNames=['W-4','MW-507','SSN','DL','Diploma','CPR','TB','HIPAA','Handbook','BG Consent','Personal','Payroll','Emergency','BG RE']

  function docColor(empId:string,docKey:string){
    const d=docs.find((x:any)=>x.employee_id===empId&&x.name===docKey)
    if(!d)return'bg-slate-100 text-slate-300'
    if(d.status==='approved')return'bg-emerald-100 text-emerald-600'
    if(d.status==='uploaded')return'bg-blue-100 text-blue-500'
    if(d.status==='rejected')return'bg-red-100 text-red-500'
    return'bg-amber-50 text-amber-400'
  }

  if(loading)return(<div className="flex h-64 items-center justify-center"><RefreshCw className="w-6 h-6 text-emerald-500 animate-spin"/></div>)

  return(
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-semibold text-slate-900">Analytics</h1><p className="text-sm text-slate-500 mt-0.5">Real-time PrimeaHR overview</p></div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"><RefreshCw className="w-4 h-4"/>Refresh</button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpis.map(k=>(
          <div key={k.label} className={`${k.bg} border border-slate-200 rounded-2xl p-5`}>
            <div className="flex items-start justify-between">
              <div><div className={`text-3xl font-bold ${k.color}`}>{k.val}</div><div className="text-sm font-medium text-slate-700 mt-1">{k.label}</div><div className="text-xs text-slate-400 mt-0.5">{k.sub}</div></div>
              <k.icon className={`w-6 h-6 ${k.color} opacity-60`}/>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Onboarding by dept */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Onboarding Completion by Department</h2>
          {deptData.length>0?(
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} margin={{top:0,right:0,left:-20,bottom:40}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="name" tick={{fontSize:10}} angle={-35} textAnchor="end" interval={0}/>
                <YAxis tick={{fontSize:11}} domain={[0,100]} tickFormatter={v=>v+'%'}/>
                <Tooltip formatter={(v:any)=>v+'%'} labelStyle={{fontSize:12}}/>
                <Bar dataKey="pct" fill="#34d399" radius={[4,4,0,0]} name="Complete"/>
              </BarChart>
            </ResponsiveContainer>
          ):<div className="h-48 flex items-center justify-center text-slate-400 text-sm">No department data yet</div>}
        </div>

        {/* Recruiting funnel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Recruiting Pipeline</h2>
          {cands.length>0?(
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stageData} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="name" tick={{fontSize:11}}/>
                <YAxis tick={{fontSize:11}} allowDecimals={false}/>
                <Tooltip labelStyle={{fontSize:12}}/>
                <Bar dataKey="value" radius={[4,4,0,0]} name="Candidates">
                  {stageData.map((s,i)=>(<Cell key={s.key} fill={['#94a3b8','#60a5fa','#a78bfa','#fbbf24','#34d399','#f87171'][i]}/>))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ):<div className="h-48 flex items-center justify-center text-slate-400 text-sm">No candidates yet</div>}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Doc status pie */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Document Status Breakdown</h2>
          {docPieData.length>0?(
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={docPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {docPieData.map((_:any,i:number)=>(<Cell key={i} fill={PIE_COLORS[i]}/>))}
                  </Pie>
                  <Tooltip formatter={(v:any,n:any)=>[v,n]}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {docPieData.map((d:any,i:number)=>(
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <div className="w-2.5 h-2.5 rounded-full" style={{background:PIE_COLORS[i]}}/>{d.name}: {d.value}
                  </div>
                ))}
              </div>
            </>
          ):<div className="h-40 flex items-center justify-center text-slate-400 text-sm">No documents yet</div>}
        </div>

        {/* Open reqs by status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Requisition Summary</h2>
          <div className="grid grid-cols-3 gap-3">
            {[{k:'open',l:'Open',c:'text-emerald-600 bg-emerald-50 border-emerald-200'},{k:'draft',l:'Draft',c:'text-slate-500 bg-slate-50 border-slate-200'},{k:'on_hold',l:'On Hold',c:'text-orange-600 bg-orange-50 border-orange-200'},{k:'pending_approval',l:'Pending Approval',c:'text-amber-600 bg-amber-50 border-amber-200'},{k:'closed',l:'Closed',c:'text-slate-400 bg-slate-50 border-slate-200'},{k:'total',l:'Total Reqs',c:'text-slate-700 bg-white border-slate-200'}].map(s=>(
              <div key={s.k} className={`border rounded-xl p-3 ${s.c.split(' ').slice(1).join(' ')}`}>
                <div className={`text-2xl font-bold ${s.c.split(' ')[0]}`}>{s.k==='total'?reqs.length:reqs.filter(r=>r.status===s.k).length}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Document Heatmap */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Document Heatmap <span className="text-xs font-normal text-slate-400 ml-2">showing first {heatEmps.length} employees</span></h2>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="text-left pr-3 pb-2 text-slate-500 font-medium w-32">Employee</th>
                {docNames.map(n=>(<th key={n} className="pb-2 text-slate-400 font-medium px-1 text-center" style={{writingMode:'vertical-rl',transform:'rotate(180deg)',height:60,whiteSpace:'nowrap'}}>{n}</th>))}
              </tr>
            </thead>
            <tbody>
              {heatEmps.map(emp=>(
                <tr key={emp.id}>
                  <td className="pr-3 py-1 text-slate-700 font-medium truncate max-w-[120px]">
                    {emp.first_name||'?'} {emp.last_name||''}
                  </td>
                  {DOC_KEYS.map(k=>(
                    <td key={k} className="px-1 py-1">
                      <div className={`w-6 h-6 rounded text-center flex items-center justify-center text-[9px] font-bold ${docColor(emp.id,k)}`}>
                        {(()=>{const d=docs.find((x:any)=>x.employee_id===emp.id&&x.name===k);return d?d.status[0].toUpperCase():'—'})()}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            {[{c:'bg-emerald-100 text-emerald-600',l:'A = Approved'},{c:'bg-blue-100 text-blue-500',l:'U = Under Review'},{c:'bg-amber-50 text-amber-400',l:'P = Pending'},{c:'bg-red-100 text-red-500',l:'R = Rejected'},{c:'bg-slate-100 text-slate-300',l:'— = Not submitted'}].map(x=>(
              <div key={x.l} className="flex items-center gap-1.5"><div className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center ${x.c}`}>A</div>{x.l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
