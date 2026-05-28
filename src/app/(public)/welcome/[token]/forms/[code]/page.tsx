import { validateToken } from '@/lib/tokens'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFormMeta } from '@/lib/forms/registry'
import { getPrefillData } from '@/lib/forms/prefill'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, ShieldCheck } from 'lucide-react'
import { FormShell } from './_components/FormShell'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string; code: string }>
}

export default async function FormPage({ params }: PageProps) {
  const { token, code } = await params
  const meta = getFormMeta(code)
  if (!meta) notFound()

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ua = hdrs.get('user-agent') ?? undefined
  const tokenRow = await validateToken(token, 'onboarding', ip, ua)
  if (!tokenRow || !tokenRow.employee_id) notFound()

  const supabase = createAdminClient()
  const { data: emp } = await supabase
    .from('employees')
    .select('first_name, last_name')
    .eq('id', tokenRow.employee_id)
    .single()
  if (!emp) notFound()

  // Check if this form is already submitted (latest version)
  const { data: existing } = await supabase
    .from('employee_documents')
    .select('id, status, version, reviewed_at')
    .eq('employee_id', tokenRow.employee_id)
    .eq('name', meta.name)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const prefill = await getPrefillData(tokenRow.employee_id)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 sm:py-12">
      <Link
        href={`/welcome/${token}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to onboarding
      </Link>

      <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 rounded-3xl p-7 sm:p-9 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            AI-prefilled · You review and sign
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">{meta.display_title}</h1>
          <p className="text-emerald-50 text-base leading-relaxed max-w-2xl">{meta.subtitle}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-4 text-xs text-emerald-50/90">
            <span>{meta.agency}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              About {meta.estimated_minutes} minute{meta.estimated_minutes === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {existing?.status === 'approved' && (
        <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-900 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>This form is on file</strong> (version {existing.version}, signed{' '}
            {existing.reviewed_at ? new Date(existing.reviewed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'previously'}).
            You can re-submit below to update it — a new version will be saved.
          </div>
        </div>
      )}

      <div className="mt-6">
        <FormShell
          token={token}
          code={meta.code}
          formName={meta.name}
          employeeName={`${emp.first_name} ${emp.last_name}`}
          prefill={prefill}
        />
      </div>
    </div>
  )
}
