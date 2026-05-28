'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateToken } from '@/lib/tokens'

const MAX_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
])

export interface UploadResult {
  error?: string
  documentId?: string
  storagePath?: string
  status?: string
}

function slugifyDocName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function uploadOnboardingDocument(formData: FormData): Promise<UploadResult> {
  const token = String(formData.get('token') ?? '').trim()
  const docName = String(formData.get('doc_name') ?? '').trim()
  const docCategoryRaw = String(formData.get('doc_category') ?? 'upload_required').trim()
  const file = formData.get('file')

  if (!token) return { error: 'Missing token.' }
  if (!docName) return { error: 'Missing document name.' }
  if (!(file instanceof File) || file.size === 0) return { error: 'Please select a file.' }
  if (file.size > MAX_BYTES) return { error: 'File must be 10MB or smaller.' }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return { error: 'Upload a PDF or image (JPG, PNG, WebP, HEIC).' }
  }

  const validCategories = new Set(['fillable_form', 'sign_and_scan', 'upload_required', 'system_generated'])
  const category = validCategories.has(docCategoryRaw) ? docCategoryRaw : 'upload_required'

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ua = h.get('user-agent') ?? undefined
  const tokenRow = await validateToken(token, 'onboarding', ip, ua)
  if (!tokenRow || !tokenRow.employee_id) return { error: 'Your magic link has expired. Contact hr@beatricelovingheart.com for a new one.' }

  const supabase = createAdminClient()

  // Determine version: if a row with same employee+name exists, bump version
  const { data: existing } = await supabase
    .from('employee_documents')
    .select('id, version, storage_path')
    .eq('employee_id', tokenRow.employee_id)
    .eq('name', docName)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = existing?.version ? Number(existing.version) + 1 : 1
  const ext = (() => {
    const parts = file.name.split('.')
    return parts.length > 1 ? parts.pop()!.toLowerCase() : (file.type.split('/')[1] ?? 'bin')
  })()
  const storagePath = `${tokenRow.employee_id}/${slugifyDocName(docName)}-v${nextVersion}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await supabase.storage
    .from('employee-documents')
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  if (uploadErr) return { error: 'Upload failed. Please try again.' }

  const payload = {
    employee_id: tokenRow.employee_id,
    name: docName,
    category,
    status: 'uploaded' as const,
    file_name: file.name,
    file_size_bytes: file.size,
    file_mime_type: file.type || null,
    storage_path: storagePath,
    version: nextVersion,
    previous_version_id: existing?.id ?? null,
    uploaded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  let documentId: string | undefined
  if (existing?.id && nextVersion === 1) {
    // First upload but row already exists (shouldn't happen given version=1 means no prior, but defensive)
    const { data, error } = await supabase
      .from('employee_documents')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single()
    if (error || !data) return { error: 'Could not save document record. Please try again.' }
    documentId = data.id
  } else {
    const { data, error } = await supabase
      .from('employee_documents')
      .insert(payload)
      .select('id')
      .single()
    if (error || !data) return { error: 'Could not save document record. Please try again.' }
    documentId = data.id
  }

  return { documentId, storagePath, status: 'uploaded' }
}
