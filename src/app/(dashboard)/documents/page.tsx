'use client'
import{useState,useRef,useEffect}from'react'
import{createClient}from'@/lib/supabase/client'
import{Upload,FileText,CheckCircle,Clock,XCircle,Eye,Search,RefreshCw,AlertCircle}from'lucide-react'

const DOC_TYPES=[
  {key:'w4',name:'W-4 Federal Withholding',cat:'Tax Forms',required:true},
  {key:'mw507',name:'MD MW-507 State Withholding',cat:'Tax Forms',required:true},
  {key:'ssn_card',name:'Social Security Card',cat:'Identity',required:true},
  {key:'drivers_license',name:"Driver's License / State ID",cat:'Identity',required:true},
  {key:'diploma',name:'Diploma / Degree',cat:'Credentials',required:true},
  {key:'nursing_license',name:'Nursing License',cat:'Credentials',required:false},
  {key:'cpr_cert',name:'CPR Certification',cat:'Credentials',required:true},
  {key:'tb_test',name:'TB Test Results',cat:'Credentials',required:true},
  {key:'hipaa',name:'HIPAA Acknowledgement',cat:'Compliance',required:true},
  {key:'handbook',name:'Handbook Acknowledgement',cat:'Compliance',required:true},
  {key:'background_consent',name:'Background Check Consent',cat:'Compliance',required:true},
  {key:'vevraa',name:'VEVRAA Self-Identification',cat:'Compliance',required:false},
  {key:'personal_data',name:'Personal Data Sheet',cat:'Employment',required:true},
  {key:'payroll_schedule',name:'Payroll Schedule Ack.',cat:'Employment',required:true},
  {key:'emergency_contact',name:'Emergency Contact Form',cat:'Employment',required:true},
  {key:'background_re',name:'Background Check RE',cat:'Employment',required:true},
  {key:'county_reference',name:'County/Reference Form',cat:'Employment',required:false},
]
const STATUS={pending:{label:'Pending',color:'text-amber-600 bg-amber-50 border-amber-200',Icon:Clock},uploaded:{label:'Under Review',color:'text-blue-600 bg-blue-50 border-blue-200',Icon:Eye},approved:{label:'Approved',color:'text-emerald-600 bg-emerald-50 border-emerald-200',Icon:CheckCircle},rejected:{label:'Rejected',color:'text-red-600 bg-red-50 border-red-200',Icon:XCircle}}
const CATS=[...new Set(DOC_TYPES.map(d=>d.cat))]
const REQUIRED=DOC_TYPES.filter(d=>d.required)

export default function DocumentsPage(){
  const[emps,setEmps]=useState<any[]>([])
  const[docs,setDocs]=useState<any[]>([])
  const[sel,setSel]=useState<string|null>(null)
  const[loading,setLoading]=useState(true)
  const[uploading,setUploading]=useState(false)
  const[uploadKey,setUploadKey]=useState<string|null>(null)
  const[search,setSearch]=useState('')
  const fileRef=useRef<HTMLInputElement>(null)
  const supabase=createClient()

  useEffect(()=>{load()},[]) 

  async function load(){
    setLoading(true)
    const[{data:e},{data:d}]=await Promise.all([
      supabase.from('employees').select('id,first_name,last_name,role_id,roles(title),employment_status,is_active').eq('is_active',true).order('first_name'),
      supabase.from('employee_documents').select('id,employee_id,name,status,storage_path,file_url,reviewed_at')
    ])
    setEmps(e||[])
    setDocs(d||[])
    if(!sel&&e&&e.length>0)setSel(e[0].id)
    setLoading(false)
  }

  const selEmp=emps.find(e=>e.id===sel)
  const empDocs=docs.filter(d=>d.employee_id===sel)
  const getDoc=(key:string)=>empDocs.find(d=>d.name===key)
  const getStatus=(key:string)=>(getDoc(key)?.status||'pending') as keyof typeof STATUS

  const verified=REQUIRED.filter(d=>getStatus(d.key)==='approved').length
  const progress=Math.round(verified/REQUIRED.length*100)

  const filtered=emps.filter(e=>(e.first_name+' '+e.last_name).toLowerCase().includes(search.toLowerCase()))

  async function handleUpload(docKey:string,file:File){
    if(!sel||!file)return
    setUploading(true)
    try{
      const ext=file.name.split('.').pop()
      const path=`${sel}/${docKey}_${Date.now()}.${ext}`
      const{error:upErr}=await supabase.storage.from('employee-documents').upload(path,file,{upsert:true})
      if(upErr)throw upErr
      const pubUrl=supabase.storage.from('employee-documents').getPublicUrl(path).data.publicUrl
      const existing=getDoc(docKey)
      if(existing){
        await supabase.from('employee_documents').update({storage_path:path,file_url:pubUrl,status:'uploaded',updated_at:new Date().toISOString()}).eq('id',existing.id)
      }else{
        await supabase.from('employee_documents').insert({employee_id:sel,name:docKey,category:'upload_required',storage_path:path,file_url:pubUrl,status:'uploaded',file_name:file.name,file_size_bytes:file.size,file_mime_type:file.type})
      }
      setUploadKey(null)
      load()
    }catch(e:any){alert('Upload failed: '+e.message)}
    setUploading(false)
  }

  async function handleReview(docKey:string,status:'approved'|'rejected'){
    const doc=getDoc(docKey)
    if(!doc)return
    await supabase.from('employee_documents').update({status,reviewed_at:new Date().toISOString()}).eq('id',doc.id)
    load()
  }

  if(loading)return(<div className="flex h-64 items-center justify-center"><RefreshCw className="w-6 h-6 text-emerald-500 animate-spin"/></div>)

  return(
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-lg font-semibold text-slate-900 mb-3">Document Vault</h1>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(emp=>{
            const d=docs.filter(x=>x.employee_id===emp.id)
            const ver=REQUIRED.filter(r=>d.find((x:any)=>x.name===r.key&&x.status==='approved')).length
            const pct=Math.round(ver/REQUIRED.length*100)
            const hasRej=d.some((x:any)=>x.status==='rejected')
            return(
              <button key={emp.id} onClick={()=>setSel(emp.id)} className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-white transition-colors ${sel===emp.id?'bg-white border-l-2 border-l-emerald-500':''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold flex-shrink-0">{emp.first_name[0]}{emp.last_name[0]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 truncate">{emp.first_name} {emp.last_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all ${pct===100?'bg-emerald-500':hasRej?'bg-red-400':'bg-amber-400'}`} style={{width:pct+'%'}}/>
                      </div>
                      <span className="text-[11px] text-slate-500 tabular-nums">{pct}%</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
          {filtered.length===0&&<div className="p-4 text-sm text-slate-400 text-center">No employees found</div>}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 overflow-y-auto">
        {selEmp?(
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{selEmp.first_name} {selEmp.last_name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{(selEmp as any).roles?.title||'No role assigned'}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-600">{progress}%</div>
                <div className="text-xs text-slate-500">{verified}/{REQUIRED.length} required docs approved</div>
                <div className="w-36 bg-slate-200 rounded-full h-2 mt-1.5">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{width:progress+'%'}}/>
                </div>
              </div>
            </div>

            {CATS.map(cat=>(
              <div key={cat} className="mb-7">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{cat}</h3>
                <div className="space-y-2">
                  {DOC_TYPES.filter(d=>d.cat===cat).map(doc=>{
                    const st=getStatus(doc.key)
                    const cfg=STATUS[st]||STATUS.pending
                    const Icon=cfg.Icon
                    const docRec=getDoc(doc.key)
                    return(
                      <div key={doc.key} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-all">
                        <FileText className="w-4 h-4 text-slate-300 flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-800">{doc.name}</span>
                          {doc.required&&<span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">Required</span>}
                        </div>
                        <span className={`flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-1 rounded-full ${cfg.color}`}>
                          <Icon className="w-3.5 h-3.5"/>{cfg.label}
                        </span>
                        <div className="flex items-center gap-1.5 ml-1">
                          {st==='uploaded'&&(
                            <>
                              <button onClick={()=>handleReview(doc.key,'approved')} className="text-xs px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Approve</button>
                              <button onClick={()=>handleReview(doc.key,'rejected')} className="text-xs px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100">Reject</button>
                            </>
                          )}
                          {docRec?.file_url&&<a href={docRec.file_url} target="_blank" className="text-xs px-2.5 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100">View</a>}
                          <button onClick={()=>{setUploadKey(doc.key);setTimeout(()=>fileRef.current?.click(),50)}} className="text-xs px-2.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 flex items-center gap-1">
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
          <div className="flex h-full items-center justify-center text-slate-400">Select an employee</div>
        )}
      </div>

      <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={async e=>{
        const file=e.target.files?.[0]
        if(file&&uploadKey)await handleUpload(uploadKey,file)
        e.target.value=''
      }}/>

      {uploading&&(
        <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 flex items-center gap-3 shadow-2xl">
            <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin"/>
            <span className="font-medium text-sm">Uploading...</span>
          </div>
        </div>
      )}
    </div>
  )
}
