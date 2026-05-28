'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { SignaturePad } from '@/components/signature-pad'
import type { PrefillData } from '@/lib/forms/prefill'
import type { FormCode } from '@/lib/forms/registry'
import { submitForm } from '../actions'
import { W4Fields, type W4Values, w4Defaults, validateW4 } from './W4Fields'
import { MW507Fields, type MW507Values, mw507Defaults, validateMW507 } from './MW507Fields'
import { DirectDepositFields, type DirectDepositValues, directDepositDefaults, validateDirectDeposit } from './DirectDepositFields'

interface Props {
  token: string
  code: FormCode
  formName: string
  employeeName: string
  prefill: PrefillData
}

export function FormShell({ token, code, formName, employeeName, prefill }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, any>>(() => {
    if (code === 'w4') return w4Defaults(prefill)
    if (code === 'mw507') return mw507Defaults(prefill)
    if (code === 'direct-deposit') return directDepositDefaults(prefill)
    return {}
  })
  const [signature, setSignature] = useState<{ image: string; type: 'drawn' | 'typed' | 'uploaded'; hash: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function setField<T = any>(key: string, val: T) {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  function validate(): string | null {
    if (code === 'w4') return validateW4(values as W4Values)
    if (code === 'mw507') return validateMW507(values as MW507Values)
    if (code === 'direct-deposit') return validateDirectDeposit(values as DirectDepositValues)
    return null
  }

  async function handleSubmit() {
    setError(null)
    const vErr = validate()
    if (vErr) { setError(vErr); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    if (!signature) { setError('Please apply your signature before submitting.'); return }

    setSubmitting(true)
    const res = await submitForm({ token, code, form_values: values, signature })
    setSubmitting(false)
    if (res.error) { setError(res.error); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setDone(true)
    setTimeout(() => router.push(`/welcome/${token}`), 1800)
  }

  if (done) {
    return (
      <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl shadow-emerald-500/10 p-10 text-center">
        <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{formName} signed and on file</h2>
        <p className="text-sm text-slate-500">Returning you to your onboarding dashboard…</p>
      </div>
    )
  }

  const filledCount = Object.values(prefill.source_map).filter(Boolean).length

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {filledCount > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 text-sm text-violet-900 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>We pre-filled {filledCount} field{filledCount === 1 ? '' : 's'} for you</strong> from your application
            {prefill.source_map.address_line1 === 'driver_license' || prefill.source_map.first_name === 'driver_license'
              ? " and the driver's license you uploaded."
              : '.'}{' '}
            Review each field carefully and update anything that&apos;s wrong before signing.
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 sm:p-9">
        {code === 'w4' && (
          <W4Fields values={values as W4Values} setField={setField} sourceMap={prefill.source_map} />
        )}
        {code === 'mw507' && (
          <MW507Fields values={values as MW507Values} setField={setField} sourceMap={prefill.source_map} />
        )}
        {code === 'direct-deposit' && (
          <DirectDepositFields values={values as DirectDepositValues} setField={setField} sourceMap={prefill.source_map} />
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 sm:p-9">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Your signature</h3>
        <p className="text-sm text-slate-500 mb-5">
          Signing as <strong className="text-slate-700">{employeeName}</strong>. Choose draw, type, or upload.
        </p>
        <SignaturePad onSave={(sig) => setSignature(sig)} />
        {signature && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Signature applied
          </div>
        )}
      </div>

      <div className="sticky bottom-4 z-10">
        <button
          onClick={handleSubmit}
          disabled={submitting || !signature}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-semibold shadow-xl shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</>
          ) : (
            <>Submit signed {formName}</>
          )}
        </button>
        <p className="text-[11px] text-center text-slate-400 mt-2">
          Your IP, timestamp, and signature hash are recorded as a legal audit trail.
        </p>
      </div>
    </div>
  )
}
