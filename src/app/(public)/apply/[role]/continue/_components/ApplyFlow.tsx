'use client'
import { useState, useTransition } from 'react'
import { SignaturePad } from '@/components/signature-pad'
import { saveApplyStep, submitApplication } from '../actions'
import {
  Briefcase, GraduationCap, Users, Heart, Scale, FileSignature,
  ShieldCheck, ClipboardList, ChevronLeft, ChevronRight, Pencil, Check, AlertCircle,
} from 'lucide-react'

// ===== Types =====
interface Props {
  token: string
  role: { slug: string; name: string }
  candidate: { firstName: string; lastName: string; email: string }
  initialStep: number
  maxCompleted: number
  totalSteps: number
  formData: Record<string, any>
  resumeFilename: string | null
}

const STEPS = [
  { n: 1, title: 'Contact',           icon: ClipboardList },
  { n: 2, title: 'Experience',        icon: Briefcase     },
  { n: 3, title: 'Education',         icon: GraduationCap },
  { n: 4, title: 'References',        icon: Users         },
  { n: 5, title: 'Voluntary Self-ID', icon: Heart         },
  { n: 6, title: 'Disclosures',       icon: Scale         },
  { n: 7, title: 'Sign & certify',    icon: FileSignature },
  { n: 8, title: 'Review & submit',   icon: ShieldCheck   },
] as const

// ===== Shared form primitives =====
const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white'

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  )
}

function RadioGroup({ name, value, onChange, options }: { name: string; value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.v
        return (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            className={`text-sm font-medium px-4 py-2 rounded-xl border transition ${on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'}`}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function ChipMulti({ value, onChange, options }: { value: string[]; onChange: (v: string[]) => void; options: { v: string; label: string }[] }) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.v)
        return (
          <button key={o.v} type="button" onClick={() => toggle(o.v)}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition ${on ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}>
            {on && <Check className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />}{o.label}
          </button>
        )
      })}
    </div>
  )
}

function StepActions({ onBack, onSave, pending, label = 'Save & continue', disabled = false }: { onBack?: () => void; onSave: () => void; pending: boolean; label?: string; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
      {onBack ? (
        <button type="button" onClick={onBack} disabled={pending} className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50">
          <ChevronLeft className="w-4 h-4" />Back
        </button>
      ) : <span />}
      <button type="button" onClick={onSave} disabled={pending || disabled}
        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition">
        {pending ? 'Saving…' : label}{!pending && <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  )
}

function ValidationError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl text-sm flex items-start gap-2 mt-4">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{msg}</span>
    </div>
  )
}

// ===== Step 2 — Experience =====
function Step2({ initial, onBack, onSave, pending }: any) {
  const [d, setD] = useState({
    currently_employed: '', current_employer: '', current_title: '',
    start_year: '', end_year: '', years_of_experience: '',
    prior_case_management: '', populations_served: [] as string[],
    description: '', ...(initial || {}),
  })
  const [err, setErr] = useState<string | undefined>()
  function set<K extends keyof typeof d>(k: K, v: any) { setD((p: any) => ({ ...p, [k]: v })) }
  function submit() {
    if (!d.currently_employed) return setErr('Tell us if you&apos;re currently employed.')
    if (d.currently_employed === 'yes' && (!d.current_employer || !d.current_title)) return setErr('Please share your current employer and title.')
    if (!d.years_of_experience) return setErr('How many years of relevant experience?')
    if (!d.prior_case_management) return setErr('Have you worked in case management or social services before?')
    if (d.prior_case_management === 'yes' && d.populations_served.length === 0) return setErr('Pick at least one population you&apos;ve served.')
    setErr(undefined); onSave(d)
  }
  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Step 2 of 8</div>
        <h2 className="text-2xl font-bold text-slate-900">Your experience</h2>
        <p className="text-slate-500 text-sm mt-1">Tell us about your work background. Case management experience is helpful but not required.</p>
      </div>
      <div className="space-y-5">
        <Field label="Are you currently employed?" required>
          <RadioGroup name="ce" value={d.currently_employed} onChange={(v) => set('currently_employed', v)} options={[{ v: 'yes', label: 'Yes' }, { v: 'no', label: 'No' }]} />
        </Field>
        {d.currently_employed === 'yes' && (
          <div className="grid sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
            <Field label="Current employer" required>
              <input className={inputCls} value={d.current_employer} onChange={(e) => set('current_employer', e.target.value)} />
            </Field>
            <Field label="Job title" required>
              <input className={inputCls} value={d.current_title} onChange={(e) => set('current_title', e.target.value)} />
            </Field>
            <Field label="Start year" hint="e.g. 2021">
              <input className={inputCls} inputMode="numeric" maxLength={4} value={d.start_year} onChange={(e) => set('start_year', e.target.value.replace(/\D/g, ''))} />
            </Field>
            <Field label="End year" hint="Leave blank if still there">
              <input className={inputCls} inputMode="numeric" maxLength={4} value={d.end_year} onChange={(e) => set('end_year', e.target.value.replace(/\D/g, ''))} />
            </Field>
          </div>
        )}
        <Field label="Years of relevant experience" required>
          <RadioGroup name="yoe" value={d.years_of_experience} onChange={(v) => set('years_of_experience', v)} options={[
            { v: 'lt1', label: '< 1 yr' }, { v: '1-2', label: '1-2 yrs' }, { v: '3-5', label: '3-5 yrs' }, { v: '5-10', label: '5-10 yrs' }, { v: '10+', label: '10+ yrs' },
          ]} />
        </Field>
        <Field label="Have you held a case management or social services role before?" required>
          <RadioGroup name="pcm" value={d.prior_case_management} onChange={(v) => set('prior_case_management', v)} options={[{ v: 'yes', label: 'Yes' }, { v: 'no', label: 'No' }]} />
        </Field>
        {d.prior_case_management === 'yes' && (
          <Field label="Populations you&apos;ve served" required hint="Select all that apply">
            <ChipMulti value={d.populations_served} onChange={(v) => set('populations_served', v)} options={[
              { v: 'developmental_disabilities', label: 'Developmental disabilities' },
              { v: 'elderly',                    label: 'Older adults' },
              { v: 'mental_health',              label: 'Mental health' },
              { v: 'youth',                      label: 'Children & youth' },
              { v: 'other',                      label: 'Other' },
            ]} />
          </Field>
        )}
        <Field label="Brief description of your relevant work" hint="2-4 sentences. Optional but helpful.">
          <textarea rows={4} className={inputCls} value={d.description} onChange={(e) => set('description', e.target.value)} maxLength={500} />
        </Field>
      </div>
      <ValidationError msg={err} />
      <StepActions onBack={onBack} onSave={submit} pending={pending} />
    </div>
  )
}

// ===== Step 3 — Education =====
function Step3({ initial, onBack, onSave, pending }: any) {
  const [d, setD] = useState({
    highest_degree: '', field_of_study: '', school_name: '', graduation_year: '',
    certifications: [] as string[], additional_notes: '', ...(initial || {}),
  })
  const [err, setErr] = useState<string | undefined>()
  function set<K extends keyof typeof d>(k: K, v: any) { setD((p: any) => ({ ...p, [k]: v })) }
  function submit() {
    if (!d.highest_degree) return setErr('Pick your highest degree.')
    if (!d.school_name) return setErr('Where did you study?')
    if (!d.graduation_year || d.graduation_year.length !== 4) return setErr('Graduation year should be 4 digits.')
    setErr(undefined); onSave(d)
  }
  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Step 3 of 8</div>
        <h2 className="text-2xl font-bold text-slate-900">Education</h2>
        <p className="text-slate-500 text-sm mt-1">Most case management roles at BLH require a bachelor&apos;s degree. Certifications are a plus, not required.</p>
      </div>
      <div className="space-y-5">
        <Field label="Highest degree completed" required>
          <select className={inputCls} value={d.highest_degree} onChange={(e) => set('highest_degree', e.target.value)}>
            <option value="">Select a degree…</option>
            <option value="high_school">High school / GED</option>
            <option value="associates">Associate&apos;s degree</option>
            <option value="bachelors">Bachelor&apos;s degree</option>
            <option value="masters">Master&apos;s degree</option>
            <option value="doctorate">Doctorate</option>
          </select>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Field of study" hint="e.g. Social Work, Psychology">
            <input className={inputCls} value={d.field_of_study} onChange={(e) => set('field_of_study', e.target.value)} />
          </Field>
          <Field label="School / institution" required>
            <input className={inputCls} value={d.school_name} onChange={(e) => set('school_name', e.target.value)} />
          </Field>
          <Field label="Graduation year" required>
            <input className={inputCls} inputMode="numeric" maxLength={4} value={d.graduation_year} onChange={(e) => set('graduation_year', e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>
        <Field label="Certifications" hint="Optional. Select any you currently hold.">
          <ChipMulti value={d.certifications} onChange={(v) => set('certifications', v)} options={[
            { v: 'PCT', label: 'PCT (Person-Centered Thinking)' },
            { v: 'CCM', label: 'CCM (Certified Case Manager)' },
            { v: 'MSW', label: 'MSW (Master of Social Work)' },
            { v: 'LCSW', label: 'LCSW' },
            { v: 'LGSW', label: 'LGSW' },
            { v: 'none', label: 'None' },
          ]} />
        </Field>
        <Field label="Anything else we should know?" hint="Optional">
          <textarea rows={3} className={inputCls} value={d.additional_notes} onChange={(e) => set('additional_notes', e.target.value)} maxLength={400} />
        </Field>
      </div>
      <ValidationError msg={err} />
      <StepActions onBack={onBack} onSave={submit} pending={pending} />
    </div>
  )
}

// ===== Step 4 — References =====
function Step4({ initial, onBack, onSave, pending }: any) {
  const empty = { name: '', relationship: '', phone: '', email: '' }
  const [refs, setRefs] = useState<any[]>(initial?.references ?? [empty, empty, empty])
  const [err, setErr] = useState<string | undefined>()
  function update(i: number, k: string, v: string) {
    setRefs((prev) => prev.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)))
  }
  function submit() {
    const complete = refs.filter((r) => r.name && (r.phone || r.email))
    if (complete.length < 2) return setErr('We need at least 2 references with a name and phone or email.')
    setErr(undefined); onSave({ references: refs })
  }
  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Step 4 of 8</div>
        <h2 className="text-2xl font-bold text-slate-900">Professional references</h2>
        <p className="text-slate-500 text-sm mt-1">References will not be contacted unless we move forward to an offer. We ask for 3 — at least 2 must be complete.</p>
      </div>
      <div className="space-y-4">
        {refs.map((r, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-xl">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Reference {i + 1}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Full name"><input className={inputCls} value={r.name} onChange={(e) => update(i, 'name', e.target.value)} /></Field>
              <Field label="Relationship" hint="e.g. Former supervisor"><input className={inputCls} value={r.relationship} onChange={(e) => update(i, 'relationship', e.target.value)} /></Field>
              <Field label="Phone"><input className={inputCls} type="tel" value={r.phone} onChange={(e) => update(i, 'phone', e.target.value)} /></Field>
              <Field label="Email"><input className={inputCls} type="email" value={r.email} onChange={(e) => update(i, 'email', e.target.value)} /></Field>
            </div>
          </div>
        ))}
      </div>
      <ValidationError msg={err} />
      <StepActions onBack={onBack} onSave={submit} pending={pending} />
    </div>
  )
}

// ===== Step 5 — Voluntary Self-ID =====
function Step5({ initial, onBack, onSave, pending }: any) {
  const [d, setD] = useState({
    gender: 'prefer_not_to_say',
    ethnicity: 'prefer_not_to_say',
    veteran_status: 'prefer_not_to_say',
    disability_status: 'prefer_not_to_say',
    ...(initial || {}),
  })
  function set<K extends keyof typeof d>(k: K, v: any) { setD((p: any) => ({ ...p, [k]: v })) }
  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Step 5 of 8</div>
        <h2 className="text-2xl font-bold text-slate-900">Voluntary self-identification</h2>
        <p className="text-slate-500 text-sm mt-1">These questions help us meet federal EEO reporting requirements. <strong>All answers are voluntary</strong> and will not affect your application.</p>
      </div>
      <div className="space-y-5">
        <Field label="Gender">
          <select className={inputCls} value={d.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </Field>
        <Field label="Race / ethnicity">
          <select className={inputCls} value={d.ethnicity} onChange={(e) => set('ethnicity', e.target.value)}>
            <option value="hispanic_or_latino">Hispanic or Latino</option>
            <option value="white">White (not Hispanic or Latino)</option>
            <option value="black_or_african_american">Black or African American (not Hispanic or Latino)</option>
            <option value="asian">Asian (not Hispanic or Latino)</option>
            <option value="native_hawaiian_or_pacific_islander">Native Hawaiian or Other Pacific Islander</option>
            <option value="american_indian_or_alaska_native">American Indian or Alaska Native</option>
            <option value="two_or_more_races">Two or more races</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </Field>
        <Field label="Veteran status">
          <select className={inputCls} value={d.veteran_status} onChange={(e) => set('veteran_status', e.target.value)}>
            <option value="not_veteran">I am not a protected veteran</option>
            <option value="protected_veteran">I identify as a protected veteran</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </Field>
        <Field label="Disability status" hint="Under the Americans with Disabilities Act (ADA)">
          <select className={inputCls} value={d.disability_status} onChange={(e) => set('disability_status', e.target.value)}>
            <option value="yes">Yes, I have a disability (or previously had one)</option>
            <option value="no">No, I do not have a disability</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </Field>
      </div>
      <StepActions onBack={onBack} onSave={() => onSave(d)} pending={pending} />
    </div>
  )
}

// ===== Step 6 — Criminal History (MD Ban-the-Box compliant) =====
function Step6({ initial, onBack, onSave, pending }: any) {
  const [d, setD] = useState({ has_conviction: undefined as boolean | undefined, explanation: '', ...(initial || {}) })
  const [err, setErr] = useState<string | undefined>()
  function submit() {
    if (typeof d.has_conviction !== 'boolean') return setErr('Please answer the conviction question.')
    setErr(undefined); onSave(d)
  }
  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Step 6 of 8</div>
        <h2 className="text-2xl font-bold text-slate-900">Disclosures</h2>
        <p className="text-slate-500 text-sm mt-1">Maryland law lets you choose not to disclose certain records. We evaluate each application individually.</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 mb-5">
        <strong>A conviction will not automatically disqualify you</strong> from employment with Beatrice Loving Heart. We consider the nature of the offense, time elapsed, and relevance to the role.
      </div>
      <Field label="Within the last 7 years, have you been convicted of a felony? (Excluding sealed or expunged records.)" required>
        <RadioGroup name="hc" value={d.has_conviction === true ? 'yes' : d.has_conviction === false ? 'no' : ''}
          onChange={(v) => setD((p: any) => ({ ...p, has_conviction: v === 'yes' }))}
          options={[{ v: 'yes', label: 'Yes' }, { v: 'no', label: 'No' }]} />
      </Field>
      {d.has_conviction === true && (
        <Field label="Please provide a brief explanation" hint="Optional — but appreciated">
          <textarea rows={4} className={inputCls} value={d.explanation} onChange={(e) => setD((p: any) => ({ ...p, explanation: e.target.value }))} maxLength={600} />
        </Field>
      )}
      <ValidationError msg={err} />
      <StepActions onBack={onBack} onSave={submit} pending={pending} />
    </div>
  )
}

// ===== Step 7 — Sign & Certify =====
function Step7({ initial, candidateName, onBack, onSave, pending }: any) {
  const [d, setD] = useState({
    certify_accuracy: false, authorize_verification: false,
    legal_name: candidateName || '', signature_image: '', signature_type: '', signature_hash: '',
    ...(initial || {}),
  })
  const [err, setErr] = useState<string | undefined>()
  function set<K extends keyof typeof d>(k: K, v: any) { setD((p: any) => ({ ...p, [k]: v })) }
  function submit() {
    if (!d.certify_accuracy || !d.authorize_verification) return setErr('Please check both certifications.')
    if (!d.legal_name.trim()) return setErr('Type your full legal name.')
    if (!d.signature_image) return setErr('Add your signature, then tap &ldquo;Apply signature.&rdquo;')
    setErr(undefined); onSave(d)
  }
  const certifications = [
    { key: 'certify_accuracy', label: 'I certify that the information I have provided is true and complete to the best of my knowledge.' },
    { key: 'authorize_verification', label: 'I authorize Beatrice Loving Heart to verify any information in this application, including contacting previous employers and references.' },
  ] as const
  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Step 7 of 8</div>
        <h2 className="text-2xl font-bold text-slate-900">Sign &amp; certify</h2>
        <p className="text-slate-500 text-sm mt-1">A few certifications, then your signature. We record the date, time, IP, and device for legal authenticity.</p>
      </div>

      <div className="space-y-3 mb-5">
        {certifications.map((c) => (
          <label key={c.key} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
            <input type="checkbox" checked={(d as any)[c.key]} onChange={(e) => set(c.key as any, e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-600 flex-shrink-0" />
            <span className="text-sm text-slate-700 leading-relaxed">{c.label}</span>
          </label>
        ))}
        <div className="text-xs text-slate-500 px-3.5">
          If hired, employment with Beatrice Loving Heart is at-will and may be terminated by either party at any time, with or without cause.
        </div>
      </div>

      <Field label="Your full legal name" required hint="Exactly as it appears on government ID">
        <input className={inputCls} value={d.legal_name} onChange={(e) => set('legal_name', e.target.value)} />
      </Field>

      <div className="mt-5">
        <span className="block text-sm font-medium text-slate-700 mb-1.5">Signature <span className="text-rose-500">*</span></span>
        {d.signature_image ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="flex-1 text-sm text-emerald-800">Signature captured ({d.signature_type}). You can re-sign if needed.</div>
            <button type="button" onClick={() => set('signature_image', '')} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900">Re-sign</button>
          </div>
        ) : (
          <SignaturePad onSave={({ image, type, hash }) => setD((p: any) => ({ ...p, signature_image: image, signature_type: type, signature_hash: hash }))} />
        )}
      </div>

      <ValidationError msg={err} />
      <StepActions onBack={onBack} onSave={submit} pending={pending} label="Save signature & continue" />
    </div>
  )
}

// ===== Step 8 — Review =====
function ReviewCard({ title, n, onEdit, children }: any) {
  return (
    <div className="bg-slate-50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">{n}</div>
          <span className="text-sm font-bold text-slate-900">{title}</span>
        </div>
        <button type="button" onClick={onEdit} className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"><Pencil className="w-3.5 h-3.5" />Edit</button>
      </div>
      <div className="text-sm text-slate-600 space-y-1">{children}</div>
    </div>
  )
}
function row(label: string, value: any) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null
  const v = Array.isArray(value) ? value.join(', ') : String(value)
  return <div><span className="text-slate-400">{label}: </span><span className="text-slate-700">{v}</span></div>
}

function Step8({ data, candidate, role, resumeFilename, onEdit, onSubmit, submitting, canSubmit }: any) {
  const s1 = data.step_1 || candidate, s2 = data.step_2 || {}, s3 = data.step_3 || {}, s4 = data.step_4 || {}
  const s5 = data.step_5 || {}, s6 = data.step_6 || {}, s7 = data.step_7 || {}
  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Step 8 of 8</div>
        <h2 className="text-2xl font-bold text-slate-900">Review &amp; submit</h2>
        <p className="text-slate-500 text-sm mt-1">Take one last look. You can edit any section — your application isn&apos;t submitted until you tap the button below.</p>
      </div>
      <div className="space-y-3">
        <ReviewCard n={1} title="Contact" onEdit={() => onEdit(1)}>
          {row('Name', `${s1.first_name || candidate.firstName} ${s1.last_name || candidate.lastName}`)}
          {row('Email', s1.email || candidate.email)}
          {row('Phone', s1.phone)}
          {row('Resume', resumeFilename)}
        </ReviewCard>
        <ReviewCard n={2} title="Experience" onEdit={() => onEdit(2)}>
          {row('Currently employed', s2.currently_employed)}
          {row('Current employer', s2.current_employer)} {row('Current title', s2.current_title)}
          {row('Years of experience', s2.years_of_experience)}
          {row('Prior case management', s2.prior_case_management)}
          {row('Populations served', s2.populations_served)}
        </ReviewCard>
        <ReviewCard n={3} title="Education" onEdit={() => onEdit(3)}>
          {row('Highest degree', s3.highest_degree)} {row('Field of study', s3.field_of_study)}
          {row('School', s3.school_name)} {row('Graduation year', s3.graduation_year)}
          {row('Certifications', s3.certifications)}
        </ReviewCard>
        <ReviewCard n={4} title="References" onEdit={() => onEdit(4)}>
          {(s4.references || []).filter((r: any) => r.name).map((r: any, i: number) => (
            <div key={i}>{i + 1}. {r.name}{r.relationship ? ` (${r.relationship})` : ''}{r.phone ? ` · ${r.phone}` : ''}{r.email ? ` · ${r.email}` : ''}</div>
          ))}
        </ReviewCard>
        <ReviewCard n={5} title="Voluntary Self-ID" onEdit={() => onEdit(5)}>
          {row('Gender', s5.gender)} {row('Ethnicity', s5.ethnicity)}
          {row('Veteran status', s5.veteran_status)} {row('Disability', s5.disability_status)}
        </ReviewCard>
        <ReviewCard n={6} title="Disclosures" onEdit={() => onEdit(6)}>
          {row('Felony conviction (last 7 yrs)', s6.has_conviction === true ? 'Yes' : s6.has_conviction === false ? 'No' : '—')}
        </ReviewCard>
        <ReviewCard n={7} title="Signature" onEdit={() => onEdit(7)}>
          {row('Signed as', s7.legal_name)} {row('Type', s7.signature_type)}
          {s7.signature_image && <img src={s7.signature_image} alt="signature" className="mt-2 border border-slate-200 rounded-lg bg-white p-2 max-h-24" />}
        </ReviewCard>
      </div>

      <div className="mt-6 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
        <h3 className="font-bold text-slate-900 mb-1">Ready to submit?</h3>
        <p className="text-sm text-slate-600 mb-4">By submitting, your application for <strong>{role.name}</strong> goes straight to the BLH HR team. You&apos;ll get a confirmation email.</p>
        <button type="button" onClick={onSubmit} disabled={submitting || !canSubmit}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-6 py-3 rounded-xl text-base shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
          <ShieldCheck className="w-5 h-5" />{submitting ? 'Submitting…' : 'Submit application'}
        </button>
        {!canSubmit && <p className="text-xs text-amber-700 mt-2">Finish all steps before submitting.</p>}
      </div>
    </div>
  )
}

// ===== Main Flow =====
export function ApplyFlow({ token, role, candidate, initialStep, maxCompleted, totalSteps, formData, resumeFilename }: Props) {
  const [viewed, setViewed] = useState(Math.min(Math.max(initialStep, 2), 8))
  const [maxStep, setMaxStep] = useState(maxCompleted)
  const [data, setData] = useState<Record<string, any>>({ step_1: { first_name: candidate.firstName, last_name: candidate.lastName, email: candidate.email }, ...formData })
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [, startSubmit] = useTransition()

  function navTo(n: number) {
    if (n < 1 || n > 8) return
    if (n === 1) { window.location.href = `/apply/${role.slug}` ; return }
    if (n <= maxStep + 1) { setViewed(n); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  }
  function saveAndAdvance(step: number, payload: any) {
    setError(null)
    startTransition(async () => {
      const res = await saveApplyStep(token, step, payload)
      if (res.error) { setError(res.error); return }
      setData((p) => ({ ...p, [`step_${step}`]: payload }))
      setMaxStep((m) => Math.max(m, step))
      const next = Math.min(res.nextStep ?? step + 1, 8)
      setViewed(next)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }
  function doSubmit() {
    setError(null)
    startSubmit(async () => {
      const res = await submitApplication(token)
      if (res?.error) setError(res.error)
    })
  }

  const pct = Math.round((Math.min(maxStep, 8) / 8) * 100)

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div>
        <div className="text-sm text-emerald-700 font-medium mb-1">{role.name}</div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Continue your application</h1>
        <p className="text-slate-600 text-sm">Welcome back{candidate.firstName ? `, ${candidate.firstName}` : ''}. Everything is saved — pick up where you left off.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700">Step {viewed} of 8 · {STEPS[viewed - 1].title}</span>
          <span className="text-xs font-semibold text-emerald-700">{pct}% complete</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {STEPS.map((s) => {
            const reached = s.n <= maxStep + 1
            const cur = s.n === viewed
            return (
              <button key={s.n} type="button" disabled={!reached || pending} onClick={() => navTo(s.n)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${cur ? 'bg-emerald-600 text-white' : reached ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                {s.n}. {s.title}
              </button>
            )
          })}
        </div>
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
        {viewed === 2 && <Step2 initial={data.step_2} onBack={() => navTo(1)} onSave={(d: any) => saveAndAdvance(2, d)} pending={pending} />}
        {viewed === 3 && <Step3 initial={data.step_3} onBack={() => navTo(2)} onSave={(d: any) => saveAndAdvance(3, d)} pending={pending} />}
        {viewed === 4 && <Step4 initial={data.step_4} onBack={() => navTo(3)} onSave={(d: any) => saveAndAdvance(4, d)} pending={pending} />}
        {viewed === 5 && <Step5 initial={data.step_5} onBack={() => navTo(4)} onSave={(d: any) => saveAndAdvance(5, d)} pending={pending} />}
        {viewed === 6 && <Step6 initial={data.step_6} onBack={() => navTo(5)} onSave={(d: any) => saveAndAdvance(6, d)} pending={pending} />}
        {viewed === 7 && <Step7 initial={data.step_7} candidateName={`${candidate.firstName} ${candidate.lastName}`.trim()} onBack={() => navTo(6)} onSave={(d: any) => saveAndAdvance(7, d)} pending={pending} />}
        {viewed === 8 && <Step8 data={data} candidate={candidate} role={role} resumeFilename={resumeFilename} onEdit={navTo} onSubmit={doSubmit} submitting={pending} canSubmit={maxStep >= 7} />}
      </div>

      <p className="text-xs text-slate-400 text-center">Your information is private and encrypted. We never sell or share applicant data.</p>
    </div>
  )
}
