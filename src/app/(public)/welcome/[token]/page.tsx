import { validateToken } from '@/lib/tokens'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function WelcomeTokenPage({ params }: PageProps) {
  const { token } = await params
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
  const userAgent = hdrs.get('user-agent') ?? undefined

  const tokenRow = await validateToken(token, 'onboarding', ip, userAgent)
  if (!tokenRow) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-8">
      <div className="max-w-3xl mx-auto space-y-8 pt-12">
        <div className="text-center">
          <div className="text-sm text-emerald-700 font-medium mb-2">
            Welcome to Beatrice Loving Heart
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            You&apos;re in. Let&apos;s get you set up.
          </h1>
          <p className="text-lg text-slate-600">
            Your onboarding journey starts here.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Your progress
            </h2>
            <span className="text-sm font-medium text-emerald-700">
              0 of 8 complete
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
              style={{ width: '0%' }}
            />
          </div>
        </div>

        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-8 text-center">
          <p className="text-slate-700 mb-4">
            Full onboarding flow coming in the next iteration.
          </p>
          <div className="text-xs text-slate-500 font-mono">
            Kind: {tokenRow.kind} · Expires:{' '}
            {new Date(tokenRow.expires_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}

