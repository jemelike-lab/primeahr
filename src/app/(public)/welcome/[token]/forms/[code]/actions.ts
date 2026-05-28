'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateToken } from '@/lib/tokens'
import { getFormMeta, type FormCode } from '@/lib/forms/registry'

export interface SubmitResult {
  ok?: boolean
  documentId?: string
  error?: string
}

interface SubmitInput {
  token: string
  code: FormCode
  form_values: Record<string, any>
  signature: { image: string; type: 'drawn' | 'typed' | 'uploaded'; hash: string }
}

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024 // 2MB

function isPlainObject(v: any): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export async function submitForm(input: SubmitInput): Promise<SubmitResult> {
  const { token, code, form_values, signature } = input

  if (!token) return { error: 'Missing token.' }
  const meta = getFormMeta(code)
  if (!meta) return { error: 'Unknown form.' }
  if (!isPlainObject(form_values)) return { error: 'Invalid form data.' }
  if (!signature?.image || !signature.hash) return { error: 'Please apply your signature.' }
  if (signature.image.length > MAX_SIGNATURE_BYTES * 1.4) return { error: 'Signature image too large.' }
  if (!['drawn', 'typed', 'uploaded'].includes(signature.type)) return { error: 'Invalid signature type.' }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const ua = h.get('user-agent') ?? undefined

  const tokenRow = await validateToken(token, 'onboarding', ip ?? undefined, ua)
  if (!tokenRow || !tokenRow.employee_id) {
    return { error: 'Your magic link has expired. Contact hr@beatricelovingheart.com for a new one.' }
  }

  const supabase = createAdminClient()
  const employeeId = tokenRow.employee_id
  const nowIso = new Date().toISOString()

  // Persist signature image to private bucket
  const sigPath = `${employeeId}/signatures/${meta.code}-${Date.now()}.png`
  try {
    const base64 = signature.image.replace(/^data:image\/png;base64,/, '')
    const sigBuffer = Buffer.from(base64, 'base64')
    if (sigBuffer.byteLength > MAX_SIGNATURE_BYTES) return { error: 'Signature image too large.' }
    const { error: sigErr } = await supabase.storage
      .from('signatures')
      .upload(sigPath, sigBuffer, { contentType: 'image/png', upsert: false })
    if (sigErr) return { error: 'Could not save signature. Please try again.' }
  } catch {
    return { error: 'Could not process signature image.' }
  }

  // Persist form receipt (the signed payload) to employee-documents bucket
  const receipt = {
    form_code: meta.code,
    form_name: meta.name,
    display_title: meta.display_title,
    agency: meta.agency,
    employee_id: employeeId,
    submitted_at: nowIso,
    submitter_ip: ip,
    submitter_user_agent: ua ?? null,
    values: form_values,
    signature: {
      type: signature.type,
      hash: signature.hash,
      storage_path: sigPath,
      applied_at: nowIso,
    },
    legal_attestation:
      'By applying my signature above I declare under penalties of perjury that the information ' +
      'I have provided on this form is true, correct, and complete to the best of my knowledge.',
    schema_version: 1,
  }

  const receiptPath = `${employeeId}/forms/${meta.code}-${Date.now()}.json`
  const { error: receiptErr } = await supabase.storage
    .from('employee-documents')
    .upload(receiptPath, Buffer.from(JSON.stringify(receipt, null, 2)), {
      contentType: 'application/json',
      upsert: false,
    })
  if (receiptErr) return { error: 'Could not save form receipt. Please try again.' }

  // Version handling: bump if this form already exists for the employee
  const { data: existing } = await supabase
    .from('employee_documents')
    .select('id, version')
    .eq('employee_id', employeeId)
    .eq('name', meta.name)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = existing?.version ? Number(existing.version) + 1 : 1

  const row = {
    employee_id: employeeId,
    name: meta.name,
    category: 'fillable_form' as const,
    status: 'approved' as const, // user-attested; HR can revoke if needed
    file_name: `${meta.code}-receipt-v${nextVersion}.json`,
    file_mime_type: 'application/json',
    storage_path: receiptPath,
    form_data: receipt,
    version: nextVersion,
    previous_version_id: existing?.id ?? null,
    uploaded_at: nowIso,
    reviewed_at: nowIso,
    effective_date: nowIso.slice(0, 10),
    updated_at: nowIso,
  }

  const { data: doc, error: docErr } = await supabase
    .from('employee_documents')
    .insert(row)
    .select('id')
    .single()
  if (docErr || !doc) return { error: 'Could not save form record. Please try again.' }

  // Best-effort audit log; failures here don't break the user flow
  try {
    await supabase.from('activity_log').insert({
      entity_type: 'employee_document',
      entity_id: doc.id,
      action: 'form_submitted',
      actor_type: 'candidate',
      actor_id: employeeId,
      metadata: { form_code: meta.code, form_name: meta.name, version: nextVersion, ip, user_agent: ua ?? null },
      created_at: nowIso,
    })
  } catch { /* non-fatal */ }

  return { ok: true, documentId: doc.id }
}
