'use client'
import{useState,useRef,useEffect}from'react'
import{useSearchParams}from'next/navigation'
import{createClient}from'@/lib/supabase/client'
import{Upload,FileText,CheckCircle,Clock,XCircle,Eye,Search,RefreshCw,FolderOpen,Landmark,CreditCard,GraduationCap,ShieldCheck,FileSignature}from'lucide-react'

const CATS = [
  {key:'Tax Forms',icon:Landmark,color:'#059669',bg:'#d1fae5',light:'#ecfdf5',border:'#a7f3d0',docs:[
    {key:'w4',name:'W-4 Federal Withholding',required:true},
    {key:'mw507',name:'MD MW-507 State Withholding',required:true},
  ]},
  {key:'Identity',icon:CreditCard,color:'#2563eb',bg:'#dbeafe',light:'#eff6ff',border:'#93c5fd',docs:[
    {key:'ssn_card',name:'Social Security Card',required:true},
    {key:'drivers_license',name:"Driver's License / ID",required:true},
  ]},
  {key:'Credentials',icon:GraduationCap,color:'#7c3aed',bg:'#ede9fe',light:'#f5f3ff',border:'#c4b5fd',docs:[
    {key:'diploma',name:'Diploma / Degree',required:true},
    {key:'nursing_license',name:'Nursing License',required:false},
    {key:'cpr_cert',name:'CPR Certification',required:true},
    {key:'tb_test',name:'TB Test Results',required:true},
  ]},
  {key:'Compliance',icon:ShieldCheck,color:'#d97706',bg:'#fef3c7',light:'#fffbeb',border:'#fde68a',docs:[
    {key:'hipaa',name:'HIPAA Acknowledgement',required:true},
    {key:'handbook',name:'Handbook Ack.',required:true},
    {key:'background_consent',name:'BG Check Consent',required:true},
    {key:'vevraa',name:'VEVRAA Self-ID',required:false},
  ]},
  {key:'Employment',icon:FileSignature,color:'#dc2626',bg:'#fee2e2',light:'#fef2f2',border:'#fecaca',docs:[
    {key:'personal_data',name:'Personal Data Sheet',required:true},
    {key:'payroll_schedule',name:'Payroll Schedule',required:true},
    {key:'emergency_contact',name:'Emergency Contact',required:true},
    {key:'background_re',name:'Background Check RE',required:true},
    {key:'county_reference',name:'County/Reference',required:false},
  ]},
]
const ALL_REQUIRED = CATS.flatMap(c=>c.docs.filter(d=>d.required))
const STATUS:Record<string,{label:string,dot:string}> = {
  pending:{label:'Pending',dot:'#94a3b8'},
  uploaded:{label:'Review',dot:'#3b82f6'},
  approved:{label:'Done',dot:'#10b981'},
  rejected:{label:'Redo',dot:'#ef4444'},
}

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
  const searchParams=useSearchParams()
  const empParam=searchParams.get('emp')

  useEffect(()=>{load()},[])
  async function load(){
    setLoading(true)
    const[{data:e},{data:d}]=await Promise.all([
      supabase.from('employees').select('id,first_name,last_name,role_id,roles(title),is_active').eq('is_active',true).order('first_name'),
      supabase.from('employee_documents').select('id,employee_id,name,status,storage_path,file_url')
    ])
    setEmps(e||[]);setDocs(d||[])
    if(!sel&&e&&e.length>0)setSel(empParam&&e.find((x:any)=>x.id===empParam)?empParam:e[0].id)
    setLoading(false)
  }
  const selEmp=emps.find(e=>e.id===sel)
  const empDocs=docs.filter(d=>d.employee_id===sel)
  const getDoc=(key:string)=>empDocs.find(d=>d.name===key)
  const getStatus=(key:string)=>(getDoc(key)?.status||'pending') as string
  const approved=ALL_REQUIRED.filter(d=>getStatus(d.key)==='approved').length
  const pct=ALL_REQUIRED.length?Math.round(approved/ALL_REQUIRED.length*100):0
  const filtered=emps.filter(e=>(e.first_name+' '+e.last_name).toLowerCase().includes(search.toLowerCase()))

  async function handleUpload(docKey:string,file:File){
    if(!sel||!file)return;setUploading(true)
    try{
      const path=sel+'/'+docKey+'_'+Date.now()+'.'+file.name.split('.').pop()
      const{error:upErr}=await supabase.storage.from('employee-documents').upload(path,file,{upsert:true})
      if(upErr)throw upErr
      const pubUrl=supabase.storage.from('employee-documents').getPublicUrl(path).data.publicUrl
      const existing=getDoc(docKey)
      if(existing){await supabase.from('employee_documents').update({storage_path:path,file_url:pubUrl,status:'uploaded'}).eq('id',existing.id)}
      else{await supabase.from('employee_documents').insert({employee_id:sel,name:docKey,category:'upload_required',storage_path:path,file_url:pubUrl,status:'uploaded',file_name:file.name,file_size_bytes:file.size,file_mime_type:file.type})}
      setUploadKey(null);load()
    }catch(e:any){alert('Upload failed: '+e.message)}
    setUploading(false)
  }
  async function handleReview(docKey:string,status:'approved'|'rejected'){
    const doc=getDoc(docKey);if(!doc)return
    await supabase.from('employee_documents').update({status,reviewed_at:new Date().toISOString()}).eq('id',doc.id);load()
  }

  if(loading)return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}><RefreshCw style={{width:24,height:24,color:'#10b981',animation:'spin 1s linear infinite'}}/></div>)

  const circ=2*Math.PI*38;const dashOff=circ-(pct/100)*circ

  return(
    <div style={{padding:'24px 32px'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:42,height:42,borderRadius:14,background:'linear-gradient(135deg,#059669,#10b981)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <FolderOpen style={{width:22,height:22,color:'#fff'}}/>
          </div>
          <div><h1 style={{fontSize:24,fontWeight:800,color:'#0f172a',margin:0}}>Document Vault</h1><p style={{fontSize:13,color:'#64748b',margin:0}}>Employee document management</p></div>
        </div>
      </div>

      {/* Employee selector row */}
      <div style={{display:'flex',gap:12,marginBottom:24,alignItems:'center'}}>
        <div style={{position:'relative',width:220}}>
          <Search style={{position:'absolute',left:10,top:9,width:16,height:16,color:'#94a3b8'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{width:'100%',paddingLeft:32,paddingRight:12,paddingTop:8,paddingBottom:8,borderRadius:10,border:'1px solid #e2e8f0',fontSize:13,outline:'none',background:'#fff'}}/>
        </div>
        <div style={{display:'flex',gap:6,flex:1,overflowX:'auto',paddingBottom:4}}>
          {filtered.map(emp=>{
            const active=sel===emp.id
            const ed=docs.filter(x=>x.employee_id===emp.id)
            const ver=ALL_REQUIRED.filter(r=>ed.find((x:any)=>x.name===r.key&&x.status==='approved')).length
            const p=ALL_REQUIRED.length?Math.round(ver/ALL_REQUIRED.length*100):0
            return(
              <button key={emp.id} onClick={()=>setSel(emp.id)} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 14px 6px 6px',borderRadius:24,border:active?'2px solid #10b981':'1px solid #e2e8f0',background:active?'#ecfdf5':'#fff',cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.2s',flexShrink:0}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:active?'#10b981':'#e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',color:active?'#fff':'#64748b',fontSize:10,fontWeight:700}}>{emp.first_name[0]}{emp.last_name[0]}</div>
                <span style={{fontSize:12,fontWeight:600,color:active?'#065f46':'#475569'}}>{emp.first_name}</span>
                <span style={{fontSize:10,fontWeight:700,color:p===100?'#10b981':'#94a3b8'}}>{p}%</span>
              </button>
            )
          })}
        </div>
      </div>

      {selEmp?(
        <>
          {/* Progress header */}
          <div style={{display:'flex',alignItems:'center',gap:24,marginBottom:28,padding:20,borderRadius:16,background:'linear-gradient(135deg,#0f172a,#1e293b)',color:'#fff'}}>
            <div style={{position:'relative',width:80,height:80,flexShrink:0}}>
              <svg viewBox="0 0 100 100" style={{width:80,height:80,transform:'rotate(-90deg)'}}>
                <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none"/>
                <circle cx="50" cy="50" r="38" stroke="#10b981" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOff} style={{transition:'stroke-dashoffset 1s ease-out'}}/>
              </svg>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:20,fontWeight:800,color:'#6ee7b7'}}>{pct}%</span>
              </div>
            </div>
            <div>
              <div style={{fontSize:18,fontWeight:700}}>{selEmp.first_name} {selEmp.last_name}</div>
              <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{(selEmp as any).roles?.title||'No role'}</div>
              <div style={{fontSize:12,color:'#6ee7b7',marginTop:6}}>{approved} of {ALL_REQUIRED.length} required documents approved</div>
            </div>
            <div style={{marginLeft:'auto',display:'flex',gap:16}}>
              {[{l:'Approved',v:empDocs.filter(d=>d.status==='approved').length,c:'#10b981'},{l:'Review',v:empDocs.filter(d=>d.status==='uploaded').length,c:'#3b82f6'},{l:'Pending',v:ALL_REQUIRED.length-empDocs.length,c:'#f59e0b'},{l:'Rejected',v:empDocs.filter(d=>d.status==='rejected').length,c:'#ef4444'}].map(s=>(
                <div key={s.l} style={{textAlign:'center'}}>
                  <div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Category columns */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:16,alignItems:'start'}}>
            {CATS.map(cat=>{
              const Icon=cat.icon
              const catApproved=cat.docs.filter(d=>d.required&&getStatus(d.key)==='approved').length
              const catReq=cat.docs.filter(d=>d.required).length
              return(
                <div key={cat.key} style={{borderRadius:16,overflow:'hidden',border:'1px solid '+cat.border,background:'#fff'}}>
                  {/* Category header */}
                  <div style={{padding:'14px 16px',background:cat.light,borderBottom:'1px solid '+cat.border,display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:32,height:32,borderRadius:10,background:cat.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Icon style={{width:16,height:16,color:cat.color}}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:cat.color}}>{cat.key}</div>
                      <div style={{fontSize:10,color:'#94a3b8'}}>{catApproved}/{catReq} done</div>
                    </div>
                  </div>

                  {/* Document cards */}
                  <div style={{padding:8,display:'flex',flexDirection:'column',gap:6}}>
                    {cat.docs.map(doc=>{
                      const st=getStatus(doc.key)
                      const cfg=STATUS[st]||STATUS.pending
                      const docRec=getDoc(doc.key)
                      return(
                        <div key={doc.key} style={{padding:'10px 12px',borderRadius:10,border:'1px solid #f1f5f9',background:st==='approved'?'#f0fdf4':st==='rejected'?'#fef2f2':st==='uploaded'?'#eff6ff':'#fafafa',transition:'all 0.2s',position:'relative'}}>
                          {/* Status dot */}
                          <div style={{position:'absolute',top:10,right:10,width:8,height:8,borderRadius:'50%',background:cfg.dot}}/>
                          <div style={{fontSize:11,fontWeight:600,color:'#1e293b',marginBottom:4,paddingRight:16}}>{doc.name}</div>
                          <div style={{display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
                            {doc.required&&<span style={{fontSize:8,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:'#dc2626',background:'#fee2e2',padding:'1px 6px',borderRadius:8}}>Req</span>}
                            <span style={{fontSize:8,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:cfg.dot,background:st==='approved'?'#d1fae5':st==='rejected'?'#fee2e2':st==='uploaded'?'#dbeafe':'#f1f5f9',padding:'1px 6px',borderRadius:8}}>{cfg.label}</span>
                          </div>
                          {/* Actions */}
                          <div style={{display:'flex',gap:4,marginTop:8}}>
                            {st==='uploaded'&&(
                              <>
                                <button onClick={()=>handleReview(doc.key,'approved')} style={{fontSize:10,fontWeight:600,padding:'4px 8px',borderRadius:6,background:'#10b981',color:'#fff',border:'none',cursor:'pointer'}}>Approve</button>
                                <button onClick={()=>handleReview(doc.key,'rejected')} style={{fontSize:10,fontWeight:600,padding:'4px 8px',borderRadius:6,background:'#fee2e2',color:'#dc2626',border:'none',cursor:'pointer'}}>Reject</button>
                              </>
                            )}
                            {docRec?.file_url&&<a href={docRec.file_url} target="_blank" style={{fontSize:10,fontWeight:600,padding:'4px 8px',borderRadius:6,background:'#f1f5f9',color:'#475569',textDecoration:'none'}}>View</a>}
                            <button onClick={()=>{setUploadKey(doc.key);setTimeout(()=>fileRef.current?.click(),50)}} style={{fontSize:10,fontWeight:600,padding:'4px 8px',borderRadius:6,background:'#f1f5f9',color:'#475569',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:3}}>
                              <Upload style={{width:10,height:10}}/>Upload
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ):(
        <div style={{textAlign:'center',padding:80,color:'#94a3b8'}}>Select an employee above</div>
      )}

      <input ref={fileRef} type="file" style={{display:'none'}} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={async e=>{
        const file=e.target.files?.[0];if(file&&uploadKey)await handleUpload(uploadKey,file);if(e.target)e.target.value=''
      }}/>
      {uploading&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div style={{background:'#fff',borderRadius:16,padding:24,display:'flex',alignItems:'center',gap:12,boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>
            <RefreshCw style={{width:20,height:20,color:'#10b981',animation:'spin 1s linear infinite'}}/>
            <span style={{fontSize:14,fontWeight:600}}>Uploading...</span>
          </div>
        </div>
      )}
    </div>
  )
}
