import { createClient } from '@/lib/supabase/server'
import { Building2, Users, Briefcase } from 'lucide-react'
export default async function DepartmentsPage() {
  const s = await createClient()
  const { data: depts } = await s.from('departments').select('id, name, description, sort_order').eq('is_active', true).order('sort_order')
  const { data: emps } = await s.from('employees').select('department_id').eq('is_active', true)
  const { data: roles } = await s.from('roles').select('department_id').eq('is_active', true)
  const dc:any={};emps?.forEach(e=>{if(e.department_id)dc[e.department_id]=(dc[e.department_id]||0)+1})
  const rc:any={};roles?.forEach(r=>{if(r.department_id)rc[r.department_id]=(rc[r.department_id]||0)+1})
  return (<div><div className="flex items-center justify-between mb-6"><div><h1 className="text-2xl font-semibold text-slate-900">Departments</h1><p className="text-sm text-slate-500 mt-1">{depts?.length||0} active departments</p></div></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{depts?.map(d=>(<div key={d.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group"><div className="flex items-start justify-between mb-3"><div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors"><Building2 className="w-5 h-5 text-emerald-600"/></div></div><h3 className="text-base font-semibold text-slate-900 mb-1">{d.name}</h3><p className="text-xs text-slate-400 mb-4 line-clamp-2">{d.description||'No description'}</p><div className="flex items-center gap-4 text-xs text-slate-500"><span className="flex items-center gap-1"><Users className="w-3.5 h-3.5"/>{dc[d.id]||0} employees</span><span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5"/>{rc[d.id]||0} roles</span></div></div>))}</div></div>)
}