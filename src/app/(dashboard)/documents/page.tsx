import { createClient } from '@/lib/supabase/server'
import { FileText, Upload, FolderOpen, Search, Filter } from 'lucide-react'
import Link from 'next/link'
export default async function DocumentsPage() {
  const s = await createClient()
  const { data: templates } = await s.from('form_templates').select('id, name, category, form_type, is_required, sort_order').eq('is_active', true).order('category').order('sort_order')
  const cats: Record<string, any[]> = {}
  templates?.forEach(t => { if (!cats[t.category]) cats[t.category] = []; cats[t.category].push(t) })
  const catLabels: any = { federal_tax: 'Federal Tax', state_tax: 'State Tax', identity: 'Identity Documents', medical: 'Medical & Certifications', compliance: 'Compliance & Legal', company: 'Company Documents', employment: 'Employment Forms' }
  const catIcons: any = { federal_tax: '🏦', state_tax: '🏛️', identity: '🆔', medical: '⚕️', compliance: '🛡️', company: '🏢', employment: '💼' }
  return (<div><div className="flex items-center justify-between mb-6"><div><h1 className="text-2xl font-semibold text-slate-900">Document Vault</h1><p className="text-sm text-slate-500 mt-1">{templates?.length || 0} document types configured</p></div></div>{Object.entries(cats).map(([cat, items]) => (<div key={cat} className="mb-6"><h2 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">{catIcons[cat] || '📄'} {catLabels[cat] || cat}</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{items.map((t: any) => (<div key={t.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-900 truncate">{t.name}</p><p className="text-xs text-slate-400 mt-0.5">{t.form_type === 'fillable' ? 'Digital form' : t.form_type === 'upload' ? 'Upload required' : t.form_type}</p></div>{t.is_required && <span className="text-[9px] uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200 flex-shrink-0 ml-2">Required</span>}</div></div>))}</div></div>))}</div>)
}
