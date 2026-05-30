import type { ExternalEventRow, EventHandler } from '../types';

/**
 * blhinterviews handler registry — Phase D shipped stubs; this is the real implementation.
 *
 * blhinterviews.com is the candidate-facing interview pipeline UI. Events arrive here as
 * webhooks via POST /api/webhooks/blhinterviews and are processed asynchronously by
 * /api/cron/process-inbox which dispatches to the handler keyed by event_type.
 *
 * Resolution strategy:
 *   - Every blhinterviews payload carries `blhinterviews_candidate_id` (or _application_id
 *     for application-scoped events). We match by that column, never by email.
 *   - If we can't find the candidate, we log a soft error and mark the event ignored —
 *     a candidate.created event must precede every other event for that candidate.
 *
 * Stage mapping: blhinterviews sends its own stage label; we translate to the PrimeaHR
 * candidate_stage enum (new | screening | interviewing | offer | hired | dispositioned).
 */
const handlerMap: Record<string, EventHandler> = {
  'candidate.created':     candidateCreated,
  'candidate.updated':     candidateUpdated,
  'candidate.advanced':    candidateAdvanced,
  'candidate.rejected':    candidateRejected,
  'candidate.hired':       candidateHired,
  'candidate.note_added':  candidateNoteAdded,
  'interview.scheduled':   interviewScheduled,
  'interview.completed':   interviewCompleted,
  'application.submitted': applicationSubmitted,
};

// ---------- handlers ----------

async function candidateCreated(event: ExternalEventRow, ctx: { adminSupabase: any }) {
  const p = event.payload as any;
  const bhId = p.blhinterviews_candidate_id ?? p.id;
  if (!bhId) return softFail('missing blhinterviews_candidate_id');

  // upsert by blhinterviews_candidate_id
  const { data: existing } = await ctx.adminSupabase
    .from('candidates').select('id').eq('blhinterviews_candidate_id', bhId).maybeSingle();

  let candidateId: string;
  if (existing) {
    candidateId = (existing as { id: string }).id;
    await ctx.adminSupabase.from('candidates').update({
      blhinterviews_url: p.url ?? null,
      blhinterviews_synced_at: new Date().toISOString(),
      last_action_date: new Date().toISOString(),
    }).eq('id', candidateId);
  } else {
    const { data: created, error } = await ctx.adminSupabase.from('candidates').insert({
      first_name: p.first_name ?? p.firstName ?? 'Unknown',
      last_name: p.last_name ?? p.lastName ?? 'Candidate',
      email: p.email ?? null,
      phone: p.phone ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
      stage: mapStage(p.stage) ?? 'new',
      grade: 'unknown',
      source: p.source ?? 'blhinterviews',
      source_detail: p.source_detail ?? null,
      applied_at: p.applied_at ?? new Date().toISOString(),
      blhinterviews_candidate_id: bhId,
      blhinterviews_url: p.url ?? null,
      blhinterviews_synced_at: new Date().toISOString(),
      last_action_date: new Date().toISOString(),
    }).select('id').single();
    if (error || !created) return softFail(`insert failed: ${error?.message ?? 'unknown'}`);
    candidateId = (created as { id: string }).id;
  }

  await logActivity(ctx.adminSupabase, candidateId, 'created',
    `Candidate created in BLH Interviews`, p);
  return { target_table: 'candidates', target_id: candidateId, outcome: 'success' as const, result_summary: 'handled' };
}

async function candidateUpdated(event: ExternalEventRow, ctx: { adminSupabase: any }) {
  const p = event.payload as any;
  const candidateId = await resolveCandidate(ctx.adminSupabase, p);
  if (!candidateId) return softFail('candidate not found for update');

  const patch: Record<string, unknown> = {
    last_action_date: new Date().toISOString(),
    blhinterviews_synced_at: new Date().toISOString(),
  };
  if (p.first_name) patch.first_name = p.first_name;
  if (p.last_name)  patch.last_name  = p.last_name;
  if (p.email)      patch.email      = p.email;
  if (p.phone)      patch.phone      = p.phone;
  if (p.city)       patch.city       = p.city;
  if (p.state)      patch.state      = p.state;
  if (p.stage)      patch.stage      = mapStage(p.stage) ?? 'new';
  if (p.url)        patch.blhinterviews_url = p.url;

  await ctx.adminSupabase.from('candidates').update(patch).eq('id', candidateId);
  await logActivity(ctx.adminSupabase, candidateId, 'updated',
    `Candidate updated from BLH Interviews`, p);
  return { target_table: 'candidates', target_id: candidateId, outcome: 'success' as const, result_summary: 'handled' };
}

async function candidateAdvanced(event: ExternalEventRow, ctx: { adminSupabase: any }) {
  const p = event.payload as any;
  const candidateId = await resolveCandidate(ctx.adminSupabase, p);
  if (!candidateId) return softFail('candidate not found for advance');

  const newStage = mapStage(p.new_stage ?? p.stage ?? p.to_stage) ?? 'screening';
  const oldStage = mapStage(p.old_stage ?? p.from_stage);

  await ctx.adminSupabase.from('candidates').update({
    stage: newStage,
    blhinterviews_synced_at: new Date().toISOString(),
    last_action_date: new Date().toISOString(),
  }).eq('id', candidateId);

  await logActivity(ctx.adminSupabase, candidateId, 'status_changed',
    `Advanced${oldStage ? ` from ${oldStage}` : ''} to ${newStage}`,
    { from: oldStage, to: newStage, raw: p });
  return { target_table: 'candidates', target_id: candidateId, outcome: 'success' as const, result_summary: 'handled' };
}

async function candidateRejected(event: ExternalEventRow, ctx: { adminSupabase: any }) {
  const p = event.payload as any;
  const candidateId = await resolveCandidate(ctx.adminSupabase, p);
  if (!candidateId) return softFail('candidate not found for rejection');

  const reason = p.reason ?? p.disposition_reason ?? 'No reason provided';

  await ctx.adminSupabase.from('candidates').update({
    stage: 'dispositioned',
    disposition_reason: reason,
    disposition_date: new Date().toISOString(),
    blhinterviews_synced_at: new Date().toISOString(),
    last_action_date: new Date().toISOString(),
  }).eq('id', candidateId);

  await logActivity(ctx.adminSupabase, candidateId, 'rejected',
    `Candidate rejected: ${reason}`, p);
  return { target_table: 'candidates', target_id: candidateId, outcome: 'success' as const, result_summary: 'handled' };
}

async function candidateHired(event: ExternalEventRow, ctx: { adminSupabase: any }) {
  const p = event.payload as any;
  const candidateId = await resolveCandidate(ctx.adminSupabase, p);
  if (!candidateId) return softFail('candidate not found for hire');

  // Mark candidate hired
  await ctx.adminSupabase.from('candidates').update({
    stage: 'hired',
    blhinterviews_synced_at: new Date().toISOString(),
    last_action_date: new Date().toISOString(),
  }).eq('id', candidateId);

  // Pull candidate details to seed employee
  const { data: cand } = await ctx.adminSupabase
    .from('candidates')
    .select('first_name, last_name, email, phone, city, state, requisition_id')
    .eq('id', candidateId).maybeSingle();
  if (!cand) return softFail('candidate vanished mid-hire');

  // Avoid duplicate employee if one already exists with same email
  let employeeId: string | null = null;
  const { data: existingEmp } = await ctx.adminSupabase
    .from('employees').select('id').eq('email', (cand as any).email).maybeSingle();

  if (existingEmp) {
    employeeId = (existingEmp as { id: string }).id;
  } else {
    const { data: newEmp, error } = await ctx.adminSupabase.from('employees').insert({
      first_name: (cand as any).first_name,
      last_name: (cand as any).last_name,
      email: (cand as any).email,
      phone: (cand as any).phone,
      city: (cand as any).city,
      state: (cand as any).state,
      hire_date: p.hire_date ?? new Date().toISOString().slice(0, 10),
      start_date: p.start_date ?? null,
      employment_status: 'onboarding',
      onboarding_status: 'not_started',
      user_role: 'new_hire',
      is_active: true,
    }).select('id').single();
    if (error) return softFail(`employee insert failed: ${error.message}`);
    employeeId = (newEmp as { id: string }).id;
  }

  await logActivity(ctx.adminSupabase, candidateId, 'status_changed',
    `Candidate hired and converted to employee`,
    { employee_id: employeeId, raw: p });

  return { target_table: 'employees', target_id: employeeId, outcome: 'success' as const, result_summary: 'handled' };
}

async function candidateNoteAdded(event: ExternalEventRow, ctx: { adminSupabase: any }) {
  const p = event.payload as any;
  const candidateId = await resolveCandidate(ctx.adminSupabase, p);
  if (!candidateId) return softFail('candidate not found for note');

  const note = p.note ?? p.body ?? p.text ?? '';
  await ctx.adminSupabase.from('activity_log').insert({
    actor_name: p.author ?? 'BLH Interviews',
    action: 'commented',
    entity_type: 'candidate',
    entity_id: candidateId,
    description: note.length > 200 ? note.slice(0, 200) + '…' : note,
    metadata: { source: 'blhinterviews', author: p.author ?? null, full_note: note },
  });
  return { target_table: 'candidates', target_id: candidateId, outcome: 'success' as const, result_summary: 'handled' };
}

async function interviewScheduled(event: ExternalEventRow, ctx: { adminSupabase: any }) {
  const p = event.payload as any;
  const candidateId = await resolveCandidate(ctx.adminSupabase, p);
  if (!candidateId) return softFail('candidate not found for interview schedule');

  // Move candidate to interviewing if not already past it
  const { data: cand } = await ctx.adminSupabase
    .from('candidates').select('stage').eq('id', candidateId).maybeSingle();
  const currentStage = (cand as any)?.stage;
  if (currentStage && ['new', 'screening'].includes(currentStage)) {
    await ctx.adminSupabase.from('candidates').update({
      stage: 'interviewing',
      last_action_date: new Date().toISOString(),
    }).eq('id', candidateId);
  }

  await ctx.adminSupabase.from('activity_log').insert({
    action: 'created',
    entity_type: 'candidate',
    entity_id: candidateId,
    description: `Interview scheduled${p.scheduled_for ? ` for ${p.scheduled_for}` : ''}${p.interviewer ? ` with ${p.interviewer}` : ''}`,
    metadata: {
      source: 'blhinterviews',
      kind: 'interview_scheduled',
      scheduled_for: p.scheduled_for ?? null,
      interviewer: p.interviewer ?? null,
      type: p.interview_type ?? null,
    },
  });
  return { target_table: 'candidates', target_id: candidateId, outcome: 'success' as const, result_summary: 'handled' };
}

async function interviewCompleted(event: ExternalEventRow, ctx: { adminSupabase: any }) {
  const p = event.payload as any;
  const candidateId = await resolveCandidate(ctx.adminSupabase, p);
  if (!candidateId) return softFail('candidate not found for interview completion');

  const patch: Record<string, unknown> = {
    last_action_date: new Date().toISOString(),
    blhinterviews_synced_at: new Date().toISOString(),
  };
  if (p.score != null)   patch.interview_score = p.score;
  if (p.notes)           patch.interview_notes = p.notes;
  if (p.panel_feedback)  patch.interview_panel_feedback = p.panel_feedback;
  if (p.grade && ['A', 'B', 'C', 'unknown'].includes(p.grade)) patch.grade = p.grade;

  await ctx.adminSupabase.from('candidates').update(patch).eq('id', candidateId);
  await ctx.adminSupabase.from('activity_log').insert({
    action: 'updated',
    entity_type: 'candidate',
    entity_id: candidateId,
    description: `Interview completed${p.score != null ? ` (score ${p.score})` : ''}`,
    metadata: { source: 'blhinterviews', kind: 'interview_completed', raw: p },
  });
  return { target_table: 'candidates', target_id: candidateId, outcome: 'success' as const, result_summary: 'handled' };
}

async function applicationSubmitted(event: ExternalEventRow, ctx: { adminSupabase: any }) {
  const p = event.payload as any;
  const candidateId = await resolveCandidate(ctx.adminSupabase, p);
  if (!candidateId) return softFail('candidate not found for application');

  const appBhId = p.blhinterviews_application_id ?? p.application_id;
  if (!appBhId) return softFail('missing blhinterviews_application_id');

  // upsert by blhinterviews_application_id
  const { data: existing } = await ctx.adminSupabase
    .from('applications').select('id').eq('blhinterviews_application_id', appBhId).maybeSingle();

  let applicationId: string;
  if (existing) {
    applicationId = (existing as { id: string }).id;
    await ctx.adminSupabase.from('applications').update({
      status: p.status ?? 'submitted',
      blhinterviews_synced_at: new Date().toISOString(),
    }).eq('id', applicationId);
  } else {
    const { data: created, error } = await ctx.adminSupabase.from('applications').insert({
      candidate_id: candidateId,
      requisition_id: p.requisition_id ?? null,
      role_slug: p.role_slug ?? null,
      status: p.status ?? 'submitted',
      current_step: p.current_step ?? 1,
      total_steps: p.total_steps ?? 8,
      form_data: p.form_data ?? {},
      blhinterviews_application_id: appBhId,
      blhinterviews_synced_at: new Date().toISOString(),
      submitted_at: p.submitted_at ?? new Date().toISOString(),
    }).select('id').single();
    if (error || !created) return softFail(`application insert failed: ${error?.message ?? 'unknown'}`);
    applicationId = (created as { id: string }).id;
  }

  await logActivity(ctx.adminSupabase, candidateId, 'created',
    `Application submitted via BLH Interviews`, { application_id: applicationId, raw: p });
  return { target_table: 'applications', target_id: applicationId, outcome: 'success' as const, result_summary: 'handled' };
}

// ---------- shared helpers ----------

async function resolveCandidate(adminSupabase: any, payload: any): Promise<string | null> {
  const bhId = payload.blhinterviews_candidate_id ?? payload.candidate_id ?? payload.id;
  if (!bhId) return null;
  const { data } = await adminSupabase
    .from('candidates').select('id').eq('blhinterviews_candidate_id', bhId).maybeSingle();
  if (data) return (data as { id: string }).id;
  // fallback: try id directly if it happens to be a UUID
  if (typeof bhId === 'string' && /^[0-9a-f-]{36}$/i.test(bhId)) {
    const { data: byId } = await adminSupabase
      .from('candidates').select('id').eq('id', bhId).maybeSingle();
    if (byId) return (byId as { id: string }).id;
  }
  return null;
}

async function logActivity(adminSupabase: any, candidateId: string, action: string,
                            description: string, meta: any) {
  await adminSupabase.from('activity_log').insert({
    actor_name: 'BLH Interviews',
    action,
    entity_type: 'candidate',
    entity_id: candidateId,
    description,
    metadata: { source: 'blhinterviews', raw: meta },
  });
}

function softFail(reason: string) {
  return { target_table: null, target_id: null, outcome: 'ignored' as const, result_summary: reason };
}

/** Map blhinterviews stage strings to PrimeaHR candidate_stage enum. */
function mapStage(s: string | null | undefined):
  'new' | 'screening' | 'interviewing' | 'offer' | 'hired' | 'dispositioned' | null {
  if (!s) return null;
  const x = s.toLowerCase().trim();
  if (['new', 'lead', 'applied', 'application', 'inbox'].includes(x)) return 'new';
  if (['screening', 'screen', 'phone_screen', 'reviewing', 'review'].includes(x)) return 'screening';
  if (x.startsWith('interview') || ['panel', 'onsite', 'second_round', 'final_round'].includes(x)) return 'interviewing';
  if (['offer', 'offer_extended', 'negotiating', 'offer_pending'].includes(x)) return 'offer';
  if (['hired', 'accepted', 'onboarding_started', 'placed'].includes(x)) return 'hired';
  if (['rejected', 'declined', 'withdrew', 'withdrawn', 'no_show', 'dispositioned', 'closed'].includes(x))
    return 'dispositioned';
  return null;
}

export const blhinterviewsHandlers = {
  resolve(eventType: string): EventHandler | null {
    return handlerMap[eventType] ?? null;
  },
  knownEventTypes: () => Object.keys(handlerMap),
};
