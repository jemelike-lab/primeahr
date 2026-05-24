'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createToken } from '@/lib/tokens'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const MAX_RESUME_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_RESUME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export interface ApplyStep1Result {
  error?: string
}

export async function submitApplyStep1(
  formData: FormData
): Promise<ApplyStep1Result> {
  const roleSlug = String(formData.get('role_slug') ?? '').trim()
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName = String(formData.get('last_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()
  const resume = formData.get('resume')

  // Basic validation
  if (!roleSlug) return { error: 'Missing role.' }
  if (!firstName || !lastName) return { error: 'Please enter your full name.' }
  if (!EMAIL_RE.test(email)) return { error: 'Please enter a valid email.' }
  if (phone.length < 7) return { error: 'Please enter a valid phone number.' }
  if (!(resume instanceof File) || resume.size === 0) {
    return { error: 'Please attach your resume.' }
  }
  if (resume.size > MAX_RESUME_BYTES) {
    return { error: 'Resume must be 5MB or smaller.' }
  }
  if (resume.type && !ALLOWED_RESUME_TYPES.has(resume.type)) {
    return { error: 'Resume must be a PDF, DOC, or DOCX file.' }
  }

  const supabase = createAdminClient()

  // 1) Verify the role is real and public
  const { data: role, error: roleErr } = await supabase
    .from('role_templates')
    .select('id, slug, display_name')
    .eq('slug', roleSlug)
    .eq('active', true)
    .eq('is_public', true)
    .maybeSingle()
  if (roleErr || !role) return { error: 'That role is no longer accepting applications.' }

  // 2) Find or create the candidate (idempotent by email)
  let candidateId: string
  {
    const { data: existing } = await supabase
      .from('candidates')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing?.id) {
      candidateId = existing.id
      // Refresh contact fields in case they updated since last apply
      await supabase
        .from('candidates')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          last_action_date: new Date().toISOString(),
        })
        .eq('id', candidateId)
    } else {
      const { data: created, error: createErr } = await supabase
        .from('candidates')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          stage: 'new',
          source: 'primeahr_apply',
          source_detail: roleSlug,
        })
        .select('id')
        .single()
      if (createErr || !created) {
        return { error: 'We could not save your details. Please try again.' }
      }
      candidateId = created.id
    }
  }

  // 3) Upload resume to the private "resumes" bucket
  const ext = (() => {
    const parts = resume.name.split('.')
    return parts.length > 1 ? parts.pop()!.toLowerCase() : 'pdf'
  })()
  const storagePath = `${candidateId}/${roleSlug}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await resume.arrayBuffer())
  const { error: uploadErr } = await supabase.storage
    .from('resumes')
    .upload(storagePath, buffer, {
      contentType: resume.type || 'application/octet-stream',
      upsert: false,
    })
  if (uploadErr) {
    return { error: 'Resume upload failed. Please try again.' }
  }

  // 4) Create the application row
  const { data: application, error: appErr } = await supabase
    .from('applications')
    .insert({
      candidate_id: candidateId,
      role_slug: roleSlug,
      status: 'in_progress',
      current_step: 1,
      total_steps: 8,
      resume_storage_path: storagePath,
      resume_filename: resume.name,
      form_data: {
        step_1: {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
        },
      },
    })
    .select('id')
    .single()
  if (appErr || !application) {
    return { error: 'We could not save your application. Please try again.' }
  }

  // 5) Mint the apply_resume token (90-day expiry for funnel resume)
  const token = await createToken({
    kind: 'apply_resume',
    expiresInDays: 90,
    applicationId: application.id,
    candidateId,
    metadata: { role_slug: roleSlug, step_completed: 1 },
  })

  // 6) Audit log
  await supabase.from('application_events').insert({
    application_id: application.id,
    event_type: 'step_completed',
    actor: 'candidate',
    metadata: { step: 1, role_slug: roleSlug },
  })

  // 7) Redirect to step 2
  redirect(`/apply/${roleSlug}/continue?t=${encodeURIComponent(token.token)}`)
}
