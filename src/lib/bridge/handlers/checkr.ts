import type { EventHandler, EventHandlerResult, ExternalEventRow } from '../types';

/**
 * Checkr webhook handlers.
 * Reference: https://docs.checkr.com/v1/webhooks
 * Key events: report.created, report.completed, report.disputed, report.canceled.
 */

const handlerMap: Record<string, EventHandler> = {
  'report.created': handleReportCreated,
  'report.completed': handleReportCompleted,
  'report.disputed': handleReportDisputed,
  'report.canceled': handleReportCanceled,
  'invitation.completed': handleInvitationCompleted,
};

export const checkrHandlers = {
  resolve(eventType: string): EventHandler | null {
    return handlerMap[eventType] ?? null;
  },
  knownEventTypes: () => Object.keys(handlerMap),
};

async function handleReportCreated(event: ExternalEventRow, ctx: { adminSupabase: any }): Promise<EventHandlerResult> {
  const { adminSupabase } = ctx;
  const p = event.payload as { data?: { object?: { id?: string; package?: string; status?: string } } };
  const reportId = p.data?.object?.id;
  if (!reportId) {
    return { target_table: 'background_checks', target_id: null, outcome: 'failure',
      result_summary: 'missing report id' };
  }
  const { data, error } = await adminSupabase
    .from('background_checks')
    .update({
      status: 'pending_review',
      checkr_report_id: reportId,
      checkr_package: p.data?.object?.package ?? null,
      checkr_webhook_data: p.data?.object ?? {},
    })
    .eq('checkr_invitation_id', event.payload.data?.object?.invitation_id ?? '')
    .select('id').maybeSingle();
  if (!data) {
    return { target_table: 'background_checks', target_id: null, outcome: 'requires_review',
      result_summary: `no bg check row matched report ${reportId}` };
  }
  return { target_table: 'background_checks', target_id: (data as { id: string }).id, outcome: 'success',
    result_summary: `report ${reportId} created` };
}

async function handleReportCompleted(event: ExternalEventRow, ctx: { adminSupabase: any }): Promise<EventHandlerResult> {
  const { adminSupabase } = ctx;
  const obj = (event.payload as any)?.data?.object;
  const reportId = obj?.id;
  if (!reportId) {
    return { target_table: 'background_checks', target_id: null, outcome: 'failure',
      result_summary: 'missing report id' };
  }
  // Map Checkr report status → background_checks.status + .decision
  // Checkr statuses: clear | consider | suspended
  const checkrStatus: string = obj.status ?? 'pending';
  const mapped: { status: string; decision: string | null } = checkrStatus === 'clear'
    ? { status: 'clear', decision: 'engage' }
    : checkrStatus === 'consider'
      ? { status: 'pending_review', decision: null }
      : { status: 'failed', decision: 'pre_adverse' };

  const { data, error } = await adminSupabase
    .from('background_checks')
    .update({
      status: mapped.status,
      decision: mapped.decision,
      completed_at: obj.completed_at ?? new Date().toISOString(),
      expires_at: obj.expires_at ?? null,
      checkr_webhook_data: obj,
    })
    .eq('checkr_report_id', reportId)
    .select('id').maybeSingle();

  if (error) {
    return { target_table: 'background_checks', target_id: null, outcome: 'failure',
      result_summary: `update failed: ${error.message}` };
  }
  if (!data) {
    return { target_table: 'background_checks', target_id: null, outcome: 'requires_review',
      result_summary: `no bg check found for checkr_report_id ${reportId}` };
  }
  return { target_table: 'background_checks', target_id: (data as { id: string }).id, outcome: 'success',
    result_summary: `checkr report completed → ${mapped.status}` };
}

async function handleReportDisputed(event: ExternalEventRow, ctx: { adminSupabase: any }): Promise<EventHandlerResult> {
  return { target_table: 'background_checks', target_id: null, outcome: 'requires_review',
    result_summary: 'checkr report disputed — escalate to HR' };
}

async function handleReportCanceled(event: ExternalEventRow, ctx: { adminSupabase: any }): Promise<EventHandlerResult> {
  const { adminSupabase } = ctx;
  const reportId = (event.payload as any)?.data?.object?.id;
  if (!reportId) {
    return { target_table: 'background_checks', target_id: null, outcome: 'failure',
      result_summary: 'missing report id' };
  }
  const { data } = await adminSupabase
    .from('background_checks')
    .update({ status: 'canceled' })
    .eq('checkr_report_id', reportId)
    .select('id').maybeSingle();
  return { target_table: 'background_checks', target_id: (data as { id?: string } | null)?.id ?? null,
    outcome: data ? 'success' : 'requires_review',
    result_summary: `checkr report ${reportId} canceled` };
}

async function handleInvitationCompleted(event: ExternalEventRow, ctx: { adminSupabase: any }): Promise<EventHandlerResult> {
  return { target_table: 'background_checks', target_id: null, outcome: 'success',
    result_summary: 'checkr invitation completed; report will follow' };
}
