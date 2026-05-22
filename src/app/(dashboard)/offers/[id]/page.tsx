'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, CheckCircle, XCircle, Eye, Edit, Loader2, PenTool } from 'lucide-react'
import Link from 'next/link'
import { SignaturePad } from '@/components/signature-pad'
export default function OfferDetailPage() {
  const { id } = useParams(); const router = useRouter(); const supabase = createClient()
  const [offer, setOffer] = useState<any>(null); const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false); const [showSign, setShowSign] = useState(false)
  useEffect(()=>{(async()=>{
    const { data } = await supabase.from('offer_letters').select('*, candidate:candidates(first_name, last_name, email), template:offer_letter_templates(name, html_content)').eq('id', id).single()
    setOffer(data); setLoading(false)
  })()},[])
  async function updateStatus(status: string) {
    setSending(true)
    const updates: any = { status }
    if (status === 'sent') updates.sent_at = new Date().toISOString()
    if (status === 'approved') updates.approved_at = new Date().toISOString()
    await supabase.from('offer_letters').update(updates).eq('id', id)
    setOffer({ ...offer, ...updates }); setSending(false)
  }
  async function handleSign(sigData: { image: string; type: string; hash: string }) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('signatures').insert({
      offer_letter_id: id,
      signer_name: offer.candidate?.first_name + ' ' + offer.candidate?.last_name,
      signer_email: offer.candidate?.email,
      signature_data: sigData.image,
      signature_type: sigData.type,
      document_hash: sigData.hash,
      ip_address: 'captured-server-side',
      signer_role: 'candidate'
    })
    await supabase.from('offer_letters').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', id)
    setOffer({ ...offer, status: 'accepted', accepted_at: new Date().toISOString() })
    setShowSign(false)
  }
  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-500"/></div>
  if (!offer) return <div className="text-center py-20"><p className="text-sm text-slate-500">Offer letter not found.</p></div>
  const sc: any = { draft:'bg-slate-50 text-slate-600 border-slate-200', pending_approval:'bg-blue-50 text-blue-700 border-blue-200', approved:'bg-emerald-50 text-emerald-700 border-emerald-200', sent:'bg-amber-50 text-amber-700 border-amber-200', accepted:'bg-emerald-50 text-emerald-700 border-emerald-200', declined:'bg-red-50 text-red-700 border-red-200' }
  return (<div><div className="mb-6"><Link href="/offers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-emerald-600 mb-3"><ArrowLeft className="w-4 h-4"/>Back to offers</Link><div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold text-slate-900">Offer for {offer.candidate?.first_name} {offer.candidate?.last_name}</h1><p className="text-sm text-slate-500 mt-1">{offer.position_title} {offer.department ? '— ' + offer.department : ''}</p></div><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${sc[offer.status]||sc.draft}`}>{offer.status.replace('_',' ')}</span></div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"><h2 className="text-base font-medium text-slate-900 mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-slate-400"/>Offer letter preview</h2><div className="prose prose-sm max-w-none border border-slate-100 rounded-xl p-6 min-h-[400px] bg-white" dangerouslySetInnerHTML={{__html: offer.rendered_html || generatePreviewHTML(offer)}}/></div>{showSign && (<div className="mt-6"><h2 className="text-base font-medium text-slate-900 mb-3 flex items-center gap-2"><PenTool className="w-4 h-4 text-emerald-500"/>Sign this offer letter</h2><SignaturePad onSave={handleSign}/></div>)}</div><div><div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4"><h3 className="text-sm font-medium text-slate-900">Details</h3><div className="space-y-3 text-sm">{[['Candidate', (offer.candidate?.first_name||'') + ' ' + (offer.candidate?.last_name||'')],['Email', offer.candidate?.email],['Position', offer.position_title],['Department', offer.department],['Salary', offer.salary ? '$' + Number(offer.salary).toLocaleString() : '—'],['Start date', offer.start_date ? new Date(offer.start_date).toLocaleDateString() : '—'],['Created', new Date(offer.created_at).toLocaleDateString()],['Sent', offer.sent_at ? new Date(offer.sent_at).toLocaleDateString() : '—']].map(([l,v])=>(<div key={l as string} className="flex justify-between"><span className="text-slate-500">{l}</span><span className="text-slate-900 font-medium">{v||'—'}</span></div>))}</div></div><div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mt-4 space-y-2"><h3 className="text-sm font-medium text-slate-900 mb-3">Actions</h3>{offer.status==='draft'&&<><button onClick={()=>updateStatus('pending_approval')} disabled={sending} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 border border-blue-200">{sending?<Loader2 className="w-4 h-4 animate-spin"/>:<><Eye className="w-4 h-4"/>Submit for approval</>}</button></>}{offer.status==='pending_approval'&&<button onClick={()=>updateStatus('approved')} disabled={sending} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 border border-emerald-200">{sending?<Loader2 className="w-4 h-4 animate-spin"/>:<><CheckCircle className="w-4 h-4"/>Approve</>}</button>}{offer.status==='approved'&&<button onClick={()=>updateStatus('sent')} disabled={sending} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-100 border border-amber-200">{sending?<Loader2 className="w-4 h-4 animate-spin"/>:<><Send className="w-4 h-4"/>Send to candidate</>}</button>}{offer.status==='sent'&&<button onClick={()=>setShowSign(!showSign)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20"><PenTool className="w-4 h-4"/>{showSign?'Hide signature pad':'Sign & accept'}</button>}{(offer.status!=='accepted'&&offer.status!=='declined')&&<button onClick={()=>updateStatus('declined')} disabled={sending} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 border border-red-200">{sending?<Loader2 className="w-4 h-4 animate-spin"/>:<><XCircle className="w-4 h-4"/>Decline</>}</button>}</div></div></div></div>)
}
function generatePreviewHTML(offer: any) {
  return `<div style="font-family:system-ui;line-height:1.7"><div style="text-align:center;margin-bottom:2rem"><h2 style="color:#064e3b;margin:0">Beatrice Loving Heart</h2><p style="color:#6b7280;font-size:0.85rem">Home Health & DDA Services</p></div><p>Dear ${offer.candidate?.first_name || '[Candidate]'},</p><p>We are pleased to offer you the position of <strong>${offer.position_title || '[Position]'}</strong>${offer.department ? ' in the <strong>' + offer.department + '</strong> department' : ''} at Beatrice Loving Heart.</p>${offer.salary ? '<p>Your compensation will be <strong>$' + Number(offer.salary).toLocaleString() + '</strong> per ${offer.pay_rate_type === 'hourly' ? 'hour' : 'year'}.</p>' : ''}${offer.start_date ? '<p>Your anticipated start date is <strong>' + new Date(offer.start_date).toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'}) + '</strong>.</p>' : ''}${offer.benefits_summary ? '<p><strong>Benefits:</strong> ' + offer.benefits_summary + '</p>' : ''}<p>This position is classified as <strong>${(offer.employment_type||'full_time').replace('_',' ')}</strong>.</p><p>Please confirm your acceptance by signing below. We look forward to having you join our team.</p><p style="margin-top:2rem">Sincerely,<br/><strong>Beatrice Loving Heart HR Team</strong></p></div>`
}