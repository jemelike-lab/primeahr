'use client'
import{useState,useEffect}from'react'
import{createClient}from'@/lib/supabase/client'
import{Settings,Save,RefreshCw,Building2,Mail,Phone,MapPin}from'lucide-react'

export default function SettingsPage(){
  const[org,setOrg]=useState({name:'Beatrice Loving Heart',phone:'',email:'',address:'',city:'',state:'MD',zip:''})
  const[loading,setLoading]=useState(false)
  const[saved,setSaved]=useState(false)
  const supabase=createClient()

  useEffect(()=>{
    supabase.from('offices').select('*').eq('is_primary',true).single().then(({data})=>{
      if(data)setOrg(o=>({...o,name:data.name||o.name,phone:data.phone||'',address:data.address_line1||'',city:data.city||'',state:data.state||'MD',zip:data.zip_code||''}))
    })
  },[])

  async function handleSave(){
    setLoading(true);setSaved(false)
    await supabase.from('offices').update({name:org.name,phone:org.phone,address_line1:org.address,city:org.city,state:org.state,zip_code:org.zip}).eq('is_primary',true)
    setSaved(true);setLoading(false)
    setTimeout(()=>setSaved(false),3000)
  }

  const inputCls='w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
  return(
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6"><Settings className="w-6 h-6 text-slate-400"/><h1 className="text-2xl font-semibold text-slate-900">Settings</h1></div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4"/>Organization</h2>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Company Name</label><input value={org.name} onChange={e=>setOrg(o=>({...o,name:e.target.value}))} className={inputCls}/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Phone</label><input value={org.phone} onChange={e=>setOrg(o=>({...o,phone:e.target.value}))} placeholder="(301) 555-0100" className={inputCls}/></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Email</label><input value={org.email} onChange={e=>setOrg(o=>({...o,email:e.target.value}))} placeholder="admin@blhnurses.com" className={inputCls}/></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-600 mb-1">Address</label><input value={org.address} onChange={e=>setOrg(o=>({...o,address:e.target.value}))} className={inputCls}/></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-600 mb-1">City</label><input value={org.city} onChange={e=>setOrg(o=>({...o,city:e.target.value}))} className={inputCls}/></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">State</label><input value={org.state} onChange={e=>setOrg(o=>({...o,state:e.target.value}))} className={inputCls}/></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">ZIP</label><input value={org.zip} onChange={e=>setOrg(o=>({...o,zip:e.target.value}))} className={inputCls}/></div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          {saved&&<span className="text-sm text-emerald-600 font-medium">Saved!</span>}
          <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {loading?<RefreshCw className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}{loading?'Saving...':'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Platform</h2>
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Version</span><span className="font-mono">PrimeaHR v1.0.0</span></div>
          <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Stack</span><span>Next.js 16 + Supabase + Vercel</span></div>
          <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">Database</span><span>Supabase PostgreSQL (19 tables)</span></div>
          <div className="flex justify-between py-2"><span className="text-slate-500">Deployment</span><span>primeahr.vercel.app</span></div>
        </div>
      </div>
    </div>
  )
}
