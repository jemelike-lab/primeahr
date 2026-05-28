'use client'

import type { PrefillData } from '@/lib/forms/prefill'
import { Field, Section, inputCls } from './W4Fields'

export interface DirectDepositValues {
  account_holder_name: string
  bank_name: string
  account_type: 'checking' | 'savings'
  routing_number: string
  account_number: string
  account_number_confirm: string
  deposit_allocation: 'full' | 'fixed_amount' | 'percentage'
  fixed_amount: string
  percentage: string
  acknowledged_risk: boolean
}

export function directDepositDefaults(p: PrefillData): DirectDepositValues {
  const fullName = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ').trim()
  return {
    account_holder_name: fullName,
    bank_name: '',
    account_type: 'checking',
    routing_number: '',
    account_number: '',
    account_number_confirm: '',
    deposit_allocation: 'full',
    fixed_amount: '',
    percentage: '',
    acknowledged_risk: false,
  }
}

// ABA routing number checksum (Luhn-like, multiplier pattern 3-7-1)
function validRoutingNumber(rn: string): boolean {
  if (!/^\d{9}$/.test(rn)) return false
  const d = rn.split('').map(Number)
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + 1 * (d[2] + d[5] + d[8])
  return sum % 10 === 0
}

export function validateDirectDeposit(v: DirectDepositValues): string | null {
  if (!v.account_holder_name.trim()) return 'Account holder name is required.'
  if (!v.bank_name.trim()) return 'Bank name is required.'
  if (!validRoutingNumber(v.routing_number)) return 'Routing number must be exactly 9 digits and pass the ABA checksum.'
  if (!/^\d{4,17}$/.test(v.account_number)) return 'Account number must be 4–17 digits.'
  if (v.account_number !== v.account_number_confirm) return 'Account numbers do not match — please re-type to confirm.'
  if (v.deposit_allocation === 'fixed_amount') {
    const amt = Number(v.fixed_amount)
    if (!Number.isFinite(amt) || amt <= 0) return 'Enter a fixed amount greater than $0.'
  }
  if (v.deposit_allocation === 'percentage') {
    const pct = Number(v.percentage)
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return 'Percentage must be between 1 and 100.'
  }
  if (!v.acknowledged_risk) return 'You must acknowledge the authorization terms to continue.'
  return null
}

interface Props {
  values: DirectDepositValues
  setField: <T = any>(key: string, val: T) => void
  sourceMap: PrefillData['source_map']
}

export function DirectDepositFields({ values, setField, sourceMap }: Props) {
  const showAcctMismatch =
    values.account_number_confirm.length > 0 &&
    values.account_number !== values.account_number_confirm

  return (
    <div className="space-y-7">
      <Section title="Account holder" subtitle="The name on the bank account that will receive your paychecks.">
        <Field label="Account holder full name" required source={sourceMap.first_name}>
          <input
            type="text"
            value={values.account_holder_name}
            onChange={(e) => setField('account_holder_name', e.target.value)}
            className={inputCls}
          />
          <p className="text-[11px] text-slate-400 mt-1.5">
            Must match the name on your bank account exactly, or the deposit will be returned.
          </p>
        </Field>
      </Section>

      <Section title="Bank account details" subtitle="Find these on a printed check or in your banking app.">
        <Field label="Bank name" required>
          <input
            type="text" placeholder="e.g. Bank of America"
            value={values.bank_name}
            onChange={(e) => setField('bank_name', e.target.value)}
            className={inputCls}
          />
        </Field>

        <fieldset>
          <legend className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Account type</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {(['checking', 'savings'] as const).map((t) => (
              <label
                key={t}
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer capitalize transition-all ${
                  values.account_type === t
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio" name="account_type" value={t}
                  checked={values.account_type === t}
                  onChange={() => setField('account_type', t)}
                  className="accent-emerald-600"
                />
                <span className="text-sm font-medium text-slate-700">{t}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Routing number (9 digits)" required>
          <input
            type="text" inputMode="numeric" maxLength={9} placeholder="••• ••• •••"
            value={values.routing_number}
            onChange={(e) => setField('routing_number', e.target.value.replace(/\D/g, '').slice(0, 9))}
            className={inputCls + ' font-mono tracking-wider max-w-[260px]'}
          />
          {values.routing_number.length === 9 && !validRoutingNumber(values.routing_number) && (
            <p className="text-[11px] text-red-600 mt-1.5">Routing number does not pass the ABA checksum — please double-check.</p>
          )}
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Account number" required>
            <input
              type="text" inputMode="numeric" maxLength={17}
              value={values.account_number}
              onChange={(e) => setField('account_number', e.target.value.replace(/\D/g, '').slice(0, 17))}
              className={inputCls + ' font-mono tracking-wider'}
            />
          </Field>
          <Field label="Confirm account number" required>
            <input
              type="text" inputMode="numeric" maxLength={17}
              value={values.account_number_confirm}
              onChange={(e) => setField('account_number_confirm', e.target.value.replace(/\D/g, '').slice(0, 17))}
              className={inputCls + ' font-mono tracking-wider ' + (showAcctMismatch ? 'border-red-400 focus:ring-red-500/30' : '')}
            />
            {showAcctMismatch && <p className="text-[11px] text-red-600 mt-1.5">Account numbers don&apos;t match.</p>}
          </Field>
        </div>
      </Section>

      <Section title="How much to deposit" subtitle="Most people deposit their full paycheck into one account.">
        <div className="space-y-2">
          {([
            ['full', 'Full net amount', 'Deposit my entire paycheck after taxes and deductions to this account.'],
            ['fixed_amount', 'Fixed dollar amount', 'Deposit a specific dollar amount per paycheck; the rest goes elsewhere.'],
            ['percentage', 'Percentage of net', 'Deposit a percentage of my net paycheck (e.g. 50%).'],
          ] as const).map(([val, label, desc]) => (
            <label
              key={val}
              className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                values.deposit_allocation === val
                  ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio" name="deposit_allocation" value={val}
                checked={values.deposit_allocation === val}
                onChange={() => setField('deposit_allocation', val)}
                className="mt-0.5 accent-emerald-600"
              />
              <div>
                <div className="text-sm font-semibold text-slate-800">{label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
              </div>
            </label>
          ))}
        </div>

        {values.deposit_allocation === 'fixed_amount' && (
          <Field label="Fixed amount per pay period">
            <div className="relative max-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="text" inputMode="decimal"
                value={values.fixed_amount}
                onChange={(e) => setField('fixed_amount', e.target.value.replace(/[^\d.]/g, ''))}
                className={inputCls + ' pl-7'}
              />
            </div>
          </Field>
        )}
        {values.deposit_allocation === 'percentage' && (
          <Field label="Percentage of net pay">
            <div className="relative max-w-[140px]">
              <input
                type="text" inputMode="decimal"
                value={values.percentage}
                onChange={(e) => setField('percentage', e.target.value.replace(/[^\d.]/g, ''))}
                className={inputCls + ' pr-7'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </Field>
        )}
      </Section>

      <Section title="Authorization">
        <label className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/60 border border-amber-200 cursor-pointer">
          <input
            type="checkbox" checked={values.acknowledged_risk}
            onChange={(e) => setField('acknowledged_risk', e.target.checked)}
            className="mt-0.5 accent-emerald-600"
          />
          <span className="text-xs text-slate-700 leading-relaxed">
            I authorize Beatrice Loving Heart to deposit my net paycheck to the account specified above
            by electronic funds transfer. I understand this authorization remains in effect until I revoke
            it in writing, and I am responsible for keeping my account information current. If funds are
            ever deposited in error, I authorize the company to reverse the entry as permitted by NACHA rules.
          </span>
        </label>
      </Section>
    </div>
  )
}
