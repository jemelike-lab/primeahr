import type { ReminderCandidate, SourceTable } from './types';
import { resolveStage, cooldownHours, MAX_REMINDERS_PER_RUN } from './policy';
import { loadSubject, maskRecipient } from './subjects';
import { decideReminder } from './consent';
import { composeReminder } from './compose';
import { enqueueForChannel } from './channels';

const SCAN_WINDOW_DAYS = 35; // look this far ahead to catch T-30 stage

/**
 * Scan all four domain tables for items in the reminder window, then for each:
 *   resolve stage → check cooldown → load subject → consent gate → compose → enqueue → log.
 */
export async function scanReminders(adminSupabase: any): Promise<{
  scanned: number;
  fired: number;
  suppressed: number;
  skipped_cooldown: number;
  failed: number;
}> {
  const candidates: ReminderCandidate[] = [];

  // Pull each source in parallel.
  const [bg, ev, tr, comp] = await Promise.all([
    fetchBackgroundChecks(adminSupabase),
    fetchEvaluations(adminSupabase),
    fetchTraining(adminSupabase),
    fetchCompensation(adminSupabase),
  ]);
  candidates.push(...bg, ...ev, ...tr, ...comp);

  let fired = 0, suppressed = 0, skippedCooldown = 0, failed = 0;
  const scanned = candidates.length;
  const now = Date.now();

  for (const c of candidates) {
    if (fired >= MAX_REMINDERS_PER_RUN) break;

    const daysUntil = Math.ceil((Date.parse(c.due_at) - now) / (24 * 60 * 60 * 1000));
    const stage = resolveStage(daysUntil, c.source_table);
    if (!stage) continue;

    // Cooldown check
    if (c.last_reminder_at) {
      const ageHours = (now - Date.parse(c.last_reminder_at)) / (60 * 60 * 1000);
      if (ageHours < cooldownHours(stage)) {
        skippedCooldown++;
        continue;
      }
    }

    const subject = await loadSubject(adminSupabase, c.subject_kind, c.subject_id);
    if (!subject) {
      failed++;
      continue;
    }

    const decision = decideReminder(subject, stage);
    if (decision.kind === 'suppressed') {
      await logSuppressed(adminSupabase, c, subject, stage, decision.reason);
      suppressed++;
      continue;
    }

    const drafted = await composeReminder(adminSupabase, c, subject, stage, decision.channel);

    const outboxId = await enqueueForChannel(adminSupabase, decision.channel, decision.recipient, drafted, {
      source_table: c.source_table,
      source_id: c.source_id,
      subject_kind: c.subject_kind,
      subject_id: c.subject_id,
      stage,
      ai_action_id: drafted.ai_action_id,
    });
    if (!outboxId) {
      failed++;
      continue;
    }

    // Stamp the source row + write reminder_log
    await stampSourceRow(adminSupabase, c);
    await adminSupabase.from('reminder_log').insert({
      subject_employee_id: c.subject_kind === 'employee' ? c.subject_id : null,
      subject_candidate_id: c.subject_kind === 'candidate' ? c.subject_id : null,
      source_table: c.source_table,
      source_id: c.source_id,
      stage,
      channel: decision.channel,
      recipient_masked: maskRecipient(decision.channel, decision.recipient),
      message_summary: drafted.summary,
      message_body: drafted.body,
      sync_outbox_id: outboxId,
      ai_action_id: drafted.ai_action_id,
      outcome: 'queued',
    });

    fired++;
  }

  return { scanned, fired, suppressed, skipped_cooldown: skippedCooldown, failed };
}

// ---------- per-table fetchers ----------

async function fetchBackgroundChecks(adminSupabase: any): Promise<ReminderCandidate[]> {
  const cutoff = new Date(Date.now() + SCAN_WINDOW_DAYS * 86_400_000).toISOString();
  const { data } = await adminSupabase
    .from('background_checks')
    .select('id, status, subject_employee_id, subject_candidate_id, expires_at, due_date, last_reminder_at, notification_channel, checkr_package')
    .in('status', ['clear', 'pending_review', 'expired'])
    .or(`expires_at.lte.${cutoff},due_date.lte.${cutoff}`)
    .limit(200);
  return (data ?? []).map((r: any) => ({
    source_table: 'background_checks' as SourceTable,
    source_id: r.id,
    subject_kind: r.subject_employee_id ? 'employee' as const : 'candidate' as const,
    subject_id: r.subject_employee_id ?? r.subject_candidate_id,
    due_at: r.expires_at ?? r.due_date,
    status: r.status,
    context: { package: r.checkr_package },
    last_reminder_at: r.last_reminder_at,
  })).filter(c => c.subject_id && c.due_at);
}

async function fetchEvaluations(adminSupabase: any): Promise<ReminderCandidate[]> {
  const cutoff = new Date(Date.now() + SCAN_WINDOW_DAYS * 86_400_000).toISOString();
  const { data } = await adminSupabase
    .from('evaluations')
    .select('id, status, employee_id, scheduled_for, due_date, last_reminder_at, notification_channel, evaluation_type')
    .in('status', ['scheduled', 'due', 'overdue'])
    .or(`scheduled_for.lte.${cutoff},due_date.lte.${cutoff}`)
    .limit(200);
  return (data ?? []).map((r: any) => ({
    source_table: 'evaluations' as SourceTable,
    source_id: r.id,
    subject_kind: 'employee' as const,
    subject_id: r.employee_id,
    due_at: r.scheduled_for ?? r.due_date,
    status: r.status,
    context: { evaluation_type: r.evaluation_type },
    last_reminder_at: r.last_reminder_at,
  })).filter(c => c.subject_id && c.due_at);
}

async function fetchTraining(adminSupabase: any): Promise<ReminderCandidate[]> {
  const cutoff = new Date(Date.now() + SCAN_WINDOW_DAYS * 86_400_000).toISOString();
  const { data } = await adminSupabase
    .from('training')
    .select('id, status, employee_id, due_date, expires_at, last_reminder_at, notification_channel, title, training_type')
    .in('status', ['assigned', 'not_started', 'in_progress', 'overdue'])
    .or(`due_date.lte.${cutoff},expires_at.lte.${cutoff}`)
    .limit(200);
  return (data ?? []).map((r: any) => ({
    source_table: 'training' as SourceTable,
    source_id: r.id,
    subject_kind: 'employee' as const,
    subject_id: r.employee_id,
    due_at: r.due_date ?? r.expires_at,
    status: r.status,
    context: { title: r.title, training_type: r.training_type },
    last_reminder_at: r.last_reminder_at,
  })).filter(c => c.subject_id && c.due_at);
}

async function fetchCompensation(adminSupabase: any): Promise<ReminderCandidate[]> {
  const cutoff = new Date(Date.now() + 14 * 86_400_000).toISOString();
  const { data } = await adminSupabase
    .from('compensation_history')
    .select('id, status, employee_id, effective_date, due_date, last_reminder_at, notification_channel, new_rate, change_type')
    .in('status', ['approved'])
    .lte('effective_date', cutoff)
    .limit(200);
  return (data ?? []).map((r: any) => ({
    source_table: 'compensation_history' as SourceTable,
    source_id: r.id,
    subject_kind: 'employee' as const,
    subject_id: r.employee_id,
    due_at: r.effective_date ?? r.due_date,
    status: r.status,
    context: { new_rate: r.new_rate, change_type: r.change_type },
    last_reminder_at: r.last_reminder_at,
  })).filter(c => c.subject_id && c.due_at);
}

async function stampSourceRow(adminSupabase: any, c: ReminderCandidate) {
  await adminSupabase
    .from(c.source_table)
    .update({ reminder_state: 'sent', last_reminder_at: new Date().toISOString() })
    .eq('id', c.source_id);
}

async function logSuppressed(
  adminSupabase: any,
  c: ReminderCandidate,
  subject: { kind: 'employee' | 'candidate'; id: string },
  stage: string,
  reason: string,
) {
  await adminSupabase.from('reminder_log').insert({
    subject_employee_id: subject.kind === 'employee' ? subject.id : null,
    subject_candidate_id: subject.kind === 'candidate' ? subject.id : null,
    source_table: c.source_table,
    source_id: c.source_id,
    stage,
    channel: 'email', // placeholder; the suppression preceded channel selection
    recipient_masked: '***',
    message_summary: `suppressed: ${reason}`,
    outcome: 'suppressed',
    suppressed_reason: reason,
  });
}
