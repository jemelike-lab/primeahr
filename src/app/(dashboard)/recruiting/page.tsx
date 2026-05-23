'use client'
import{useState,useEffect}from'react'
import{createClient}from'@/lib/supabase/client'
import{Plus,Search,RefreshCw,Briefcase,Users,ChevronRight,Circle,CheckCircle2,Clock,XCircle,TrendingUp}from'lucide-react'
import Link from'next/link'
const STAGES=['new','screening','interviewing','offer','hired','dispositioned']
const STAGE_CONFIG:Record<string,{label:string,color:string,bg:string,border:string}>={
  new:{label:'New',color:'text-slate-600',bg:'bg-slate-50',border:'border-slate-200'},
  screening:{label:'Screening',color:'text-blue-600',bg:'bg-blue-50',border:'border-blue-200'},
  interviewing:{label:'Interviewing',color:'text-violet-600',bg:'bg-violet-50',border:'border-violet-200'},
  offer:{label:'Offer Sent',color:'text-amber-600',bg:'bg-amber-50',border:'border-amber-200'},
  hired:{label:'Hired',color:'text-emerald-600',bg:'bg-emerald-50',border:'border-emerald-200'},
  dispositioned:{label:'Declined',color:'text-red-600',bg:'bg-red-50',border:'border-red-200'},
}
const REQ_STATUS:Record<string,{label:string,color:string}>={
  draft:{label:'Draft',color:'text-slate-500 bg-slate-100'},
  pending_approval:{label:'Pending',color:'text-amber-600 bg-amber-50'},
  open:{label:'Open',color:'text-emerald-600 bg-emerald-50'},
  on_hold:{label:'On Hold',color:'text-orange-600 bg-orange-50'},
  closed:{label:'Closed',color:'text-slate-400 bg-slate-100'},
}
export default function RecruitingPage(){
  const[reqs,setReqs]=useState<any[]>([])
  const[cands,setCands]=useState<any[]>([])
  const[loading,setLoading]=useState(true)
  const[tab,setTab]=useState<'pipeline'|'requisitions'>('pipeline')
  const[search,setSearch]=useState('')
  const[stageFilter,setStageFilter]=useState('all')
  const supabase=createClient()
  useEffect(()=>{load()},[]) 
  async function load(){
    const[{data:r},{data:c}]=await Promise.all([
      supabase.from('requisitions').select('id,title,status,number_of_openings,positions_filled,department_id,departments(name),created_at,opened_at').order('created_at',{ascending:false}),
      supabase.from('candidates').select('id,first_name,last_name,email,phone,stage,grade,source,applied_at,requisition_id,requisitions(title)').order('applied_at',{ascending:false})
    ])
    setReqs(r||[]);setCands(c||[]);setLoading(false)
  }
  async function moveStage(id:string,stage:string){
    await supabase.from('candidates').update({stage,last_action_date:new Date().toISOString()}).eq('id',id)
    load()
  }
  const filteredC=cands.filter(c=>{
    const match=(c.first_name+' '+c.last_name+' '+(c.email||'')).toLowerCase().includes(search.toLowerCase())
    const stg=stageFilter==='all'||c.stage===stageFilter
    return match&&stg
  })
  const stageCounts=STAGES.reduce((acc,s)=>({...acc,[s]:cands.filter(c=>c.stage===s).length}),{} as Record<string,number>)
  if(loading)return(<div className="flex h-64 items-center justify-center"><RefreshCw className="w-6 h-6 text-emerald-500 animate-spin"/></div>)
  return(
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-semibold text-slate-900">Recruiting</h1><p className="text-sm text-slate-500 mt-0.5">{cands.length} candidates · {reqs.filter(r=>r.status==='open').length} open reqs</p></div>
        <Link href="/recruiting/new" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700"><Plus className="w-4 h-4"/>New Requisition</Link>
      </div>

      {/* Stage funnel */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {STAGES.map(s=>{
          const cfg=STAGE_CONFIG[s]
          const cnt=stageCounts[s]||0
          return(<button key={s} onClick={()=>setStageFilter(stageFilter===s?'all':s)} className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 text-left transition-all ${stageFilter===s?'ring-2 ring-offset-1 ring-emerald-500':'hover:shadow-sm'}`}>
            <div className={`text-2xl font-bold ${cfg.color}`}>{cnt}</div>
            <div className="text-xs text-slate-500 mt-0.5">{cfg.label}</div>
          </button>)
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-4 w-fit">
        {(['pipeline','requisitions'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab===t?'bg-white text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {t==='pipeline'?`Candidates (${filteredC.length})`:`Requisitions (${reqs.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      {tab==='pipeline'&&(
        <div className="relative mb-4"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search candidates..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/></div>
      )}

      {tab==='pipeline'?(
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-slate-200 bg-slate-50">{['Candidate','Role','Stage','Grade','Source','Applied',''].map(h=>(<th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>))}</tr></thead>
            <tbody>
              {filteredC.map((c,i)=>{
                const cfg=STAGE_CONFIG[c.stage]||STAGE_CONFIG.new
                return(
                  <tr key={c.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${i%2===0?'':'bg-slate-50/20'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold">{c.first_name[0]}{c.last_name[0]}</div>
                        <div><div className="text-sm font-medium text-slate-900">{c.first_name} {c.last_name}</div><div className="text-xs text-slate-400">{c.email||'—'}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.requisitions?.title||'—'}</td>
                    <td className="px-4 py-3">
                      <select value={c.stage} onChange={e=>moveStage(c.id,e.target.value)} className={`text-xs font-semibold border px-2.5 py-1 rounded-full cursor-pointer ${cfg.color} ${cfg.bg} ${cfg.border} focus:outline-none`}>
                        {STAGES.map(s=>(<option key={s} value={s}>{STAGE_CONFIG[s].label}</option>))}
                      </select>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold ${c.grade==='A'?'text-emerald-600':c.grade==='B'?'text-amber-600':c.grade==='C'?'text-red-500':'text-slate-400'}`}>{c.grade||'—'}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.source||'—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{c.applied_at?new Date(c.applied_at).toLocaleDateString():'—'}</td>
                    <td className="px-4 py-3"><Link href={`/recruiting/candidate/${c.id}`} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5">View<ChevronRight className="w-3 h-3"/></Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredC.length===0&&<div className="py-12 text-center text-slate-400">No candidates found</div>}
        </div>
      ):(
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-slate-200 bg-slate-50">{['Position','Department','Status','Openings','Posted',''].map(h=>(<th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>))}</tr></thead>
            <tbody>
              {reqs.map((r,i)=>{
                const cfg=REQ_STATUS[r.status]||REQ_STATUS.draft
                return(
                  <tr key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${i%2===0?'':'bg-slate-50/20'}`}>
                    <td className="px-4 py-3"><div className="text-sm font-medium text-slate-900">{r.title}</div></td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.departments?.name||'—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.positions_filled}/{r.number_of_openings}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{r.opened_at?new Date(r.opened_at).toLocaleDateString():r.status==='draft'?'Draft':'—'}</td>
                    <td className="px-4 py-3"><Link href={`/recruiting/req/${r.id}`} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5">View<ChevronRight className="w-3 h-3"/></Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {reqs.length===0&&<div className="py-12 text-center text-slate-400">No requisitions yet. <Link href="/recruiting/new" className="text-emerald-600 font-semibold">Create one →</Link></div>}
        </div>
      )}
    </div>
  )
}
