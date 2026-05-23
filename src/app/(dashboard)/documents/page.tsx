'use client'
import{useState,useRef,useEffect}from'react'
import{createClient}from'@/lib/supabase/client'
import{Upload,FileText,CheckCircle,Clock,XCircle,Eye,Search,X,ChevronDown,RefreshCw}from'lucide-react'

const DOCS=[{key:'w4',name:'W-4 Federal Withholding',cat:'Tax Forms',required:true},{key:'mw507',name:'MD MW-507 State Withholding',cat:'Tax Forms',required:true},{key:'ssn_card',name:'Social Security Card',cat:'Identity',required:true},{key:'drivers_license',name:"Driver's License / State ID",cat:'Identity',required:true},{key:'diploma',name:'Diploma / Degree',cat:'Credentials',required:true},{key:'nursing_license',name:'Nursing License',cat:'Credentials',required:false},{key:'cpr_cert',name:'CPR Certification',cat:'Credentials',required:true},{key:'tb_test',name:'TB Test Results',cat:'Credentials',required:true},{key:'hipaa',name:'HIPAA Acknowledgement',cat:'Compliance',required:true},{key:'handbook',name:'Handbook Acknowledgement',cat:'Compliance',required:true},{key:'background_consent',name:'Background Check Consent',cat:'Compliance',required:true},{key:'vevraa',name:'VEVRAA Self-ID',cat:'Compliance',required:false},{key:'personal_data',name:'Personal Data Sheet',cat:'Employment',required:true},{key:'payroll_schedule',name:'Payroll Schedule Ack.',cat:'Employment',required:true},{key:'emergency_contact',name:'Emergency Contact Form',cat:'Employment',required:true},{key:'background_re',name:'Background Check RE',cat:'Employment',required:true},{key:'county_reference',name:'County/Reference Form',cat:'Employment',required:false}]

const STATUS_CONFIG:Record<string,{label:string,color:string,icon:any}>={
  pending:{label:'Pending',color:'text-amber-600 bg-amber-50 border-amber-200',icon:Clock},
  uploaded:{label:'Under Review',color:'text-blue-600 bg-blue-50 border-blue-200',icon:Eye},
  verified:{label:'Verified',color:'text-emerald-600 bg-emerald-50 border-emerald-200',icon:CheckCircle},
  rejected:{label:'Rejected',color:'text-red-600 bg-red-50 border-red-200',icon:XCircle},
}

export default function DocumentsPage(){
  const[employees,setEmployees]=useState<any[]>([])
  const[submissions,setSubmissions]=useState<any[]>([])
  const[selected,setSelected]=useState<string|null>(null)
  const[loading,setLoading]=useState(true)
  const[uploading,setUploading]=useState(false)
  const[uploadDoc,setUploadDoc]=useState<string|null>(null)
  const[search,setSearch]=useState('')
  const[filter,setFilter]=useState('all')
  const fileRef=useRef<HTMLInputElement>(null)
  const supabase=createClient()

  useEffect(()=>{loadData()},[])

  async function loadData(){
    setLoading(true)
    const[{data:emps},{data:subs}]=await Promise.all([
      supabase.from('employees').select('id,first_name,last_name,position,department_id,status').eq('status','active').order('first_name'),
      supabase.from('document_submissions').select('*')
    ])
    setEmployees(emps||[])
    setSubmissions(subs||[])
    if(!selected&&emps&&emps.length>0)setSelected(emps[0].id)
    setLoading(false)
  }

  const selectedEmployee=employees.find(e=>e.id===selected)
  const empSubs=submissions.filter(s=>s.employee_id===selected)
  const getStatus=(key:string)=>empSubs.find(s=>s.document_type===key)?.status||'pending'
  const getSub=(key:string)=>empSubs.find(s=>s.document_type===key)

  const required=DOCS.filter(d=>d.required)
  const verified=required.filter(d=>getStatus(d.key)==='verified').length
  const progress=required.length?Math.round(verified/required.length*100):0

  const cats=[...new Set(DOCS.map(d=>d.cat))]
  const filtered=employees.filter(e=>
    (e.first_name+' '+e.last_name).toLowerCase().includes(search.toLowerCase())
  )

  async function handleUpload(docKey:string,file:File){
    if(!selected||!file)return
    setUploading(true)
    try{
      const ext=file.name.split('.').pop()
      const path=`docs/${selected}/${docKey}_${Date.now()}.${ext}`
      const{error:upErr}=await supabase.storage.from('employee-documents').upload(path,file,{upsert:true})
      if(upErr)throw upErr
      const existing=getSub(docKey)
      if(existing){
        await supabase.from('document_submissions').update({file_path:path,status:'uploaded',updated_at:new Date().toISOString()}).eq('id',existing.id)
      }else{
        await supabase.from('document_submissions').insert({employee_id:selected,document_type:docKey,file_path:path,status:'uploaded'})
      }
      setUploadDoc(null)
      loadData()
    }catch(e){console.error(e)}
    setUploading(false)
  }

  async function handleReview(docKey:string,status:'verified'|'rejected'){
    const sub=getSub(docKey)
    if(!sub)return
    await supabase.from('document_submissions').update({status,reviewed_at:new Date().toISOString()}).eq('id',sub.id)
    loadData()
  }

  if(loading)return(<div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 text-emerald-500 animate-spin"/></div>)

  return(
    <div className="flex h-full gap-0 -m-6">
      {/* Left panel - employee list */}
      <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-lg font-semibold text-slate-900 mb-3">Document Vault</h1>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employees..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(emp=>{
            const subs=submissions.filter(s=>s.employee_id===emp.id)
            const req=DOCS.filter(d=>d.required)
            const ver=req.filter(d=>(subs.find((s:any)=>s.document_type===d.key)?.status||'pending')==='verified').length
            const pct=req.length?Math.round(ver/req.length*100):0
            const hasRejected=subs.some((s:any)=>s.status==='rejected')
            return(
              <button key={emp.id} onClick={()=>setSelected(emp.id)} className={`w-full text-left px-4 py-3 border-b border-slate-200 hover:bg-white transition-colors ${selected===emp.id?'bg-white border-l-2 border-l-emerald-500':''} `}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-semibold flex-shrink-0">{emp.first_name[0]}{emp.last_name[0]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 truncate">{emp.first_name} {emp.last_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${pct===100?'bg-emerald-500':hasRejected?'bg-red-400':'bg-amber-400'}`} style={{width:pct+'%'}}/>
                      </div>
                      <span className="text-xs text-slate-500">{pct}%</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel - documents */}
      <div className="flex-1 overflow-y-auto">
        {selectedEmployee?(
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{selectedEmployee.first_name} {selectedEmployee.last_name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{selectedEmployee.position||'No position'}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600">{progress}%</div>
                <div className="text-xs text-slate-500">{verified}/{required.length} required docs verified</div>
                <div className="w-32 bg-slate-200 rounded-full h-2 mt-1">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{width:progress+'%'}}/>
                </div>
              </div>
            </div>

            {/* Document categories */}
            {cats.map(cat=>(
              <div key={cat} className="mb-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{cat}</h3>
                <div className="space-y-2">
                  {DOCS.filter(d=>d.cat===cat).map(doc=>{
                    const status=getStatus(doc.key)
                    const sub=getSub(doc.key)
                    const cfg=STATUS_CONFIG[status]
                    const Icon=cfg.icon
                    return(
                      <div key={doc.key} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-4 hover:border-slate-300 transition-colors">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{doc.name}</span>
                            {doc.required&&<span className="text-[10px] uppercase tracking-wider text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Required</span>}
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-medium border px-2.5 py-1 rounded-full ${cfg.color}`}>
                          <Icon className="w-3.5 h-3.5"/>
                          {cfg.label}
                        </div>
                        <div className="flex items-center gap-2">
                          {(status==='uploaded')&&(
                            <>
                              <button onClick={()=>handleReview(doc.key,'verified')} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">Verify</button>
                              <button onClick={()=>handleReview(doc.key,'rejected')} className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">Reject</button>
                            </>
                          )}
                          {sub?.file_path&&(
                            <a href={`https://cnzsloaydotapqrdauch.supabase.co/storage/v1/object/public/employee-documents/${sub.file_path}`} target="_blank" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">View</a>
                          )}
                          <button onClick={()=>{setUploadDoc(doc.key);fileRef.current?.click()}} className="text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 flex items-center gap-1 transition-colors">
                            <Upload className="w-3 h-3"/>Upload
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ):(
          <div className="flex items-center justify-center h-64 text-slate-400">Select an employee to view documents</div>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e=>{
        const file=e.target.files?.[0]
        if(file&&uploadDoc)handleUpload(uploadDoc,file)
        e.target.value=''
      }}/>

      {uploading&&(
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex items-center gap-3 shadow-xl">
            <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin"/>
            <span className="text-sm font-medium">Uploading document...</span>
          </div>
        </div>
      )}
    </div>
  )
}
