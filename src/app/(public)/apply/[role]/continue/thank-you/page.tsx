import { validateToken } from '@/lib/tokens'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { CheckCircle2, Mail, Clock, Heart } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ role: string }>
  searchParams: Promise<{ t?: string }>
}

export default async function ThankYouPage({ params, searchParams }: PageProps) {
  const { role: slug } = await params
  const { t } = await searchParams
  if (!t) notFound()

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ua = hdrs.get('user-agent') ?? undefined
  const tokenRow = await validateToken(t, 'apply_resume', ip, ua)
  if (!tokenRow || !tokenRow.application_id) notFound()

  const supabase = createAdminClient()
  const [{ data: app }, { data: role }] = await Promise.all([
    supabase
      .from('applications')
      .select('status, submitted_at, candidate_id')
      .eq('id', tokenRow.application_id)
      .single(),
    supabase
      .from('role_templates')
      .select('display_name')
      .eq('slug', slug)
      .maybeSingle(),
  ])
  if (!app) notFound()

  const { data: candidate } = app.candidate_id
    ? await supabase
        .from('candidates')
        .select('first_name, email')
        .eq('id', app.candidate_id)
        .single()
    : { data: null }

  const submitted = app.status === 'submitted'

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6">
        <CheckCircle2 className="w-10 h-10 text-white" />
      </div>
      <div className="text-sm text-emerald-700 font-medium mb-2">Application received</div>
      <h1 className="text-4xl font-bold text-slate-900 mb-3">Thank you{candidate?.first_name ? `, ${candidate.first_name}` : ''}.</h1>
      <p className="text-lg text-slate-600 max-w-lg mx-auto">
        Your application for {role?.display_name ? <strong>{role.display_name}</strong> : 'this role'} has been submitted to Beatrice Loving Heart.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mt-10 text-left">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <Mail className="w-5 h-5 text-emerald-600 mb-2" />
          <div className="text-sm font-semibold text-slate-900 mb-1">Confirmation email</div>
          <p className="text-xs text-slate-500 leading-relaxed">
            We&apos;ll send a copy of your application to{' '}
            {candidate?.email ? <strong className="text-slate-700">{candidate.email}</strong> : 'your email'} shortly.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <Clock className="w-5 h-5 text-emerald-600 mb-2" />
          <div className="text-sm font-semibold text-slate-900 mb-1">Next 3-5 business days</div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Our hiring team will review your application. We respond to every applicant.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <Heart className="w-5 h-5 text-emerald-600 mb-2" />
          <div className="text-sm font-semibold text-slate-900 mb-1">If we move forward</div>
          <p className="text-xs text-slate-500 leading-relaxed">
            You&apos;ll get a magic link to schedule a screening conversation with us.
          </p>
        </div>
      </div>

      {submitted && app.submitted_at && (
        <p className="text-xs text-slate-400 mt-10">
          Submitted {new Date(app.submitted_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}

      <div className="mt-10">
        <a href="https://beatricelovingheart.com" className="text-sm text-emerald-700 font-medium hover:underline">
          Learn more about Beatrice Loving Heart →
        </a>
      </div>
    </div>
  )
}
