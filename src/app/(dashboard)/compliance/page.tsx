'use client'
import{useState,useEffect}from'react'
import{createClient}from'@/lib/supabase/client'
import{Shield,AlertTriangle,CheckCircle2,XCircle,Clock,RefreshCw,ChevronRight,FileWarning}from'lucide-react'
import Link from'next/link'

function daysUntil(d:string|null):number|null{
  if(!d)return null
  const diff=new Date(d).getTime()-Date.now()
  return Math.ceil(diff/(1000*60*60*24))
}
function urgency(days:number|null):{label:string,color:string,badge:string}{
  if(days===null)return{label:'No Date',color:'text-slate-400',badge:'bg-slate-100 text-slate-400 border-slate-200'}
  if(days<0)return{label:'Expired',color:'text-red-600',badge:'bg-red-50 text-red-600 border-red-200'}
  if(days<=30)return{label:'< 30 days',color:'text-red-500',badge:'bg-red-50 text-red-500 border-red-200'}
  if(days<=60)return{label:'< 60 days',color:'text-orange-500',badge:'bg-orange-50 text-orange-500 border-orange-200'}
  if(days<=90)return{label:'< 90 days',color:'text-amber-500',badge:'bg-amber-50 text-amber-500 border-amber-200'}
  return{label:'OK',color:'text-emerald-600',badge:'bg-emerald-50 text-emerald-600 border-emerald-200'}
}

const COMAR_CHECKLIST=[
  {id:'c1',cat:'Personnel File',item:'W-4 Federal Tax Withholding form on file',reg:'IRS / Federal'},
  {id:'c2',cat:'Personnel File',item:'MD MW-507 State Tax Withholding form on file',reg:'MD Tax'},
  {id:'c3',cat:'Personnel File',item:'Social Security card copy in file',reg:'COMAR 10.07.05'},
  {id:'c4',cat:'Personnel File',item:'Government-issued photo ID copy in file',reg:'COMAR 10.07.05'},
  {id:'c5',cat:'Personnel File',item:'Highest educational credential (diploma/degree) on file',reg:'COMAR 10.07.05'},
  {id:'c6',cat:'Credentials',item:'Current CPR certification on file (within 24 months)',reg:'COMAR 10.07.05'},
  {id:'c7',cat:'Credentials',item:'TB screening within past 12 months on file',reg:'OHCQ / COMAR'},
  {id:'c8',cat:'Credentials',item:'Nursing license verified current if applicable',reg:'COMAR 10.07.09'},
  {id:'c9',cat:'Compliance',item:'HIPAA training acknowledgement signed',reg:'HIPAA / Federal'},
  {id:'c10',cat:'Compliance',item:'Employee handbook acknowledgement signed',reg:'BLH Policy'},
  {id:'c11',cat:'Compliance',item:'Criminal background check completed and cleared',reg:'COMAR 10.07.05'},
  {id:'c12',cat:'Compliance',item:'Background check consent form signed',reg:'COMAR 10.07.05'},
  {id:'c13',cat:'Compliance',item:'VEVRAA voluntary self-identification form on file',reg:'41 CFR 60-300'},
  {id:'c14',cat:'Employment',item:'Emergency contact information current in system',reg:'BLH Policy'},
  {id:'c15',cat:'Employment',item:'Payroll schedule acknowledgement signed',reg:'MD Labor Law'},
]

export default function CompliancePage(){
  const[emps,setEmps]=useState<any[]>([])
  const[docs,setDocs]=useState<any[]>([])
  const[loading,setLoading]=useState(true)
  const[tab,setTab]=useState<'alerts'|'comar'|'expiry'>('alerts')
  const supabase=createClient()

  useEffect(()=>{load()},[]) 

  async function load(){
    const[{data:e},{data:d}]=await Promise.all([
      supabase.from('employees').select('id,first_name,last_name,role_id,roles(title),nursing_license_expiry,nursing_license_number,cpr_cert_expiry,tb_test_expiry,hipaa_training_expiry,background_check_status,background_check_date,is_active').eq('is_active',true).order('last_name'),
      supabase.from('employee_documents').select('employee_id,name,status')
    ])
    setEmps(e||[]);setDocs(d||[]);setLoading(false)
  }

  // Build credential expiry rows
  const credRows=emps.flatMap(e=>[
    {emp:e,type:'Nursing License',expiry:e.nursing_license_expiry,note:e.nursing_license_number||''},
    {emp:e,type:'CPR Certification',expiry:e.cpr_cert_expiry,note:''},
    {emp:e,type:'TB Test',expiry:e.tb_test_expiry,note:''},
    {emp:e,type:'HIPAA Training',expiry:e.hipaa_training_expiry,note:''},
  ]).filter(r=>r.expiry)
  .map(r=>({...r,days:daysUntil(r.expiry)}))
  .sort((a,b)=>(a.days??999)-(b.days??999))

  const expired=credRows.filter(r=>r.days!==null&&r.days<0).length
  const critical=credRows.filter(r=>r.days!==null&&r.days>=0&&r.days<=30).length
  const warning=credRows.filter(r=>r.days!==null&&r.days>30&&r.days<=90).length
  const ok=credRows.filter(r=>r.days!==null&&r.days>90).length

  // Alert rows (urgent items — expired or < 90 days)
  const alertRows=credRows.filter(r=>r.days!==null&&r.days<=90)

  // Background check summary
  const bgStats={
    cleared:emps.filter(e=>e.background_check_status==='cleared').length,
    pending:emps.filter(e=>e.background_check_status==='pending'||!e.background_check_status).length,
    flagged:emps.filter(e=>e.background_check_status==='flagged').length,
    expired:emps.filter(e=>e.background_check_status==='expired').length,
  }

  // COMAR compliance — check doc upload/approval for each category
  const DOC_MAP:Record<string,string>={c1:'w4',c2:'mw507',c3:'ssn_card',c4:'drivers_license',c5:'diploma',c6:'cpr_cert',c7:'tb_test',c8:'nursing_license',c9:'hipaa',c10:'handbook',c11:'background_re',c12:'background_consent',c13:'vevraa',c14:'emergency_contact',c15:'payroll_schedule'}
  function comarCompliant(item_id:string):number{// returns % of employees with this doc approved
    const docKey=DOC_MAP[item_id]
    if(!docKey)return 0
    const compliant=emps.filter(e=>docs.find((d:any)=>d.employee_id===e.id&&d.name===docKey&&d.status==='approved')).length
    return emps.length>0?Math.round(compliant/emps.length*100):0
  }

  if(loading)return(<div className="flex h-64 items-center justify-center"><RefreshCw className="w-6 h-6 text-emerald-500 animate-spin"/></div>)

  return(
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Compliance</h1>
          <p className="text-sm text-slate-500 mt-0.5">COMAR 10.07.05 · OHCQ · Maryland healthcare regulations</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"><RefreshCw className="w-4 h-4"/>Refresh</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[{l:'Expired',v:expired,c:'text-red-600',bg:'bg-red-50',b:'border-red-200',Icon:XCircle},
          {l:'Critical < 30d',v:critical,c:'text-red-500',bg:'bg-orange-50',b:'border-orange-200',Icon:AlertTriangle},
          {l:'Warning < 90d',v:warning,c:'text-amber-600',bg:'bg-amber-50',b:'border-amber-200',Icon:Clock},
          {l:'Current',v:ok,c:'text-emerald-600',bg:'bg-emerald-50',b:'border-emerald-200',Icon:CheckCircle2},
          {l:'BG Cleared',v:bgStats.cleared,c:'text-blue-600',bg:'bg-blue-50',b:'border-blue-200',Icon:Shield},
        ].map(s=>(
          <div key={s.l} className={`${s.bg} border ${s.b} rounded-xl p-4 flex flex-col gap-2`}>
            <s.Icon className={`w-5 h-5 ${s.c}`}/>
            <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
            <div className="text-xs text-slate-500">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-4 w-fit">
        {(['alerts','comar','expiry'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab===t?'bg-white text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {t==='alerts'?`Active Alerts (${alertRows.length})`:t==='comar'?'COMAR Checklist':'Credential Expiry'}
          </button>
        ))}
      </div>

      {tab==='alerts'&&(
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {alertRows.length===0?(
            <div className="py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3"/>
              <div className="text-slate-600 font-medium">All credentials current</div>
              <div className="text-sm text-slate-400 mt-1">No expirations within 90 days</div>
            </div>
          ):(
            <table className="w-full">
              <thead><tr className="border-b border-slate-200 bg-slate-50">{['Employee','Credential','Expires','Days Remaining','Status'].map(h=>(<th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>))}</tr></thead>
              <tbody>
                {alertRows.map((r,i)=>{
                  const u=urgency(r.days)
                  return(
                    <tr key={`${r.emp.id}-${r.type}`} className={`border-b border-slate-100 hover:bg-slate-50/50 ${i%2===0?'':'bg-slate-50/20'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">{r.emp.first_name[0]}{r.emp.last_name[0]}</div>
                          <div className="text-sm font-medium text-slate-900">{r.emp.first_name} {r.emp.last_name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.type}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{r.expiry?new Date(r.expiry).toLocaleDateString():'—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${u.color}`}>
                          {r.days!==null?(r.days<0?`${Math.abs(r.days)}d overdue`:`${r.days}d`):'—'}
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${u.badge}`}>{u.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab==='comar'&&(
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">COMAR 10.07.05 RSA · OHCQ personnel file requirements. Percentages show how many active employees have an approved document on file.</p>
          </div>
          {['Personnel File','Credentials','Compliance','Employment'].map(cat=>(
            <div key={cat}>
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{cat}</span></div>
              {COMAR_CHECKLIST.filter(c=>c.cat===cat).map((item,i)=>{
                const pct=comarCompliant(item.id)
                const clr=pct===100?'text-emerald-600 bg-emerald-50':pct>=80?'text-amber-600 bg-amber-50':pct>=50?'text-orange-500 bg-orange-50':'text-red-600 bg-red-50'
                return(
                  <div key={item.id} className={`flex items-center gap-4 px-4 py-3 border-b border-slate-100 hover:bg-slate-50/50 ${i%2===0?'':'bg-slate-50/20'}`}>
                    {pct===100?<CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0"/>:<AlertTriangle className={`w-4 h-4 flex-shrink-0 ${pct>=80?'text-amber-400':pct>=50?'text-orange-400':'text-red-400'}`}/>}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800">{item.item}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.reg}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-28 bg-slate-200 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${pct===100?'bg-emerald-500':pct>=80?'bg-amber-400':pct>=50?'bg-orange-400':'bg-red-400'}`} style={{width:pct+'%'}}/></div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${clr}`}>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {tab==='expiry'&&(
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nursing License</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">CPR Cert</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">TB Test</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">HIPAA Training</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Background Check</th>
            </tr></thead>
            <tbody>
              {emps.map((emp,i)=>{
                const fields=[
                  {key:'nursing',expiry:emp.nursing_license_expiry},
                  {key:'cpr',expiry:emp.cpr_cert_expiry},
                  {key:'tb',expiry:emp.tb_test_expiry},
                  {key:'hipaa',expiry:emp.hipaa_training_expiry},
                ]
                return(
                  <tr key={emp.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${i%2===0?'':'bg-slate-50/20'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">{emp.first_name[0]}{emp.last_name[0]}</div>
                        <div><div className="text-sm font-medium text-slate-900">{emp.first_name} {emp.last_name}</div><div className="text-xs text-slate-400">{emp.roles?.title||'—'}</div></div>
                      </div>
                    </td>
                    {fields.map(f=>{
                      const days=daysUntil(f.expiry)
                      const u=urgency(days)
                      return(
                        <td key={f.key} className="px-4 py-3">
                          {f.expiry?(
                            <div>
                              <div className="text-xs text-slate-500">{new Date(f.expiry).toLocaleDateString()}</div>
                              <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-full ${u.badge}`}>{u.label}</span>
                            </div>
                          ):<span className="text-xs text-slate-300">Not set</span>}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${emp.background_check_status==='cleared'?'bg-emerald-50 text-emerald-600 border border-emerald-200':emp.background_check_status==='flagged'?'bg-red-50 text-red-600 border border-red-200':emp.background_check_status==='expired'?'bg-orange-50 text-orange-600 border border-orange-200':'bg-slate-100 text-slate-500'}`}>
                        {emp.background_check_status||'Pending'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {emps.length===0&&<div className="py-12 text-center text-slate-400">No employees found</div>}
        </div>
      )}
    </div>
  )
}
