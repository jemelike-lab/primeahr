import { validateToken } from '@/lib/tokens'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { ApplyFlow } from './_components/ApplyFlow'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ role: string }>
  searchParams: Promise<{ t?: string }>
}

export default async function ApplyContinuePage({ params, searchParams }: PageProps) {
  const { role: slug } = await params
  const { t } = await searchParams
  if (!t) notFound()

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
  const userAgent = hdrs.get('user-agent') ?? undefined
  const tokenRow = await validateToken(t, 'apply_resume', ip, userAgent)
  if (!tokenRow || !tokenRow.application_id) notFound()

  // Defensive: token must match this role
  const md = (tokenRow.metadata as Record<string, unknown>) || {}
  if (md.role_slug && md.role_slug !== slug) notFound()

  const supabase = createAdminClient()
  const [{ data: app }, { data: roleData }] = await Promise.all([
    supabase
      .from('applications')
      .select('id, role_slug, current_step, total_steps, status, form_data, candidate_id, resume_filename')
      .eq('id', tokenRow.application_id)
      .single(),
    supabase
      .from('role_templates')
      .select('slug, display_name')
      .eq('slug', slug)
      .eq('active', true)
      .eq('is_public', true)
      .maybeSingle(),
  ])
  if (!app || !roleData) notFound()

  if (app.status === 'submitted') {
    redirect(`/apply/${slug}/continue/thank-you?t=${encodeURIComponent(t)}`)
  }

  const { data: candidate } = app.candidate_id
    ? await supabase
        .from('candidates')
        .select('first_name, last_name, email')
        .eq('id', app.candidate_id)
        .single()
    : { data: null }

  const maxCompleted = Number(app.current_step ?? 1)
  const initialStep = Math.min(Math.max(maxCompleted + 1, 2), 8)

  return (
    <ApplyFlow
      token={t}
      role={{ slug: roleData.slug, name: roleData.display_name }}
      candidate={{
        firstName: candidate?.first_name ?? '',
        lastName: candidate?.last_name ?? '',
        email: candidate?.email ?? '',
      }}
      initialStep={initialStep}
      maxCompleted={maxCompleted}
      totalSteps={Number(app.total_steps ?? 8)}
      formData={(app.form_data as Record<string, unknown>) ?? {}}
      resumeFilename={app.resume_filename ?? null}
    />
  )
}
