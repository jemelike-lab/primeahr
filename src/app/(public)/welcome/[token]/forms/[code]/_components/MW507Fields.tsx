'use client'

import type { PrefillData } from '@/lib/forms/prefill'
import { Field, Section, inputCls } from './W4Fields'

export interface MW507Values {
  first_name: string
  middle_name: string
  last_name: string
  ssn_last_4: string
  address_line1: string
  city: string
  state: string
  zip: string
  county_of_residence: string
  total_exemptions: string
  additional_withholding: string
  exemption_reason:
    | 'none'
    | 'pa_resident'
    | 'wv_va_resident'
    | 'wv_resident_commuter'
    | 'military_spouse_relief'
    | 'exempt_no_tax_liability'
}

const MD_COUNTIES = [
  'Allegany', 'Anne Arundel', 'Baltimore City', 'Baltimore County',
  'Calvert', 'Caroline', 'Carroll', 'Cecil', 'Charles', 'Dorchester',
  'Frederick', 'Garrett', 'Harford', 'Howard', 'Kent', 'Montgomery',
  "Prince George's", "Queen Anne's", "St. Mary's", 'Somerset', 'Talbot',
  'Washington', 'Wicomico', 'Worcester',
]

export function mw507Defaults(p: PrefillData): MW507Values {
  return {
    first_name: p.first_name,
    middle_name: p.middle_name,
    last_name: p.last_name,
    ssn_last_4: p.ssn_last_4,
    address_line1: p.address_line1,
    city: p.city,
    state: p.state || 'MD',
    zip: p.zip,
    county_of_residence: '',
    total_exemptions: '1',
    additional_withholding: '',
    exemption_reason: 'none',
  }
}

export function validateMW507(v: MW507Values): string | null {
  if (!v.first_name.trim()) return 'First name is required.'
  if (!v.last_name.trim()) return 'Last name is required.'
  if (!/^\d{4}$/.test(v.ssn_last_4)) return 'Enter the last 4 digits of your SSN.'
  if (!v.address_line1.trim()) return 'Street address is required.'
  if (!v.city.trim()) return 'City is required.'
  if (!/^[A-Z]{2}$/i.test(v.state.trim())) return 'State must be a 2-letter code.'
  if (!/^\d{5}(-\d{4})?$/.test(v.zip.trim())) return 'ZIP code looks invalid.'
  if (v.state.toUpperCase() === 'MD' && !v.county_of_residence) {
    return 'Maryland residents must select a county of residence.'
  }
  const exemptions = Number(v.total_exemptions)
  if (!Number.isFinite(exemptions) || exemptions < 0 || exemptions > 99) {
    return 'Total exemptions must be a number between 0 and 99.'
  }
  return null
}

interface Props {
  values: MW507Values
  setField: <T = any>(key: string, val: T) => void
  sourceMap: PrefillData['source_map']
}

export function MW507Fields({ values, setField, sourceMap }: Props) {
  return (
    <div className="space-y-7">
      <Section title="Personal information" subtitle="Your legal name and address as filed with the Comptroller of Maryland.">
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

        <Field label="Social Security number (last 4 digits)" required source={sourceMap.ssn_last_4}>
          <input
            type="text" inputMode="numeric" maxLength={4} placeholder="••••"
            value={values.ssn_last_4}
            onChange={(e) => setField('ssn_last_4', e.target.value.replace(/\D/g, '').slice(0, 4))}
            className={inputCls + ' max-w-[140px] tracking-[0.3em] font-mono'}
          />
        </Field>

        <Field label="Street address" required source={sourceMap.address_line1}>
          <input type="text" value={values.address_line1} onChange={(e) => setField('address_line1', e.target.value)} className={inputCls} />
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

        {values.state.toUpperCase() === 'MD' && (
          <Field label="Maryland county of residence" required>
            <select
              value={values.county_of_residence}
              onChange={(e) => setField('county_of_residence', e.target.value)}
              className={inputCls}
            >
              <option value="">— Select county —</option>
              {MD_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5">Maryland charges a local income tax that varies by county.</p>
          </Field>
        )}
      </Section>

      <Section title="Withholding" subtitle="How much Maryland income tax should be withheld from each paycheck.">
        <Field label="Total number of exemptions you are claiming" required>
          <input
            type="text" inputMode="numeric"
            value={values.total_exemptions}
            onChange={(e) => setField('total_exemptions', e.target.value.replace(/\D/g, '').slice(0, 2))}
            className={inputCls + ' max-w-[100px]'}
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            Most people claim <strong>1</strong> for themselves; add <strong>1</strong> per dependent. Claiming <strong>0</strong> withholds the most tax.
          </p>
        </Field>

        <Field label="Additional Maryland tax to withhold per pay period (optional)">
          <div className="relative max-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="text" inputMode="decimal" placeholder="0"
              value={values.additional_withholding}
              onChange={(e) => setField('additional_withholding', e.target.value.replace(/[^\d.]/g, ''))}
              className={inputCls + ' pl-7'}
            />
          </div>
        </Field>
      </Section>

      <Section title="Exemption from withholding (optional)" subtitle="Most employees skip this. Only claim if one of these clearly applies.">
        <div className="space-y-2">
          {([
            ['none', 'I am not claiming an exemption — use the withholding above.'],
            ['pa_resident', 'I am a resident of Pennsylvania employed in Maryland (reciprocal agreement).'],
            ['wv_va_resident', 'I am a resident of Virginia or West Virginia and commute daily.'],
            ['wv_resident_commuter', 'I live in West Virginia and commute daily to Maryland.'],
            ['military_spouse_relief', 'I am a military spouse claiming exemption under the Military Spouses Residency Relief Act.'],
            ['exempt_no_tax_liability', 'I had no Maryland tax liability last year and expect none this year.'],
          ] as const).map(([val, label]) => (
            <label
              key={val}
              className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                values.exemption_reason === val
                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio" name="exemption_reason" value={val}
                checked={values.exemption_reason === val}
                onChange={() => setField('exemption_reason', val)}
                className="mt-0.5 accent-emerald-600"
              />
              <span className="text-xs text-slate-700 leading-snug">{label}</span>
            </label>
          ))}
        </div>
      </Section>
    </div>
  )
}
