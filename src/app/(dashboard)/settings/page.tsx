import { Settings } from 'lucide-react'
export default function SettingsPage() {
  return (<div><div className="mb-6"><h1 className="text-2xl font-semibold text-slate-900">Settings</h1><p className="text-sm text-slate-500 mt-1">Platform configuration</p></div><div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm text-center"><Settings className="w-12 h-12 text-slate-300 mx-auto mb-3"/><p className="text-sm text-slate-500">Settings panel coming in Phase 2.</p></div></div>)
}