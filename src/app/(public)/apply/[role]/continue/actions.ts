'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateToken } from '@/lib/tokens'

type StepData = Record<string, unknown>
type Json = Record<string, unknown>

export interface SaveStepResult {
  error?: string
  nextStep?: number
  totalSteps?: number
}

async function reqHeaders() {
  const h = await headers()
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    ua: h.get('user-agent') ?? undefined,
  }
}

const STEP_RANGE = { min: 2, max: 8 }

export async function saveApplyStep(
  token: string,
  step: number,
  data: StepData
): Promise<SaveStepResult> {
  if (typeof step !== 'number' || step < STEP_RANGE.min || step > STEP_RANGE.max) {
    return { error: 'Invalid step.' }
  }
  const { ip, ua } = await reqHeaders()
  const tokenRow = await validateToken(token, 'apply_resume', ip, ua)
  if (!tokenRow || !tokenRow.application_id) {
    return { error: 'Your session has expired. Please start a new application.' }
  }

  const supabase = createAdminClient()
  const { data: app, error: appErr } = await supabase
    .from('applications')
    .select('id, candidate_id, role_slug, current_step, total_steps, form_data, status')
    .eq('id', tokenRow.application_id)
    .single()
  if (appErr || !app) return { error: 'Application not found.' }
  if (app.status === 'submitted') return { error: 'This application has already been submitted.' }

  const formData = ((app.form_data as Json) || {}) as Json
  const newFormData: Json = { ...formData, [`step_${step}`]: data }
  const newCurrentStep = Math.max(Number(app.current_step ?? 1), step)
  const updates: Record<string, unknown> = {
    form_data: newFormData,
    current_step: newCurrentStep,
    updated_at: new Date().toISOString(),
  }

  if (step === 7) {
    const sig = data as { signature_image?: string }
    if (sig.signature_image) {
      updates.signature_data = sig.signature_image
      updates.signed_at = new Date().toISOString()
      updates.signed_ip = ip ?? null
      updates.signed_user_agent = ua ?? null
    }
  }

  const { error: updErr } = await supabase.from('applications').update(updates).eq('id', app.id)
  if (updErr) return { error: 'Could not save your progress. Please try again.' }

  if (app.candidate_id) {
    const candUpdates: Record<string, unknown> = { last_action_date: new Date().toISOString() }
    if (step === 2) candUpdates.experience = data
    if (step === 3) candUpdates.education = data
    if (step === 5) candUpdates.voluntary_self_id = data
    if (step === 6) candUpdates.criminal_history_disclosed = (data as { has_conviction?: boolean }).has_conviction === true
    if (step === 7) candUpdates.legal_signature_date = new Date().toISOString()
    await supabase.from('candidates').update(candUpdates).eq('id', app.candidate_id)
  }

  await supabase.from('application_events').insert({
    application_id: app.id,
    event_type: 'step_completed',
    actor: 'candidate',
    metadata: { step, role_slug: app.role_slug },
  })

  return { nextStep: Math.min(step + 1, STEP_RANGE.max), totalSteps: Number(app.total_steps ?? 8) }
}

export interface SubmitResult { error?: string }

export async function submitApplication(token: string): Promise<SubmitResult> {
  const { ip, ua } = await reqHeaders()
  const tokenRow = await validateToken(token, 'apply_resume', ip, ua)
  if (!tokenRow || !tokenRow.application_id) {
    return { error: 'Your session has expired. Please start a new application.' }
  }

  const supabase = createAdminClient()
  const { data: app } = await supabase
    .from('applications')
    .select('id, candidate_id, role_slug, status, form_data, total_steps')
    .eq('id', tokenRow.application_id)
    .single()
  if (!app) return { error: 'Application not found.' }

  if (app.status !== 'submitted') {
    const formData = (app.form_data as Json) || {}
    if (!formData.step_7) return { error: 'Please complete the signature step before submitting.' }

    await supabase
      .from('applications')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        current_step: Number(app.total_steps ?? 8),
        updated_at: new Date().toISOString(),
      })
      .eq('id', app.id)

    if (app.candidate_id) {
      await supabase
        .from('candidates')
        .update({
          stage: 'screening',
          applied_at: new Date().toISOString(),
          last_action_date: new Date().toISOString(),
        })
        .eq('id', app.candidate_id)
    }

    await supabase.from('application_events').insert({
      application_id: app.id,
      event_type: 'submitted',
      actor: 'candidate',
      metadata: { role_slug: app.role_slug },
    })

    // TODO(email): notify HR + send candidate confirmation once src/lib/email/* lands.
  }

  redirect(`/apply/${app.role_slug}/continue/thank-you?t=${encodeURIComponent(token)}`)
}
