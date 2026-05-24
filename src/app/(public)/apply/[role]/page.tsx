import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import ApplyStep1Form from './_components/ApplyStep1Form'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ role: string }>
}

export default async function ApplyRolePage({ params }: PageProps) {
  const { role: slug } = await params
  const supabase = createAdminClient()
  const { data: role } = await supabase
    .from('role_templates')
    .select(
      'slug, display_name, short_description, long_description, pay_range_min, pay_range_max, pay_frequency, department, career_level'
    )
    .eq('slug', slug)
    .eq('active', true)
    .eq('is_public', true)
    .maybeSingle()

  if (!role) notFound()

  const payLabel =
    role.pay_range_min && role.pay_range_max
      ? `$${Number(role.pay_range_min).toLocaleString()}–$${Number(
          role.pay_range_max
        ).toLocaleString()} ${role.pay_frequency ?? ''}`.trim()
      : null

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
      <div>
        <div className="text-sm text-emerald-700 font-medium mb-2">
          Now hiring at Beatrice Loving Heart
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3 leading-tight">
          {role.display_name}
        </h1>
        {role.short_description ? (
          <p className="text-lg text-slate-600">{role.short_description}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-3">
          {role.department ? <span>{role.department}</span> : null}
          {role.career_level ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{role.career_level}</span>
            </>
          ) : null}
          {payLabel ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{payLabel}</span>
            </>
          ) : null}
        </div>
      </div>

      {role.long_description ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            About this role
          </h2>
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
            {role.long_description}
          </p>
        </div>
      ) : null}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="mb-6">
          <div className="text-sm font-medium text-emerald-700 mb-1">
            Step 1 of 8
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Tell us about you
          </h2>
          <p className="text-slate-600 mt-1">
            Takes about a minute. We&apos;ll save your progress so you can finish
            later if needed.
          </p>
        </div>
        <ApplyStep1Form roleSlug={role.slug} roleName={role.display_name} />
      </div>

      <p className="text-xs text-slate-500 text-center">
        Beatrice Loving Heart is an equal-opportunity employer. We never share
        your information with third parties.
      </p>
    </div>
  )
}
