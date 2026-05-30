import type { EventHandler, EventHandlerResult, ExternalEventRow } from '../types';

/**
 * Handlers for events arriving from blhcasesync.com.
 * Casesync owns evaluations + training content; PrimeaHR is the thin tracker.
 */

const handlerMap: Record<string, EventHandler> = {
  'evaluation.scheduled': handleEvaluationScheduled,
  'evaluation.completed': handleEvaluationCompleted,
  'training.assigned': handleTrainingAssigned,
  'training.completed': handleTrainingCompleted,
  'employee.synced': handleEmployeeSynced,
};

export const blhcasesyncHandlers = {
  resolve(eventType: string): EventHandler | null {
    return handlerMap[eventType] ?? null;
  },
  knownEventTypes: () => Object.keys(handlerMap),
};

async function handleEvaluationScheduled(event: ExternalEventRow, ctx: { adminSupabase: any }): Promise<EventHandlerResult> {
  const { adminSupabase } = ctx;
  const p = event.payload as {
    casesync_record_id?: string;
    casesync_employee_id?: string;
    evaluation_type?: string;
    scheduled_for?: string;
  };

  if (!p.casesync_record_id || !p.casesync_employee_id) {
    return { target_table: 'evaluations', target_id: null, outcome: 'failure',
      result_summary: 'missing casesync_record_id or casesync_employee_id' };
  }

  // Look up the PrimeaHR employee by casesync_employee_id
  const { data: emp } = await adminSupabase
    .from('employees')
    .select('id')
    .eq('casesync_employee_id', p.casesync_employee_id)
    .maybeSingle();

  if (!emp) {
    return { target_table: 'evaluations', target_id: null, outcome: 'requires_review',
      result_summary: `no employee match for casesync id ${p.casesync_employee_id}` };
  }

  // Upsert by casesync_record_id (unique)
  const { data: row, error } = await adminSupabase
    .from('evaluations')
    .upsert({
      employee_id: (emp as { id: string }).id,
      casesync_record_id: p.casesync_record_id,
      evaluation_type: p.evaluation_type ?? 'other',
      status: 'scheduled',
      scheduled_for: p.scheduled_for ?? null,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'casesync_record_id' })
    .select('id').single();

  if (error || !row) {
    return { target_table: 'evaluations', target_id: null, outcome: 'failure',
      result_summary: `upsert failed: ${error?.message ?? 'unknown'}` };
  }
  return { target_table: 'evaluations', target_id: (row as { id: string }).id, outcome: 'success',
    result_summary: `evaluation scheduled for ${p.scheduled_for ?? 'TBD'}` };
}

async function handleEvaluationCompleted(event: ExternalEventRow, ctx: { adminSupabase: any }): Promise<EventHandlerResult> {
  const { adminSupabase } = ctx;
  const p = event.payload as {
    casesync_record_id?: string;
    completed_at?: string;
    score?: number;
    summary_notes?: string;
  };
  if (!p.casesync_record_id) {
    return { target_table: 'evaluations', target_id: null, outcome: 'failure',
      result_summary: 'missing casesync_record_id' };
  }
  const { data, error } = await adminSupabase
    .from('evaluations')
    .update({
      status: 'completed',
      completed_at: p.completed_at ?? new Date().toISOString(),
      score: p.score ?? null,
      summary_notes: p.summary_notes ?? null,
      synced_at: new Date().toISOString(),
    })
    .eq('casesync_record_id', p.casesync_record_id)
    .select('id').maybeSingle();

  if (error) {
    return { target_table: 'evaluations', target_id: null, outcome: 'failure',
      result_summary: `update failed: ${error.message}` };
  }
  if (!data) {
    return { target_table: 'evaluations', target_id: null, outcome: 'requires_review',
      result_summary: `no evaluation found for casesync record ${p.casesync_record_id}` };
  }
  return { target_table: 'evaluations', target_id: (data as { id: string }).id, outcome: 'success',
    result_summary: `evaluation completed, score=${p.score ?? 'n/a'}` };
}

async function handleTrainingAssigned(event: ExternalEventRow, ctx: { adminSupabase: any }): Promise<EventHandlerResult> {
  const { adminSupabase } = ctx;
  const p = event.payload as {
    casesync_record_id?: string;
    casesync_employee_id?: string;
    training_type?: string;
    title?: string;
    due_date?: string;
  };
  if (!p.casesync_record_id || !p.casesync_employee_id) {
    return { target_table: 'training', target_id: null, outcome: 'failure',
      result_summary: 'missing casesync_record_id or casesync_employee_id' };
  }
  const { data: emp } = await adminSupabase
    .from('employees').select('id')
    .eq('casesync_employee_id', p.casesync_employee_id)
    .maybeSingle();
  if (!emp) {
    return { target_table: 'training', target_id: null, outcome: 'requires_review',
      result_summary: `no employee match for casesync id ${p.casesync_employee_id}` };
  }
  const { data, error } = await adminSupabase
    .from('training')
    .upsert({
      employee_id: (emp as { id: string }).id,
      casesync_record_id: p.casesync_record_id,
      training_type: p.training_type ?? 'onboarding',
      title: p.title ?? 'Training Module',
      status: 'assigned',
      due_date: p.due_date ?? null,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'casesync_record_id' })
    .select('id').single();
  if (error || !data) {
    return { target_table: 'training', target_id: null, outcome: 'failure',
      result_summary: `upsert failed: ${error?.message ?? 'unknown'}` };
  }
  return { target_table: 'training', target_id: (data as { id: string }).id, outcome: 'success',
    result_summary: `training assigned: ${p.title}` };
}

async function handleTrainingCompleted(event: ExternalEventRow, ctx: { adminSupabase: any }): Promise<EventHandlerResult> {
  const { adminSupabase } = ctx;
  const p = event.payload as {
    casesync_record_id?: string;
    completed_at?: string;
    score?: number;
    passed?: boolean;
  };
  if (!p.casesync_record_id) {
    return { target_table: 'training', target_id: null, outcome: 'failure',
      result_summary: 'missing casesync_record_id' };
  }
  const { data, error } = await adminSupabase
    .from('training')
    .update({
      status: 'completed',
      completed_at: p.completed_at ?? new Date().toISOString(),
      score: p.score ?? null,
      passed: p.passed ?? null,
      synced_at: new Date().toISOString(),
    })
    .eq('casesync_record_id', p.casesync_record_id)
    .select('id').maybeSingle();
  if (error) {
    return { target_table: 'training', target_id: null, outcome: 'failure',
      result_summary: `update failed: ${error.message}` };
  }
  if (!data) {
    return { target_table: 'training', target_id: null, outcome: 'requires_review',
      result_summary: `no training found for casesync record ${p.casesync_record_id}` };
  }
  return { target_table: 'training', target_id: (data as { id: string }).id, outcome: 'success',
    result_summary: `training completed, passed=${p.passed ?? 'n/a'}` };
}

async function handleEmployeeSynced(event: ExternalEventRow, ctx: { adminSupabase: any }): Promise<EventHandlerResult> {
  return { target_table: 'employees', target_id: null, outcome: 'success',
    result_summary: 'employee sync acknowledged' };
}
