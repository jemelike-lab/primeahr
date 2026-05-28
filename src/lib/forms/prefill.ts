import { createAdminClient } from '@/lib/supabase/admin'

export interface PrefillData {
  // Identity
  first_name: string
  middle_name: string
  last_name: string
  ssn_last_4: string
  date_of_birth: string
  // Contact
  email: string
  phone: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  // Sources (so UI can show "auto-filled from your driver's license" etc.)
  source_map: Record<string, 'application' | 'driver_license' | 'ssn_card' | 'employee_profile' | null>
}

const EMPTY: PrefillData = {
  first_name: '', middle_name: '', last_name: '',
  ssn_last_4: '', date_of_birth: '',
  email: '', phone: '',
  address_line1: '', address_line2: '', city: '', state: '', zip: '',
  source_map: {},
}

function pick<T>(...vals: (T | undefined | null | '')[]): T | '' {
  for (const v of vals) if (v != null && v !== '') return v
  return ''
}

/**
 * Loads everything we know about an employee from their employee row, the most-recent
 * application they completed, and any OCR'd identity documents (driver's license, SSN card).
 * Returns a unified PrefillData with a source_map so the UI can show provenance per field.
 */
export async function getPrefillData(employeeId: string): Promise<PrefillData> {
  const supabase = createAdminClient()

  const { data: emp } = await supabase
    .from('employees')
    .select('first_name, middle_name, last_name, email, phone, date_of_birth, address_line1, address_line2, city, state, zip_code')
    .eq('id', employeeId)
    .maybeSingle()

  // Match candidate by email to find the application + its form_data
  let appFormData: any = null
  if (emp?.email) {
    const { data: cand } = await supabase
      .from('candidates')
      .select('id, first_name, last_name, email, phone, city, state, zip_code')
      .eq('email', emp.email)
      .maybeSingle()
    if (cand) {
      const { data: app } = await supabase
        .from('applications')
        .select('form_data')
        .eq('candidate_id', cand.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      appFormData = app?.form_data ?? null
    }
  }

  const stepData = appFormData ?? {}
  const s1 = stepData.step_1 ?? {}
  const s2 = stepData.step_2 ?? {}
  const s5 = stepData.step_5 ?? {} // EEO often has DOB

  // Pull OCR data from any approved identity documents
  const { data: idDocs } = await supabase
    .from('employee_documents')
    .select('name, category, ocr_extracted_data, status')
    .eq('employee_id', employeeId)
    .in('status', ['approved', 'uploaded'])
    .not('ocr_extracted_data', 'is', null)

  const dl = (idDocs ?? []).find((d: any) => /driver/i.test(d.name))?.ocr_extracted_data as any
  const ssn = (idDocs ?? []).find((d: any) => /ssn|social/i.test(d.name))?.ocr_extracted_data as any

  const source_map: PrefillData['source_map'] = {}
  const mark = (k: string, src: PrefillData['source_map'][string]) => { source_map[k] = src }

  const first_name = pick(emp?.first_name, dl?.first_name, s1.first_name) as string
  if (first_name === emp?.first_name && first_name) mark('first_name', 'employee_profile')
  else if (first_name === dl?.first_name && first_name) mark('first_name', 'driver_license')
  else if (first_name) mark('first_name', 'application')

  const last_name = pick(emp?.last_name, dl?.last_name, s1.last_name) as string
  if (last_name === emp?.last_name && last_name) mark('last_name', 'employee_profile')
  else if (last_name === dl?.last_name && last_name) mark('last_name', 'driver_license')
  else if (last_name) mark('last_name', 'application')

  const middle_name = pick(dl?.middle_name, '') as string
  if (middle_name) mark('middle_name', 'driver_license')

  const email = pick(emp?.email, s1.email) as string
  if (email) mark('email', emp?.email ? 'employee_profile' : 'application')

  const phone = pick(emp?.phone, s1.phone) as string
  if (phone) mark('phone', emp?.phone ? 'employee_profile' : 'application')

  const address_line1 = pick(emp?.address_line1, dl?.address_line1, s2.address_line1, s2.address) as string
  if (address_line1) {
    if (address_line1 === emp?.address_line1) mark('address_line1', 'employee_profile')
    else if (address_line1 === dl?.address_line1) mark('address_line1', 'driver_license')
    else mark('address_line1', 'application')
  }

  const address_line2 = pick(emp?.address_line2, dl?.address_line2 ?? '') as string
  if (address_line2) mark('address_line2', emp?.address_line2 ? 'employee_profile' : 'driver_license')

  const city = pick(emp?.city, dl?.city, s2.city) as string
  if (city) mark('city', emp?.city ? 'employee_profile' : (city === dl?.city ? 'driver_license' : 'application'))

  const state = pick(emp?.state, dl?.state, s2.state, 'MD') as string
  if (state) mark('state', emp?.state ? 'employee_profile' : (state === dl?.state ? 'driver_license' : 'application'))

  const zip = pick(emp?.zip_code, dl?.zip, s2.zip) as string
  if (zip) mark('zip', emp?.zip_code ? 'employee_profile' : (zip === dl?.zip ? 'driver_license' : 'application'))

  const date_of_birth = pick(emp?.date_of_birth, dl?.date_of_birth, s5.date_of_birth) as string
  if (date_of_birth) {
    if (date_of_birth === emp?.date_of_birth) mark('date_of_birth', 'employee_profile')
    else if (date_of_birth === dl?.date_of_birth) mark('date_of_birth', 'driver_license')
    else mark('date_of_birth', 'application')
  }

  // SSN: we ONLY ever store last 4. Pull from OCR'd SSN card if available, otherwise leave blank for user to type.
  const ssn_last_4 = (ssn?.ssn_last_4 ?? ssn?.last_4 ?? '') as string
  if (ssn_last_4) mark('ssn_last_4', 'ssn_card')

  return {
    ...EMPTY,
    first_name, middle_name, last_name,
    ssn_last_4, date_of_birth,
    email, phone,
    address_line1, address_line2, city, state, zip,
    source_map,
  }
}
