'use client'

import { Sparkles } from 'lucide-react'
import type { PrefillData } from '@/lib/forms/prefill'

export interface W4Values {
  first_name: string
  middle_name: string
  last_name: string
  ssn_last_4: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  filing_status: 'single_or_mfs' | 'married_filing_jointly' | 'head_of_household'
  multiple_jobs_or_spouse_works: boolean
  dependents_under_17_credit: string
  other_dependents_credit: string
  other_income: string
  deductions: string
  extra_withholding: string
}

export function w4Defaults(p: PrefillData): W4Values {
  return {
    first_name: p.first_name,
    middle_name: p.middle_name,
    last_name: p.last_name,
    ssn_last_4: p.ssn_last_4,
    address_line1: p.address_line1,
    address_line2: p.address_line2,
    city: p.city,
    state: p.state || 'MD',
    zip: p.zip,
    filing_status: 'single_or_mfs',
    multiple_jobs_or_spouse_works: false,
    dependents_under_17_credit: '',
    other_dependents_credit: '',
    other_income: '',
    deductions: '',
    extra_withholding: '',
  }
}

export function validateW4(v: W4Values): string | null {
  if (!v.first_name.trim()) return 'First name is required.'
  if (!v.last_name.trim()) return 'Last name is required.'
  if (!/^\d{4}$/.test(v.ssn_last_4)) return 'Enter the last 4 digits of your SSN.'
  if (!v.address_line1.trim()) return 'Street address is required.'
  if (!v.city.trim()) return 'City is required.'
  if (!/^[A-Z]{2}$/i.test(v.state.trim())) return 'State must be a 2-letter code (e.g. MD).'
  if (!/^\d{5}(-\d{4})?$/.test(v.zip.trim())) return 'ZIP code looks invalid.'
  if (!v.filing_status) return 'Pick a filing status.'
  return null
}

interface Props {
  values: W4Values
  setField: <T = any>(key: string, val: T) => void
  sourceMap: PrefillData['source_map']
}

export function W4Fields({ values, setField, sourceMap }: Props) {
  return (
    <div className="space-y-7">
      <Section title="Step 1 — Personal information" subtitle="Name, address, and SSN must match IRS records.">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="First name" required source={sourceMap.first_name}>
            <input type="text" value={values.first_name} onChange={(e) => setField('first_name', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Middle name" source={sourceMap.middle_name}>
            <input type="text" value={values.middle_name} onChange={(e) => setField('middle_name', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Last name" required source={sourceMap.last_name}>
            <input type="text" value={values.last_name} onChange={(e) => setField('last_name', e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Social Security number (last 4 digits only)" required source={sourceMap.ssn_last_4}>
          <input
            type="text" inputMode="numeric" maxLength={4} placeholder="••••"
            value={values.ssn_last_4}
            onChange={(e) => setField('ssn_last_4', e.target.value.replace(/\D/g, '').slice(0, 4))}
            className={inputCls + ' max-w-[140px] tracking-[0.3em] font-mono'}
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            For your safety we only store the last 4 digits. HR will collect the full SSN privately if needed for payroll.
          </p>
        </Field>

        <div className="grid gap-4">
          <Field label="Street address" required source={sourceMap.address_line1}>
            <input type="text" value={values.address_line1} onChange={(e) => setField('address_line1', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Apt / Unit (optional)" source={sourceMap.address_line2}>
            <input type="text" value={values.address_line2} onChange={(e) => setField('address_line2', e.target.value)} className={inputCls} />
          </Field>
          <div className="grid sm:grid-cols-[1fr_120px_140px] gap-4">
            <Field label="City" required source={sourceMap.city}>
              <input type="text" value={values.city} onChange={(e) => setField('city', e.target.value)} className={inputCls} />
            </Field>
            <Field label="State" required source={sourceMap.state}>
              <input type="text" maxLength={2} value={values.state} onChange={(e) => setField('state', e.target.value.toUpperCase().slice(0, 2))} className={inputCls + ' uppercase'} />
            </Field>
            <Field label="ZIP" required source={sourceMap.zip}>
              <input type="text" inputMode="numeric" maxLength={10} value={values.zip} onChange={(e) => setField('zip', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>

        <fieldset>
          <legend className="block text-sm font-semibold text-slate-700 mb-2">Filing status</legend>
          <div className="grid sm:grid-cols-3 gap-2">
            {([
              ['single_or_mfs', 'Single or Married filing separately'],
              ['married_filing_jointly', 'Married filing jointly or Qualifying surviving spouse'],
              ['head_of_household', 'Head of household'],
            ] as const).map(([val, label]) => (
              <label
                key={val}
                className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  values.filing_status === val
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio" name="filing_status" value={val}
                  checked={values.filing_status === val}
                  onChange={() => setField('filing_status', val)}
                  className="mt-0.5 accent-emerald-600"
                />
                <span className="text-xs font-medium text-slate-700 leading-snug">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section title="Step 2 — Multiple jobs or spouse works (optional)">
        <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 cursor-pointer">
          <input
            type="checkbox" checked={values.multiple_jobs_or_spouse_works}
            onChange={(e) => setField('multiple_jobs_or_spouse_works', e.target.checked)}
            className="mt-0.5 accent-emerald-600"
          />
          <span className="text-sm text-slate-700">
            I hold more than one job at a time, <strong>or</strong> my spouse also works and we file jointly. (Check this so the correct amount of tax is withheld.)
          </span>
        </label>
      </Section>

      <Section title="Step 3 — Dependents (optional)" subtitle="Only complete if you expect to claim dependents on your federal return.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Qualifying children under 17 × $2,000">
            <CurrencyInput value={values.dependents_under_17_credit} onChange={(v) => setField('dependents_under_17_credit', v)} />
          </Field>
          <Field label="Other dependents × $500">
            <CurrencyInput value={values.other_dependents_credit} onChange={(v) => setField('other_dependents_credit', v)} />
          </Field>
        </div>
      </Section>

      <Section title="Step 4 — Other adjustments (optional)">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="(a) Other income (not from jobs)">
            <CurrencyInput value={values.other_income} onChange={(v) => setField('other_income', v)} />
          </Field>
          <Field label="(b) Deductions (above standard deduction)">
            <CurrencyInput value={values.deductions} onChange={(v) => setField('deductions', v)} />
          </Field>
          <Field label="(c) Extra withholding per pay period">
            <CurrencyInput value={values.extra_withholding} onChange={(v) => setField('extra_withholding', v)} />
          </Field>
        </div>
      </Section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Shared inputs used across all forms in this directory.
// ─────────────────────────────────────────────────────────────────────

export const inputCls =
  'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all'

export function Field({
  label, required, source, children,
}: { label: string; required?: boolean; source?: PrefillData['source_map'][string]; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {source && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 bg-violet-100/60 px-1.5 py-0.5 rounded">
            <Sparkles className="w-2.5 h-2.5" />
            {source === 'driver_license' ? 'From your DL' :
             source === 'ssn_card' ? 'From your SSN card' :
             source === 'application' ? 'From your application' :
             source === 'employee_profile' ? 'From your profile' : 'Pre-filled'}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export function CurrencyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
      <input
        type="text" inputMode="decimal" placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        className={inputCls + ' pl-7'}
      />
    </div>
  )
}
