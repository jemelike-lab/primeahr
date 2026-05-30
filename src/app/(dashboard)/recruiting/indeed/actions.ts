'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Import a candidate from Indeed manually. Creates a candidate row with source='indeed'
 * and optionally links to a requisition + creates a corresponding application.
 */
export async function importIndeedCandidateAction(formData: FormData): Promise<void> {
  const firstName = String(formData.get('first_name') ?? '').trim();
  const lastName  = String(formData.get('last_name')  ?? '').trim();
  const email     = String(formData.get('email')      ?? '').trim().toLowerCase();
  const phone     = String(formData.get('phone')      ?? '').trim() || null;
  const applyUrl  = String(formData.get('indeed_apply_url') ?? '').trim() || null;
  const reqId     = String(formData.get('requisition_id') ?? '').trim() || null;

  if (!firstName || !lastName || !email) {
    throw new Error('first_name, last_name, and email are required');
  }

  const supabase = await createClient();

  // Upsert candidate by email — if one exists, mark them as Indeed-sourced if they weren't already
  const { data: existing } = await supabase
    .from('candidates')
    .select('id, source')
    .eq('email', email)
    .maybeSingle();

  let candidateId: string;
  if (existing) {
    candidateId = (existing as { id: string }).id;
    const patch: Record<string, unknown> = {
      last_action_date: new Date().toISOString(),
    };
    if ((existing as { source: string | null }).source !== 'indeed') {
      patch.source = 'indeed';
      patch.source_detail = applyUrl ?? 'manual_import';
    }
    if (reqId) patch.requisition_id = reqId;
    await supabase.from('candidates').update(patch).eq('id', candidateId);
  } else {
    const { data: created, error } = await supabase
      .from('candidates')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        source: 'indeed',
        source_detail: applyUrl ?? 'manual_import',
        requisition_id: reqId,
        stage: 'new',
        grade: 'unknown',
        applied_at: new Date().toISOString(),
        last_action_date: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error || !created) {
      throw new Error(`failed to create candidate: ${error?.message ?? 'unknown'}`);
    }
    candidateId = (created as { id: string }).id;
  }

  // Optional matching application
  if (reqId) {
    await supabase
      .from('applications')
      .insert({
        candidate_id: candidateId,
        requisition_id: reqId,
        status: 'submitted',
        current_step: 1,
        total_steps: 8,
        form_data: { source: 'indeed', indeed_apply_url: applyUrl },
        indeed_apply_id: deriveIndeedId(applyUrl),
        indeed_raw: applyUrl ? { source_url: applyUrl } : null,
        submitted_at: new Date().toISOString(),
      });
  }

  // Audit
  await supabase.from('activity_log').insert({
    action: 'created',
    entity_type: 'candidate',
    entity_id: candidateId,
    entity_name: `${firstName} ${lastName}`,
    description: `Indeed candidate imported${reqId ? ' and matched to requisition' : ''}`,
    metadata: { source: 'indeed', apply_url: applyUrl, requisition_id: reqId },
  });

  revalidatePath('/recruiting/indeed');
  redirect(`/candidates/${candidateId}`);
}

/** Try to extract Indeed's application ID from a URL like /viewjob?jk=ABCDEFG or apply?jobid=... */
function deriveIndeedId(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.searchParams.get('jk')
        ?? u.searchParams.get('jobid')
        ?? u.searchParams.get('app_id')
        ?? null;
  } catch {
    return null;
  }
}
