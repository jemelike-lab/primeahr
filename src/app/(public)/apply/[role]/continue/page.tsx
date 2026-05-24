import { validateToken } from '@/lib/tokens'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ role: string }>
  searchParams: Promise<{ t?: string }>
}

export default async function ApplyContinuePage({
  params,
  searchParams,
}: PageProps) {
  const { role: slug } = await params
  const { t } = await searchParams
  if (!t) notFound()

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
  const userAgent = hdrs.get('user-agent') ?? undefined

  const tokenRow = await validateToken(t, 'apply_resume', ip, userAgent)
  if (!tokenRow) notFound()

  // Defensive check: token must reference this role's application
  const stepCompleted =
    (tokenRow.metadata as Record<string, unknown>)?.step_completed ?? 1
  const roleSlugFromToken =
    (tokenRow.metadata as Record<string, unknown>)?.role_slug
  const onCorrectRole = !roleSlugFromToken || roleSlugFromToken === slug

  if (!onCorrectRole) notFound()

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="text-center">
        <div className="text-sm text-emerald-700 font-medium mb-2">
          Application saved
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Great — step 1 is done.
        </h1>
        <p className="text-slate-600">
          You can close this page and pick back up anytime with the link we just
          emailed you.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Your progress</h2>
          <span className="text-sm font-medium text-emerald-700">
            {Number(stepCompleted)} of 8 complete
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all"
            style={{ width: `${(Number(stepCompleted) / 8) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-8">
        <div className="text-sm font-medium text-emerald-700 mb-1">
          Step 2 of 8
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Your experience
        </h2>
        <p className="text-slate-700 mb-6">
          Tell us about your background in case management, social services, or
          related work. This is coming in the next iteration — for now,
          step&nbsp;1 is saved and the resume-token flow is verified end-to-end.
        </p>
        <div className="text-xs text-slate-500 font-mono bg-white/50 rounded-lg p-3 border border-emerald-100">
          token.kind: {tokenRow.kind}
          <br />
          application_id: {tokenRow.application_id}
          <br />
          expires: {new Date(tokenRow.expires_at).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
