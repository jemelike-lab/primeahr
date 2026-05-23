'use client'
import{useState,useEffect}from'react'
import{createClient}from'@/lib/supabase/client'
import{ArrowLeft,Save,RefreshCw}from'lucide-react'
import{useRouter}from'next/navigation'
import Link from'next/link'
export default function NewReqPage(){
  const[form,setForm]=useState({title:'',department_id:'',role_id:'',employment_type:'full_time',number_of_openings:1,workplace_type:'on_site',salary_range_min:'',salary_range_max:'',job_description:'',qualifications:'',status:'open'})
  const[depts,setDepts]=useState<any[]>([])
  const[roles,setRoles]=useState<any[]>([])
  const[saving,setSaving]=useState(false)
  const[error,setError]=useState('')
  const supabase=createClient()
  const router=useRouter()
  useEffect(()=>{loadMeta()},[]) 
  async function loadMeta(){
    const[{data:d},{data:r}]=await Promise.all([
      supabase.from('departments').select('id,name').eq('is_active',true).order('name'),
      supabase.from('roles').select('id,title,department_id').eq('is_active',true).order('title')
    ])
    setDepts(d||[]);setRoles(r||[])
  }
  const filteredRoles=form.department_id?roles.filter(r=>r.department_id===form.department_id):roles
  async function handleSubmit(){
    if(!form.title.trim()){setError('Position title is required');return}
    setSaving(true);setError('')
    const{error:err}=await supabase.from('requisitions').insert({
      title:form.title,department_id:form.department_id||null,role_id:form.role_id||null,
      employment_type:form.employment_type,number_of_openings:Number(form.number_of_openings),
      workplace_type:form.workplace_type,
      salary_range_min:form.salary_range_min?Number(form.salary_range_min):null,
      salary_range_max:form.salary_range_max?Number(form.salary_range_max):null,
      job_description:form.job_description||null,qualifications:form.qualifications||null,
      status:form.status,opened_at:form.status==='open'?new Date().toISOString():null
    })
    if(err){setError(err.message);setSaving(false);return}
    router.push('/recruiting')
  }
  const F=({label,req,children}:{label:string,req?:boolean,children:React.ReactNode})=>(
    <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}{req&&<span className="text-red-500 ml-0.5">*</span>}</label>{children}</div>
  )
  const inputCls="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  return(
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6"><Link href="/recruiting" className="text-slate-400 hover:text-slate-600"><ArrowLeft className="w-5 h-5"/></Link><h1 className="text-2xl font-semibold text-slate-900">New Requisition</h1></div>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <F label="Position Title" req><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Support Planner" className={inputCls}/></F>
        <div className="grid grid-cols-2 gap-4">
          <F label="Department"><select value={form.department_id} onChange={e=>setForm(f=>({...f,department_id:e.target.value,role_id:''}))} className={inputCls}><option value="">All Departments</option>{depts.map(d=>(<option key={d.id} value={d.id}>{d.name}</option>))}</select></F>
          <F label="Role"><select value={form.role_id} onChange={e=>setForm(f=>({...f,role_id:e.target.value}))} className={inputCls}><option value="">Select role...</option>{filteredRoles.map(r=>(<option key={r.id} value={r.id}>{r.title}</option>))}</select></F>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <F label="Employment Type"><select value={form.employment_type} onChange={e=>setForm(f=>({...f,employment_type:e.target.value}))} className={inputCls}>{['full_time','part_time','contract','per_diem','temporary'].map(t=>(<option key={t} value={t}>{t.replace('_',' ')}</option>))}</select></F>
          <F label="# Openings"><input type="number" min="1" value={form.number_of_openings} onChange={e=>setForm(f=>({...f,number_of_openings:Number(e.target.value)}))} className={inputCls}/></F>
          <F label="Workplace"><select value={form.workplace_type} onChange={e=>setForm(f=>({...f,workplace_type:e.target.value}))} className={inputCls}><option value="on_site">On-Site</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option></select></F>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <F label="Salary Min ($/hr or annual)"><input value={form.salary_range_min} onChange={e=>setForm(f=>({...f,salary_range_min:e.target.value}))} placeholder="e.g. 18.00" className={inputCls}/></F>
          <F label="Salary Max"><input value={form.salary_range_max} onChange={e=>setForm(f=>({...f,salary_range_max:e.target.value}))} placeholder="e.g. 25.00" className={inputCls}/></F>
        </div>
        <F label="Job Description"><textarea value={form.job_description} onChange={e=>setForm(f=>({...f,job_description:e.target.value}))} rows={4} placeholder="Describe the position..." className={inputCls+' resize-none'}/></F>
        <F label="Qualifications"><textarea value={form.qualifications} onChange={e=>setForm(f=>({...f,qualifications:e.target.value}))} rows={3} placeholder="Required qualifications..." className={inputCls+' resize-none'}/></F>
        <F label="Initial Status"><select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className={inputCls}><option value="open">Open (publish now)</option><option value="draft">Draft (save for later)</option><option value="pending_approval">Submit for Approval</option></select></F>
        {error&&<div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</div>}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/recruiting" className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</Link>
          <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving?<RefreshCw className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}{saving?'Saving...':'Create Requisition'}
          </button>
        </div>
      </div>
    </div>
  )
}
