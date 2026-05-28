'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { uploadOnboardingDocument } from '../actions'
import { Upload, FileText, AlertCircle, Loader2, Sparkles, RefreshCw, ShieldCheck, PenLine, ArrowRight } from 'lucide-react'

export interface DocRow {
  id: string | null
  name: string
  category: string
  status: string
  uploaded_at?: string | null
  rejection_reason?: string | null
  form_code?: string | null
}

interface Props { token: string; initialDocs: DocRow[] }

interface RowState { phase: 'idle' | 'uploading' | 'verifying' | 'done' | 'error'; message?: string }

export function DocumentsPanel({ token, initialDocs }: Props) {
  const router = useRouter()
  const [docs, setDocs] = useState<DocRow[]>(initialDocs)
  const [rowState, setRowState] = useState<Record<string, RowState>>({})

  function setPhase(name: string, phase: RowState['phase'], message?: string) {
    setRowState((s) => ({ ...s, [name]: { phase, message } }))
  }

  async function handleFile(doc: DocRow, file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setPhase(doc.name, 'error', 'File must be 10MB or smaller.')
      return
    }
    setPhase(doc.name, 'uploading', 'Uploading your file securely…')
    const fd = new FormData()
    fd.append('token', token)
    fd.append('doc_name', doc.name)
    fd.append('doc_category', doc.category || 'upload_required')
    fd.append('file', file)
    const upload = await uploadOnboardingDocument(fd)
    if (upload.error || !upload.documentId) {
      setPhase(doc.name, 'error', upload.error ?? 'Upload failed. Try again.')
      return
    }
    setPhase(doc.name, 'verifying', 'Claude is reviewing your document…')
    try {
      const r = await fetch('/api/ai/verify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, documentId: upload.documentId }),
      })
      const j = await r.json()
      if (j.error && !j.status) {
        setPhase(doc.name, 'error', j.error)
        return
      }
      const finalStatus = j.status ?? 'uploaded'
      setDocs((prev) =>
        prev.map((d) =>
          d.name === doc.name
            ? { ...d, id: upload.documentId!, status: finalStatus, rejection_reason: j.rejectionReason ?? null }
            : d
        )
      )
      let msg = ''
      if (finalStatus === 'approved') msg = `Verified by AI — looks great.`
      else if (finalStatus === 'rejected') msg = j.rejectionReason || 'Document needs attention.'
      else msg = 'Sent to HR for a quick review.'
      setPhase(doc.name, 'done', msg)
    } catch (e) {
      setPhase(doc.name, 'error', 'Verification request failed. HR has been notified.')
    }
    router.refresh()
  }

  return (
    <div className="space-y-1">
      {docs.map((d) =>
        d.form_code ? (
          <FillableFormRow key={d.name} doc={d} token={token} />
        ) : (
          <UploadRow key={d.name} doc={d} state={rowState[d.name]} onFile={(f) => handleFile(d, f)} />
        )
      )}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
        <span>Uploads are encrypted and reviewed by Claude AI before going to HR. PDF or image (JPG, PNG, WebP, HEIC), 10MB max.</span>
      </div>
    </div>
  )
}

function FillableFormRow({ doc, token }: { doc: DocRow; token: string }) {
  const isApproved = doc.status === 'approved'
  const pill = pillFor(doc.status)
  return (
    <Link
      href={`/welcome/${token}/forms/${doc.form_code}`}
      className="group flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-violet-50/60 transition"
    >
      <PenLine className={`w-4 h-4 flex-shrink-0 ${isApproved ? 'text-emerald-500' : 'text-violet-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-700 truncate">{doc.name}</div>
        {!isApproved && (
          <div className="text-[11px] text-violet-600 mt-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />AI-prefilled — review and sign in about 3 minutes.
          </div>
        )}
      </div>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: pill.bg, color: pill.color }}>
        {pill.label}
      </span>
      <span className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-md text-violet-700 group-hover:bg-violet-100 transition flex-shrink-0">
        {isApproved ? 'View' : 'Fill out'}
        <ArrowRight className="w-3 h-3" />
      </span>
    </Link>
  )
}

function UploadRow({ doc, state, onFile }: { doc: DocRow; state?: RowState; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const phase = state?.phase ?? 'idle'
  const busy = phase === 'uploading' || phase === 'verifying'
  const isApproved = doc.status === 'approved'
  const isRejected = doc.status === 'rejected'
  const isInReview = doc.status === 'uploaded'
  const showUpload = !busy && (doc.status === 'pending' || isRejected || phase === 'error')
  const showReplace = !busy && (isApproved || isInReview)

  const pill = pillFor(doc.status)
  const triggerLabel = isRejected ? 'Re-upload' : 'Upload'

  return (
    <div className={`flex items-center gap-3 py-2.5 px-2 rounded-lg transition ${busy ? 'bg-violet-50/40' : 'hover:bg-slate-50'}`}>
      <FileText className={`w-4 h-4 flex-shrink-0 ${isApproved ? 'text-emerald-500' : isRejected ? 'text-rose-400' : 'text-slate-300'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-700 truncate">{doc.name}</div>
        {phase === 'error' && state?.message && (
          <div className="text-[11px] text-rose-600 mt-0.5 flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{state.message}</div>
        )}
        {phase !== 'error' && isRejected && doc.rejection_reason && (
          <div className="text-[11px] text-rose-600 mt-0.5 flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />{doc.rejection_reason}</div>
        )}
        {state?.message && (phase === 'done' || phase === 'uploading' || phase === 'verifying') && (
          <div className={`text-[11px] mt-0.5 ${isApproved ? 'text-emerald-700' : 'text-slate-500'}`}>{state.message}</div>
        )}
      </div>

      {phase === 'uploading' && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex items-center gap-1 flex-shrink-0">
          <Loader2 className="w-3 h-3 animate-spin" />Uploading…
        </span>
      )}
      {phase === 'verifying' && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3 h-3" />AI verifying…
        </span>
      )}
      {!busy && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: pill.bg, color: pill.color }}>
          {pill.label}
        </span>
      )}

      {(showUpload || showReplace) && (
        <>
          <input
            ref={ref}
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className={`text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-md transition flex-shrink-0 ${
              isRejected ? 'text-rose-700 hover:bg-rose-50' :
              showReplace ? 'text-slate-500 hover:bg-slate-100' :
              'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            {isRejected ? <><RefreshCw className="w-3 h-3" />{triggerLabel}</> :
             showReplace ? 'Replace' :
             <><Upload className="w-3 h-3" />{triggerLabel}</>}
          </button>
        </>
      )}
    </div>
  )
}

function pillFor(s: string) {
  if (s === 'approved') return { label: 'Approved', color: '#047857', bg: '#d1fae5' }
  if (s === 'uploaded') return { label: 'In review', color: '#a16207', bg: '#fef3c7' }
  if (s === 'rejected') return { label: 'Needs attention', color: '#b91c1c', bg: '#fee2e2' }
  if (s === 'expired') return { label: 'Expired', color: '#9a3412', bg: '#ffedd5' }
  return { label: 'Needed', color: '#475569', bg: '#f1f5f9' }
}
