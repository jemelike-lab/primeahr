import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'

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
      'slug, display_name, short_description, long_description, pay_range_min, pay_range_max, pay_frequency, department'
    )
    .eq('slug', slug)
    .eq('active', true)
    .eq('is_public', true)
    .maybeSingle()

  if (!role) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-8">
      <div className="max-w-3xl mx-auto space-y-8 pt-8">
        <div>
          <div className="text-sm text-emerald-700 font-medium mb-2">
            Now hiring at Beatrice Loving Heart
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            {role.display_name}
          </h1>
          {role.short_description ? (
            <p className="text-lg text-slate-600">{role.short_description}</p>
          ) : null}
          {role.department ? (
            <p className="text-sm text-slate-500 mt-2">{role.department}</p>
          ) : null}
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

        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-8 text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            Ready to apply?
          </h2>
          <p className="text-slate-600 mb-6">
            Full application flow coming in the next iteration.
          </p>
          <button
            disabled
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium opacity-50 cursor-not-allowed"
          >
            Start application (coming soon)
          </button>
        </div>
      </div>
    </div>
  )
}

