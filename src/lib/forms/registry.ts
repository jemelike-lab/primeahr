export type FormCode = 'w4' | 'mw507' | 'direct-deposit'

export interface FormMeta {
  code: FormCode
  name: string                  // matches employee_documents.name from BLH_DEFAULT_DOCS
  display_title: string
  subtitle: string
  agency: string                // "IRS", "State of Maryland", "Internal"
  estimated_minutes: number
}

export const FORM_REGISTRY: Record<FormCode, FormMeta> = {
  'w4': {
    code: 'w4',
    name: 'W-4 (Federal tax)',
    display_title: 'Federal Form W-4',
    subtitle: "Employee's Withholding Certificate",
    agency: 'Internal Revenue Service',
    estimated_minutes: 3,
  },
  'mw507': {
    code: 'mw507',
    name: 'Maryland MW-507 (State tax)',
    display_title: 'Maryland Form MW-507',
    subtitle: "Employee's Maryland Withholding Exemption Certificate",
    agency: 'Comptroller of Maryland',
    estimated_minutes: 3,
  },
  'direct-deposit': {
    code: 'direct-deposit',
    name: 'Direct deposit authorization',
    display_title: 'Direct Deposit Authorization',
    subtitle: 'Authorize Beatrice Loving Heart to deposit your paycheck',
    agency: 'Beatrice Loving Heart (Internal)',
    estimated_minutes: 2,
  },
}

export function getFormMeta(code: string): FormMeta | null {
  return FORM_REGISTRY[code as FormCode] ?? null
}

// Maps from employee_documents.name back to a form code (for the welcome page link).
export function getFormCodeForDocName(docName: string): FormCode | null {
  const norm = docName.toLowerCase()
  if (/w-?4/.test(norm) && !/mw/.test(norm)) return 'w4'
  if (/mw-?507/.test(norm) || /maryland.*(mw|withhold)/i.test(norm)) return 'mw507'
  if (/direct.*deposit/.test(norm)) return 'direct-deposit'
  return null
}
